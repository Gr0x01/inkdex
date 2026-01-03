import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

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
    // Run all queries in parallel
    const [
      _artistsWithImagesResult,
      artistsWithoutImagesResult,
      totalArtistsResult,
      imagesResult,
      imagesWithEmbeddingsResult,
      scrapingJobsResult,
      recentRunsResult,
    ] = await Promise.all([
      // Artists with portfolio images
      adminClient
        .from('artists')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('instagram_handle', 'is', null)
        .filter('id', 'in', `(SELECT DISTINCT artist_id FROM portfolio_images)`),

      // Artists without portfolio images (simpler approach - count all then subtract)
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

      // Scraping jobs by status
      adminClient.from('scraping_jobs').select('status'),

      // Recent pipeline runs
      adminClient
        .from('pipeline_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Process scraping jobs
    const scrapingJobs = scrapingJobsResult.data || [];
    const scrapingStats = {
      total: scrapingJobs.length,
      pending: scrapingJobs.filter((j) => j.status === 'pending').length,
      running: scrapingJobs.filter((j) => j.status === 'running').length,
      completed: scrapingJobs.filter((j) => j.status === 'completed').length,
      failed: scrapingJobs.filter((j) => j.status === 'failed').length,
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

    const response: PipelineStatus = {
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pipeline status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline status' },
      { status: 500 }
    );
  }
}
