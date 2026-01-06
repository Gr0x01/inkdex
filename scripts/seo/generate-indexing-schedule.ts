#!/usr/bin/env npx tsx
/**
 * Generate a verified Google Search Console indexing schedule
 *
 * Queries the database for cities that actually have artists,
 * then generates a markdown schedule with correct URLs.
 *
 * Usage:
 *   npx tsx scripts/seo/generate-indexing-schedule.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { styleSeedsData } from '../style-seeds/style-seeds-data';
import { STATES } from '../../lib/constants/cities';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const BASE_URL = 'https://inkdex.io';
const URLS_PER_DAY = 12;

// Build a map from state name/slug to code for normalization
const stateNameToCode = new Map<string, string>();
STATES.forEach((s) => {
  stateNameToCode.set(s.code.toLowerCase(), s.code.toLowerCase());
  stateNameToCode.set(s.name.toLowerCase(), s.code.toLowerCase());
  stateNameToCode.set(s.slug.toLowerCase(), s.code.toLowerCase());
});

function normalizeStateCode(region: string): string | null {
  const normalized = stateNameToCode.get(region.toLowerCase());
  if (!normalized) {
    console.warn(`Unknown region: ${region}`);
    return null;
  }
  return normalized;
}

interface CityData {
  city: string;
  region: string; // normalized state code
  artist_count: number;
}

async function main() {
  console.log('\n📊 Generating Google Indexing Schedule\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Query cities with artist counts
  console.log('Querying cities with artists...');
  const { data: rawCities, error } = await supabase
    .from('artist_locations')
    .select('city, region')
    .eq('country_code', 'US')
    .not('city', 'is', null);

  if (error) {
    console.error('Error querying cities:', error);
    process.exit(1);
  }

  // Deduplicate and count artists per city (normalize state codes)
  const cityMap = new Map<string, CityData>();
  rawCities?.forEach((c) => {
    const stateCode = normalizeStateCode(c.region);
    if (!stateCode) return; // Skip unknown regions

    const key = `${c.city.toLowerCase()}-${stateCode}`;
    const existing = cityMap.get(key);
    if (existing) {
      existing.artist_count++;
    } else {
      cityMap.set(key, { city: c.city, region: stateCode, artist_count: 1 });
    }
  });

  // Sort by artist count descending
  const cities = Array.from(cityMap.values()).sort(
    (a, b) => b.artist_count - a.artist_count
  );

  console.log(`Found ${cities.length} cities with artists\n`);

  // Get unique states that have artists
  const statesWithArtists = new Set(cities.map((c) => c.region.toLowerCase()));

  // Build URL list with priorities
  const urls: { url: string; priority: number }[] = [];

  // Priority 1: Static pages
  const staticPages = [
    BASE_URL,
    `${BASE_URL}/search`,
    `${BASE_URL}/about`,
    `${BASE_URL}/contact`,
    `${BASE_URL}/add-artist`,
    `${BASE_URL}/legal/terms`,
    `${BASE_URL}/legal/privacy`,
    `${BASE_URL}/guides`,
  ];
  staticPages.forEach((url) => urls.push({ url, priority: 1 }));

  // Priority 2: Top 20 cities
  const topCities = cities.slice(0, 20);
  topCities.forEach((c) => {
    const stateCode = c.region.toLowerCase();
    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-');
    urls.push({ url: `${BASE_URL}/us/${stateCode}/${citySlug}`, priority: 2 });
  });

  // Priority 3: Style pages for top 5 cities
  const topStyles = ['blackwork', 'traditional', 'realism', 'japanese', 'neo-traditional'];
  const top5Cities = cities.slice(0, 5);
  top5Cities.forEach((c) => {
    const stateCode = c.region.toLowerCase();
    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-');
    topStyles.forEach((style) => {
      urls.push({ url: `${BASE_URL}/us/${stateCode}/${citySlug}/${style}`, priority: 3 });
    });
  });

  // Priority 4: State pages (only states with artists)
  statesWithArtists.forEach((stateCode) => {
    urls.push({ url: `${BASE_URL}/us/${stateCode}`, priority: 4 });
  });

  // Priority 5: Remaining cities
  const remainingCities = cities.slice(20);
  remainingCities.forEach((c) => {
    const stateCode = c.region.toLowerCase();
    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-');
    urls.push({ url: `${BASE_URL}/us/${stateCode}/${citySlug}`, priority: 5 });
  });

  // Priority 6: Guide pages for top 20 cities
  topCities.forEach((c) => {
    const citySlug = c.city.toLowerCase().replace(/\s+/g, '-');
    urls.push({ url: `${BASE_URL}/guides/${citySlug}`, priority: 6 });
  });

  // Sort by priority
  urls.sort((a, b) => a.priority - b.priority);

  // Group into days
  const days: string[][] = [];
  for (let i = 0; i < urls.length; i += URLS_PER_DAY) {
    days.push(urls.slice(i, i + URLS_PER_DAY).map((u) => u.url));
  }

  // Generate markdown
  const styleList = styleSeedsData.map((s) => s.styleName).join(', ');

  let markdown = `---
Last-Updated: ${new Date().toISOString().split('T')[0]}
Maintainer: RB
Status: Active
---

# Google Search Console Manual Indexing Schedule

Submit 10-15 URLs per day via URL Inspection → Request Indexing.

**Generated from database on ${new Date().toISOString().split('T')[0]}** - ${cities.length} cities with artists.

## URL Structure

- **Cities:** \`/us/{state-code}/{city-slug}\` (e.g., \`/us/tx/austin\`)
- **Styles:** \`/us/{state-code}/{city-slug}/{style}\`
- **States:** \`/us/{state-code}\`
- **Guides:** \`/guides/{city-slug}\`

## Available Styles (${styleSeedsData.length})

${styleList}

`;

  // Add each day
  days.forEach((dayUrls, index) => {
    const dayNum = index + 1;
    let dayTitle = `Day ${dayNum}`;

    // Add descriptive titles for first few days
    if (dayNum === 1) dayTitle += ' - Static Pages + Top Cities';
    else if (dayNum <= 3) dayTitle += ' - Top Cities';
    else if (dayNum <= 5) dayTitle += ' - Style Pages';
    else if (dayNum <= 7) dayTitle += ' - States + Cities';

    markdown += `## ${dayTitle}\n\n`;
    dayUrls.forEach((url) => {
      markdown += `- [ ] ${url}\n`;
    });
    markdown += '\n';
  });

  // Add tips and tracking
  markdown += `---

## Tips

1. **Rate Limit:** Google allows ~10-15 manual indexing requests per day
2. **Check Status:** After 2-3 days, re-inspect URLs to verify indexing
3. **Priority:** Cities with most artists are listed first
4. **Regenerate:** Run \`npx tsx scripts/seo/generate-indexing-schedule.ts\` to update

## Top Cities by Artist Count

| City | State | Artists |
|------|-------|---------|
${cities.slice(0, 10).map((c) => `| ${c.city} | ${c.region} | ${c.artist_count} |`).join('\n')}

## Progress Tracking

| Day | Date | Completed |
|-----|------|-----------|
${days.slice(0, 15).map((_, i) => `| ${i + 1} | | [ ] |`).join('\n')}
${days.length > 15 ? `| ... | | |` : ''}
`;

  // Write to file
  const outputPath = path.join(__dirname, '../../memory-bank/projects/google-indexing-schedule.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ Generated schedule with ${urls.length} URLs across ${days.length} days`);
  console.log(`📄 Written to: ${outputPath}\n`);

  // Print summary
  console.log('Summary:');
  console.log(`  Static pages: ${staticPages.length}`);
  console.log(`  City pages: ${cities.length}`);
  console.log(`  Style pages: ${top5Cities.length * topStyles.length}`);
  console.log(`  State pages: ${statesWithArtists.size}`);
  console.log(`  Guide pages: ${topCities.length}`);
  console.log(`  Total URLs: ${urls.length}`);
  console.log(`  Days needed: ${days.length}`);
}

main().catch(console.error);
