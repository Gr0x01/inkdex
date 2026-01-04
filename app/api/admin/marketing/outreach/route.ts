/**
 * Marketing Outreach Records API
 *
 * GET /api/admin/marketing/outreach - List outreach records with filters
 * POST /api/admin/marketing/outreach - Create new outreach records (select candidates)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Query params schema
const querySchema = z.object({
  status: z.enum(['pending', 'generated', 'posted', 'dm_sent', 'claimed', 'converted']).optional(),
  campaign: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// POST body schema - select new candidates
const selectCandidatesSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  minFollowers: z.number().min(0).default(10000),
  maxFollowers: z.number().min(0).default(50000),
  city: z.string().optional(),
  campaign: z.string().default('featured_artist_launch'),
});

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (uses session, no network call)
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = querySchema.parse(searchParams);

    const adminClient = createAdminClient();

    // Build query - specify FK to avoid ambiguity (paired_artist_id also references artists)
    let query = adminClient
      .from('marketing_outreach')
      .select(`
        id,
        artist_id,
        campaign_name,
        status,
        post_text,
        post_images,
        generated_at,
        posted_at,
        dm_sent_at,
        claimed_at,
        created_at,
        artists!marketing_outreach_artist_id_fkey (
          id,
          name,
          instagram_handle,
          city,
          state,
          follower_count,
          slug
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.campaign) {
      query = query.eq('campaign_name', params.campaign);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[Marketing Outreach] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      records: data,
      total: count,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    console.error('[Marketing Outreach] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (uses session, no network call)
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const params = selectCandidatesSchema.parse(body);

    const adminClient = createAdminClient();

    // Get existing outreach artist IDs
    const { data: existingOutreach } = await adminClient
      .from('marketing_outreach')
      .select('artist_id')
      .eq('campaign_name', params.campaign);

    const existingIds = new Set(existingOutreach?.map((o) => o.artist_id) || []);

    // Find candidates
    let query = adminClient
      .from('artists')
      .select(`
        id,
        name,
        instagram_handle,
        city,
        state,
        follower_count,
        slug,
        portfolio_images!inner (
          id,
          embedding
        )
      `)
      .gte('follower_count', params.minFollowers)
      .lte('follower_count', params.maxFollowers)
      .eq('verification_status', 'unclaimed')
      .is('deleted_at', null)
      .not('portfolio_images.embedding', 'is', null)
      .order('follower_count', { ascending: false })
      .limit(params.limit * 3); // Fetch extra to filter

    if (params.city) {
      query = query.eq('city', params.city);
    }

    const { data: artists, error: artistError } = await query;

    if (artistError) {
      console.error('[Marketing Outreach] Artist query error:', artistError);
      return NextResponse.json({ error: artistError.message }, { status: 500 });
    }

    // Filter out already-contacted and ensure minimum images
    const candidates = (artists || [])
      .filter((a) => !existingIds.has(a.id))
      .filter((a) => {
        const imgCount = Array.isArray(a.portfolio_images)
          ? a.portfolio_images.filter((img: { embedding: unknown }) => img.embedding).length
          : 0;
        return imgCount >= 4;
      })
      .slice(0, params.limit);

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new candidates found matching criteria',
        inserted: 0,
        candidates: [],
      });
    }

    // Insert outreach records
    const outreachRecords = candidates.map((c) => ({
      artist_id: c.id,
      campaign_name: params.campaign,
      outreach_type: 'instagram_dm',
      status: 'pending',
      notes: `Selected: ${c.follower_count?.toLocaleString() || 0} followers`,
    }));

    const { error: insertError } = await adminClient
      .from('marketing_outreach')
      .insert(outreachRecords);

    if (insertError) {
      console.error('[Marketing Outreach] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: candidates.length,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        instagram_handle: c.instagram_handle,
        city: c.city,
        state: c.state,
        follower_count: c.follower_count,
      })),
    });
  } catch (error) {
    console.error('[Marketing Outreach] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
