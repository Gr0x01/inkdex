import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export const dynamic = 'force-dynamic';

interface FleetWorker {
  status: string;
}

export async function GET() {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get fleet status
    const { data: workers, error: workersError } = await adminClient.rpc('get_fleet_status');
    if (workersError) {
      console.error('[Orchestrator Status] Fleet error:', workersError);
      return NextResponse.json({ error: 'Failed to get fleet status' }, { status: 500 });
    }

    // Get queue stats
    const { data: queueStats, error: queueError } = await adminClient.rpc('get_queue_stats');
    if (queueError) {
      console.error('[Orchestrator Status] Queue error:', queueError);
    }

    // Calculate summary
    const activeWorkers = workers?.filter((w: FleetWorker) => w.status === 'active').length || 0;
    const rotatingWorkers = workers?.filter((w: FleetWorker) => w.status === 'rotating').length || 0;
    const offlineWorkers = workers?.filter((w: FleetWorker) => w.status === 'offline').length || 0;

    const response = {
      workers: workers || [],
      summary: {
        totalWorkers: workers?.length || 0,
        activeWorkers,
        rotatingWorkers,
        offlineWorkers,
      },
      queue: queueStats?.[0] || {
        cities_pending: 0,
        cities_in_progress: 0,
        cities_completed: 0,
        artists_pending: 0,
        artists_in_progress: 0,
        artists_completed: 0,
        artists_failed: 0,
        total_images_scraped: 0,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Orchestrator Status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
