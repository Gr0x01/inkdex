/**
 * Redis-Based Distributed Locks
 * Prevents race conditions across serverless instances
 */

import { getRedisClient } from './client'

/**
 * Acquire a distributed lock
 *
 * @param key - Lock key (e.g., "token-refresh:user-id")
 * @param ttlSeconds - Lock expiration time in seconds
 * @returns Lock token if acquired, null if lock is held by another instance
 */
export async function acquireLock(key: string, ttlSeconds: number = 30): Promise<string | null> {
  const redis = getRedisClient()
  if (!redis) {
    return null
  }
  const lockToken = `${Date.now()}-${Math.random().toString(36).substring(2)}`

  try {
    // Try to set the key only if it doesn't exist (NX flag)
    const result = await redis.set(key, lockToken, 'EX', ttlSeconds, 'NX')

    if (result === 'OK') {
      return lockToken
    }

    return null // Lock is already held
  } catch (error) {
    console.error('[Redis Lock] Error acquiring lock:', error)
    return null
  }
}

/**
 * Release a distributed lock
 *
 * Only releases the lock if the token matches (prevents releasing someone else's lock)
 *
 * @param key - Lock key
 * @param lockToken - Token returned from acquireLock
 * @returns true if lock was released, false if token didn't match or lock didn't exist
 */
export async function releaseLock(key: string, lockToken: string): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  try {
    // Lua script to atomically check token and delete if it matches
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `

    const result = await redis.eval(script, 1, key, lockToken)
    return result === 1
  } catch (error) {
    console.error('[Redis Lock] Error releasing lock:', error)
    return false
  }
}

/**
 * Check if a lock is currently held
 *
 * @param key - Lock key
 * @returns true if lock is held
 */
export async function isLockHeld(key: string): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  try {
    const exists = await redis.exists(key)
    return exists === 1
  } catch (error) {
    console.error('[Redis Lock] Error checking lock:', error)
    return false
  }
}

/**
 * Wait for a lock to become available, then acquire it
 *
 * @param key - Lock key
 * @param ttlSeconds - Lock expiration time
 * @param maxWaitMs - Maximum time to wait for lock (default 10 seconds)
 * @returns Lock token if acquired, null if timeout
 */
export async function waitForLock(
  key: string,
  ttlSeconds: number = 30,
  maxWaitMs: number = 10000
): Promise<string | null> {
  const startTime = Date.now()
  const pollInterval = 100 // Check every 100ms

  while (Date.now() - startTime < maxWaitMs) {
    const token = await acquireLock(key, ttlSeconds)
    if (token) {
      return token
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  return null // Timeout
}
