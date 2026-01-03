import { NextRequest, NextResponse } from 'next/server'
import { getCitiesWithCounts } from '@/lib/supabase/queries'

export const runtime = 'edge'
export const revalidate = 3600 // 1 hour cache

/**
 * GET /api/cities/with-counts
 * Returns cities with artist counts for dynamic city filter dropdown
 * Edge runtime for fast response, cached for 1 hour
 *
 * Query params:
 * - country: ISO 3166-1 alpha-2 country code (optional, e.g., 'US', 'UK')
 * - region: State/province code (optional, e.g., 'TX', 'Ontario')
 * - min_count: Minimum artists per city (default: 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')
    const region = searchParams.get('region')
    const minCount = parseInt(searchParams.get('min_count') || '5', 10)

    // Validate country code format if provided
    if (country && !/^[A-Za-z]{2}$/.test(country)) {
      return NextResponse.json(
        { error: 'Invalid country code format' },
        { status: 400 }
      )
    }

    // Validate region format if provided (alphanumeric, max 50 chars)
    if (region && (!/^[A-Za-z0-9\s-]+$/.test(region) || region.length > 50)) {
      return NextResponse.json(
        { error: 'Invalid region format' },
        { status: 400 }
      )
    }

    // Validate min_count
    if (isNaN(minCount) || minCount < 1 || minCount > 100) {
      return NextResponse.json(
        { error: 'Invalid min_count parameter' },
        { status: 400 }
      )
    }

    // Validate logical constraints: region requires country
    if (region && !country) {
      return NextResponse.json(
        { error: 'Region filter requires country filter' },
        { status: 400 }
      )
    }

    const cities = await getCitiesWithCounts(
      minCount,
      country?.toUpperCase() || null,
      region || null
    )

    return NextResponse.json(cities, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    })
  } catch (error) {
    console.error('Error fetching cities with counts:', error)

    // Return structured error response to distinguish from empty results
    return NextResponse.json(
      {
        error: 'Failed to fetch cities',
        cities: []
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store' // Don't cache errors
        }
      }
    )
  }
}
