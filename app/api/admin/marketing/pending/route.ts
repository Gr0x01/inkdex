/**
 * Pending Marketing Records API
 *
 * GET /api/admin/marketing/pending - Fetch outreach records needing captions
 *
 * Returns records that have been pushed to Airtable but don't have captions yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const adminClient = createAdminClient();

    // Fetch outreach records that don't have generated content yet
    // Status 'pending' or 'generated' without post_text means needs caption
    const { data: records, error, count } = await adminClient
      .from('marketing_outreach')
      .select(
        `
        id,
        artist_id,
        status,
        airtable_record_id,
        artists!marketing_outreach_artist_id_fkey (
          instagram_handle,
          name
        )
      `,
        { count: 'exact' }
      )
      .is('post_text', null)
      .in('status', ['pending', 'generated'])
      .not('airtable_record_id', 'is', null)
      .limit(limit);

    if (error) {
      console.error('[Marketing Pending] Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to simpler format
    const pendingRecords = (records || []).map((r) => {
      const artist = r.artists as unknown as { instagram_handle: string; name: string | null } | null;
      return {
        id: r.id,
        instagram_handle: artist?.instagram_handle || 'unknown',
        name: artist?.name || null,
      };
    });

    return NextResponse.json({
      count: count || 0,
      records: pendingRecords,
    });
  } catch (error) {
    console.error('[Marketing Pending] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
