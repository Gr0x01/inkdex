/**
 * Airtable Sync Status
 *
 * GET /api/admin/airtable/status
 *
 * Returns connection status and recent sync history.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAirtableConfigured, getAirtableConfig } from '@/lib/airtable/client'
import { env } from '@/lib/config/env'

interface SyncLogEntry {
  id: string
  sync_type: string
  direction: string
  records_processed: number
  records_created: number
  records_updated: number
  errors: unknown
  triggered_by: string
  started_at: string
  completed_at: string | null
}

export async function GET() {
  try {
    const config = getAirtableConfig()
    const isConfigured = isAirtableConfigured()

    // Create Supabase client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Fetch recent sync logs
    const { data: recentSyncs, error: syncError } = await supabase
      .from('airtable_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    if (syncError) {
      console.error('Error fetching sync logs:', syncError)
    }

    // Get last successful sync
    const lastSync = (recentSyncs as SyncLogEntry[] | null)?.find(
      (s) => s.completed_at !== null
    )

    // Get stats for last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data: recentStats } = await supabase
      .from('airtable_sync_log')
      .select('records_processed, records_created, records_updated, direction')
      .gte('started_at', yesterday.toISOString())

    const stats24h = {
      syncs: recentStats?.length || 0,
      pushes: recentStats?.filter((s) => s.direction === 'push').length || 0,
      pulls: recentStats?.filter((s) => s.direction === 'pull').length || 0,
      recordsProcessed:
        recentStats?.reduce((sum, s) => sum + (s.records_processed || 0), 0) ||
        0,
    }

    return NextResponse.json({
      configured: isConfigured,
      baseId: config?.baseId
        ? `${config.baseId.slice(0, 6)}...`
        : null,
      lastSync: lastSync
        ? {
            timestamp: lastSync.completed_at,
            direction: lastSync.direction,
            processed: lastSync.records_processed,
            created: lastSync.records_created,
            updated: lastSync.records_updated,
            hasErrors: lastSync.errors !== null,
          }
        : null,
      stats24h,
      recentSyncs: (recentSyncs as SyncLogEntry[] | null)?.map((s) => ({
        id: s.id,
        type: s.sync_type,
        direction: s.direction,
        processed: s.records_processed,
        created: s.records_created,
        updated: s.records_updated,
        hasErrors: s.errors !== null,
        triggeredBy: s.triggered_by,
        startedAt: s.started_at,
        completedAt: s.completed_at,
      })) || [],
    })
  } catch (error) {
    console.error('Error fetching Airtable status:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    )
  }
}
