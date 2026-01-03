/**
 * Redis-Based Rate Limiter
 * Uses sliding window algorithm for accurate rate limiting across serverless instances
 */

import { getRedisClient } from './client'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit using Redis sliding window algorithm
 *
 * This uses a sorted set with timestamps as scores to track requests
 * in a sliding time window. More accurate than fixed windows.
 *
 * @param key - Unique identifier (e.g., "search:192.168.1.1")
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient()
  const now = Date.now()
  const windowStart = now - windowMs
  const resetAt = now + windowMs

  try {
    // Generate unique member identifier (must be stored to remove if over limit)
    const member = `${now}-${Math.random().toString(36).substring(2)}`

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()

    // 1. Remove expired entries (older than window)
    pipeline.zremrangebyscore(key, '-inf', windowStart)

    // 2. Count current requests in window
    pipeline.zcard(key)

    // 3. Add current request with timestamp
    pipeline.zadd(key, now, member)

    // 4. Set expiry on key (cleanup)
    pipeline.expire(key, Math.ceil(windowMs / 1000))

    // Execute all commands atomically
    const results = await pipeline.exec()

    if (!results) {
      throw new Error('Pipeline execution failed')
    }

    // Extract count (result of ZCARD command, index 1)
    const countResult = results[1]
    if (countResult[0]) {
      throw countResult[0] // Error from ZCARD
    }

    const currentCount = countResult[1] as number

    // Check if within limit (count BEFORE adding current request)
    const withinLimit = currentCount <= limit

    if (withinLimit) {
      return {
        success: true,
        limit,
        remaining: limit - currentCount,
        reset: resetAt,
      }
    } else {
      // Over limit - remove the request we just added (using same member value)
      await redis.zrem(key, member)

      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetAt,
      }
    }
  } catch (error) {
    console.error('[Redis Rate Limiter] Error:', error)

    // Fail open - allow request if Redis is down
    // Better to risk some abuse than block legitimate users
    return {
      success: true,
      limit,
      remaining: limit,
      reset: resetAt,
    }
  }
}

/**
 * Reset rate limit for a specific key (for testing)
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient()
  await redis.del(key)
}

/**
 * Get current count for a rate limit key
 */
export async function getRateLimitCount(key: string, windowMs: number): Promise<number> {
  const redis = getRedisClient()
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // Remove expired entries first
    await redis.zremrangebyscore(key, '-inf', windowStart)

    // Get count
    const count = await redis.zcard(key)
    return count
  } catch (error) {
    console.error('[Redis Rate Limiter] Error getting count:', error)
    return 0
  }
}
