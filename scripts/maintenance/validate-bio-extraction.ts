#!/usr/bin/env npx tsx
/**
 * Validate Bio Location Extraction with GPT-5-nano
 *
 * Compares GPT extraction against known artist_locations to measure accuracy.
 * Uses artists we already have location data for as ground truth.
 *
 * Usage:
 *   npx tsx scripts/maintenance/validate-bio-extraction.ts
 *   npx tsx scripts/maintenance/validate-bio-extraction.ts --limit 100
 *   npx tsx scripts/maintenance/validate-bio-extraction.ts --show-mismatches
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required environment variables');
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
  confidence: 'high' | 'medium' | 'low' | null;
}

interface ArtistWithKnownLocation {
  id: string;
  instagram_handle: string;
  bio: string;
  known_city: string | null;
  known_region: string | null;
  known_country: string;
}

const SYSTEM_PROMPT = `Extract location from tattoo artist Instagram bio. Return JSON only.

Rules:
1. US locations: city + 2-letter state code (e.g., "Austin, TX" -> city: "Austin", region: "TX", country_code: "US")
2. International: city + region/province + ISO 3166-1 alpha-2 country code
3. Recognize patterns: "📍Austin", "Based in NYC", "ATX tattoos", "Brooklyn NY", "LA based"
4. Common abbreviations: NYC=New York, LA=Los Angeles, ATX=Austin, PHX=Phoenix, PDX=Portland, SEA=Seattle, CHI=Chicago, SF=San Francisco, NOLA=New Orleans, BK/BKN=Brooklyn
5. If only state/country mentioned, set city: null
6. If location unclear or not mentioned, return all null fields
7. Confidence: high (explicit "📍" or "based in"), medium (city/state detected), low (uncertain)

JSON format: {"city":"Austin","region":"TX","country_code":"US","confidence":"high"}`;

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 50; // Default to 50 for validation
  let showMismatches = false;
  let concurrency = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--show-mismatches') {
      showMismatches = true;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { limit, showMismatches, concurrency };
}

async function getArtistsWithKnownLocations(limit: number): Promise<ArtistWithKnownLocation[]> {
  // Get artists that have both a bio AND an entry in artist_locations
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      instagram_handle,
      bio,
      artist_locations!inner (
        city,
        region,
        country_code
      )
    `)
    .not('bio', 'is', null)
    .neq('bio', '')
    .is('deleted_at', null)
    .limit(limit * 2); // Fetch extra to filter

  if (error) {
    console.error('Error fetching artists:', error);
    return [];
  }

  // Transform and filter - only take artists with primary location
  const artists: ArtistWithKnownLocation[] = [];
  for (const artist of data || []) {
    const locations = artist.artist_locations as any[];
    if (locations && locations.length > 0) {
      const primary = locations[0];
      artists.push({
        id: artist.id,
        instagram_handle: artist.instagram_handle,
        bio: artist.bio,
        known_city: primary.city,
        known_region: primary.region,
        known_country: primary.country_code || 'US',
      });
    }
    if (artists.length >= limit) break;
  }

  return artists;
}

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
    return JSON.parse(content);
  } catch (error: any) {
    if (error?.status === 429 && retryCount < 3) {
      const waitTime = 2000 * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return extractLocation(bio, retryCount + 1);
    }
    console.error(`\n  Error: ${error.message}`);
    return null;
  }
}

function normalizeCity(city: string | null): string | null {
  if (!city) return null;
  return city.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/^new york city$/, 'new york')
    .replace(/^la$/, 'los angeles')
    .replace(/^nyc$/, 'new york')
    .replace(/^sf$/, 'san francisco');
}

function normalizeRegion(region: string | null): string | null {
  if (!region) return null;
  return region.toUpperCase().trim();
}

interface ValidationResult {
  artist: ArtistWithKnownLocation;
  extracted: ExtractedLocation | null;
  cityMatch: boolean;
  regionMatch: boolean;
  countryMatch: boolean;
  fullMatch: boolean;
}

async function main() {
  const { limit, showMismatches, concurrency } = parseArgs();

  console.log('Bio Location Extraction Validation (GPT-4.1-nano)');
  console.log('================================================');
  console.log(`Sample size: ${limit} artists with known locations`);
  console.log(`Estimated cost: $${(limit * COST_PER_EXTRACTION).toFixed(4)}`);
  console.log('');

  const artists = await getArtistsWithKnownLocations(limit);
  console.log(`Found ${artists.length} artists with bios and known locations\n`);

  if (artists.length === 0) {
    console.log('No artists to validate!');
    return;
  }

  const results: ValidationResult[] = [];
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < artists.length; i += concurrency) {
    const batch = artists.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (artist) => {
        const extracted = await extractLocation(artist.bio);

        const extractedCity = normalizeCity(extracted?.city || null);
        const knownCity = normalizeCity(artist.known_city);
        const extractedRegion = normalizeRegion(extracted?.region || null);
        const knownRegion = normalizeRegion(artist.known_region);
        const extractedCountry = extracted?.country_code?.toUpperCase() || null;
        const knownCountry = artist.known_country.toUpperCase();

        const cityMatch = extractedCity === knownCity ||
          (extractedCity !== null && knownCity !== null && extractedCity.includes(knownCity));
        const regionMatch = extractedRegion === knownRegion;
        const countryMatch = extractedCountry === knownCountry;
        const fullMatch = cityMatch && regionMatch && countryMatch;

        return {
          artist,
          extracted,
          cityMatch,
          regionMatch,
          countryMatch,
          fullMatch,
        };
      })
    );

    results.push(...batchResults);

    const elapsed = (Date.now() - startTime) / 1000;
    process.stdout.write(`\rProcessed ${results.length}/${artists.length} (${elapsed.toFixed(1)}s)`);
  }

  console.log('\n');

  // Calculate stats
  const stats = {
    total: results.length,
    fullMatch: results.filter(r => r.fullMatch).length,
    cityMatch: results.filter(r => r.cityMatch).length,
    regionMatch: results.filter(r => r.regionMatch).length,
    countryMatch: results.filter(r => r.countryMatch).length,
    noExtraction: results.filter(r => !r.extracted?.city && !r.extracted?.region).length,
    highConfidence: results.filter(r => r.extracted?.confidence === 'high').length,
    mediumConfidence: results.filter(r => r.extracted?.confidence === 'medium').length,
    lowConfidence: results.filter(r => r.extracted?.confidence === 'low').length,
  };

  console.log('=== ACCURACY RESULTS ===');
  console.log(`Full match (city+region+country): ${stats.fullMatch}/${stats.total} (${(stats.fullMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`City match:    ${stats.cityMatch}/${stats.total} (${(stats.cityMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`Region match:  ${stats.regionMatch}/${stats.total} (${(stats.regionMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`Country match: ${stats.countryMatch}/${stats.total} (${(stats.countryMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`No location found: ${stats.noExtraction}/${stats.total} (${(stats.noExtraction/stats.total*100).toFixed(1)}%)`);
  console.log('');
  console.log('Confidence distribution:');
  console.log(`  High:   ${stats.highConfidence}`);
  console.log(`  Medium: ${stats.mediumConfidence}`);
  console.log(`  Low:    ${stats.lowConfidence}`);
  console.log('');

  // Show mismatches if requested
  if (showMismatches) {
    const mismatches = results.filter(r => !r.fullMatch && (r.extracted?.city || r.extracted?.region));
    console.log(`=== MISMATCHES (${mismatches.length}) ===`);
    for (const m of mismatches.slice(0, 20)) {
      console.log(`\n@${m.artist.instagram_handle}:`);
      console.log(`  Bio: "${m.artist.bio.substring(0, 80)}..."`);
      console.log(`  Known:     ${m.artist.known_city || '?'}, ${m.artist.known_region || '?'} (${m.artist.known_country})`);
      console.log(`  Extracted: ${m.extracted?.city || '?'}, ${m.extracted?.region || '?'} (${m.extracted?.country_code || '?'}) [${m.extracted?.confidence}]`);
      console.log(`  Match: city=${m.cityMatch}, region=${m.regionMatch}, country=${m.countryMatch}`);
    }
    if (mismatches.length > 20) {
      console.log(`\n... and ${mismatches.length - 20} more mismatches`);
    }
  }

  // Show some correct extractions as examples
  const correct = results.filter(r => r.fullMatch).slice(0, 5);
  if (correct.length > 0) {
    console.log('\n=== SAMPLE CORRECT EXTRACTIONS ===');
    for (const c of correct) {
      console.log(`@${c.artist.instagram_handle}: "${c.artist.bio.substring(0, 50)}..." -> ${c.extracted?.city}, ${c.extracted?.region} [${c.extracted?.confidence}]`);
    }
  }

  console.log(`\nActual cost: ~$${(results.length * COST_PER_EXTRACTION).toFixed(4)}`);
}

main().catch(console.error);
