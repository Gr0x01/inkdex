/**
 * Server-side PostHog Analytics
 *
 * For tracking events from Next.js server components and API routes.
 * Uses posthog-node instead of posthog-js.
 */

import { PostHog } from 'posthog-node'
import { EVENTS, type SearchCompletedProperties } from './events'

// Lazy-initialized PostHog client (singleton)
let posthogClient: PostHog | null = null

function getPostHogClient(): PostHog | null {
  if (posthogClient) return posthogClient

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) {
    console.warn('[PostHog Server] Missing NEXT_PUBLIC_POSTHOG_KEY')
    return null
  }

  posthogClient = new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // Flush events in batches for efficiency
    flushAt: 20,
    flushInterval: 10000, // 10 seconds
  })

  return posthogClient
}

/**
 * Generate anonymous distinct ID from request headers
 * Uses IP + User-Agent hash for consistent but anonymous tracking
 */
export function generateAnonymousId(headers: Headers): string {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             'unknown'
  const userAgent = headers.get('user-agent') || 'unknown'

  // Simple hash for anonymization
  const raw = `${ip}:${userAgent}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return `anon_${Math.abs(hash).toString(36)}`
}

/**
 * Track a search completed event (server-side)
 * Used for stateless ?q= searches that don't write to DB
 */
export async function trackSearchCompletedServer(
  distinctId: string,
  properties: SearchCompletedProperties
): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.capture({
      distinctId,
      event: EVENTS.SEARCH_COMPLETED,
      properties: {
        ...properties,
        $source: 'server', // Mark as server-side event
      },
    })

    // Also track first search if applicable
    if (properties.is_first_search) {
      client.capture({
        distinctId,
        event: EVENTS.FIRST_SEARCH,
        properties: {
          search_type: properties.search_type,
          $source: 'server',
        },
      })
    }
  } catch (error) {
    // Analytics should never break the user experience
    console.error('[PostHog Server] Failed to track event:', error)
  }
}

/**
 * Track any custom event (server-side)
 */
export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        $source: 'server',
      },
    })
  } catch (error) {
    console.error('[PostHog Server] Failed to track event:', error)
  }
}

/**
 * Flush all pending events (call before response ends if needed)
 */
export async function flushPostHog(): Promise<void> {
  const client = getPostHogClient()
  if (!client) return

  try {
    await client.flush()
  } catch (error) {
    console.error('[PostHog Server] Failed to flush:', error)
  }
}

/**
 * Shutdown PostHog client (call during app shutdown)
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}
