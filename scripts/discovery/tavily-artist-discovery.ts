/**
 * Artist Discovery Script (Tavily Instagram-First Approach)
 *
 * Discovers tattoo artists using:
 * 1. Tavily search for Instagram profiles (primary)
 * 2. Google Places API for location context (supplementary)
 *
 * Advantages over original plan:
 * - No website scraping needed
 * - Finds solo practitioners directly
 * - Style-specific searches for better coverage
 * - Faster, cheaper (~$2-5 per city vs $30-55)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const TAVILY_API_KEY = process.env.TAAVILY_API;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

// ============================================================================
// Configuration
// ============================================================================

const CITIES = [
  { name: 'Austin', state: 'TX', slug: 'austin' },
  // { name: 'Los Angeles', state: 'CA', slug: 'los-angeles' }, // Commented out for test run
];

const STYLE_QUERIES = [
  'fine line',
  'traditional',
  'geometric',
  'realism',
  'black and grey',
  'japanese',
  'watercolor',
  'minimalist',
  'blackwork',
  'dotwork',
];

const GENERAL_QUERIES = [
  'tattoo artist',
  'tattoo artists',
  'best tattoo artist',
];

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

  // Return first valid handle
  return handles.size > 0 ? Array.from(handles)[0] : null;
}

function extractArtistName(title: string): string {
  // Remove common suffixes
  let name = title
    .replace(/\s*[|:]\s*Tattoo Artist.*$/i, '')
    .replace(/\s*Tattoo Artist.*$/i, '')
    .replace(/\s*\(@[a-zA-Z0-9._]+\).*$/i, '')
    .replace(/\s*[@].*$/i, '')
    .replace(/\s*-\s*Instagram.*$/i, '')
    .trim();

  // If name is still too long or empty, extract from handle or use fallback
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
  city: typeof CITIES[0]
): Promise<DiscoveredArtist[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Discovering artists in ${city.name}, ${city.state}`);
  console.log(`${'='.repeat(60)}\n`);

  const discovered = new Map<string, DiscoveredArtist>(); // Key: instagram handle

  // 1. General queries
  console.log(`📱 Running general queries...`);
  for (const generalQuery of GENERAL_QUERIES) {
    const query = `${generalQuery} ${city.name} ${city.state} Instagram`;
    console.log(`   Searching: "${query}"`);

    const results = await searchTavily(query);

    for (const result of results.results) {
      const handle = extractInstagramHandle(result.url, result.content);
      if (!handle) continue;

      if (!discovered.has(handle)) {
        discovered.set(handle, {
          name: extractArtistName(result.title),
          instagramHandle: handle,
          instagramUrl: `https://instagram.com/${handle}`,
          city: `${city.name}, ${city.state}`,
          discoverySource: 'tavily_general',
          discoveryQuery: query,
          score: result.score,
        });
      }
    }

    console.log(`   Found ${results.results.length} results, ${discovered.size} unique artists so far`);

    // Rate limiting
    await sleep(500);
  }

  // 2. Style-specific queries
  console.log(`\n🎨 Running style-specific queries...`);
  for (const style of STYLE_QUERIES) {
    const query = `${style} tattoo artist ${city.name} ${city.state} Instagram`;
    console.log(`   Searching: "${query}"`);

    const results = await searchTavily(query);

    for (const result of results.results) {
      const handle = extractInstagramHandle(result.url, result.content);
      if (!handle) continue;

      if (!discovered.has(handle)) {
        discovered.set(handle, {
          name: extractArtistName(result.title),
          instagramHandle: handle,
          instagramUrl: `https://instagram.com/${handle}`,
          city: `${city.name}, ${city.state}`,
          discoverySource: `tavily_style_${style.replace(/\s+/g, '_')}`,
          discoveryQuery: query,
          score: result.score,
        });
      }
    }

    console.log(`   Found ${results.results.length} results, ${discovered.size} unique artists so far`);

    // Rate limiting
    await sleep(500);
  }

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
    // Check if artist already exists (by Instagram handle)
    const { data: existing } = await supabase
      .from('artists')
      .select('id, instagram_handle')
      .eq('instagram_handle', artist.instagramHandle)
      .single();

    if (existing) {
      console.log(`   ⏭️  Skipped (duplicate): @${artist.instagramHandle}`);
      skipped++;
      continue;
    }

    // Generate slug
    const slug = generateSlug(artist.name, artist.instagramHandle);

    // Insert artist
    const { error } = await supabase.from('artists').insert({
      name: artist.name,
      slug,
      instagram_handle: artist.instagramHandle,
      instagram_url: artist.instagramUrl,
      city: citySlug,
      discovery_source: artist.discoverySource,
      verification_status: 'unclaimed',
      instagram_private: false, // Will validate later
    });

    if (error) {
      console.error(`   ❌ Error inserting @${artist.instagramHandle}: ${error.message}`);
    } else {
      console.log(`   ✅ Inserted: ${artist.name} (@${artist.instagramHandle})`);
      inserted++;
    }

    // Rate limiting
    await sleep(100);
  }

  return { inserted, skipped };
}

function generateSlug(name: string, instagramHandle: string): string {
  // Create slug from name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Add short hash of Instagram handle for uniqueness
  const hash = instagramHandle.substring(0, 6);

  return `${baseSlug}-${hash}`;
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
  console.log('🚀 Tattoo Artist Discovery - Instagram-First Approach');
  console.log(`${'='.repeat(60)}\n`);

  const totalStats = {
    discovered: 0,
    inserted: 0,
    skipped: 0,
  };

  for (const city of CITIES) {
    try {
      // Discover artists
      const artists = await discoverArtistsForCity(city);
      totalStats.discovered += artists.length;

      // Save to database
      const { inserted, skipped } = await saveArtistsToDatabase(artists, city.slug);
      totalStats.inserted += inserted;
      totalStats.skipped += skipped;

      console.log(`\n📊 ${city.name} Summary:`);
      console.log(`   Discovered: ${artists.length}`);
      console.log(`   Inserted: ${inserted}`);
      console.log(`   Skipped: ${skipped}`);
    } catch (error: any) {
      console.error(`\n❌ Error processing ${city.name}: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DISCOVERY COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Discovered: ${totalStats.discovered}`);
  console.log(`Total Inserted: ${totalStats.inserted}`);
  console.log(`Total Skipped (duplicates): ${totalStats.skipped}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Validate Instagram profiles (public/private check)`);
  console.log(`   2. Extract Instagram user IDs for OAuth matching`);
  console.log(`   3. Scrape portfolio images (Apify)`);
  console.log(`   4. Generate CLIP embeddings`);
}

// Run the script
main().catch(console.error);
