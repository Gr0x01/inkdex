/**
 * Mining Runs API
 *
 * Returns recent mining runs for display in the admin panel.
 *
 * GET /api/admin/mining/runs?type=hashtag|follower&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
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

interface MiningRun {
  id: string;
  type: 'hashtag' | 'follower';
  identifier: string;
  status: string;
  stats: {
    scraped: number;
    bioPass: number;
    imagePass: number;
    inserted: number;
    duplicates?: number;
    private?: number;
  };
  costs: {
    apify: number;
    openai: number;
  };
  error?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'hashtag' | 'follower' | null (both)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const runs: MiningRun[] = [];

    // Fetch hashtag runs
    if (!type || type === 'hashtag') {
      const { data: hashtagRuns, error: hashtagError } = await adminClient
        .from('hashtag_mining_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(type ? limit : Math.ceil(limit / 2));

      if (hashtagError) {
        console.error('[Mining Runs] Hashtag query error:', hashtagError);
      } else if (hashtagRuns) {
        for (const run of hashtagRuns) {
          runs.push({
            id: run.id,
            type: 'hashtag',
            identifier: `#${run.hashtag}`,
            status: run.status,
            stats: {
              scraped: run.posts_scraped || 0,
              bioPass: run.bio_filter_passed || 0,
              imagePass: run.image_filter_passed || 0,
              inserted: run.artists_inserted || 0,
              duplicates: run.artists_skipped_duplicate || 0,
            },
            costs: {
              apify: safeParseFloat(run.apify_cost_estimate),
              openai: safeParseFloat(run.openai_cost_estimate),
            },
            error: run.error_message || undefined,
            startedAt: run.started_at,
            completedAt: run.completed_at,
            createdAt: run.created_at,
          });
        }
      }
    }

    // Fetch follower runs
    if (!type || type === 'follower') {
      const { data: followerRuns, error: followerError } = await adminClient
        .from('follower_mining_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(type ? limit : Math.ceil(limit / 2));

      if (followerError) {
        console.error('[Mining Runs] Follower query error:', followerError);
      } else if (followerRuns) {
        for (const run of followerRuns) {
          runs.push({
            id: run.id,
            type: 'follower',
            identifier: `@${run.seed_account}`,
            status: run.status,
            stats: {
              scraped: run.followers_scraped || 0,
              bioPass: run.bio_filter_passed || 0,
              imagePass: run.image_filter_passed || 0,
              inserted: run.artists_inserted || 0,
              duplicates: run.artists_skipped_duplicate || 0,
              private: run.artists_skipped_private || 0,
            },
            costs: {
              apify: safeParseFloat(run.apify_cost_estimate),
              openai: safeParseFloat(run.openai_cost_estimate),
            },
            error: run.error_message || undefined,
            startedAt: run.started_at,
            completedAt: run.completed_at,
            createdAt: run.created_at,
          });
        }
      }
    }

    // Sort by createdAt descending and limit
    runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limitedRuns = runs.slice(0, limit);

    const response = NextResponse.json({ runs: limitedRuns });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Mining Runs] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
