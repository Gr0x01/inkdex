import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { checkRateLimit } from '@/lib/redis/rate-limiter';
import { triggerPipelineJob, hasRunningJob } from '@/lib/admin/pipeline-executor';
import { triggerJobSchema } from '@/lib/admin/pipeline-validation';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { ZodError } from 'zod';

// Rate limit: 10 job triggers per hour per admin
const RATE_LIMIT_JOBS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  // CSRF protection: Check origin header
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host && !origin.includes(host.split(':')[0])) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // Verify admin access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting per admin
  const rateLimitKey = `pipeline-trigger:${user.email}`;
  const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_JOBS, RATE_LIMIT_WINDOW_MS);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. You can trigger ${RATE_LIMIT_JOBS} jobs per hour. Try again later.`,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
      { status: 429 }
    );
  }

  try {
    // Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = triggerJobSchema.parse(body);
    const { jobType, scope, artistIds, city, limit } = validatedData;

    // Check if there's already a running job of this type
    const alreadyRunning = await hasRunningJob(jobType);
    if (alreadyRunning) {
      return NextResponse.json(
        { error: `A ${jobType} job is already running. Please wait for it to complete.` },
        { status: 409 }
      );
    }

    // Trigger the job
    const runId = await triggerPipelineJob({
      jobType,
      scope,
      triggeredBy: user.email || 'unknown',
      artistIds,
      city,
      limit,
    });

    // Audit log the action
    const clientInfo = getClientInfo(request);
    await logAdminAction({
      adminEmail: user.email || 'unknown',
      action: 'pipeline.trigger',
      resourceType: 'pipeline_run',
      resourceId: runId,
      newValue: { jobType, scope, artistIds, city, limit },
      ...clientInfo,
    });

    return NextResponse.json({
      success: true,
      runId,
      message: `${jobType} job started successfully`,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Pipeline trigger API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger job' },
      { status: 500 }
    );
  }
}
