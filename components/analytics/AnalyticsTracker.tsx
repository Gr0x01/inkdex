/**
 * Analytics Tracker Component
 * Invisible component that tracks page views via PostHog
 */

'use client'

import { useEffect, useRef } from 'react'
import { capturePostHog } from '@/lib/analytics/posthog'
import { EVENTS } from '@/lib/analytics/events'

interface AnalyticsTrackerProps {
  type: 'profile_view' | 'image_view'
  artistId: string
  artistSlug?: string
  imageId?: string
}

export default function AnalyticsTracker({
  type,
  artistId,
  artistSlug,
  imageId,
}: AnalyticsTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    // Delay tracking slightly to avoid blocking page render
    const timeout = setTimeout(() => {
      if (type === 'profile_view') {
        capturePostHog(EVENTS.PROFILE_VIEWED, {
          artist_id: artistId,
          artist_slug: artistSlug,
          source: document.referrer.includes('/search') ? 'search' : 'direct',
        })
      } else if (type === 'image_view' && imageId) {
        capturePostHog('Image View', {
          image_id: imageId,
          artist_id: artistId,
        })
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [type, artistId, artistSlug, imageId])

  return null // Invisible component
}
