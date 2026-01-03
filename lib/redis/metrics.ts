/**
 * Redis Cache Metrics & Observability
 *
 * Tracks cache performance metrics (hit/miss rates, response times, errors)
 * and provides Redis health monitoring for production observability.
 *
 * Architecture:
 * - In-memory aggregation with periodic flush to Redis (every 10 seconds)
 * - Per-pattern tracking enables optimization and debugging
 * - Health checks provide operational visibility
 *
 * Metrics Storage:
 * - In-memory Map for fast updates (no Redis write amplification)
 * - Periodic batch flush to Redis Hash for persistence
 * - Redis keys: cache:metrics:{pattern}
 */

import { getRedisClient } from './client'
import type { CacheKeyPattern, CacheMetrics, CacheHealth, TotalCacheMetrics } from './types'

/**
 * In-memory metrics store (fast updates, batched persistence)
 */
interface MetricsAccumulator {
  hits: number
  misses: number
  errors: number
  totalHitTime: number // Cumulative time for averaging
  totalMissTime: number // Cumulative time for averaging
  lastUpdated: number
}

const metricsStore = new Map<CacheKeyPattern, MetricsAccumulator>()

/**
 * Flush interval in milliseconds (10 seconds)
 */
const FLUSH_INTERVAL_MS = 10000

/**
 * Last flush timestamp
 */
let lastFlushTime = Date.now()

/**
 * Flag to prevent concurrent flushes
 */
let isFlushing = false

/**
 * Initialize metrics accumulator for a pattern if it doesn't exist
 */
function ensureMetrics(pattern: CacheKeyPattern): MetricsAccumulator {
  if (!metricsStore.has(pattern)) {
    metricsStore.set(pattern, {
      hits: 0,
      misses: 0,
      errors: 0,
      totalHitTime: 0,
      totalMissTime: 0,
      lastUpdated: Date.now(),
    })
  }
  return metricsStore.get(pattern)!
}

/**
 * Record a cache hit with response time
 *
 * Called by getCached() when cache key is found in Redis.
 * Tracks hit count and response time for performance monitoring.
 *
 * @param pattern - Cache key pattern (for grouping metrics)
 * @param responseTime - Time taken to retrieve from cache (ms)
 *
 * @example
 * ```typescript
 * const startTime = Date.now()
 * const cached = await redis.get(key)
 * if (cached) {
 *   await recordCacheHit('search', Date.now() - startTime)
 * }
 * ```
 */
export async function recordCacheHit(
  pattern: CacheKeyPattern,
  responseTime: number
): Promise<void> {
  try {
    const metrics = ensureMetrics(pattern)
    metrics.hits++
    metrics.totalHitTime += responseTime
    metrics.lastUpdated = Date.now()

    // Flush to Redis if interval elapsed
    await flushMetricsIfNeeded()
  } catch (error) {
    // Metrics recording should never crash the application
    console.error('[Redis Metrics] Record hit failed:', error)
  }
}

/**
 * Record a cache miss with database query time
 *
 * Called by getCached() when cache key is not found and fallback
 * query is executed. Tracks miss count and database response time.
 *
 * @param pattern - Cache key pattern
 * @param responseTime - Time taken for database fallback (ms)
 */
export async function recordCacheMiss(
  pattern: CacheKeyPattern,
  responseTime: number
): Promise<void> {
  try {
    const metrics = ensureMetrics(pattern)
    metrics.misses++
    metrics.totalMissTime += responseTime
    metrics.lastUpdated = Date.now()

    await flushMetricsIfNeeded()
  } catch (error) {
    console.error('[Redis Metrics] Record miss failed:', error)
  }
}

/**
 * Record a cache error (Redis failure, parse error, etc.)
 *
 * Called when cache operations fail. Helps identify Redis connectivity
 * issues or data corruption problems.
 *
 * @param pattern - Cache key pattern
 * @param error - Error that occurred
 */
export async function recordCacheError(
  pattern: CacheKeyPattern,
  error: Error
): Promise<void> {
  try {
    const metrics = ensureMetrics(pattern)
    metrics.errors++
    metrics.lastUpdated = Date.now()

    console.error(`[Redis Metrics] Error for pattern ${pattern}:`, error.message)

    await flushMetricsIfNeeded()
  } catch (err) {
    console.error('[Redis Metrics] Record error failed:', err)
  }
}

/**
 * Flush metrics to Redis if interval has elapsed
 *
 * Batches metrics updates to Redis to prevent write amplification.
 * Called automatically by record functions, not meant for direct use.
 *
 * Uses isFlushing flag to prevent concurrent flushes from race conditions.
 */
async function flushMetricsIfNeeded(): Promise<void> {
  const now = Date.now()
  if (now - lastFlushTime < FLUSH_INTERVAL_MS) {
    return // Not time to flush yet
  }

  // Prevent concurrent flushes
  if (isFlushing) {
    return
  }

  isFlushing = true
  lastFlushTime = now

  try {
    const redis = getRedisClient()

    // If Redis is not available, skip flushing
    if (!redis) {
      metricsStore.clear()
      isFlushing = false
      return
    }

    const pipeline = redis.pipeline()

    // Persist each pattern's metrics to Redis Hash
    for (const [pattern, metrics] of Array.from(metricsStore.entries())) {
      const key = `cache:metrics:${pattern}`

      // Store as Hash for efficient field updates
      pipeline.hset(key, {
        hits: metrics.hits,
        misses: metrics.misses,
        errors: metrics.errors,
        totalHitTime: metrics.totalHitTime,
        totalMissTime: metrics.totalMissTime,
        lastUpdated: metrics.lastUpdated,
      })

      // Set TTL to prevent indefinite storage (30 days)
      pipeline.expire(key, 30 * 24 * 60 * 60)
    }

    await pipeline.exec()
  } catch (error) {
    console.error('[Redis Metrics] Flush failed:', error)
    // Don't throw - metrics persistence is not critical
  } finally {
    isFlushing = false
  }
}

/**
 * Get cache metrics for a specific pattern or all patterns
 *
 * Combines in-memory metrics with persisted Redis metrics for
 * complete visibility. Used by admin dashboard.
 *
 * @param pattern - Optional pattern to filter (returns all if omitted)
 * @returns Map of pattern to metrics
 *
 * @example
 * ```typescript
 * // Get all metrics
 * const allMetrics = await getCacheMetrics()
 *
 * // Get search metrics only
 * const searchMetrics = await getCacheMetrics('search')
 * ```
 */
export async function getCacheMetrics(
  pattern?: CacheKeyPattern
): Promise<Map<CacheKeyPattern, CacheMetrics>> {
  try {
    const redis = getRedisClient()
    const results = new Map<CacheKeyPattern, CacheMetrics>()

    // Determine which patterns to fetch
    const patterns: CacheKeyPattern[] = pattern
      ? [pattern]
      : [
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

    for (const p of patterns) {
      // Get from Redis (persistent storage)
      const key = `cache:metrics:${p}`
      const redisMetrics = await redis.hgetall(key)

      // Merge with in-memory metrics (recent updates)
      const inMemory = metricsStore.get(p)

      const hits = Number(redisMetrics.hits || 0)
      const misses = Number(redisMetrics.misses || 0)
      const errors = Number(redisMetrics.errors || 0)
      const totalHitTime = Number(redisMetrics.totalHitTime || 0)
      const totalMissTime = Number(redisMetrics.totalMissTime || 0)

      // Calculate averages (avoid division by zero)
      const avgHitTime = hits > 0 ? totalHitTime / hits : 0
      const avgMissTime = misses > 0 ? totalMissTime / misses : 0

      results.set(p, {
        hits,
        misses,
        errors,
        avgHitTime: Math.round(avgHitTime * 100) / 100, // 2 decimal places
        avgMissTime: Math.round(avgMissTime * 100) / 100,
        lastUpdated: Number(redisMetrics.lastUpdated || inMemory?.lastUpdated || Date.now()),
      })
    }

    return results
  } catch (error) {
    console.error('[Redis Metrics] Get metrics failed:', error)
    // Return empty map on error (fail gracefully)
    return new Map()
  }
}

/**
 * Calculate total metrics across all patterns
 *
 * Aggregates metrics from all cache patterns for overall performance view.
 * Used by admin dashboard to show total hit rate and performance.
 *
 * @param metricsByPattern - Map of pattern to metrics (from getCacheMetrics)
 * @returns Aggregated totals
 */
export function calculateTotalMetrics(
  metricsByPattern: Map<CacheKeyPattern, CacheMetrics>
): TotalCacheMetrics {
  let totalHits = 0
  let totalMisses = 0
  let totalErrors = 0
  let totalHitTime = 0
  let totalMissTime = 0

  for (const metrics of Array.from(metricsByPattern.values())) {
    totalHits += metrics.hits
    totalMisses += metrics.misses
    totalErrors += metrics.errors
    totalHitTime += metrics.avgHitTime * metrics.hits // Weighted average
    totalMissTime += metrics.avgMissTime * metrics.misses
  }

  const total = totalHits + totalMisses
  const hitRate = total > 0 ? (totalHits / total) * 100 : 0
  const avgHitTime = totalHits > 0 ? totalHitTime / totalHits : 0
  const avgMissTime = totalMisses > 0 ? totalMissTime / totalMisses : 0

  return {
    hits: totalHits,
    misses: totalMisses,
    errors: totalErrors,
    hitRate: Math.round(hitRate * 100) / 100, // 2 decimal places
    avgHitTime: Math.round(avgHitTime * 100) / 100,
    avgMissTime: Math.round(avgMissTime * 100) / 100,
  }
}

/**
 * Get Redis health information
 *
 * Checks connectivity, latency, memory usage, and uptime.
 * Used by admin dashboard for operational monitoring.
 *
 * @returns Health check data
 *
 * @example
 * ```typescript
 * const health = await getRedisHealth()
 * if (!health.connected) {
 *   console.error('Redis is down!')
 * }
 * if (health.memoryUsed / health.memoryMax > 0.8) {
 *   console.warn('Redis memory usage >80%')
 * }
 * ```
 */
export async function getRedisHealth(): Promise<CacheHealth> {
  try {
    const redis = getRedisClient()

    // Ping for latency check
    const startTime = Date.now()
    await redis.ping()
    const latency = Date.now() - startTime

    // Get server info
    const info = await redis.info('memory')
    const stats = await redis.info('stats')

    // Parse memory info
    const memoryUsed = parseInfoField(info, 'used_memory') || 0
    const memoryMax = parseInfoField(info, 'maxmemory') || 536870912 // Default 512MB

    // Parse uptime
    const uptime = parseInfoField(stats, 'uptime_in_seconds') || 0

    // Calculate overall hit rate from current metrics
    const allMetrics = await getCacheMetrics()
    const totalMetrics = calculateTotalMetrics(allMetrics)

    return {
      connected: true,
      latency,
      memoryUsed,
      memoryMax,
      hitRate: totalMetrics.hitRate,
      uptime,
    }
  } catch (error) {
    console.error('[Redis Metrics] Health check failed:', error)

    // Return disconnected state
    return {
      connected: false,
      latency: 0,
      memoryUsed: 0,
      memoryMax: 0,
      hitRate: 0,
      uptime: 0,
    }
  }
}

/**
 * Parse a field from Redis INFO command output
 *
 * INFO returns text like:
 * ```
 * used_memory:15728640
 * maxmemory:536870912
 * uptime_in_seconds:86400
 * ```
 *
 * @param info - Raw INFO output
 * @param field - Field name to extract
 * @returns Parsed numeric value or null
 */
function parseInfoField(info: string, field: string): number | null {
  const regex = new RegExp(`${field}:(\\d+)`)
  const match = info.match(regex)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Reset all metrics (for testing only)
 *
 * Clears in-memory metrics and Redis-persisted metrics.
 * Should only be used in development/testing environments.
 */
export async function resetAllMetrics(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Redis Metrics] Reset blocked in production')
    return
  }

  try {
    metricsStore.clear()

    const redis = getRedisClient()
    const keys = await redis.keys('cache:metrics:*')

    if (keys.length > 0) {
      await redis.del(...keys)
    }

    console.log('[Redis Metrics] All metrics reset')
  } catch (error) {
    console.error('[Redis Metrics] Reset failed:', error)
  }
}
