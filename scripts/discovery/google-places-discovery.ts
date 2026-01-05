/**
 * Google Places Artist Discovery
 *
 * Supplements Tavily discovery with:
 * 1. Google Places API for tattoo shops/studios
 * 2. Extracts Instagram handles from business profiles
 * 3. Caches queries to avoid duplicate API calls
 *
 * Target: +50-100 artists to supplement Tavily
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { generateSlugFromInstagram } from '../../lib/utils/slug';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Google Places costs: ~$0.032 per Text Search request
const GOOGLE_COST_PER_QUERY = 0.032;

// ============================================================================
// Types
// ============================================================================

interface GooglePlaceResult {
  name: string;
  place_id: string;
  formatted_address?: string;
  rating?: number;
  website?: string;
  formatted_phone_number?: string;
  types?: string[];
}

interface CityConfig {
  name: string;
  state: string;
  slug: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CITIES: CityConfig[] = [
  { name: 'Austin', state: 'TX', slug: 'austin' },
  // { name: 'Los Angeles', state: 'CA', slug: 'los-angeles' },
];

const SEARCH_QUERIES = [
  'tattoo shop',
  'tattoo studio',
  'tattoo artist',
  'tattoo parlor',
  'custom tattoo',
];

// ============================================================================
// Query Caching
// ============================================================================

async function isQueryCached(query: string, city: string): Promise<boolean> {
  const { data } = await supabase
    .from('discovery_queries')
    .select('id')
    .eq('query', query)
    .eq('city', city)
    .eq('source', 'google_places')
    .single();

  return !!data;
}

async function cacheQuery(
  query: string,
  city: string,
  artistsFound: string[],
  resultsCount: number
) {
  await supabase.from('discovery_queries').insert({
    query,
    city,
    source: 'google_places',
    results_count: resultsCount,
    artists_found: artistsFound,
    api_cost_estimate: GOOGLE_COST_PER_QUERY,
  });
}

// ============================================================================
// Google Places API
// ============================================================================

async function searchGooglePlaces(
  query: string,
  city: CityConfig
): Promise<GooglePlaceResult[]> {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: `${query} in ${city.name} ${city.state}`,
          key: GOOGLE_PLACES_API_KEY,
        },
      }
    );

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error(`   ❌ Google Places error: ${response.data.status}`);
      return [];
    }

    return response.data.results || [];
  } catch (error: any) {
    console.error(`   ❌ Google Places failed: ${error.message}`);
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'name,website,formatted_phone_number,formatted_address,rating',
          key: GOOGLE_PLACES_API_KEY,
        },
      }
    );

    if (response.data.status !== 'OK') {
      return null;
    }

    return response.data.result;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Instagram Handle Extraction
// ============================================================================

function extractInstagramFromWebsite(website: string | undefined): string | null {
  if (!website) return null;

  // Check if website IS an Instagram profile
  const instagramMatch = website.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (instagramMatch && instagramMatch[1]) {
    const handle = instagramMatch[1].toLowerCase();
    if (!['explore', 'p', 'reel', 'reels'].includes(handle)) {
      return handle;
    }
  }

  return null;
}

// ============================================================================
// Discovery Logic
// ============================================================================

async function discoverArtistsForCity(city: CityConfig): Promise<number> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📍 Google Places Discovery: ${city.name}, ${city.state}`);
  console.log(`${'='.repeat(60)}\n`);

  const discovered = new Map<string, GooglePlaceResult>();
  let queriesExecuted = 0;
  let queriesCached = 0;
  let totalCost = 0;
  let artistsAdded = 0;

  for (const query of SEARCH_QUERIES) {
    const fullQuery = `${query} in ${city.name} ${city.state}`;

    // Check cache
    const cached = await isQueryCached(fullQuery, city.slug);
    if (cached) {
      console.log(`   💾 Cached: "${fullQuery}"`);
      queriesCached++;
      continue;
    }

    console.log(`   🔍 Searching: "${fullQuery}"`);

    const results = await searchGooglePlaces(query, city);
    queriesExecuted++;
    totalCost += GOOGLE_COST_PER_QUERY;

    const artistsFoundInQuery: string[] = [];

    for (const place of results) {
      if (!discovered.has(place.place_id)) {
        discovered.set(place.place_id, place);
      }

      // If place has Instagram in basic data
      const handle = extractInstagramFromWebsite(place.website);
      if (handle) {
        artistsFoundInQuery.push(handle);
      }
    }

    // Cache the query
    await cacheQuery(fullQuery, city.slug, artistsFoundInQuery, results.length);

    console.log(`      Found ${results.length} places, ${discovered.size} unique total`);

    await sleep(500);
  }

  console.log(`\n📊 Query Summary:`);
  console.log(`   Executed: ${queriesExecuted}`);
  console.log(`   Cached: ${queriesCached}`);
  console.log(`   Estimated cost: $${totalCost.toFixed(2)}`);
  console.log(`   Places discovered: ${discovered.size}`);

  // Now process each place
  console.log(`\n💾 Processing places for Instagram handles...`);

  for (const [placeId, place] of discovered) {
    // Extract Instagram from website (some places list Instagram as website)
    let handle = extractInstagramFromWebsite(place.website);

    // If no handle yet, get detailed info
    if (!handle && place.website) {
      const details = await getPlaceDetails(placeId);
      if (details) {
        handle = extractInstagramFromWebsite(details.website);
      }
      await sleep(100); // Rate limit
    }

    if (handle) {
      // Check if artist already exists
      const { data: existing } = await supabase
        .from('artists')
        .select('id')
        .eq('instagram_handle', handle)
        .single();

      if (!existing) {
        // Add new artist
        let slug: string;
        try {
          slug = generateSlugFromInstagram(handle);
        } catch (slugError: any) {
          console.error(`   ❌ Invalid Instagram handle @${handle}: ${slugError.message}`);
          continue;
        }

        const { data: artistData, error } = await supabase.from('artists').insert({
          name: place.name,
          slug,
          instagram_handle: handle,
          instagram_url: `https://instagram.com/${handle}`,
          google_place_id: placeId,
          discovery_source: 'google_places',
          verification_status: 'unclaimed',
          instagram_private: false,
        }).select('id').single();

        if (!error) {
          // Insert into artist_locations (single source of truth for location data)
          if (artistData?.id) {
            const { error: locError } = await supabase.from('artist_locations').insert({
              artist_id: artistData.id,
              city: city.name,
              region: city.state,
              country_code: 'US',
              location_type: 'city',
              is_primary: true,
              display_order: 0,
            });
            if (locError && locError.code !== '23505') {
              console.warn(`   ⚠️ Warning: Could not insert location for @${handle}: ${locError.message}`);
            }
          }

          artistsAdded++;
          console.log(`   ✅ Added: ${place.name} (@${handle})`);
        }
      }
    }
  }

  console.log(`\n✅ Google Places Summary:`);
  console.log(`   Places found: ${discovered.size}`);
  console.log(`   New artists added: ${artistsAdded}`);
  console.log(`   Cost: $${totalCost.toFixed(2)}`);

  return artistsAdded;
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('📍 Google Places Artist Discovery Supplement');
  console.log(`${'='.repeat(60)}\n`);

  let totalAdded = 0;

  for (const city of CITIES) {
    try {
      const added = await discoverArtistsForCity(city);
      totalAdded += added;
    } catch (error: any) {
      console.error(`\n❌ Error processing ${city.name}: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ GOOGLE PLACES DISCOVERY COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total new artists added: ${totalAdded}`);
  console.log(`\n💡 Next: Run full Tavily + Google Places for LA`);
}

main().catch(console.error);
