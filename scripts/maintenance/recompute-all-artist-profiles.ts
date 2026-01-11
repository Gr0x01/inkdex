#!/usr/bin/env npx tsx
/**
 * Recompute ALL Artist Style Profiles
 *
 * This script recomputes artist_style_profiles for ALL artists that have
 * image_style_tags. Use this when:
 * - Triggers have failed to maintain profiles
 * - Profiles are stale from deleted images
 * - Bulk data changes have occurred
 *
 * Usage:
 *   npx tsx scripts/maintenance/recompute-all-artist-profiles.ts
 *   npx tsx scripts/maintenance/recompute-all-artist-profiles.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 50;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
  };
}

async function main() {
  const { dryRun } = parseArgs();

  console.log('Recompute ALL Artist Style Profiles');
  console.log('====================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  // Step 1: Get all unique artist IDs that have image_style_tags
  console.log('Finding all artists with style tags...');

  const artistIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data: batch, error } = await supabase
      .from('image_style_tags')
      .select('portfolio_images!inner(artist_id)')
      .range(offset, offset + 4999);

    if (error) {
      console.error('Error fetching tags:', error);
      process.exit(1);
    }

    if (!batch || batch.length === 0) break;

    batch.forEach((row: any) => {
      if (row.portfolio_images?.artist_id) {
        artistIds.add(row.portfolio_images.artist_id);
      }
    });

    offset += 5000;
    process.stdout.write(`\r  Scanned ${offset} tags, found ${artistIds.size} artists...`);

    if (batch.length < 5000) break;
  }

  console.log(`\n  Total artists to recompute: ${artistIds.size}`);

  // Step 2: Get current profile counts for comparison
  const { data: currentProfiles } = await supabase
    .from('artist_style_profiles')
    .select('artist_id');

  const currentProfileArtists = new Set(currentProfiles?.map(p => p.artist_id) || []);
  const missingProfiles = [...artistIds].filter(id => !currentProfileArtists.has(id));

  console.log(`  Artists currently with profiles: ${currentProfileArtists.size}`);
  console.log(`  Artists missing profiles: ${missingProfiles.length}`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - would recompute profiles for all artists listed above');
    console.log('\nSample of artists missing profiles:');
    missingProfiles.slice(0, 10).forEach(id => console.log(`  ${id}`));
    return;
  }

  // Step 3: Recompute profiles for each artist
  console.log('Recomputing profiles...');
  const startTime = Date.now();

  const artistArray = [...artistIds];
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < artistArray.length; i += BATCH_SIZE) {
    const batch = artistArray.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (artistId) => {
        const { error } = await supabase.rpc('recompute_artist_styles', {
          p_artist_id: artistId
        });
        if (error) throw error;
      })
    );

    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        errors++;
        console.error(`\n  Error for ${batch[idx]}:`, result.reason);
      }
    });

    processed += batch.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const eta = (artistArray.length - processed) / rate;

    process.stdout.write(`\r  Processed ${processed}/${artistArray.length} (${rate.toFixed(0)}/s, ETA: ${eta.toFixed(0)}s)`);
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n');
  console.log('====================================');
  console.log('COMPLETE');
  console.log('====================================');
  console.log(`Total artists recomputed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Time: ${totalTime.toFixed(1)}s`);

  // Step 4: Verify
  console.log('\nVerifying...');
  const { data: newProfiles } = await supabase
    .from('artist_style_profiles')
    .select('artist_id');

  const newProfileArtists = new Set(newProfiles?.map(p => p.artist_id) || []);
  const stillMissing = [...artistIds].filter(id => !newProfileArtists.has(id));

  console.log(`  Artists now with profiles: ${newProfileArtists.size}`);
  console.log(`  Artists still missing: ${stillMissing.length}`);

  if (stillMissing.length > 0) {
    console.log('\n  Still missing:');
    stillMissing.slice(0, 10).forEach(id => console.log(`    ${id}`));
  }
}

main().catch(console.error);
