/**
 * Admin Redis Stats API Endpoint
 *
 * GET /api/admin/redis/stats
 *
 * Returns comprehensive Redis cache performance metrics and health information.
 * Used by admin dashboard for monitoring cache effectiveness and Redis operational status.
 *
 * Security: Admin-only (whitelist check)
 *
 * Response includes:
 * - Redis health (connectivity, latency, memory, uptime)
 * - Metrics by pattern (hits, misses, errors, response times)
 * - Total aggregated metrics (overall hit rate, performance)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin/whitelist'
import { getCacheMetrics, getRedisHealth, calculateTotalMetrics } from '@/lib/redis/metrics'
import type { RedisStatsResponse, CacheKeyPattern } from '@/lib/redis/types'

/**
 * Valid cache key patterns for input validation
 */
const VALID_PATTERNS: CacheKeyPattern[] = [
  'search',
  'admin:dashboard',
  'admin:mining',
  'analytics:summary',
  'analytics:top-images',
  'analytics:timeseries',
  'featured:artists',
  'cities:with-counts',
  'artist:profile',
  'city:browse',
]

/**
 * GET /api/admin/redis/stats
 *
 * Fetch Redis cache performance metrics and health status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate optional pattern query parameter
    const { searchParams } = new URL(request.url)
    const patternParam = searchParams.get('pattern')

    let pattern: CacheKeyPattern | undefined
    if (patternParam) {
      // Validate against whitelist to prevent injection
      if (!VALID_PATTERNS.includes(patternParam as CacheKeyPattern)) {
        return NextResponse.json(
          { error: 'Invalid pattern parameter. Must be one of: ' + VALID_PATTERNS.join(', ') },
          { status: 400 }
        )
      }
      pattern = patternParam as CacheKeyPattern
    }

    // Fetch health and metrics in parallel
    const [health, metricsMap] = await Promise.all([
      getRedisHealth(),
      getCacheMetrics(pattern), // Get specific pattern or all patterns
    ])

    // Calculate total metrics across all patterns
    const totalMetrics = calculateTotalMetrics(metricsMap)

    // Convert Map to plain object for JSON serialization
    const metricsByPattern: Record<string, { hits: number; misses: number; hitRate: number }> = {}
    for (const [pattern, metrics] of metricsMap.entries()) {
      const total = metrics.hits + metrics.misses
      metricsByPattern[pattern] = {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: total > 0 ? metrics.hits / total : 0,
      }
    }

    const response: RedisStatsResponse = {
      health,
      metricsByPattern,
      totalMetrics,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Admin Redis Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Redis stats' },
      { status: 500 }
    )
  }
}
