import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * In-memory rate limiter for scraping protection
 *
 * Thresholds designed to not affect normal users:
 * - Normal browsing: 5-10 pages/minute
 * - Aggressive scraper: 100+ pages/minute
 *
 * We use 60 requests/minute as the threshold - generous for users,
 * but catches automated scraping.
 *
 * Note: In-memory state resets on deploy, which is fine - scrapers
 * will just get a fresh window. For persistent limiting, use Redis
 * in the actual route handlers.
 */
const RATE_LIMIT = 60 // requests per minute
const WINDOW_MS = 60 * 1000 // 1 minute
const BLOCK_DURATION_MS = 10 * 60 * 1000 // 10 minute block after hitting limit

// Track request counts per IP
const requestCounts = new Map<string, { count: number; windowStart: number }>()
// Track blocked IPs
const blockedIps = new Map<string, number>() // IP -> block expiry timestamp

// Cleanup old entries every 5 minutes to prevent memory leak
let lastCleanup = Date.now()
function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return

  lastCleanup = now

  // Clean up expired blocks
  for (const [ip, expiry] of blockedIps) {
    if (now > expiry) blockedIps.delete(ip)
  }

  // Clean up old request windows
  for (const [ip, data] of requestCounts) {
    if (now - data.windowStart > WINDOW_MS * 2) requestCounts.delete(ip)
  }
}

/**
 * Check if request should be rate limited
 * Returns true if request should be blocked
 */
function shouldRateLimit(ip: string): boolean {
  const now = Date.now()

  // Check if IP is currently blocked
  const blockExpiry = blockedIps.get(ip)
  if (blockExpiry && now < blockExpiry) {
    return true
  } else if (blockExpiry) {
    // Block expired, remove it
    blockedIps.delete(ip)
  }

  // Get or create request count for this IP
  const record = requestCounts.get(ip)

  if (!record || now - record.windowStart > WINDOW_MS) {
    // New window
    requestCounts.set(ip, { count: 1, windowStart: now })
    return false
  }

  // Increment count
  record.count++

  // Check if over limit
  if (record.count > RATE_LIMIT) {
    // Block this IP for BLOCK_DURATION_MS
    blockedIps.set(ip, now + BLOCK_DURATION_MS)
    return true
  }

  return false
}

/**
 * Get client IP from request
 *
 * SECURITY: Only trust Vercel-specific headers to prevent IP spoofing.
 * Vercel sets x-real-ip from the actual client connection, not from
 * user-supplied headers.
 *
 * @see https://vercel.com/docs/edge-network/headers#x-real-ip
 */
function getClientIp(request: NextRequest): string {
  // x-real-ip is set by Vercel from the TCP connection, not spoofable
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  // In development or non-Vercel environments, fall back to forwarded-for
  // This is less secure but necessary for local testing
  if (process.env.NODE_ENV === 'development') {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
  }

  // Fallback for development
  return '127.0.0.1'
}

/**
 * US states for path matching
 * Only match actual state routes, not /api, /dev, /admin, etc.
 */
const US_STATES = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new-hampshire', 'new-jersey', 'new-mexico', 'new-york',
  'north-carolina', 'north-dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west-virginia', 'wisconsin', 'wyoming', 'district-of-columbia',
])

/**
 * Paths that should be rate limited (scrapable content)
 * We only rate limit public content pages, not API routes
 * (API routes have their own Redis-based rate limiting)
 */
function isScrapablePath(pathname: string): boolean {
  // Artist profile pages
  if (pathname.startsWith('/artist/')) return true

  // Style pages
  if (pathname.startsWith('/styles/')) return true

  // US country path
  if (pathname.startsWith('/us/')) return true

  // State pages - check against known states to avoid matching /api, /dev, etc.
  const firstSegment = pathname.split('/')[1]
  if (firstSegment && US_STATES.has(firstSegment)) return true

  return false
}

/**
 * Maintenance mode cache
 * Caches the Redis check for 60 seconds to avoid hammering the API on every request.
 * Worst case: 60 second delay before maintenance mode kicks in (acceptable for emergencies).
 */
let maintenanceModeCache: boolean = false
let maintenanceCacheExpiry: number = 0
const MAINTENANCE_CACHE_TTL = 60_000 // 60 seconds

/**
 * Check maintenance mode via internal API (cached)
 * Uses fetch because ioredis doesn't work on Edge runtime
 */
async function checkMaintenanceMode(request: NextRequest): Promise<boolean> {
  const now = Date.now()

  // Return cached value if still valid
  if (now < maintenanceCacheExpiry) {
    return maintenanceModeCache
  }

  try {
    // Build absolute URL for internal API call
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/maintenance/status`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    })

    if (!response.ok) {
      // Cache the "not in maintenance" result too
      maintenanceModeCache = false
      maintenanceCacheExpiry = now + MAINTENANCE_CACHE_TTL
      return false
    }

    const data = await response.json()
    const enabled = data.enabled === true

    // Cache the result
    maintenanceModeCache = enabled
    maintenanceCacheExpiry = now + MAINTENANCE_CACHE_TTL

    return enabled
  } catch {
    // Fail open - if we can't check, don't block
    // But still cache to avoid hammering a failing endpoint
    maintenanceModeCache = false
    maintenanceCacheExpiry = now + MAINTENANCE_CACHE_TTL
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Run cleanup periodically
  cleanupStaleEntries()

  // Maintenance mode - check Redis via internal API
  // Skip for admin routes, the maintenance page itself, and the status API
  const isMaintenanceExempt =
    pathname === '/maintenance' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/maintenance') ||
    pathname === '/api/health'

  if (!isMaintenanceExempt) {
    const inMaintenance = await checkMaintenanceMode(request)
    if (inMaintenance) {
      return NextResponse.rewrite(new URL('/maintenance', request.url))
    }
  }

  // Rate limit scrapable paths
  if (isScrapablePath(pathname)) {
    const ip = getClientIp(request)

    if (shouldRateLimit(ip)) {
      console.warn(`[Rate Limit] Blocked IP: ${ip}, Path: ${pathname}`)

      // Return 429 with retry-after header
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please slow down. Try again in a few minutes.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '600', // 10 minutes
          },
        }
      )
    }
  }

  // Redirect /artists (browse page) to /texas (default state browse)
  if (pathname === '/artists') {
    return NextResponse.redirect(new URL('/texas', request.url), 301)
  }

  // Redirect /artists/* to /artist/* (route standardization)
  if (pathname.startsWith('/artists/')) {
    const slug = pathname.replace('/artists/', '')
    return NextResponse.redirect(new URL(`/artist/${slug}`, request.url), 301)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
