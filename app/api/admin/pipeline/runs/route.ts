import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export async function GET(request: Request) {
  // Verify admin access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const jobType = searchParams.get('type'); // Filter by job type

  const adminClient = createAdminClient();

  try {
    let query = adminClient
      .from('pipeline_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (jobType && ['scraping', 'processing', 'embeddings'].includes(jobType)) {
      query = query.eq('job_type', jobType);
    }

    const { data, error } = await query;

    if (error) throw error;

    const runs = (data || []).map((run) => ({
      id: run.id,
      jobType: run.job_type,
      status: run.status,
      targetScope: run.target_scope,
      targetCity: run.target_city,
      totalItems: run.total_items || 0,
      processedItems: run.processed_items || 0,
      failedItems: run.failed_items || 0,
      triggeredBy: run.triggered_by,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      createdAt: run.created_at,
      errorMessage: run.error_message,
      resultSummary: run.result_summary,
    }));

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Pipeline runs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline runs' },
      { status: 500 }
    );
  }
}
