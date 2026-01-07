#!/usr/bin/env npx tsx
/**
 * Image Style Tagging Script
 *
 * Tags all portfolio images with style labels based on CLIP embedding similarity.
 * Pure vector math on existing embeddings - no GPU required.
 *
 * Usage:
 *   npx tsx scripts/styles/tag-images.ts
 *   npx tsx scripts/styles/tag-images.ts --dry-run
 *   npx tsx scripts/styles/tag-images.ts --limit 100
 *   npx tsx scripts/styles/tag-images.ts --min-confidence 0.3
 *   npx tsx scripts/styles/tag-images.ts --top-n 3
 *
 * Options:
 *   --dry-run         Don't insert, just show what would be tagged
 *   --limit N         Process only first N images (for testing)
 *   --min-confidence  Minimum similarity to tag (default: 0.35)
 *   --top-n           Max styles per image (default: 3)
 *   --clear           Clear existing tags before running
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

interface StyleSeed {
  style_name: string;
  embedding: number[];
}

interface PortfolioImage {
  id: string;
  embedding: number[];
}

interface StyleTag {
  image_id: string;
  style_name: string;
  confidence: number;
}

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit: number | null = null;
  let minConfidence = 0.35;
  let topN = 3;
  let clear = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-confidence' && args[i + 1]) {
      minConfidence = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--top-n' && args[i + 1]) {
      topN = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--clear') {
      clear = true;
    }
  }

  return { dryRun, limit, minConfidence, topN, clear };
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

// Parse embedding from Postgres vector format
function parseEmbedding(raw: unknown): number[] | null {
  if (!raw) return null;

  // If already an array, return it
  if (Array.isArray(raw)) {
    return raw;
  }

  // If string format "[0.1,0.2,...]", parse it
  if (typeof raw === 'string') {
    try {
      const cleaned = raw.replace(/^\[|\]$/g, '');
      return cleaned.split(',').map((n) => parseFloat(n.trim()));
    } catch {
      return null;
    }
  }

  return null;
}

async function main() {
  const { dryRun, limit, minConfidence, topN, clear } = parseArgs();

  console.log('Image Style Tagging Script');
  console.log('==========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Min confidence: ${minConfidence}`);
  console.log(`Top N styles per image: ${topN}`);
  if (limit) console.log(`Limit: ${limit} images`);
  console.log('');

  // Clear existing tags if requested
  if (clear && !dryRun) {
    console.log('Clearing existing tags...');
    const { error: clearError } = await supabase
      .from('image_style_tags')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (clearError) {
      console.error('Failed to clear tags:', clearError.message);
      process.exit(1);
    }
    console.log('Cleared.\n');
  }

  // Fetch all style seeds
  console.log('Fetching style seeds...');
  const { data: styleSeeds, error: seedError } = await supabase
    .from('style_seeds')
    .select('style_name, embedding');

  if (seedError || !styleSeeds) {
    console.error('Failed to fetch style seeds:', seedError?.message);
    process.exit(1);
  }

  // Parse seed embeddings
  const styles: StyleSeed[] = styleSeeds
    .map((s) => ({
      style_name: s.style_name,
      embedding: parseEmbedding(s.embedding),
    }))
    .filter((s): s is StyleSeed => s.embedding !== null);

  console.log(`Found ${styles.length} style seeds: ${styles.map((s) => s.style_name).join(', ')}\n`);

  if (styles.length === 0) {
    console.error('No style seeds found. Upload seed images first.');
    process.exit(1);
  }

  // Fetch portfolio images with embeddings (paginated to handle large datasets)
  console.log('Fetching portfolio images with embeddings...');
  const PAGE_SIZE = 5000;
  let allImages: { id: string; embedding: unknown }[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('portfolio_images')
      .select('id, embedding')
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    const { data: images, error: imageError } = await query;

    if (imageError) {
      console.error('Failed to fetch images:', imageError?.message);
      process.exit(1);
    }

    if (!images || images.length === 0) {
      hasMore = false;
    } else {
      allImages = allImages.concat(images);
      console.log(`  Fetched ${allImages.length} images...`);
      offset += PAGE_SIZE;

      if (limit && allImages.length >= limit) {
        allImages = allImages.slice(0, limit);
        hasMore = false;
      }

      if (images.length < PAGE_SIZE) {
        hasMore = false;
      }
    }
  }

  const images = allImages;
  console.log(`Found ${images.length} images with embeddings\n`);

  // Process images and compute style tags
  console.log('Computing style similarities...');
  const allTags: StyleTag[] = [];
  let processed = 0;
  const startTime = Date.now();

  for (const image of images) {
    const embedding = parseEmbedding(image.embedding);
    if (!embedding) continue;

    // Compute similarity to each style
    const similarities: { style_name: string; confidence: number }[] = [];

    for (const style of styles) {
      const similarity = cosineSimilarity(embedding, style.embedding);
      if (similarity >= minConfidence) {
        similarities.push({
          style_name: style.style_name,
          confidence: similarity,
        });
      }
    }

    // Sort by confidence and take top N
    similarities.sort((a, b) => b.confidence - a.confidence);
    const topStyles = similarities.slice(0, topN);

    for (const tag of topStyles) {
      allTags.push({
        image_id: image.id,
        style_name: tag.style_name,
        confidence: tag.confidence,
      });
    }

    processed++;
    if (processed % 1000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      console.log(`  Processed ${processed}/${images.length} (${rate.toFixed(0)} img/sec)`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\nProcessed ${processed} images in ${totalTime.toFixed(1)}s`);
  console.log(`Generated ${allTags.length} style tags (avg ${(allTags.length / processed).toFixed(1)} tags/image)\n`);

  // Show sample tags
  console.log('Sample tags (first 10):');
  for (const tag of allTags.slice(0, 10)) {
    console.log(`  ${tag.image_id.slice(0, 8)}... → ${tag.style_name} (${(tag.confidence * 100).toFixed(1)}%)`);
  }
  console.log('');

  // Show distribution by style
  const styleCounts: Record<string, number> = {};
  for (const tag of allTags) {
    styleCounts[tag.style_name] = (styleCounts[tag.style_name] || 0) + 1;
  }
  console.log('Tags per style:');
  Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([style, count]) => {
      console.log(`  ${style}: ${count} (${((count / processed) * 100).toFixed(1)}% of images)`);
    });
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - no tags inserted.');
    return;
  }

  // Insert tags in batches
  console.log('Inserting tags...');
  const BATCH_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < allTags.length; i += BATCH_SIZE) {
    const batch = allTags.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await supabase
      .from('image_style_tags')
      .upsert(batch, { onConflict: 'image_id,style_name' });

    if (insertError) {
      console.error(`Failed to insert batch ${i / BATCH_SIZE + 1}:`, insertError.message);
      // Continue with next batch
    } else {
      inserted += batch.length;
    }

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= allTags.length) {
      console.log(`  Inserted ${inserted}/${allTags.length} tags`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} style tags.`);
}

main().catch(console.error);
