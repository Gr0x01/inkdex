/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase RPC response types vary */
/**
 * Analytics Query Helpers
 * Functions to fetch analytics data for Pro artist dashboards
 */

import { createClient } from '@/lib/supabase/server'

export interface AnalyticsSummary {
  profileViews: number
  imageViews: number
  instagramClicks: number
  bookingClicks: number
  searchAppearances: number
  totalEngagement: number
}

export interface TopImage {
  imageId: string
  imageUrl: string
  instagramUrl: string | null
  viewCount: number
  postCaption: string | null
}

export interface DailyMetric {
  date: string
  profileViews: number
  imageViews: number
  instagramClicks: number
  bookingClicks: number
  searchAppearances: number
}

export interface SearchAppearance {
  searchId: string
  queryType: 'text' | 'image' | 'hybrid' | 'instagram_post' | 'instagram_profile' | 'similar_artist'
  queryText: string | null
  instagramUsername: string | null
  rank: number
  similarityScore: number
  boostedScore: number
  timestamp: string
}

/**
 * Convert days to period string for cache lookup
 */
function daysToPeriod(days: number | null): '7d' | '30d' | '90d' | 'all' {
  if (days === null) return 'all'
  if (days <= 7) return '7d'
  if (days <= 30) return '30d'
  if (days <= 90) return '90d'
  return 'all'
}

/**
 * Get aggregated analytics summary for time range
 * Reads from pre-computed analytics_cache table (populated by daily PostHog sync).
 *
 * @param artistId - Artist UUID
 * @param days - Number of days to look back (7, 30, 90, or null for all time)
 * @returns Aggregated metrics (zeros if no data)
 */
export async function getArtistAnalytics(
  artistId: string,
  days: number | null = 30
): Promise<AnalyticsSummary> {
  const supabase = await createClient()
  const period = daysToPeriod(days)

  const { data, error } = await supabase
    .from('analytics_cache')
    .select('profile_views, image_views, instagram_clicks, booking_clicks, search_appearances')
    .eq('artist_id', artistId)
    .eq('period', period)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (not an error, just no data yet)
    console.error('[Analytics] Error fetching artist analytics:', error)
  }

  return {
    profileViews: data?.profile_views || 0,
    imageViews: data?.image_views || 0,
    instagramClicks: data?.instagram_clicks || 0,
    bookingClicks: data?.booking_clicks || 0,
    searchAppearances: data?.search_appearances || 0,
    totalEngagement:
      (data?.profile_views || 0) +
      (data?.instagram_clicks || 0) +
      (data?.booking_clicks || 0),
  }
}

/**
 * Get top performing images by view count
 * @param artistId - Artist UUID
 * @param days - Number of days to look back (or null for all time)
 * @param limit - Max number of images to return
 * @returns Array of top images with view counts
 */
export async function getTopPerformingImages(
  artistId: string,
  days: number | null = 30,
  limit: number = 10
): Promise<TopImage[]> {
  const supabase = await createClient()

  // Build date filter
  const startDate = days !== null
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null

  // Query with aggregation
  let query = supabase
    .from('portfolio_image_analytics')
    .select(`
      image_id,
      view_count,
      portfolio_images!inner(
        storage_thumb_640,
        instagram_url,
        post_caption
      )
    `)
    .eq('artist_id', artistId)

  if (startDate) {
    query = query.gte('date', startDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Analytics] Error fetching top images:', error)
    throw error
  }

  // Aggregate by image_id
  const imageMap = new Map<string, TopImage>()

  data?.forEach((row: any) => {
    const existing = imageMap.get(row.image_id)
    const views = row.view_count || 0

    if (existing) {
      existing.viewCount += views
    } else {
      imageMap.set(row.image_id, {
        imageId: row.image_id,
        imageUrl: row.portfolio_images.storage_thumb_640,
        instagramUrl: row.portfolio_images.instagram_url,
        viewCount: views,
        postCaption: row.portfolio_images.post_caption,
      })
    }
  })

  // Sort by view count and limit
  return Array.from(imageMap.values())
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit)
}

/**
 * Get daily time series data for charts
 * @param artistId - Artist UUID
 * @param days - Number of days to look back
 * @returns Array of daily metrics ordered by date
 */
export async function getAnalyticsTimeSeries(
  artistId: string,
  days: number = 30
): Promise<DailyMetric[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('artist_analytics')
    .select('date, profile_views, image_views, instagram_clicks, booking_link_clicks, search_appearances')
    .eq('artist_id', artistId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) {
    console.error('[Analytics] Error fetching time series:', error)
    throw error
  }

  return (data || []).map(row => ({
    date: row.date,
    profileViews: row.profile_views || 0,
    imageViews: row.image_views || 0,
    instagramClicks: row.instagram_clicks || 0,
    bookingClicks: row.booking_link_clicks || 0,
    searchAppearances: row.search_appearances || 0,
  }))
}

/**
 * Get recent search appearances for an artist
 * @param artistId - Artist UUID
 * @param days - Number of days to look back (or null for all time)
 * @param limit - Max number of appearances to return
 * @returns Array of search appearances with query details
 */
export async function getRecentSearchAppearances(
  artistId: string,
  days: number | null = 30,
  limit: number = 20
): Promise<SearchAppearance[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_recent_search_appearances', {
    p_artist_id: artistId,
    p_days: days,
    p_limit: limit
  })

  if (error) {
    console.error('[Analytics] Error fetching search appearances:', error)
    throw error
  }

  return (data || []).map((row: any) => ({
    searchId: row.sa_search_id,
    queryType: row.s_query_type,
    queryText: row.s_query_text,
    instagramUsername: row.s_instagram_username,
    rank: row.sa_rank_position,
    similarityScore: row.sa_similarity_score,
    boostedScore: row.sa_boosted_score,
    timestamp: row.sa_created_at,
  }))
}
