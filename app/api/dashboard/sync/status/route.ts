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

    // 2. Get artist with sync state
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select(`
        id,
        is_pro,
        filter_non_tattoo_content,
        artist_sync_state(auto_sync_enabled, last_sync_at, consecutive_failures, disabled_reason)
      `)
      .eq('claimed_by_user_id', user.id)
      .eq('verification_status', 'claimed')
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'No claimed artist found' }, { status: 404 });
    }

    // Extract sync state (may be null if no record exists yet)
    const syncState = Array.isArray(artist.artist_sync_state)
      ? artist.artist_sync_state[0]
      : artist.artist_sync_state;

    // 3. Get recent sync logs from unified audit log (last 5)
    const { data: logs, error: logsError } = await supabase
      .from('unified_audit_log')
      .select('id, event_type, status, error_message, items_processed, items_succeeded, items_failed, created_at, completed_at')
      .eq('resource_id', artist.id)
      .like('event_type', 'instagram.%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.error('[SyncStatus] Failed to fetch logs:', logsError);
    }

    const recentLogs: SyncLog[] = (logs || []).map((log) => ({
      id: log.id,
      syncType: log.event_type === 'instagram.auto' ? 'auto' : 'manual',
      imagesFetched: log.items_processed || 0,
      imagesAdded: log.items_succeeded || 0,
      imagesSkipped: log.items_failed || 0,
      status: (log.status || 'failed') as 'success' | 'partial' | 'failed',
      errorMessage: log.error_message,
      startedAt: log.created_at,
      completedAt: log.completed_at,
    }));

    return NextResponse.json({
      isPro: artist.is_pro || false,
      autoSyncEnabled: syncState?.auto_sync_enabled || false,
      filterNonTattoo: artist.filter_non_tattoo_content !== false, // Default true if null
      lastSyncAt: syncState?.last_sync_at || null,
      syncDisabledReason: syncState?.disabled_reason || null,
      consecutiveFailures: syncState?.consecutive_failures || 0,
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
