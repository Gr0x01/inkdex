import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export const dynamic = 'force-dynamic';

type ControlAction =
  | { action: 'spawn'; workerName?: string }
  | { action: 'rotate'; workerId: string; reason?: string }
  | { action: 'shutdown'; workerId: string }
  | { action: 'terminate'; workerId: string };

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ControlAction = await request.json();
    const adminClient = createAdminClient();

    switch (body.action) {
      case 'spawn': {
        // Generate worker name if not provided
        const workerName = body.workerName || await generateWorkerName(adminClient);

        // Log the action - actual spawning happens via orchestrator
        await adminClient.rpc('log_orchestrator_action', {
          p_action: 'spawn_requested',
          p_worker_name: workerName,
          p_reason: 'admin_panel',
          p_details: { requested_by: user.email },
        });

        return NextResponse.json({
          success: true,
          message: `Spawn requested for ${workerName}. The orchestrator will create the instance.`,
          workerName,
        });
      }

      case 'rotate': {
        // Mark worker as rotating
        const { error: updateError } = await adminClient
          .from('scraper_workers')
          .update({ status: 'rotating' })
          .eq('id', body.workerId);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to update worker status' }, { status: 500 });
        }

        // Log the action
        await adminClient.rpc('log_orchestrator_action', {
          p_action: 'rotate_requested',
          p_worker_id: body.workerId,
          p_reason: body.reason || 'admin_request',
          p_details: { requested_by: user.email },
        });

        return NextResponse.json({
          success: true,
          message: 'Worker marked for rotation. The orchestrator will handle the rotation.',
        });
      }

      case 'shutdown': {
        // Mark worker as offline (graceful shutdown request)
        const { data: worker, error: fetchError } = await adminClient
          .from('scraper_workers')
          .select('ip_address')
          .eq('id', body.workerId)
          .single();

        if (fetchError || !worker) {
          return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        // Try to send HTTP shutdown signal
        if (worker.ip_address) {
          try {
            await fetch(`http://${worker.ip_address}:8080/shutdown`, {
              method: 'POST',
              signal: AbortSignal.timeout(5000),
            });
          } catch {
            // Worker might already be down, continue
          }
        }

        // Update status
        await adminClient
          .from('scraper_workers')
          .update({ status: 'offline' })
          .eq('id', body.workerId);

        // Log action
        await adminClient.rpc('log_orchestrator_action', {
          p_action: 'shutdown_requested',
          p_worker_id: body.workerId,
          p_reason: 'admin_request',
          p_details: { requested_by: user.email },
        });

        return NextResponse.json({
          success: true,
          message: 'Shutdown signal sent.',
        });
      }

      case 'terminate': {
        // Mark worker as terminated (for cleanup)
        await adminClient
          .from('scraper_workers')
          .update({ status: 'terminated' })
          .eq('id', body.workerId);

        // Log action
        await adminClient.rpc('log_orchestrator_action', {
          p_action: 'terminate_requested',
          p_worker_id: body.workerId,
          p_reason: 'admin_request',
          p_details: { requested_by: user.email },
        });

        return NextResponse.json({
          success: true,
          message: 'Worker marked as terminated.',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('[Orchestrator Control] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateWorkerName(adminClient: SupabaseClient): Promise<string> {
  const { data: workers } = await adminClient
    .from('scraper_workers')
    .select('worker_name');

  const existingNames = new Set(workers?.map((w: { worker_name: string }) => w.worker_name) || []);

  for (let i = 1; i < 100; i++) {
    const name = `worker-${i.toString().padStart(2, '0')}`;
    if (!existingNames.has(name)) {
      return name;
    }
  }

  return `worker-${Date.now()}`;
}
