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

  // If Redis is not available, fail open
  if (!redis) {
    return {
      success: true,
      limit,
      remaining: limit,
      reset: resetAt,
    }
  }

  try {
    // Step 1: Clean expired entries and count current requests
    // Use pipeline to make these operations atomic
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    pipeline.zcard(key)

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

    // Step 2: Check if we're within limit BEFORE adding request
    if (currentCount < limit) {
      // Within limit - add the request
      const member = `${now}-${Math.random().toString(36).substring(2)}`
      await redis.zadd(key, now, member)
      await redis.expire(key, Math.ceil(windowMs / 1000))

      return {
        success: true,
        limit,
        remaining: limit - currentCount - 1, // -1 because we just added one
        reset: resetAt,
      }
    } else {
      // Over limit - reject without adding
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
  if (!redis) {
    return
  }
  await redis.del(key)
}

/**
 * Get current count for a rate limit key
 */
export async function getRateLimitCount(key: string, windowMs: number): Promise<number> {
  const redis = getRedisClient()
  if (!redis) {
    return 0
  }
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
