/**
 * Client-Side Analytics Utilities
 * All events tracked via PostHog (source of truth)
 */

'use client'

import { capturePostHog } from './posthog'

/**
 * Track a link click event (Instagram, booking, website)
 * @param type - Type of click event
 * @param artistId - Artist UUID
 * @param artistSlug - Artist slug for identification
 */
export function trackClick(
  type: 'instagram_click' | 'booking_click',
  artistId: string,
  artistSlug?: string
): void {
  capturePostHog(type === 'instagram_click' ? 'Instagram Click' : 'Booking Click', {
    artist_id: artistId,
    artist_slug: artistSlug,
  })
}

/**
 * Track image view event
 * @param imageId - Portfolio image UUID
 * @param artistId - Artist UUID
 */
export function trackImageView(imageId: string, artistId: string): void {
  capturePostHog('Image View', {
    image_id: imageId,
    artist_id: artistId,
  })
}
