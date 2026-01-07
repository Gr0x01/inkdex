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

/**
 * GET /api/admin/label - Get next unlabeled image for labeling
 * Query params:
 *   - strategy: 'random' | 'ambiguous' | 'style' (default: 'random')
 *   - style: style name to focus on (when strategy='style')
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check admin auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const strategy = searchParams.get('strategy') || 'random';
  const focusStyle = searchParams.get('style');

  try {
    // Use service client to read labeled images (RLS blocks anon/auth reads)
    const serviceClient = getServiceClient();

    // First, get already-labeled image IDs
    const { data: labeledImages } = await serviceClient
      .from('style_training_labels')
      .select('image_id');

    const labeledIds = (labeledImages || []).map((l) => l.image_id);

    // Get a random unlabeled image with its current style tags
    let query = supabase
      .from('portfolio_images')
      .select(`
        id,
        storage_thumb_320,
        storage_thumb_640,
        artist:artists!inner(
          id,
          name,
          instagram_handle
        )
      `)
      .eq('status', 'active')
      .not('embedding', 'is', null);

    // Exclude labeled images if any exist
    if (labeledIds.length > 0) {
      query = query.not('id', 'in', `(${labeledIds.join(',')})`);
    }

    const { data: image, error } = await query
      .limit(1)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('Error fetching image:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!image) {
      return NextResponse.json({ image: null, message: 'No more unlabeled images' });
    }

    // Get current auto-generated style tags for this image
    const { data: currentTags } = await supabase
      .from('image_style_tags')
      .select('style_name, confidence')
      .eq('image_id', image.id)
      .order('confidence', { ascending: false });

    // Build thumbnail URL
    const thumbnailPath = image.storage_thumb_640 || image.storage_thumb_320;
    const thumbnailUrl = thumbnailPath
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio-images/${thumbnailPath}`
      : null;

    return NextResponse.json({
      image: {
        id: image.id,
        thumbnailUrl,
        artist: image.artist,
        currentTags: currentTags || [],
      },
    });
  } catch (error) {
    console.error('Error in label API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/label - Delete a non-tattoo image (only if artist not claimed)
 * Body: { imageId: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  // Check admin auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    // Get the image and check if artist is claimed
    const { data: image, error: fetchError } = await serviceClient
      .from('portfolio_images')
      .select(`
        id,
        artist_id,
        storage_thumb_320,
        storage_thumb_640,
        storage_thumb_1280,
        storage_original_path
      `)
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Check if artist is claimed (has user_id)
    const { data: artist } = await serviceClient
      .from('artists')
      .select('user_id')
      .eq('id', image.artist_id)
      .single();

    if (artist?.user_id) {
      return NextResponse.json(
        { error: 'Cannot delete images from claimed artists' },
        { status: 403 }
      );
    }

    // Collect storage paths to delete
    const storagePaths: string[] = [];
    if (image.storage_thumb_320) storagePaths.push(image.storage_thumb_320);
    if (image.storage_thumb_640) storagePaths.push(image.storage_thumb_640);
    if (image.storage_thumb_1280) storagePaths.push(image.storage_thumb_1280);
    if (image.storage_original_path) storagePaths.push(image.storage_original_path);

    // Delete from storage
    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from('portfolio-images')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue anyway - orphaned files are acceptable
      }
    }

    // Hard delete the image from DB
    const { error: deleteError } = await serviceClient
      .from('portfolio_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      console.error('Error deleting image:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`[Admin Label] Deleted image ${imageId} (${storagePaths.length} storage files)`)

    return NextResponse.json({ success: true, deleted: imageId });
  } catch (error) {
    console.error('Error in label DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/label - Save a style label for an image
 * Body: { imageId, styles: string[], skipped?: boolean, notes?: string }
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
    const body = await request.json();
    const { imageId, styles, skipped, notes } = body;

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    if (!skipped && (!styles || !Array.isArray(styles))) {
      return NextResponse.json({ error: 'styles must be an array' }, { status: 400 });
    }

    // Use service client to bypass RLS
    const serviceClient = getServiceClient();

    console.log('[Label POST] Saving label:', { imageId, styles, skipped, email: user.email });

    // Upsert the label
    const { data, error } = await serviceClient
      .from('style_training_labels')
      .upsert(
        {
          image_id: imageId,
          labeled_by: user.email,
          styles: styles || [],
          skipped: skipped || false,
          notes: notes || null,
        },
        { onConflict: 'image_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Label POST] Error saving label:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Label POST] Saved successfully:', data?.id);
    return NextResponse.json({ success: true, label: data });
  } catch (error) {
    console.error('Error in label POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
