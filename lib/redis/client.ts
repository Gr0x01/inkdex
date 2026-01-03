/**
 * Redis Client Singleton
 * Provides a single Redis connection for the application
 */

import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Get or create Redis client
 * Uses Railway Redis connection string from environment
 * Returns null if REDIS_URL is not set (graceful degradation)
 */
export function getRedisClient(): Redis | null {
  if (redis) {
    return redis
  }

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set, Redis features disabled')
    return null
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) {
        console.error('[Redis] Max retries reached, giving up')
        return null // Stop retrying
      }
      const delay = Math.min(times * 100, 3000)
      console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`)
      return delay
    },
    reconnectOnError(err) {
      console.error('[Redis] Connection error:', err.message)
      // Reconnect on connection errors
      return true
    },
  })

  // Connection event handlers
  redis.on('connect', () => {
    console.log('[Redis] Connected successfully')
  })

  redis.on('ready', () => {
    console.log('[Redis] Ready to accept commands')
  })

  redis.on('error', (err) => {
    console.error('[Redis] Error:', err)
  })

  redis.on('close', () => {
    console.warn('[Redis] Connection closed')
  })

  redis.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...')
  })

  return redis
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisClient(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
    console.log('[Redis] Connection closed')
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}
