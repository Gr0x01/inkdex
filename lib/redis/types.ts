/**
 * Redis Caching Type Definitions
 *
 * Shared TypeScript interfaces for the caching layer.
 * Provides type safety and metrics grouping across all cache operations.
 */

/**
 * Cache key pattern definitions for type safety and metrics tracking
 *
 * Each pattern represents a logical group of cache keys that share
 * similar characteristics (TTL, invalidation strategy, hit rate).
 */
export type CacheKeyPattern =
  | 'search' // Search results by embedding hash
  | 'admin:dashboard' // Admin dashboard statistics
  | 'admin:mining' // Mining pipeline statistics
  | 'analytics:summary' // Artist analytics summary metrics
  | 'analytics:top-images' // Top performing images by artist
  | 'analytics:timeseries' // Daily analytics time series data
  | 'analytics:searches' // Recent search appearances for artist
  | 'featured:artists' // Featured artists by state
  | 'cities:with-counts' // Cities with artist counts
  | 'artist:profile' // Individual artist profiles by slug
  | 'city:browse' // City browse page artist listings

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   *
   * Common TTL values:
   * - 300s (5 min) - Admin dashboard stats
   * - 600s (10 min) - Mining stats
   * - 1800s (30 min) - Analytics data
   * - 3600s (1 hour) - Cities with counts
   * - 21600s (6 hours) - Featured artists, city browse
   * - 43200s (12 hours) - Artist profiles
   * - 86400s (24 hours) - Search results
   */
  ttl: number

  /**
   * Pattern for metrics grouping
   *
   * Used to aggregate hit/miss rates and performance metrics
   * across related cache keys.
   */
  pattern: CacheKeyPattern

  /**
   * Whether to compress large payloads before storing
   *
   * Recommended for:
   * - Search results (large arrays)
   * - Featured artists (arrays of artist objects)
   * - City browse pages (paginated artist lists)
   *
   * Default: false
   */
  compress?: boolean
}

/**
 * Cache performance metrics for a specific pattern
 *
 * Tracks hit rates, error rates, and response time performance
 * to enable optimization and monitoring.
 */
export interface CacheMetrics {
  /** Total cache hits */
  hits: number

  /** Total cache misses (fallback to database) */
  misses: number

  /** Total cache errors (Redis failures) */
  errors: number

  /** Average cache hit response time in milliseconds */
  avgHitTime: number

  /** Average database fallback response time in milliseconds */
  avgMissTime: number

  /** Timestamp of last metrics update */
  lastUpdated: number
}

/**
 * Redis health check information
 *
 * Provides operational metrics for monitoring Redis connectivity,
 * performance, and memory usage.
 */
export interface CacheHealth {
  /** Whether Redis is currently connected and responsive */
  connected: boolean

  /** Ping latency in milliseconds */
  latency: number

  /** Current memory usage in bytes */
  memoryUsed: number

  /** Maximum configured memory in bytes */
  memoryMax: number

  /** Overall cache hit rate as percentage (0-100) */
  hitRate: number

  /** Redis server uptime in seconds */
  uptime: number
}

/**
 * Aggregated metrics across all cache patterns
 *
 * Used by admin dashboard to show overall caching performance.
 */
export interface TotalCacheMetrics {
  /** Total hits across all patterns */
  hits: number

  /** Total misses across all patterns */
  misses: number

  /** Total errors across all patterns */
  errors: number

  /** Overall hit rate percentage (0-100) */
  hitRate: number

  /** Average cache hit time across all patterns */
  avgHitTime: number

  /** Average miss time across all patterns */
  avgMissTime: number
}

/**
 * Admin API response for Redis statistics endpoint
 */
export interface RedisStatsResponse {
  /** Redis server health information */
  health: CacheHealth

  /** Metrics broken down by pattern (with calculated hit rate) */
  metricsByPattern: Record<string, { hits: number; misses: number; hitRate: number }>

  /** Aggregated metrics across all patterns */
  totalMetrics: TotalCacheMetrics
}
