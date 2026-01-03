/**
 * Admin Artists Stats API
 * Returns aggregate counts for artist dashboard
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all artists in one query
    const { data: artists, error } = await supabase
      .from('artists')
      .select('verification_status, is_pro')
      .is('deleted_at', null);

    if (error) {
      console.error('[Admin Artists Stats] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate counts
    let total = 0;
    let unclaimed = 0;
    let claimed = 0;
    let pro = 0;

    for (const artist of artists || []) {
      total++;
      if (artist.verification_status === 'unclaimed') {
        unclaimed++;
      } else if (artist.verification_status === 'claimed') {
        if (artist.is_pro) {
          pro++;
        } else {
          claimed++;
        }
      }
    }

    const response = NextResponse.json({
      total,
      unclaimed,
      claimed,
      pro,
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Artists Stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
