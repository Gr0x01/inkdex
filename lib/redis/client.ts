/**
 * Redis Client Singleton
 * Provides a single Redis connection for the application
 *
 * Optimized for serverless (Vercel) where connections go stale between invocations
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
    // Store status once to avoid race conditions in concurrent invocations
    const status = redis.status

    // Only return if truly ready - don't return connecting connections
    // as they may never complete in serverless cold starts
    if (status === 'ready') {
      return redis
    }

    // Any other state (connecting, connect, close, end, wait, reconnecting)
    // means we need to clean up and start fresh for serverless reliability
    try {
      redis.disconnect()
    } catch {
      // Ignore disconnect errors on stale connections
    }
    redis = null
  }

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    // Only warn once, not on every cold start
    return null
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,        // Fail fast in serverless (was 3)
    connectTimeout: 5000,            // 5s connection timeout
    commandTimeout: 3000,            // 3s per command timeout
    enableReadyCheck: true,
    lazyConnect: false,              // Connect immediately
    retryStrategy(times) {
      if (times > 1) {
        // In serverless, fail fast - don't retry multiple times
        return null
      }
      return 100 // Single quick retry
    },
    reconnectOnError() {
      // Don't auto-reconnect in serverless - let next request create fresh connection
      return false
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
    if (!client) {
      return false
    }
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}
