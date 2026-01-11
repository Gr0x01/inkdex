import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

/**
 * GET /api/locations/countries
 *
 * Returns list of countries from the locations table with counts.
 * Uses the global `locations` table for comprehensive country list,
 * and optionally includes artist counts from artist_locations.
 *
 * Query params:
 * - with_artists: boolean - if true, only return countries that have artists
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withArtists = searchParams.get('with_artists') === 'true'

    const supabase = await createClient()

    if (withArtists) {
      // Return countries that have artists (from artist_locations)
      // Uses consolidated get_location_counts function
      const { data, error } = await supabase.rpc('get_location_counts', {
        p_grouping: 'countries',
      })

      if (error) {
        console.error('Error fetching countries with counts:', error)
        return NextResponse.json(
          { error: 'Failed to fetch countries' },
          { status: 500 }
        )
      }

      // Map RPC response to API format (location_code = country_code, display_name = country_name)
      const countries = (data || []).map((d: { location_code: string; display_name: string; artist_count: number }) => ({
        code: d.location_code,
        name: d.display_name,
        artist_count: d.artist_count,
      }))

      return NextResponse.json(countries, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      })
    } else {
      // Return all unique countries from locations table
      const { data, error } = await supabase
        .from('locations')
        .select('country_code, country_name')
        .limit(1000)

      if (error) {
        console.error('Error fetching countries:', error)
        return NextResponse.json(
          { error: 'Failed to fetch countries' },
          { status: 500 }
        )
      }

      // Deduplicate and build country list
      const countryMap = new Map<string, string>()
      ;(data || []).forEach((d: { country_code: string; country_name: string }) => {
        if (!countryMap.has(d.country_code)) {
          countryMap.set(d.country_code, d.country_name)
        }
      })

      const countries = Array.from(countryMap.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json(countries, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        },
      })
    }
  } catch (error) {
    console.error('Countries API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
