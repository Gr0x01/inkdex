/**
 * Redis-Based Analytics Deduplication
 * Prevents duplicate tracking events within a time window
 */

import { getRedisClient } from './client'

/**
 * Check if an analytics event should be tracked (deduplication check)
 *
 * @param key - Unique event identifier (e.g., "analytics:profile_view:artist-id:session-id")
 * @param ttlSeconds - Time window in seconds (e.g., 300 for 5 minutes)
 * @returns true if event should be tracked, false if it's a duplicate
 */
export async function shouldTrackEvent(key: string, ttlSeconds: number = 300): Promise<boolean> {
  const redis = getRedisClient()

  try {
    // Try to set the key only if it doesn't exist (NX flag)
    // Returns 1 if key was set, 0 if it already existed
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX')

    // If result is 'OK', the key was set (first occurrence)
    // If result is null, the key already existed (duplicate)
    return result === 'OK'
  } catch (error) {
    console.error('[Redis Deduplication] Error:', error)

    // Fail open - allow tracking if Redis is down
    // Better to risk some duplicates than lose all tracking
    return true
  }
}

/**
 * Check if an event is within the deduplication window
 *
 * @param key - Event identifier
 * @returns true if event is a duplicate (within window)
 */
export async function isDuplicateEvent(key: string): Promise<boolean> {
  const redis = getRedisClient()

  try {
    const exists = await redis.exists(key)
    return exists === 1
  } catch (error) {
    console.error('[Redis Deduplication] Error checking duplicate:', error)
    return false // Fail open
  }
}

/**
 * Reset deduplication for a specific key (for testing)
 */
export async function resetDeduplication(key: string): Promise<void> {
  const redis = getRedisClient()
  await redis.del(key)
}
