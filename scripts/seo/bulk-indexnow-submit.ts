#!/usr/bin/env npx tsx
/**
 * Bulk submit all site URLs to IndexNow
 *
 * Usage:
 *   npx tsx scripts/seo/bulk-indexnow-submit.ts
 *   npx tsx scripts/seo/bulk-indexnow-submit.ts --dry-run
 *   npx tsx scripts/seo/bulk-indexnow-submit.ts --type cities
 *   npx tsx scripts/seo/bulk-indexnow-submit.ts --type artists --limit 1000
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { STATES } from '../../lib/constants/cities';
import { styleSeedsData } from '../../scripts/style-seeds/style-seeds-data';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const INDEXNOW_ENDPOINTS = {
  bing: 'https://www.bing.com/indexnow',
  yandex: 'https://yandex.com/indexnow',
} as const;

const BASE_URL = 'https://inkdex.io';
const MAX_URLS_PER_BATCH = 10000;

interface SubmitResult {
  engine: string;
  success: boolean;
  status?: number;
  urlCount: number;
}

async function submitBatch(urls: string[], engine: keyof typeof INDEXNOW_ENDPOINTS): Promise<SubmitResult> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    throw new Error('INDEXNOW_KEY not set');
  }

  const host = new URL(BASE_URL).host;
  const endpoint = INDEXNOW_ENDPOINTS[engine];

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${BASE_URL}/${key}.txt`,
        urlList: urls,
      }),
    });

    return {
      engine,
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      urlCount: urls.length,
    };
  } catch (error) {
    return {
      engine,
      success: false,
      urlCount: urls.length,
    };
  }
}

async function getAllUrls(supabase: ReturnType<typeof createClient>, type?: string, limit?: number) {
  const urls: string[] = [];

  // Static pages (always include)
  if (!type || type === 'static') {
    urls.push(
      BASE_URL,
      `${BASE_URL}/about`,
      `${BASE_URL}/contact`,
      `${BASE_URL}/add-artist`,
      `${BASE_URL}/legal/terms`,
      `${BASE_URL}/legal/privacy`,
      `${BASE_URL}/guides`,
    );
    console.log(`  Static pages: ${urls.length}`);
  }

  // State pages
  if (!type || type === 'states') {
    for (const state of STATES) {
      urls.push(`${BASE_URL}/${state.slug}`);
    }
    console.log(`  State pages: ${STATES.length}`);
  }

  // City pages (from artist_locations)
  if (!type || type === 'cities') {
    const { data: cities } = await supabase
      .from('artist_locations')
      .select('city, region')
      .eq('country_code', 'US')
      .not('city', 'is', null);

    const uniqueCities = new Map<string, { city: string; region: string }>();
    cities?.forEach((c) => {
      const key = `${c.city}-${c.region}`;
      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, c);
      }
    });

    let cityCount = 0;
    for (const { city, region } of uniqueCities.values()) {
      const state = STATES.find((s) => s.code === region);
      if (!state) continue;

      const citySlug = city.toLowerCase().replace(/\s+/g, '-');
      urls.push(`${BASE_URL}/${state.slug}/${citySlug}`);

      // Style pages for each city
      for (const style of styleSeedsData) {
        urls.push(`${BASE_URL}/${state.slug}/${citySlug}/${style.styleName}`);
      }
      cityCount++;
    }
    console.log(`  City pages: ${cityCount} cities × ${styleSeedsData.length + 1} = ${cityCount * (styleSeedsData.length + 1)}`);
  }

  // Artist pages (paginate to get all)
  if (!type || type === 'artists') {
    const PAGE_SIZE = 1000;
    let offset = 0;
    let allArtists: { slug: string }[] = [];

    while (true) {
      let query = supabase
        .from('artists')
        .select('slug')
        .range(offset, offset + PAGE_SIZE - 1);

      const { data: artists } = await query;

      if (!artists || artists.length === 0) break;
      allArtists = allArtists.concat(artists);

      if (limit && allArtists.length >= limit) {
        allArtists = allArtists.slice(0, limit);
        break;
      }

      if (artists.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    allArtists.forEach((a) => {
      urls.push(`${BASE_URL}/artist/${a.slug}`);
    });
    console.log(`  Artist pages: ${allArtists.length}`);
  }

  // Guide pages
  if (!type || type === 'guides') {
    const { data: cities } = await supabase
      .from('artist_locations')
      .select('city')
      .eq('country_code', 'US')
      .not('city', 'is', null);

    const uniqueCitySlugs = new Set<string>();
    cities?.forEach((c) => {
      uniqueCitySlugs.add(c.city.toLowerCase().replace(/\s+/g, '-'));
    });

    for (const citySlug of uniqueCitySlugs) {
      urls.push(`${BASE_URL}/guides/${citySlug}`);
    }
    console.log(`  Guide pages: ${uniqueCitySlugs.size}`);
  }

  return urls;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const typeIndex = args.indexOf('--type');
  const type = typeIndex !== -1 ? args[typeIndex + 1] : undefined;
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined;

  console.log('\n🔍 IndexNow Bulk Submission');
  console.log('===========================\n');

  if (!process.env.INDEXNOW_KEY) {
    console.error('❌ INDEXNOW_KEY environment variable not set');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('📊 Collecting URLs...');
  const urls = await getAllUrls(supabase, type, limit);
  console.log(`\n📦 Total URLs: ${urls.length.toLocaleString()}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - Sample URLs:');
    urls.slice(0, 20).forEach((url) => console.log(`   ${url}`));
    if (urls.length > 20) {
      console.log(`   ... and ${urls.length - 20} more`);
    }
    console.log('\n✅ Dry run complete. Remove --dry-run to submit.');
    return;
  }

  // Submit in batches
  const batches = [];
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_BATCH) {
    batches.push(urls.slice(i, i + MAX_URLS_PER_BATCH));
  }

  console.log(`\n📡 Submitting ${batches.length} batch(es) to Bing and Yandex...\n`);

  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Batch ${i + 1}/${batches.length} (${batch.length} URLs)...`);

    const [bingResult, yandexResult] = await Promise.all([
      submitBatch(batch, 'bing'),
      submitBatch(batch, 'yandex'),
    ]);

    if (bingResult.success) {
      console.log(`   ✅ Bing: ${bingResult.status}`);
      totalSuccess++;
    } else {
      console.log(`   ❌ Bing: ${bingResult.status || 'failed'}`);
      totalFailed++;
    }

    if (yandexResult.success) {
      console.log(`   ✅ Yandex: ${yandexResult.status}`);
      totalSuccess++;
    } else {
      console.log(`   ❌ Yandex: ${yandexResult.status || 'failed'}`);
      totalFailed++;
    }

    // Small delay between batches
    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`URLs submitted: ${urls.length.toLocaleString()}`);
  console.log(`Successful submissions: ${totalSuccess}`);
  console.log(`Failed submissions: ${totalFailed}`);
  console.log('\n✅ Done!');
}

main().catch(console.error);
