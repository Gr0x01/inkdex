#!/usr/bin/env npx tsx
/**
 * Tag Images with ML Classifier
 *
 * Uses trained logistic regression classifier on CLIP embeddings.
 * Replaces the zero-shot CLIP seed comparison approach.
 *
 * Usage:
 *   npx tsx scripts/styles/tag-images-ml.ts
 *   npx tsx scripts/styles/tag-images-ml.ts --clear    # Clear existing tags first
 *   npx tsx scripts/styles/tag-images-ml.ts --limit 100
 *   npx tsx scripts/styles/tag-images-ml.ts --threshold 0.5
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { STYLE_THRESHOLDS } from '../../lib/styles/thresholds';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load classifier
const classifierPath = path.join(process.cwd(), 'models', 'style-classifier.json');
const classifier = JSON.parse(fs.readFileSync(classifierPath, 'utf-8'));

const STYLES: string[] = classifier.styles;

interface ParsedArgs {
  clear: boolean;
  limit: number | null;
  threshold: number;
  concurrency: number;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let clear = false;
  let limit: number | null = null;
  let threshold = 0.5;
  let concurrency = 100;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--clear') {
      clear = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--threshold' && args[i + 1]) {
      threshold = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { clear, limit, threshold, concurrency };
}

// Sigmoid function
function sigmoid(x: number): number {
  if (x < -500) return 0;
  if (x > 500) return 1;
  return 1 / (1 + Math.exp(-x));
}

// Predict styles for an embedding, returns array of {style, confidence}
function predictStyles(embedding: number[], defaultThreshold: number): Array<{ style: string; confidence: number }> {
  const predictions: Array<{ style: string; confidence: number }> = [];

  for (let i = 0; i < STYLES.length; i++) {
    const style = STYLES[i];
    const classifierData = classifier.classifiers[style];

    if (!classifierData || !classifierData.coef) continue;

    const { coef, intercept } = classifierData;

    // Compute logit: w·x + b
    let logit = intercept;
    for (let j = 0; j < embedding.length; j++) {
      logit += coef[j] * embedding[j];
    }

    const prob = sigmoid(logit);

    // Use per-style threshold if defined, otherwise use default
    const threshold = STYLE_THRESHOLDS[style] ?? defaultThreshold;

    if (prob >= threshold) {
      predictions.push({ style, confidence: prob });
    }
  }

  return predictions;
}

async function main() {
  const { clear, limit, threshold, concurrency } = parseArgs();

  console.log('ML Style Tagging');
  console.log('================');
  console.log(`Default threshold: ${threshold}`);
  console.log(`Per-style overrides: ${JSON.stringify(STYLE_THRESHOLDS)}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  // Clear existing tags if requested
  if (clear) {
    console.log('Clearing existing tags...');
    const { error } = await supabase.from('image_style_tags').delete().neq('image_id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error('Error clearing tags:', error);
      process.exit(1);
    }
    console.log('Cleared.');
    console.log('');
  }

  // Count total images
  const { count: totalCount } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('embedding', 'is', null);

  console.log(`Total images with embeddings: ${totalCount}`);

  // Process in batches
  const batchSize = concurrency;
  let processed = 0;
  let tagged = 0;
  let noTags = 0;
  const styleCounts: Record<string, number> = {};
  const startTime = Date.now();
  let offset = 0;

  while (true) {
    const { data: images, error } = await supabase
      .from('portfolio_images')
      .select('id, embedding')
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching images:', error);
      break;
    }

    if (!images || images.length === 0) break;

    // Process batch
    const tagsToInsert: { image_id: string; style_name: string; confidence: number }[] = [];

    for (const img of images) {
      // Parse embedding if string
      const embedding = typeof img.embedding === 'string'
        ? JSON.parse(img.embedding)
        : img.embedding;

      const predictions = predictStyles(embedding, threshold);

      if (predictions.length > 0) {
        tagged++;
        for (const { style, confidence } of predictions) {
          tagsToInsert.push({
            image_id: img.id,
            style_name: style,
            confidence, // Store actual sigmoid probability
          });
          styleCounts[style] = (styleCounts[style] || 0) + 1;
        }
      } else {
        noTags++;
      }

      processed++;
    }

    // Insert tags
    if (tagsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('image_style_tags')
        .upsert(tagsToInsert, { onConflict: 'image_id,style_name' });

      if (insertError) {
        console.error('Error inserting tags:', insertError);
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const total = limit ? Math.min(limit, totalCount || 0) : totalCount || 0;
    const eta = (total - processed) / rate;

    process.stdout.write(
      `\rProcessed ${processed}/${total} ` +
      `(${tagged} tagged, ${noTags} no tags) ` +
      `[${rate.toFixed(0)}/s, ETA: ${Math.round(eta)}s]`
    );

    offset += batchSize;

    if (limit && processed >= limit) break;
  }

  console.log('\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Tagged: ${tagged} (${((tagged / processed) * 100).toFixed(1)}%)`);
  console.log(`No tags: ${noTags} (${((noTags / processed) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('Style distribution:');
  const sortedStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]);
  for (const [style, count] of sortedStyles) {
    const pct = ((count / processed) * 100).toFixed(1);
    console.log(`  ${style}: ${count} (${pct}%)`);
  }
}

main().catch(console.error);
