/**
 * Maintenance Mode via Redis
 * Quick toggle without redeploy - check in middleware
 */

import { getRedisClient } from './client'

const MAINTENANCE_KEY = 'inkdex:maintenance:enabled'

/**
 * Check if maintenance mode is enabled
 * Returns false if Redis unavailable (fail-open)
 */
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const redis = getRedisClient()
    if (!redis) return false

    const value = await redis.get(MAINTENANCE_KEY)
    return value === 'true'
  } catch (error) {
    console.error('[Maintenance] Failed to check status:', error)
    return false // Fail open - don't block traffic if Redis is down
  }
}

/**
 * Enable maintenance mode
 */
export async function enableMaintenanceMode(): Promise<boolean> {
  try {
    const redis = getRedisClient()
    if (!redis) {
      console.error('[Maintenance] Redis not available')
      return false
    }

    await redis.set(MAINTENANCE_KEY, 'true')
    console.log('[Maintenance] Mode ENABLED')
    return true
  } catch (error) {
    console.error('[Maintenance] Failed to enable:', error)
    return false
  }
}

/**
 * Disable maintenance mode
 */
export async function disableMaintenanceMode(): Promise<boolean> {
  try {
    const redis = getRedisClient()
    if (!redis) {
      console.error('[Maintenance] Redis not available')
      return false
    }

    await redis.del(MAINTENANCE_KEY)
    console.log('[Maintenance] Mode DISABLED')
    return true
  } catch (error) {
    console.error('[Maintenance] Failed to disable:', error)
    return false
  }
}
