/**
 * Pull Updates from Airtable
 *
 * POST /api/admin/airtable/pull
 *
 * Pull status updates, featured flags, and notes from Airtable
 * back to the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  isAirtableConfigured,
  fetchOutreachRecords,
} from '@/lib/airtable/client'
import { env } from '@/lib/config/env'
import { normalizeInstagramHandle } from '@/lib/utils/slug'

const requestSchema = z.object({
  since: z.string().datetime().optional(),
})

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

export async function POST(request: NextRequest) {
  try {
    // Verify Airtable is configured
    if (!isAirtableConfigured()) {
      return NextResponse.json(
        { error: 'Airtable not configured' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { since } = requestSchema.parse(body)

    // Create Supabase client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Fetch records from Airtable (optionally since a certain time)
    const sinceDate = since ? new Date(since) : undefined
    const airtableRecords = await fetchOutreachRecords(sinceDate)

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
      const rawHandle = fields.instagram_handle

      if (!rawHandle) {
        results.errors.push({
          handle: 'unknown',
          error: 'Record missing instagram_handle',
        })
        continue
      }

      results.processed++

      // Normalize handle for case-insensitive lookup
      const handle = normalizeInstagramHandle(rawHandle)

      try {
        // Find artist by instagram_handle
        const { data: artist, error: artistError } = await supabase
          .from('artists')
          .select('id, is_featured, featured_at, featured_expires_at')
          .eq('instagram_handle', handle)
          .single()

        if (artistError || !artist) {
          // Artist not found - skip but don't error
          continue
        }

        // Update marketing_outreach record
        const status = fields.status?.toLowerCase()
        const updates: Record<string, unknown> = {
          airtable_record_id: record.id,
          airtable_synced_at: new Date().toISOString(),
        }

        if (status && VALID_STATUSES.includes(status)) {
          updates.status = status

          // Set timestamps based on status
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
        const { error: outreachError } = await supabase
          .from('marketing_outreach')
          .upsert(
            {
              artist_id: artist.id,
              campaign_name: 'airtable_outreach',
              ...updates,
            },
            { onConflict: 'artist_id,campaign_name' }
          )

        if (outreachError) {
          results.errors.push({
            handle,
            error: `Outreach upsert failed: ${outreachError.message}`,
          })
          continue
        }

        // Handle featured status
        // Airtable checkbox returns true when checked, undefined when unchecked
        const shouldBeFeatured = Boolean(fields.featured)
        const currentlyFeatured = artist.is_featured
        // Parse feature_days as number (Airtable may return string or number)
        const featureDays = Number(fields.feature_days) || 7

        if (shouldBeFeatured && !currentlyFeatured) {
          // Add featured status
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + featureDays)

          const { error: featuredError } = await supabase
            .from('artists')
            .update({
              is_featured: true,
              featured_at: new Date().toISOString(),
              featured_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', artist.id)

          if (featuredError) {
            results.errors.push({
              handle,
              error: `Failed to set featured: ${featuredError.message}`,
            })
          } else {
            results.featured_added++
          }
        } else if (!shouldBeFeatured && currentlyFeatured) {
          // Remove featured status
          const { error: unfeaturedError } = await supabase
            .from('artists')
            .update({
              is_featured: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', artist.id)

          if (unfeaturedError) {
            results.errors.push({
              handle,
              error: `Failed to remove featured: ${unfeaturedError.message}`,
            })
          } else {
            results.featured_removed++
          }
        } else if (shouldBeFeatured && currentlyFeatured && fields.feature_days) {
          // Update expiration if feature_days changed
          const newExpiresAt = new Date(artist.featured_at || new Date())
          newExpiresAt.setDate(newExpiresAt.getDate() + featureDays)

          // Only update if expiration changed significantly (more than 1 day)
          const currentExpires = artist.featured_expires_at
            ? new Date(artist.featured_expires_at)
            : null
          if (
            !currentExpires ||
            Math.abs(newExpiresAt.getTime() - currentExpires.getTime()) >
              86400000
          ) {
            await supabase
              .from('artists')
              .update({
                featured_expires_at: newExpiresAt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', artist.id)
          }
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
    await supabase.from('unified_audit_log').insert({
      event_category: 'sync',
      event_type: 'airtable.pull',
      actor_type: 'admin',
      actor_id: 'manual',
      status: results.errors.length > 0 ? 'partial' : 'success',
      completed_at: new Date().toISOString(),
      items_processed: results.processed,
      items_succeeded: results.updated,
      event_data: {
        sync_type: 'outreach',
        records_updated: results.updated,
        errors: results.errors.length > 0 ? results.errors : null,
      },
    })

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('Error pulling from Airtable:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pull failed' },
      { status: 500 }
    )
  }
}
