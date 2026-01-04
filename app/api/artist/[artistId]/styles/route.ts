/**
 * Get artist style profile
 *
 * GET /api/artist/[artistId]/styles
 *
 * Note: Style data is free for all claimed users (not Pro-gated).
 * This gives free users value and encourages engagement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limiter';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;

    // Validate UUID format
    if (!UUID_REGEX.test(artistId)) {
      return NextResponse.json({ error: 'Invalid artist ID format' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `api:artist-styles:${user.id}`,
      60,
      60000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Verify user owns this artist profile
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, claimed_by_user_id')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    if (artist.claimed_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get style profiles
    const { data: profiles, error } = await supabase
      .from('artist_style_profiles')
      .select('style_name, percentage, image_count')
      .eq('artist_id', artistId)
      .order('percentage', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      styles: profiles || [],
      totalImages: profiles?.reduce((sum, p) => sum + p.image_count, 0) || 0,
    });
  } catch (error) {
    console.error('[Artist Styles] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
