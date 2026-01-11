#!/usr/bin/env npx tsx
/**
 * Hashtag Mining Script
 *
 * Discovers tattoo artists by scraping Instagram hashtags.
 * Uses two-stage classification: bio keywords first, then GPT-5-mini image fallback.
 *
 * Usage:
 *   npm run mine:hashtags                              # Run with default hashtags
 *   npm run mine:hashtags -- --hashtag tattooartist
 *   npm run mine:hashtags -- --dry-run                 # Estimate costs without scraping
 *   npm run mine:hashtags -- --skip-images             # Skip image classification (bio only)
 *   npm run mine:hashtags -- --limit 50                # IMPORTANT: Limit candidates to process (controls Apify profile costs!)
 *   npm run mine:hashtags -- --posts 100               # Limit posts per hashtag (controls Apify hashtag costs)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import {
  scrapeHashtag,
  estimateHashtagScrapingCost,
  HashtagScraperResult,
} from '../../lib/instagram/hashtag-scraper';
import { fetchInstagramProfileImages } from '../../lib/instagram/profile-fetcher';
import {
  isTattooArtistByBio,
  getMatchingBioKeywords,
  classifyTattooArtist,
} from '../../lib/instagram/classifier';
import { generateSlugFromInstagram } from '../../lib/utils/slug';
import { extractLocationFromBio, checkBioForGDPR } from '../../lib/instagram/bio-location-extractor';

// ============================================================================
// Configuration
// ============================================================================

// Default hashtags to mine (prioritized by artist density)
const DEFAULT_HASHTAGS = {
  // High artist density (60-70%)
  artistFocused: [
    'tattooartist',
    'tattooist',
    'tattooer',
    'tattooart',
    'tattooing',
  ],
  // Style-specific (40-60% artist density)
  styles: [
    'blackworktattoo',
    'finelinetattoo',
    'traditionaltattoo',
    'neotraditionaltattoo',
    'realistictattoo',
    'geometrictattoo',
    'watercolortattoo',
    'dotworktattoo',
  ],
  // City-specific (30-50% artist density, helps with location)
  cities: [
    'nyctattoo',
    'latattoo',
    'austintattoo',
    'chicagotattoo',
    'miamitattoo',
    'seattletattoo',
    'portlandtattoo',
    'atlantatattoo',
  ],
};

// Processing configuration
const CONFIG = {
  postsPerHashtag: 5000, // Max posts per hashtag
  delayBetweenHashtags: 5000, // 5 seconds
  batchSize: 50, // Profiles to process at once
  profileFetchConcurrency: 10, // Parallel profile fetches (Starter plan allows 32 concurrent)
};

// Cost estimates
const COSTS = {
  apifyPer1KPosts: 2.60, // Official actor
  openaiPerClassification: 0.02, // GPT-5-mini with 6 images
};

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Concurrency Limiter
// ============================================================================

/**
 * Simple concurrency limiter for parallel operations
 * Processes items with a maximum of `concurrency` items running at once
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then((result) => {
      results.push(result);
    });
    executing.push(p as unknown as Promise<void>);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const status = await Promise.race([
          executing[i].then(() => 'resolved'),
          Promise.resolve('pending'),
        ]);
        if (status === 'resolved') {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseArgs(): {
  hashtags: string[];
  dryRun: boolean;
  skipImages: boolean;
  maxHashtags: number;
  postsPerHashtag: number;
  maxCandidates: number;
} {
  const args = process.argv.slice(2);
  const hashtags: string[] = [];
  let dryRun = false;
  let skipImages = false;
  let maxHashtags = Infinity;
  let postsPerHashtag = CONFIG.postsPerHashtag;
  let maxCandidates = Infinity; // Default: no limit (DANGEROUS - use --limit!)

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--hashtag' && args[i + 1]) {
      hashtags.push(args[i + 1].replace(/^#/, ''));
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--skip-images') {
      skipImages = true;
    } else if (args[i] === '--max' && args[i + 1]) {
      maxHashtags = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--posts' && args[i + 1]) {
      postsPerHashtag = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      maxCandidates = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Use default hashtags if none specified
  if (hashtags.length === 0) {
    hashtags.push(
      ...DEFAULT_HASHTAGS.artistFocused,
      ...DEFAULT_HASHTAGS.styles,
      ...DEFAULT_HASHTAGS.cities
    );
  }

  return { hashtags: hashtags.slice(0, maxHashtags), dryRun, skipImages, maxHashtags, postsPerHashtag, maxCandidates };
}

async function getExistingHandles(): Promise<Set<string>> {
  console.log('[Mining] Fetching existing artist handles...');

  const { data, error } = await supabase
    .from('artists')
    .select('instagram_handle')
    .not('instagram_handle', 'is', null);

  if (error) {
    console.error('[Mining] Error fetching existing handles:', error);
    return new Set();
  }

  const handles = new Set(
    data.map(a => a.instagram_handle?.toLowerCase()).filter(Boolean)
  );

  console.log(`[Mining] Found ${handles.size} existing artists`);
  return handles;
}

async function getFailedCandidates(): Promise<Set<string>> {
  console.log('[Mining] Fetching recently failed candidates...');

  // Get handles that failed classification (bio=false, image=false) in the last 30 days
  // Older failures can be retried in case the account changed
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('mining_candidates')
    .select('instagram_handle')
    .eq('bio_filter_passed', false)
    .eq('image_filter_passed', false)
    .gte('processed_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('[Mining] Error fetching failed candidates:', error);
    return new Set();
  }

  const handles = new Set(
    data.map(c => c.instagram_handle?.toLowerCase()).filter(Boolean)
  );

  console.log(`[Mining] Found ${handles.size} recently failed candidates (will skip for 30 days)`);
  return handles;
}

async function getProcessedHashtags(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('hashtag_mining_runs')
    .select('hashtag')
    .eq('status', 'completed');

  if (error) {
    console.error('[Mining] Error fetching processed hashtags:', error);
    return new Set();
  }

  return new Set(data.map(r => r.hashtag.toLowerCase()));
}

async function createMiningRun(hashtag: string): Promise<string> {
  const { data, error } = await supabase
    .from('hashtag_mining_runs')
    .insert({
      hashtag: hashtag.toLowerCase(),
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create mining run: ${error.message}`);
  }

  return data.id;
}

async function updateMiningRun(
  runId: string,
  updates: Record<string, any>
): Promise<void> {
  console.log(`[Mining] Updating run ${runId}:`, JSON.stringify(updates, null, 2));

  const { data, error } = await supabase
    .from('hashtag_mining_runs')
    .update(updates)
    .eq('id', runId)
    .select();

  if (error) {
    console.error('[Mining] Error updating run:', error);
  } else if (!data || data.length === 0) {
    console.error('[Mining] Warning: Update returned no rows - run may not exist');
  } else {
    console.log(`[Mining] Successfully updated run. posts_scraped=${data[0]?.posts_scraped}`);
  }
}

async function insertArtist(profile: {
  username: string;
  bio?: string;
  followerCount?: number;
  city?: string;
  state?: string;
  discoverySource: string;
}): Promise<boolean> {
  // Generate slug (uses centralized utility that handles edge cases)
  const baseSlug = generateSlugFromInstagram(profile.username);

  const { data: artistData, error } = await supabase.from('artists').insert({
    name: profile.username, // Use username as name initially
    slug: baseSlug,
    instagram_handle: profile.username.toLowerCase(),
    instagram_url: `https://instagram.com/${profile.username}`,
    bio: profile.bio,
    follower_count: profile.followerCount,
    discovery_source: profile.discoverySource,
    verification_status: 'unclaimed',
  }).select('id').single();

  if (error) {
    // Likely duplicate
    if (error.code === '23505') {
      return false;
    }
    console.error(`[Mining] Error inserting artist ${profile.username}:`, error);
    return false;
  }

  // Insert into artist_locations (single source of truth for location data)
  if (artistData?.id && profile.city) {
    const { error: locError } = await supabase.from('artist_locations').insert({
      artist_id: artistData.id,
      city: profile.city,
      region: profile.state || null,
      country_code: 'US',
      location_type: 'city',
      is_primary: true,
      display_order: 0,
    });
    if (locError && locError.code !== '23505') {
      console.warn(`[Mining] Warning: Could not insert location for @${profile.username}: ${locError.message}`);
    }
  }

  return true;
}

async function saveMiningCandidate(candidate: {
  handle: string;
  sourceType: 'hashtag';
  sourceId: string;
  bio?: string;
  followerCount?: number;
  bioFilterPassed: boolean | null;
  imageFilterPassed?: boolean | null;
  extractedCity?: string;
  extractedState?: string;
  locationConfidence?: 'high' | 'medium' | 'low';
  insertedAsArtistId?: string;
}): Promise<void> {
  const { error } = await supabase.from('mining_candidates').insert({
    instagram_handle: candidate.handle.toLowerCase(),
    source_type: candidate.sourceType,
    source_id: candidate.sourceId,
    biography: candidate.bio,
    follower_count: candidate.followerCount,
    bio_filter_passed: candidate.bioFilterPassed,
    image_filter_passed: candidate.imageFilterPassed ?? null,
    extracted_city: candidate.extractedCity,
    extracted_state: candidate.extractedState,
    location_confidence: candidate.locationConfidence,
    inserted_as_artist_id: candidate.insertedAsArtistId,
    processed_at: candidate.bioFilterPassed !== null ? new Date().toISOString() : null,
  });

  if (error) {
    console.error(`[Mining] Failed to save candidate @${candidate.handle}:`, error.message);
  }
}

// ============================================================================
// Main Processing Logic
// ============================================================================

async function processHashtag(
  hashtag: string,
  existingHandles: Set<string>,
  failedCandidates: Set<string>,
  skipImages: boolean,
  maxPosts: number = CONFIG.postsPerHashtag,
  maxCandidates: number = Infinity
): Promise<{
  postsScraped: number;
  uniqueHandles: number;
  newHandles: number;
  bioFilterPassed: number;
  imageFilterPassed: number;
  artistsInserted: number;
  apifyCost: number;
  openaiCost: number;
}> {
  const stats = {
    postsScraped: 0,
    uniqueHandles: 0,
    newHandles: 0,
    bioFilterPassed: 0,
    imageFilterPassed: 0,
    artistsInserted: 0,
    skippedGDPR: 0,  // EU/GDPR artists skipped for compliance
    apifyCost: 0,
    openaiCost: 0,
  };

  // Create mining run record
  const runId = await createMiningRun(hashtag);

  try {
    // Step 1: Scrape hashtag
    console.log(`\n[Mining] Scraping #${hashtag}...`);
    const scrapeResult = await scrapeHashtag({
      hashtag,
      maxPosts,
    });

    stats.postsScraped = scrapeResult.totalPosts;
    stats.uniqueHandles = scrapeResult.uniqueUsers;
    stats.apifyCost = scrapeResult.estimatedCost;

    await updateMiningRun(runId, {
      posts_scraped: stats.postsScraped,
      unique_handles_found: stats.uniqueHandles,
      apify_cost_estimate: stats.apifyCost,
    });

    // Step 2: Filter out existing handles and previously failed candidates
    const existingCount = scrapeResult.uniqueUsernames.filter(
      u => existingHandles.has(u.toLowerCase())
    ).length;
    const failedCount = scrapeResult.uniqueUsernames.filter(
      u => !existingHandles.has(u.toLowerCase()) && failedCandidates.has(u.toLowerCase())
    ).length;

    let newUsernames = scrapeResult.uniqueUsernames.filter(
      u => !existingHandles.has(u.toLowerCase()) && !failedCandidates.has(u.toLowerCase())
    );
    const totalNewHandles = newUsernames.length;

    // CRITICAL: Apply limit to control Apify profile scraping costs (~$0.02 per profile!)
    if (maxCandidates < Infinity && newUsernames.length > maxCandidates) {
      console.log(`[Mining] ⚠️ LIMITING candidates from ${newUsernames.length} to ${maxCandidates} (--limit flag)`);
      newUsernames = newUsernames.slice(0, maxCandidates);
    }
    stats.newHandles = newUsernames.length;

    console.log(`[Mining] ${newUsernames.length} candidates to process (${totalNewHandles} new, ${existingCount} already exist, ${failedCount} previously failed)`);
    if (maxCandidates < Infinity) {
      console.log(`[Mining] Estimated profile scraping cost: ~$${(newUsernames.length * 0.02).toFixed(2)} (${newUsernames.length} profiles @ ~$0.02/each)`);
    }

    if (newUsernames.length === 0) {
      await updateMiningRun(runId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      return stats;
    }

    // Step 3: Fetch profiles and classify
    console.log(`[Mining] Classifying ${newUsernames.length} profiles...`);

    for (let i = 0; i < newUsernames.length; i += CONFIG.batchSize) {
      const batch = newUsernames.slice(i, i + CONFIG.batchSize);
      console.log(`[Mining] Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(newUsernames.length / CONFIG.batchSize)}`);

      // Process batch with limited concurrency
      await mapWithConcurrency(batch, async (username) => {
        try {
          // Fetch profile data
          const profileData = await fetchInstagramProfileImages(username, 6);

          // Stage 1: Bio keyword check
          const bioMatch = isTattooArtistByBio(profileData.bio);

          if (bioMatch) {
            stats.bioFilterPassed++;

            // Extract location
            const location = extractLocationFromBio(profileData.bio);

            // GDPR compliance: Skip EU artists
            if (location?.isGDPR) {
              stats.skippedGDPR++;
              console.log(`[Mining] 🇪🇺 Skipped EU artist: @${username} (${location.countryCode})`);

              // Save candidate record with GDPR skip reason
              await saveMiningCandidate({
                handle: username,
                sourceType: 'hashtag',
                sourceId: runId,
                bio: profileData.bio,
                followerCount: profileData.followerCount,
                bioFilterPassed: true,
                extractedCity: location?.city ?? undefined,
                extractedState: location?.stateCode ?? undefined,
                locationConfidence: location?.confidence,
              });
              return;
            }

            // Insert artist
            const inserted = await insertArtist({
              username,
              bio: profileData.bio,
              followerCount: profileData.followerCount,
              city: location?.city ?? undefined,
              state: location?.stateCode ?? undefined,
              discoverySource: `hashtag_${hashtag}`,
            });

            if (inserted) {
              stats.artistsInserted++;
              existingHandles.add(username.toLowerCase());
              console.log(`[Mining] ✅ Inserted: @${username} (bio match: ${getMatchingBioKeywords(profileData.bio).join(', ')})`);
            }

            // Save candidate record (bio passed)
            await saveMiningCandidate({
              handle: username,
              sourceType: 'hashtag',
              sourceId: runId,
              bio: profileData.bio,
              followerCount: profileData.followerCount,
              bioFilterPassed: true,
              extractedCity: location?.city ?? undefined,
              extractedState: location?.stateCode ?? undefined,
              locationConfidence: location?.confidence,
              insertedAsArtistId: inserted ? undefined : undefined, // TODO: get artist ID from insert
            });

            return;
          }

          // Stage 2: Image classification (if not skipped)
          if (!skipImages && profileData.posts.length >= 3) {
            stats.openaiCost += COSTS.openaiPerClassification;

            const classResult = await classifyTattooArtist(username);

            if (classResult.passed) {
              stats.imageFilterPassed++;

              const location = extractLocationFromBio(profileData.bio);

              // GDPR compliance: Skip EU artists
              if (location?.isGDPR) {
                stats.skippedGDPR++;
                console.log(`[Mining] 🇪🇺 Skipped EU artist: @${username} (${location.countryCode})`);

                // Save candidate record with GDPR skip reason
                await saveMiningCandidate({
                  handle: username,
                  sourceType: 'hashtag',
                  sourceId: runId,
                  bio: profileData.bio,
                  followerCount: profileData.followerCount,
                  bioFilterPassed: false,
                  imageFilterPassed: true,
                  extractedCity: location?.city ?? undefined,
                  extractedState: location?.stateCode ?? undefined,
                  locationConfidence: location?.confidence,
                });
                return;
              }

              const inserted = await insertArtist({
                username,
                bio: profileData.bio,
                followerCount: profileData.followerCount,
                city: location?.city ?? undefined,
                state: location?.stateCode ?? undefined,
                discoverySource: `hashtag_${hashtag}`,
              });

              if (inserted) {
                stats.artistsInserted++;
                existingHandles.add(username.toLowerCase());
                console.log(`[Mining] ✅ Inserted: @${username} (image classification: ${classResult.confidence.toFixed(2)})`);
              }

              // Save candidate record (image passed)
              await saveMiningCandidate({
                handle: username,
                sourceType: 'hashtag',
                sourceId: runId,
                bio: profileData.bio,
                followerCount: profileData.followerCount,
                bioFilterPassed: false,
                imageFilterPassed: true,
                extractedCity: location?.city ?? undefined,
                extractedState: location?.stateCode ?? undefined,
                locationConfidence: location?.confidence,
              });
            } else {
              // Save candidate record (image failed)
              await saveMiningCandidate({
                handle: username,
                sourceType: 'hashtag',
                sourceId: runId,
                bio: profileData.bio,
                followerCount: profileData.followerCount,
                bioFilterPassed: false,
                imageFilterPassed: false,
              });
            }
          } else if (!bioMatch) {
            // Bio failed and images skipped - save as pending for later classification
            await saveMiningCandidate({
              handle: username,
              sourceType: 'hashtag',
              sourceId: runId,
              bio: profileData.bio,
              followerCount: profileData.followerCount,
              bioFilterPassed: false,
              imageFilterPassed: null, // Pending - not yet classified
            });
            console.log(`[Mining] 📋 Queued for image classification: @${username}`);
          }
        } catch (error) {
          // Profile fetch failed (private, deleted, etc.)
          console.log(`[Mining] ⚠️ Skipped @${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, CONFIG.profileFetchConcurrency);

      // Small delay between batches
      if (i + CONFIG.batchSize < newUsernames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update final stats
    await updateMiningRun(runId, {
      bio_filter_passed: stats.bioFilterPassed,
      image_filter_passed: stats.imageFilterPassed,
      artists_inserted: stats.artistsInserted,
      openai_cost_estimate: stats.openaiCost,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[Mining] Error processing #${hashtag}:`, error);
    await updateMiningRun(runId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString(),
    });
  }

  return stats;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('HASHTAG MINING - Tattoo Artist Discovery');
  console.log('='.repeat(60));

  const { hashtags, dryRun, skipImages, postsPerHashtag, maxCandidates } = parseArgs();

  console.log(`\nConfiguration:`);
  console.log(`  Hashtags: ${hashtags.length}`);
  console.log(`  Posts per hashtag: ${postsPerHashtag}`);
  console.log(`  Max candidates per hashtag: ${maxCandidates === Infinity ? 'UNLIMITED ⚠️' : maxCandidates}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log(`  Skip image classification: ${skipImages}`);

  // WARN if no limit is set - profile scraping is expensive!
  if (maxCandidates === Infinity && !dryRun) {
    console.log(`\n⚠️  WARNING: No --limit set! Each candidate costs ~$0.02 for profile scraping.`);
    console.log(`   A hashtag with 5000 posts could have 3000+ unique handles = ~$60 in profile costs!`);
    console.log(`   Consider using: --limit 50 for testing, --limit 500 for production runs\n`);
  }

  // Estimate costs
  const estimatedApifyCost = estimateHashtagScrapingCost(hashtags, postsPerHashtag);
  const estimatedOpenAICost = skipImages ? 0 : hashtags.length * postsPerHashtag * 0.3 * COSTS.openaiPerClassification;

  console.log(`\nEstimated costs:`);
  console.log(`  Apify: $${estimatedApifyCost.toFixed(2)}`);
  console.log(`  OpenAI (image classification): $${estimatedOpenAICost.toFixed(2)}`);
  console.log(`  Total: $${(estimatedApifyCost + estimatedOpenAICost).toFixed(2)}`);

  if (dryRun) {
    console.log('\n[Dry Run] Exiting without scraping.');
    return;
  }

  // Get existing handles and failed candidates for deduplication
  const existingHandles = await getExistingHandles();
  const failedCandidates = await getFailedCandidates();
  const processedHashtags = await getProcessedHashtags();

  // Filter out already-processed hashtags
  const hashtagsToProcess = hashtags.filter(h => !processedHashtags.has(h.toLowerCase()));

  if (hashtagsToProcess.length < hashtags.length) {
    console.log(`\n[Mining] Skipping ${hashtags.length - hashtagsToProcess.length} already-processed hashtags`);
  }

  if (hashtagsToProcess.length === 0) {
    console.log('[Mining] All hashtags already processed. Exiting.');
    return;
  }

  console.log(`\n[Mining] Processing ${hashtagsToProcess.length} hashtags...`);

  // Process each hashtag
  const totalStats = {
    postsScraped: 0,
    uniqueHandles: 0,
    newHandles: 0,
    bioFilterPassed: 0,
    imageFilterPassed: 0,
    artistsInserted: 0,
    skippedGDPR: 0,
    apifyCost: 0,
    openaiCost: 0,
  };

  for (let i = 0; i < hashtagsToProcess.length; i++) {
    const hashtag = hashtagsToProcess[i];

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Hashtag ${i + 1}/${hashtagsToProcess.length}: #${hashtag}`);
    console.log('─'.repeat(60));

    const stats = await processHashtag(hashtag, existingHandles, failedCandidates, skipImages, postsPerHashtag, maxCandidates);

    // Aggregate stats
    totalStats.postsScraped += stats.postsScraped;
    totalStats.uniqueHandles += stats.uniqueHandles;
    totalStats.newHandles += stats.newHandles;
    totalStats.bioFilterPassed += stats.bioFilterPassed;
    totalStats.imageFilterPassed += stats.imageFilterPassed;
    totalStats.artistsInserted += stats.artistsInserted;
    totalStats.skippedGDPR += stats.skippedGDPR;
    totalStats.apifyCost += stats.apifyCost;
    totalStats.openaiCost += stats.openaiCost;

    // Delay between hashtags
    if (i < hashtagsToProcess.length - 1) {
      console.log(`\n[Mining] Waiting ${CONFIG.delayBetweenHashtags / 1000}s before next hashtag...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenHashtags));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('MINING COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nResults:`);
  console.log(`  Posts scraped: ${totalStats.postsScraped.toLocaleString()}`);
  console.log(`  Unique handles: ${totalStats.uniqueHandles.toLocaleString()}`);
  console.log(`  New handles: ${totalStats.newHandles.toLocaleString()}`);
  console.log(`  Bio filter passed: ${totalStats.bioFilterPassed.toLocaleString()}`);
  console.log(`  Image filter passed: ${totalStats.imageFilterPassed.toLocaleString()}`);
  console.log(`  Artists inserted: ${totalStats.artistsInserted.toLocaleString()}`);
  if (totalStats.skippedGDPR > 0) {
    console.log(`  EU/GDPR skipped: ${totalStats.skippedGDPR.toLocaleString()}`);
  }
  console.log(`\nCosts:`);
  console.log(`  Apify: $${totalStats.apifyCost.toFixed(4)}`);
  console.log(`  OpenAI: $${totalStats.openaiCost.toFixed(4)}`);
  console.log(`  Total: $${(totalStats.apifyCost + totalStats.openaiCost).toFixed(4)}`);
}

// Run
main().catch(console.error);
