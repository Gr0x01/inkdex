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

    // Get aggregated city/state/country counts directly from SQL (avoids row limit issues)
    const { data, error } = await supabase.rpc('get_admin_location_counts');

    if (error) {
      console.error('[Admin Locations] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Map to expected format
    const locations = (data || []).map((row: { city: string; region: string; country_code: string; count: number }) => ({
      city: row.city,
      state: row.region,
      countryCode: row.country_code || 'US',
      count: Number(row.count),
    }));

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('[Admin Locations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
