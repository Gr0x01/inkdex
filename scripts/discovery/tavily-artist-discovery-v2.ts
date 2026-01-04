/**
 * Artist Discovery Script V2 (With Caching + Expanded Queries)
 *
 * Improvements over V1:
 * - Query caching (prevents duplicate API calls)
 * - 40-50 diverse queries per city (vs 13)
 * - Cost tracking
 * - Better deduplication
 * - Target: 200-300 artists per city
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { generateQueriesForCity, getQueryStats } from './query-generator';
import { generateSlugFromInstagram } from '../../lib/utils/slug';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const TAVILY_API_KEY = process.env.TAAVILY_API;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cost: ~$0.05 per query (estimated)
const TAVILY_COST_PER_QUERY = 0.05;

// ============================================================================
// Types
// ============================================================================

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
}

interface DiscoveredArtist {
  name: string;
  instagramHandle: string;
  instagramUrl: string;
  city: string;
  discoverySource: string;
  discoveryQuery: string;
  score: number;
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
  // Batch 5 Expansion - Final 9 States (Jan 2026)
  // All cities scored 82-84/100 in DataForSEO analysis

  // Delaware (DE) - 82/100
  { name: 'Wilmington', state: 'DE', slug: 'wilmington-de' },

  // Mississippi (MS) - 84/100
  { name: 'Jackson', state: 'MS', slug: 'jackson-ms' },
  { name: 'Biloxi', state: 'MS', slug: 'biloxi' },

  // Montana (MT) - 83-84/100
  { name: 'Missoula', state: 'MT', slug: 'missoula' },
  { name: 'Bozeman', state: 'MT', slug: 'bozeman' },
  { name: 'Billings', state: 'MT', slug: 'billings' },

  // New Hampshire (NH) - 82-84/100
  { name: 'Portsmouth', state: 'NH', slug: 'portsmouth' },
  { name: 'Manchester', state: 'NH', slug: 'manchester' },

  // New Jersey (NJ) - 83-84/100
  { name: 'Jersey City', state: 'NJ', slug: 'jersey-city' },
  { name: 'Hoboken', state: 'NJ', slug: 'hoboken' },
  { name: 'Asbury Park', state: 'NJ', slug: 'asbury-park' },
  { name: 'Atlantic City', state: 'NJ', slug: 'atlantic-city' },

  // North Dakota (ND) - 84/100
  { name: 'Fargo', state: 'ND', slug: 'fargo' },
  { name: 'Bismarck', state: 'ND', slug: 'bismarck' },

  // South Dakota (SD) - 84/100
  { name: 'Sioux Falls', state: 'SD', slug: 'sioux-falls' },
  { name: 'Rapid City', state: 'SD', slug: 'rapid-city' },

  // West Virginia (WV) - 84/100
  { name: 'Charleston', state: 'WV', slug: 'charleston-wv' },
  { name: 'Morgantown', state: 'WV', slug: 'morgantown' },

  // Wyoming (WY) - 83-84/100
  { name: 'Jackson', state: 'WY', slug: 'jackson-wy' },
  { name: 'Cheyenne', state: 'WY', slug: 'cheyenne' },
];

// ============================================================================
// Query Caching
// ============================================================================

async function isQueryCached(
  query: string,
  city: string
): Promise<boolean> {
  const { data } = await supabase
    .from('discovery_queries')
    .select('id')
    .eq('query', query)
    .eq('city', city)
    .eq('source', 'tavily')
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
    source: 'tavily',
    results_count: resultsCount,
    artists_found: artistsFound,
    api_cost_estimate: TAVILY_COST_PER_QUERY,
  });
}

// ============================================================================
// Tavily Search
// ============================================================================

async function searchTavily(query: string): Promise<TavilyResponse> {
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 10,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`   ❌ Tavily search failed: ${error.message}`);
    return { query, results: [] };
  }
}

// ============================================================================
// Instagram Handle Extraction
// ============================================================================

function extractInstagramHandle(url: string, content: string): string | null {
  // Priority 1: Extract from URL
  const urlPatterns = [
    /instagram\.com\/([a-zA-Z0-9._]+)/,
    /instagram\.com\/p\/[^/]+\/?\?.*taken-by=([a-zA-Z0-9._]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const handle = match[1].toLowerCase();
      // Filter out common non-artist pages
      if (!['explore', 'p', 'reel', 'reels', 'stories', 'tv'].includes(handle)) {
        return handle;
      }
    }
  }

  // Priority 2: Extract from content
  const contentPatterns = [
    /@([a-zA-Z0-9._]+)/g,
    /instagram\.com\/([a-zA-Z0-9._]+)/g,
  ];

  const handles = new Set<string>();

  for (const pattern of contentPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        const handle = match[1].toLowerCase();
        if (!['explore', 'p', 'reel', 'reels', 'stories', 'tv'].includes(handle)) {
          handles.add(handle);
        }
      }
    }
  }

  return handles.size > 0 ? Array.from(handles)[0] : null;
}

function extractArtistName(title: string): string {
  let name = title
    .replace(/\s*[|:]\s*Tattoo Artist.*$/i, '')
    .replace(/\s*Tattoo Artist.*$/i, '')
    .replace(/\s*\(@[a-zA-Z0-9._]+\).*$/i, '')
    .replace(/\s*[@].*$/i, '')
    .replace(/\s*-\s*Instagram.*$/i, '')
    .trim();

  if (name.length > 50 || name.length === 0) {
    const handleMatch = title.match(/@([a-zA-Z0-9._]+)/);
    name = handleMatch ? handleMatch[1] : 'Unknown Artist';
  }

  return name;
}

// ============================================================================
// Discovery Logic
// ============================================================================

async function discoverArtistsForCity(
  city: CityConfig
): Promise<DiscoveredArtist[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Discovering artists in ${city.name}, ${city.state}`);
  console.log(`${'='.repeat(60)}\n`);

  const discovered = new Map<string, DiscoveredArtist>();

  // Generate all queries
  const queries = generateQueriesForCity(city.name, city.state);
  const stats = getQueryStats(queries);

  console.log(`📝 Generated ${stats.total} queries:`);
  Object.entries(stats.categories).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`);
  });
  console.log();

  // Filter out cached queries first
  const uncachedQueries = [];
  let queriesCached = 0;

  for (const queryData of queries) {
    const cached = await isQueryCached(queryData.query, city.slug);
    if (cached) {
      queriesCached++;
    } else {
      uncachedQueries.push(queryData);
    }
  }

  console.log(`   💾 ${queriesCached} queries cached (skipped)`);
  console.log(`   🔍 ${uncachedQueries.length} queries to execute\n`);

  let totalCost = 0;
  const BATCH_SIZE = 50; // Tavily supports 1000 RPM, so 50 concurrent is safe

  // Process queries in batches
  for (let i = 0; i < uncachedQueries.length; i += BATCH_SIZE) {
    const batch = uncachedQueries.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uncachedQueries.length / BATCH_SIZE)} (${batch.length} queries)...`);

    const batchResults = await Promise.all(
      batch.map(async ({ query, category }) => {
        const results = await searchTavily(query);
        totalCost += TAVILY_COST_PER_QUERY;

        const artistsFoundInQuery: string[] = [];

        for (const result of results.results) {
          const handle = extractInstagramHandle(result.url, result.content);
          if (!handle) continue;

          artistsFoundInQuery.push(handle);

          if (!discovered.has(handle)) {
            discovered.set(handle, {
              name: extractArtistName(result.title),
              instagramHandle: handle,
              instagramUrl: `https://instagram.com/${handle}`,
              city: city.name,  // Use proper city name for database (e.g., "Austin", not "Austin, TX")
              discoverySource: `tavily_${category}`,
              discoveryQuery: query,
              score: result.score,
            });
          }
        }

        // Cache the query
        await cacheQuery(query, city.slug, artistsFoundInQuery, results.results.length);

        return { query, resultsCount: results.results.length };
      })
    );

    console.log(`   ✅ Batch complete: ${discovered.size} unique artists total\n`);
  }

  console.log(`\n📊 Query Summary:`);
  console.log(`   Total queries: ${stats.total}`);
  console.log(`   Executed: ${uncachedQueries.length}`);
  console.log(`   Cached (skipped): ${queriesCached}`);
  console.log(`   Estimated cost: $${totalCost.toFixed(2)}`);
  console.log(`\n✅ Discovery complete for ${city.name}: ${discovered.size} unique artists`);

  return Array.from(discovered.values());
}

// ============================================================================
// Database Storage
// ============================================================================

async function saveArtistsToDatabase(
  artists: DiscoveredArtist[],
  citySlug: string
): Promise<{ inserted: number; skipped: number }> {
  console.log(`\n💾 Saving ${artists.length} artists to database...`);

  let inserted = 0;
  let skipped = 0;

  for (const artist of artists) {
    const { data: existing } = await supabase
      .from('artists')
      .select('id, instagram_handle')
      .eq('instagram_handle', artist.instagramHandle)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    let slug: string;
    try {
      slug = generateSlugFromInstagram(artist.instagramHandle);
    } catch (slugError: any) {
      console.error(`   ❌ Invalid Instagram handle @${artist.instagramHandle}: ${slugError.message}`);
      skipped++;
      continue;
    }

    // Find the corresponding city config to get state code
    const cityConfig = CITIES.find(c => c.slug === citySlug);

    const { error } = await supabase.from('artists').insert({
      name: artist.name,
      slug,
      instagram_handle: artist.instagramHandle,
      instagram_url: artist.instagramUrl,
      city: artist.city,  // Use proper case city name: "Austin", "Atlanta", etc.
      state: cityConfig?.state || null,  // Add state code: "TX", "GA", "CA", etc.
      discovery_source: artist.discoverySource,
      verification_status: 'unclaimed',
      instagram_private: false,
    });

    if (error) {
      console.error(`   ❌ Error inserting @${artist.instagramHandle}: ${error.message}`);
    } else {
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`   ✅ Inserted ${inserted} artists...`);
      }
    }

    await sleep(100);
  }

  console.log(`   ✅ Complete: ${inserted} inserted, ${skipped} skipped`);

  return { inserted, skipped };
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 Tattoo Artist Discovery V2 - Parallel Batched Queries');
  console.log(`${'='.repeat(60)}\n`);

  const totalStats = {
    discovered: 0,
    inserted: 0,
    skipped: 0,
  };

  // Process all cities in parallel
  const cityResults = await Promise.all(
    CITIES.map(async (city) => {
      try {
        const artists = await discoverArtistsForCity(city);
        const { inserted, skipped } = await saveArtistsToDatabase(artists, city.slug);

        console.log(`\n📊 ${city.name} Summary:`);
        console.log(`   Discovered: ${artists.length}`);
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Skipped: ${skipped}`);

        return { discovered: artists.length, inserted, skipped };
      } catch (error: any) {
        console.error(`\n❌ Error processing ${city.name}: ${error.message}`);
        return { discovered: 0, inserted: 0, skipped: 0 };
      }
    })
  );

  // Aggregate results
  cityResults.forEach((result) => {
    totalStats.discovered += result.discovered;
    totalStats.inserted += result.inserted;
    totalStats.skipped += result.skipped;
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DISCOVERY COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Discovered: ${totalStats.discovered}`);
  console.log(`Total Inserted: ${totalStats.inserted}`);
  console.log(`Total Skipped (duplicates): ${totalStats.skipped}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Validate Instagram profiles (npm run validate-instagram)`);
  console.log(`   2. Add Google Places supplement if needed`);
  console.log(`   3. Scrape portfolio images (Apify)`);
}

main().catch(console.error);
