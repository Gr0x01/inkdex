/**
 * Airtable Auto-Sync Cron Job
 *
 * GET /api/cron/airtable-sync
 *
 * Automatically pulls changes from Airtable every 5 minutes.
 * Configure in vercel.json with schedule: "every 5 minutes"
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isAirtableConfigured,
  fetchOutreachRecords,
} from '@/lib/airtable/client'
import { env } from '@/lib/config/env'

// Valid status values
const VALID_STATUSES = [
  'pending',
  'generated',
  'posted',
  'dm_sent',
  'responded',
  'claimed',
  'converted',
  'skipped',
]

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production (Vercel sets this header)
    const authHeader = request.headers.get('authorization')
    if (
      env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      // In production without proper auth, check if it's a Vercel cron
      const vercelCronHeader = request.headers.get('x-vercel-cron')
      if (!vercelCronHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Check if Airtable is configured
    if (!isAirtableConfigured()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Airtable not configured',
      })
    }

    // Create Supabase client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Get last sync time
    const { data: lastSyncData } = await supabase
      .from('airtable_sync_log')
      .select('completed_at')
      .eq('direction', 'pull')
      .eq('triggered_by', 'cron')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Only fetch records modified since last sync (default to 1 hour if no previous sync)
    const sinceDate = lastSyncData?.completed_at
      ? new Date(lastSyncData.completed_at)
      : new Date(Date.now() - 60 * 60 * 1000)

    // Fetch modified records from Airtable
    const airtableRecords = await fetchOutreachRecords(sinceDate)

    if (airtableRecords.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No changes since last sync',
      })
    }

    const results = {
      processed: 0,
      updated: 0,
      featured_added: 0,
      featured_removed: 0,
      errors: [] as Array<{ handle: string; error: string }>,
    }

    // Process each record
    for (const record of airtableRecords) {
      const { fields } = record
      const handle = fields.instagram_handle

      if (!handle) continue
      results.processed++

      try {
        // Find artist by instagram_handle
        const { data: artist, error: artistError } = await supabase
          .from('artists')
          .select('id, is_featured, featured_at, featured_expires_at')
          .eq('instagram_handle', handle)
          .single()

        if (artistError || !artist) continue

        // Update marketing_outreach record
        const status = fields.status?.toLowerCase()
        const updates: Record<string, unknown> = {
          airtable_record_id: record.id,
          airtable_synced_at: new Date().toISOString(),
        }

        if (status && VALID_STATUSES.includes(status)) {
          updates.status = status

          if (status === 'posted' && fields.post_date) {
            updates.posted_at = new Date(fields.post_date).toISOString()
          }
          if (status === 'dm_sent' && fields.dm_date) {
            updates.dm_sent_at = new Date(fields.dm_date).toISOString()
          }
          if (status === 'claimed') {
            updates.claimed_at = new Date().toISOString()
          }
        }

        if (fields.response_notes) {
          updates.notes = fields.response_notes
        }

        // Upsert marketing_outreach
        await supabase
          .from('marketing_outreach')
          .upsert(
            {
              artist_id: artist.id,
              campaign_name: 'airtable_outreach',
              ...updates,
            },
            { onConflict: 'artist_id,campaign_name' }
          )

        // Handle featured status
        const shouldBeFeatured = fields.featured === true
        const currentlyFeatured = artist.is_featured

        if (shouldBeFeatured && !currentlyFeatured) {
          const featureDays = fields.feature_days || 14
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + featureDays)

          await supabase
            .from('artists')
            .update({
              is_featured: true,
              featured_at: new Date().toISOString(),
              featured_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', artist.id)

          results.featured_added++
        } else if (!shouldBeFeatured && currentlyFeatured) {
          await supabase
            .from('artists')
            .update({
              is_featured: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', artist.id)

          results.featured_removed++
        }

        results.updated++
      } catch (error) {
        results.errors.push({
          handle,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log sync
    await supabase.from('airtable_sync_log').insert({
      sync_type: 'outreach',
      direction: 'pull',
      records_processed: results.processed,
      records_updated: results.updated,
      errors: results.errors.length > 0 ? results.errors : null,
      triggered_by: 'cron',
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('Airtable cron sync error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
