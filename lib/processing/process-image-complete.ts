/**
 * Complete Image Processing Pipeline
 *
 * Single function that processes an image through the FULL pipeline:
 * 1. Download from URL
 * 2. Process to WebP thumbnails
 * 3. Upload to Supabase Storage
 * 4. Generate CLIP embedding
 * 5. Analyze color (is_color)
 * 6. Predict styles via ML classifier
 * 7. Insert image record with embedding
 * 8. Insert style tags (triggers artist profile update)
 *
 * Used by: Manual import, processArtistImages, and potentially auto-sync
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { generateImageEmbedding } from '@/lib/embeddings/hybrid-client';
import { uploadImage, generateImagePaths } from '@/lib/storage/supabase-storage';
import { analyzeImageColor } from '@/lib/search/color-analyzer';
import { predictStyles, StylePrediction } from '@/lib/styles/predictor';

// Constants
const THUMBNAIL_SIZES = { small: 320, medium: 640, large: 1280 };
const WEBP_QUALITY = 85;
const MAX_ORIGINAL_SIZE = 2048;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const EMBEDDING_MAX_RETRIES = 3;

// Allowed hosts for image downloads (SSRF protection)
const ALLOWED_IMAGE_HOSTS = [
  'instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
];

export interface ProcessImageInput {
  artistId: string;
  imageUrl: string;
  postId: string; // Instagram post ID or generated ID
  caption?: string | null;
  timestamp?: string;
  likesCount?: number | null;
  importSource: 'manual_import' | 'oauth_sync' | 'profile_search' | 'recommendation' | 'scrape';
  manuallyAdded?: boolean;
  autoSynced?: boolean;
}

export interface ProcessImageResult {
  success: boolean;
  imageId?: string;
  storagePaths?: {
    original: string;
    thumb320: string;
    thumb640: string;
    thumb1280: string;
  };
  embedding?: number[];
  isColor?: boolean;
  styleTags?: StylePrediction[];
  error?: string;
}

// Initialize Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('[ProcessImage] Missing Supabase configuration');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate URL is from allowed hosts (SSRF protection)
 */
function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_IMAGE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith('.' + host)
    );
  } catch {
    return false;
  }
}

/**
 * Download image from URL with retry logic and SSRF protection
 */
async function downloadImage(url: string): Promise<Buffer> {
  // SSRF protection: only allow downloads from trusted hosts
  if (!isAllowedHost(url)) {
    throw new Error(`Blocked download from unauthorized host: ${new URL(url).hostname}`);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Process buffer into thumbnails
 */
async function processImageBuffer(buffer: Buffer): Promise<{
  original: Buffer;
  thumb320: Buffer;
  thumb640: Buffer;
  thumb1280: Buffer;
}> {
  // Process original (resize if too large, optimize)
  const originalBuffer = await sharp(buffer)
    .resize(MAX_ORIGINAL_SIZE, MAX_ORIGINAL_SIZE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  // Generate thumbnails in parallel
  const [thumb320, thumb640, thumb1280] = await Promise.all([
    sharp(buffer)
      .resize(THUMBNAIL_SIZES.small, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    sharp(buffer)
      .resize(THUMBNAIL_SIZES.medium, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    sharp(buffer)
      .resize(THUMBNAIL_SIZES.large, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
  ]);

  return { original: originalBuffer, thumb320, thumb640, thumb1280 };
}

/**
 * Generate embedding with exponential backoff retry
 * Handles transient failures from local GPU or Modal fallback
 */
async function generateEmbeddingWithRetry(file: File): Promise<number[]> {
  for (let attempt = 1; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    try {
      const embedding = await generateImageEmbedding(file);

      // Validate embedding
      if (!embedding || embedding.length !== 768) {
        throw new Error(`Invalid embedding dimension: ${embedding?.length || 0}`);
      }

      return embedding;
    } catch (error) {
      if (attempt === EMBEDDING_MAX_RETRIES) {
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s (capped at 10s)
      const delay = Math.min(RETRY_DELAY_MS * Math.pow(2, attempt - 1), 10000);
      console.warn(
        `[ProcessImage] Embedding retry ${attempt}/${EMBEDDING_MAX_RETRIES} after ${delay}ms:`,
        error instanceof Error ? error.message : error
      );
      await sleep(delay);
    }
  }
  throw new Error('Embedding generation failed after max retries');
}

/**
 * Upload with retry logic
 */
async function uploadWithRetry(
  path: string,
  buffer: Buffer,
  options: { contentType: string; upsert: boolean }
): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const result = await uploadImage(path, buffer, options);
    if (result.success) return result;
    if (i < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAY_MS * (i + 1));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Process a single image through the COMPLETE pipeline
 */
export async function processImageComplete(input: ProcessImageInput): Promise<ProcessImageResult> {
  const {
    artistId,
    imageUrl,
    postId,
    caption,
    timestamp,
    likesCount,
    importSource,
    manuallyAdded,
    autoSynced,
  } = input;

  const supabase = getSupabase();
  let imageId: string | undefined;

  try {
    // Step 1: Download image
    console.log(`[ProcessImage] Downloading ${postId}...`);
    const buffer = await downloadImage(imageUrl);

    // Step 2: Process to thumbnails
    console.log(`[ProcessImage] Processing thumbnails...`);
    const buffers = await processImageBuffer(buffer);

    // Step 3: Upload to Supabase Storage
    console.log(`[ProcessImage] Uploading to storage...`);
    const paths = generateImagePaths(artistId, postId);

    const uploadResults = await Promise.all([
      uploadWithRetry(paths.original, buffers.original, { contentType: 'image/jpeg', upsert: true }),
      uploadWithRetry(paths.thumb320, buffers.thumb320, { contentType: 'image/webp', upsert: true }),
      uploadWithRetry(paths.thumb640, buffers.thumb640, { contentType: 'image/webp', upsert: true }),
      uploadWithRetry(paths.thumb1280, buffers.thumb1280, {
        contentType: 'image/webp',
        upsert: true,
      }),
    ]);

    if (uploadResults.some((r) => !r.success)) {
      throw new Error('Storage upload failed');
    }

    // Step 4: Generate CLIP embedding with retry logic
    console.log(`[ProcessImage] Generating embedding...`);
    // Convert Buffer to Uint8Array for File constructor compatibility
    const uint8Array = new Uint8Array(buffers.thumb640);
    const file = new File([uint8Array], 'image.webp', { type: 'image/webp' });
    const embedding = await generateEmbeddingWithRetry(file);

    // Step 5: Analyze color
    console.log(`[ProcessImage] Analyzing color...`);
    let isColor: boolean | null = null;
    try {
      const colorResult = await analyzeImageColor(buffers.thumb320);
      isColor = colorResult.isColor;
    } catch (colorError) {
      console.warn(`[ProcessImage] Color analysis failed (non-fatal):`, colorError);
    }

    // Step 6: Predict styles
    console.log(`[ProcessImage] Predicting styles...`);
    const styleTags = predictStyles(embedding);
    console.log(
      `[ProcessImage] Styles: ${styleTags.map((s) => `${s.style}(${(s.confidence * 100).toFixed(0)}%)`).join(', ') || 'none'}`
    );

    // Step 7: Insert image record with embedding
    console.log(`[ProcessImage] Inserting database record...`);
    const { data: imageRecord, error: insertError } = await supabase
      .from('portfolio_images')
      .insert({
        artist_id: artistId,
        instagram_post_id: postId,
        instagram_url: imageUrl,
        storage_original_path: paths.original,
        storage_thumb_320: paths.thumb320,
        storage_thumb_640: paths.thumb640,
        storage_thumb_1280: paths.thumb1280,
        embedding: `[${embedding.join(',')}]`,
        post_caption: caption || null,
        post_timestamp: timestamp || new Date().toISOString(),
        likes_count: likesCount || null,
        status: 'active', // ACTIVE because we have embedding
        is_color: isColor,
        manually_added: manuallyAdded ?? false,
        auto_synced: autoSynced ?? false,
        import_source: importSource,
        is_pinned: false,
        pinned_position: null,
        hidden: false,
      })
      .select('id')
      .single();

    if (insertError) {
      // Check if it's a duplicate
      if (insertError.code === '23505') {
        console.log(`[ProcessImage] Duplicate image ${postId}, skipping`);
        return {
          success: true,
          storagePaths: paths,
          embedding,
          isColor: isColor ?? undefined,
          styleTags,
        };
      }
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    imageId = imageRecord.id;

    // Step 8: Insert style tags (triggers artist_style_profiles update)
    if (styleTags.length > 0 && imageId) {
      console.log(`[ProcessImage] Inserting ${styleTags.length} style tags...`);
      const styleTagRecords = styleTags.map((tag) => ({
        image_id: imageId,
        style_name: tag.style,
        confidence: tag.confidence,
      }));

      const { error: tagError } = await supabase
        .from('image_style_tags')
        .upsert(styleTagRecords, { onConflict: 'image_id,style_name' });

      if (tagError) {
        console.warn(`[ProcessImage] Style tag insert failed (non-fatal): ${tagError.message}`);
      }
    }

    console.log(`[ProcessImage] Success: ${postId}`);

    return {
      success: true,
      imageId,
      storagePaths: paths,
      embedding,
      isColor: isColor ?? undefined,
      styleTags,
    };
  } catch (error) {
    console.error(`[ProcessImage] Failed for ${postId}:`, error);
    return {
      success: false,
      imageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process multiple images in parallel with controlled concurrency
 */
export async function processImagesComplete(
  inputs: ProcessImageInput[],
  concurrency: number = 3
): Promise<ProcessImageResult[]> {
  const results: ProcessImageResult[] = [];

  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processImageComplete));
    results.push(...batchResults);

    console.log(
      `[ProcessImages] Batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(inputs.length / concurrency)} complete`
    );
  }

  return results;
}
