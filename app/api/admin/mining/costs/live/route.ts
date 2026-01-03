/**
 * Live Costs API
 *
 * Fetches current billing data from Apify and OpenAI APIs.
 *
 * GET /api/admin/mining/costs/live
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { getApifyUsage } from '@/lib/admin/apify-billing';
import { getOpenAIUsage } from '@/lib/admin/openai-billing';

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

    // Fetch live usage from both APIs in parallel
    const [apifyResult, openaiResult] = await Promise.all([
      getApifyUsage(),
      getOpenAIUsage(),
    ]);

    const response = NextResponse.json({
      apify: {
        usage: apifyResult.usage,
        currency: apifyResult.currency,
        error: apifyResult.error,
        lastUpdated: apifyResult.lastUpdated,
      },
      openai: {
        usage: openaiResult.usage,
        currency: openaiResult.currency,
        error: openaiResult.error,
        lastUpdated: openaiResult.lastUpdated,
      },
      total: {
        usage: apifyResult.usage + openaiResult.usage,
        currency: 'USD',
        hasErrors: !!(apifyResult.error || openaiResult.error),
      },
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Live Costs] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
