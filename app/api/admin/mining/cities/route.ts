/**
 * City Distribution API
 *
 * Returns artist counts by city for mined artists.
 *
 * GET /api/admin/mining/cities
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

interface CityCount {
  city: string;
  count: number;
}

export async function GET() {
  try {
    // Verify admin access
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for data queries (bypasses RLS)
    const adminClient = createAdminClient();

    // Fetch artists with mining discovery sources
    const { data: artists, error } = await adminClient
      .from('artists')
      .select('city, discovery_source')
      .or('discovery_source.like.hashtag_%,discovery_source.like.follower_%');

    if (error) {
      console.error('[City Distribution] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch city distribution' },
        { status: 500 }
      );
    }

    // Group by city
    const cityMap = new Map<string, number>();
    for (const artist of artists) {
      const city = artist.city || 'Unknown';
      cityMap.set(city, (cityMap.get(city) || 0) + 1);
    }

    // Convert to sorted array
    const cities: CityCount[] = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const response = NextResponse.json({
      cities,
      total: artists.length,
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[City Distribution] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
