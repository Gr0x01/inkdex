/**
 * Single Artist Image Processing
 *
 * Processes images for a single artist from /tmp/instagram/{artistId}/
 * Extracts core logic from scripts/scraping/process-batch.ts for use in API routes
 */

import { readdirSync, readFileSync, rmSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { processLocalImage } from './image-processor';
import { uploadImage, generateImagePaths, generateProfileImagePaths, deleteImages } from '../storage/supabase-storage';
import { analyzeImageColor } from '../search/color-analyzer';
import { generateImageEmbedding } from '../embeddings/hybrid-client';
import { predictStyles } from '../styles/predictor';

const TEMP_DIR = '/tmp/instagram';

// Initialize Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('[ProcessArtist] Missing Supabase configuration');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

interface ImageMetadata {
  post_id: string;
  post_url: string;
  caption: string;
  timestamp: string;
  likes: number;
}

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
  options: { contentType: string; upsert: boolean },
  retries = 3
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  for (let i = 0; i < retries; i++) {
    const result = await uploadImage(path, buffer, options);
    if (result.success) return result;

    if (i < retries - 1) {
      const delay = 1000 * (i + 1);
      console.log(`[ProcessArtist] Retry ${i + 1}/${retries} after ${delay}ms...`);
      await sleep(delay);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Check if images for a post already exist in the database
 */
async function imageExists(supabase: ReturnType<typeof getSupabase>, artistId: string, postId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('portfolio_images')
    .select('id')
    .eq('artist_id', artistId)
    .eq('instagram_post_id', postId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`[ProcessArtist] Error checking existence: ${error.message}`);
  }

  return !!data;
}

/**
 * Process and upload profile image for an artist
 */
async function processProfileImage(
  supabase: ReturnType<typeof getSupabase>,
  artistId: string,
  artistDir: string
): Promise<{ success: boolean; error?: string }> {
  const profileImagePath = join(artistDir, `${artistId}_profile.jpg`);

  if (!existsSync(profileImagePath)) {
    return { success: false, error: 'No profile image found' };
  }

  // Validate file size
  const MAX_PROFILE_SIZE = 10 * 1024 * 1024;
  try {
    const stats = statSync(profileImagePath);
    if (stats.size === 0) {
      return { success: false, error: 'Profile image is empty (0 bytes)' };
    }
    if (stats.size > MAX_PROFILE_SIZE) {
      return { success: false, error: `Profile image too large: ${stats.size} bytes` };
    }
  } catch {
    return { success: false, error: 'Failed to read file stats' };
  }

  // Check if already uploaded
  const { data: artist } = await supabase
    .from('artists')
    .select('profile_storage_path')
    .eq('id', artistId)
    .single();

  if (artist?.profile_storage_path) {
    console.log(`[ProcessArtist] Profile image already uploaded`);
    return { success: true };
  }

  try {
    const { success, buffers, error } = await processLocalImage(profileImagePath);

    if (!success || !buffers) {
      return { success: false, error: `Failed to process profile image: ${error}` };
    }

    const paths = generateProfileImagePaths(artistId);

    const uploadPromises = [
      uploadWithRetry(paths.original, buffers.original, { contentType: 'image/jpeg', upsert: true }),
      uploadWithRetry(paths.thumb320, buffers.thumb320, { contentType: 'image/webp', upsert: true }),
      uploadWithRetry(paths.thumb640, buffers.thumb640, { contentType: 'image/webp', upsert: true }),
    ];

    const uploadResults = await Promise.all(uploadPromises);

    if (uploadResults.some(r => !r.success)) {
      return { success: false, error: 'Upload failed' };
    }

    await supabase
      .from('artists')
      .update({
        profile_storage_path: paths.original,
        profile_storage_thumb_320: paths.thumb320,
        profile_storage_thumb_640: paths.thumb640,
      })
      .eq('id', artistId);

    console.log(`[ProcessArtist] ✅ Profile image uploaded`);
    return { success: true };

  } catch (err) {
    return { success: false, error: `Error processing profile image: ${err}` };
  }
}

/**
 * Process and upload images for a single artist
 * This is the main export function used by API routes
 *
 * @param artistId - UUID of the artist to process
 * @param cleanup - Whether to delete the temp directory after processing (default: true)
 */
export async function processArtistImages(
  artistId: string,
  cleanup = true
): Promise<{
  success: boolean;
  imagesProcessed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let imagesProcessed = 0;
  const artistDir = join(TEMP_DIR, artistId);

  // Check if directory exists
  if (!existsSync(artistDir)) {
    return { success: false, imagesProcessed: 0, errors: ['Artist directory not found'] };
  }

  // Check for .complete lock file
  const lockFile = join(artistDir, '.complete');
  if (!existsSync(lockFile)) {
    return { success: false, imagesProcessed: 0, errors: ['Lock file not found - images may still be downloading'] };
  }

  const supabase = getSupabase();

  try {
    // Process profile image first
    const profileResult = await processProfileImage(supabase, artistId, artistDir);
    if (!profileResult.success && profileResult.error !== 'No profile image found') {
      errors.push(profileResult.error || 'Profile image processing failed');
    }

    // Read metadata file
    const metadataPath = join(artistDir, 'metadata.json');
    let metadata: ImageMetadata[] = [];

    try {
      const metadataContent = readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch {
      if (profileResult.success) {
        // Only profile image, no portfolio images
        if (cleanup) {
          rmSync(artistDir, { recursive: true });
        }
        return { success: true, imagesProcessed: 0, errors };
      }
      errors.push('Failed to read metadata.json');
      return { success: false, imagesProcessed: 0, errors };
    }

    console.log(`[ProcessArtist] Processing ${metadata.length} images for ${artistId}`);

    // Process each image
    for (const meta of metadata) {
      const postId = meta.post_id;

      // Check if already uploaded
      const exists = await imageExists(supabase, artistId, postId);
      if (exists) {
        console.log(`[ProcessArtist] Skipping ${postId} (already uploaded)`);
        imagesProcessed++;
        continue;
      }

      // Find image file
      const imageFiles = readdirSync(artistDir).filter(f =>
        f.startsWith(postId) && f.endsWith('.jpg')
      );

      if (imageFiles.length === 0) {
        errors.push(`No image file found for post ${postId}`);
        continue;
      }

      const imagePath = join(artistDir, imageFiles[0]);

      try {
        // Process image
        const { success, buffers, error } = await processLocalImage(imagePath);

        if (!success || !buffers) {
          errors.push(`Failed to process ${postId}: ${error}`);
          continue;
        }

        // Generate storage paths
        const paths = generateImagePaths(artistId, postId);

        // Upload all images in parallel
        const uploadPromises = [
          uploadWithRetry(paths.original, buffers.original, { contentType: 'image/jpeg', upsert: true }),
          uploadWithRetry(paths.thumb320, buffers.thumb320, { contentType: 'image/webp', upsert: true }),
          uploadWithRetry(paths.thumb640, buffers.thumb640, { contentType: 'image/webp', upsert: true }),
          uploadWithRetry(paths.thumb1280, buffers.thumb1280, { contentType: 'image/webp', upsert: true }),
        ];

        const uploadResults = await Promise.all(uploadPromises);

        if (uploadResults.some(r => !r.success)) {
          errors.push(`Upload failed for ${postId}`);
          continue;
        }

        // Analyze image color
        let isColor: boolean | null = null;
        try {
          const colorResult = await analyzeImageColor(buffers.thumb320);
          isColor = colorResult.isColor;
        } catch {
          // Non-fatal
        }

        // Generate CLIP embedding inline (required - skip image if fails)
        let embedding: number[];
        try {
          // Use thumb640 buffer for embedding (good balance of quality/size)
          // Convert Buffer to Uint8Array for File constructor compatibility
          const uint8Array = new Uint8Array(buffers.thumb640);
          const file = new File([uint8Array], 'image.webp', { type: 'image/webp' });
          const result = await generateImageEmbedding(file);

          if (!result || result.length !== 768) {
            throw new Error(`Invalid embedding: ${result?.length || 0} dimensions`);
          }
          embedding = result;
          console.log(`[ProcessArtist] Generated embedding for ${postId}`);
        } catch (embeddingError) {
          console.error(`[ProcessArtist] Embedding failed for ${postId}:`, embeddingError);
          // Rollback storage uploads since we can't proceed without embedding
          await deleteImages([paths.original, paths.thumb320, paths.thumb640, paths.thumb1280]).catch(() => {});
          errors.push(`Embedding failed for ${postId}: ${embeddingError}`);
          continue;
        }

        // Predict styles inline
        const styleTags = predictStyles(embedding);
        if (styleTags.length > 0) {
          console.log(
            `[ProcessArtist] Styles for ${postId}: ${styleTags.map((s) => `${s.style}(${(s.confidence * 100).toFixed(0)}%)`).join(', ')}`
          );
        }

        // Insert into database with embedding
        const { data: imageRecord, error: dbError } = await supabase
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
            status: 'active',
            is_color: isColor,
            embedding: `[${embedding.join(',')}]`,
          })
          .select('id')
          .single();

        if (dbError) {
          if (dbError.code !== '23505') { // Not a duplicate
            // Rollback uploads
            await deleteImages([paths.original, paths.thumb320, paths.thumb640, paths.thumb1280]).catch(() => {});
            errors.push(`Database insert failed for ${postId}: ${dbError.message}`);
            continue;
          }
          // Duplicate - count as processed
        } else if (imageRecord && styleTags.length > 0) {
          // Insert style tags (triggers artist_style_profiles update)
          const styleTagRecords = styleTags.map((tag) => ({
            image_id: imageRecord.id,
            style_name: tag.style,
            confidence: tag.confidence,
          }));

          const { error: tagError } = await supabase
            .from('image_style_tags')
            .upsert(styleTagRecords, { onConflict: 'image_id,style_name' });

          if (tagError) {
            console.warn(`[ProcessArtist] Style tag insert failed (non-fatal): ${tagError.message}`);
          }
        }

        imagesProcessed++;
        console.log(`[ProcessArtist] ✅ Uploaded ${postId} (${imagesProcessed}/${metadata.length})`);

      } catch (err) {
        errors.push(`Error processing ${postId}: ${err}`);
      }
    }

    // Cleanup temp directory
    if (cleanup) {
      try {
        rmSync(artistDir, { recursive: true });
        console.log(`[ProcessArtist] Cleaned up ${artistDir}`);
      } catch {
        // Non-fatal
      }
    }

    return { success: errors.length === 0, imagesProcessed, errors };

  } catch (err) {
    return { success: false, imagesProcessed: 0, errors: [`${err}`] };
  }
}
