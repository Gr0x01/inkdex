/**
 * Helper for inserting artists with proper artist_locations entry
 *
 * artist_locations is the SINGLE SOURCE OF TRUTH for location data.
 * This helper ensures all new artists get a proper artist_locations entry.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface ArtistInsertData {
  name: string
  slug: string
  instagram_handle: string
  instagram_url: string
  bio?: string | null
  follower_count?: number | null
  profile_image_url?: string | null
  shop_name?: string | null
  discovery_source?: string | null
  verification_status?: string
  google_place_id?: string | null
}

export interface LocationData {
  city: string
  region: string  // State code for US (e.g., 'TX', 'CA')
  country_code?: string  // Defaults to 'US'
}

/**
 * Insert an artist with their location into both tables.
 *
 * This function:
 * 1. Inserts the artist into the `artists` table (with city/state for backward compat)
 * 2. Inserts the location into `artist_locations` as the primary location
 *
 * @returns The artist ID if successful, null otherwise
 */
export async function insertArtistWithLocation(
  supabase: SupabaseClient,
  artist: ArtistInsertData,
  location: LocationData | null
): Promise<string | null> {
  // Insert artist (location is stored in artist_locations only)
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .insert({
      name: artist.name,
      slug: artist.slug,
      instagram_handle: artist.instagram_handle,
      instagram_url: artist.instagram_url,
      bio: artist.bio || null,
      follower_count: artist.follower_count || null,
      profile_image_url: artist.profile_image_url || null,
      shop_name: artist.shop_name || null,
      discovery_source: artist.discovery_source || null,
      verification_status: artist.verification_status || 'unclaimed',
      google_place_id: artist.google_place_id || null,
    })
    .select('id')
    .single()

  if (artistError) {
    if (artistError.code === '23505') {
      // Duplicate - already exists, not an error
      return null
    }
    console.error('[insertArtistWithLocation] Error inserting artist:', artistError.message)
    return null
  }

  const artistId = artistData?.id
  if (!artistId) {
    console.error('[insertArtistWithLocation] No artist ID returned')
    return null
  }

  // Insert location directly into artist_locations (single source of truth)
  if (location?.city) {
    const { error: locationError } = await supabase
      .from('artist_locations')
      .insert({
        artist_id: artistId,
        city: location.city,
        region: location.region,
        country_code: location.country_code || 'US',
        location_type: 'city',
        is_primary: true,
        display_order: 0,
      })
      .select()
      .single()

    if (locationError) {
      // Don't fail the whole operation - the trigger might have already created it
      if (locationError.code !== '23505') {
        console.warn('[insertArtistWithLocation] Warning: Could not insert location:', locationError.message)
      }
    }
  }

  return artistId
}
