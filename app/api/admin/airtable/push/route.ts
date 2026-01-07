/**
 * Push Artists to Airtable
 *
 * POST /api/admin/airtable/push
 *
 * Push artist candidates from DB to Airtable with full data
 * (photos, bio, stats). Creates marketing_outreach records in DB.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  isAirtableConfigured,
  batchUpsertRecords,
  formatArtistForAirtable,
  type ArtistForAirtable,
} from '@/lib/airtable/client'
import { env } from '@/lib/config/env'

const requestSchema = z.object({
  artistIds: z.array(z.string().uuid()).optional(),
  criteria: z
    .object({
      minFollowers: z.number().min(0).default(5000),
      maxFollowers: z.number().min(0).default(50000),
      city: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    })
    .optional(),
})

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
    const body = await request.json()
    const { artistIds, criteria } = requestSchema.parse(body)

    if (!artistIds && !criteria) {
      return NextResponse.json(
        { error: 'Either artistIds or criteria must be provided' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Fetch artists based on selection method
    let artists: ArtistForAirtable[] = []

    if (artistIds && artistIds.length > 0) {
      // Fetch specific artists by ID
      const { data, error } = await supabase
        .from('artists')
        .select(
          `
          id,
          instagram_handle,
          name,
          follower_count,
          bio,
          slug,
          portfolio_images (
            storage_original_path,
            storage_thumb_640
          )
        `
        )
        .in('id', artistIds)
        .eq('verification_status', 'unclaimed')
        .is('deleted_at', null)

      if (error) throw error

      // Get location data for each artist
      for (const artist of data || []) {
        const { data: locationData } = await supabase
          .from('artist_locations')
          .select('city, region')
          .eq('artist_id', artist.id)
          .eq('is_primary', true)
          .single()

        artists.push({
          ...artist,
          city: locationData?.city || null,
          state: locationData?.region || null,
          portfolio_images: artist.portfolio_images || [],
        })
      }
    } else if (criteria) {
      // Fetch artists by criteria
      const { minFollowers, maxFollowers, city, limit } = criteria

      // Build query for artists not already in marketing_outreach
      // Fetch a larger pool to enable true random selection across the range
      const query = supabase
        .from('artists')
        .select(
          `
          id,
          instagram_handle,
          name,
          follower_count,
          bio,
          slug,
          portfolio_images!inner (
            storage_original_path,
            storage_thumb_640,
            embedding
          )
        `
        )
        .eq('verification_status', 'unclaimed')
        .is('deleted_at', null)
        .gte('follower_count', minFollowers)
        .lte('follower_count', maxFollowers)
        .limit(500) // Fetch large pool for random selection

      const { data: artistData, error } = await query

      if (error) throw error

      // Get existing marketing_outreach artist_ids to exclude
      const { data: existingOutreach } = await supabase
        .from('marketing_outreach')
        .select('artist_id')

      const excludeIds = new Set(
        (existingOutreach || []).map((r) => r.artist_id)
      )

      // Filter artists
      const filteredArtists = (artistData || [])
        .filter((a) => !excludeIds.has(a.id))
        .filter((a) => a.portfolio_images.some((img: { embedding: unknown }) => img.embedding)) // Has embeddings

      // Shuffle to get a mix of follower counts (Fisher-Yates)
      for (let i = filteredArtists.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredArtists[i], filteredArtists[j]] = [filteredArtists[j], filteredArtists[i]];
      }

      // Take the requested limit
      const selectedArtists = filteredArtists.slice(0, limit)

      for (const artist of selectedArtists) {
        const { data: locationData } = await supabase
          .from('artist_locations')
          .select('city, region')
          .eq('artist_id', artist.id)
          .eq('is_primary', true)
          .single()

        // Skip if city filter specified and doesn't match
        if (city && locationData?.city?.toLowerCase() !== city.toLowerCase()) {
          continue
        }

        artists.push({
          ...artist,
          city: locationData?.city || null,
          state: locationData?.region || null,
          portfolio_images: artist.portfolio_images || [],
        })
      }

      // Re-slice after city filtering
      artists = artists.slice(0, limit)
    }

    if (artists.length === 0) {
      return NextResponse.json({
        success: true,
        pushed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        message: 'No eligible artists found',
      })
    }

    // Format artists for Airtable (always use production URL for marketing)
    const appUrl = 'https://inkdex.io'
    const airtableRecords = artists.map((artist) =>
      formatArtistForAirtable(artist, appUrl)
    )

    // Push to Airtable
    const airtableResult = await batchUpsertRecords(airtableRecords)

    // Create marketing_outreach records in DB for new pushes
    const outreachRecords = artists.map((artist) => ({
      artist_id: artist.id,
      campaign_name: 'airtable_outreach',
      outreach_type: 'instagram_dm',
      status: 'pending',
      airtable_synced_at: new Date().toISOString(),
    }))

    // Upsert to avoid duplicates (unique constraint on artist_id + campaign_name)
    const { error: upsertError } = await supabase
      .from('marketing_outreach')
      .upsert(outreachRecords, {
        onConflict: 'artist_id,campaign_name',
        ignoreDuplicates: true,
      })

    if (upsertError) {
      console.error('Error creating marketing_outreach records:', upsertError)
    }

    // Log sync
    await supabase.from('airtable_sync_log').insert({
      sync_type: 'outreach',
      direction: 'push',
      records_processed: artists.length,
      records_created: airtableResult.created,
      records_updated: airtableResult.updated,
      errors:
        airtableResult.errors.length > 0 ? airtableResult.errors : null,
      triggered_by: 'manual',
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      pushed: artists.length,
      created: airtableResult.created,
      updated: airtableResult.updated,
      errors: airtableResult.errors,
    })
  } catch (error) {
    console.error('Error pushing to Airtable:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Push failed' },
      { status: 500 }
    )
  }
}
