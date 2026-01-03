/**
 * Instagram OAuth Token Refresh Utilities
 *
 * Instagram long-lived access tokens expire after 60 days.
 * This module handles automatic token refresh to keep users authenticated.
 *
 * Refresh Strategy:
 * - Check expiration in middleware (non-blocking)
 * - Refresh tokens that expire within 7 days
 * - Update Vault with new token + expiration
 * - Log failures for monitoring
 *
 * Instagram Token Lifecycle:
 * 1. Initial OAuth: 60-day long-lived token
 * 2. Refresh (before expiry): Extends by another 60 days
 * 3. If not refreshed: Token expires, user must re-authenticate
 *
 * @see lib/supabase/middleware.ts - Auto-refresh on protected routes
 * @see app/auth/callback/route.ts - Initial token acquisition
 */

import { getInstagramTokens, storeInstagramTokens } from '@/lib/supabase/vault';
import { fetchWithTimeout, TIMEOUTS } from '@/lib/utils/fetch-with-timeout';

// Facebook Graph API endpoint for token refresh (Instagram Graph API uses Facebook auth)
// Instagram tokens are refreshed via Facebook, not Instagram directly
const FACEBOOK_TOKEN_REFRESH_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'

/**
 * Check if Instagram token needs refresh (expires within 7 days)
 *
 * Used by middleware to determine if auto-refresh should run.
 * Returns false if tokens don't exist (user needs to re-authenticate).
 *
 * @param userId - User UUID from Supabase Auth
 * @returns True if token expires within 7 days, false otherwise
 *
 * @example
 * ```typescript
 * // In middleware
 * if (await needsTokenRefresh(user.id)) {
 *   refreshInstagramToken(user.id).catch(err => {
 *     console.error('[Middleware] Token refresh failed:', err)
 *   })
 * }
 * ```
 */
export async function needsTokenRefresh(userId: string): Promise<boolean> {
  const tokens = await getInstagramTokens(userId)
  if (!tokens) {
    return false
  }

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  // Refresh if expires within 7 days
  const needsRefresh = daysUntilExpiry <= 7

  if (needsRefresh) {
    console.log(`[Token Refresh] Token expires in ${Math.floor(daysUntilExpiry)} days - refreshing...`)
  }

  return needsRefresh
}

/**
 * Refresh Instagram access token (extends by 60 days)
 *
 * Exchanges current access token for a new long-lived token.
 * Updates Vault with new token + expiration.
 *
 * Error Handling:
 * - If refresh fails: Logs error, returns false
 * - If token revoked: User must re-authenticate (Phase 3: show "Reconnect Instagram" banner)
 * - If Instagram API error: Retry with exponential backoff (future enhancement)
 *
 * @param userId - User UUID from Supabase Auth
 * @returns True if refresh succeeded, false otherwise
 *
 * @example
 * ```typescript
 * const success = await refreshInstagramToken(userId)
 * if (!success) {
 *   // Show "Reconnect Instagram" banner in dashboard
 *   console.error('Token refresh failed - user must re-authenticate')
 * }
 * ```
 */
export async function refreshInstagramToken(userId: string): Promise<boolean> {
  try {
    const tokens = await getInstagramTokens(userId)
    if (!tokens) {
      console.error(`[Token Refresh] No tokens found for user ${userId}`)
      return false
    }

    console.log(`[Token Refresh] Refreshing token for user ${userId}...`)

    // Call Facebook Graph API to exchange token for new long-lived token
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      fb_exchange_token: tokens.access_token,
    })

    let response: Response;
    try {
      response = await fetchWithTimeout(`${FACEBOOK_TOKEN_REFRESH_URL}?${params}`, {
        method: 'GET',
        timeout: TIMEOUTS.STANDARD, // 30s for Facebook Graph API
      })
    } catch (error: any) {
      // Distinguish timeout from other errors for better monitoring
      if (error.message?.includes('timeout')) {
        console.error(`[Token Refresh] Facebook Graph API timeout for user ${userId}`)
      } else {
        console.error(`[Token Refresh] Network error for user ${userId}:`, error)
      }
      return false
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Token Refresh] Failed for user ${userId}:`, errorText)

      // Check if token was revoked
      if (errorText.includes('revoked') || errorText.includes('expired')) {
        console.error(`[Token Refresh] Token revoked for user ${userId} - user must re-authenticate`)
        // Future: Send email notification, disable auto-sync
      }

      return false
    }

    const data = await response.json()

    // Update Vault with new token + extended expiration
    await storeInstagramTokens(userId, {
      access_token: data.access_token,
      refresh_token: tokens.refresh_token, // Refresh token doesn't change
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // New 60-day expiry
    })

    console.log(`[Token Refresh] Success for user ${userId} - token extended by 60 days`)
    return true
  } catch (error) {
    console.error(`[Token Refresh] Error for user ${userId}:`, error)
    return false
  }
}

/**
 * Check token expiration without refreshing
 *
 * Returns remaining days until token expires.
 * Useful for:
 * - Dashboard UI: "Token expires in 5 days - will auto-refresh"
 * - Monitoring: Alert if many users have tokens expiring soon
 * - Testing: Verify refresh logic is working
 *
 * @param userId - User UUID
 * @returns Days until expiration, or null if no tokens
 *
 * @example
 * ```typescript
 * const daysRemaining = await getTokenExpirationDays(userId)
 * if (daysRemaining && daysRemaining < 7) {
 *   // Show warning in dashboard
 *   console.warn(`Token expires in ${daysRemaining} days`)
 * }
 * ```
 */
export async function getTokenExpirationDays(userId: string): Promise<number | null> {
  const tokens = await getInstagramTokens(userId)
  if (!tokens) {
    return null
  }

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  return Math.floor(daysUntilExpiry)
}

/**
 * Force refresh token (for testing or manual re-authentication)
 *
 * Unlike needsTokenRefresh() which checks expiration, this forces
 * a refresh regardless of expiration date.
 *
 * Use cases:
 * - Testing token refresh flow
 * - Manual "Reconnect Instagram" button in dashboard
 * - Recovery after failed auto-refresh
 *
 * @param userId - User UUID
 * @returns True if refresh succeeded, false otherwise
 *
 * @example
 * ```typescript
 * // In dashboard "Reconnect Instagram" button handler
 * const success = await forceRefreshToken(userId)
 * if (success) {
 *   toast.success('Instagram reconnected successfully')
 * } else {
 *   toast.error('Please log in again with Instagram')
 * }
 * ```
 */
export async function forceRefreshToken(userId: string): Promise<boolean> {
  console.log(`[Token Refresh] Force refresh for user ${userId}`)
  return await refreshInstagramToken(userId)
}
