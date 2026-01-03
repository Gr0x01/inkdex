/**
 * Admin Artists List API
 *
 * Returns paginated list of artists for admin management.
 *
 * GET /api/admin/artists?page=1&limit=20&search=&city=&is_pro=&is_featured=
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';
    const tier = searchParams.get('tier');
    const isFeatured = searchParams.get('is_featured');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('artists')
      .select(
        `
        id,
        name,
        instagram_handle,
        city,
        state,
        is_featured,
        is_pro,
        verification_status,
        follower_count,
        slug,
        deleted_at
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null) // Only show non-deleted artists
      .order('name', { ascending: true });

    // Apply filters (sanitize inputs to prevent PostgREST injection)
    if (search) {
      // Limit search length and escape special PostgREST characters
      const trimmedSearch = search.slice(0, 100);
      const sanitizedSearch = trimmedSearch
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/[,()'"]/g, ''); // Remove filter-breaking characters
      // Search by name or Instagram handle
      query = query.or(`name.ilike.%${sanitizedSearch}%,instagram_handle.ilike.%${sanitizedSearch}%`);
    }

    // Location filter - expects "City, State" format from dropdown
    if (location) {
      const parts = location.split(', ');
      if (parts.length === 2) {
        const [city, state] = parts;
        query = query.eq('city', city).eq('state', state);
      }
    }

    // Tier filter: unclaimed, free (claimed + not pro), pro (claimed + pro)
    if (tier === 'unclaimed') {
      query = query.eq('verification_status', 'unclaimed');
    } else if (tier === 'free') {
      query = query.eq('verification_status', 'claimed').eq('is_pro', false);
    } else if (tier === 'pro') {
      query = query.eq('verification_status', 'claimed').eq('is_pro', true);
    }

    if (isFeatured === 'true') {
      query = query.eq('is_featured', true);
    } else if (isFeatured === 'false') {
      query = query.eq('is_featured', false);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: artists, error, count } = await query;

    if (error) {
      console.error('[Admin Artists] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch artists' },
        { status: 500 }
      );
    }

    // Get image counts for each artist
    const artistIds = artists?.map((a) => a.id) || [];
    let imageCounts: Record<string, number> = {};

    if (artistIds.length > 0) {
      const { data: countData } = await supabase
        .from('portfolio_images')
        .select('artist_id')
        .in('artist_id', artistIds)
        .eq('hidden', false);

      if (countData) {
        imageCounts = countData.reduce((acc, row) => {
          acc[row.artist_id] = (acc[row.artist_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Add image counts to artists
    const artistsWithCounts = artists?.map((artist) => ({
      ...artist,
      image_count: imageCounts[artist.id] || 0,
    }));

    const response = NextResponse.json({
      artists: artistsWithCounts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Artists] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
