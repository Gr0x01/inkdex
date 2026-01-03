import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { getCached, generateCacheKey } from '@/lib/redis/cache';

/**
 * Safely parse a float value, returning 0 for invalid inputs
 */
function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
      hashtagResult,
      followerResult,
      scrapingResult,
      searchesResult,
      citiesResult,
      recentClaimsResult,
    ] = await Promise.all([
      // Content stats
      adminClient
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true }),

      // Hashtag mining runs
      adminClient.from('hashtag_mining_runs').select('*'),

      // Follower mining runs
      adminClient.from('follower_mining_runs').select('*'),

      // Scraping jobs
      adminClient.from('scraping_jobs').select('status'),

      // Searches count
      adminClient.from('searches').select('id', { count: 'exact', head: true }),

      // Unique cities - get non-deleted artists with cities
      adminClient.from('artists').select('city').not('city', 'is', null).is('deleted_at', null),

      // Recent claimed artists
      adminClient
        .from('artists')
        .select('id, name, instagram_handle, claimed_at')
        .eq('verification_status', 'claimed')
        .is('deleted_at', null)
        .order('claimed_at', { ascending: false })
        .limit(5),
    ]);

    // Process artist counts using admin client
    const [totalRes, unclaimedRes, claimedRes, proRes, featuredRes] = await Promise.all([
      adminClient.from('artists').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      adminClient.from('artists').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('verification_status', 'unclaimed'),
      adminClient.from('artists').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('verification_status', 'claimed').eq('is_pro', false),
      adminClient.from('artists').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('verification_status', 'claimed').eq('is_pro', true),
      adminClient.from('artists').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_featured', true),
    ]);

    const artistStats = {
      total: totalRes.count || 0,
      unclaimed: unclaimedRes.count || 0,
      claimed: claimedRes.count || 0,
      pro: proRes.count || 0,
      featured: featuredRes.count || 0,
    };

    // Process content stats
    const totalImages = contentResult.count || 0;

    // Get images with embeddings count separately
    const { count: imagesWithEmbeddings } = await adminClient
      .from('portfolio_images')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    // Process mining stats (following the pattern from mining/stats API)
    const hashtagRuns = hashtagResult.data || [];
    const followerRuns = followerResult.data || [];

    // Calculate hashtag stats from completed runs only (for costs)
    const hashtagCompleted = hashtagRuns.filter((r: { status: string }) => r.status === 'completed');
    const hashtagStats = {
      total: hashtagRuns.length,
      completed: hashtagCompleted.length,
      failed: hashtagRuns.filter((r: { status: string }) => r.status === 'failed').length,
      running: hashtagRuns.filter((r: { status: string }) => r.status === 'running').length,
      artistsInserted: hashtagCompleted.reduce((sum: number, r: { artists_inserted?: number }) => sum + (r.artists_inserted || 0), 0),
      totalCost: hashtagCompleted.reduce(
        (sum: number, r: { apify_cost_estimate?: string | number; openai_cost_estimate?: string | number }) =>
          sum + safeParseFloat(r.apify_cost_estimate) + safeParseFloat(r.openai_cost_estimate),
        0
      ),
    };

    // Calculate follower stats from completed runs only (for costs)
    const followerCompleted = followerRuns.filter((r: { status: string }) => r.status === 'completed');
    const followerStats = {
      total: followerRuns.length,
      completed: followerCompleted.length,
      failed: followerRuns.filter((r: { status: string }) => r.status === 'failed').length,
      running: followerRuns.filter((r: { status: string }) => r.status === 'running').length,
      artistsInserted: followerCompleted.reduce((sum: number, r: { artists_inserted?: number }) => sum + (r.artists_inserted || 0), 0),
      totalCost: followerCompleted.reduce(
        (sum: number, r: { apify_cost_estimate?: string | number; openai_cost_estimate?: string | number }) =>
          sum + safeParseFloat(r.apify_cost_estimate) + safeParseFloat(r.openai_cost_estimate),
        0
      ),
    };

    const totalMiningCost = hashtagStats.totalCost + followerStats.totalCost;
    const totalArtistsFromMining = hashtagStats.artistsInserted + followerStats.artistsInserted;
    const costPerArtist = totalArtistsFromMining > 0 ? totalMiningCost / totalArtistsFromMining : 0;

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
          mining: {
            hashtag: {
              total: hashtagStats.total,
              completed: hashtagStats.completed,
              failed: hashtagStats.failed,
              running: hashtagStats.running,
            },
            follower: {
              total: followerStats.total,
              completed: followerStats.completed,
              failed: followerStats.failed,
              running: followerStats.running,
            },
            totalCost: totalMiningCost,
            costPerArtist,
            totalArtistsInserted: totalArtistsFromMining,
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
