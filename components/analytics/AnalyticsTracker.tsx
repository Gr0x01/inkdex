/**
 * Analytics Tracker Component
 * Invisible component that tracks page views
 */

'use client'

import { useEffect, useRef } from 'react'

interface AnalyticsTrackerProps {
  type: 'profile_view' | 'image_view'
  artistId: string
  imageId?: string
}

// Generate persistent session ID (stored in sessionStorage)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('inkdex_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    sessionStorage.setItem('inkdex_session_id', sessionId)
  }
  return sessionId
}

export default function AnalyticsTracker({
  type,
  artistId,
  imageId,
}: AnalyticsTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    const sessionId = getSessionId()

    // Delay tracking slightly to avoid blocking page render
    const timeout = setTimeout(() => {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, artistId, imageId, sessionId }),
      }).catch((err) => {
        console.warn('[Analytics] Tracking failed:', err)
        // Silently fail - don't break UX
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [type, artistId, imageId])

  return null // Invisible component
}
