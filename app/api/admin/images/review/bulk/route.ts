import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin/whitelist';

function getServiceClient() {
  return createSupabaseClient(
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

interface BulkActionRequest {
  action: 'keep' | 'delete';
  imageIds: string[];
}

/**
 * POST /api/admin/images/review/bulk - Bulk approve or delete flagged images
 * Body: { action: 'keep' | 'delete', imageIds: string[] }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check admin auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: BulkActionRequest = await request.json();
    const { action, imageIds } = body;

    if (!action || !['keep', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "keep" or "delete"' },
        { status: 400 }
      );
    }

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'imageIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Limit bulk operations
    if (imageIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 images per request' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    if (action === 'keep') {
      // Mark images as verified tattoos
      const { error: updateError, count } = await serviceClient
        .from('portfolio_images')
        .update({ is_tattoo: true })
        .in('id', imageIds);

      if (updateError) {
        console.error('Error updating images:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log(`[Admin Review] Kept ${count} images as tattoos (by ${user.email})`);
      return NextResponse.json({ success: true, action: 'keep', count: count || imageIds.length });
    }

    // action === 'delete'
    // First, get storage paths for all images
    const { data: images, error: fetchError } = await serviceClient
      .from('portfolio_images')
      .select(`
        id,
        artist_id,
        storage_original_path,
        storage_thumb_320,
        storage_thumb_640,
        storage_thumb_1280,
        artist:artists!inner(claimed_by_user_id)
      `)
      .in('id', imageIds);

    if (fetchError) {
      console.error('Error fetching images:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Filter out claimed artist images
    // Artist comes from inner join - cast properly
    const deletableImages = (images || []).filter((img) => {
      const artist = img.artist as unknown as { claimed_by_user_id: string | null };
      return !artist?.claimed_by_user_id;
    });
    const skippedCount = (images?.length || 0) - deletableImages.length;

    if (skippedCount > 0) {
      console.log(`[Admin Review] Skipping ${skippedCount} images from claimed artists`);
    }

    if (deletableImages.length === 0) {
      return NextResponse.json({
        success: true,
        action: 'delete',
        deleted: 0,
        skipped: skippedCount,
        message: 'All images belong to claimed artists and cannot be deleted',
      });
    }

    // Collect all storage paths
    const storagePaths: string[] = [];
    for (const img of deletableImages) {
      if (img.storage_original_path) storagePaths.push(img.storage_original_path);
      if (img.storage_thumb_320) storagePaths.push(img.storage_thumb_320);
      if (img.storage_thumb_640) storagePaths.push(img.storage_thumb_640);
      if (img.storage_thumb_1280) storagePaths.push(img.storage_thumb_1280);
    }

    // Delete from storage (best effort)
    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from('portfolio-images')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage deletion error (continuing anyway):', storageError);
      }
    }

    // Delete from database
    const deletableIds = deletableImages.map((img) => img.id);
    const { error: deleteError, count: deletedCount } = await serviceClient
      .from('portfolio_images')
      .delete()
      .in('id', deletableIds);

    if (deleteError) {
      console.error('Error deleting images:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(
      `[Admin Review] Deleted ${deletedCount} images, ${storagePaths.length} storage files (by ${user.email})`
    );

    return NextResponse.json({
      success: true,
      action: 'delete',
      deleted: deletedCount || deletableIds.length,
      skipped: skippedCount,
      storageFilesDeleted: storagePaths.length,
    });
  } catch (error) {
    console.error('Error in bulk action API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
