#!/usr/bin/env npx tsx
/**
 * Cleanup Non-Tattoo Images
 *
 * Runs all portfolio images through GPT vision filter to identify and remove
 * non-tattoo content (selfies, lifestyle photos, promotional graphics).
 *
 * Strategy:
 *   - confidence < 0.3: Auto-delete (obvious garbage)
 *   - confidence 0.3-0.5: Flag is_tattoo=false (borderline, review in admin)
 *   - confidence >= 0.5: Mark is_tattoo=true (keep)
 *
 * Cost: ~$0.001 per image (~$100 for 99k images)
 * Time: ~3-4 hours at 50 concurrent requests
 *
 * Usage:
 *   npx tsx scripts/maintenance/cleanup-non-tattoo-images.ts
 *   npx tsx scripts/maintenance/cleanup-non-tattoo-images.ts --dry-run
 *   npx tsx scripts/maintenance/cleanup-non-tattoo-images.ts --limit 1000
 *   npx tsx scripts/maintenance/cleanup-non-tattoo-images.ts --blacklist-empty
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  filterTattooImages,
  AUTO_DELETE_THRESHOLD,
  TATTOO_CONFIDENCE_THRESHOLD,
} from '../../lib/instagram/tattoo-filter';
import { downloadImage, deleteImages } from '../../lib/storage/supabase-storage';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Processing config
const BATCH_SIZE = 50; // Images per batch
const CONCURRENCY = 25; // Parallel GPT calls (within rate limits)
const LOG_INTERVAL = 100; // Log progress every N images

interface ParsedArgs {
  dryRun: boolean;
  limit: number;
  blacklistEmpty: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit = Infinity;
  let blacklistEmpty = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--blacklist-empty') {
      blacklistEmpty = true;
    }
  }

  return { dryRun, limit, blacklistEmpty };
}

interface ImageRecord {
  id: string;
  artist_id: string;
  storage_thumb_640: string | null;
  storage_original_path: string | null;
  storage_thumb_320: string | null;
  storage_thumb_1280: string | null;
}

/**
 * Get all storage paths for an image (for deletion)
 */
function getStoragePaths(image: ImageRecord): string[] {
  const paths: string[] = [];
  if (image.storage_original_path) paths.push(image.storage_original_path);
  if (image.storage_thumb_320) paths.push(image.storage_thumb_320);
  if (image.storage_thumb_640) paths.push(image.storage_thumb_640);
  if (image.storage_thumb_1280) paths.push(image.storage_thumb_1280);
  return paths;
}

/**
 * Blacklist artists with no remaining images
 */
async function blacklistEmptyArtists(dryRun: boolean): Promise<number> {
  console.log('\n🗑️  Finding artists with no remaining images...');

  // Find artists with no active images
  const { data: emptyArtists, error: queryError } = await supabase.rpc('get_empty_artists');

  if (queryError) {
    // Fallback: manual query if RPC doesn't exist
    console.log('Using fallback query (RPC not found)...');

    const { data: allArtists } = await supabase
      .from('artists')
      .select('id')
      .limit(50000);

    if (!allArtists) {
      console.error('Failed to fetch artists');
      return 0;
    }

    // Get artists with at least one image
    const { data: artistsWithImages } = await supabase
      .from('portfolio_images')
      .select('artist_id')
      .eq('status', 'active');

    const artistsWithImagesSet = new Set(artistsWithImages?.map((a) => a.artist_id) || []);
    const empty = allArtists.filter((a) => !artistsWithImagesSet.has(a.id));

    console.log(`Found ${empty.length} artists with no images`);

    if (dryRun) {
      console.log('[DRY RUN] Would blacklist these artists');
      return empty.length;
    }

    // Blacklist them
    if (empty.length > 0) {
      const { error: updateError } = await supabase
        .from('artist_pipeline_state')
        .update({
          scraping_blacklisted: true,
          blacklist_reason: 'no_tattoo_content',
          blacklisted_at: new Date().toISOString(),
        })
        .in(
          'artist_id',
          empty.map((a) => a.id)
        );

      if (updateError) {
        console.error('Failed to blacklist artists:', updateError.message);
        return 0;
      }
    }

    return empty.length;
  }

  const count = emptyArtists?.length || 0;
  console.log(`Found ${count} artists with no images`);

  if (dryRun) {
    console.log('[DRY RUN] Would blacklist these artists');
    return count;
  }

  // Blacklist them via the RPC result
  if (emptyArtists && emptyArtists.length > 0) {
    const { error: updateError } = await supabase
      .from('artist_pipeline_state')
      .update({
        scraping_blacklisted: true,
        blacklist_reason: 'no_tattoo_content',
        blacklisted_at: new Date().toISOString(),
      })
      .in(
        'artist_id',
        emptyArtists.map((a: { id: string }) => a.id)
      );

    if (updateError) {
      console.error('Failed to blacklist artists:', updateError.message);
      return 0;
    }
  }

  return count;
}

async function main() {
  const { dryRun, limit, blacklistEmpty } = parseArgs();

  console.log('🧹 Cleanup Non-Tattoo Images');
  console.log('============================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚡ LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY}`);
  console.log(`Limit: ${limit === Infinity ? 'unlimited' : limit}`);
  console.log(`Auto-delete threshold: <${AUTO_DELETE_THRESHOLD * 100}%`);
  console.log(`Keep threshold: >=${TATTOO_CONFIDENCE_THRESHOLD * 100}%`);
  console.log('');

  // If only blacklisting empty artists
  if (blacklistEmpty) {
    const count = await blacklistEmptyArtists(dryRun);
    console.log(`\n✅ Blacklisted ${count} empty artists`);
    process.exit(0);
  }

  // Get count of unverified images
  const { count: totalUnverified } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .is('is_tattoo', null)
    .eq('status', 'active');

  console.log(`📊 Images to process: ${totalUnverified || 0}`);
  if (!totalUnverified) {
    console.log('✅ No unverified images found. All done!');
    process.exit(0);
  }

  const startTime = Date.now();
  let processed = 0;
  let kept = 0;
  let flagged = 0;
  let deleted = 0;
  let errors = 0;

  // Process in batches
  while (processed < limit) {
    // Fetch batch of unverified images
    const { data: images, error: fetchError } = await supabase
      .from('portfolio_images')
      .select('id, artist_id, storage_thumb_640, storage_original_path, storage_thumb_320, storage_thumb_1280')
      .is('is_tattoo', null)
      .eq('status', 'active')
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Failed to fetch images:', fetchError.message);
      break;
    }

    if (!images || images.length === 0) {
      console.log('✅ No more unverified images');
      break;
    }

    console.log(`\n📦 Processing batch of ${images.length} images...`);

    // Download images from storage
    const imagesToFilter: Array<{ id: string; buffer: Buffer; record: ImageRecord }> = [];

    for (const image of images as ImageRecord[]) {
      // Prefer thumb_640 for speed, fallback to original
      const storagePath = image.storage_thumb_640 || image.storage_original_path;
      if (!storagePath) {
        console.log(`  ⚠️ No storage path for image ${image.id}, skipping`);
        errors++;
        continue;
      }

      const { success, buffer, error } = await downloadImage(storagePath);
      if (!success || !buffer) {
        console.log(`  ⚠️ Failed to download ${image.id}: ${error}`);
        errors++;
        continue;
      }

      imagesToFilter.push({ id: image.id, buffer, record: image });
    }

    if (imagesToFilter.length === 0) {
      console.log('  No images to filter in this batch');
      continue;
    }

    // Run through GPT filter
    const filterResult = await filterTattooImages(
      imagesToFilter.map((img) => ({ id: img.id, buffer: img.buffer })),
      CONCURRENCY
    );

    // Process results
    for (const result of filterResult.results) {
      const imageData = imagesToFilter.find((img) => img.id === result.id);
      if (!imageData) continue;

      processed++;

      if (result.confidence < AUTO_DELETE_THRESHOLD) {
        // Auto-delete obvious garbage
        deleted++;

        if (!dryRun) {
          // Delete from database
          const { error: deleteError } = await supabase
            .from('portfolio_images')
            .delete()
            .eq('id', result.id);

          if (deleteError) {
            console.error(`  ❌ Failed to delete ${result.id}:`, deleteError.message);
            errors++;
            continue;
          }

          // Delete from storage
          const paths = getStoragePaths(imageData.record);
          if (paths.length > 0) {
            const { error: storageError } = await deleteImages(paths);
            if (storageError) {
              console.log(`  ⚠️ Storage cleanup failed for ${result.id}: ${storageError}`);
            }
          }
        }
      } else if (result.confidence < TATTOO_CONFIDENCE_THRESHOLD) {
        // Flag borderline for review
        flagged++;

        if (!dryRun) {
          await supabase
            .from('portfolio_images')
            .update({
              is_tattoo: false,
              tattoo_confidence: result.confidence,
            })
            .eq('id', result.id);
        }
      } else {
        // Keep tattoo images
        kept++;

        if (!dryRun) {
          await supabase
            .from('portfolio_images')
            .update({
              is_tattoo: true,
              tattoo_confidence: result.confidence,
            })
            .eq('id', result.id);
        }
      }

      // Log progress
      if (processed % LOG_INTERVAL === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = (totalUnverified! - processed) / rate;
        console.log(
          `\n📈 Progress: ${processed}/${totalUnverified} (${((processed / totalUnverified!) * 100).toFixed(1)}%)`
        );
        console.log(`   Kept: ${kept}, Flagged: ${flagged}, Deleted: ${deleted}, Errors: ${errors}`);
        console.log(`   Rate: ${rate.toFixed(1)} img/sec, ETA: ${(remaining / 60).toFixed(1)} min`);
      }
    }
  }

  // Final summary
  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n========================================');
  console.log('📊 FINAL SUMMARY');
  console.log('========================================');
  console.log(`Total processed: ${processed}`);
  console.log(`  ✅ Kept (tattoo): ${kept}`);
  console.log(`  ⚠️ Flagged (review): ${flagged}`);
  console.log(`  🗑️ Deleted (garbage): ${deleted}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`Time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`Rate: ${(processed / totalTime).toFixed(1)} images/sec`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
  }

  // Suggest next steps
  if (!dryRun && flagged > 0) {
    console.log(`\n💡 Next: Review ${flagged} flagged images at /admin/images/review`);
  }
  if (!dryRun && deleted > 0) {
    console.log(`💡 Next: Run with --blacklist-empty to blacklist artists with no remaining images`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
