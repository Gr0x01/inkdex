import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

export async function POST(request: Request) {
  // Verify admin access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { runId } = await request.json();

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    // Get the pipeline run to find the PID
    const { data: run, error: fetchError } = await supabase
      .from('pipeline_jobs')
      .select('id, process_pid, status')
      .eq('id', runId)
      .in('status', ['pending', 'running'])
      .single();

    if (fetchError || !run) {
      return NextResponse.json(
        { error: 'Pipeline run not found or already completed' },
        { status: 404 }
      );
    }

    // Kill the process if PID exists
    if (run.process_pid) {
      try {
        process.kill(run.process_pid, 'SIGTERM');
        console.log(`Killed process ${run.process_pid} for run ${runId}`);
      } catch (_killError) {
        // Process might already be dead, that's okay
        console.log(`Process ${run.process_pid} already terminated or not found`);
      }
    }

    // Update the pipeline run to cancelled status
    const { error } = await supabase
      .from('pipeline_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: 'Cancelled by user',
        process_pid: null,
      })
      .eq('id', runId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update pipeline run: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Pipeline run cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel pipeline API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel pipeline run' },
      { status: 500 }
    );
  }
}
