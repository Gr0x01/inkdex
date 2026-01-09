/**
 * Google Ads Cities - Artist Discovery
 *
 * Runs Tavily discovery for the 9 new cities added for Google Ads campaign.
 */

// Load env FIRST before any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

const TAVILY_API_KEY = process.env.TAAVILY_API;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Simple slug generation
function generateSlugFromInstagram(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Google Ads Expansion Cities
const CITIES = [
  { name: 'Lubbock', state: 'TX', slug: 'lubbock' },
  { name: 'Amarillo', state: 'TX', slug: 'amarillo' },
  { name: 'Fort Collins', state: 'CO', slug: 'fort-collins' },
  { name: 'Syracuse', state: 'NY', slug: 'syracuse' },
  { name: 'Albany', state: 'NY', slug: 'albany' },
  { name: 'Duluth', state: 'MN', slug: 'duluth' },
  { name: 'Huntsville', state: 'AL', slug: 'huntsville' },
  { name: 'Lawrence', state: 'KS', slug: 'lawrence' },
  { name: 'Norman', state: 'OK', slug: 'norman' },
];

// Query templates for discovery
function generateQueries(city: string, state: string): string[] {
  return [
    `best tattoo artists in ${city} ${state}`,
    `top tattoo shops ${city} ${state}`,
    `tattoo studio ${city} ${state} instagram`,
    `fine line tattoo artist ${city}`,
    `blackwork tattoo ${city} ${state}`,
    `realism tattoo artist ${city}`,
    `traditional tattoo ${city} ${state}`,
    `${city} ${state} tattoo artists instagram`,
    `custom tattoo ${city}`,
    `award winning tattoo artist ${city}`,
  ];
}

// Extract Instagram handles from Tavily results
function extractInstagramHandles(results: any[]): { handle: string; name: string; source: string }[] {
  const handles: { handle: string; name: string; source: string }[] = [];
  const handleRegex = /@([a-zA-Z0-9_.]+)|instagram\.com\/([a-zA-Z0-9_.]+)/gi;

  for (const result of results) {
    const text = `${result.title || ''} ${result.content || ''} ${result.url || ''}`;
    let match;

    while ((match = handleRegex.exec(text)) !== null) {
      const handle = (match[1] || match[2]).toLowerCase();
      // Filter out common non-artist handles
      if (handle && !['instagram', 'explore', 'p', 'reel', 'stories'].includes(handle) && handle.length > 2) {
        handles.push({
          handle,
          name: result.title?.split(/[-|–]/).shift()?.trim() || handle,
          source: result.url,
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return handles.filter(h => {
    if (seen.has(h.handle)) return false;
    seen.add(h.handle);
    return true;
  });
}

async function searchTavily(query: string): Promise<any[]> {
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 10,
      },
      { timeout: 30000 }
    );
    return response.data?.results || [];
  } catch (error: any) {
    console.error(`  ⚠️ Tavily error for "${query}":`, error.message);
    return [];
  }
}

async function createArtist(
  handle: string,
  name: string,
  city: string,
  state: string,
  slug: string
): Promise<boolean> {
  // Check if already exists
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('instagram_handle', handle)
    .single();

  if (existing) {
    return false; // Already exists
  }

  // Create artist
  const artistSlug = generateSlugFromInstagram(handle);
  const { data: artist, error } = await supabase
    .from('artists')
    .insert({
      instagram_handle: handle,
      name: name || handle,
      slug: artistSlug,
      verification_status: 'unclaimed',
    })
    .select()
    .single();

  if (error) {
    console.error(`  ❌ Failed to create ${handle}:`, error.message);
    return false;
  }

  // Create location
  await supabase.from('artist_locations').insert({
    artist_id: artist.id,
    city,
    region: state,
    country: 'United States',
    country_code: 'US',
    is_primary: true,
  });

  // Create scraping job
  await supabase.from('scraping_jobs').insert({
    artist_id: artist.id,
    job_type: 'full',
    status: 'pending',
    priority: 5,
    metadata: { source: 'google-ads-expansion', city: slug },
  });

  return true;
}

async function discoverCity(city: { name: string; state: string; slug: string }) {
  console.log(`\n🔍 Discovering artists in ${city.name}, ${city.state}...`);

  const queries = generateQueries(city.name, city.state);
  const allHandles: { handle: string; name: string; source: string }[] = [];
  let queryCost = 0;

  for (const query of queries) {
    process.stdout.write(`  Searching: "${query}"... `);
    const results = await searchTavily(query);
    const handles = extractInstagramHandles(results);
    allHandles.push(...handles);
    queryCost += 0.05;
    console.log(`${handles.length} handles found`);

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Deduplicate across all queries
  const uniqueHandles = [...new Map(allHandles.map(h => [h.handle, h])).values()];
  console.log(`\n  📊 Found ${uniqueHandles.length} unique handles`);

  // Create artists
  let created = 0;
  for (const { handle, name } of uniqueHandles) {
    const success = await createArtist(handle, name, city.name, city.state, city.slug);
    if (success) {
      created++;
      process.stdout.write(`✓`);
    } else {
      process.stdout.write(`-`);
    }
  }

  console.log(`\n  ✅ Created ${created} new artists (${uniqueHandles.length - created} already existed)`);
  console.log(`  💰 Tavily cost: ~$${queryCost.toFixed(2)}`);

  return { city: city.name, found: uniqueHandles.length, created, cost: queryCost };
}

async function main() {
  console.log('🎯 Google Ads Cities - Artist Discovery');
  console.log('='.repeat(60));
  console.log(`Cities: ${CITIES.map(c => c.name).join(', ')}`);

  if (!TAVILY_API_KEY) {
    console.error('❌ TAAVILY_API not set in .env.local');
    process.exit(1);
  }

  const results: { city: string; found: number; created: number; cost: number }[] = [];

  for (const city of CITIES) {
    const result = await discoverCity(city);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DISCOVERY SUMMARY');
  console.log('='.repeat(60));

  let totalFound = 0;
  let totalCreated = 0;
  let totalCost = 0;

  for (const r of results) {
    console.log(`${r.city}: ${r.created} created (${r.found} found)`);
    totalFound += r.found;
    totalCreated += r.created;
    totalCost += r.cost;
  }

  console.log('-'.repeat(60));
  console.log(`TOTAL: ${totalCreated} artists created (${totalFound} found)`);
  console.log(`COST: ~$${totalCost.toFixed(2)}`);
  console.log('\n🎉 Discovery complete! Run scraping pipeline next.');
}

main().catch(console.error);
