import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { checkRateLimit } from '@/lib/redis/rate-limiter';
import { retryJobSchema, getRetryQuerySchema } from '@/lib/admin/pipeline-validation';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { ZodError } from 'zod';

// Rate limit: 5 retry operations per hour per admin
const RATE_LIMIT_RETRIES = 5;
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
  const rateLimitKey = `pipeline-retry:${user.email}`;
  const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_RETRIES, RATE_LIMIT_WINDOW_MS);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. You can retry ${RATE_LIMIT_RETRIES} times per hour.` },
      { status: 429 }
    );
  }

  const adminClient = createAdminClient();

  try {
    // Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = retryJobSchema.parse(body);
    const { target, artistIds } = validatedData;

    if (target === 'scraping') {
      // Get artist IDs with failed pipeline status
      let failedQuery = adminClient
        .from('artist_pipeline_state')
        .select('artist_id')
        .eq('pipeline_status', 'failed');

      if (artistIds && artistIds.length > 0) {
        failedQuery = failedQuery.in('artist_id', artistIds);
      }

      const { data: failedArtists, error: fetchError } = await failedQuery;
      if (fetchError) throw fetchError;

      const artistIdsToRetry = (failedArtists || []).map((a) => a.artist_id);

      if (artistIdsToRetry.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No failed artists to retry',
          count: 0,
        });
      }

      // Update artist_pipeline_state to 'retry_requested'
      // This is what the scraper now checks for
      // Only update if still failed (defensive against race conditions)
      const { error: updateError } = await adminClient
        .from('artist_pipeline_state')
        .update({
          pipeline_status: 'retry_requested',
          updated_at: new Date().toISOString(),
        })
        .in('artist_id', artistIdsToRetry)
        .eq('pipeline_status', 'failed');

      if (updateError) throw updateError;

      const count = artistIdsToRetry.length;

      // Audit log the action
      const clientInfo = getClientInfo(request);
      await logAdminAction({
        adminEmail: user.email || 'unknown',
        action: 'pipeline.retry',
        resourceType: 'pipeline_run',
        newValue: { target, artistIds, resetCount: count },
        ...clientInfo,
      });

      return NextResponse.json({
        success: true,
        message: `Marked ${count} artist(s) for retry - they will be scraped on next run`,
        count,
      });
    } else {
      // For embeddings, we need to identify images without embeddings
      // and trigger a new embedding generation run
      // This is handled by the trigger API with scope='pending'
      return NextResponse.json({
        success: true,
        message: 'Use the trigger API with jobType=embeddings and scope=pending to regenerate embeddings',
      });
    }
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Pipeline retry API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry jobs' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get failed jobs that can be retried
 */
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

  // Validate query params with Zod
  const queryResult = getRetryQuerySchema.safeParse({
    target: searchParams.get('target'),
    limit: searchParams.get('limit'),
  });

  const { target, limit } = queryResult.success
    ? queryResult.data
    : { target: 'scraping' as const, limit: 50 };

  const adminClient = createAdminClient();

  try {
    if (target === 'scraping') {
      // Get artists with failed pipeline status, joined with their most recent scraping job for error info
      const { data, error, count } = await adminClient
        .from('artist_pipeline_state')
        .select(
          `
          artist_id,
          pipeline_status,
          last_scraped_at,
          updated_at,
          artists!inner(id, name, instagram_handle)
        `,
          { count: 'exact' }
        )
        .eq('pipeline_status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get the most recent error message for each failed artist from scraping_jobs
      const artistIds = (data || []).map((d) => d.artist_id);
      const errorMessages: Record<string, string> = {};

      if (artistIds.length > 0) {
        const { data: jobs } = await adminClient
          .from('scraping_jobs')
          .select('artist_id, error_message, created_at')
          .in('artist_id', artistIds)
          .eq('status', 'failed')
          .order('created_at', { ascending: false });

        // Get the most recent error for each artist
        for (const job of jobs || []) {
          if (!errorMessages[job.artist_id] && job.error_message) {
            errorMessages[job.artist_id] = job.error_message;
          }
        }
      }

      interface ArtistData {
        id: string;
        name: string;
        instagram_handle: string;
      }

      return NextResponse.json({
        target: 'scraping',
        total: count || 0,
        artists: (data || []).map((item) => {
          const artist = item.artists as unknown as ArtistData;
          return {
            id: artist?.id,
            artistId: item.artist_id,
            name: artist?.name,
            handle: artist?.instagram_handle,
            errorMessage: errorMessages[item.artist_id] || 'Unknown error',
            failedAt: item.updated_at,
            lastScrapedAt: item.last_scraped_at,
          };
        }),
      });
    } else {
      // For embeddings, count images without embeddings
      const { count } = await adminClient
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true })
        .is('embedding', null);

      return NextResponse.json({
        target: 'embeddings',
        total: count || 0,
        message: 'Use trigger API with jobType=embeddings to process pending images',
      });
    }
  } catch (error) {
    console.error('Pipeline retry GET API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get failed jobs' },
      { status: 500 }
    );
  }
}
