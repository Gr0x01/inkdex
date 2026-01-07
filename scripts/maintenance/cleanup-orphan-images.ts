#!/usr/bin/env npx tsx
/**
 * Cleanup Orphan Images
 *
 * Finds and marks images that have database records but missing files in storage.
 * These orphans block the embedding pipeline since the files can't be downloaded.
 *
 * Usage:
 *   npx tsx scripts/maintenance/cleanup-orphan-images.ts --dry-run    # Preview only
 *   npx tsx scripts/maintenance/cleanup-orphan-images.ts              # Actually mark orphans
 *   npx tsx scripts/maintenance/cleanup-orphan-images.ts --delete     # Delete orphan records entirely
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 100;
const CONCURRENCY = 20;

interface OrphanImage {
  id: string;
  storage_original_path: string;
  artist_id: string;
}

async function checkFileExists(path: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('portfolio-images')
    .createSignedUrl(path, 10);
  return !error;
}

async function findOrphans(limit: number = 1000): Promise<OrphanImage[]> {
  const orphans: OrphanImage[] = [];
  let offset = 0;
  let checked = 0;

  console.log('🔍 Scanning for orphan images...\n');

  while (checked < limit) {
    // Fetch batch of pending images without embeddings
    const { data: images, error } = await supabase
      .from('portfolio_images')
      .select('id, storage_original_path, artist_id')
      .is('embedding', null)
      .eq('status', 'pending')
      .not('storage_original_path', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching images:', error.message);
      break;
    }

    if (!images || images.length === 0) {
      console.log('No more images to check.');
      break;
    }

    // Check files in parallel with concurrency limit
    const results = await Promise.all(
      images.map(async (img) => {
        const exists = await checkFileExists(img.storage_original_path);
        return { img, exists };
      })
    );

    // Collect orphans
    for (const { img, exists } of results) {
      if (!exists) {
        orphans.push(img);
      }
    }

    checked += images.length;
    const orphanRate = ((orphans.length / checked) * 100).toFixed(1);
    process.stdout.write(`\r  Checked: ${checked} | Orphans found: ${orphans.length} (${orphanRate}%)    `);

    offset += BATCH_SIZE;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n');
  return orphans;
}

async function markOrphans(orphans: OrphanImage[]): Promise<number> {
  console.log(`📝 Marking ${orphans.length} orphan images as 'failed'...\n`);

  const orphanIds = orphans.map(o => o.id);
  let marked = 0;

  // Update in batches
  for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
    const batch = orphanIds.slice(i, i + BATCH_SIZE);

    const { error, count } = await supabase
      .from('portfolio_images')
      .update({ status: 'deleted' })
      .in('id', batch);

    if (error) {
      console.error(`Error marking batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      marked += count || batch.length;
      process.stdout.write(`\r  Marked: ${marked}/${orphans.length}    `);
    }
  }

  console.log('\n');
  return marked;
}

async function deleteOrphans(orphans: OrphanImage[]): Promise<number> {
  console.log(`🗑️  Deleting ${orphans.length} orphan image records...\n`);

  const orphanIds = orphans.map(o => o.id);
  let deleted = 0;

  // Delete in batches
  for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
    const batch = orphanIds.slice(i, i + BATCH_SIZE);

    const { error, count } = await supabase
      .from('portfolio_images')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`Error deleting batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      deleted += count || batch.length;
      process.stdout.write(`\r  Deleted: ${deleted}/${orphans.length}    `);
    }
  }

  console.log('\n');
  return deleted;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const deleteMode = args.includes('--delete');
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10000');

  console.log('=' .repeat(60));
  console.log('🧹 ORPHAN IMAGE CLEANUP');
  console.log('=' .repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : deleteMode ? 'DELETE' : 'MARK AS FAILED'}`);
  console.log(`Limit: ${limit} images`);
  console.log('');

  // Find orphans
  const orphans = await findOrphans(limit);

  if (orphans.length === 0) {
    console.log('✅ No orphan images found!');
    return;
  }

  // Show summary by artist
  const byArtist = new Map<string, number>();
  for (const o of orphans) {
    byArtist.set(o.artist_id, (byArtist.get(o.artist_id) || 0) + 1);
  }

  console.log(`Found ${orphans.length} orphan images across ${byArtist.size} artists`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes made');
    console.log('   Run without --dry-run to mark orphans as failed');
    console.log('   Run with --delete to remove orphan records entirely');
    return;
  }

  // Execute cleanup
  if (deleteMode) {
    const deleted = await deleteOrphans(orphans);
    console.log(`✅ Deleted ${deleted} orphan image records`);
  } else {
    const marked = await markOrphans(orphans);
    console.log(`✅ Marked ${marked} orphan images as 'failed'`);
  }

  console.log('');
  console.log('Done! You can now run embeddings without hitting missing files.');
}

main().catch(console.error);
