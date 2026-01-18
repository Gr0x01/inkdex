#!/usr/bin/env npx tsx
/**
 * Extract Locations from Instagram Bios using GPT-4.1-nano
 *
 * Processes artists with bios and updates artist_locations table.
 * Uses the same GPT-based extraction as the real-time extractor.
 *
 * Usage:
 *   npx tsx scripts/maintenance/extract-bio-locations.ts
 *   npx tsx scripts/maintenance/extract-bio-locations.ts --limit 100
 *   npx tsx scripts/maintenance/extract-bio-locations.ts --dry-run
 *   npx tsx scripts/maintenance/extract-bio-locations.ts --all  # Re-extract all, not just missing
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Cost: ~200 input + 30 output tokens per extraction
// gpt-4.1-nano: $0.10/1M input, $0.025/1M output
const COST_PER_EXTRACTION = 0.0000275;

interface ExtractedLocation {
  city: string | null;
  region: string | null;
  country_code: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface ArtistWithBio {
  id: string;
  instagram_handle: string;
  bio: string;
}

const SYSTEM_PROMPT = `Extract location from tattoo artist Instagram bio. Return JSON only.

Rules:
1. US locations: city + 2-letter state code (e.g., "Austin, TX" -> city: "Austin", region: "TX", country_code: "US")
2. International: city + region/province + ISO 3166-1 alpha-2 country code
3. Recognize patterns: "📍Austin", "Based in NYC", "ATX tattoos", "Brooklyn NY", "LA based", "Seattle WA"
4. Common US abbreviations: NYC=New York, LA=Los Angeles, ATX=Austin, PHX=Phoenix, PDX=Portland, SEA=Seattle, CHI=Chicago, SF=San Francisco, NOLA=New Orleans, BK/BKN=Brooklyn
5. If only state/country mentioned, set city: null
6. If location unclear or not mentioned, return all null fields
7. Confidence: high (explicit "📍" or "based in"), medium (city/state detected), low (uncertain)

JSON format: {"city":"Austin","region":"TX","country_code":"US","confidence":"high"}`;

interface ParsedArgs {
  limit: number | null;
  dryRun: boolean;
  concurrency: number;
  all: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;
  let concurrency = 20;
  let all = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (isNaN(parsed) || parsed <= 0) {
        console.error(`Invalid --limit value: ${args[i + 1]}`);
        process.exit(1);
      }
      limit = parsed;
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (isNaN(parsed) || parsed <= 0) {
        console.error(`Invalid --concurrency value: ${args[i + 1]}`);
        process.exit(1);
      }
      concurrency = parsed;
      i++;
    }
  }

  return { limit, dryRun, concurrency, all };
}

async function getArtistsToProcess(limit: number | null, all: boolean): Promise<ArtistWithBio[]> {
  // Get artists with bios
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, instagram_handle, bio')
    .not('bio', 'is', null)
    .neq('bio', '')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching artists:', error);
    return [];
  }

  if (all) {
    // Process all artists with bios
    console.log(`Found ${artists?.length || 0} artists with bios (--all mode)`);
    return limit ? artists?.slice(0, limit) || [] : artists || [];
  }

  // Get existing artist_locations entries
  const { data: existingLocs } = await supabase
    .from('artist_locations')
    .select('artist_id');

  const existingIds = new Set(existingLocs?.map(l => l.artist_id) || []);
  console.log(`Found ${existingIds.size} artists with existing locations`);

  // Filter out those already in artist_locations
  const needsExtraction = artists?.filter(a => !existingIds.has(a.id)) || [];
  console.log(`Found ${needsExtraction.length} artists needing extraction`);

  return limit ? needsExtraction.slice(0, limit) : needsExtraction;
}

const MAX_RETRIES = 5;

async function extractLocation(bio: string, retryCount = 0): Promise<ExtractedLocation | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: bio.substring(0, 500) },
      ],
      max_tokens: 100,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(content);

    return {
      city: parsed.city || null,
      region: parsed.region || null,
      country_code: parsed.country_code || null,
      confidence: parsed.confidence || 'medium',
    };
  } catch (error: any) {
    if (error?.status === 429 && retryCount < MAX_RETRIES) {
      const waitTime = Math.min(2000 * Math.pow(2, retryCount), 60000);
      console.log(`\n  Rate limited, waiting ${waitTime / 1000}s (retry ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return extractLocation(bio, retryCount + 1);
    }
    console.error(`\n  Error extracting location: ${error.message}`);
    return null;
  }
}

async function saveLocation(
  artistId: string,
  location: ExtractedLocation,
  dryRun: boolean,
  updateExisting: boolean
): Promise<{ success: boolean; action: string }> {
  // Skip if no city (state-only not useful for location_type='city')
  if (!location.city) {
    return { success: false, action: 'no_location' };
  }

  if (dryRun) {
    return { success: true, action: 'dry_run' };
  }

  if (updateExisting) {
    // Check if artist already has a primary location
    const { data: existing } = await supabase
      .from('artist_locations')
      .select('id')
      .eq('artist_id', artistId)
      .eq('is_primary', true)
      .single();

    if (existing) {
      // Update existing location
      const { error } = await supabase
        .from('artist_locations')
        .update({
          city: location.city,
          region: location.region,
          country_code: location.country_code || 'US',
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`\n  Update error: ${error.message}`);
        return { success: false, action: 'error' };
      }
      return { success: true, action: 'updated' };
    }
  }

  // Insert new location
  const { error } = await supabase
    .from('artist_locations')
    .insert({
      artist_id: artistId,
      city: location.city,
      region: location.region,
      country_code: location.country_code || 'US',
      location_type: 'city',
      is_primary: true,
      display_order: 0,
    });

  if (error) {
    // Duplicate is OK - artist already has a location
    if (error.code === '23505' || error.message.includes('Location limit')) {
      return { success: false, action: 'duplicate' };
    }
    console.error(`\n  Insert error: ${error.message}`);
    return { success: false, action: 'error' };
  }

  return { success: true, action: 'inserted' };
}

interface ProcessResult {
  artistId: string;
  handle: string;
  location: ExtractedLocation | null;
  action: string;
}

async function processBatch(artists: ArtistWithBio[], dryRun: boolean, updateExisting: boolean): Promise<ProcessResult[]> {
  return Promise.all(
    artists.map(async (artist) => {
      const location = await extractLocation(artist.bio);

      if (!location) {
        return { artistId: artist.id, handle: artist.instagram_handle, location: null, action: 'error' };
      }

      const { action } = await saveLocation(artist.id, location, dryRun, updateExisting);

      return { artistId: artist.id, handle: artist.instagram_handle, location, action };
    })
  );
}

async function main() {
  const { limit, dryRun, concurrency, all } = parseArgs();

  console.log('Bio Location Extraction (GPT-4.1-nano)');
  console.log('======================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Scope: ${all ? 'ALL artists with bios' : 'Only artists missing locations'}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  const artists = await getArtistsToProcess(limit, all);
  console.log(`\nArtists to process: ${artists.length}`);
  console.log(`Estimated cost: $${(artists.length * COST_PER_EXTRACTION).toFixed(4)}`);
  console.log('');

  if (artists.length === 0) {
    console.log('No artists to process!');
    return;
  }

  // Stats
  const stats = {
    processed: 0,
    inserted: 0,
    updated: 0,
    noLocation: 0,
    errors: 0,
  };

  const countryCount: Record<string, number> = {};
  const samples: ProcessResult[] = [];
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < artists.length; i += concurrency) {
    const batch = artists.slice(i, i + concurrency);
    const results = await processBatch(batch, dryRun, all);

    for (const result of results) {
      stats.processed++;

      switch (result.action) {
        case 'error':
          stats.errors++;
          break;
        case 'no_location':
          stats.noLocation++;
          break;
        case 'updated':
          stats.updated++;
          if (result.location?.country_code) {
            countryCount[result.location.country_code] = (countryCount[result.location.country_code] || 0) + 1;
          }
          if (samples.length < 10) samples.push(result);
          break;
        case 'inserted':
        case 'dry_run':
          stats.inserted++;
          if (result.location?.country_code) {
            countryCount[result.location.country_code] = (countryCount[result.location.country_code] || 0) + 1;
          }
          if (samples.length < 10) samples.push(result);
          break;
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = stats.processed / elapsed;
    const eta = (artists.length - stats.processed) / rate;

    process.stdout.write(
      `\rProcessed ${stats.processed}/${artists.length} ` +
      `(${stats.inserted} new, ${stats.updated} updated, ${stats.noLocation} no-loc) ` +
      `[${rate.toFixed(1)}/s, ETA: ${Math.round(eta)}s]`
    );
  }

  console.log('\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total processed: ${stats.processed}`);
  console.log(`New locations: ${stats.inserted}`);
  console.log(`Updated locations: ${stats.updated}`);
  console.log(`No location found: ${stats.noLocation}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');

  // Country distribution
  if (Object.keys(countryCount).length > 0) {
    console.log('Country distribution:');
    const sorted = Object.entries(countryCount).sort((a, b) => b[1] - a[1]);
    for (const [country, count] of sorted.slice(0, 15)) {
      console.log(`  ${country}: ${count}`);
    }
    console.log('');
  }

  // Sample extractions
  if (samples.length > 0) {
    console.log(`Sample extractions${dryRun ? ' (would be inserted)' : ''}:`);
    for (const s of samples) {
      console.log(
        `  @${s.handle}: ${s.location?.city || '?'}, ${s.location?.region || '?'} (${s.location?.country_code}) [${s.location?.confidence}]`
      );
    }
    console.log('');
  }

  console.log(`Actual cost: ~$${(stats.processed * COST_PER_EXTRACTION).toFixed(4)}`);
}

main().catch(console.error);
