#!/usr/bin/env npx tsx
/**
 * Extract Locations from Instagram Bios using GPT-4.1-mini
 *
 * Processes artists with bios but no entry in artist_locations table.
 * Uses structured JSON output for cost-efficient extraction.
 *
 * Usage:
 *   npx tsx scripts/discovery/extract-bio-locations.ts
 *   npx tsx scripts/discovery/extract-bio-locations.ts --limit 100
 *   npx tsx scripts/discovery/extract-bio-locations.ts --dry-run
 *   npx tsx scripts/discovery/extract-bio-locations.ts --concurrency 20
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { isGDPRCountry } from '../../lib/constants/countries';

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

// Cost estimate per extraction (~200 input + 20 output tokens)
// GPT-4.1-mini: $0.15/1M input, $0.60/1M output
const COST_PER_EXTRACTION = 0.000042;

interface ExtractedBioLocation {
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
2. International: city + region/province + ISO 3166-1 alpha-2 country code (e.g., "Toronto" -> city: "Toronto", region: "ON", country_code: "CA")
3. Recognize patterns: "📍Austin", "Based in NYC", "ATX tattoos", "Brooklyn NY", "Torrance, Ca", "Seattle WA"
4. Common US abbreviations: NYC=New York, LA=Los Angeles, ATX=Austin, PHX=Phoenix, PDX=Portland, SEA=Seattle, CHI=Chicago
5. If only state mentioned (e.g., "Texas artist"), set city: null, region: "TX", country_code: "US"
6. If location unclear or not mentioned, return all null fields
7. Confidence: high (explicit "📍" or "based in"), medium (city/state detected), low (uncertain)

JSON format only:
{"city":"Austin","region":"TX","country_code":"US","confidence":"high"}`;

interface ParsedArgs {
  limit: number | null;
  dryRun: boolean;
  concurrency: number;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;
  let concurrency = 20;

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

  return { limit, dryRun, concurrency };
}

async function getArtistsNeedingExtraction(limit: number | null): Promise<ArtistWithBio[]> {
  // Get existing artist_locations entries
  const { data: existingLocs } = await supabase
    .from('artist_locations')
    .select('artist_id');

  const existingIds = new Set(existingLocs?.map(l => l.artist_id) || []);
  console.log(`Found ${existingIds.size} artists with existing locations`);

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

  // Filter out those already in artist_locations
  const needsExtraction = artists?.filter(a => !existingIds.has(a.id)) || [];

  // Apply limit if specified
  return limit ? needsExtraction.slice(0, limit) : needsExtraction;
}

function isValidExtractedLocation(obj: unknown): obj is ExtractedBioLocation {
  if (typeof obj !== 'object' || obj === null) return false;
  const loc = obj as Record<string, unknown>;
  const validConfidence = ['high', 'medium', 'low', null, undefined];
  return (
    (loc.city === null || loc.city === undefined || typeof loc.city === 'string') &&
    (loc.region === null || loc.region === undefined || typeof loc.region === 'string') &&
    (loc.country_code === null || loc.country_code === undefined || typeof loc.country_code === 'string') &&
    validConfidence.includes(loc.confidence as string | null | undefined)
  );
}

const MAX_RETRIES = 5;

async function extractLocation(bio: string, retryCount = 0): Promise<ExtractedBioLocation | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: bio.substring(0, 500) }, // Truncate long bios
      ],
      max_tokens: 50,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(content);

    if (!isValidExtractedLocation(parsed)) {
      console.error('\n  Invalid response structure from GPT');
      return null;
    }

    return parsed;
  } catch (error: any) {
    if (error?.status === 429 && retryCount < MAX_RETRIES) {
      // Rate limited - wait with exponential backoff and retry
      const waitTime = Math.min(5000 * Math.pow(2, retryCount), 60000);
      console.log(`\n  Rate limited, waiting ${waitTime / 1000}s (retry ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return extractLocation(bio, retryCount + 1);
    }
    console.error(`\n  Error extracting location: ${error.message}`);
    return null;
  }
}

async function insertLocation(
  artistId: string,
  location: ExtractedBioLocation
): Promise<{ inserted: boolean; reason?: string }> {
  // Skip if no meaningful location data
  if (!location.city && !location.region) {
    return { inserted: false, reason: 'no_location' };
  }

  // Skip GDPR countries
  if (location.country_code && isGDPRCountry(location.country_code)) {
    return { inserted: false, reason: 'gdpr' };
  }

  const { error } = await supabase.from('artist_locations').insert({
    artist_id: artistId,
    city: location.city,
    region: location.region,
    country_code: location.country_code || 'US',
    location_type: 'city',
    is_primary: true,
    display_order: 0,
  });

  if (error) {
    if (error.code === '23505') {
      // Duplicate - already exists
      return { inserted: false, reason: 'duplicate' };
    }
    console.error(`\n  Insert error: ${error.message}`);
    return { inserted: false, reason: 'error' };
  }

  return { inserted: true };
}

interface ProcessResult {
  artistId: string;
  handle: string;
  location: ExtractedBioLocation | null;
  inserted: boolean;
  reason?: string;
}

async function processBatch(
  artists: ArtistWithBio[],
  dryRun: boolean
): Promise<ProcessResult[]> {
  const results = await Promise.all(
    artists.map(async (artist) => {
      const location = await extractLocation(artist.bio);

      if (!location) {
        return {
          artistId: artist.id,
          handle: artist.instagram_handle,
          location: null,
          inserted: false,
          reason: 'error',
        };
      }

      if (!location.city && !location.region) {
        return {
          artistId: artist.id,
          handle: artist.instagram_handle,
          location,
          inserted: false,
          reason: 'no_location',
        };
      }

      if (location.country_code && isGDPRCountry(location.country_code)) {
        return {
          artistId: artist.id,
          handle: artist.instagram_handle,
          location,
          inserted: false,
          reason: 'gdpr',
        };
      }

      if (dryRun) {
        return {
          artistId: artist.id,
          handle: artist.instagram_handle,
          location,
          inserted: true,
          reason: 'dry_run',
        };
      }

      const { inserted, reason } = await insertLocation(artist.id, location);
      return {
        artistId: artist.id,
        handle: artist.instagram_handle,
        location,
        inserted,
        reason,
      };
    })
  );

  return results;
}

async function main() {
  const { limit, dryRun, concurrency } = parseArgs();

  console.log('Bio Location Extraction (GPT-4.1-mini)');
  console.log('======================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  // Get artists needing processing
  const artists = await getArtistsNeedingExtraction(limit);
  console.log(`Artists to process: ${artists.length}`);
  console.log(`Estimated cost: $${(artists.length * COST_PER_EXTRACTION).toFixed(4)}`);
  console.log('');

  if (artists.length === 0) {
    console.log('No artists to process!');
    return;
  }

  // Stats tracking
  const stats = {
    processed: 0,
    inserted: 0,
    noLocation: 0,
    gdpr: 0,
    duplicate: 0,
    errors: 0,
  };

  // Country distribution
  const countryCount: Record<string, number> = {};
  const sampleExtractions: ProcessResult[] = [];

  const startTime = Date.now();

  // Process in batches with concurrency
  for (let i = 0; i < artists.length; i += concurrency) {
    const batch = artists.slice(i, i + concurrency);
    const results = await processBatch(batch, dryRun);

    for (const result of results) {
      stats.processed++;

      if (result.reason === 'error') {
        stats.errors++;
      } else if (result.reason === 'no_location') {
        stats.noLocation++;
      } else if (result.reason === 'gdpr') {
        stats.gdpr++;
        if (result.location?.country_code) {
          countryCount[result.location.country_code] =
            (countryCount[result.location.country_code] || 0) + 1;
        }
      } else if (result.reason === 'duplicate') {
        stats.duplicate++;
      } else if (result.inserted) {
        stats.inserted++;
        if (result.location?.country_code) {
          countryCount[result.location.country_code] =
            (countryCount[result.location.country_code] || 0) + 1;
        }
      }

      // Collect samples for dry-run output
      if (dryRun && result.inserted && sampleExtractions.length < 20) {
        sampleExtractions.push(result);
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = stats.processed / elapsed;
    const eta = (artists.length - stats.processed) / rate;

    process.stdout.write(
      `\rProcessed ${stats.processed}/${artists.length} ` +
        `(${stats.inserted} inserted, ${stats.noLocation} no-loc, ${stats.gdpr} GDPR) ` +
        `[${rate.toFixed(1)}/s, ETA: ${Math.round(eta)}s]`
    );
  }

  console.log('\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total processed: ${stats.processed}`);
  console.log(`Inserted to artist_locations: ${stats.inserted}`);
  console.log(`No location found: ${stats.noLocation}`);
  console.log(`Skipped (GDPR countries): ${stats.gdpr}`);
  console.log(`Skipped (duplicate): ${stats.duplicate}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');

  // Country distribution
  if (Object.keys(countryCount).length > 0) {
    console.log('Country distribution:');
    const sortedCountries = Object.entries(countryCount).sort((a, b) => b[1] - a[1]);
    for (const [country, count] of sortedCountries.slice(0, 15)) {
      const gdprTag = isGDPRCountry(country) ? ' (GDPR)' : '';
      console.log(`  ${country}: ${count}${gdprTag}`);
    }
    console.log('');
  }

  // Dry-run samples
  if (dryRun && sampleExtractions.length > 0) {
    console.log('Sample extractions (would be inserted):');
    for (const sample of sampleExtractions) {
      console.log(
        `  @${sample.handle}: ${sample.location?.city || '?'}, ${sample.location?.region || '?'} (${sample.location?.country_code}) [${sample.location?.confidence}]`
      );
    }
    console.log('');
  }

  // Cost
  console.log(
    `Actual cost: ~$${(stats.processed * COST_PER_EXTRACTION).toFixed(4)}`
  );
}

main().catch(console.error);
