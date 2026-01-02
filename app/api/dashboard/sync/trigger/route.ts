/**
 * Dashboard: Manual Sync Trigger
 *
 * Pro users can manually trigger a portfolio sync
 * Rate limited: 1 sync per hour
 *
 * POST /api/dashboard/sync/trigger
 *
 * Response: { success, result: SyncResult }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncArtistPortfolio } from '@/lib/instagram/auto-sync';
import { checkManualSyncRateLimit } from '@/lib/rate-limiter';

export async function POST(_request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get artist and check Pro status
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, is_pro, auto_sync_enabled, instagram_handle')
      .eq('claimed_by_user_id', user.id)
      .eq('verification_status', 'claimed')
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'No claimed artist found' }, { status: 404 });
    }

    if (!artist.is_pro) {
      return NextResponse.json(
        { error: 'Pro subscription required for manual sync' },
        { status: 403 }
      );
    }

    // 3. Rate limit check (1 per hour)
    const rateLimit = checkManualSyncRateLimit(user.id);
    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000 / 60);
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${retryAfter} minutes.`,
          retryAfter: rateLimit.reset,
        },
        { status: 429 }
      );
    }

    // 4. Trigger sync
    console.log(`[ManualSync] Starting sync for @${artist.instagram_handle} (user: ${user.id})`);
    const result = await syncArtistPortfolio(artist.id, user.id, 'manual');

    // 5. Return result
    return NextResponse.json({
      success: result.success,
      result: {
        imagesFetched: result.imagesFetched,
        imagesAdded: result.imagesAdded,
        imagesSkipped: result.imagesSkipped,
        status: result.status,
        errorMessage: result.errorMessage,
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error('[ManualSync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
