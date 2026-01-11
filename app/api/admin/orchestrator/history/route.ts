import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export const dynamic = 'force-dynamic';

interface OrchestratorLogRow {
  id: string;
  action: string;
  worker_id: string | null;
  worker_name: string | null;
  old_instance_id: string | null;
  new_instance_id: string | null;
  old_ip: string | null;
  new_ip: string | null;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
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

    // Get orchestrator log
    const { data: history, error } = await adminClient
      .from('scraper_orchestrator_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Orchestrator History] Error:', error);
      return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
    }

    // Transform for frontend
    const transformed = history?.map((h: OrchestratorLogRow) => ({
      id: h.id,
      action: h.action,
      workerId: h.worker_id,
      workerName: h.worker_name,
      oldInstanceId: h.old_instance_id,
      newInstanceId: h.new_instance_id,
      oldIp: h.old_ip,
      newIp: h.new_ip,
      reason: h.reason,
      details: h.details,
      createdAt: h.created_at,
    })) || [];

    return NextResponse.json({ history: transformed });

  } catch (error) {
    console.error('[Orchestrator History] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
