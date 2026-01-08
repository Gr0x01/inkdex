#!/usr/bin/env npx tsx
/**
 * Retag Images Missing Style Tags
 *
 * Finds images that have embeddings but no style tags and re-tags them.
 * Loops until all orphaned images are processed.
 *
 * Usage:
 *   npx tsx scripts/maintenance/retag-missing-styles.ts
 *   npx tsx scripts/maintenance/retag-missing-styles.ts --dry-run    # Preview only
 *   npx tsx scripts/maintenance/retag-missing-styles.ts --limit 100  # Process max 100 per round
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { predictStyles } from '../../lib/styles/predictor';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ParsedArgs {
  dryRun: boolean;
  limit: number;
  batchSize: number;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit = 5000; // Per-round limit
  let batchSize = 100;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { dryRun, limit, batchSize };
}

async function main() {
  const { dryRun, limit, batchSize } = parseArgs();

  console.log('Retag Missing Styles');
  console.log('====================');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Batch size: ${batchSize}, Round limit: ${limit}`);
  console.log('');

  let totalProcessed = 0;
  let totalTagged = 0;
  let totalNoStyles = 0;
  const totalStyleCounts: Record<string, number> = {};
  const globalStartTime = Date.now();
  let round = 0;

  // First, get all image IDs that already have tags (Supabase LEFT JOIN is buggy)
  console.log('Building set of already-tagged image IDs...');
  const taggedImageIds = new Set<string>();
  let tagOffset = 0;
  while (true) {
    const { data: tagBatch } = await supabase
      .from('image_style_tags')
      .select('image_id')
      .range(tagOffset, tagOffset + 999);
    if (!tagBatch || tagBatch.length === 0) break;
    tagBatch.forEach((t) => taggedImageIds.add(t.image_id));
    if (tagBatch.length < 1000) break;
    tagOffset += 1000;
  }
  console.log(`Found ${taggedImageIds.size} images already tagged\n`);

  // Loop until no more orphaned images
  while (true) {
    round++;

    // Find images with embeddings, then filter out already-tagged ones
    const { data: candidateImages, error: queryError } = await supabase
      .from('portfolio_images')
      .select('id, instagram_post_id, artist_id, embedding')
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Fetch extra since we'll filter

    // Filter to only truly orphaned images
    const orphanedImages = candidateImages?.filter((img) => !taggedImageIds.has(img.id)).slice(0, limit);

    if (queryError) {
      console.error('Error querying orphaned images:', queryError);
      process.exit(1);
    }

    if (!orphanedImages || orphanedImages.length === 0) {
      if (round === 1) {
        console.log('No orphaned images found. All images with embeddings have style tags.');
      }
      break;
    }

    console.log(`\n=== Round ${round}: Processing ${orphanedImages.length} images ===`);

    let roundProcessed = 0;
    let roundTagged = 0;
    let roundNoStyles = 0;
    const roundStartTime = Date.now();

    // Process in batches
    for (let i = 0; i < orphanedImages.length; i += batchSize) {
      const batch = orphanedImages.slice(i, i + batchSize);
      const tagsToInsert: { image_id: string; style_name: string; confidence: number }[] = [];

      for (const img of batch) {
        // Parse embedding if string
        let embedding: number[];
        try {
          embedding =
            typeof img.embedding === 'string' ? JSON.parse(img.embedding) : img.embedding;
        } catch {
          console.warn(`[SKIP] JSON parse failed for ${img.instagram_post_id}`);
          continue;
        }

        if (!embedding || embedding.length !== 768) {
          console.warn(`[SKIP] Invalid embedding for ${img.instagram_post_id}`);
          continue;
        }

        const predictions = predictStyles(embedding);

        if (predictions.length > 0) {
          roundTagged++;
          totalTagged++;
          for (const { style, confidence } of predictions) {
            tagsToInsert.push({
              image_id: img.id,
              style_name: style,
              confidence,
            });
            totalStyleCounts[style] = (totalStyleCounts[style] || 0) + 1;
          }
        } else {
          roundNoStyles++;
          totalNoStyles++;
        }

        roundProcessed++;
        totalProcessed++;
      }

      // Insert tags
      if (tagsToInsert.length > 0 && !dryRun) {
        const { error: insertError } = await supabase
          .from('image_style_tags')
          .upsert(tagsToInsert, { onConflict: 'image_id,style_name' });

        if (insertError) {
          console.error('Error inserting tags:', insertError);
        } else {
          // Add to tagged set so we don't re-process
          tagsToInsert.forEach((t) => taggedImageIds.add(t.image_id));
        }
      }

      // Progress update
      const elapsed = (Date.now() - roundStartTime) / 1000;
      const rate = roundProcessed / elapsed;
      process.stdout.write(
        `\rProcessed ${roundProcessed}/${orphanedImages.length} (${rate.toFixed(0)}/s) - ${tagsToInsert.length} tags`
      );
    }

    const roundElapsed = (Date.now() - roundStartTime) / 1000;
    console.log(`\nRound ${round} complete: ${roundTagged} tagged, ${roundNoStyles} no styles (${roundElapsed.toFixed(1)}s)`);

    // In dry run, only do one round
    if (dryRun) {
      console.log('\nDRY RUN - stopping after first round');
      break;
    }
  }

  // Final summary
  const totalElapsed = (Date.now() - globalStartTime) / 1000;

  console.log('\n');
  console.log('===================');
  console.log('FINAL SUMMARY');
  console.log('===================');
  console.log(`Rounds: ${round}`);
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total tagged: ${totalTagged}`);
  console.log(`Total no matching styles: ${totalNoStyles}`);
  console.log(`Total time: ${totalElapsed.toFixed(1)}s (${(totalProcessed / totalElapsed).toFixed(0)}/s)`);
  console.log('');
  console.log('Style distribution:');

  const sortedStyles = Object.entries(totalStyleCounts).sort((a, b) => b[1] - a[1]);
  for (const [style, count] of sortedStyles) {
    const pct = totalTagged > 0 ? ((count / totalTagged) * 100).toFixed(1) : '0';
    console.log(`  ${style}: ${count} (${pct}%)`);
  }

  if (dryRun) {
    console.log('\nThis was a DRY RUN. No changes were made.');
  }
}

main().catch(console.error);
