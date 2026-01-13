/**
 * Find.ink Artist Scraper
 *
 * Scrapes tattoo artist Instagram handles from find.ink directory.
 *
 * Process:
 * 1. Get all style categories from /styles
 * 2. For each style, collect artist profile UUIDs
 * 3. Visit each artist profile to extract Instagram handle + location
 * 4. Insert new artists to database (skip duplicates)
 *
 * Usage:
 *   npx tsx scripts/discovery/findink-scraper.ts
 *
 * Post-scrape:
 *   npx tsx scripts/discovery/instagram-validator.ts  # Enrich profiles
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Configuration
// ============================================================================

const FINDINK_BASE_URL = 'https://find.ink';
const STYLES_URL = `${FINDINK_BASE_URL}/styles`;
const PAGE_LOAD_TIMEOUT_MS = 30000;
const DELAY_BETWEEN_REQUESTS_MS = 1000;
const SCROLL_DELAY_MS = 1500;
const MAX_SCROLL_ATTEMPTS = 50;

// Reserved Instagram paths to filter out
const RESERVED_PATHS = ['explore', 'p', 'reel', 'reels', 'stories', 'tv', 'accounts', 'direct'];

// ============================================================================
// Types
// ============================================================================

interface ScrapedArtist {
  name: string;
  instagramHandle: string;
  city: string | null;
  state: string | null;
  profileUrl: string;
}

interface ScrapeStats {
  stylesScraped: number;
  profilesVisited: number;
  totalFound: number;
  duplicatesSkipped: number;
  newArtistsAdded: number;
  errors: number;
}

// ============================================================================
// Browser Setup
// ============================================================================

async function setupBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1920, height: 1080 });
  return page;
}

// ============================================================================
// Scraping Logic
// ============================================================================

/**
 * Get all style categories from /styles page
 */
async function getStyleCategories(page: Page): Promise<string[]> {
  console.log('📋 Fetching style categories...');

  await page.goto(STYLES_URL, {
    waitUntil: 'networkidle2',
    timeout: PAGE_LOAD_TIMEOUT_MS,
  });

  await sleep(2000);

  const styles = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href^="/styles/"]');
    const styleSet = new Set<string>();

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href !== '/styles') {
        // Extract style name from URL
        const match = href.match(/\/styles\/(.+)/);
        if (match && match[1]) {
          styleSet.add(decodeURIComponent(match[1]));
        }
      }
    });

    return Array.from(styleSet);
  });

  console.log(`   Found ${styles.length} styles: ${styles.slice(0, 5).join(', ')}...`);
  return styles;
}

/**
 * Scroll page to load all artists in a style category
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  let previousHeight = 0;
  let scrollAttempts = 0;
  let noChangeCount = 0;

  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(SCROLL_DELAY_MS);

    const newHeight = await page.evaluate(() => document.body.scrollHeight);

    if (newHeight === previousHeight) {
      noChangeCount++;
      if (noChangeCount >= 3) {
        break;
      }
    } else {
      noChangeCount = 0;
    }

    previousHeight = newHeight;
    scrollAttempts++;
  }
}

/**
 * Get artist profile UUIDs from a style page
 */
async function getArtistUUIDsFromStyle(page: Page, style: string): Promise<string[]> {
  const styleUrl = `${FINDINK_BASE_URL}/styles/${encodeURIComponent(style)}`;

  try {
    await page.goto(styleUrl, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    await sleep(2000);
    await scrollToLoadAll(page);

    const uuids = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href^="/a/"]');
      const uuidSet = new Set<string>();

      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href) {
          const match = href.match(/\/a\/([a-f0-9-]+)/);
          if (match && match[1]) {
            uuidSet.add(match[1]);
          }
        }
      });

      return Array.from(uuidSet);
    });

    return uuids;
  } catch (error: any) {
    console.log(`   ⚠️  Error loading style ${style}: ${error.message}`);
    return [];
  }
}

/**
 * Extract artist info from their profile page
 */
async function getArtistFromProfile(page: Page, uuid: string): Promise<ScrapedArtist | null> {
  const profileUrl = `${FINDINK_BASE_URL}/a/${uuid}`;

  try {
    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    await sleep(1000);

    const artist = await page.evaluate((url) => {
      // Extract name
      const nameEl = document.querySelector('h1, h2, [class*="name"]');
      const name = nameEl?.textContent?.trim() || '';

      // Extract Instagram handle from link
      let instagramHandle = '';
      const instagramLink = document.querySelector('a[href*="instagram.com"]');
      if (instagramLink) {
        const href = instagramLink.getAttribute('href');
        if (href) {
          const match = href.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (match && match[1]) {
            // Strip leading/trailing dots and underscores (invalid in Instagram handles)
            instagramHandle = match[1].toLowerCase().replace(/^[._]+|[._]+$/g, '');
          }
        }
      }

      // Extract location - look for common patterns
      let city: string | null = null;
      let state: string | null = null;

      // Look for location text containing city, state pattern
      const allText = document.body.innerText;
      const locationMatch = allText.match(
        /(?:Private Studio|Studio|Shop|Tattoo)[^\n]*[-–]\s*([A-Za-z\s]+),\s*([A-Z]{2})/i
      );
      if (locationMatch) {
        city = locationMatch[1].trim();
        state = locationMatch[2].toUpperCase();
      } else {
        // Try simpler city, state pattern
        const simpleMatch = allText.match(/([A-Za-z\s]+),\s*([A-Z]{2})\b/);
        if (simpleMatch) {
          city = simpleMatch[1].trim();
          state = simpleMatch[2].toUpperCase();
        }
      }

      return {
        name,
        instagramHandle,
        city,
        state,
        profileUrl: url,
      };
    }, profileUrl);

    // Validate we got an Instagram handle
    if (!artist.instagramHandle) {
      return null;
    }

    // Filter out reserved paths
    if (RESERVED_PATHS.includes(artist.instagramHandle)) {
      return null;
    }

    return artist;
  } catch (error: any) {
    return null;
  }
}

// ============================================================================
// Database Operations
// ============================================================================

async function insertArtist(artist: ScrapedArtist): Promise<'added' | 'duplicate' | 'error'> {
  const handle = artist.instagramHandle.toLowerCase();

  // Check for duplicate
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('instagram_handle', handle)
    .single();

  if (existing) {
    return 'duplicate';
  }

  // Generate slug
  const slug = `${handle}-${Date.now().toString(36)}`;

  // Insert artist
  const { data: artistData, error } = await supabase.from('artists').insert({
    name: artist.name || handle,
    slug,
    instagram_handle: handle,
    instagram_url: `https://instagram.com/${handle}`,
    discovery_source: 'findink_scraper',
    verification_status: 'unclaimed',
  }).select('id').single();

  if (error) {
    console.error(`   ❌ Error inserting @${handle}: ${error.message}`);
    return 'error';
  }

  // Insert into artist_locations (single source of truth for location data)
  if (artistData?.id && artist.city && artist.state) {
    const { error: locError } = await supabase.from('artist_locations').insert({
      artist_id: artistData.id,
      city: artist.city,
      region: artist.state,
      country_code: 'US',
      location_type: 'city',
      is_primary: true,
      display_order: 0,
    });
    if (locError && locError.code !== '23505') {
      console.warn(`   ⚠️ Warning: Could not insert location for @${handle}: ${locError.message}`);
    }
  }

  return 'added';
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
  console.log('🕷️  Find.ink Artist Scraper');
  console.log('='.repeat(60));
  console.log(`Target: ${FINDINK_BASE_URL}`);
  console.log('');

  const stats: ScrapeStats = {
    stylesScraped: 0,
    profilesVisited: 0,
    totalFound: 0,
    duplicatesSkipped: 0,
    newArtistsAdded: 0,
    errors: 0,
  };

  let browser: Browser | null = null;
  const seenUUIDs = new Set<string>();

  try {
    // Setup browser
    console.log('🚀 Launching browser...');
    browser = await setupBrowser();
    const page = await setupPage(browser);

    // Get all style categories
    const styles = await getStyleCategories(page);

    if (styles.length === 0) {
      console.log('❌ No styles found. Site structure may have changed.');
      return;
    }

    // Collect all unique artist UUIDs from all styles
    console.log('\n📥 Collecting artist profiles from all styles...');

    for (let i = 0; i < styles.length; i++) {
      const style = styles[i];
      console.log(`   [${i + 1}/${styles.length}] ${style}...`);

      const uuids = await getArtistUUIDsFromStyle(page, style);
      uuids.forEach((uuid) => seenUUIDs.add(uuid));

      stats.stylesScraped++;
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    console.log(`\n✅ Found ${seenUUIDs.size} unique artist profiles across ${styles.length} styles`);

    // Visit each artist profile to get Instagram handles
    console.log('\n🔍 Extracting Instagram handles from profiles...');
    const allUUIDs = Array.from(seenUUIDs);
    const artists: ScrapedArtist[] = [];

    for (let i = 0; i < allUUIDs.length; i++) {
      const uuid = allUUIDs[i];
      stats.profilesVisited++;

      if (i % 50 === 0 && i > 0) {
        console.log(`   ... processed ${i}/${allUUIDs.length} profiles (found ${artists.length} with Instagram)`);
      }

      const artist = await getArtistFromProfile(page, uuid);
      if (artist) {
        artists.push(artist);
      }

      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    stats.totalFound = artists.length;
    console.log(`\n✅ Found ${artists.length} artists with Instagram handles`);

    // Insert to database
    console.log('\n💾 Inserting artists to database...');

    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      const result = await insertArtist(artist);

      switch (result) {
        case 'added':
          stats.newArtistsAdded++;
          console.log(
            `   ✅ [${i + 1}/${artists.length}] Added: @${artist.instagramHandle}${artist.city ? ` (${artist.city}, ${artist.state})` : ''}`
          );
          break;
        case 'duplicate':
          stats.duplicatesSkipped++;
          break;
        case 'error':
          stats.errors++;
          break;
      }

      if (i % 50 === 0 && i > 0) {
        await sleep(100);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIND.INK SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Styles scraped:     ${stats.stylesScraped}`);
    console.log(`Profiles visited:   ${stats.profilesVisited}`);
    console.log(`Artists with IG:    ${stats.totalFound}`);
    console.log(`New artists added:  ${stats.newArtistsAdded}`);
    console.log(`Duplicates skipped: ${stats.duplicatesSkipped}`);
    console.log(`Errors:             ${stats.errors}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Run instagram-validator.ts to enrich profiles');
    console.log('   2. Run image scraping pipeline');
    console.log('   3. Generate embeddings');
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);
