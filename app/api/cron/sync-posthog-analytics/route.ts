import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/cron/sync-posthog-analytics
 *
 * Daily cron job to sync analytics from PostHog to Supabase cache.
 * Called by Vercel Cron (see vercel.json).
 *
 * This keeps the analytics_cache table up-to-date with PostHog data,
 * enabling fast dashboard queries without hitting PostHog's API.
 */

// Environment variables
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

// PostHog API configuration
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '285744' // Inkdex project ID
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

// Whitelist of allowed event names (defense against SQL injection)
const ALLOWED_EVENTS = new Set([
  'Profile Viewed',
  'Instagram Click',
  'Booking Click',
  'Search Result Clicked',
])

// Request timeout for PostHog API calls
const POSTHOG_TIMEOUT_MS = 30000

/**
 * Verify cron authorization following established pattern
 */
function verifyCronAuth(request: Request): boolean {
  if (!CRON_SECRET) {
    console.error('[PostHog Sync] CRON_SECRET not configured - endpoint disabled')
    return false
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${CRON_SECRET}`
}

interface PostHogQueryResult {
  results: Array<Array<string | number>> // [[artist_id, count], ...]
  columns?: string[]
  error?: string
}

interface ArtistMetrics {
  profile_views: number
  instagram_clicks: number
  booking_clicks: number
  search_appearances: number
  image_views: number
}

type Period = '7d' | '30d' | '90d' | 'all'

const PERIODS: { name: Period; days: number | null }[] = [
  { name: '7d', days: 7 },
  { name: '30d', days: 30 },
  { name: '90d', days: 90 },
  { name: 'all', days: null },
]

/**
 * Query PostHog for event counts grouped by artist_id
 */
async function queryPostHogEventCounts(
  eventName: string,
  days: number | null
): Promise<Map<string, number>> {
  if (!POSTHOG_API_KEY) {
    console.warn('[PostHog Sync] Missing POSTHOG_PERSONAL_API_KEY')
    return new Map()
  }

  // Validate event name against whitelist (SQL injection defense)
  if (!ALLOWED_EVENTS.has(eventName)) {
    console.error(`[PostHog Sync] Invalid event name rejected: ${eventName}`)
    return new Map()
  }

  // Validate days parameter
  if (days !== null && (typeof days !== 'number' || days < 1 || days > 365)) {
    console.error(`[PostHog Sync] Invalid days parameter: ${days}`)
    return new Map()
  }

  const dateFilter = days ? `AND timestamp > now() - interval ${days} day` : ''

  const query = `
    SELECT
      properties.artist_id AS artist_id,
      count() AS event_count
    FROM events
    WHERE event = '${eventName}'
      AND properties.artist_id IS NOT NULL
      AND properties.artist_id != ''
      ${dateFilter}
    GROUP BY properties.artist_id
    ORDER BY event_count DESC
    LIMIT 10000
  `

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), POSTHOG_TIMEOUT_MS)

  try {
    const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query,
        },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[PostHog Sync] Query failed for ${eventName}:`, errorText)
      return new Map()
    }

    const data = await response.json() as PostHogQueryResult

    if (data.error) {
      console.error(`[PostHog Sync] Query error for ${eventName}:`, data.error)
      return new Map()
    }

    const results = new Map<string, number>()

    // Results are in format [[artist_id, count], ...]
    for (const row of data.results || []) {
      const artistId = row[0]
      const count = row[1]
      if (artistId && typeof artistId === 'string' && typeof count === 'number') {
        results.set(artistId, count)
      }
    }

    console.log(`[PostHog Sync] ${eventName}: Found ${results.size} artists`)
    return results
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[PostHog Sync] Timeout querying ${eventName} (${POSTHOG_TIMEOUT_MS}ms)`)
    } else {
      console.error(`[PostHog Sync] Error querying ${eventName}:`, error)
    }
    return new Map()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Aggregate metrics for all artists across all periods
 */
async function aggregateMetricsByPeriod(): Promise<Map<string, Map<Period, ArtistMetrics>>> {
  const artistMetrics = new Map<string, Map<Period, ArtistMetrics>>()

  for (const period of PERIODS) {
    console.log(`[PostHog Sync] Fetching metrics for period: ${period.name}`)

    // Fetch all event types in parallel
    const [profileViews, instagramClicks, bookingClicks, searchAppearances] = await Promise.all([
      queryPostHogEventCounts('Profile Viewed', period.days),
      queryPostHogEventCounts('Instagram Click', period.days),
      queryPostHogEventCounts('Booking Click', period.days),
      queryPostHogEventCounts('Search Result Clicked', period.days), // Proxy for search appearances
    ])

    // Collect all unique artist IDs
    const allArtistIds = new Set<string>([
      ...profileViews.keys(),
      ...instagramClicks.keys(),
      ...bookingClicks.keys(),
      ...searchAppearances.keys(),
    ])

    console.log(`[PostHog Sync] Found ${allArtistIds.size} artists with activity in ${period.name}`)

    // Build metrics for each artist
    for (const artistId of allArtistIds) {
      if (!artistMetrics.has(artistId)) {
        artistMetrics.set(artistId, new Map())
      }

      const metrics: ArtistMetrics = {
        profile_views: profileViews.get(artistId) || 0,
        instagram_clicks: instagramClicks.get(artistId) || 0,
        booking_clicks: bookingClicks.get(artistId) || 0,
        search_appearances: searchAppearances.get(artistId) || 0,
        image_views: 0, // TODO: Add Image View event tracking
      }

      artistMetrics.get(artistId)!.set(period.name, metrics)
    }
  }

  return artistMetrics
}

export async function POST(request: Request) {
  // Verify cron authorization
  if (!verifyCronAuth(request)) {
    console.warn('[PostHog Sync] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[PostHog Sync] Starting daily analytics sync...')

  try {
    // Aggregate metrics from PostHog
    const artistMetrics = await aggregateMetricsByPeriod()

    if (artistMetrics.size === 0) {
      console.log('[PostHog Sync] No metrics to sync')
      return NextResponse.json({
        success: true,
        message: 'No metrics to sync',
        duration_ms: Date.now() - startTime,
      })
    }

    // Prepare rows for upsert
    const cacheRows: Array<{
      artist_id: string
      period: Period
      profile_views: number
      image_views: number
      instagram_clicks: number
      booking_clicks: number
      search_appearances: number
      sync_source: string
      last_synced_at: string
    }> = []

    for (const [artistId, periodMetrics] of artistMetrics) {
      for (const [period, metrics] of periodMetrics) {
        // Only add rows with actual activity
        const hasActivity = Object.values(metrics).some(v => v > 0)
        if (hasActivity) {
          cacheRows.push({
            artist_id: artistId,
            period,
            profile_views: metrics.profile_views,
            image_views: metrics.image_views,
            instagram_clicks: metrics.instagram_clicks,
            booking_clicks: metrics.booking_clicks,
            search_appearances: metrics.search_appearances,
            sync_source: 'posthog_sync',
            last_synced_at: new Date().toISOString(),
          })
        }
      }
    }

    console.log(`[PostHog Sync] Upserting ${cacheRows.length} cache rows...`)

    // Upsert in batches
    const supabase = createServiceClient()
    const BATCH_SIZE = 500
    let totalUpserted = 0
    let totalErrors = 0

    for (let i = 0; i < cacheRows.length; i += BATCH_SIZE) {
      const batch = cacheRows.slice(i, i + BATCH_SIZE)

      const { error } = await supabase
        .from('analytics_cache')
        .upsert(batch, { onConflict: 'artist_id,period' })

      if (error) {
        console.error(`[PostHog Sync] Upsert error:`, error)
        totalErrors += batch.length
      } else {
        totalUpserted += batch.length
      }
    }

    const duration = Date.now() - startTime

    console.log(`[PostHog Sync] Sync complete!`)
    console.log(`  - Artists synced: ${artistMetrics.size}`)
    console.log(`  - Rows upserted: ${totalUpserted}`)
    console.log(`  - Errors: ${totalErrors}`)
    console.log(`  - Duration: ${duration}ms`)

    return NextResponse.json({
      success: true,
      artists_synced: artistMetrics.size,
      rows_upserted: totalUpserted,
      errors: totalErrors,
      duration_ms: duration,
    })
  } catch (error) {
    console.error('[PostHog Sync] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

// GET not supported - cron jobs should use POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with CRON_SECRET.' },
    { status: 405 }
  )
}
