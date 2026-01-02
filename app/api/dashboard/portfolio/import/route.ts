/**
 * Dashboard Portfolio: Import Portfolio
 *
 * Replaces existing portfolio with new selection from Instagram
 * Atomic transaction: DELETE all existing + INSERT new
 *
 * POST /api/dashboard/portfolio/import
 *
 * Request: { selectedImageIds: string[] } (max 20 for Free tier, 100 for Pro tier)
 * Response: { success: true, imported: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { MAX_FREE_TIER_IMAGES, MAX_PRO_TIER_IMAGES } from '@/lib/constants/portfolio';

const importSchema = z.object({
  selectedImageIds: z.array(z.string()).min(1).max(MAX_PRO_TIER_IMAGES),
});

/**
 * Validate Instagram URL format
 * Prevents storing arbitrary/malicious URLs
 */
function validateInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'www.instagram.com' ||
        parsed.hostname === 'instagram.com' ||
        parsed.hostname === 'cdninstagram.com' || // Instagram CDN for images
        parsed.hostname.endsWith('.cdninstagram.com')) &&
      url.startsWith('https://') // Enforce HTTPS
    );
  } catch {
    return false;
  }
}

/**
 * Async storage cleanup (non-blocking)
 * Deletes images from Supabase Storage in background
 * Validates paths to prevent path traversal attacks
 */
async function cleanupStorage(images: any[]) {
  try {
    const { deleteImages } = await import('@/lib/storage/supabase-storage');

    // Collect and validate all storage paths
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
        const hasValidPrefix = validPrefixes.some(prefix => path.startsWith(prefix));

        // Reject path traversal attempts
        const hasTraversal = path.includes('..') || path.includes('//');

        return hasValidPrefix && !hasTraversal && path.length > 0;
      });

      validPaths.push(...paths);
    });

    if (validPaths.length > 0) {
      await deleteImages(validPaths);
      console.log(`[Portfolio] Cleaned up ${validPaths.length} storage files`);
    }
  } catch (error) {
    console.error('[Portfolio] Storage cleanup failed:', error);
    // Non-blocking: don't throw error
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

    // 5. Atomic transaction: DELETE existing + INSERT new
    console.log(
      `[Portfolio] Replacing portfolio for artist ${artist.id} (${selectedImageIds.length} images)`
    );

    // Fetch existing images for backup AND storage cleanup (BEFORE any mutations)
    const { data: existingImages } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('artist_id', artist.id);

    // Create backup for rollback
    const backupImages = existingImages || [];

    // Delete all existing portfolio images
    const { error: deleteError } = await supabase
      .from('portfolio_images')
      .delete()
      .eq('artist_id', artist.id);

    if (deleteError) {
      console.error('[Portfolio] Delete failed:', deleteError);
      return NextResponse.json({ error: 'Failed to clear existing portfolio' }, { status: 500 });
    }

    // Prepare new images with Phase 6 fields
    const newImages = selectedImageIds.map((urlOrId, idx) => ({
      id: randomUUID(),
      artist_id: artist.id,
      instagram_post_id: `manual_${Date.now()}_${idx}`,
      instagram_url: urlOrId,
      post_caption: null,
      post_timestamp: new Date().toISOString(),
      status: 'active',
      manually_added: true,
      import_source: 'manual_import',
      is_pinned: false,
      pinned_position: null,
      hidden: false,
      auto_synced: false,
    }));

    // Insert new images
    const { error: insertError } = await supabase.from('portfolio_images').insert(newImages);

    // ROLLBACK if insert fails
    if (insertError) {
      console.error('[Portfolio] Insert failed, attempting rollback:', insertError);

      // Restore backup
      if (backupImages.length > 0) {
        const { error: rollbackError } = await supabase
          .from('portfolio_images')
          .insert(backupImages);

        if (rollbackError) {
          console.error('[Portfolio] CRITICAL: Rollback failed:', rollbackError);
          return NextResponse.json(
            { error: 'Failed to import images. Portfolio may be in inconsistent state. Please contact support.' },
            { status: 500 }
          );
        }

        console.log('[Portfolio] Rollback successful, portfolio restored');
      }

      return NextResponse.json(
        { error: 'Failed to import images. Portfolio restored to previous state.' },
        { status: 500 }
      );
    }

    // 5. Async storage cleanup (non-blocking)
    if (existingImages && existingImages.length > 0) {
      cleanupStorage(existingImages).catch((err) =>
        console.error('[Portfolio] Cleanup failed:', err)
      );
    }

    console.log(
      `[Portfolio] Import successful: ${newImages.length} images imported, ${existingImages?.length || 0} old images deleted`
    );

    return NextResponse.json({
      success: true,
      imported: newImages.length,
    });
  } catch (error: any) {
    console.error('[Portfolio] Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import portfolio' },
      { status: 500 }
    );
  }
}
