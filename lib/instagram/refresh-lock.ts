/**
 * Token Refresh Deduplication
 *
 * Prevents race conditions when multiple simultaneous requests trigger token refresh.
 * Uses in-memory Map to track ongoing refresh operations per user.
 *
 * Example scenario:
 * - User opens 3 tabs
 * - All 3 tabs hit middleware simultaneously
 * - All detect token expires in 6 days
 * - Without lock: 3 concurrent Instagram API calls (rate limit risk)
 * - With lock: First request refreshes, other 2 await the same promise
 */

import { refreshInstagramToken } from './token-refresh'

// In-memory lock map: userId -> Promise<boolean>
const refreshLocks = new Map<string, Promise<boolean>>()

/**
 * Refresh Instagram token with deduplication
 *
 * If a refresh is already in progress for this user, returns the existing promise
 * instead of starting a new refresh operation.
 *
 * @param userId - User UUID
 * @returns True if refresh succeeded, false otherwise
 *
 * @example
 * ```typescript
 * // In middleware
 * if (await needsTokenRefresh(user.id)) {
 *   refreshWithLock(user.id).catch(err => {
 *     console.error('[Middleware] Token refresh failed:', err)
 *   })
 * }
 * ```
 */
export async function refreshWithLock(userId: string): Promise<boolean> {
  // Check if refresh already in progress
  const existingRefresh = refreshLocks.get(userId)
  if (existingRefresh) {
    console.log(`[Token Refresh] Already in progress for user ${userId}, awaiting existing operation`)
    return existingRefresh
  }

  // Create new refresh promise
  const refreshPromise = refreshInstagramToken(userId).finally(() => {
    // Clean up lock immediately after completion
    // The promise itself acts as the lock during execution
    // Burst requests within milliseconds will see isRefreshInProgress() correctly
    refreshLocks.delete(userId)
  })

  refreshLocks.set(userId, refreshPromise)
  return refreshPromise
}

/**
 * Check if refresh is currently in progress for a user
 *
 * @param userId - User UUID
 * @returns True if refresh is in progress
 */
export function isRefreshInProgress(userId: string): boolean {
  return refreshLocks.has(userId)
}

/**
 * Clear all refresh locks (for testing or server restart)
 */
export function clearAllLocks(): void {
  refreshLocks.clear()
}
