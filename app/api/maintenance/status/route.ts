import { NextResponse } from 'next/server'
import { isMaintenanceMode } from '@/lib/redis/maintenance'

// Use Node.js runtime (ioredis requires Node.js sockets, not Edge)
export const runtime = 'nodejs'
export const maxDuration = 5 // 5 second timeout (default is 10s on Vercel Pro)

/**
 * GET /api/maintenance/status
 * Public endpoint for middleware to check maintenance status
 * No auth required - just returns boolean
 *
 * Timeout layers:
 * - maxDuration: 5s (Vercel function timeout)
 * - App timeout: 4s (Promise.race below)
 * - ioredis commandTimeout: 3s (in client.ts)
 */
export async function GET() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    // Add timeout wrapper to prevent hanging requests (fail fast)
    // 4s app timeout > 3s command timeout to let ioredis handle gracefully
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Timeout')), 4000)
    })

    const enabled = await Promise.race([
      isMaintenanceMode(),
      timeoutPromise,
    ])

    return NextResponse.json({ enabled }, {
      headers: {
        // Cache for 10 seconds to reduce Redis calls
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch (error) {
    // Log for observability but fail open
    if (error instanceof Error && error.message === 'Timeout') {
      console.warn('[Maintenance] Redis timeout - failing open')
    }
    // Other errors already logged in isMaintenanceMode()

    return NextResponse.json({ enabled: false }, {
      headers: {
        // Short cache on error so we retry soon
        'Cache-Control': 'public, s-maxage=5',
      },
    })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
