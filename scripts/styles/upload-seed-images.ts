#!/usr/bin/env npx tsx
/**
 * Style Seed Image Upload Script
 *
 * Uploads style seed images to Supabase Storage, generates CLIP embeddings,
 * and inserts/updates the style_seeds table.
 *
 * Usage:
 *   npx tsx scripts/styles/upload-seed-images.ts --dir ./seed-images
 *   npx tsx scripts/styles/upload-seed-images.ts --dir ./seed-images --dry-run
 *
 * Image Naming Convention:
 *   {style-slug}.jpg (e.g., traditional.jpg, fine-line.jpg, neo-traditional.jpg)
 *
 * Requirements:
 *   - Local CLIP server running (https://clip.inkdex.io)
 *   - Supabase credentials in .env.local
 *   - Images in specified directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_CLIP_URL = process.env.LOCAL_CLIP_URL || 'https://clip.inkdex.io';
const CLIP_API_KEY = process.env.CLIP_API_KEY;

// Style taxonomy with display names and descriptions
const STYLE_TAXONOMY: Record<string, { displayName: string; description: string }> = {
  'traditional': {
    displayName: 'Traditional',
    description: 'Bold outlines, limited color palette, iconic American imagery like eagles, anchors, and roses.',
  },
  'neo-traditional': {
    displayName: 'Neo-Traditional',
    description: 'Evolution of traditional with expanded colors, more detail, and diverse subjects.',
  },
  'fine-line': {
    displayName: 'Fine Line',
    description: 'Delicate, thin lines with minimal shading. Often single-needle work.',
  },
  'blackwork': {
    displayName: 'Blackwork',
    description: 'Pure black ink designs from geometric patterns to heavy coverage.',
  },
  'geometric': {
    displayName: 'Geometric',
    description: 'Mathematical precision with shapes, patterns, and sacred geometry.',
  },
  'realism': {
    displayName: 'Realism',
    description: 'Photorealistic imagery in black & grey or color. Portraits and detailed scenes.',
  },
  'japanese': {
    displayName: 'Japanese',
    description: 'Traditional Irezumi: koi, dragons, cherry blossoms, waves, and wind bars.',
  },
  'watercolor': {
    displayName: 'Watercolor',
    description: 'Mimics watercolor painting with splashes, drips, and color bleeds.',
  },
  'dotwork': {
    displayName: 'Dotwork',
    description: 'Images created entirely from dots. Often geometric or mandala-based.',
  },
  'tribal': {
    displayName: 'Tribal',
    description: 'Bold black patterns inspired by Polynesian, Maori, or indigenous traditions.',
  },
  'illustrative': {
    displayName: 'Illustrative',
    description: 'Storybook or comic-style artwork with artistic interpretation.',
  },
  'surrealism': {
    displayName: 'Surrealism',
    description: 'Dreamlike, impossible imagery. Melting forms and optical illusions.',
  },
  'minimalist': {
    displayName: 'Minimalist',
    description: 'Simple, understated designs with clean lines and minimal elements.',
  },
  'lettering': {
    displayName: 'Lettering/Script',
    description: 'Typography-focused work from elegant scripts to graffiti-inspired.',
  },
  'new-school': {
    displayName: 'New School',
    description: 'Cartoonish, exaggerated style with bright colors and playful subjects.',
  },
  'trash-polka': {
    displayName: 'Trash Polka',
    description: 'Chaotic collage mixing realism, typography, and abstract. Red and black.',
  },
  'chicano': {
    displayName: 'Chicano',
    description: 'Religious imagery, lowriders, portraits. Primarily black and grey.',
  },
  'biomechanical': {
    displayName: 'Biomechanical',
    description: 'Fusion of organic and mechanical. Machinery beneath skin aesthetic.',
  },
  'ornamental': {
    displayName: 'Ornamental',
    description: 'Decorative patterns inspired by jewelry, lace, or architectural elements.',
  },
  'sketch': {
    displayName: 'Sketch/Line Art',
    description: 'Intentionally unfinished with visible sketch lines and raw aesthetic.',
  },
};

interface ParsedArgs {
  dir: string;
  dryRun: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let dir = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!dir) {
    console.error('Usage: npx tsx scripts/styles/upload-seed-images.ts --dir ./path/to/images [--dry-run]');
    console.error('\nExpected image naming: {style-slug}.jpg');
    console.error('Example: traditional.jpg, fine-line.jpg, neo-traditional.jpg');
    console.error('\nAvailable styles:');
    Object.keys(STYLE_TAXONOMY).forEach((slug) => {
      console.error(`  ${slug}.jpg -> ${STYLE_TAXONOMY[slug].displayName}`);
    });
    process.exit(1);
  }

  return { dir, dryRun };
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    default: return 'image/jpeg';
  }
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
      console.error(`CLIP API error: ${response.status} - ${text}`);
      return null;
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`Failed to generate embedding for ${imagePath}:`, error);
    return null;
  }
}

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  imagePath: string,
  styleSlug: string
): Promise<string | null> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = getMimeType(imagePath);
    const storagePath = `style-seeds/${styleSlug}${ext}`;

    // Check if file exists and delete it first (upsert)
    await supabase.storage.from('portfolio-images').remove([storagePath]);

    const { error } = await supabase.storage
      .from('portfolio-images')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: true,
      });

    if (error) {
      console.error(`Storage upload error for ${styleSlug}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('portfolio-images')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Failed to upload ${styleSlug}:`, error);
    return null;
  }
}

async function main() {
  const { dir, dryRun } = parseArgs();

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Check directory exists
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  // Find image files
  const files = fs.readdirSync(dir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });

  if (files.length === 0) {
    console.error(`No image files found in ${dir}`);
    process.exit(1);
  }

  console.log(`\nFound ${files.length} image(s) in ${dir}`);
  console.log(dryRun ? '(DRY RUN - no changes will be made)\n' : '\n');

  // Initialize Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Process each image
  const results: { success: string[]; skipped: string[]; failed: string[] } = {
    success: [],
    skipped: [],
    failed: [],
  };

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const styleSlug = path.basename(file, ext).toLowerCase();
    const imagePath = path.join(dir, file);

    // Check if style is in taxonomy
    const styleInfo = STYLE_TAXONOMY[styleSlug];
    if (!styleInfo) {
      console.log(`  SKIP: ${file} (unknown style "${styleSlug}")`);
      results.skipped.push(file);
      continue;
    }

    console.log(`Processing: ${file} -> ${styleInfo.displayName}`);

    if (dryRun) {
      console.log(`  Would upload to: style-seeds/${styleSlug}${ext}`);
      console.log(`  Would generate embedding (768 dimensions)`);
      console.log(`  Would upsert to style_seeds table\n`);
      results.success.push(file);
      continue;
    }

    // Generate embedding
    console.log('  Generating CLIP embedding...');
    const embedding = await generateEmbedding(imagePath);
    if (!embedding) {
      console.log('  FAILED: Could not generate embedding\n');
      results.failed.push(file);
      continue;
    }
    console.log(`  Embedding generated (${embedding.length} dimensions)`);

    // Upload to storage
    console.log('  Uploading to Supabase Storage...');
    const imageUrl = await uploadToStorage(supabase, imagePath, styleSlug);
    if (!imageUrl) {
      console.log('  FAILED: Could not upload to storage\n');
      results.failed.push(file);
      continue;
    }
    console.log(`  Uploaded: ${imageUrl}`);

    // Upsert to style_seeds table
    console.log('  Upserting to style_seeds table...');
    const { error: upsertError } = await supabase
      .from('style_seeds')
      .upsert(
        {
          style_name: styleSlug,
          display_name: styleInfo.displayName,
          description: styleInfo.description,
          seed_image_url: imageUrl,
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'style_name' }
      );

    if (upsertError) {
      console.log(`  FAILED: ${upsertError.message}\n`);
      results.failed.push(file);
      continue;
    }

    console.log('  SUCCESS\n');
    results.success.push(file);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Success: ${results.success.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Failed:  ${results.failed.length}`);

  if (results.skipped.length > 0) {
    console.log('\nSkipped files (unknown styles):');
    results.skipped.forEach((f) => console.log(`  - ${f}`));
  }

  if (results.failed.length > 0) {
    console.log('\nFailed files:');
    results.failed.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }

  console.log('\nDone!');
}

main().catch(console.error);
