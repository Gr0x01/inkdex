/**
 * Redis Caching Utility Layer
 *
 * Provides core caching operations with fail-open resilience, automatic metrics
 * collection, and type-safe cache key generation.
 *
 * Key Features:
 * - Generic getCached<T>() with automatic fallback to database
 * - Fire-and-forget cache writes (non-blocking)
 * - SHA256 embedding hashing for search cache keys
 * - Pattern-based cache invalidation
 * - Comprehensive error handling and logging
 *
 * Design Philosophy:
 * - Fail-open: Cache failures never break the application
 * - Performance: Fire-and-forget writes, minimal blocking
 * - Observability: All operations tracked via metrics layer
 */

import * as crypto from 'crypto'
import { getRedisClient } from './client'
import { recordCacheHit, recordCacheMiss, recordCacheError } from './metrics'
import type { CacheOptions, CacheKeyPattern } from './types'

/**
 * Get value from cache or fallback to database query
 *
 * This is the primary caching function used throughout the application.
 * It implements a fail-open pattern: if Redis is unavailable, it falls back
 * to the database query without throwing errors.
 *
 * @param key - Full cache key (use generateCacheKey() to create)
 * @param options - Cache options (TTL and pattern for metrics)
 * @param fallback - Function to call if cache miss (database query)
 * @returns Cached data or fresh data from fallback
 *
 * @example
 * ```typescript
 * const cacheKey = generateCacheKey('search', { hash: embeddingHash, city: 'austin' })
 * const results = await getCached(
 *   cacheKey,
 *   { ttl: 86400, pattern: 'search' },
 *   () => searchArtistsByEmbedding(embedding, { city: 'austin' })
 * )
 * ```
 */
export async function getCached<T>(
  key: string,
  options: CacheOptions,
  fallback: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  try {
    const redis = getRedisClient()

    // If Redis is not available, skip caching and use fallback
    if (!redis) {
      return await fallback()
    }

    const cached = await redis.get(key)

    if (cached) {
      // Cache hit
      const responseTime = Date.now() - startTime
      await recordCacheHit(options.pattern, responseTime)

      try {
        return JSON.parse(cached) as T
      } catch (parseError) {
        console.error('[Redis Cache] JSON parse error for key:', key, parseError)
        // Fall through to database query if cached data is corrupted
      }
    }

    // Cache miss - fetch from database
    const result = await fallback()
    const queryTime = Date.now() - startTime

    // Fire-and-forget cache set (don't block on Redis writes)
    setCached(key, result, options).catch((err) => {
      console.error(`[Redis Cache] Set failed for pattern ${options.pattern}:`, err)
      recordCacheError(options.pattern, err)
    })

    await recordCacheMiss(options.pattern, queryTime)
    return result
  } catch (error) {
    // Redis connection error or other failure
    console.error(`[Redis Cache] Get failed for pattern ${options.pattern}:`, error)
    await recordCacheError(options.pattern, error as Error)

    // Fail open - always call fallback on error
    return await fallback()
  }
}

/**
 * Store value in cache with TTL
 *
 * This is typically called automatically by getCached() in a fire-and-forget manner.
 * Can also be used directly for pre-warming caches or manual cache updates.
 *
 * @param key - Full cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param options - Cache options (TTL and pattern)
 *
 * @example
 * ```typescript
 * await setCached(
 *   'admin:dashboard:stats',
 *   { artists: 100, images: 5000 },
 *   { ttl: 300, pattern: 'admin:dashboard' }
 * )
 * ```
 */
export async function setCached(
  key: string,
  value: unknown,
  options: CacheOptions
): Promise<void> {
  try {
    const redis = getRedisClient()
    if (!redis) {
      return // Redis not available, skip caching
    }
    const serialized = JSON.stringify(value)

    // Set with expiration (EX = seconds)
    await redis.set(key, serialized, 'EX', options.ttl)
  } catch (error) {
    // Don't throw - cache set failures should not break the application
    console.error(`[Redis Cache] Set failed for pattern ${options.pattern}:`, error)
    throw error // Re-throw for fire-and-forget catch handler
  }
}

/**
 * Invalidate cache by pattern using SCAN
 *
 * Uses Redis SCAN command for safe, non-blocking pattern matching.
 * Deletes all keys matching the pattern in batches via pipeline.
 *
 * @param pattern - Redis key pattern (supports * and ? wildcards)
 * @returns Number of keys deleted
 *
 * @example
 * ```typescript
 * // Invalidate all featured artist caches
 * await invalidateCache('featured:artists:*')
 *
 * // Invalidate single artist profile
 * await invalidateCache('artist:profile:john-doe')
 *
 * // Invalidate all admin caches
 * await invalidateCache('admin:*')
 * ```
 */
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const redis = getRedisClient()
    if (!redis) {
      return 0 // Redis not available
    }
    const keys: string[] = []
    let cursor = '0'

    // Use SCAN for safe iteration (non-blocking, production-safe)
    do {
      const [newCursor, matchedKeys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      )
      cursor = newCursor
      keys.push(...matchedKeys)
    } while (cursor !== '0')

    if (keys.length > 0 && redis) {
      // Batch delete using pipeline for performance
      const pipeline = redis.pipeline()
      keys.forEach((key) => pipeline.del(key))
      await pipeline.exec()

      console.log(`[Redis Cache] Invalidated ${keys.length} keys matching pattern: ${pattern}`)
    }

    return keys.length
  } catch (error) {
    console.error(`[Redis Cache] Invalidation failed for pattern ${pattern}:`, error)
    // Fail silently - invalidation failures are not critical
    return 0
  }
}

/**
 * Invalidate multiple patterns in parallel
 *
 * Convenience function for invalidating multiple cache patterns at once.
 * Useful when a single action affects multiple cache groups.
 *
 * @param patterns - Array of cache key patterns to invalidate
 * @returns Total number of keys deleted
 *
 * @example
 * ```typescript
 * // Artist updates affect multiple caches
 * await invalidateMultiple([
 *   `artist:profile:${slug}`,
 *   `city:browse:${state}:${city}:*`,
 *   'featured:artists:*'
 * ])
 * ```
 */
export async function invalidateMultiple(patterns: string[]): Promise<number> {
  const results = await Promise.all(patterns.map((pattern) => invalidateCache(pattern)))
  return results.reduce((total, count) => total + count, 0)
}

/**
 * Generate type-safe cache key from pattern and parameters
 *
 * Creates cache keys in a consistent format: {pattern}:{param1}:{param2}...
 * Ensures type safety and consistent key structure across the application.
 *
 * @param pattern - Cache key pattern (from CacheKeyPattern type)
 * @param params - Key-value pairs for cache key parameters
 * @returns Formatted cache key
 *
 * @example
 * ```typescript
 * // search:abc123:austin:0.15:20
 * generateCacheKey('search', {
 *   hash: 'abc123',
 *   city: 'austin',
 *   threshold: '0.15',
 *   limit: '20'
 * })
 *
 * // analytics:summary:uuid-123:30
 * generateCacheKey('analytics:summary', {
 *   artistId: 'uuid-123',
 *   days: '30'
 * })
 * ```
 */
export function generateCacheKey(
  pattern: CacheKeyPattern,
  params: Record<string, string | number | null>
): string {
  const parts: string[] = [pattern]

  // Sort keys for consistency (same params = same key regardless of order)
  const sortedKeys = Object.keys(params).sort()

  for (const key of sortedKeys) {
    const value = params[key]
    if (value !== null && value !== undefined) {
      // Sanitize: Replace colons with hyphens to prevent cache key injection
      const sanitized = String(value).replace(/:/g, '-')
      parts.push(sanitized)
    }
  }

  return parts.join(':')
}

/**
 * Generate SHA256 hash for CLIP embedding vectors
 *
 * Creates a compact, deterministic hash from embedding arrays for use as
 * cache keys. Uses first 32 and last 32 values as a sample (sufficient
 * for uniqueness in practice).
 *
 * The 16-character hash is a good balance between uniqueness and key size:
 * - 16 hex chars = 64 bits = 2^64 possible values
 * - Collision probability: ~1 in 18 quintillion
 *
 * @param embedding - CLIP embedding array (768 dimensions)
 * @returns 16-character hex hash
 *
 * @example
 * ```typescript
 * const embedding = [0.123, -0.456, ...] // 768 floats
 * const hash = hashEmbedding(embedding)
 * // => "a1b2c3d4e5f67890"
 * ```
 */
export function hashEmbedding(embedding: number[]): string {
  // Sample first 32 and last 32 values (sufficient for uniqueness)
  // Full 768-dim hash would be unnecessarily expensive
  const sample = [...embedding.slice(0, 32), ...embedding.slice(-32)]

  return crypto
    .createHash('sha256')
    .update(sample.join(','))
    .digest('hex')
    .substring(0, 16) // 16 chars = 64 bits of entropy
}

/**
 * Check if Redis caching is enabled
 *
 * Respects feature flag environment variables for gradual rollout.
 * Master toggle: ENABLE_REDIS_CACHE
 * Per-feature toggles: ENABLE_SEARCH_CACHE, ENABLE_ANALYTICS_CACHE, etc.
 *
 * @param feature - Optional feature-specific flag name
 * @returns Whether caching is enabled
 *
 * @example
 * ```typescript
 * if (!isCachingEnabled('ENABLE_SEARCH_CACHE')) {
 *   return await fallback() // Bypass cache
 * }
 * ```
 */
export function isCachingEnabled(feature?: string): boolean {
  // Master toggle - disable all caching
  if (process.env.ENABLE_REDIS_CACHE === 'false') {
    return false
  }

  // Feature-specific toggle (if provided)
  if (feature && process.env[feature] === 'false') {
    return false
  }

  // Default: enabled (fail-open means we try cache, fall back on error)
  return true
}
