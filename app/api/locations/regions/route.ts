import { NextRequest, NextResponse } from 'next/server'
import { getRegionsWithCounts } from '@/lib/supabase/queries'

export const runtime = 'edge'
export const revalidate = 3600 // 1 hour cache

/**
 * GET /api/locations/regions
 * Returns regions/states with artist counts for a given country
 * Used by cascading location filter dropdown
 *
 * Query params:
 * - country: ISO 3166-1 alpha-2 country code (default: 'US')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || 'US'

    // Validate country code format (2 letters)
    if (!/^[A-Za-z]{2}$/.test(country)) {
      return NextResponse.json(
        { error: 'Invalid country code format' },
        { status: 400 }
      )
    }

    const regions = await getRegionsWithCounts(country.toUpperCase())

    return NextResponse.json(regions, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    })
  } catch (error) {
    console.error('Error fetching regions:', error)

    return NextResponse.json([], {
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  }
}
