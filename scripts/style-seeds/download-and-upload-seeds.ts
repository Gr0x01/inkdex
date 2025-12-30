#!/usr/bin/env tsx
/**
 * Download style seed images from Tattoodo and upload to Supabase Storage
 *
 * Process:
 * 1. Download images from Tattoodo URLs
 * 2. Upload to Supabase Storage (portfolio-images/style-seeds/)
 * 3. Track uploaded images for embedding generation
 *
 * Usage: npx tsx scripts/style-seeds/download-and-upload-seeds.ts
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import { styleSeedsData } from './style-seeds-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure .env.local is configured with Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEMP_DIR = path.join(process.cwd(), 'tmp', 'style-seeds');
const STORAGE_BUCKET = 'portfolio-images';
const STORAGE_PATH_PREFIX = 'style-seeds';

interface UploadedSeed {
  styleName: string;
  displayName: string;
  description: string;
  seedNumber: number;
  originalUrl: string;
  storagePath: string;
}

/**
 * Download image from URL to local temp directory
 */
async function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
  localPath: string,
  storagePath: string
): Promise<void> {
  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('🎨 Style Seeds Download & Upload');
  console.log('='.repeat(50));

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const uploadedSeeds: UploadedSeed[] = [];
  let totalDownloaded = 0;
  let totalUploaded = 0;
  let totalErrors = 0;

  for (const style of styleSeedsData) {
    console.log(`\n📁 Processing: ${style.displayName}`);
    console.log(`   Images: ${style.imageUrls.length}`);

    for (let i = 0; i < style.imageUrls.length; i++) {
      const imageUrl = style.imageUrls[i];
      const seedNumber = i + 1;

      // Extract filename from URL (use last part of path)
      const urlPath = new URL(imageUrl).pathname;
      const originalFilename = path.basename(urlPath);
      const extension = path.extname(originalFilename) || '.jpg';

      // Local temp path
      const localFilename = `${style.styleName}-${seedNumber}${extension}`;
      const localPath = path.join(TEMP_DIR, localFilename);

      // Storage path: style-seeds/{style-name}-{number}.jpg
      const storagePath = `${STORAGE_PATH_PREFIX}/${style.styleName}-${seedNumber}.jpg`;

      try {
        // Download
        console.log(`   ⬇️  Downloading seed ${seedNumber}/${style.imageUrls.length}...`);
        await downloadImage(imageUrl, localPath);
        totalDownloaded++;

        // Upload
        console.log(`   ⬆️  Uploading to storage...`);
        await uploadToStorage(localPath, storagePath);
        totalUploaded++;

        // Track uploaded seed
        uploadedSeeds.push({
          styleName: style.styleName,
          displayName: style.displayName,
          description: style.description,
          seedNumber,
          originalUrl: imageUrl,
          storagePath,
        });

        // Clean up temp file
        fs.unlinkSync(localPath);

        console.log(`   ✅ Uploaded: ${storagePath}`);
      } catch (error) {
        totalErrors++;
        console.error(
          `   ❌ Error processing seed ${seedNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Clean up temp file if it exists
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    }
  }

  // Save uploaded seeds manifest for embedding generation
  const manifestPath = path.join(
    process.cwd(),
    'scripts',
    'style-seeds',
    'uploaded-seeds.json'
  );
  fs.writeFileSync(manifestPath, JSON.stringify(uploadedSeeds, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Downloaded: ${totalDownloaded}`);
  console.log(`   Uploaded: ${totalUploaded}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Manifest: ${manifestPath}`);
  console.log('\n✅ Download and upload complete!');
  console.log('\nNext steps:');
  console.log('1. Generate embeddings: npx tsx scripts/style-seeds/generate-seed-embeddings.ts');
  console.log('2. Populate database: npx tsx scripts/style-seeds/populate-style-seeds.ts');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
