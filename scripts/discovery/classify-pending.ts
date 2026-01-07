/**
 * Batch Classification Script for Pending Mining Candidates
 *
 * Processes profiles that failed bio keyword matching but have images
 * available for GPT-5-mini classification.
 *
 * Usage:
 *   npm run mine:classify              # Process all pending candidates
 *   npm run mine:classify -- --limit 50  # Process max 50 candidates
 *   npm run mine:classify -- --dry-run   # Show what would be processed
 */

import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { fetchInstagramProfileImages } from '../../lib/instagram/profile-fetcher';
import { extractLocationFromBio } from '../../lib/instagram/bio-location-extractor';
import { generateSlugFromInstagram } from '../../lib/utils/slug';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cost estimate per image classification (flex tier pricing)
// GPT-5-mini flex: $0.125/1M input, $1.00/1M output
// Low detail image = 85 tokens, ~10 tokens output = ~$0.00002 per image
const COST_PER_IMAGE = 0.00002;
const IMAGES_PER_PROFILE = 6;
const COST_PER_PROFILE = COST_PER_IMAGE * IMAGES_PER_PROFILE; // ~$0.00012

interface PendingCandidate {
  id: string;
  instagram_handle: string;
  biography: string | null;
  follower_count: number | null;
  source_type: string;
  source_id: string;
}

interface ClassificationResult {
  passed: boolean;
  confidence: number;
  tattooCount: number;
  totalImages: number;
}

function parseArgs(): { limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { limit, dryRun };
}

async function getPendingCandidates(limit: number): Promise<PendingCandidate[]> {
  const query = supabase
    .from('mining_candidates')
    .select('id, instagram_handle, biography, follower_count, source_type, source_id')
    .eq('bio_filter_passed', false)
    .is('image_filter_passed', null)
    .order('created_at', { ascending: true });

  if (limit !== Infinity) {
    query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Classify] Error fetching pending candidates:', error);
    return [];
  }

  return data || [];
}

/**
 * Download an image and convert to base64 data URL
 * OpenAI can't fetch Instagram CDN URLs directly (they're signed/expiring)
 */
async function imageToBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    return null;
  }
}

async function classifyImages(images: string[]): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Classify] OPENAI_API_KEY is not configured');
    return { passed: false, confidence: 0, tattooCount: 0, totalImages: 0 };
  }

  const client = new OpenAI({ apiKey });
  const imagesToClassify = images.slice(0, IMAGES_PER_PROFILE);

  // Download all images first (parallel)
  const base64Images = await Promise.all(
    imagesToClassify.map(url => imageToBase64(url))
  );

  // Filter out failed downloads
  const validImages = base64Images.filter((img): img is string => img !== null);

  if (validImages.length < 3) {
    console.log(`[Classify] Only ${validImages.length} images downloaded successfully`);
    return { passed: false, confidence: 0, tattooCount: 0, totalImages: validImages.length };
  }

  const classificationPromises = validImages.map(async (base64Image, index) => {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-5-mini',
        service_tier: 'flex',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Is this an image showcasing tattoo work? Answer 'yes' if the primary purpose is to display a tattoo (finished or in-progress).

Answer 'YES' if:
- Shows a completed tattoo on someone's body (any angle or quality)
- Shows a tattoo being worked on (in-progress shop photo)
- The main subject is the tattoo artwork itself

Answer 'NO' if:
- Personal selfie/portrait where tattoos are just visible but not the focus
- Lifestyle photos (beach, family gatherings, parties) where person happens to have tattoos
- Promotional graphics (text announcements, flyers, event posters)
- Holiday/celebration posts without tattoo focus
- Photos where tattoos are purely incidental background elements

Answer only 'yes' or 'no'.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_completion_tokens: 10,
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      return result === 'yes';
    } catch (error) {
      console.error(`[Classify] Error classifying image ${index + 1}:`, error);
      return false;
    }
  });

  const results = await Promise.all(classificationPromises);
  const tattooCount = results.filter(Boolean).length;
  const totalImages = results.length;

  // Need at least 3 tattoo images to pass
  const passed = tattooCount >= 3;
  const confidence = totalImages > 0 ? tattooCount / totalImages : 0;

  return { passed, confidence, tattooCount, totalImages };
}

async function updateCandidate(
  candidateId: string,
  passed: boolean,
  artistId?: string
): Promise<void> {
  const { error } = await supabase
    .from('mining_candidates')
    .update({
      image_filter_passed: passed,
      inserted_as_artist_id: artistId || null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', candidateId);

  if (error) {
    console.error(`[Classify] Error updating candidate:`, error);
  }
}

async function insertArtist(candidate: PendingCandidate, location: ReturnType<typeof extractLocationFromBio>): Promise<string | null> {
  // Generate slug from handle (uses centralized utility that handles edge cases)
  const slug = generateSlugFromInstagram(candidate.instagram_handle);

  // Generate name from handle (capitalize words)
  const name = candidate.instagram_handle
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      name,
      slug,
      instagram_handle: candidate.instagram_handle,
      instagram_url: `https://instagram.com/${candidate.instagram_handle}`,
      bio: candidate.biography,
      follower_count: candidate.follower_count,
      discovery_source: `${candidate.source_type}_mining_classified`,
      verification_status: 'unclaimed',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Duplicate - already exists
      console.log(`[Classify] Artist @${candidate.instagram_handle} already exists`);
      return null;
    }
    console.error(`[Classify] Error inserting artist:`, error);
    return null;
  }

  const artistId = data?.id || null;

  // Insert into artist_locations (single source of truth for location data)
  if (artistId && location?.city && location?.stateCode) {
    const { error: locError } = await supabase.from('artist_locations').insert({
      artist_id: artistId,
      city: location.city,
      region: location.stateCode,
      country_code: 'US',
      location_type: 'city',
      is_primary: true,
      display_order: 0,
    });
    if (locError && locError.code !== '23505') {
      console.warn(`[Classify] Warning: Could not insert location for @${candidate.instagram_handle}: ${locError.message}`);
    }
  }

  return artistId;
}

async function processCandidate(candidate: PendingCandidate): Promise<{
  passed: boolean;
  inserted: boolean;
  error?: string;
}> {
  try {
    // Fetch fresh profile images
    const profileData = await fetchInstagramProfileImages(candidate.instagram_handle, IMAGES_PER_PROFILE);

    if (profileData.images.length < 3) {
      await updateCandidate(candidate.id, false);
      return { passed: false, inserted: false, error: 'Not enough images' };
    }

    // Classify images
    const result = await classifyImages(profileData.images);

    if (!result.passed) {
      await updateCandidate(candidate.id, false);
      return { passed: false, inserted: false };
    }

    // Passed! Extract location and insert artist
    const location = extractLocationFromBio(profileData.bio);

    // GDPR compliance: Skip EU artists
    if (location?.isGDPR) {
      console.log(`[Classify] 🇪🇺 Skipped EU artist: @${candidate.instagram_handle} (${location.countryCode})`);
      await updateCandidate(candidate.id, true, undefined);
      return { passed: true, inserted: false };
    }

    const artistId = await insertArtist(candidate, location);

    await updateCandidate(candidate.id, true, artistId || undefined);

    return { passed: true, inserted: !!artistId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Classify] Error processing @${candidate.instagram_handle}:`, errorMsg);

    // Don't mark as processed on transient errors (profile fetch failures)
    if (errorMsg.includes('private') || errorMsg.includes('not found')) {
      await updateCandidate(candidate.id, false);
    }

    return { passed: false, inserted: false, error: errorMsg };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('BATCH CLASSIFICATION - Pending Mining Candidates');
  console.log('='.repeat(60));

  const { limit, dryRun } = parseArgs();

  // Fetch pending candidates
  console.log('\n[Classify] Fetching pending candidates...');
  const candidates = await getPendingCandidates(limit);

  if (candidates.length === 0) {
    console.log('[Classify] No pending candidates to process.');
    return;
  }

  console.log(`[Classify] Found ${candidates.length} pending candidates`);
  console.log(`[Classify] Estimated cost: $${(candidates.length * COST_PER_PROFILE).toFixed(2)}`);

  if (dryRun) {
    console.log('\n[Classify] DRY RUN - Would process:');
    candidates.slice(0, 20).forEach((c, i) => {
      console.log(`  ${i + 1}. @${c.instagram_handle} (${c.follower_count || 0} followers)`);
    });
    if (candidates.length > 20) {
      console.log(`  ... and ${candidates.length - 20} more`);
    }
    return;
  }

  // Process candidates
  console.log('\n[Classify] Processing candidates...\n');

  const stats = {
    processed: 0,
    passed: 0,
    failed: 0,
    inserted: 0,
    errors: 0,
  };

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`[${i + 1}/${candidates.length}] @${candidate.instagram_handle}...`);

    const result = await processCandidate(candidate);
    stats.processed++;

    if (result.error) {
      console.log(`  ⚠️ Error: ${result.error}`);
      stats.errors++;
    } else if (result.passed) {
      console.log(`  ✅ PASSED${result.inserted ? ' - Artist inserted' : ' - Already exists'}`);
      stats.passed++;
      if (result.inserted) stats.inserted++;
    } else {
      console.log(`  ❌ Failed image classification`);
      stats.failed++;
    }

    // Small delay between profiles to avoid rate limits
    if (i < candidates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('CLASSIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nResults:`);
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  Passed: ${stats.passed}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Artists inserted: ${stats.inserted}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`\nEstimated cost: $${(stats.processed * COST_PER_PROFILE).toFixed(2)}`);
}

main().catch(console.error);
