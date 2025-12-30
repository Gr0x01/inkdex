#!/usr/bin/env tsx
/**
 * Generate CLIP embeddings for style seed images using Modal.com
 *
 * This script:
 * 1. Reads the uploaded seeds manifest
 * 2. Downloads images from Supabase Storage
 * 3. Generates CLIP embeddings via Modal.com
 * 4. Saves embeddings to JSON for database insertion
 *
 * Usage: npx tsx scripts/style-seeds/generate-seed-embeddings.ts
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface UploadedSeed {
  styleName: string;
  displayName: string;
  description: string;
  seedNumber: number;
  originalUrl: string;
  storagePath: string;
}

interface SeedWithEmbedding extends UploadedSeed {
  embedding: number[];
}

/**
 * Download image from Supabase Storage
 */
async function downloadFromStorage(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from('portfolio-images')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download ${storagePath}: ${error?.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * Generate CLIP embedding using Modal.com
 * Note: This requires the Modal.com Python function to be deployed
 */
async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
  // For now, this is a placeholder
  // You'll need to either:
  // 1. Call the Modal.com API endpoint directly
  // 2. Use the Python script via child_process
  // 3. Manually run the Python script and merge results

  // Placeholder: Return empty array (will be filled by Python script)
  return [];
}

/**
 * Main processing function
 */
async function main() {
  console.log('🧠 Generating CLIP Embeddings for Style Seeds');
  console.log('='.repeat(50));

  // Read uploaded seeds manifest
  const manifestPath = path.join(
    process.cwd(),
    'scripts',
    'style-seeds',
    'uploaded-seeds.json'
  );

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifest not found. Run download-and-upload-seeds.ts first.');
    process.exit(1);
  }

  const uploadedSeeds: UploadedSeed[] = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8')
  );

  console.log(`📊 Found ${uploadedSeeds.length} seed images`);
  console.log('\n⚠️  Note: This script prepares the data structure.');
  console.log('    Use Modal.com Python script to generate actual embeddings.\n');

  // Create temp directory for images
  const tempDir = path.join(process.cwd(), 'tmp', 'seed-embeddings');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Download all images to temp directory for Python script
  console.log('⬇️  Downloading images for embedding generation...\n');

  for (let i = 0; i < uploadedSeeds.length; i++) {
    const seed = uploadedSeeds[i];
    const filename = `${seed.styleName}-${seed.seedNumber}.jpg`;
    const localPath = path.join(tempDir, filename);

    try {
      console.log(
        `   [${i + 1}/${uploadedSeeds.length}] Downloading: ${seed.storagePath}`
      );
      const imageBuffer = await downloadFromStorage(seed.storagePath);
      fs.writeFileSync(localPath, imageBuffer);
    } catch (error) {
      console.error(
        `   ❌ Error downloading ${seed.storagePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Save metadata for Python script
  const metadataPath = path.join(tempDir, 'seeds-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(uploadedSeeds, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('✅ Images downloaded to:', tempDir);
  console.log('📝 Metadata saved to:', metadataPath);
  console.log('\n📋 Next steps:');
  console.log('1. Run Modal.com script to generate embeddings:');
  console.log(
    '   python3 scripts/style-seeds/generate-seed-embeddings.py'
  );
  console.log('2. Populate database:');
  console.log('   npx tsx scripts/style-seeds/populate-style-seeds.ts');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
