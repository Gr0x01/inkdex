/**
 * Dashboard: Sync Status
 *
 * Get current sync status and recent logs for the dashboard
 *
 * GET /api/dashboard/sync/status
 *
 * Response: {
 *   autoSyncEnabled,
 *   lastSyncAt,
 *   syncDisabledReason,
 *   consecutiveFailures,
 *   recentLogs: SyncLog[]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SyncLog {
  id: string;
  syncType: 'auto' | 'manual';
  imagesFetched: number;
  imagesAdded: number;
  imagesSkipped: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export async function GET(_request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get artist
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select(
        'id, is_pro, auto_sync_enabled, filter_non_tattoo_content, last_instagram_sync_at, sync_consecutive_failures, sync_disabled_reason'
      )
      .eq('claimed_by_user_id', user.id)
      .eq('verification_status', 'claimed')
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'No claimed artist found' }, { status: 404 });
    }

    // 3. Get recent sync logs (last 5)
    const { data: logs, error: logsError } = await supabase
      .from('instagram_sync_log')
      .select('*')
      .eq('artist_id', artist.id)
      .order('started_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.error('[SyncStatus] Failed to fetch logs:', logsError);
    }

    const recentLogs: SyncLog[] = (logs || []).map((log) => ({
      id: log.id,
      syncType: log.sync_type as 'auto' | 'manual',
      imagesFetched: log.images_fetched || 0,
      imagesAdded: log.images_added || 0,
      imagesSkipped: log.images_skipped || 0,
      status: log.status as 'success' | 'partial' | 'failed',
      errorMessage: log.error_message,
      startedAt: log.started_at,
      completedAt: log.completed_at,
    }));

    return NextResponse.json({
      isPro: artist.is_pro || false,
      autoSyncEnabled: artist.auto_sync_enabled || false,
      filterNonTattoo: artist.filter_non_tattoo_content !== false, // Default true if null
      lastSyncAt: artist.last_instagram_sync_at,
      syncDisabledReason: artist.sync_disabled_reason,
      consecutiveFailures: artist.sync_consecutive_failures || 0,
      recentLogs,
    });
  } catch (error) {
    console.error('[SyncStatus] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
