/**
 * Admin Style Leaderboard API
 *
 * Returns top 25 artists for a given style, ranked by embedding similarity.
 * Used for marketing curation (featured artists, social media promotion).
 *
 * GET /api/admin/styles/leaderboard?style=traditional
 * GET /api/admin/styles/leaderboard (no style = returns list of available styles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { getCached } from '@/lib/redis/cache';

interface StyleSeed {
  style_name: string;
  display_name: string;
  description: string | null;
}

interface LeaderboardArtist {
  artist_id: string;
  artist_name: string;
  instagram_handle: string | null;
  city: string | null;
  state: string | null;
  similarity_score: number;
  best_image_url: string | null;
  is_pro: boolean;
  is_featured: boolean;
}

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

    const { searchParams } = new URL(request.url);
    const styleSlug = searchParams.get('style');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const adminClient = createAdminClient();

    // If no style specified, return list of available styles
    if (!styleSlug) {
      const cacheKey = 'admin:styles:list';

      const styles = await getCached(
        cacheKey,
        { ttl: 300, pattern: 'admin:styles' }, // 5-minute cache
        async () => {
          const { data, error } = await adminClient
            .from('style_seeds')
            .select('style_name, display_name, description')
            .order('style_name');

          if (error) {
            throw new Error(`Failed to fetch styles: ${error.message}`);
          }

          return data as StyleSeed[];
        }
      );

      const response = NextResponse.json({ styles });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    // Validate style slug format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(styleSlug)) {
      return NextResponse.json(
        { error: 'Invalid style slug format. Use lowercase with hyphens.' },
        { status: 400 }
      );
    }

    // Fetch leaderboard for specific style
    const cacheKey = `admin:styles:leaderboard:${styleSlug}:${limit}`;

    const result = await getCached(
      cacheKey,
      { ttl: 300, pattern: 'admin:styles' }, // 5-minute cache
      async () => {
        // Call the RPC function
        const { data, error } = await adminClient.rpc('get_top_artists_by_style', {
          p_style_slug: styleSlug,
          p_limit: limit,
        });

        if (error) {
          // Check if it's a validation error from the function
          if (error.message.includes('Invalid')) {
            throw new Error(error.message);
          }
          throw new Error(`RPC error: ${error.message}`);
        }

        // Also fetch the style info for display
        const { data: styleData } = await adminClient
          .from('style_seeds')
          .select('style_name, display_name, description')
          .eq('style_name', styleSlug)
          .single();

        return {
          style: styleData as StyleSeed | null,
          artists: (data || []) as LeaderboardArtist[],
          count: data?.length || 0,
        };
      }
    );

    // Check if style exists
    if (!result.style) {
      return NextResponse.json(
        { error: `Style '${styleSlug}' not found` },
        { status: 404 }
      );
    }

    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Style Leaderboard] Error:', error);

    // Return validation errors with proper status
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
