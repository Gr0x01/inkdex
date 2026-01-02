/**
 * Dashboard Portfolio: Delete Image
 *
 * Deletes a single portfolio image after verifying ownership
 *
 * POST /api/dashboard/portfolio/delete
 *
 * Request: { imageId: string }
 * Response: { success: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const deleteSchema = z.object({
  imageId: z.string().uuid(),
});

/**
 * Async storage cleanup (non-blocking)
 * Deletes image files from Supabase Storage in background
 * Validates paths to prevent path traversal attacks
 */
async function cleanupStorage(image: any) {
  try {
    const { deleteImages } = await import('@/lib/storage/supabase-storage');

    // Collect and validate all storage paths
    const validPaths = [
      image.storage_original_path,
      image.storage_thumb_320,
      image.storage_thumb_640,
      image.storage_thumb_1280,
    ].filter((path): path is string => {
      if (!path || typeof path !== 'string') return false;

      // Only allow paths within expected folders
      const validPrefixes = ['original/', 'thumbs/320/', 'thumbs/640/', 'thumbs/1280/'];
      const hasValidPrefix = validPrefixes.some(prefix => path.startsWith(prefix));

      // Reject path traversal attempts
      const hasTraversal = path.includes('..') || path.includes('//');

      return hasValidPrefix && !hasTraversal && path.length > 0;
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
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request body
    const body = await request.json();
    const validated = deleteSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { imageId } = validated.data;

    // 3. Fetch image and storage paths (first query)
    const { data: image, error: fetchError } = await supabase
      .from('portfolio_images')
      .select('id, artist_id, storage_original_path, storage_thumb_320, storage_thumb_640, storage_thumb_1280')
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found or access denied' }, { status: 404 });
    }

    // 4. Verify ownership (second query - prevents SQL injection)
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('claimed_by_user_id')
      .eq('id', image.artist_id)
      .single();

    if (artistError || !artist || artist.claimed_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Image not found or access denied' }, { status: 404 });
    }

    // 5. Delete from database
    const { error: deleteError } = await supabase
      .from('portfolio_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      console.error('[Portfolio] Delete failed:', deleteError);
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    // 6. Async storage cleanup (non-blocking)
    cleanupStorage(image).catch((err) => console.error('[Portfolio] Cleanup failed:', err));

    console.log(`[Portfolio] Image deleted: ${imageId} (artist: ${image.artist_id})`);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[Portfolio] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}
