import { NextResponse } from 'next/server'
import { getCitiesWithCounts } from '@/lib/supabase/queries'

export const runtime = 'edge'
export const revalidate = 3600 // 1 hour cache

/**
 * GET /api/cities/with-counts
 * Returns cities with at least 5 artists for dynamic city filter dropdown
 * Edge runtime for fast response, cached for 1 hour
 */
export async function GET() {
  try {
    const cities = await getCitiesWithCounts(5) // 5+ artists minimum

    return NextResponse.json(cities, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    })
  } catch (error) {
    console.error('Error fetching cities with counts:', error)

    // Return empty array on error (graceful fallback)
    return NextResponse.json([], {
      status: 500,
      headers: {
        'Cache-Control': 'no-store' // Don't cache errors
      }
    })
  }
}
