/**
 * Marketing Outreach Statistics API
 *
 * Returns funnel metrics for outreach campaigns.
 *
 * GET /api/admin/marketing/stats
 */

import { NextResponse } from 'next/server';
import { getAdminUser, createAdminClient } from '@/lib/supabase/server';
import { getCached } from '@/lib/redis/cache';

interface OutreachStats {
  funnel: {
    pending: number;
    generated: number;
    posted: number;
    dm_sent: number;
    claimed: number;
    converted: number;
  };
  totals: {
    total: number;
    claimRate: number;
    conversionRate: number;
  };
  recent: {
    claimedLast7Days: number;
    postedLast7Days: number;
  };
}

export async function GET() {
  try {
    // Verify admin access (uses session, no network call)
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Redis cache with 5-minute TTL
    const stats = await getCached<OutreachStats>(
      'admin:marketing:stats',
      { ttl: 300, pattern: 'admin:marketing' },
      async () => {
        const adminClient = createAdminClient();

        // Get counts by status
        const { data: statusCounts, error: statusError } = await adminClient
          .from('marketing_outreach')
          .select('status')
          .then((res) => {
            if (res.error) return { data: null, error: res.error };

            const counts = {
              pending: 0,
              generated: 0,
              posted: 0,
              dm_sent: 0,
              claimed: 0,
              converted: 0,
            };

            res.data?.forEach((row) => {
              const status = row.status as keyof typeof counts;
              if (status in counts) {
                counts[status]++;
              }
            });

            return { data: counts, error: null };
          });

        if (statusError) {
          throw new Error(`Status count error: ${statusError.message}`);
        }

        const funnel = statusCounts || {
          pending: 0,
          generated: 0,
          posted: 0,
          dm_sent: 0,
          claimed: 0,
          converted: 0,
        };

        // Get recent activity
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: claimedRecent } = await adminClient
          .from('marketing_outreach')
          .select('*', { count: 'exact', head: true })
          .gte('claimed_at', sevenDaysAgo.toISOString());

        const { count: postedRecent } = await adminClient
          .from('marketing_outreach')
          .select('*', { count: 'exact', head: true })
          .gte('posted_at', sevenDaysAgo.toISOString());

        const total = Object.values(funnel).reduce((sum, n) => sum + n, 0);
        const dmSentOrLater = funnel.dm_sent + funnel.claimed + funnel.converted;

        return {
          funnel,
          totals: {
            total,
            claimRate: dmSentOrLater > 0 ? ((funnel.claimed + funnel.converted) / dmSentOrLater) * 100 : 0,
            conversionRate: total > 0 ? (funnel.converted / total) * 100 : 0,
          },
          recent: {
            claimedLast7Days: claimedRecent || 0,
            postedLast7Days: postedRecent || 0,
          },
        };
      }
    );

    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Marketing Stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
