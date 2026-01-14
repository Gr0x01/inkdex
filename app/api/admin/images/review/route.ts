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
 * GET /api/admin/images/review - Get flagged images for review
 * Query params:
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 *   - minConfidence: number (default 0)
 *   - maxConfidence: number (default 0.5)
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
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');
  const maxConfidence = parseFloat(searchParams.get('maxConfidence') || '0.5');

  try {
    const serviceClient = getServiceClient();

    // Get total count of flagged images
    const { count: totalFlagged } = await serviceClient
      .from('portfolio_images')
      .select('*', { count: 'exact', head: true })
      .eq('is_tattoo', false)
      .gte('tattoo_confidence', minConfidence)
      .lt('tattoo_confidence', maxConfidence);

    // Get flagged images with artist info
    const { data: images, error } = await serviceClient
      .from('portfolio_images')
      .select(`
        id,
        artist_id,
        tattoo_confidence,
        storage_thumb_320,
        storage_thumb_640,
        storage_original_path,
        storage_thumb_1280,
        created_at,
        artist:artists!inner(
          id,
          name,
          instagram_handle,
          slug,
          claimed_by_user_id
        )
      `)
      .eq('is_tattoo', false)
      .gte('tattoo_confidence', minConfidence)
      .lt('tattoo_confidence', maxConfidence)
      .order('tattoo_confidence', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching flagged images:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build image URLs
    const imagesWithUrls = (images || []).map((image) => {
      const thumbnailPath = image.storage_thumb_640 || image.storage_thumb_320;
      const thumbnailUrl = thumbnailPath
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio-images/${thumbnailPath}`
        : null;

      // Artist comes from inner join - cast to single object type
      const artist = image.artist as unknown as {
        id: string;
        name: string;
        instagram_handle: string;
        slug: string;
        claimed_by_user_id: string | null;
      };

      return {
        id: image.id,
        artistId: image.artist_id,
        confidence: image.tattoo_confidence,
        thumbnailUrl,
        createdAt: image.created_at,
        artist: {
          name: artist?.name,
          handle: artist?.instagram_handle,
          slug: artist?.slug,
          isClaimed: !!artist?.claimed_by_user_id,
        },
        storagePaths: {
          original: image.storage_original_path,
          thumb320: image.storage_thumb_320,
          thumb640: image.storage_thumb_640,
          thumb1280: image.storage_thumb_1280,
        },
      };
    });

    // Get stats
    const { count: totalKept } = await serviceClient
      .from('portfolio_images')
      .select('*', { count: 'exact', head: true })
      .eq('is_tattoo', true);

    const { count: totalUnverified } = await serviceClient
      .from('portfolio_images')
      .select('*', { count: 'exact', head: true })
      .is('is_tattoo', null);

    return NextResponse.json({
      images: imagesWithUrls,
      stats: {
        total: totalFlagged || 0,
        remaining: (totalFlagged || 0) - offset,
        kept: totalKept || 0,
        unverified: totalUnverified || 0,
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < (totalFlagged || 0),
      },
    });
  } catch (error) {
    console.error('Error in image review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
