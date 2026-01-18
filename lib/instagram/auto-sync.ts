/* eslint-disable @typescript-eslint/no-explicit-any -- Instagram API responses vary */
/**
 * Instagram Auto-Sync Logic
 *
 * Core sync functionality for Pro artists.
 * Used by both cron job (daily auto-sync) and manual sync triggers.
 *
 * Process:
 * 1. Fetch latest 20 posts from Instagram (via ScrapingDog/Apify)
 * 2. Compare with existing portfolio (deduplication by instagram_media_id)
 * 3. For new posts: Classify with GPT-5-mini → filter non-tattoos
 * 4. For tattoo posts: Download, generate embedding, predict styles
 * 5. Insert into portfolio_images with auto_synced=true
 * 6. Insert style tags into image_style_tags (triggers artist_style_profiles update)
 * 7. Log result to unified_audit_log
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchInstagramProfileImages } from './profile-fetcher';
import { generateImageEmbedding } from '@/lib/embeddings/hybrid-client';
import { predictStyles, StylePrediction } from '@/lib/styles/predictor';
import OpenAI from 'openai';
import { randomUUID, createHash } from 'crypto';
import { sendSyncFailedEmail } from '@/lib/email';
import { fetchWithTimeout, TIMEOUTS } from '@/lib/utils/fetch-with-timeout';

// Types
export interface SyncResult {
  success: boolean;
  artistId: string;
  imagesFetched: number;
  imagesAdded: number;
  imagesSkipped: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  duration: number;
}

interface ProcessedImage {
  id: string;
  url: string;
  instagramMediaId: string;
  embedding: number[] | null;
  stylePredictions: StylePrediction[] | null;
  classified: boolean;
}

// Constants
const SYNC_FETCH_LIMIT = 20; // Fetch latest 20 posts for sync
const MAX_CONSECUTIVE_FAILURES = 3;
const CLASSIFICATION_BATCH_SIZE = 6;
const IMAGE_PROCESSING_BATCH_SIZE = 5;
const SYNC_LOCK_TIMEOUT_MINUTES = 10; // Stale lock detection

/**
 * Create a Supabase client with service role for cron/background operations
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createServiceClient(url, key);
}

/**
 * Acquire sync lock to prevent concurrent syncs
 * Returns true if lock acquired, false if sync already in progress
 */
async function acquireSyncLock(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string
): Promise<boolean> {
  // Check current lock status from artist_sync_state
  const { data, error } = await supabase
    .from('artist_sync_state')
    .select('sync_in_progress, last_sync_started_at')
    .eq('artist_id', artistId)
    .single();

  // If no sync state exists, create one and acquire lock
  if (error?.code === 'PGRST116' || !data) {
    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('artist_sync_state')
      .insert({
        artist_id: artistId,
        sync_in_progress: true,
        last_sync_started_at: now,
      });
    return !insertError;
  }

  if (error) return false;

  // Check if sync already in progress (unless stale)
  const isLocked = data.sync_in_progress === true;
  const isStale = isLocked && data.last_sync_started_at &&
    (Date.now() - new Date(data.last_sync_started_at).getTime()) / 60000 >= SYNC_LOCK_TIMEOUT_MINUTES;

  if (isLocked && !isStale) {
    const minutesAgo = data.last_sync_started_at
      ? (Date.now() - new Date(data.last_sync_started_at).getTime()) / 60000
      : 0;
    console.warn(`[AutoSync] Lock held for artist ${artistId} (${minutesAgo.toFixed(1)}m ago)`);
    return false;
  }

  if (isStale) {
    console.warn(`[AutoSync] Stale lock detected for artist ${artistId}, overriding`);
  }

  // Acquire lock atomically using conditional update
  // For fresh lock: only update if sync_in_progress is false/null
  // For stale lock: update regardless (we already verified it's stale)
  const now = new Date().toISOString();

  let updateQuery = supabase
    .from('artist_sync_state')
    .update({
      sync_in_progress: true,
      last_sync_started_at: now,
    })
    .eq('artist_id', artistId);

  // If not overriding a stale lock, ensure we only acquire if unlocked
  if (!isStale) {
    updateQuery = updateQuery.or('sync_in_progress.is.null,sync_in_progress.eq.false');
  }

  const { data: lockData, error: lockError } = await updateQuery.select('artist_id');

  return !lockError && lockData && lockData.length > 0;
}

/**
 * Release sync lock after completion
 */
async function releaseSyncLock(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string
): Promise<void> {
  const { error } = await supabase
    .from('artist_sync_state')
    .update({ sync_in_progress: false })
    .eq('artist_id', artistId);

  if (error) {
    console.error('[AutoSync] Failed to release lock:', error);
  }
}

/**
 * Main entry point - sync portfolio for a single artist
 */
export async function syncArtistPortfolio(
  artistId: string,
  userId: string,
  syncType: 'auto' | 'manual',
  filterNonTattoo: boolean = true
): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = getServiceClient();

  console.log(`[AutoSync] Starting ${syncType} sync for artist ${artistId}`);

  // Acquire sync lock first
  const lockAcquired = await acquireSyncLock(supabase, artistId);
  if (!lockAcquired) {
    console.warn(`[AutoSync] Sync already in progress for artist ${artistId}`);
    return createFailedResult(artistId, startTime, 'Sync already in progress. Please wait.');
  }

  try {
    // 1. Get artist's Instagram handle
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('instagram_handle, is_pro, auto_sync_enabled')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return createFailedResult(artistId, startTime, 'Artist not found');
    }

    if (!artist.is_pro) {
      return createFailedResult(artistId, startTime, 'Pro subscription required');
    }

    // 2. Fetch latest posts from Instagram
    console.log(`[AutoSync] Fetching Instagram posts for @${artist.instagram_handle}...`);
    let fetchedImages: { url: string; mediaId: string }[];

    try {
      const profile = await fetchInstagramProfileImages(artist.instagram_handle, SYNC_FETCH_LIMIT);
      fetchedImages = profile.posts.map((post) => ({
        url: post.displayUrl,
        // Generate consistent media ID from URL for deduplication
        mediaId: generateMediaId(post.displayUrl),
      }));
    } catch (error) {
      console.error('[AutoSync] Instagram fetch failed:', error);
      await handleSyncFailure(supabase, artistId, 'fetch_failed');
      return createFailedResult(artistId, startTime, `Instagram fetch failed: ${error}`);
    }

    if (fetchedImages.length === 0) {
      return createSuccessResult(artistId, startTime, 0, 0, 0);
    }

    // 3. Get existing media IDs for deduplication
    const existingMediaIds = await getExistingMediaIds(supabase, artistId);
    const newImages = fetchedImages.filter((img) => !existingMediaIds.has(img.mediaId));

    console.log(
      `[AutoSync] Found ${newImages.length} new images (${fetchedImages.length} total, ${existingMediaIds.size} existing)`
    );

    if (newImages.length === 0) {
      // No new images, but sync was successful
      await updateSyncTimestamp(supabase, artistId);
      await logSyncResult(supabase, artistId, userId, syncType, {
        imagesFetched: fetchedImages.length,
        imagesAdded: 0,
        imagesSkipped: 0,
        status: 'success',
      });
      return createSuccessResult(artistId, startTime, fetchedImages.length, 0, 0);
    }

    // 4. Classify new images (which ones are tattoos?) - if filtering enabled
    let tattooImages: { url: string; mediaId: string; classified: boolean }[];

    if (filterNonTattoo) {
      console.log(`[AutoSync] Classifying ${newImages.length} new images (filter enabled)...`);
      const classifiedImages = await classifyImages(newImages);
      tattooImages = classifiedImages.filter((img) => img.classified);
      console.log(`[AutoSync] Found ${tattooImages.length} tattoo images out of ${newImages.length}`);
    } else {
      console.log(`[AutoSync] Filter disabled - importing all ${newImages.length} images without classification`);
      tattooImages = newImages.map((img) => ({ ...img, classified: true }));
    }

    if (tattooImages.length === 0) {
      // No tattoo images found, but sync was successful
      await updateSyncTimestamp(supabase, artistId);
      await logSyncResult(supabase, artistId, userId, syncType, {
        imagesFetched: fetchedImages.length,
        imagesAdded: 0,
        imagesSkipped: newImages.length,
        status: 'success',
      });
      return createSuccessResult(artistId, startTime, fetchedImages.length, 0, newImages.length);
    }

    // 5. Process tattoo images (generate embeddings)
    console.log(`[AutoSync] Processing ${tattooImages.length} tattoo images...`);
    const processedImages = await processImages(tattooImages, artistId);
    const successfulImages = processedImages.filter((img) => img.embedding !== null);

    // 6. Insert into portfolio
    if (successfulImages.length > 0) {
      const portfolioRecords = successfulImages.map((img) => {
        // Validate embedding array length (CLIP ViT-L/14 produces 768-dimensional embeddings)
        const EXPECTED_EMBEDDING_DIM = 768;
        if (!img.embedding || img.embedding.length !== EXPECTED_EMBEDDING_DIM) {
          throw new Error(
            `Invalid embedding dimensions: expected ${EXPECTED_EMBEDDING_DIM}, got ${img.embedding?.length || 0}`
          );
        }

        // Validate embedding values are finite numbers and within reasonable range
        // CLIP embeddings are typically normalized to [-1, 1] range, but allow some margin
        const MAX_EMBEDDING_VALUE = 10; // Conservative upper bound to catch anomalies
        const validatedEmbedding = img.embedding.map((v, idx) => {
          if (typeof v !== 'number' || !Number.isFinite(v)) {
            throw new Error(`Invalid embedding value at index ${idx}: ${v} (type: ${typeof v})`);
          }
          if (Math.abs(v) > MAX_EMBEDDING_VALUE) {
            throw new Error(
              `Embedding value out of expected range at index ${idx}: ${v} (abs > ${MAX_EMBEDDING_VALUE})`
            );
          }
          return v;
        });

        return {
          id: img.id,
          artist_id: artistId,
          instagram_post_id: `sync_${Date.now()}_${img.instagramMediaId.substring(0, 8)}`,
          instagram_url: img.url,
          instagram_media_id: img.instagramMediaId,
          embedding: `[${validatedEmbedding.join(',')}]`,
          post_caption: null,
          post_timestamp: new Date().toISOString(),
          status: 'active',
          auto_synced: true,
          import_source: 'oauth_sync',
          is_pinned: false,
          pinned_position: null,
          hidden: false,
          manually_added: false,
          is_tattoo: true, // Image passed classification filter
          tattoo_confidence: 1.0, // Classified as tattoo by GPT
        };
      });

      const { error: insertError } = await supabase
        .from('portfolio_images')
        .insert(portfolioRecords);

      if (insertError) {
        console.error('[AutoSync] Insert failed:', insertError);
        await handleSyncFailure(supabase, artistId, 'insert_failed');
        return createFailedResult(artistId, startTime, `Insert failed: ${insertError.message}`);
      }

      // 6b. Insert style tags for images with predictions
      const styleTagRecords: { image_id: string; style_name: string; confidence: number }[] = [];
      for (const img of successfulImages) {
        if (img.stylePredictions && img.stylePredictions.length > 0) {
          for (const pred of img.stylePredictions) {
            styleTagRecords.push({
              image_id: img.id,
              style_name: pred.style,
              confidence: pred.confidence,
            });
          }
        }
      }

      if (styleTagRecords.length > 0) {
        const { error: tagError } = await supabase
          .from('image_style_tags')
          .upsert(styleTagRecords, { onConflict: 'image_id,style_name' });

        if (tagError) {
          // Log but don't fail the sync - images are saved, tags can be backfilled
          console.error('[AutoSync] Style tag insert failed:', tagError);
        } else {
          console.log(`[AutoSync] Inserted ${styleTagRecords.length} style tags`);
        }
      }
    }

    // 7. Update artist and log success
    await updateSyncTimestamp(supabase, artistId);
    await resetConsecutiveFailures(supabase, artistId);
    await logSyncResult(supabase, artistId, userId, syncType, {
      imagesFetched: fetchedImages.length,
      imagesAdded: successfulImages.length,
      imagesSkipped: newImages.length - tattooImages.length,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    console.log(
      `[AutoSync] Completed for ${artist.instagram_handle}: ${successfulImages.length} added (${duration}ms)`
    );

    return {
      success: true,
      artistId,
      imagesFetched: fetchedImages.length,
      imagesAdded: successfulImages.length,
      imagesSkipped: newImages.length - tattooImages.length,
      status: 'success',
      duration,
    };
  } catch (error: unknown) {
    console.error('[AutoSync] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await handleSyncFailure(supabase, artistId, 'unexpected_error');
    return createFailedResult(artistId, startTime, errorMessage);
  } finally {
    // ALWAYS release the lock, regardless of success or failure
    await releaseSyncLock(supabase, artistId);
  }
}

/**
 * Get existing instagram_media_id values for an artist
 */
async function getExistingMediaIds(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('portfolio_images')
    .select('instagram_media_id')
    .eq('artist_id', artistId)
    .not('instagram_media_id', 'is', null);

  if (error) {
    console.error('[AutoSync] Error fetching existing media IDs:', error);
    return new Set();
  }

  return new Set(
    data?.map((row) => row.instagram_media_id).filter(Boolean) as string[]
  );
}

/**
 * Generate a consistent media ID from image URL
 * Uses URL-based extraction for deduplication
 */
function generateMediaId(url: string): string {
  // Extract a unique identifier from the Instagram CDN URL
  // Format: https://scontent-xxx.cdninstagram.com/xxx/xxx/{id}_xxx.jpg
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1];
  const idMatch = filename?.match(/^([^_]+)/);

  if (idMatch) {
    return idMatch[1];
  }

  // Alternative: try to extract from URL path segments
  // Instagram URLs often contain media IDs in path like /v/t51.xxx/xxx/{media_id}.jpg
  const pathMatch = url.match(/\/([0-9]+)_[0-9]+_[0-9]+/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Fallback: SHA-256 hash of the full URL (16 hex chars = 64 bits, very low collision)
  const urlHash = createHash('sha256').update(url).digest('hex').substring(0, 16);
  return `url_${urlHash}`;
}

/**
 * Classify images as tattoo or non-tattoo using GPT-5-mini
 */
async function classifyImages(
  images: { url: string; mediaId: string }[]
): Promise<{ url: string; mediaId: string; classified: boolean }[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Throw error so sync properly fails and user is notified
    throw new Error('OPENAI_API_KEY not configured - image classification unavailable');
  }

  const client = new OpenAI({ apiKey, timeout: 30000 });
  const results: { url: string; mediaId: string; classified: boolean }[] = [];

  // Process in batches
  for (let i = 0; i < images.length; i += CLASSIFICATION_BATCH_SIZE) {
    const batch = images.slice(i, i + CLASSIFICATION_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (img) => {
        try {
          const response = await client.chat.completions.create({
            model: 'gpt-5-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Is this an image showcasing tattoo work? Answer 'yes' if the primary purpose is to display a tattoo (finished or in-progress).

Answer 'YES' if:
- Shows a completed tattoo on someone's body
- Shows a tattoo in progress (artist working)
- Displays tattoo flash, sketch, or design sheet
- Shows healed tattoo

Answer 'NO' if:
- Personal selfie where tattoos are incidental
- Lifestyle photo where person just happens to have tattoos
- Promotional graphics/text overlays
- Group photos where tattoos aren't the subject
- Studio/workspace photos without tattoo work

Only answer 'yes' or 'no'.`,
                  },
                  {
                    type: 'image_url',
                    image_url: { url: img.url },
                  },
                ],
              },
            ],
            max_tokens: 10,
          });

          const answer = response.choices[0]?.message?.content?.toLowerCase().trim();
          return { ...img, classified: answer === 'yes' };
        } catch (error) {
          console.error(`[AutoSync] Classification failed for ${img.mediaId}:`, error);
          return { ...img, classified: false }; // Conservative default
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[AutoSync] Classification batch error:', result.reason);
      }
    }
  }

  return results;
}

/**
 * Process a single image: download, generate embedding, predict styles
 */
async function processSingleImage(
  img: { url: string; mediaId: string; classified: boolean }
): Promise<ProcessedImage> {
  try {
    // Download image with timeout
    let response: Response;
    try {
      response = await fetchWithTimeout(img.url, {
        timeout: TIMEOUTS.SLOW, // 60s for Instagram CDN images
      });
    } catch (error: any) {
      // Provide specific logging for timeout vs other errors
      if (error.message?.includes('timeout')) {
        console.error(`[AutoSync] Timeout downloading ${img.mediaId} from Instagram CDN`);
      } else {
        console.error(`[AutoSync] Download error for ${img.mediaId}:`, error);
      }
      return {
        id: randomUUID(),
        url: img.url,
        instagramMediaId: img.mediaId,
        embedding: null,
        stylePredictions: null,
        classified: img.classified,
      };
    }

    if (!response.ok) {
      console.error(`[AutoSync] Failed to download ${img.mediaId}: ${response.status}`);
      return {
        id: randomUUID(),
        url: img.url,
        instagramMediaId: img.mediaId,
        embedding: null,
        stylePredictions: null,
        classified: img.classified,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create File object for embedding client
    const file = new File([buffer], 'image.jpg', { type: 'image/jpeg' });

    // Generate embedding
    const embedding = await generateImageEmbedding(file);

    // Predict styles from embedding (if embedding succeeded)
    const stylePredictions = embedding ? predictStyles(embedding) : null;

    return {
      id: randomUUID(),
      url: img.url,
      instagramMediaId: img.mediaId,
      embedding,
      stylePredictions,
      classified: img.classified,
    };
  } catch (error) {
    console.error(`[AutoSync] Processing failed for ${img.mediaId}:`, error);
    return {
      id: randomUUID(),
      url: img.url,
      instagramMediaId: img.mediaId,
      embedding: null,
      stylePredictions: null,
      classified: img.classified,
    };
  }
}


/**
 * Process images in parallel batches: download, generate embeddings
 */
async function processImages(
  images: { url: string; mediaId: string; classified: boolean }[],
  _artistId: string
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];

  // Process in batches for controlled concurrency
  for (let i = 0; i < images.length; i += IMAGE_PROCESSING_BATCH_SIZE) {
    const batch = images.slice(i, i + IMAGE_PROCESSING_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processSingleImage));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Update last_sync_at timestamp in artist_sync_state
 */
async function updateSyncTimestamp(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string
): Promise<void> {
  const { error } = await supabase
    .from('artist_sync_state')
    .upsert({
      artist_id: artistId,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'artist_id' });

  if (error) {
    console.error('[AutoSync] Failed to update sync timestamp:', error);
  }
}

/**
 * Reset consecutive failure counter in artist_sync_state
 */
async function resetConsecutiveFailures(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string
): Promise<void> {
  const { error } = await supabase
    .from('artist_sync_state')
    .upsert({
      artist_id: artistId,
      consecutive_failures: 0,
      disabled_reason: null,
    }, { onConflict: 'artist_id' });

  if (error) {
    console.error('[AutoSync] Failed to reset failure counter:', error);
  }
}

/**
 * Handle sync failure - increment counter, disable if threshold reached
 */
async function handleSyncFailure(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string,
  reason: string
): Promise<void> {
  // Get current failure count from artist_sync_state
  const { data: syncState } = await supabase
    .from('artist_sync_state')
    .select('consecutive_failures')
    .eq('artist_id', artistId)
    .single();

  const currentFailures = syncState?.consecutive_failures || 0;
  const newFailures = currentFailures + 1;

  // Get artist info for email
  const { data: artist } = await supabase
    .from('artists')
    .select('name, slug, instagram_handle, claimed_by_user_id')
    .eq('id', artistId)
    .single();

  // Get user email if artist is claimed
  let userEmail: string | null = null;
  if (artist?.claimed_by_user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', artist.claimed_by_user_id)
      .single();

    userEmail = userData?.email || null;
  }

  // Disable auto-sync if threshold reached
  if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.warn(`[AutoSync] Disabling auto-sync for ${artistId} after ${newFailures} failures`);

    // Update sync state
    await supabase
      .from('artist_sync_state')
      .upsert({
        artist_id: artistId,
        consecutive_failures: newFailures,
        auto_sync_enabled: false,
        disabled_reason: `consecutive_failures:${reason}`,
      }, { onConflict: 'artist_id' });

    // Send email notification for auto-sync disabled
    if (userEmail && artist) {
      const needsReauth = reason.includes('auth') || reason.includes('token') || reason.includes('permission');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io';
      const dashboardUrl = `${baseUrl}/dashboard`;

      sendSyncFailedEmail({
        to: userEmail,
        artistName: artist.name,
        failureReason: formatFailureReason(reason),
        failureCount: newFailures,
        dashboardUrl,
        instagramHandle: artist.instagram_handle,
        needsReauth,
      }).catch((error) => {
        console.error('[AutoSync] Failed to send sync failure email:', error);
        // Don't fail the sync process if email fails
      });
    }
  } else if (newFailures >= 2) {
    // Send warning email after 2 failures (before auto-disable)
    await supabase
      .from('artist_sync_state')
      .upsert({
        artist_id: artistId,
        consecutive_failures: newFailures,
      }, { onConflict: 'artist_id' });

    if (userEmail && artist) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io';
      const dashboardUrl = `${baseUrl}/dashboard`;

      sendSyncFailedEmail({
        to: userEmail,
        artistName: artist.name,
        failureReason: formatFailureReason(reason),
        failureCount: newFailures,
        dashboardUrl,
        instagramHandle: artist.instagram_handle,
        needsReauth: false,
      }).catch((error) => {
        console.error('[AutoSync] Failed to send sync warning email:', error);
      });
    }
  } else {
    // Just increment failure count
    await supabase
      .from('artist_sync_state')
      .upsert({
        artist_id: artistId,
        consecutive_failures: newFailures,
      }, { onConflict: 'artist_id' });
  }
}

/**
 * Format failure reason for user-facing display
 */
function formatFailureReason(reason: string): string {
  const reasons: Record<string, string> = {
    'fetch_failed': 'Failed to fetch posts from Instagram. This may be due to rate limiting or a temporary Instagram issue.',
    'auth_failed': 'Instagram authentication failed. You may need to reconnect your Instagram account.',
    'token_expired': 'Your Instagram access token has expired. Please reconnect your Instagram account.',
    'permission_denied': 'Instagram denied access. Check your app permissions in Instagram settings.',
    'insert_failed': 'Failed to save new posts to your portfolio. This is a database error - please contact support.',
    'classification_failed': 'Failed to classify images. This may be a temporary issue with our AI service.',
    'embedding_failed': 'Failed to generate image embeddings. This is required for visual search.',
    'unexpected_error': 'An unexpected error occurred during sync. Please try again.',
  };

  return reasons[reason] || `Sync failed: ${reason}`;
}

/**
 * Log sync result to unified_audit_log
 */
async function logSyncResult(
  supabase: ReturnType<typeof getServiceClient>,
  artistId: string,
  userId: string,
  syncType: 'auto' | 'manual',
  result: {
    imagesFetched: number;
    imagesAdded: number;
    imagesSkipped: number;
    status: 'success' | 'partial' | 'failed';
    errorMessage?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('unified_audit_log').insert({
    event_category: 'sync',
    event_type: `instagram.${syncType}`,
    actor_type: syncType === 'auto' ? 'cron' : 'user',
    actor_id: userId,
    resource_type: 'artist',
    resource_id: artistId,
    resource_secondary_id: userId,
    status: result.status,
    error_message: result.errorMessage || null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    items_processed: result.imagesFetched,
    items_succeeded: result.imagesAdded,
    items_failed: result.imagesSkipped,
  });

  if (error) {
    console.error('[AutoSync] Failed to log sync result:', error);
  }
}

/**
 * Helper: create failed result
 */
function createFailedResult(artistId: string, startTime: number, errorMessage: string): SyncResult {
  return {
    success: false,
    artistId,
    imagesFetched: 0,
    imagesAdded: 0,
    imagesSkipped: 0,
    status: 'failed',
    errorMessage,
    duration: Date.now() - startTime,
  };
}

/**
 * Helper: create success result
 */
function createSuccessResult(
  artistId: string,
  startTime: number,
  imagesFetched: number,
  imagesAdded: number,
  imagesSkipped: number
): SyncResult {
  return {
    success: true,
    artistId,
    imagesFetched,
    imagesAdded,
    imagesSkipped,
    status: 'success',
    duration: Date.now() - startTime,
  };
}

/**
 * Get all Pro artists eligible for auto-sync
 * Used by cron job
 */
export async function getEligibleArtists(): Promise<
  { id: string; userId: string; instagramHandle: string; filterNonTattoo: boolean }[]
> {
  const supabase = getServiceClient();

  // Join with artist_sync_state to get auto_sync_enabled and last_sync_at
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      claimed_by_user_id,
      instagram_handle,
      filter_non_tattoo_content,
      artist_sync_state!inner(auto_sync_enabled, last_sync_at)
    `)
    .eq('is_pro', true)
    .eq('artist_sync_state.auto_sync_enabled', true)
    .is('deleted_at', null)
    .order('artist_sync_state(last_sync_at)', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('[AutoSync] Failed to fetch eligible artists:', error);
    return [];
  }

  return (data || [])
    .filter((a) => a.claimed_by_user_id) // Must be claimed
    .map((a) => ({
      id: a.id,
      userId: a.claimed_by_user_id!,
      filterNonTattoo: a.filter_non_tattoo_content !== false, // Default true if null
      instagramHandle: a.instagram_handle,
    }));
}
