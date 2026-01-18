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

// Load environment variables BEFORE any other imports (some modules validate env on load)
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { generateQueriesForCity, getQueryStats } from './query-generator';
import { generateSlugFromInstagram } from '../../lib/utils/slug';
import { notifyArtistCreated } from '../../lib/seo/indexnow';

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
  country_code: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CITIES: CityConfig[] = [
  // ============================================================================
  // Canada - Major Cities (Jan 2026)
  // ============================================================================
  { name: 'Toronto', state: 'ON', slug: 'toronto', country_code: 'CA' },
  { name: 'Vancouver', state: 'BC', slug: 'vancouver', country_code: 'CA' },
  { name: 'Montreal', state: 'QC', slug: 'montreal', country_code: 'CA' },
  { name: 'Calgary', state: 'AB', slug: 'calgary', country_code: 'CA' },
  { name: 'Edmonton', state: 'AB', slug: 'edmonton', country_code: 'CA' },
  { name: 'Ottawa', state: 'ON', slug: 'ottawa', country_code: 'CA' },
  { name: 'Winnipeg', state: 'MB', slug: 'winnipeg', country_code: 'CA' },
  { name: 'Quebec City', state: 'QC', slug: 'quebec-city', country_code: 'CA' },
  { name: 'Hamilton', state: 'ON', slug: 'hamilton', country_code: 'CA' },
  { name: 'Victoria', state: 'BC', slug: 'victoria', country_code: 'CA' },

  // ============================================================================
  // Australia - Major Cities (Jan 2026)
  // ============================================================================
  { name: 'Sydney', state: 'NSW', slug: 'sydney', country_code: 'AU' },
  { name: 'Melbourne', state: 'VIC', slug: 'melbourne', country_code: 'AU' },
  { name: 'Brisbane', state: 'QLD', slug: 'brisbane', country_code: 'AU' },
  { name: 'Perth', state: 'WA', slug: 'perth', country_code: 'AU' },
  { name: 'Adelaide', state: 'SA', slug: 'adelaide', country_code: 'AU' },
  { name: 'Gold Coast', state: 'QLD', slug: 'gold-coast', country_code: 'AU' },
  { name: 'Newcastle', state: 'NSW', slug: 'newcastle', country_code: 'AU' },
  { name: 'Canberra', state: 'ACT', slug: 'canberra', country_code: 'AU' },

  // ============================================================================
  // New Zealand - Major Cities (Jan 2026)
  // ============================================================================
  { name: 'Auckland', state: 'AUK', slug: 'auckland', country_code: 'NZ' },
  { name: 'Wellington', state: 'WGN', slug: 'wellington', country_code: 'NZ' },
  { name: 'Christchurch', state: 'CAN', slug: 'christchurch', country_code: 'NZ' },

  // ============================================================================
  // India - Tier 1 Metros (Jan 2026) - COMPLETED
  // ============================================================================
  // { name: 'Mumbai', state: 'MH', slug: 'mumbai', country_code: 'IN' },
  // { name: 'Delhi', state: 'DL', slug: 'delhi', country_code: 'IN' },
  // { name: 'Bangalore', state: 'KA', slug: 'bangalore', country_code: 'IN' },
  // { name: 'Kolkata', state: 'WB', slug: 'kolkata', country_code: 'IN' },
  // { name: 'Hyderabad', state: 'TG', slug: 'hyderabad', country_code: 'IN' },
  // { name: 'Chennai', state: 'TN', slug: 'chennai', country_code: 'IN' },

  // ============================================================================
  // Pakistan - Major Cities (Jan 2026) - COMPLETED
  // ============================================================================
  // { name: 'Karachi', state: 'SD', slug: 'karachi', country_code: 'PK' },
  // { name: 'Lahore', state: 'PB', slug: 'lahore', country_code: 'PK' },
  // { name: 'Islamabad', state: 'IS', slug: 'islamabad', country_code: 'PK' },
  // { name: 'Rawalpindi', state: 'PB', slug: 'rawalpindi', country_code: 'PK' },
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
  // Instagram handles: letters, numbers, periods, underscores
  // Cannot start or end with period/underscore
  const sanitizeHandle = (raw: string): string => {
    return raw.toLowerCase().replace(/^[._]+|[._]+$/g, '');
  };

  // Priority 1: Extract from URL
  const urlPatterns = [
    /instagram\.com\/([a-zA-Z0-9._]+)/,
    /instagram\.com\/p\/[^/]+\/?\?.*taken-by=([a-zA-Z0-9._]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const handle = sanitizeHandle(match[1]);
      // Filter out common non-artist pages
      if (handle && !['explore', 'p', 'reel', 'reels', 'stories', 'tv'].includes(handle)) {
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
        const handle = sanitizeHandle(match[1]);
        if (handle && !['explore', 'p', 'reel', 'reels', 'stories', 'tv'].includes(handle)) {
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
              city: city.name,
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
  console.log(`\n✅ Discovery complete for ${city.name}: ${discovered.size} unique artists`);

  return Array.from(discovered.values());
}

// ============================================================================
// Database Storage
// ============================================================================

async function saveArtistsToDatabase(
  artists: DiscoveredArtist[],
  citySlug: string
): Promise<{ inserted: number; skipped: number; insertedSlugs: string[] }> {
  console.log(`\n💾 Saving ${artists.length} artists to database...`);

  let inserted = 0;
  let skipped = 0;
  const insertedSlugs: string[] = [];
  const cityConfig = CITIES.find(c => c.slug === citySlug);

  for (const artist of artists) {
    let slug: string;
    try {
      slug = generateSlugFromInstagram(artist.instagramHandle);
    } catch (slugError: any) {
      skipped++;
      continue;
    }

    // Insert artist (duplicates silently skipped via unique constraint)
    const { data: artistData, error } = await supabase.from('artists').insert({
      name: artist.name,
      slug,
      instagram_handle: artist.instagramHandle,
      instagram_url: artist.instagramUrl,
      discovery_source: artist.discoverySource,
      verification_status: 'unclaimed',
      instagram_private: false,
    }).select('id').single();

    // 23505 = unique violation (duplicate) - silently skip
    if (error?.code === '23505') {
      skipped++;
      continue;
    }

    if (error) {
      console.error(`   ❌ Error inserting @${artist.instagramHandle}: ${error.message}`);
      continue;
    }

    // Insert location for new artist
    if (artistData?.id && artist.city && cityConfig?.state) {
      await supabase.from('artist_locations').insert({
        artist_id: artistData.id,
        city: artist.city,
        region: cityConfig.state,
        country_code: cityConfig.country_code,
        location_type: 'city',
        is_primary: true,
        display_order: 0,
      });
    }

    inserted++;
    insertedSlugs.push(slug);
    if (inserted % 50 === 0) {
      console.log(`   ✅ Inserted ${inserted} artists...`);
    }

    await sleep(50);
  }

  console.log(`   ✅ Complete: ${inserted} inserted, ${skipped} duplicates`);

  return { inserted, skipped, insertedSlugs };
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
  const allInsertedSlugs: string[] = [];

  // Process all cities in parallel
  const cityResults = await Promise.all(
    CITIES.map(async (city) => {
      try {
        const artists = await discoverArtistsForCity(city);
        const { inserted, skipped, insertedSlugs } = await saveArtistsToDatabase(artists, city.slug);

        console.log(`\n📊 ${city.name} Summary:`);
        console.log(`   Discovered: ${artists.length}`);
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Duplicates: ${skipped}`);

        return { discovered: artists.length, inserted, skipped, insertedSlugs };
      } catch (error: any) {
        console.error(`\n❌ Error processing ${city.name}: ${error.message}`);
        return { discovered: 0, inserted: 0, skipped: 0, insertedSlugs: [] };
      }
    })
  );

  // Aggregate results
  cityResults.forEach((result) => {
    totalStats.discovered += result.discovered;
    totalStats.inserted += result.inserted;
    totalStats.skipped += result.skipped;
    allInsertedSlugs.push(...result.insertedSlugs);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DISCOVERY COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Discovered: ${totalStats.discovered}`);
  console.log(`Total Inserted: ${totalStats.inserted}`);
  console.log(`Total Duplicates: ${totalStats.skipped}`);

  // Notify IndexNow about new artists
  if (allInsertedSlugs.length > 0 && process.env.INDEXNOW_KEY) {
    console.log(`\n📡 Notifying IndexNow about ${allInsertedSlugs.length} new artists...`);
    try {
      const results = await notifyArtistCreated(allInsertedSlugs);
      const successCount = results.filter(r => r.success).length;
      console.log(`   ✅ IndexNow notified: ${successCount}/${results.length} engines succeeded`);
    } catch (error: any) {
      console.error(`   ⚠️ IndexNow notification failed: ${error.message}`);
    }
  }

  console.log(`\n💡 Next steps:`);
  console.log(`   1. Validate Instagram profiles (npm run validate-instagram)`);
  console.log(`   2. Add Google Places supplement if needed`);
  console.log(`   3. Scrape portfolio images (Apify)`);
}

main().catch(console.error);
