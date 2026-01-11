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

interface AuditLogEntry {
  id: string
  event_type: string
  actor_id: string | null
  status: string | null
  items_processed: number | null
  items_succeeded: number | null
  event_data: {
    sync_type?: string
    records_created?: number
    records_updated?: number
    errors?: unknown
  } | null
  created_at: string
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

    // Fetch recent sync logs from unified_audit_log
    const { data: recentSyncs, error: syncError } = await supabase
      .from('unified_audit_log')
      .select('id, event_type, actor_id, status, items_processed, items_succeeded, event_data, created_at, completed_at')
      .like('event_type', 'airtable.%')
      .order('created_at', { ascending: false })
      .limit(10)

    if (syncError) {
      console.error('Error fetching sync logs:', syncError)
    }

    const typedSyncs = recentSyncs as AuditLogEntry[] | null

    // Get last successful sync
    const lastSync = typedSyncs?.find(
      (s) => s.completed_at !== null
    )

    // Get stats for last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data: recentStats } = await supabase
      .from('unified_audit_log')
      .select('event_type, items_processed, event_data')
      .like('event_type', 'airtable.%')
      .gte('created_at', yesterday.toISOString())

    const typedStats = recentStats as AuditLogEntry[] | null

    const stats24h = {
      syncs: typedStats?.length || 0,
      pushes: typedStats?.filter((s) => s.event_type === 'airtable.push').length || 0,
      pulls: typedStats?.filter((s) => s.event_type === 'airtable.pull').length || 0,
      recordsProcessed:
        typedStats?.reduce((sum, s) => sum + (s.items_processed || 0), 0) ||
        0,
    }

    // Extract direction from event_type (airtable.push -> push, airtable.pull -> pull)
    const getDirection = (eventType: string) => eventType.replace('airtable.', '')

    return NextResponse.json({
      configured: isConfigured,
      baseId: config?.baseId
        ? `${config.baseId.slice(0, 6)}...`
        : null,
      lastSync: lastSync
        ? {
            timestamp: lastSync.completed_at,
            direction: getDirection(lastSync.event_type),
            processed: lastSync.items_processed || 0,
            created: lastSync.event_data?.records_created || 0,
            updated: lastSync.event_data?.records_updated || 0,
            hasErrors: lastSync.event_data?.errors !== null && lastSync.event_data?.errors !== undefined,
          }
        : null,
      stats24h,
      recentSyncs: typedSyncs?.map((s) => ({
        id: s.id,
        type: s.event_data?.sync_type || 'outreach',
        direction: getDirection(s.event_type),
        processed: s.items_processed || 0,
        created: s.event_data?.records_created || 0,
        updated: s.event_data?.records_updated || 0,
        hasErrors: s.event_data?.errors !== null && s.event_data?.errors !== undefined,
        triggeredBy: s.actor_id || 'system',
        startedAt: s.created_at,
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
