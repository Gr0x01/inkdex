/**
 * Push Artists to Airtable - DM Outreach Campaign
 *
 * POST /api/admin/airtable/push-dm
 *
 * Push artist candidates for DM outreach with personalized message.
 * Creates marketing_outreach records with campaign_name: 'pro_trial_dm'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  isAirtableConfigured,
  batchUpsertRecords,
  formatArtistForAirtable,
  type ArtistForAirtable,
  type AirtableOutreachFields,
} from '@/lib/airtable/client'
import { isAdminEmail } from '@/lib/admin/whitelist'

const requestSchema = z.object({
  artistId: z.string().uuid().optional(), // Single artist push (from artist page)
  criteria: z.object({
    minFollowers: z.number().min(0).default(5000),
    maxFollowers: z.number().min(0).default(50000),
    limit: z.number().min(1).max(100).default(20),
  }).optional(),
})

const DM_TEMPLATE = `hey, love your work! you're already on Inkdex and your portfolio looks great {profile_url}.
wanted to offer you 3 months of Pro free (normally $45). you get upgraded portfolio, auto-sync, analytics, search boost.
only ask: follow @inkdexio + one post or story mentioning us. whenever works for you.
interested?`

function generateDmText(profileUrl: string): string {
  return DM_TEMPLATE.replace('{profile_url}', profileUrl)
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Airtable is configured
    if (!isAirtableConfigured()) {
      return NextResponse.json(
        { error: 'Airtable not configured' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { artistId, criteria } = requestSchema.parse(body)

    // Use admin client for data queries (bypasses RLS)
    const supabase = createAdminClient()

    // Type for artist data from query
    type ArtistQueryResult = {
      id: string
      instagram_handle: string
      name: string | null
      follower_count: number | null
      bio: string | null
      slug: string
      is_featured: boolean | null
      portfolio_images: Array<{
        storage_original_path: string | null
        storage_thumb_640: string | null
        embedding?: unknown
      }>
    }

    let selectedArtists: ArtistQueryResult[] = []

    if (artistId) {
      // Single artist push (from artist page)
      const { data: singleArtist, error: singleError } = await supabase
        .from('artists')
        .select(
          `
          id,
          instagram_handle,
          name,
          follower_count,
          bio,
          slug,
          is_featured,
          portfolio_images (
            storage_original_path,
            storage_thumb_640,
            embedding
          )
        `
        )
        .eq('id', artistId)
        .single()

      if (singleError) throw singleError
      if (!singleArtist) {
        return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
      }

      // Note: Don't check marketing_outreach here - we want to allow
      // re-pushing to update dm_text in Airtable for existing records

      selectedArtists = [singleArtist as ArtistQueryResult]
    } else {
      // Batch push with criteria
      const { minFollowers, maxFollowers, limit } = criteria || { minFollowers: 5000, maxFollowers: 50000, limit: 20 }

      // Fetch artists with portfolio images and embeddings
      const { data: artistData, error } = await supabase
        .from('artists')
        .select(
          `
          id,
          instagram_handle,
          name,
          follower_count,
          bio,
          slug,
          is_featured,
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

      if (error) throw error

      // Get existing marketing_outreach artist_ids for this campaign to exclude
      const { data: existingOutreach } = await supabase
        .from('marketing_outreach')
        .select('artist_id')
        .eq('campaign_name', 'pro_trial_dm')

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
      selectedArtists = filteredArtists.slice(0, limit)
    }

    if (selectedArtists.length === 0) {
      return NextResponse.json({
        success: true,
        pushed: 0,
        created: 0,
        updated: 0,
        message: 'No eligible artists found',
      })
    }

    // Batch fetch location data for all selected artists (performance optimization)
    const artistIds = selectedArtists.map(a => a.id)
    const { data: allLocations } = await supabase
      .from('artist_locations')
      .select('artist_id, city, region')
      .in('artist_id', artistIds)
      .eq('is_primary', true)

    const locationMap = new Map(
      (allLocations || []).map(loc => [loc.artist_id, loc])
    )

    // Map artists with location data
    const artists: ArtistForAirtable[] = selectedArtists.map(artist => ({
      ...artist,
      city: locationMap.get(artist.id)?.city || null,
      state: locationMap.get(artist.id)?.region || null,
      is_featured: artist.is_featured || false,
      portfolio_images: artist.portfolio_images || [],
    }))

    if (artists.length === 0) {
      return NextResponse.json({
        success: true,
        pushed: 0,
        created: 0,
        updated: 0,
        message: 'No eligible artists found',
      })
    }

    // Format artists for Airtable with DM text
    const appUrl = 'https://inkdex.io'
    const airtableRecords: AirtableOutreachFields[] = artists.map((artist) => {
      const baseRecord = formatArtistForAirtable(artist, appUrl)
      const profileUrl = `${appUrl}/artist/${artist.slug}`
      return {
        ...baseRecord,
        dm_text: generateDmText(profileUrl),
      }
    })

    // Push to Airtable
    const airtableResult = await batchUpsertRecords(airtableRecords)

    // Create marketing_outreach records in DB
    const outreachRecords = artists.map((artist) => ({
      artist_id: artist.id,
      campaign_name: 'pro_trial_dm',
      outreach_type: 'instagram_dm',
      status: 'pending',
      airtable_synced_at: new Date().toISOString(),
    }))

    // Upsert to avoid duplicates
    const { error: upsertError } = await supabase
      .from('marketing_outreach')
      .upsert(outreachRecords, {
        onConflict: 'artist_id,campaign_name',
        ignoreDuplicates: true,
      })

    if (upsertError) {
      console.error('Error creating marketing_outreach records:', upsertError)
    }

    // Log to unified audit log
    await supabase.from('unified_audit_log').insert({
      event_category: 'sync',
      event_type: 'airtable.push_dm',
      actor_type: 'admin',
      actor_id: 'manual',
      status: airtableResult.errors.length > 0 ? 'partial' : 'success',
      completed_at: new Date().toISOString(),
      items_processed: artists.length,
      items_succeeded: airtableResult.created + airtableResult.updated,
      event_data: {
        sync_type: 'dm_outreach',
        campaign: 'pro_trial_dm',
        records_created: airtableResult.created,
        records_updated: airtableResult.updated,
        errors: airtableResult.errors.length > 0 ? airtableResult.errors : null,
      },
    })

    return NextResponse.json({
      success: true,
      pushed: artists.length,
      created: airtableResult.created,
      updated: airtableResult.updated,
      errors: airtableResult.errors,
    })
  } catch (error) {
    console.error('Error pushing DM candidates to Airtable:', error)

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
