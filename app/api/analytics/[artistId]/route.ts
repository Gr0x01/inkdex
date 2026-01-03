/**
 * Analytics Data API
 * Fetches analytics data for Pro artist dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  getArtistAnalytics,
  getTopPerformingImages,
  getAnalyticsTimeSeries,
} from '@/lib/analytics/queries'
import { getCached, generateCacheKey } from '@/lib/redis/cache'

// Validation schemas
const paramsSchema = z.object({
  artistId: z.string().uuid(),
})

const daysSchema = z.enum(['7', '30', '90', 'all']).optional().default('30')

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ artistId: string }> }
) {
  try {
    // Validate artistId parameter
    const params = await context.params
    const { artistId } = paramsSchema.parse(params)

    // Validate days query parameter
    const { searchParams } = request.nextUrl
    const daysParam = searchParams.get('days') || '30'
    const validatedDays = daysSchema.parse(daysParam)

    // Parse days parameter (7, 30, 90, or null for all time)
    const days = validatedDays === 'all' ? null : parseInt(validatedDays, 10)

    // Verify user owns this artist
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership and Pro status
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, is_pro, claimed_by_user_id')
      .eq('id', artistId)
      .single()

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (artist.claimed_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!artist.is_pro) {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    // Generate cache keys for each analytics query
    // Cache separately to allow partial cache hits
    const summaryKey = generateCacheKey('analytics:summary', {
      artistId,
      days: String(days || 'all'),
    })
    const topImagesKey = generateCacheKey('analytics:top-images', {
      artistId,
      days: String(days || 'all'),
    })
    const timeSeriesKey = generateCacheKey('analytics:timeseries', {
      artistId,
      days: String(days || 90),
    })

    // Fetch analytics data in parallel with 30-minute cache
    // This ensures consistent data across dashboard refreshes
    const [summary, topImages, timeSeries] = await Promise.all([
      getCached(
        summaryKey,
        { ttl: 1800, pattern: 'analytics:summary' }, // 30 minutes
        () => getArtistAnalytics(artistId, days)
      ),
      getCached(
        topImagesKey,
        { ttl: 1800, pattern: 'analytics:top-images' }, // 30 minutes
        () => getTopPerformingImages(artistId, days, 10)
      ),
      getCached(
        timeSeriesKey,
        { ttl: 1800, pattern: 'analytics:timeseries' }, // 30 minutes
        () => getAnalyticsTimeSeries(artistId, days || 90)
      ),
    ])

    return NextResponse.json({
      summary,
      topImages,
      timeSeries,
      timeRange: days,
    })
  } catch (error) {
    // Handle validation errors with 400 status
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
