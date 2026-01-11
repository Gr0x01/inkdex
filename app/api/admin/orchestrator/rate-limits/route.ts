import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export const dynamic = 'force-dynamic';

interface RateLimitEventRow {
  id: string;
  worker_id: string;
  ip_address: string;
  error_code: string;
  error_message: string;
  artist_handle: string;
  created_at: string;
  scraper_workers: { worker_name: string }[];
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const adminClient = createAdminClient();

    // Get rate limit events with worker info
    const { data: events, error } = await adminClient
      .from('scraper_rate_limit_events')
      .select(`
        id,
        worker_id,
        ip_address,
        error_code,
        error_message,
        artist_handle,
        created_at,
        scraper_workers!inner(worker_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Rate Limits] Error:', error);
      return NextResponse.json({ error: 'Failed to get rate limit events' }, { status: 500 });
    }

    // Transform to flatten worker name
    const transformed = events?.map((e: RateLimitEventRow) => ({
      id: e.id,
      workerId: e.worker_id,
      workerName: e.scraper_workers?.[0]?.worker_name,
      ipAddress: e.ip_address,
      errorCode: e.error_code,
      errorMessage: e.error_message,
      artistHandle: e.artist_handle,
      createdAt: e.created_at,
    })) || [];

    return NextResponse.json({ events: transformed });

  } catch (error) {
    console.error('[Rate Limits] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
