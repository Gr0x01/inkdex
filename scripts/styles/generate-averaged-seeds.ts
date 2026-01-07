#!/usr/bin/env npx tsx
/**
 * Generate Averaged Style Seed Embeddings
 *
 * Takes multiple seed images per style and creates a single averaged "centroid"
 * embedding that better represents the style's visual diversity.
 *
 * Supports multi-axis taxonomy:
 *   - technique: HOW the tattoo is done (ONE per image, threshold 0.35)
 *   - theme: WHAT the tattoo depicts (0-2 per image, threshold 0.45)
 *
 * Usage:
 *   npx tsx scripts/styles/generate-averaged-seeds.ts --dir ./tmp/seeds
 *   npx tsx scripts/styles/generate-averaged-seeds.ts --dir ./tmp/seeds --taxonomy theme
 *   npx tsx scripts/styles/generate-averaged-seeds.ts --dir ./tmp/seeds --dry-run
 *
 * Expected file naming: {style-slug}-{number}.{ext}
 * Example: traditional-1.jpg, horror-2.jpg, anime-1.png
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LOCAL_CLIP_URL = process.env.LOCAL_CLIP_URL || 'https://clip.inkdex.io';
const CLIP_API_KEY = process.env.CLIP_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Taxonomy types
type StyleTaxonomy = 'technique' | 'theme';

// Style display names, descriptions, and taxonomy classification
interface StyleInfo {
  displayName: string;
  description: string;
  taxonomy: StyleTaxonomy;
}

const STYLE_INFO: Record<string, StyleInfo> = {
  // ============================================
  // TECHNIQUES - HOW the tattoo is done
  // ONE per image, threshold 0.35
  // ============================================
  'traditional': {
    displayName: 'Traditional',
    description: 'Bold lines, bright colors, and iconic designs like roses, anchors, and gorgeous lady heads. Classic American tattoo style.',
    taxonomy: 'technique',
  },
  'neo-traditional': {
    displayName: 'Neo Traditional',
    description: 'Evolution of traditional with pronounced linework and extremely vibrant colors plus illustrative qualities.',
    taxonomy: 'technique',
  },
  'new-school': {
    displayName: 'New School',
    description: 'Cartoonish and wacky, featuring caricatures and exaggerated figures. Vibrant colors and playful subjects.',
    taxonomy: 'technique',
  },
  'realism': {
    displayName: 'Realism',
    description: 'Photo-realistic imagery in black & grey or color. Portraits and detailed scenes.',
    taxonomy: 'technique',
  },
  'blackwork': {
    displayName: 'Blackwork',
    description: 'Pure black ink designs from geometric patterns to heavy coverage.',
    taxonomy: 'technique',
  },
  'watercolor': {
    displayName: 'Watercolor',
    description: 'Mimics watercolor painting with splashes, drips, and soft color bleeds.',
    taxonomy: 'technique',
  },
  'tribal': {
    displayName: 'Tribal',
    description: 'Bold black patterns inspired by Polynesian, Maori, or indigenous traditions.',
    taxonomy: 'technique',
  },
  'biomechanical': {
    displayName: 'Biomechanical',
    description: 'Fusion of organic and mechanical. Machinery beneath skin aesthetic.',
    taxonomy: 'technique',
  },
  'trash-polka': {
    displayName: 'Trash Polka',
    description: 'Chaotic collage mixing realism, typography, and abstract. Red and black.',
    taxonomy: 'technique',
  },
  'ornamental': {
    displayName: 'Ornamental',
    description: 'Decorative patterns inspired by jewelry, lace, or architectural elements.',
    taxonomy: 'technique',
  },
  'sketch': {
    displayName: 'Sketch/Line Art',
    description: 'Intentionally unfinished with visible sketch lines and raw aesthetic.',
    taxonomy: 'technique',
  },
  'dotwork': {
    displayName: 'Dotwork',
    description: 'Images created entirely from dots. Often geometric or mandala-based.',
    taxonomy: 'technique',
  },
  'geometric': {
    displayName: 'Geometric',
    description: 'Mathematical precision with shapes, patterns, and sacred geometry.',
    taxonomy: 'technique',
  },
  'fine-line': {
    displayName: 'Fine Line',
    description: 'Delicate, thin lines with minimal shading. Often single-needle work.',
    taxonomy: 'technique',
  },

  // ============================================
  // THEMES - WHAT the tattoo depicts
  // 0-2 per image, threshold 0.45 (tighter to reduce false positives)
  // ============================================
  'horror': {
    displayName: 'Horror',
    description: 'Dark and macabre imagery featuring horror movie icons, skulls, demons, and nightmarish scenes.',
    taxonomy: 'theme',
  },
  'japanese': {
    displayName: 'Japanese',
    description: 'Traditional Irezumi subjects: koi, dragons, cherry blossoms, waves, oni masks, samurai.',
    taxonomy: 'theme',
  },
  'anime': {
    displayName: 'Anime',
    description: 'Japanese animation style featuring characters from anime and manga. Expressive eyes and dynamic compositions.',
    taxonomy: 'theme',
  },
  'portrait': {
    displayName: 'Portrait',
    description: 'Human faces and expressions, from realistic portraits to stylized faces.',
    taxonomy: 'theme',
  },
  'floral': {
    displayName: 'Floral',
    description: 'Flowers, botanicals, roses, and nature-inspired plant designs.',
    taxonomy: 'theme',
  },
  'animal': {
    displayName: 'Animal',
    description: 'Creatures, wildlife, pets, insects, and animal imagery.',
    taxonomy: 'theme',
  },
  'lettering': {
    displayName: 'Lettering',
    description: 'Typography-focused work from elegant scripts to graffiti-inspired text.',
    taxonomy: 'theme',
  },
  'abstract': {
    displayName: 'Abstract',
    description: 'Non-representational, conceptual, and surreal imagery.',
    taxonomy: 'theme',
  },
  'spiritual': {
    displayName: 'Spiritual',
    description: 'Religious symbols, memorial pieces, cultural heritage, and spiritual imagery.',
    taxonomy: 'theme',
  },
};

interface ParsedArgs {
  dir: string;
  dryRun: boolean;
  taxonomy: StyleTaxonomy | null;  // null = use STYLE_INFO taxonomy, or override
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let dir = '';
  let dryRun = false;
  let taxonomy: StyleTaxonomy | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--taxonomy' && args[i + 1]) {
      const val = args[i + 1].toLowerCase();
      if (val === 'technique' || val === 'theme') {
        taxonomy = val;
      } else {
        console.error(`Invalid taxonomy: ${val}. Must be 'technique' or 'theme'.`);
        process.exit(1);
      }
      i++;
    }
  }

  if (!dir) {
    console.error('Usage: npx tsx scripts/styles/generate-averaged-seeds.ts --dir ./path/to/seeds [--taxonomy technique|theme] [--dry-run]');
    console.error('\nExpected file naming: {style-slug}-{number}.{ext}');
    console.error('Example: traditional-1.jpg, horror-2.png');
    console.error('\nOptions:');
    console.error('  --taxonomy  Force all seeds to be technique or theme (overrides STYLE_INFO)');
    process.exit(1);
  }

  return { dir, dryRun, taxonomy };
}

async function generateEmbedding(imagePath: string): Promise<number[] | null> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await fetch(`${LOCAL_CLIP_URL}/generate_single_embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CLIP_API_KEY ? { 'Authorization': `Bearer ${CLIP_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        image_data: base64Image,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`  CLIP API error: ${response.status} - ${text.slice(0, 100)}`);
      return null;
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`  Failed to generate embedding:`, error);
    return null;
  }
}

function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  if (embeddings.length === 1) return embeddings[0];

  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += emb[i];
    }
  }

  // Average and normalize (L2 normalization for cosine similarity)
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    avg[i] /= embeddings.length;
    norm += avg[i] * avg[i];
  }
  norm = Math.sqrt(norm);

  for (let i = 0; i < dim; i++) {
    avg[i] /= norm;
  }

  return avg;
}

async function main() {
  const { dir, dryRun, taxonomy: taxonomyOverride } = parseArgs();

  console.log('Averaged Style Seed Embedding Generator');
  console.log('=======================================');
  console.log(`Directory: ${dir}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (taxonomyOverride) {
    console.log(`Taxonomy override: ${taxonomyOverride} (all seeds will be marked as ${taxonomyOverride})`);
  }
  console.log('');

  // Check directory exists
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  // Find all image files
  const allFiles = fs.readdirSync(dir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && !f.startsWith('.');
  });

  console.log(`Found ${allFiles.length} image files\n`);

  // Group files by style
  const styleFiles: Map<string, string[]> = new Map();

  for (const file of allFiles) {
    // Extract style name: "traditional-1.jpg" -> "traditional"
    // Handle both hyphen and underscore: "new-school-1.jpg" or "new_school-1.jpg"
    const baseName = path.basename(file, path.extname(file));

    // Match pattern: {style-name}-{number} where style-name can contain hyphens
    const match = baseName.match(/^(.+)-(\d+)$/);
    if (!match) {
      console.log(`  SKIP: ${file} (doesn't match {style}-{number} pattern)`);
      continue;
    }

    let styleName = match[1].toLowerCase();
    // Normalize underscores to hyphens
    styleName = styleName.replace(/_/g, '-');

    if (!styleFiles.has(styleName)) {
      styleFiles.set(styleName, []);
    }
    styleFiles.get(styleName)!.push(file);
  }

  console.log(`Found ${styleFiles.size} styles:\n`);
  for (const [style, files] of styleFiles) {
    console.log(`  ${style}: ${files.length} images`);
  }
  console.log('');

  // Process each style
  const results: { style: string; count: number; success: boolean }[] = [];

  for (const [styleName, files] of styleFiles) {
    console.log(`\nProcessing: ${styleName} (${files.length} images)`);

    const embeddings: number[][] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      console.log(`  Generating embedding for ${file}...`);

      if (dryRun) {
        console.log(`    (dry run - skipping)`);
        continue;
      }

      const embedding = await generateEmbedding(filePath);
      if (embedding) {
        embeddings.push(embedding);
        console.log(`    OK (${embedding.length} dimensions)`);
      } else {
        console.log(`    FAILED`);
      }
    }

    if (dryRun) {
      console.log(`  Would average ${files.length} embeddings and update database`);
      results.push({ style: styleName, count: files.length, success: true });
      continue;
    }

    if (embeddings.length === 0) {
      console.log(`  ERROR: No embeddings generated for ${styleName}`);
      results.push({ style: styleName, count: 0, success: false });
      continue;
    }

    // Average the embeddings
    console.log(`  Averaging ${embeddings.length} embeddings...`);
    const avgEmbedding = averageEmbeddings(embeddings);
    console.log(`  Averaged embedding: ${avgEmbedding.length} dimensions`);

    // Get style info
    const styleInfo = STYLE_INFO[styleName];
    if (!styleInfo) {
      console.log(`  WARNING: No display info for ${styleName}, using defaults`);
    }

    // Get the first image URL for reference (we'll keep this as the representative image)
    const firstFile = files[0];
    const ext = path.extname(firstFile).toLowerCase();

    // Upload first image to storage as the representative seed image
    console.log(`  Uploading ${firstFile} as representative image...`);
    const imageBuffer = fs.readFileSync(path.join(dir, firstFile));
    const storagePath = `style-seeds/${styleName}${ext}`;

    // Remove existing file first
    await supabase.storage.from('portfolio-images').remove([storagePath]);

    const { error: uploadError } = await supabase.storage
      .from('portfolio-images')
      .upload(storagePath, imageBuffer, {
        contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.log(`  Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('portfolio-images')
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;
    console.log(`  Image URL: ${imageUrl}`);

    // Determine taxonomy (override or from STYLE_INFO)
    const styleTaxonomy = taxonomyOverride || styleInfo?.taxonomy || 'technique';

    // Upsert to style_seeds table
    console.log(`  Updating style_seeds table (taxonomy: ${styleTaxonomy})...`);
    const { error: upsertError } = await supabase
      .from('style_seeds')
      .upsert(
        {
          style_name: styleName,
          display_name: styleInfo?.displayName || styleName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: styleInfo?.description || `${styleName} style tattoos`,
          seed_image_url: imageUrl,
          embedding: `[${avgEmbedding.join(',')}]`,
          taxonomy: styleTaxonomy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'style_name' }
      );

    if (upsertError) {
      console.log(`  Database update failed: ${upsertError.message}`);
      results.push({ style: styleName, count: embeddings.length, success: false });
    } else {
      console.log(`  SUCCESS: ${styleName} updated with averaged embedding from ${embeddings.length} images`);
      results.push({ style: styleName, count: embeddings.length, success: true });
    }
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========\n');
  console.log(`Styles processed: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log('');

  for (const r of results) {
    const status = r.success ? '✓' : '✗';
    console.log(`  ${status} ${r.style}: ${r.count} images averaged`);
  }

  if (!dryRun) {
    console.log('\n\nNext steps:');
    console.log('1. Run: npx tsx scripts/styles/tag-images.ts --clear');
    console.log('2. Run: npx tsx scripts/styles/compute-artist-profiles.ts --clear');
    console.log('3. Verify with: npx tsx scripts/debug/check-artist-styles.ts monna-lissa');
  }
}

main().catch(console.error);
