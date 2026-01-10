#!/usr/bin/env npx tsx
/**
 * Compute Artist Style Profiles
 *
 * Aggregates image_style_tags into artist-level style profiles.
 *
 * Artist profile breakdown:
 *   - Styles: "60% realism, 25% blackwork, 15% traditional"
 *
 * Usage:
 *   npx tsx scripts/styles/compute-artist-profiles.ts
 *   npx tsx scripts/styles/compute-artist-profiles.ts --dry-run
 *   npx tsx scripts/styles/compute-artist-profiles.ts --artist-id <uuid>
 *   npx tsx scripts/styles/compute-artist-profiles.ts --clear
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ArtistProfile {
  artist_id: string;
  style_name: string;
  percentage: number;
  image_count: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let artistId: string | null = null;
  let clear = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--artist-id' && args[i + 1]) {
      artistId = args[i + 1];
      i++;
    } else if (args[i] === '--clear') {
      clear = true;
    }
  }

  return { dryRun, artistId, clear };
}

async function main() {
  const { dryRun, artistId, clear } = parseArgs();

  console.log('Artist Style Profile Aggregation');
  console.log('================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (artistId) console.log(`Single artist: ${artistId}`);
  console.log('');

  // Clear existing profiles if requested
  if (clear && !dryRun) {
    console.log('Clearing existing profiles...');
    const { error: clearError } = await supabase
      .from('artist_style_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (clearError) {
      console.error('Failed to clear:', clearError.message);
      process.exit(1);
    }
    console.log('Cleared.\n');
  }

  // Aggregate directly in SQL for efficiency
  console.log('Computing artist style profiles...');
  const startTime = Date.now();

  // This query:
  // 1. Joins image_style_tags with portfolio_images to get artist_id
  // 2. Groups by artist + style
  // 3. Counts images per style
  // 4. Calculates percentage of total tags for that artist
  const { data: profiles, error: queryError } = await supabase.rpc('compute_artist_style_profiles', {
    p_artist_id: artistId
  });

  // If RPC doesn't exist, fall back to manual computation
  if (queryError?.message?.includes('function') || queryError?.code === '42883') {
    console.log('RPC not found, computing manually...\n');
    await computeManually(dryRun, artistId);
    return;
  }

  if (queryError) {
    console.error('Query error:', queryError.message);
    console.log('Falling back to manual computation...\n');
    await computeManually(dryRun, artistId);
    return;
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`Computed ${profiles?.length || 0} profiles in ${elapsed.toFixed(1)}s\n`);

  if (dryRun) {
    console.log('DRY RUN - no profiles inserted.');
    if (profiles && profiles.length > 0) {
      console.log('\nSample profiles (first 20):');
      for (const p of profiles.slice(0, 20)) {
        console.log(`  ${p.artist_id.slice(0, 8)}... → ${p.style_name}: ${p.percentage.toFixed(1)}% (${p.image_count} images)`);
      }
    }
    return;
  }

  console.log('Done!');
}

async function computeManually(dryRun: boolean, artistId: string | null) {
  const startTime = Date.now();

  // Step 1: Get all image tags with artist info (paginated)
  console.log('Fetching image tags with artist data...');

  const PAGE_SIZE = 5000;
  let allTags: { style_name: string; confidence: number; portfolio_images: { artist_id: string } }[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: tags, error: tagsError } = await supabase
      .from('image_style_tags')
      .select(`
        style_name,
        confidence,
        portfolio_images!inner(artist_id)
      `)
      .range(offset, offset + PAGE_SIZE - 1);

    if (tagsError) {
      console.error('Failed to fetch tags:', tagsError.message);
      process.exit(1);
    }

    if (!tags || tags.length === 0) {
      hasMore = false;
    } else {
      allTags = allTags.concat(tags as typeof allTags);
      console.log(`  Fetched ${allTags.length} tags...`);
      offset += PAGE_SIZE;
      if (tags.length < PAGE_SIZE) {
        hasMore = false;
      }
    }
  }

  const tags = allTags;
  console.log(`Fetched ${tags.length} total tags\n`);

  if (!tags || tags.length === 0) {
    console.log('No tags found. Run tag-images-ml.ts first.');
    return;
  }

  // Step 2: Aggregate by artist + style
  console.log('Aggregating by artist...');

  // Structure: artist_id -> style_name -> count
  const artistStyles: Map<string, Map<string, number>> = new Map();
  const artistTotals: Map<string, number> = new Map();

  for (const tag of tags) {
    const aid = tag.portfolio_images?.artist_id;
    if (!aid) continue;

    if (artistId && aid !== artistId) continue;

    if (!artistStyles.has(aid)) {
      artistStyles.set(aid, new Map());
      artistTotals.set(aid, 0);
    }

    const styles = artistStyles.get(aid)!;
    styles.set(tag.style_name, (styles.get(tag.style_name) || 0) + 1);
    artistTotals.set(aid, artistTotals.get(aid)! + 1);
  }

  console.log(`Found ${artistStyles.size} artists with style tags\n`);

  // Step 3: Calculate percentages and build profiles
  const profiles: ArtistProfile[] = [];

  for (const [aid, styles] of artistStyles) {
    const total = artistTotals.get(aid) || 1;

    for (const [styleName, count] of styles) {
      const percentage = (count / total) * 100;
      profiles.push({
        artist_id: aid,
        style_name: styleName,
        percentage,
        image_count: count,
      });
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`Computed ${profiles.length} profiles for ${artistStyles.size} artists in ${elapsed.toFixed(1)}s\n`);

  // Show distribution
  const styleCounts: Record<string, number> = {};
  for (const p of profiles) {
    styleCounts[p.style_name] = (styleCounts[p.style_name] || 0) + 1;
  }

  console.log('Style profiles (artists per style):');
  Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([style, count]) => {
      console.log(`  ${style}: ${count} artists`);
    });
  console.log('');

  // Show sample
  console.log('Sample profiles (first 10):');
  for (const p of profiles.slice(0, 10)) {
    console.log(`  ${p.artist_id.slice(0, 8)}... → ${p.style_name}: ${p.percentage.toFixed(1)}% (${p.image_count} images)`);
  }
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - no profiles inserted.');
    return;
  }

  // Step 4: Upsert profiles in batches
  console.log('Inserting profiles...');
  const BATCH_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE).map(p => ({
      ...p,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('artist_style_profiles')
      .upsert(batch, { onConflict: 'artist_id,style_name' });

    if (insertError) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, insertError.message);
    } else {
      inserted += batch.length;
    }

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= profiles.length) {
      console.log(`  Inserted ${inserted}/${profiles.length}`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} artist style profiles.`);
}

main().catch(console.error);
