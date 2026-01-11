import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { getCached, invalidateCache } from '@/lib/redis/cache';

// Stale job threshold: 5 minutes without heartbeat (for running jobs)
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Stale pending threshold: 30 minutes without starting (for pending jobs)
const STALE_PENDING_THRESHOLD_MS = 30 * 60 * 1000;

export interface PipelineStatus {
  artists: {
    total: number;
    withoutImages: number; // Need scraping
    withImages: number; // Have portfolio images
    pendingEmbeddings: number; // Images but no embeddings
    complete: number; // Have embeddings
  };
  images: {
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
  };
  scrapingJobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  recentRuns: {
    id: string;
    jobType: string;
    status: string;
    totalItems: number;
    processedItems: number;
    failedItems: number;
    triggeredBy: string;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    errorMessage: string | null;
    lastHeartbeatAt: string | null;
    isStale: boolean;
  }[];
}

export async function GET() {
  // Verify admin access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  try {
    // Use Redis cache with 5-minute TTL
    const response = await getCached(
      'admin:pipeline:status',
      { ttl: 300, pattern: 'admin:dashboard' },
      async () => {
        // Run all queries in parallel (including scraping job counts)
        const [
      _artistsWithImagesResult,
      artistsWithoutImagesResult,
      totalArtistsResult,
      imagesResult,
      imagesWithEmbeddingsResult,
      scrapingJobsTotalResult,
      scrapingJobsPendingResult,
      scrapingJobsRunningResult,
      scrapingJobsCompletedResult,
      scrapingJobsFailedResult,
      recentRunsResult,
    ] = await Promise.all([
      // Artists with portfolio images
      adminClient
        .from('artists')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('instagram_handle', 'is', null)
        .filter('id', 'in', `(SELECT DISTINCT artist_id FROM portfolio_images)`),

      // Artists without portfolio images (uses RPC from Phase 1 migration)
      adminClient.rpc('count_artists_without_images'),

      // Total artists
      adminClient
        .from('artists')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('instagram_handle', 'is', null),

      // Total images
      adminClient
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true }),

      // Images with embeddings
      adminClient
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true })
        .not('embedding', 'is', null),

      // Scraping jobs counts by status (individual artist scraping jobs)
      adminClient
        .from('pipeline_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'scrape_single'),

      adminClient
        .from('pipeline_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'scrape_single')
        .eq('status', 'pending'),

      adminClient
        .from('pipeline_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'scrape_single')
        .eq('status', 'running'),

      adminClient
        .from('pipeline_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'scrape_single')
        .eq('status', 'completed'),

      // Failed artists from artist_pipeline_state (not scraping_jobs)
      adminClient
        .from('artist_pipeline_state')
        .select('artist_id', { count: 'exact', head: true })
        .eq('pipeline_status', 'failed'),

      // Recent pipeline jobs (batch jobs, not individual scrape_single)
      adminClient
        .from('pipeline_jobs')
        .select('*')
        .neq('job_type', 'scrape_single')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Aggregate scraping job counts (no in-memory filtering needed)
    const scrapingStats = {
      total: scrapingJobsTotalResult.count || 0,
      pending: scrapingJobsPendingResult.count || 0,
      running: scrapingJobsRunningResult.count || 0,
      completed: scrapingJobsCompletedResult.count || 0,
      failed: scrapingJobsFailedResult.count || 0,
    };

    // Calculate artist stats
    const totalArtists = totalArtistsResult.count || 0;
    const totalImages = imagesResult.count || 0;
    const imagesWithEmbeddings = imagesWithEmbeddingsResult.count || 0;
    const imagesWithoutEmbeddings = totalImages - imagesWithEmbeddings;

    // Use RPC result for artists without images
    // The RPC function counts artists that have no portfolio_images
    let artistsWithoutImages = 0;
    if (
      artistsWithoutImagesResult.data !== null &&
      typeof artistsWithoutImagesResult.data === 'number' &&
      artistsWithoutImagesResult.data >= 0
    ) {
      artistsWithoutImages = artistsWithoutImagesResult.data;
    } else {
      // Fallback: count unique artists in portfolio_images and subtract from total
      // Note: scrapingStats.completed won't work as there can be multiple jobs per artist
      // Just show 0 as fallback - the RPC should work if properly deployed
      console.warn('count_artists_without_images RPC failed, using 0 as fallback');
      artistsWithoutImages = 0;
    }

    // Clamp to valid range to prevent negative display
    artistsWithoutImages = Math.min(artistsWithoutImages, totalArtists);
    const artistsWithImages = totalArtists - artistsWithoutImages;

    // Format recent runs with heartbeat status
    const now = Date.now();
    const recentRuns = (recentRunsResult.data || []).map((run) => {
      const lastHeartbeatAt = run.last_heartbeat_at;
      const isRunning = run.status === 'running';
      const heartbeatAge = lastHeartbeatAt
        ? now - new Date(lastHeartbeatAt).getTime()
        : null;

      // A job is stale if it's running and either:
      // 1. Has a heartbeat older than threshold, or
      // 2. Has been running for >5 min with no heartbeat at all
      const startedAge = run.started_at
        ? now - new Date(run.started_at).getTime()
        : 0;
      const isStale =
        isRunning &&
        ((heartbeatAge !== null && heartbeatAge > STALE_THRESHOLD_MS) ||
          (heartbeatAge === null && startedAge > STALE_THRESHOLD_MS));

      return {
        id: run.id,
        jobType: run.job_type,
        status: run.status,
        totalItems: run.total_items || 0,
        processedItems: run.processed_items || 0,
        failedItems: run.failed_items || 0,
        triggeredBy: run.triggered_by,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        createdAt: run.created_at,
        errorMessage: run.error_message,
        lastHeartbeatAt,
        isStale,
      };
    });

        return {
          artists: {
            total: totalArtists,
            withoutImages: artistsWithoutImages,
            withImages: artistsWithImages,
            pendingEmbeddings: imagesWithoutEmbeddings > 0 ? artistsWithImages : 0,
            complete: imagesWithEmbeddings > 0 ? artistsWithImages : 0,
          },
          images: {
            total: totalImages,
            withEmbeddings: imagesWithEmbeddings,
            withoutEmbeddings: imagesWithoutEmbeddings,
          },
          scrapingJobs: scrapingStats,
          recentRuns,
        } as PipelineStatus;
      }
    );

    // Auto-cancel stale jobs with FRESH data (not cached)
    const now = Date.now();
    let jobsCancelled = 0;

    // 1. Cancel stale RUNNING jobs (no heartbeat for 5 minutes)
    const runningJobIds = response.recentRuns
      .filter((run) => run.status === 'running')
      .map((run) => run.id);

    if (runningJobIds.length > 0) {
      const { data: freshRunningJobs } = await adminClient
        .from('pipeline_jobs')
        .select('id, job_type, status, last_heartbeat_at, started_at')
        .in('id', runningJobIds)
        .eq('status', 'running');

      const staleRunningJobs = (freshRunningJobs || []).filter((job) => {
        const heartbeatAge = job.last_heartbeat_at
          ? now - new Date(job.last_heartbeat_at).getTime()
          : null;
        const startedAge = job.started_at
          ? now - new Date(job.started_at).getTime()
          : 0;
        return (
          (heartbeatAge !== null && heartbeatAge > STALE_THRESHOLD_MS) ||
          (heartbeatAge === null && startedAge > STALE_THRESHOLD_MS)
        );
      });

      for (const staleJob of staleRunningJobs) {
        const staleDuration = staleJob.last_heartbeat_at
          ? now - new Date(staleJob.last_heartbeat_at).getTime()
          : staleJob.started_at
            ? now - new Date(staleJob.started_at).getTime()
            : 0;
        const staleMinutes = Math.floor(staleDuration / 60000);

        console.log(
          `Auto-cancelling stale running job ${staleJob.id} (${staleJob.job_type}) - no heartbeat for ${staleMinutes} minutes`
        );

        const { count } = await adminClient
          .from('pipeline_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `Job stale: no heartbeat for ${staleMinutes} minutes. Auto-cancelled.`,
          })
          .eq('id', staleJob.id)
          .eq('status', 'running')
          .eq('last_heartbeat_at', staleJob.last_heartbeat_at);

        if ((count || 0) > 0) jobsCancelled++;
      }
    }

    // 2. Cancel stale PENDING jobs (created over 30 minutes ago but never started)
    const pendingJobIds = response.recentRuns
      .filter((run) => run.status === 'pending')
      .map((run) => run.id);

    if (pendingJobIds.length > 0) {
      const { data: freshPendingJobs } = await adminClient
        .from('pipeline_jobs')
        .select('id, job_type, status, created_at')
        .in('id', pendingJobIds)
        .eq('status', 'pending');

      const stalePendingJobs = (freshPendingJobs || []).filter((job) => {
        const createdAge = job.created_at
          ? now - new Date(job.created_at).getTime()
          : 0;
        return createdAge > STALE_PENDING_THRESHOLD_MS;
      });

      for (const staleJob of stalePendingJobs) {
        const createdAge = staleJob.created_at
          ? now - new Date(staleJob.created_at).getTime()
          : 0;
        const staleMinutes = Math.floor(createdAge / 60000);

        console.log(
          `Auto-cancelling stale pending job ${staleJob.id} (${staleJob.job_type}) - pending for ${staleMinutes} minutes without starting`
        );

        const { count } = await adminClient
          .from('pipeline_jobs')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString(),
            error_message: `Job never started: pending for ${staleMinutes} minutes. Auto-cancelled.`,
          })
          .eq('id', staleJob.id)
          .eq('status', 'pending');

        if ((count || 0) > 0) jobsCancelled++;
      }
    }

    // Invalidate cache if any jobs were cancelled
    if (jobsCancelled > 0) {
      await invalidateCache('admin:dashboard').catch((err) => {
        console.error('Failed to invalidate cache after stale job cancellation:', err);
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pipeline status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline status' },
      { status: 500 }
    );
  }
}
