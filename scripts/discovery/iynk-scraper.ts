/**
 * IYNK.com Artist Scraper
 *
 * Scrapes tattoo artist Instagram handles from iynk.com marketplace.
 *
 * Process:
 * 1. Navigate to iynk.com/artists/
 * 2. Handle infinite scroll to load all artists
 * 3. Extract Instagram handles from artist profiles
 * 4. Insert new artists to database (skip duplicates)
 *
 * Usage:
 *   npx tsx scripts/discovery/iynk-scraper.ts
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

const IYNK_ARTISTS_URL = 'https://www.iynk.com/artists/';
const SCROLL_DELAY_MS = 1500; // Time to wait after each scroll
const MAX_SCROLL_ATTEMPTS = 100; // Safety limit for infinite scroll
const PAGE_LOAD_TIMEOUT_MS = 30000;

// Reserved Instagram paths to filter out
const RESERVED_PATHS = ['explore', 'p', 'reel', 'reels', 'stories', 'tv', 'accounts', 'direct'];

// ============================================================================
// Types
// ============================================================================

interface ScrapedArtist {
  name: string;
  instagramHandle: string;
  profileUrl: string;
}

interface ScrapeStats {
  totalFound: number;
  duplicatesSkipped: number;
  newArtistsAdded: number;
  errors: number;
}

// ============================================================================
// Scraping Logic
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

/**
 * Scroll page to load all artists (handles infinite scroll)
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  console.log('📜 Scrolling to load all artists...');

  let previousHeight = 0;
  let scrollAttempts = 0;
  let noChangeCount = 0;

  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    // Get current scroll height
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for new content to load
    await sleep(SCROLL_DELAY_MS);

    // Check if we've reached the end (no new content loaded)
    const newHeight = await page.evaluate(() => document.body.scrollHeight);

    if (newHeight === previousHeight) {
      noChangeCount++;
      if (noChangeCount >= 3) {
        console.log('   ✅ Reached end of content (no new items after 3 scrolls)');
        break;
      }
    } else {
      noChangeCount = 0;
    }

    previousHeight = newHeight;
    scrollAttempts++;

    if (scrollAttempts % 10 === 0) {
      console.log(`   ... scrolled ${scrollAttempts} times`);
    }
  }

  if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
    console.log(`   ⚠️  Reached max scroll attempts (${MAX_SCROLL_ATTEMPTS})`);
  }
}

/**
 * Extract artist data from the loaded page
 */
async function extractArtistsFromPage(page: Page): Promise<ScrapedArtist[]> {
  console.log('🔍 Extracting artist data from page...');

  const artists = await page.evaluate(() => {
    const results: { name: string; instagramHandle: string; profileUrl: string }[] = [];
    const seenHandles = new Set<string>();

    // Strategy 1: Find Instagram links directly
    const instagramLinks = document.querySelectorAll('a[href*="instagram.com"]');
    instagramLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href) {
        const match = href.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
        if (match && match[1]) {
          // Strip leading/trailing dots and underscores (invalid in Instagram handles)
          const handle = match[1].toLowerCase().replace(/^[._]+|[._]+$/g, '');
          // Filter out reserved paths
          const reserved = ['explore', 'p', 'reel', 'reels', 'stories', 'tv', 'accounts', 'direct'];
          if (handle && !reserved.includes(handle) && !seenHandles.has(handle)) {
            seenHandles.add(handle);

            // Try to find artist name nearby
            let name = handle;
            const parentCard = link.closest('[class*="card"], [class*="artist"], article, div');
            if (parentCard) {
              const nameEl = parentCard.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
              if (nameEl && nameEl.textContent) {
                name = nameEl.textContent.trim();
              }
            }

            results.push({
              name,
              instagramHandle: handle,
              profileUrl: href,
            });
          }
        }
      }
    });

    // Strategy 2: Find artist cards with iynk profile links, then get their Instagram
    const artistCards = document.querySelectorAll('a[href^="/"][href*="/"]');
    artistCards.forEach((card) => {
      const href = card.getAttribute('href');
      // Look for iynk artist profile pattern (e.g., /username/)
      if (href && href.match(/^\/[a-zA-Z0-9._-]+\/?$/)) {
        const handle = href.replace(/\//g, '').toLowerCase();
        if (handle && handle.length > 2 && !seenHandles.has(handle)) {
          // Skip common non-artist paths
          const skipPaths = [
            'artists',
            'studios',
            'tattoos',
            'app',
            'articles',
            'faqs',
            'about',
            'contact',
            'terms',
            'privacy',
            'login',
            'signup',
            'register',
          ];
          if (!skipPaths.includes(handle)) {
            seenHandles.add(handle);

            // Try to find artist name
            let name = handle;
            const nameEl = card.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
            if (nameEl && nameEl.textContent) {
              name = nameEl.textContent.trim();
            } else if (card.textContent) {
              const text = card.textContent.trim();
              if (text.length > 0 && text.length < 50) {
                name = text;
              }
            }

            results.push({
              name,
              instagramHandle: handle,
              profileUrl: `https://www.iynk.com${href}`,
            });
          }
        }
      }
    });

    return results;
  });

  console.log(`   Found ${artists.length} potential artists`);
  return artists;
}

/**
 * Visit individual artist profile to get Instagram handle if not found on listing
 */
async function getInstagramFromProfile(page: Page, profileUrl: string): Promise<string | null> {
  try {
    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    const handle = await page.evaluate(() => {
      // Look for Instagram link on profile page
      const instagramLink = document.querySelector('a[href*="instagram.com"]');
      if (instagramLink) {
        const href = instagramLink.getAttribute('href');
        if (href) {
          const match = href.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (match && match[1]) {
            // Strip leading/trailing dots and underscores (invalid in Instagram handles)
            return match[1].toLowerCase().replace(/^[._]+|[._]+$/g, '') || null;
          }
        }
      }
      return null;
    });

    return handle;
  } catch (error) {
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

  // Insert artist (iynk doesn't have location data, so no artist_locations insert)
  const { error } = await supabase.from('artists').insert({
    name: artist.name || handle,
    slug,
    instagram_handle: handle,
    instagram_url: `https://instagram.com/${handle}`,
    discovery_source: 'iynk_scraper',
    verification_status: 'unclaimed',
  });

  if (error) {
    console.error(`   ❌ Error inserting @${handle}: ${error.message}`);
    return 'error';
  }

  // Note: iynk scraper doesn't extract location data, so no artist_locations insert
  // Location will be populated later by instagram-validator.ts bio extraction

  return 'added';
}

async function insertArtists(artists: ScrapedArtist[]): Promise<ScrapeStats> {
  const stats: ScrapeStats = {
    totalFound: artists.length,
    duplicatesSkipped: 0,
    newArtistsAdded: 0,
    errors: 0,
  };

  console.log(`\n💾 Inserting ${artists.length} artists to database...`);

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    const result = await insertArtist(artist);

    switch (result) {
      case 'added':
        stats.newArtistsAdded++;
        console.log(`   ✅ [${i + 1}/${artists.length}] Added: @${artist.instagramHandle}`);
        break;
      case 'duplicate':
        stats.duplicatesSkipped++;
        break;
      case 'error':
        stats.errors++;
        break;
    }

    // Small delay to avoid overwhelming the database
    if (i % 50 === 0 && i > 0) {
      await sleep(100);
    }
  }

  return stats;
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
  console.log('🕷️  IYNK.com Artist Scraper');
  console.log('='.repeat(60));
  console.log(`Target: ${IYNK_ARTISTS_URL}`);
  console.log('');

  let browser: Browser | null = null;

  try {
    // Setup browser
    console.log('🚀 Launching browser...');
    browser = await setupBrowser();
    const page = await setupPage(browser);

    // Navigate to artists page
    console.log(`\n📄 Loading ${IYNK_ARTISTS_URL}...`);
    await page.goto(IYNK_ARTISTS_URL, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    // Wait for content to load
    await sleep(2000);

    // Scroll to load all artists
    await scrollToLoadAll(page);

    // Extract artist data
    const artists = await extractArtistsFromPage(page);

    if (artists.length === 0) {
      console.log('\n⚠️  No artists found. The page structure may have changed.');
      console.log('   Try running with headless: false to debug.');

      // Take screenshot for debugging
      await page.screenshot({ path: 'iynk-debug.png', fullPage: true });
      console.log('   Screenshot saved to iynk-debug.png');

      return;
    }

    // Filter valid Instagram handles
    const validArtists = artists.filter((a) => {
      const handle = a.instagramHandle;
      return (
        handle &&
        handle.length >= 2 &&
        handle.length <= 30 &&
        !RESERVED_PATHS.includes(handle) &&
        /^[a-zA-Z0-9._]+$/.test(handle)
      );
    });

    console.log(`\n✅ Found ${validArtists.length} valid artists (filtered from ${artists.length})`);

    // Insert to database
    const stats = await insertArtists(validArtists);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ IYNK SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total found:        ${stats.totalFound}`);
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
