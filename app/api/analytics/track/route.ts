/**
 * Analytics Tracking API
 * Single endpoint for all tracking events with deduplication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { shouldTrackEvent } from '@/lib/redis/deduplication'

// Redis-based deduplication (migrated from in-memory Map)
// Prevents duplicate tracking events within 5-minute window

// Tracking request schema
const trackingSchema = z.object({
  type: z.enum(['profile_view', 'image_view', 'instagram_click', 'booking_click']),
  artistId: z.string().uuid(),
  imageId: z.string().uuid().optional(),
  sessionId: z.string().min(1).max(100), // Client-generated session ID
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, artistId, imageId, sessionId } = trackingSchema.parse(body)

    // Redis-based deduplication check (5-minute window)
    const dedupKey = `analytics:${sessionId}:${type}:${artistId}${imageId ? `:${imageId}` : ''}`
    const shouldTrack = await shouldTrackEvent(dedupKey, 300) // 5 minutes

    if (!shouldTrack) {
      // Duplicate event within 5-minute window
      return NextResponse.json({ tracked: false, reason: 'duplicate' })
    }

    // Call appropriate RPC function
    const supabase = await createClient()

    // Validate imageId for image_view
    if (type === 'image_view' && !imageId) {
      return NextResponse.json(
        { error: 'imageId required for image_view' },
        { status: 400 }
      )
    }

    // Call unified increment_analytics function
    const rpcResult = await supabase.rpc('increment_analytics', {
      p_event_type: type,
      p_artist_id: type === 'image_view' ? null : artistId,
      p_image_id: type === 'image_view' ? imageId : null,
    })

    if (rpcResult?.error) {
      console.error(`[Analytics] Error tracking ${type}:`, rpcResult.error)
      return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
    }

    return NextResponse.json({ tracked: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }

    console.error('[Analytics] Tracking error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
