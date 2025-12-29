/**
 * Process and Upload Script
 * Processes downloaded Instagram images and uploads them to Supabase Storage
 * Includes idempotency checks to avoid re-processing
 */

// IMPORTANT: Load environment variables FIRST, before any imports
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readdirSync, readFileSync, unlinkSync, statSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { createClient } from '@supabase/supabase-js';
import { processLocalImage } from '../../lib/processing/image-processor';
import { uploadImage, generateImagePaths, deleteImages } from '../../lib/storage/supabase-storage';

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Upload with retry logic for transient failures
 */
async function uploadWithRetry(
  path: string,
  buffer: Buffer,
  options: any,
  retries = 3
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  for (let i = 0; i < retries; i++) {
    const result = await uploadImage(path, buffer, options);
    if (result.success) return result;

    if (i < retries - 1) {
      const delay = 1000 * (i + 1); // Linear backoff: 1s, 2s, 3s
      console.log(`      ⏳ Retry ${i + 1}/${retries} after ${delay}ms...`);
      await sleep(delay);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Validate environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Check your .env.local file');
  process.exit(1);
}

const TEMP_DIR = '/tmp/instagram';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface ImageMetadata {
  post_id: string;
  post_url: string;
  caption: string;
  timestamp: string;
  likes: number;
}

/**
 * Check if images for a post already exist in the database
 */
async function imageExists(artistId: string, postId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('portfolio_images')
    .select('id')
    .eq('artist_id', artistId)
    .eq('instagram_post_id', postId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error(`   ⚠️  Error checking existence: ${error.message}`);
  }

  return !!data;
}

/**
 * Process and upload images for a single artist
 */
async function processArtistImages(artistId: string, artistDir: string): Promise<{
  success: boolean;
  imagesProcessed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let imagesProcessed = 0;

  try {
    // Read metadata file
    const metadataPath = join(artistDir, 'metadata.json');
    let metadata: ImageMetadata[] = [];

    try {
      const metadataContent = readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      errors.push(`Failed to read metadata: ${error}`);
      return { success: false, imagesProcessed: 0, errors };
    }

    console.log(`   📋 Found ${metadata.length} images to process`);

    // Process each image
    for (let i = 0; i < metadata.length; i++) {
      const meta = metadata[i];
      const postId = meta.post_id;

      // Check if already uploaded (idempotency)
      const exists = await imageExists(artistId, postId);
      if (exists) {
        console.log(`   ⏭️  Skipping ${postId} (already uploaded)`);
        imagesProcessed++;
        continue;
      }

      // Find image file (Instaloader saves as {shortcode}_*.jpg)
      const imageFiles = readdirSync(artistDir).filter(f =>
        f.startsWith(postId) && f.endsWith('.jpg')
      );

      if (imageFiles.length === 0) {
        errors.push(`No image file found for post ${postId}`);
        continue;
      }

      const imagePath = join(artistDir, imageFiles[0]);

      try {
        // Process image (generate thumbnails)
        console.log(`   🖼️  Processing ${postId}...`);
        const { success, buffers, error } = await processLocalImage(imagePath);

        if (!success || !buffers) {
          errors.push(`Failed to process ${postId}: ${error}`);
          continue;
        }

        // Generate storage paths
        const paths = generateImagePaths(artistId, postId);

        // Upload all images in parallel with retry logic
        const uploadPromises = [
          uploadWithRetry(paths.original, buffers.original, { contentType: 'image/jpeg', upsert: true }),
          uploadWithRetry(paths.thumb320, buffers.thumb320, { contentType: 'image/webp', upsert: true }),
          uploadWithRetry(paths.thumb640, buffers.thumb640, { contentType: 'image/webp', upsert: true }),
          uploadWithRetry(paths.thumb1280, buffers.thumb1280, { contentType: 'image/webp', upsert: true }),
        ];

        const uploadResults = await Promise.all(uploadPromises);

        // Check for upload failures
        const uploadFailed = uploadResults.some(r => !r.success);
        if (uploadFailed) {
          const failedUploads = uploadResults.filter(r => !r.success);
          errors.push(`Upload failed for ${postId}: ${failedUploads.map(r => r.error).join(', ')}`);
          continue;
        }

        // Insert into database
        const { error: dbError } = await supabase
          .from('portfolio_images')
          .insert({
            artist_id: artistId,
            instagram_post_id: postId,
            instagram_url: meta.post_url,
            storage_original_path: paths.original,
            storage_thumb_320: paths.thumb320,
            storage_thumb_640: paths.thumb640,
            storage_thumb_1280: paths.thumb1280,
            post_caption: meta.caption || null,
            post_timestamp: meta.timestamp,
            likes_count: meta.likes,
            status: 'pending',  // Images start as pending until embeddings are generated
          });

        if (dbError) {
          // Rollback: Delete uploaded images to avoid orphaned files
          if (dbError.code !== '23505') {  // Skip rollback for duplicates
            console.log(`   🔄 Rolling back uploads for ${postId}...`);
            const pathsToDelete = [
              paths.original,
              paths.thumb320,
              paths.thumb640,
              paths.thumb1280,
            ];
            await deleteImages(pathsToDelete).catch(err => {
              console.warn(`      ⚠️  Rollback cleanup warning: ${err.error}`);
            });
          }

          // Handle duplicate error gracefully (race condition)
          if (dbError.code === '23505') {
            console.log(`   ⏭️  Skipping ${postId} (duplicate detected during insert)`);
            imagesProcessed++;
            continue;
          }

          errors.push(`Database insert failed for ${postId}: ${dbError.message}`);
          continue;
        }

        imagesProcessed++;
        console.log(`   ✅ Uploaded ${postId} (${imagesProcessed}/${metadata.length})`);

      } catch (error: any) {
        errors.push(`Error processing ${postId}: ${error.message}`);
      }
    }

    return { success: errors.length === 0, imagesProcessed, errors };

  } catch (error: any) {
    return { success: false, imagesProcessed: 0, errors: [error.message] };
  }
}

/**
 * Main processing workflow
 */
async function main() {
  console.log('🖼️  Instagram Image Processor\n');

  // Check temp directory exists
  try {
    statSync(TEMP_DIR);
  } catch (error) {
    console.error(`❌ Temp directory not found: ${TEMP_DIR}`);
    console.log('   Run the Python scraper first: python3 scripts/scraping/instaloader-scraper.py');
    process.exit(1);
  }

  // Get artist directories
  const artistDirs = readdirSync(TEMP_DIR).filter(item => {
    const itemPath = join(TEMP_DIR, item);
    return statSync(itemPath).isDirectory();
  });

  if (artistDirs.length === 0) {
    console.log('✅ No artists to process (temp directory empty)');
    process.exit(0);
  }

  console.log(`📂 Found ${artistDirs.length} artists to process\n`);

  const CONCURRENT_UPLOADS = 100; // Process 100 artists in parallel
  console.log(`🚀 Running ${CONCURRENT_UPLOADS} artists in parallel\n`);

  let totalProcessed = 0;
  let totalErrors = 0;
  let completed = 0;

  // Process artists in parallel batches
  const processBatch = async (batch: string[]) => {
    const promises = batch.map(async (artistId) => {
      const artistDir = join(TEMP_DIR, artistId);

      const { success, imagesProcessed, errors } = await processArtistImages(artistId, artistDir);

      // Track progress
      completed++;
      const progress = ((completed / artistDirs.length) * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (${completed}/${artistDirs.length}) - ${imagesProcessed} images uploaded`);

      if (errors.length > 0) {
        console.log(`   ⚠️  ${artistId}: ${errors.length} errors`);
      }

      // Update scraping job
      try {
        await supabase
          .from('scraping_jobs')
          .update({ images_scraped: imagesProcessed })
          .eq('artist_id', artistId);
      } catch (error) {
        // Non-critical error
      }

      // Clean up artist directory
      try {
        rmSync(artistDir, { recursive: true });
      } catch (error: any) {
        // Ignore cleanup errors
      }

      return { imagesProcessed, errors: errors.length };
    });

    const results = await Promise.all(promises);

    // Aggregate results
    results.forEach(({ imagesProcessed, errors }) => {
      totalProcessed += imagesProcessed;
      totalErrors += errors;
    });
  };

  // Process in batches
  for (let i = 0; i < artistDirs.length; i += CONCURRENT_UPLOADS) {
    const batch = artistDirs.slice(i, i + CONCURRENT_UPLOADS);
    await processBatch(batch);
  }

  // Summary
  console.log('\n📊 Processing Summary:');
  console.log(`   Total images processed: ${totalProcessed}`);
  console.log(`   Total errors: ${totalErrors}`);

  if (totalProcessed > 0) {
    console.log('\n📋 Next steps:');
    console.log('   1. Validate results: npm run validate-scraped-images');
    console.log('   2. Generate embeddings: (Phase 4)');
  }
}

main().catch(console.error);
