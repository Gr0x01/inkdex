import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCountryName, getRegionName } from '@/lib/utils/location'

export const runtime = 'edge'

/**
 * GET /api/locations/browse
 *
 * Returns all browsable locations in a single response for the navbar dropdown.
 * Combines countries, regions, and cities with artist counts.
 *
 * Response format:
 * {
 *   countries: [{ code: 'US', name: 'United States', count: 1234 }],
 *   regions: [{ code: 'TX', name: 'Texas', country: 'US', count: 156 }],
 *   cities: [{ slug: 'austin', name: 'Austin', region: 'TX', country: 'US', count: 42 }]
 * }
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all three location types in parallel using the consolidated RPC
    const [countriesResult, regionsResult, citiesResult] = await Promise.all([
      supabase.rpc('get_location_counts', { p_grouping: 'countries' }),
      supabase.rpc('get_location_counts', { p_grouping: 'regions' }),
      supabase.rpc('get_location_counts', { p_grouping: 'cities', p_min_count: 1 }),
    ])

    // Handle errors
    if (countriesResult.error) {
      console.error('Error fetching countries:', countriesResult.error)
    }
    if (regionsResult.error) {
      console.error('Error fetching regions:', regionsResult.error)
    }
    if (citiesResult.error) {
      console.error('Error fetching cities:', citiesResult.error)
    }

    // Transform countries - always use getCountryName for full name
    const countries = (countriesResult.data || []).map((row: {
      location_code: string
      display_name: string
      artist_count: number
    }) => ({
      code: row.location_code,
      name: getCountryName(row.location_code),
      count: row.artist_count,
    })).sort((a: { count: number }, b: { count: number }) => b.count - a.count)

    // Transform regions - always use getRegionName for full name
    const regions = (regionsResult.data || []).map((row: {
      location_code: string
      display_name: string | null
      country_code: string
      artist_count: number
    }) => ({
      code: row.location_code,
      name: getRegionName(row.location_code, row.country_code),
      country: row.country_code,
      count: row.artist_count,
    })).sort((a: { count: number }, b: { count: number }) => b.count - a.count)

    // Transform cities
    // SQL returns: location_code = slug (e.g., "los-angeles"), display_name = city name (e.g., "Los Angeles")
    const cities = (citiesResult.data || [])
      .filter((row: { location_code: string | null; display_name: string | null }) =>
        row.location_code !== null && row.display_name !== null
      )
      .map((row: {
        location_code: string
        display_name: string
        region_code: string
        country_code: string
        artist_count: number
      }) => ({
        slug: row.location_code,
        name: row.display_name,
        region: row.region_code,
        country: row.country_code,
        count: row.artist_count,
      })).sort((a: { count: number }, b: { count: number }) => b.count - a.count)

    return NextResponse.json(
      { countries, regions, cities },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    console.error('Browse locations API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations', countries: [], regions: [], cities: [] },
      { status: 500 }
    )
  }
}
