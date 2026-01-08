/**
 * Dashboard Portfolio: Import Portfolio
 *
 * Replaces existing portfolio with new selection from Instagram
 * Processes images asynchronously through complete pipeline:
 * - Download from Instagram CDN
 * - Upload to Supabase Storage (WebP thumbnails)
 * - Generate CLIP embeddings
 * - Predict styles via ML classifier
 *
 * POST /api/dashboard/portfolio/import
 *
 * Request: { selectedImageIds: string[] } (max 20 for Free tier, 100 for Pro tier)
 * Response: { success: true, processing: true, count: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { MAX_FREE_TIER_IMAGES, MAX_PRO_TIER_IMAGES } from '@/lib/constants/portfolio';
import {
  processImagesComplete,
  ProcessImageInput,
} from '@/lib/processing/process-image-complete';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Background job timeout (9 minutes - just under Vercel's 10min limit)
const BACKGROUND_TIMEOUT_MS = 9 * 60 * 1000;

const importSchema = z.object({
  selectedImageIds: z.array(z.string()).min(1).max(MAX_PRO_TIER_IMAGES),
});

/**
 * Validate Instagram URL format
 * Prevents storing arbitrary/malicious URLs
 * Supports Instagram app URLs and CDN URLs
 */
function validateInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Check for valid Instagram hosts
    const hostname = parsed.hostname.toLowerCase();
    const isInstagramApp =
      hostname === 'www.instagram.com' || hostname === 'instagram.com';
    const isInstagramCdn =
      hostname === 'cdninstagram.com' ||
      hostname.endsWith('.cdninstagram.com') ||
      hostname.endsWith('.fbcdn.net'); // Facebook CDN also used

    if (!isInstagramApp && !isInstagramCdn) {
      return false;
    }

    // For CDN URLs, validate it looks like an image path
    if (isInstagramCdn || hostname.endsWith('.fbcdn.net')) {
      // CDN URLs should have image-like paths
      const hasImageIndicator =
        parsed.pathname.includes('/v/') || // Versioned paths
        parsed.pathname.includes('/t51') || // Image type indicator
        /\.(jpg|jpeg|png|webp)/i.test(parsed.pathname);
      return hasImageIndicator;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract storage paths from image records for cleanup
 * Returns flat array of valid paths
 */
function extractStoragePaths(
  images: Array<{
    storage_original_path?: string | null;
    storage_thumb_320?: string | null;
    storage_thumb_640?: string | null;
    storage_thumb_1280?: string | null;
  }>
): string[] {
  const validPaths: string[] = [];

  images.forEach((img) => {
    const paths = [
      img.storage_original_path,
      img.storage_thumb_320,
      img.storage_thumb_640,
      img.storage_thumb_1280,
    ].filter((path): path is string => {
      if (!path || typeof path !== 'string') return false;

      // Only allow paths within expected folders
      const validPrefixes = ['original/', 'thumbs/320/', 'thumbs/640/', 'thumbs/1280/'];
      const hasValidPrefix = validPrefixes.some((prefix) => path.startsWith(prefix));

      // Reject path traversal attempts
      const hasTraversal = path.includes('..') || path.includes('//');

      return hasValidPrefix && !hasTraversal && path.length > 0;
    });

    validPaths.push(...paths);
  });

  return validPaths;
}

/**
 * Async storage cleanup (non-blocking)
 * Deletes images from Supabase Storage in background
 */
async function cleanupStoragePaths(paths: string[]) {
  if (paths.length === 0) return;

  try {
    const { deleteImages } = await import('@/lib/storage/supabase-storage');
    await deleteImages(paths);
    console.log(`[Portfolio] Cleaned up ${paths.length} storage files`);
  } catch (error) {
    console.error('[Portfolio] Storage cleanup failed:', error);
    // Non-blocking: don't throw error
  }
}

/**
 * Get service client for background processing
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase configuration');
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Log import result to audit trail
 */
async function logImportResult(
  serviceClient: ReturnType<typeof getServiceClient>,
  artistId: string,
  successful: number,
  failed: number,
  errors: string[]
) {
  try {
    await serviceClient.from('artist_audit_log').insert({
      artist_id: artistId,
      action: failed > 0 ? 'portfolio_import_partial' : 'portfolio_import_complete',
      details: JSON.stringify({
        successful,
        failed,
        errors: errors.slice(0, 10), // Limit to 10 errors
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Non-fatal - just log
    console.error('[Portfolio] Failed to log import result:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth + get artist
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, is_pro')
      .eq('claimed_by_user_id', user.id)
      .eq('verification_status', 'claimed')
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'No claimed artist found' }, { status: 404 });
    }

    // 2. Validate request body
    const body = await request.json();
    const validated = importSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { selectedImageIds } = validated.data;

    // 3. Enforce tier-based limits
    if (selectedImageIds.length > MAX_PRO_TIER_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PRO_TIER_IMAGES} images allowed` },
        { status: 400 }
      );
    }

    if (!artist.is_pro && selectedImageIds.length > MAX_FREE_TIER_IMAGES) {
      return NextResponse.json(
        {
          error: `Free tier limited to ${MAX_FREE_TIER_IMAGES} images. Upgrade to Pro for up to ${MAX_PRO_TIER_IMAGES}.`,
        },
        { status: 403 }
      );
    }

    // 4. Validate all Instagram URLs before proceeding
    for (const urlOrId of selectedImageIds) {
      if (!validateInstagramUrl(urlOrId)) {
        return NextResponse.json(
          { error: `Invalid Instagram URL: ${urlOrId.substring(0, 50)}...` },
          { status: 400 }
        );
      }
    }

    // 5. Fetch existing images and SAVE storage paths BEFORE deletion
    // This fixes the race condition where we need paths for cleanup after delete
    const { data: existingImages } = await supabase
      .from('portfolio_images')
      .select('storage_original_path, storage_thumb_320, storage_thumb_640, storage_thumb_1280')
      .eq('artist_id', artist.id);

    // Extract and save paths before any mutations
    const storagePaths = extractStoragePaths(existingImages || []);

    console.log(
      `[Portfolio] Starting async import for artist ${artist.id} (${selectedImageIds.length} new images, ${existingImages?.length || 0} existing)`
    );

    // Capture values for background closure
    const artistId = artist.id;
    const imageUrls = [...selectedImageIds]; // Copy to avoid closure issues

    // 6. Fire-and-forget background processing with timeout
    Promise.race([
      (async () => {
        const serviceClient = getServiceClient();

        try {
          // Delete existing images from database
          const { error: deleteError } = await serviceClient
            .from('portfolio_images')
            .delete()
            .eq('artist_id', artistId);

          if (deleteError) {
            console.error('[Portfolio] Delete failed:', deleteError);
            await logImportResult(serviceClient, artistId, 0, imageUrls.length, [
              `Delete failed: ${deleteError.message}`,
            ]);
            return;
          }

          console.log(`[Portfolio] Deleted ${existingImages?.length || 0} existing images from DB`);

          // Process each image through complete pipeline
          const baseTimestamp = Date.now();
          const inputs: ProcessImageInput[] = imageUrls.map((url, idx) => ({
            artistId,
            imageUrl: url,
            postId: `manual_${baseTimestamp}_${idx}`,
            importSource: 'manual_import' as const,
            manuallyAdded: true,
            autoSynced: false,
          }));

          // Process with controlled concurrency (2 at a time to be safe on memory)
          const results = await processImagesComplete(inputs, 2);

          const successful = results.filter((r) => r.success).length;
          const failed = results.filter((r) => !r.success).length;
          const errors = results.filter((r) => !r.success).map((r) => r.error || 'Unknown error');

          console.log(`[Portfolio] Import complete: ${successful} success, ${failed} failed`);

          // Log any errors
          errors.forEach((err) => {
            console.error(`[Portfolio] Failed image: ${err}`);
          });

          // Log result to audit trail
          await logImportResult(serviceClient, artistId, successful, failed, errors);

          // Cleanup old storage files using saved paths (not from DB)
          if (storagePaths.length > 0) {
            cleanupStoragePaths(storagePaths).catch((err) =>
              console.error('[Portfolio] Cleanup failed:', err)
            );
          }
        } catch (error) {
          console.error('[Portfolio] Background processing failed:', error);
          await logImportResult(serviceClient, artistId, 0, imageUrls.length, [
            `Background processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ]);
        }
      })(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Background job timeout')), BACKGROUND_TIMEOUT_MS)
      ),
    ]).catch((error) => {
      console.error('[Portfolio] Background job failed or timed out:', error);
    });

    // 7. Return immediately - processing happens in background
    return NextResponse.json({
      success: true,
      processing: true,
      message: `Processing ${selectedImageIds.length} images. They'll appear in search within a few minutes.`,
      count: selectedImageIds.length,
    });
  } catch (error) {
    console.error('[Portfolio] Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import portfolio' },
      { status: 500 }
    );
  }
}
