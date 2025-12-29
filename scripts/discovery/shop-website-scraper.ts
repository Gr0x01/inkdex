/**
 * Shop Website Scraper
 *
 * Scrapes tattoo shop websites for artist rosters and Instagram handles.
 *
 * Process:
 * 1. Get shop websites from Google Places results
 * 2. Try common artist page URLs (/artists, /team, /our-artists, etc.)
 * 3. Extract Instagram handles from page content
 * 4. Add discovered artists to database
 * 5. Cache scraping results
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Types
// ============================================================================

interface ShopWebsite {
  name: string;
  url: string;
  placeId: string;
}

interface ScrapedArtist {
  name: string;
  instagramHandle: string;
  shopName: string;
  shopUrl: string;
}

// ============================================================================
// Configuration
// ============================================================================

const ARTIST_PAGE_PATHS = [
  '/artists',
  '/team',
  '/our-artists',
  '/our-team',
  '/meet-the-artists',
  '/meet-our-artists',
  '/artist',
  '/about',
  '/about-us',
  '/staff',
];

const CITY_SLUG = 'austin';

// ============================================================================
// Get Shop Websites
// ============================================================================

async function getShopWebsites(): Promise<ShopWebsite[]> {
  // Get all Google Places queries for this city
  const { data: queries } = await supabase
    .from('discovery_queries')
    .select('*')
    .eq('city', CITY_SLUG)
    .eq('source', 'google_places');

  if (!queries || queries.length === 0) {
    console.log('⚠️  No Google Places queries found. Run discover-google-places first.');
    return [];
  }

  // Get place details from Google Places
  const shops: ShopWebsite[] = [];

  // We need to query Google Places API again to get the websites
  // Let's get them from artists table where we stored the place_id
  const { data: artistsWithPlaces } = await supabase
    .from('artists')
    .select('name, google_place_id, website_url')
    .eq('city', CITY_SLUG)
    .not('google_place_id', 'is', null);

  if (artistsWithPlaces) {
    artistsWithPlaces.forEach(artist => {
      if (artist.website_url && artist.google_place_id) {
        shops.push({
          name: artist.name,
          url: artist.website_url,
          placeId: artist.google_place_id,
        });
      }
    });
  }

  // Also search for shops directly via Google Places
  // This is a fallback to ensure we get all shops
  const axios = (await import('axios')).default;
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

  const searchQueries = ['tattoo shop', 'tattoo studio'];
  const uniqueShops = new Map<string, ShopWebsite>();

  for (const query of searchQueries) {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: {
            query: `${query} in Austin TX`,
            key: GOOGLE_PLACES_API_KEY,
          },
        }
      );

      if (response.data.results) {
        for (const place of response.data.results) {
          // Get detailed info with website
          const detailsResponse = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
              params: {
                place_id: place.place_id,
                fields: 'name,website',
                key: GOOGLE_PLACES_API_KEY,
              },
            }
          );

          if (detailsResponse.data.result?.website) {
            const website = detailsResponse.data.result.website;

            // Skip Instagram URLs (we handle those separately)
            if (!website.includes('instagram.com')) {
              uniqueShops.set(place.place_id, {
                name: detailsResponse.data.result.name,
                url: website,
                placeId: place.place_id,
              });
            }
          }

          await sleep(100); // Rate limit
        }
      }

      await sleep(500);
    } catch (error: any) {
      console.error(`Error fetching ${query}:`, error.message);
    }
  }

  return Array.from(uniqueShops.values());
}

// ============================================================================
// Scraping Logic
// ============================================================================

async function scrapeShopWebsite(shop: ShopWebsite): Promise<ScrapedArtist[]> {
  console.log(`\n🔍 Scraping: ${shop.name}`);
  console.log(`   URL: ${shop.url}`);

  const artists: ScrapedArtist[] = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Try to find artist page
    let artistPageFound = false;
    let artistPageUrl = '';

    // Try common artist page paths
    for (const pagePath of ARTIST_PAGE_PATHS) {
      const testUrl = new URL(pagePath, shop.url).href;

      try {
        const response = await page.goto(testUrl, {
          waitUntil: 'networkidle2',
          timeout: 10000,
        });

        if (response && response.ok()) {
          console.log(`   ✅ Found artist page: ${pagePath}`);
          artistPageFound = true;
          artistPageUrl = testUrl;
          break;
        }
      } catch (error) {
        // Page not found, continue to next path
        continue;
      }
    }

    // If no dedicated artist page, try homepage
    if (!artistPageFound) {
      console.log(`   ℹ️  No dedicated artist page, checking homepage...`);
      try {
        await page.goto(shop.url, {
          waitUntil: 'networkidle2',
          timeout: 10000,
        });
        artistPageUrl = shop.url;
      } catch (error) {
        console.log(`   ❌ Could not load website`);
        return artists;
      }
    }

    // Get page content
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract Instagram handles from page
    const handles = extractInstagramHandles(html, $);

    if (handles.length === 0) {
      console.log(`   ⚠️  No Instagram handles found`);
    } else {
      console.log(`   ✅ Found ${handles.length} Instagram handles`);

      // Try to extract artist names
      handles.forEach((handle, index) => {
        artists.push({
          name: `Artist at ${shop.name}`, // Fallback name
          instagramHandle: handle,
          shopName: shop.name,
          shopUrl: shop.url,
        });
      });
    }
  } catch (error: any) {
    console.log(`   ❌ Scraping error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return artists;
}

function extractInstagramHandles(html: string, $: cheerio.CheerioAPI): string[] {
  const handles = new Set<string>();

  // Method 1: Find Instagram links in HTML
  $('a[href*="instagram.com"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const match = href.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match && match[1]) {
        const handle = match[1].toLowerCase();
        if (!['explore', 'p', 'reel', 'reels', 'stories', 'tv'].includes(handle)) {
          handles.add(handle);
        }
      }
    }
  });

  // Method 2: Find @mentions in text
  const textMatches = html.matchAll(/@([a-zA-Z0-9._]{3,30})/g);
  for (const match of textMatches) {
    if (match[1]) {
      handles.add(match[1].toLowerCase());
    }
  }

  // Method 3: Find instagram.com URLs in raw HTML
  const urlMatches = html.matchAll(/instagram\.com\/([a-zA-Z0-9._]+)/g);
  for (const match of urlMatches) {
    if (match[1]) {
      const handle = match[1].toLowerCase();
      if (!['explore', 'p', 'reel', 'reels', 'stories', 'tv'].includes(handle)) {
        handles.add(handle);
      }
    }
  }

  return Array.from(handles);
}

// ============================================================================
// Database Storage
// ============================================================================

async function saveArtistsToDatabase(artists: ScrapedArtist[]): Promise<number> {
  let added = 0;

  for (const artist of artists) {
    // Check if artist already exists
    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .eq('instagram_handle', artist.instagramHandle)
      .single();

    if (existing) {
      continue; // Skip duplicate
    }

    // Generate slug
    const slug = `${artist.instagramHandle}-${Date.now().toString(36)}`;

    // Insert artist
    const { error } = await supabase.from('artists').insert({
      name: artist.name,
      slug,
      instagram_handle: artist.instagramHandle,
      instagram_url: `https://instagram.com/${artist.instagramHandle}`,
      city: CITY_SLUG,
      shop_name: artist.shopName,
      website_url: artist.shopUrl,
      discovery_source: 'shop_scraping',
      verification_status: 'unclaimed',
      instagram_private: false,
    });

    if (!error) {
      added++;
      console.log(`   ✅ Added: @${artist.instagramHandle} (${artist.shopName})`);
    } else {
      console.log(`   ❌ Error adding @${artist.instagramHandle}: ${error.message}`);
    }

    await sleep(100);
  }

  return added;
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
  console.log('🕷️  Shop Website Scraper');
  console.log('='.repeat(60));

  // Get shop websites
  console.log('\n📋 Fetching shop websites from Google Places...');
  const shops = await getShopWebsites();

  if (shops.length === 0) {
    console.log('❌ No shops found to scrape');
    return;
  }

  console.log(`✅ Found ${shops.length} shops to scrape\n`);

  let totalArtistsFound = 0;
  let totalArtistsAdded = 0;

  // Scrape each shop
  for (let i = 0; i < shops.length; i++) {
    const shop = shops[i];
    console.log(`\n[${i + 1}/${shops.length}] Processing ${shop.name}...`);

    try {
      const artists = await scrapeShopWebsite(shop);
      totalArtistsFound += artists.length;

      if (artists.length > 0) {
        const added = await saveArtistsToDatabase(artists);
        totalArtistsAdded += added;
      }

      // Rate limiting between shops
      await sleep(2000);
    } catch (error: any) {
      console.error(`❌ Error scraping ${shop.name}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ SHOP SCRAPING COMPLETE');
  console.log('='.repeat(60));
  console.log(`Shops scraped: ${shops.length}`);
  console.log(`Instagram handles found: ${totalArtistsFound}`);
  console.log(`New artists added: ${totalArtistsAdded}`);
  console.log('\n💡 Next: Check total artist count');
}

main().catch(console.error);
