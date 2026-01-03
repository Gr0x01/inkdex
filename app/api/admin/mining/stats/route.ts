/**
 * Mining Statistics API
 *
 * Returns aggregated statistics for hashtag and follower mining operations.
 *
 * GET /api/admin/mining/stats
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

/**
 * Safely parse a float value, returning 0 for invalid inputs
 */
function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface MiningStats {
  hashtag: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    postsScraped: number;
    handlesFound: number;
    bioFilterPassed: number;
    imageFilterPassed: number;
    artistsInserted: number;
    estimatedApifyCost: number;
    estimatedOpenAICost: number;
  };
  follower: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    followersScraped: number;
    bioFilterPassed: number;
    imageFilterPassed: number;
    artistsInserted: number;
    skippedPrivate: number;
    estimatedApifyCost: number;
    estimatedOpenAICost: number;
  };
  totals: {
    artistsInserted: number;
    estimatedApifyCost: number;
    estimatedOpenAICost: number;
    estimatedTotalCost: number;
    costPerArtist: number;
  };
}

export async function GET() {
  try {
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

    // Fetch hashtag mining stats
    const { data: hashtagRuns, error: hashtagError } = await adminClient
      .from('hashtag_mining_runs')
      .select('*');

    if (hashtagError) {
      console.error('[Mining Stats] Hashtag query error:', hashtagError);
      return NextResponse.json(
        { error: 'Failed to fetch hashtag stats' },
        { status: 500 }
      );
    }

    // Fetch follower mining stats
    const { data: followerRuns, error: followerError } = await adminClient
      .from('follower_mining_runs')
      .select('*');

    if (followerError) {
      console.error('[Mining Stats] Follower query error:', followerError);
      return NextResponse.json(
        { error: 'Failed to fetch follower stats' },
        { status: 500 }
      );
    }

    // Calculate hashtag stats
    const hashtagCompleted = hashtagRuns.filter((r) => r.status === 'completed');
    const hashtagStats = {
      total: hashtagRuns.length,
      completed: hashtagCompleted.length,
      failed: hashtagRuns.filter((r) => r.status === 'failed').length,
      running: hashtagRuns.filter((r) => r.status === 'running').length,
      postsScraped: hashtagCompleted.reduce((sum, r) => sum + (r.posts_scraped || 0), 0),
      handlesFound: hashtagCompleted.reduce((sum, r) => sum + (r.unique_handles_found || 0), 0),
      bioFilterPassed: hashtagCompleted.reduce((sum, r) => sum + (r.bio_filter_passed || 0), 0),
      imageFilterPassed: hashtagCompleted.reduce((sum, r) => sum + (r.image_filter_passed || 0), 0),
      artistsInserted: hashtagCompleted.reduce((sum, r) => sum + (r.artists_inserted || 0), 0),
      estimatedApifyCost: hashtagCompleted.reduce(
        (sum, r) => sum + safeParseFloat(r.apify_cost_estimate),
        0
      ),
      estimatedOpenAICost: hashtagCompleted.reduce(
        (sum, r) => sum + safeParseFloat(r.openai_cost_estimate),
        0
      ),
    };

    // Calculate follower stats
    const followerCompleted = followerRuns.filter((r) => r.status === 'completed');
    const followerStats = {
      total: followerRuns.length,
      completed: followerCompleted.length,
      failed: followerRuns.filter((r) => r.status === 'failed').length,
      running: followerRuns.filter((r) => r.status === 'running').length,
      followersScraped: followerCompleted.reduce(
        (sum, r) => sum + (r.followers_scraped || 0),
        0
      ),
      bioFilterPassed: followerCompleted.reduce(
        (sum, r) => sum + (r.bio_filter_passed || 0),
        0
      ),
      imageFilterPassed: followerCompleted.reduce(
        (sum, r) => sum + (r.image_filter_passed || 0),
        0
      ),
      artistsInserted: followerCompleted.reduce(
        (sum, r) => sum + (r.artists_inserted || 0),
        0
      ),
      skippedPrivate: followerCompleted.reduce(
        (sum, r) => sum + (r.artists_skipped_private || 0),
        0
      ),
      estimatedApifyCost: followerCompleted.reduce(
        (sum, r) => sum + safeParseFloat(r.apify_cost_estimate),
        0
      ),
      estimatedOpenAICost: followerCompleted.reduce(
        (sum, r) => sum + safeParseFloat(r.openai_cost_estimate),
        0
      ),
    };

    // Calculate totals
    const totalArtists = hashtagStats.artistsInserted + followerStats.artistsInserted;
    const totalApifyCost = hashtagStats.estimatedApifyCost + followerStats.estimatedApifyCost;
    const totalOpenAICost = hashtagStats.estimatedOpenAICost + followerStats.estimatedOpenAICost;
    const totalCost = totalApifyCost + totalOpenAICost;

    const stats: MiningStats = {
      hashtag: hashtagStats,
      follower: followerStats,
      totals: {
        artistsInserted: totalArtists,
        estimatedApifyCost: totalApifyCost,
        estimatedOpenAICost: totalOpenAICost,
        estimatedTotalCost: totalCost,
        costPerArtist: totalArtists > 0 ? totalCost / totalArtists : 0,
      },
    };

    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Mining Stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
