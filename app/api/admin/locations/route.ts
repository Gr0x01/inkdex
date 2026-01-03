/**
 * Admin Locations API
 * Returns unique city/state combinations with artist counts
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

    // Get unique city/state combinations with counts
    const { data, error } = await supabase
      .from('artists')
      .select('city, state')
      .is('deleted_at', null)
      .not('city', 'is', null)
      .not('state', 'is', null);

    if (error) {
      console.error('[Admin Locations] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Aggregate counts
    const locationCounts: Record<string, { city: string; state: string; count: number }> = {};

    for (const row of data || []) {
      if (row.city && row.state) {
        const key = `${row.city}|${row.state}`;
        if (!locationCounts[key]) {
          locationCounts[key] = { city: row.city, state: row.state, count: 0 };
        }
        locationCounts[key].count++;
      }
    }

    // Sort by count descending
    const locations = Object.values(locationCounts).sort((a, b) => b.count - a.count);

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('[Admin Locations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
