/**
 * Search artists by style profile
 *
 * GET /api/admin/styles/profiles/search?style=traditional&min_percentage=50&unclaimed_only=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { checkRateLimit } from '@/lib/redis/rate-limiter';

const VALID_STYLES = [
  'traditional', 'neo-traditional', 'fine-line', 'blackwork',
  'geometric', 'realism', 'japanese', 'watercolor', 'dotwork',
  'tribal', 'illustrative', 'surrealism', 'minimalist',
  'lettering', 'new-school', 'trash-polka', 'chicano',
  'biomechanical', 'ornamental', 'sketch'
];

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `admin:styles:search:${user.id}`,
      30,
      60000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const style = searchParams.get('style');

    if (!style) {
      return NextResponse.json({ error: 'style parameter required' }, { status: 400 });
    }

    // Validate style name
    if (!VALID_STYLES.includes(style)) {
      return NextResponse.json({ error: 'Invalid style name' }, { status: 400 });
    }

    // Parse and validate numeric params
    const minPercentageRaw = parseFloat(searchParams.get('min_percentage') || '40');
    const minPercentage = isNaN(minPercentageRaw) ? 40 : Math.max(0, Math.min(100, minPercentageRaw));

    const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
    const limit = isNaN(limitRaw) ? 50 : Math.min(100, Math.max(1, limitRaw));

    const unclaimedOnly = searchParams.get('unclaimed_only') === 'true';

    const adminClient = createAdminClient();

    // Query artists with this style profile (join artist_locations for location data)
    const query = adminClient
      .from('artist_style_profiles')
      .select(`
        artist_id,
        percentage,
        image_count,
        artists!inner(
          id,
          name,
          instagram_handle,
          follower_count,
          claimed_at,
          artist_locations!left(
            city,
            region,
            is_primary
          )
        )
      `)
      .eq('style_name', style)
      .gte('percentage', minPercentage)
      .order('percentage', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    interface LocationData {
      city: string | null;
      region: string | null;
      is_primary: boolean;
    }

    interface ArtistJoin {
      id: string;
      name: string;
      instagram_handle: string | null;
      follower_count: number | null;
      claimed_at: string | null;
      artist_locations: LocationData[] | null;
    }

    // Filter and format results
    const artists = (data || [])
      .map(row => {
        const artist = row.artists as unknown as ArtistJoin;
        // Extract primary location from artist_locations
        const primaryLoc = Array.isArray(artist.artist_locations)
          ? artist.artist_locations.find(l => l.is_primary) || artist.artist_locations[0]
          : null;
        return {
          artist_id: row.artist_id,
          name: artist.name,
          instagram_handle: artist.instagram_handle,
          city: primaryLoc?.city || null,
          state: primaryLoc?.region || null,
          follower_count: artist.follower_count,
          claimed_at: artist.claimed_at,
          percentage: row.percentage,
          image_count: row.image_count,
        };
      })
      .filter(a => !unclaimedOnly || !a.claimed_at);

    return NextResponse.json({
      artists,
      count: artists.length,
      filters: { style, minPercentage, unclaimedOnly }
    });
  } catch (error) {
    console.error('[Admin Style Search] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
