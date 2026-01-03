/**
 * Client-Side Analytics Utilities
 * Helper functions for tracking events from the browser
 */

'use client'

/**
 * Get persistent session ID from sessionStorage
 * Creates a new ID if one doesn't exist
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('inkdex_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    sessionStorage.setItem('inkdex_session_id', sessionId)
  }
  return sessionId
}

/**
 * Track a link click event (Instagram, booking, website)
 * @param type - Type of click event
 * @param artistId - Artist UUID
 */
export function trackClick(
  type: 'instagram_click' | 'booking_click',
  artistId: string
): void {
  const sessionId = getSessionId()

  // Fire-and-forget - don't block user interaction
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, artistId, sessionId }),
  }).catch((err) => {
    // Silently fail - don't break UX
    console.warn('[Analytics] Click tracking failed:', err)
  })
}

/**
 * Track image view event
 * @param imageId - Portfolio image UUID
 * @param artistId - Artist UUID
 */
export function trackImageView(imageId: string, artistId: string): void {
  const sessionId = getSessionId()

  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_view',
      imageId,
      artistId,
      sessionId,
    }),
  }).catch((err) => {
    console.warn('[Analytics] Image view tracking failed:', err)
  })
}
