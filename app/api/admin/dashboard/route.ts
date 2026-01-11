import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { getCached, generateCacheKey } from '@/lib/redis/cache';

export async function GET() {
  // Verify admin access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client for data queries (bypasses RLS)
  const adminClient = createAdminClient();

  try {
    // Generate cache key for dashboard stats
    const cacheKey = generateCacheKey('admin:dashboard', { type: 'stats' });

    // Fetch stats from cache or database
    const stats = await getCached(
      cacheKey,
      { ttl: 300, pattern: 'admin:dashboard' }, // 5 minutes TTL
      async () => {
        // Run all queries in parallel for efficiency
        const [
          contentResult,
          scrapingResult,
          searchesResult,
          citiesResult,
          recentClaimsResult,
        ] = await Promise.all([
          // Content stats
          adminClient
            .from('portfolio_images')
            .select('id', { count: 'exact', head: true }),

          // Scraping jobs (individual artist scraping)
          adminClient.from('pipeline_jobs').select('status').eq('job_type', 'scrape_single'),

          // Searches count
          adminClient.from('searches').select('id', { count: 'exact', head: true }),

          // Unique cities - get from artist_locations (single source of truth)
          adminClient.from('artist_locations').select('city').not('city', 'is', null),

          // Recent claimed artists
          adminClient
            .from('artists')
            .select('id, name, instagram_handle, claimed_at')
            .eq('verification_status', 'claimed')
            .is('deleted_at', null)
            .order('claimed_at', { ascending: false })
            .limit(5),
        ]);

        // Get artist tier counts in a single RPC call (replaces 5 separate queries)
        const { data: tierCounts } = await adminClient.rpc('get_artist_tier_counts').single() as {
          data: { total: number; unclaimed: number; claimed_free: number; pro: number; featured: number } | null
        };

        const artistStats = {
          total: tierCounts?.total || 0,
          unclaimed: tierCounts?.unclaimed || 0,
          claimed: tierCounts?.claimed_free || 0,
          pro: tierCounts?.pro || 0,
          featured: tierCounts?.featured || 0,
        };

        // Process content stats
        const totalImages = contentResult.count || 0;

        // Get images with embeddings count separately
        const { count: imagesWithEmbeddings } = await adminClient
          .from('portfolio_images')
          .select('id', { count: 'exact', head: true })
          .not('embedding', 'is', null);

        // Process scraping stats
        const scrapingJobs = scrapingResult.data || [];
        const scrapingStats = {
          completed: scrapingJobs.filter(j => j.status === 'completed').length,
          pending: scrapingJobs.filter(j => j.status === 'pending').length,
          running: scrapingJobs.filter(j => j.status === 'running').length,
          failed: scrapingJobs.filter(j => j.status === 'failed').length,
        };

        // Process unique cities
        const citiesData = citiesResult.data || [];
        const uniqueCities = new Set(citiesData.map(c => c.city).filter(Boolean)).size;

        // Process recent claims
        const recentClaims = (recentClaimsResult.data || []).map(a => ({
          id: a.id,
          name: a.name,
          instagramHandle: a.instagram_handle,
          claimedAt: a.claimed_at,
        }));

        return {
          artists: artistStats,
          content: {
            totalImages,
            imagesWithEmbeddings: imagesWithEmbeddings || 0,
          },
          activity: {
            totalSearches: searchesResult.count || 0,
            uniqueCities,
            recentClaims,
          },
          scraping: scrapingStats,
        };
      }
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
