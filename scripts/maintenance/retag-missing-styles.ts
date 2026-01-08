#!/usr/bin/env npx tsx
/**
 * Retag Images Missing Style Tags
 *
 * Finds images that have embeddings but no style tags and re-tags them.
 * Useful for catching images that failed during style tag insertion.
 *
 * Usage:
 *   npx tsx scripts/maintenance/retag-missing-styles.ts
 *   npx tsx scripts/maintenance/retag-missing-styles.ts --dry-run    # Preview only
 *   npx tsx scripts/maintenance/retag-missing-styles.ts --limit 100  # Process max 100
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
  limit: number | null;
  batchSize: number;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit: number | null = null;
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
  console.log(`Batch size: ${batchSize}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  // Find images with embeddings but no style tags
  // Using a LEFT JOIN to find missing tags
  const { data: orphanedImages, error: queryError } = await supabase
    .from('portfolio_images')
    .select(`
      id,
      instagram_post_id,
      artist_id,
      embedding,
      image_style_tags!left(id)
    `)
    .eq('status', 'active')
    .not('embedding', 'is', null)
    .is('image_style_tags.id', null)
    .order('created_at', { ascending: false })
    .limit(limit ?? 10000);

  if (queryError) {
    console.error('Error querying orphaned images:', queryError);
    process.exit(1);
  }

  if (!orphanedImages || orphanedImages.length === 0) {
    console.log('No orphaned images found. All images with embeddings have style tags.');
    return;
  }

  console.log(`Found ${orphanedImages.length} images with embeddings but no style tags`);
  console.log('');

  let processed = 0;
  let tagged = 0;
  let noTags = 0;
  const styleCounts: Record<string, number> = {};
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < orphanedImages.length; i += batchSize) {
    const batch = orphanedImages.slice(i, i + batchSize);
    const tagsToInsert: { image_id: string; style_name: string; confidence: number }[] = [];

    for (const img of batch) {
      // Parse embedding if string
      const embedding =
        typeof img.embedding === 'string' ? JSON.parse(img.embedding) : img.embedding;

      if (!embedding || embedding.length !== 768) {
        console.warn(`[SKIP] Invalid embedding for ${img.instagram_post_id}`);
        continue;
      }

      const predictions = predictStyles(embedding);

      if (predictions.length > 0) {
        tagged++;
        for (const { style, confidence } of predictions) {
          tagsToInsert.push({
            image_id: img.id,
            style_name: style,
            confidence,
          });
          styleCounts[style] = (styleCounts[style] || 0) + 1;
        }
      } else {
        noTags++;
      }

      processed++;
    }

    // Insert tags
    if (tagsToInsert.length > 0 && !dryRun) {
      const { error: insertError } = await supabase
        .from('image_style_tags')
        .upsert(tagsToInsert, { onConflict: 'image_id,style_name' });

      if (insertError) {
        console.error('Error inserting tags:', insertError);
      }
    }

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    console.log(
      `Processed ${processed}/${orphanedImages.length} (${rate.toFixed(1)}/s) - ${tagsToInsert.length} tags ${dryRun ? 'would be' : ''} inserted`
    );
  }

  // Summary
  const elapsed = (Date.now() - startTime) / 1000;

  console.log('');
  console.log('Summary');
  console.log('=======');
  console.log(`Total processed: ${processed}`);
  console.log(`Images tagged: ${tagged}`);
  console.log(`Images with no matching styles: ${noTags}`);
  console.log(`Time: ${elapsed.toFixed(1)}s`);
  console.log('');
  console.log('Style distribution:');

  const sortedStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]);
  for (const [style, count] of sortedStyles) {
    const pct = ((count / tagged) * 100).toFixed(1);
    console.log(`  ${style}: ${count} (${pct}%)`);
  }

  if (dryRun) {
    console.log('');
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  }
}

main().catch(console.error);
