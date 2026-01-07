#!/usr/bin/env npx tsx
/**
 * Image Style Tagging Script - Multi-Axis Taxonomy
 *
 * Tags all portfolio images with style labels using a multi-axis taxonomy:
 *   - Technique: HOW the tattoo is done (ONE per image, threshold 0.35)
 *   - Theme: WHAT the tattoo depicts (0-2 per image, threshold 0.45)
 *
 * This reduces false positives (e.g., horror matching normal B&G portraits)
 * by separating artistic technique from subject matter.
 *
 * Usage:
 *   npx tsx scripts/styles/tag-images.ts
 *   npx tsx scripts/styles/tag-images.ts --dry-run
 *   npx tsx scripts/styles/tag-images.ts --limit 100
 *   npx tsx scripts/styles/tag-images.ts --clear
 *
 * Options:
 *   --dry-run            Don't insert, just show what would be tagged
 *   --limit N            Process only first N images (for testing)
 *   --technique-threshold  Min similarity for techniques (default: 0.35)
 *   --theme-threshold      Min similarity for themes (default: 0.45)
 *   --clear              Clear existing tags before running
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

type StyleTaxonomy = 'technique' | 'theme';

// Per-style threshold overrides (when different from default)
// These styles need higher thresholds to avoid over-matching
const STYLE_THRESHOLD_OVERRIDES: Record<string, number> = {
  'japanese': 0.75,  // Traditional irezumi is distinct - needs high threshold
  'anime': 0.70,     // Anime characters are distinctive - avoid over-matching
};

interface StyleSeed {
  style_name: string;
  embedding: number[];
  taxonomy: StyleTaxonomy;
}

interface PortfolioImage {
  id: string;
  embedding: number[];
}

interface StyleTag {
  image_id: string;
  style_name: string;
  confidence: number;
  taxonomy: StyleTaxonomy;
  is_primary: boolean;
}

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit: number | null = null;
  let techniqueThreshold = 0.35;
  let themeThreshold = 0.45;  // Higher threshold to reduce false positives
  let clear = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--technique-threshold' && args[i + 1]) {
      techniqueThreshold = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--theme-threshold' && args[i + 1]) {
      themeThreshold = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--clear') {
      clear = true;
    }
  }

  return { dryRun, limit, techniqueThreshold, themeThreshold, clear };
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
  const { dryRun, limit, techniqueThreshold, themeThreshold, clear } = parseArgs();

  console.log('Image Style Tagging Script - Multi-Axis Taxonomy');
  console.log('=================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Technique threshold: ${techniqueThreshold} (ONE per image)`);
  console.log(`Theme threshold: ${themeThreshold} (0-2 per image)`);
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

  // Fetch all style seeds with taxonomy
  console.log('Fetching style seeds...');
  const { data: styleSeeds, error: seedError } = await supabase
    .from('style_seeds')
    .select('style_name, embedding, taxonomy');

  if (seedError || !styleSeeds) {
    console.error('Failed to fetch style seeds:', seedError?.message);
    process.exit(1);
  }

  // Parse seed embeddings and split by taxonomy
  const allStyles: StyleSeed[] = styleSeeds
    .map((s) => ({
      style_name: s.style_name,
      embedding: parseEmbedding(s.embedding),
      taxonomy: (s.taxonomy || 'technique') as StyleTaxonomy,
    }))
    .filter((s): s is StyleSeed => s.embedding !== null);

  const techniques = allStyles.filter((s) => s.taxonomy === 'technique');
  const themes = allStyles.filter((s) => s.taxonomy === 'theme');

  console.log(`Found ${allStyles.length} style seeds:`);
  console.log(`  Techniques (${techniques.length}): ${techniques.map((s) => s.style_name).join(', ')}`);
  console.log(`  Themes (${themes.length}): ${themes.map((s) => s.style_name).join(', ')}\n`);

  if (techniques.length === 0) {
    console.error('No technique seeds found. Upload seed images first.');
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

  // Process images and compute style tags using multi-axis taxonomy
  console.log('Computing style similarities (multi-axis)...');
  const allTags: StyleTag[] = [];
  let processed = 0;
  let techniqueCount = 0;
  let themeCount = 0;
  const startTime = Date.now();

  for (const image of images) {
    const embedding = parseEmbedding(image.embedding);
    if (!embedding) continue;

    // Step 1: Find ONE best technique (exclusive)
    let bestTechnique: { style_name: string; confidence: number } | null = null;
    for (const technique of techniques) {
      const similarity = cosineSimilarity(embedding, technique.embedding);
      if (similarity >= techniqueThreshold) {
        if (!bestTechnique || similarity > bestTechnique.confidence) {
          bestTechnique = { style_name: technique.style_name, confidence: similarity };
        }
      }
    }

    if (bestTechnique) {
      allTags.push({
        image_id: image.id,
        style_name: bestTechnique.style_name,
        confidence: bestTechnique.confidence,
        taxonomy: 'technique',
        is_primary: true,
      });
      techniqueCount++;
    }

    // Step 2: Find top 2 themes (higher threshold to reduce false positives)
    const themeMatches: { style_name: string; confidence: number }[] = [];
    for (const theme of themes) {
      const similarity = cosineSimilarity(embedding, theme.embedding);
      // Use per-style threshold override if defined, otherwise default
      const threshold = STYLE_THRESHOLD_OVERRIDES[theme.style_name] ?? themeThreshold;
      if (similarity >= threshold) {
        themeMatches.push({ style_name: theme.style_name, confidence: similarity });
      }
    }

    // Sort and take top 2 themes
    themeMatches.sort((a, b) => b.confidence - a.confidence);
    const topThemes = themeMatches.slice(0, 2);

    for (const themeMatch of topThemes) {
      allTags.push({
        image_id: image.id,
        style_name: themeMatch.style_name,
        confidence: themeMatch.confidence,
        taxonomy: 'theme',
        is_primary: false,
      });
      themeCount++;
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
  console.log(`Generated ${allTags.length} style tags:`);
  console.log(`  Techniques: ${techniqueCount} (${((techniqueCount / processed) * 100).toFixed(1)}% of images)`);
  console.log(`  Themes: ${themeCount} (avg ${(themeCount / processed).toFixed(2)} per image)\n`);

  // Show sample tags
  console.log('Sample tags (first 10):');
  for (const tag of allTags.slice(0, 10)) {
    const taxLabel = tag.taxonomy === 'technique' ? '[T]' : '[S]';  // T=technique, S=subject/theme
    const primaryLabel = tag.is_primary ? '*' : '';
    console.log(`  ${tag.image_id.slice(0, 8)}... → ${taxLabel}${primaryLabel} ${tag.style_name} (${(tag.confidence * 100).toFixed(1)}%)`);
  }
  console.log('');

  // Show distribution by taxonomy
  const techniqueCounts: Record<string, number> = {};
  const themeCounts: Record<string, number> = {};
  for (const tag of allTags) {
    if (tag.taxonomy === 'technique') {
      techniqueCounts[tag.style_name] = (techniqueCounts[tag.style_name] || 0) + 1;
    } else {
      themeCounts[tag.style_name] = (themeCounts[tag.style_name] || 0) + 1;
    }
  }

  console.log('TECHNIQUES (one per image):');
  Object.entries(techniqueCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([style, count]) => {
      console.log(`  ${style}: ${count} (${((count / processed) * 100).toFixed(1)}% of images)`);
    });
  console.log('');

  console.log('THEMES (0-2 per image):');
  Object.entries(themeCounts)
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
