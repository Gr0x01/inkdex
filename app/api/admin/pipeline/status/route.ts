import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { getCached } from '@/lib/redis/cache';

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

      // Scraping jobs counts by status (optimized: 5 count queries instead of loading all rows)
      adminClient
        .from('scraping_jobs')
        .select('id', { count: 'exact', head: true }),

      adminClient
        .from('scraping_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      adminClient
        .from('scraping_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'running'),

      adminClient
        .from('scraping_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),

      adminClient
        .from('scraping_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),

      // Recent pipeline runs
      adminClient
        .from('pipeline_runs')
        .select('*')
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

    // Use RPC result or fallback calculation
    let artistsWithoutImages = 0;
    if (artistsWithoutImagesResult.data !== null) {
      artistsWithoutImages = artistsWithoutImagesResult.data as number;
    } else {
      // Fallback: artists without images = total - artists with completed scraping
      artistsWithoutImages = totalArtists - scrapingStats.completed;
    }

    const artistsWithImages = totalArtists - artistsWithoutImages;

    // Format recent runs
    const recentRuns = (recentRunsResult.data || []).map((run) => ({
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
    }));

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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pipeline status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline status' },
      { status: 500 }
    );
  }
}
