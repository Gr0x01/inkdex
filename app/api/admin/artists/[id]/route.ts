/**
 * Admin Artist Detail API
 *
 * GET /api/admin/artists/[id] - Fetch full artist details with images
 * PATCH /api/admin/artists/[id] - Update is_pro, is_featured
 * DELETE /api/admin/artists/[id] - Hard delete artist + storage files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { invalidateCache } from '@/lib/redis/cache';
import { z } from 'zod';

const updateSchema = z.object({
  is_pro: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  feature_days: z.number().int().min(1).max(365).optional(),
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
 * GET /api/admin/artists/[id]
 * Fetch full artist details with all portfolio images
 */
export async function GET(
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

    const { id } = await params;

    // Validate UUID format
    const idResult = z.string().uuid('Invalid artist ID').safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    // Fetch artist
    const { data: artist, error: artistError } = await serviceClient
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Fetch all portfolio images
    const { data: images, error: imagesError } = await serviceClient
      .from('portfolio_images')
      .select(
        'id, instagram_post_id, storage_thumb_320, storage_thumb_640, storage_thumb_1280, storage_original_path, is_pinned, hidden, embedding, likes_count, created_at'
      )
      .eq('artist_id', id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (imagesError) {
      console.error('[Admin Artist] Error fetching images:', imagesError);
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      );
    }

    // Fetch analytics summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: analyticsData } = await serviceClient
      .from('artist_analytics')
      .select('profile_views, image_views, instagram_clicks, booking_link_clicks, search_appearances')
      .eq('artist_id', id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    const analytics = {
      profileViews: 0,
      imageViews: 0,
      instagramClicks: 0,
      bookingClicks: 0,
      searchAppearances: 0,
    };

    if (analyticsData) {
      for (const row of analyticsData) {
        analytics.profileViews += row.profile_views || 0;
        analytics.imageViews += row.image_views || 0;
        analytics.instagramClicks += row.instagram_clicks || 0;
        analytics.bookingClicks += row.booking_link_clicks || 0;
        analytics.searchAppearances += row.search_appearances || 0;
      }
    }

    // Fetch style profile
    const { data: stylesData } = await serviceClient
      .from('artist_style_profiles')
      .select('style_name, percentage, image_count')
      .eq('artist_id', id)
      .order('percentage', { ascending: false })
      .limit(5);

    // Transform images to include has_embedding flag
    const transformedImages = (images || []).map((img) => ({
      id: img.id,
      instagram_post_id: img.instagram_post_id,
      storage_thumb_320: img.storage_thumb_320,
      storage_thumb_640: img.storage_thumb_640,
      storage_thumb_1280: img.storage_thumb_1280,
      storage_original_path: img.storage_original_path,
      is_pinned: img.is_pinned,
      hidden: img.hidden,
      has_embedding: img.embedding !== null,
      likes_count: img.likes_count,
      created_at: img.created_at,
    }));

    const response = NextResponse.json({
      artist,
      images: transformedImages,
      imageCount: transformedImages.length,
      analytics,
      styles: stylesData || [],
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Artist] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/artists/[id]
 * Update artist fields (is_pro, is_featured)
 */
export async function PATCH(
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

    const { id } = await params;

    // Validate UUID format
    const idResult = z.string().uuid('Invalid artist ID').safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    // Parse and validate body
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { feature_days, ...updates } = result.data;

    if (Object.keys(updates).length === 0 && feature_days === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Fetch current artist state for audit log
    const { data: oldArtist, error: fetchError } = await serviceClient
      .from('artists')
      .select('id, name, is_pro, is_featured, featured_at, featured_expires_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !oldArtist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Build the update object
    const dbUpdates: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // If featuring with a duration, calculate expiration
    if (updates.is_featured === true && feature_days) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + feature_days);

      dbUpdates.featured_at = now.toISOString();
      dbUpdates.featured_expires_at = expiresAt.toISOString();
    }

    // If unfeaturing, clear expiration dates
    if (updates.is_featured === false) {
      dbUpdates.featured_at = null;
      dbUpdates.featured_expires_at = null;
    }

    // Update the artist
    const { data: artist, error: updateError } = await serviceClient
      .from('artists')
      .update(dbUpdates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, name, is_pro, is_featured, featured_at, featured_expires_at')
      .single();

    if (updateError) {
      console.error('[Admin Artist] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update artist' },
        { status: 500 }
      );
    }

    // Determine audit action(s)
    const clientInfo = getClientInfo(request);

    if (updates.is_pro !== undefined && updates.is_pro !== oldArtist.is_pro) {
      logAdminAction({
        adminEmail: user.email!,
        action: 'artist.toggle_pro',
        resourceType: 'artist',
        resourceId: id,
        oldValue: { is_pro: oldArtist.is_pro },
        newValue: { is_pro: updates.is_pro },
        ...clientInfo,
      });
      console.log(
        `[Admin] ${user.email} set is_pro=${updates.is_pro} for artist ${artist.name} (${id})`
      );
    }

    if (
      updates.is_featured !== undefined &&
      updates.is_featured !== oldArtist.is_featured
    ) {
      const newValue: Record<string, unknown> = { is_featured: updates.is_featured };
      if (feature_days) {
        newValue.feature_days = feature_days;
        newValue.featured_expires_at = artist.featured_expires_at;
      }

      logAdminAction({
        adminEmail: user.email!,
        action: updates.is_featured ? 'artist.feature' : 'artist.unfeature',
        resourceType: 'artist',
        resourceId: id,
        oldValue: { is_featured: oldArtist.is_featured },
        newValue,
        ...clientInfo,
      });
      console.log(
        `[Admin] ${user.email} set is_featured=${updates.is_featured}${feature_days ? ` for ${feature_days} days` : ''} for artist ${artist.name} (${id})`
      );
    }

    // Invalidate caches
    invalidateCache('admin:artists:*');

    const response = NextResponse.json({
      success: true,
      artist,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Artist] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/artists/[id]
 * Hard delete artist and all storage files
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

    const { id } = await params;

    // Validate UUID format
    const idResult = z.string().uuid('Invalid artist ID').safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    // Fetch artist for audit log (only non-soft-deleted artists)
    const { data: artist, error: fetchError } = await serviceClient
      .from('artists')
      .select('id, name, instagram_handle')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Fetch all portfolio images to get storage paths
    const { data: images, error: imagesError } = await serviceClient
      .from('portfolio_images')
      .select(
        'storage_thumb_320, storage_thumb_640, storage_thumb_1280, storage_original_path'
      )
      .eq('artist_id', id);

    if (imagesError) {
      console.error('[Admin Artist] Error fetching images for deletion:', imagesError);
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      );
    }

    // Collect all storage paths
    const storagePaths: string[] = [];
    for (const img of images || []) {
      if (img.storage_thumb_320) storagePaths.push(img.storage_thumb_320);
      if (img.storage_thumb_640) storagePaths.push(img.storage_thumb_640);
      if (img.storage_thumb_1280) storagePaths.push(img.storage_thumb_1280);
      if (img.storage_original_path) storagePaths.push(img.storage_original_path);
    }

    // Delete from Supabase Storage (batch delete)
    // NOTE: We continue even if storage deletion fails because:
    // 1. DB cleanup is higher priority (removes from search, prevents further access)
    // 2. Orphaned storage files can be cleaned up via manual audit
    // 3. Failing fast would leave artist in DB indefinitely if storage is temporarily unavailable
    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from('portfolio-images')
        .remove(storagePaths);

      if (storageError) {
        console.error('[Admin Artist] Storage deletion error:', storageError);
        // Log for audit trail - storage cleanup may be needed
        console.warn(
          `[Admin Artist] Orphaned storage files for artist ${artist.name}: ${storagePaths.length} files`
        );
      } else {
        console.log(
          `[Admin Artist] Deleted ${storagePaths.length} storage files for artist ${artist.name}`
        );
      }
    }

    // Delete or nullify related records without ON DELETE CASCADE
    // 1. pipeline_jobs - delete (audit data, not needed after artist deletion)
    const { error: pipelineJobsError } = await serviceClient
      .from('pipeline_jobs')
      .delete()
      .eq('artist_id', id);

    if (pipelineJobsError) {
      console.error('[Admin Artist] Pipeline jobs delete error:', pipelineJobsError);
    }

    // 2. searches.artist_id_source - set null (preserve search history)
    const { error: searchesError } = await serviceClient
      .from('searches')
      .update({ artist_id_source: null })
      .eq('artist_id_source', id);

    if (searchesError) {
      console.error('[Admin Artist] Searches update error:', searchesError);
    }

    // 3. marketing_outreach.paired_artist_id - set null (preserve campaign history)
    const { error: outreachError } = await serviceClient
      .from('marketing_outreach')
      .update({ paired_artist_id: null })
      .eq('paired_artist_id', id);

    if (outreachError) {
      console.error('[Admin Artist] Outreach update error:', outreachError);
    }

    // Delete artist from DB (cascade deletes portfolio_images, saved_artists)
    const { error: deleteError } = await serviceClient
      .from('artists')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Admin Artist] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete artist' },
        { status: 500 }
      );
    }

    // Audit log
    const clientInfo = getClientInfo(request);
    logAdminAction({
      adminEmail: user.email!,
      action: 'artist.hard_delete',
      resourceType: 'artist',
      resourceId: id,
      oldValue: {
        name: artist.name,
        instagram_handle: artist.instagram_handle,
        image_count: images?.length || 0,
        storage_files_deleted: storagePaths.length,
      },
      newValue: { deleted: true },
      ...clientInfo,
    });

    console.log(
      `[Admin] ${user.email} hard deleted artist ${artist.name} (${id}) with ${images?.length || 0} images`
    );

    // Invalidate caches
    invalidateCache('admin:artists:*');

    const response = NextResponse.json({
      success: true,
      deleted: {
        artistId: id,
        artistName: artist.name,
        imagesDeleted: images?.length || 0,
        storageFilesDeleted: storagePaths.length,
      },
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Artist] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
