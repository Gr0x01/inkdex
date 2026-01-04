/**
 * Admin Artist Images API
 *
 * DELETE /api/admin/artists/[id]/images - Bulk delete selected images
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { invalidateCache } from '@/lib/redis/cache';
import { z } from 'zod';

const deleteImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(500),
});

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * DELETE /api/admin/artists/[id]/images
 * Bulk delete selected images from DB and storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: artistId } = await params;

    // Validate artist UUID format
    const artistIdResult = z.string().uuid('Invalid artist ID').safeParse(artistId);
    if (!artistIdResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    // Parse and validate body
    const body = await request.json();
    const result = deleteImagesSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { imageIds } = result.data;

    const serviceClient = getServiceClient();

    // Verify artist exists
    const { data: artist, error: artistError } = await serviceClient
      .from('artists')
      .select('id, name')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Fetch images to verify they belong to this artist and get storage paths
    const { data: images, error: fetchError } = await serviceClient
      .from('portfolio_images')
      .select(
        'id, storage_thumb_320, storage_thumb_640, storage_thumb_1280, storage_original_path'
      )
      .eq('artist_id', artistId)
      .in('id', imageIds);

    if (fetchError) {
      console.error('[Admin Images] Error fetching images:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No matching images found for this artist' },
        { status: 404 }
      );
    }

    // Check if any requested IDs don't belong to this artist
    const foundIds = new Set(images.map((img) => img.id));
    const missingIds = imageIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      console.warn(
        `[Admin Images] Some image IDs don't belong to artist ${artistId}: ${missingIds.join(', ')}`
      );
    }

    // Collect all storage paths
    const storagePaths: string[] = [];
    for (const img of images) {
      if (img.storage_thumb_320) storagePaths.push(img.storage_thumb_320);
      if (img.storage_thumb_640) storagePaths.push(img.storage_thumb_640);
      if (img.storage_thumb_1280) storagePaths.push(img.storage_thumb_1280);
      if (img.storage_original_path) storagePaths.push(img.storage_original_path);
    }

    // Delete from Supabase Storage
    // NOTE: We continue even if storage deletion fails (same rationale as artist deletion)
    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from('portfolio-images')
        .remove(storagePaths);

      if (storageError) {
        console.error('[Admin Images] Storage deletion error:', storageError);
        console.warn(
          `[Admin Images] Orphaned storage files for artist ${artistId}: ${storagePaths.length} files`
        );
      } else {
        console.log(
          `[Admin Images] Deleted ${storagePaths.length} storage files`
        );
      }
    }

    // Delete from DB
    const imageIdsToDelete = images.map((img) => img.id);
    const { error: deleteError } = await serviceClient
      .from('portfolio_images')
      .delete()
      .in('id', imageIdsToDelete);

    if (deleteError) {
      console.error('[Admin Images] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete images' },
        { status: 500 }
      );
    }

    // Audit log
    const clientInfo = getClientInfo(request);
    logAdminAction({
      adminEmail: user.email!,
      action: 'artist.images_deleted',
      resourceType: 'artist',
      resourceId: artistId,
      oldValue: {
        image_ids: imageIdsToDelete,
        images_deleted: imageIdsToDelete.length,
        storage_files_deleted: storagePaths.length,
      },
      newValue: { deleted: true },
      ...clientInfo,
    });

    console.log(
      `[Admin] ${user.email} deleted ${imageIdsToDelete.length} images from artist ${artist.name} (${artistId})`
    );

    // Invalidate caches
    invalidateCache('admin:artists:*');

    const response = NextResponse.json({
      success: true,
      deleted: {
        imagesDeleted: imageIdsToDelete.length,
        storageFilesDeleted: storagePaths.length,
      },
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Images] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
