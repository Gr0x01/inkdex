/**
 * Marketing Outreach Statistics API
 *
 * Returns funnel metrics from Airtable (source of truth).
 *
 * GET /api/admin/marketing/stats
 */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/server';
import { fetchOutreachRecords, isAirtableConfigured } from '@/lib/airtable/client';

interface OutreachStats {
  funnel: {
    pending: number;
    generated: number;
    posted: number;
    dm_sent: number;
    responded: number;
    claimed: number;
    converted: number;
    skipped: number;
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

    // Check if Airtable is configured
    if (!isAirtableConfigured()) {
      return NextResponse.json({
        funnel: {
          pending: 0,
          generated: 0,
          posted: 0,
          dm_sent: 0,
          responded: 0,
          claimed: 0,
          converted: 0,
          skipped: 0,
        },
        totals: { total: 0, claimRate: 0, conversionRate: 0 },
        recent: { claimedLast7Days: 0, postedLast7Days: 0 },
      });
    }

    // Fetch all records from Airtable
    const records = await fetchOutreachRecords();

    // Count by status
    const funnel = {
      pending: 0,
      generated: 0,
      posted: 0,
      dm_sent: 0,
      responded: 0,
      claimed: 0,
      converted: 0,
      skipped: 0,
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let claimedLast7Days = 0;
    let postedLast7Days = 0;

    for (const record of records) {
      const status = record.fields.status as keyof typeof funnel;
      if (status && status in funnel) {
        funnel[status]++;
      }

      // Check recent activity by post_date and dm_date
      const postDate = record.fields.post_date ? new Date(record.fields.post_date) : null;
      const dmDate = record.fields.dm_date ? new Date(record.fields.dm_date) : null;

      if (postDate && postDate >= sevenDaysAgo) {
        postedLast7Days++;
      }

      // Count claimed in last 7 days (if status is claimed/converted and dm_date is recent)
      if ((status === 'claimed' || status === 'converted') && dmDate && dmDate >= sevenDaysAgo) {
        claimedLast7Days++;
      }
    }

    // Calculate totals (exclude skipped from main funnel count)
    const activeTotal = Object.entries(funnel)
      .filter(([key]) => key !== 'skipped')
      .reduce((sum, [, n]) => sum + n, 0);

    const dmSentOrLater = funnel.dm_sent + funnel.responded + funnel.claimed + funnel.converted;
    const claimedOrConverted = funnel.claimed + funnel.converted;

    const stats: OutreachStats = {
      funnel,
      totals: {
        total: activeTotal,
        claimRate: dmSentOrLater > 0 ? (claimedOrConverted / dmSentOrLater) * 100 : 0,
        conversionRate: activeTotal > 0 ? (funnel.converted / activeTotal) * 100 : 0,
      },
      recent: {
        claimedLast7Days,
        postedLast7Days,
      },
    };

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
