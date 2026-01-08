import { NextResponse } from 'next/server'
import { isMaintenanceMode } from '@/lib/redis/maintenance'

/**
 * GET /api/maintenance/status
 * Public endpoint for middleware to check maintenance status
 * No auth required - just returns boolean
 */
export async function GET() {
  try {
    const enabled = await isMaintenanceMode()
    return NextResponse.json({ enabled }, {
      headers: {
        // Cache for 5 seconds to reduce Redis calls
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    })
  } catch {
    // Fail open - if we can't check, don't block
    return NextResponse.json({ enabled: false })
  }
}
