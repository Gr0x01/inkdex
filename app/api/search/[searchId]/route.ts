import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsWithStyleBoost } from '@/lib/supabase/queries'
import { getImageUrl } from '@/lib/utils/images'
import { slugToName } from '@/lib/utils/location'
import type { StyleMatch } from '@/lib/search/style-classifier'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Validation patterns
const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/
const REGION_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/
const CITY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * GET /api/search/[searchId]
 *
 * Fetches search from database, runs vector similarity search with style/color boosts,
 * returns ranked artist results.
 *
 * Query params:
 * - country: ISO 3166-1 alpha-2 country code (e.g., 'us', 'uk')
 * - region: State/province code (e.g., 'tx', 'ontario')
 * - city: City name slug (e.g., 'austin', 'los-angeles')
 * - offset: Number of results to skip (for infinite scroll)
 * - page: Page number (legacy, converted to offset)
 * - limit: Results per page (default: 20, max: 100)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const { searchId } = await params

    // Validate searchId is a valid UUID
    if (!UUID_REGEX.test(searchId)) {
      return NextResponse.json(
        { error: 'Invalid search ID format' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse location filter parameters
    const countryParam = searchParams.get('country')
    const regionParam = searchParams.get('region')
    const cityParam = searchParams.get('city')

    // Support both offset (infinite scroll) and page (legacy)
    const offsetParam = searchParams.get('offset')
    const pageParam = searchParams.get('page')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Validate limit
    if (isNaN(limit)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      )
    }

    // Calculate offset: prefer explicit offset, fall back to page calculation
    let offset: number
    if (offsetParam !== null) {
      offset = parseInt(offsetParam, 10)
      if (isNaN(offset)) {
        return NextResponse.json(
          { error: 'Invalid offset parameter' },
          { status: 400 }
        )
      }
    } else {
      const page = parseInt(pageParam || '1', 10)
      if (isNaN(page)) {
        return NextResponse.json(
          { error: 'Invalid page parameter' },
          { status: 400 }
        )
      }
      offset = (page - 1) * limit
    }

    // Validate country code if provided
    let countryFilter: string | null = null
    if (countryParam) {
      if (!COUNTRY_CODE_REGEX.test(countryParam)) {
        return NextResponse.json(
          { error: 'Invalid country code format' },
          { status: 400 }
        )
      }
      countryFilter = countryParam.toUpperCase()
    }

    // Validate region if provided
    let regionFilter: string | null = null
    if (regionParam) {
      if (!REGION_REGEX.test(regionParam) || regionParam.length > 50) {
        return NextResponse.json(
          { error: 'Invalid region format' },
          { status: 400 }
        )
      }
      regionFilter = regionParam.toUpperCase()
    }

    // Validate city slug if provided and convert to name
    let cityFilter: string | null = null
    if (cityParam) {
      if (!CITY_SLUG_REGEX.test(cityParam) || cityParam.length > 50) {
        return NextResponse.json(
          { error: 'Invalid city parameter format' },
          { status: 400 }
        )
      }
      cityFilter = slugToName(cityParam)
    }

    // Validate pagination (MAX_OFFSET prevents DoS via deep pagination)
    const MAX_OFFSET = 10000
    if (offset < 0 || offset > MAX_OFFSET || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    // Fetch search from database
    const supabase = await createClient()

    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .single()

    if (searchError || !search) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      )
    }

    // Parse embedding (stored as string "[0.1, 0.2, ...]")
    let embedding: number[]
    try {
      embedding = JSON.parse(search.embedding)
    } catch {
      return NextResponse.json(
        { error: 'Invalid embedding format' },
        { status: 500 }
      )
    }

    // Verify embedding dimension
    if (!Array.isArray(embedding) || embedding.length !== 768) {
      return NextResponse.json(
        { error: `Invalid embedding dimension: ${embedding?.length}` },
        { status: 500 }
      )
    }

    // Parse detected styles for style-weighted search
    let detectedStyles: StyleMatch[] | null = null
    if (search.detected_styles) {
      try {
        detectedStyles = typeof search.detected_styles === 'string'
          ? JSON.parse(search.detected_styles)
          : search.detected_styles
      } catch {
        // Continue without style weighting
      }
    }

    // Get is_color for color-weighted search
    const isColorQuery: boolean | null = search.is_color ?? null

    // Search artists with style and color boosts
    const startTime = Date.now()
    const { artists: rawResults, totalCount } = await searchArtistsWithStyleBoost(embedding, {
      country: countryFilter,
      region: regionFilter,
      city: cityFilter,
      limit,
      offset,
      threshold: 0.15,
      queryStyles: detectedStyles,
      isColorQuery,
    })
    const queryTime = Date.now() - startTime

    // Map results to SearchResult format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const artists = (Array.isArray(rawResults) ? rawResults : []).map((result: any) => ({
      artist_id: result.id,
      artist_name: result.name,
      artist_slug: result.slug,
      city: result.city,
      region: result.region,
      country_code: result.country_code,
      profile_image_url: result.profile_image_url,
      follower_count: result.follower_count || null,
      instagram_url: result.instagram_url,
      is_verified: result.is_verified,
      is_pro: result.is_pro ?? false,
      is_featured: result.is_featured ?? false,
      max_likes: result.max_likes || 0,
      matching_images: (result.images || []).map((img: { url: string; instagramUrl?: string; similarity?: number; likes_count?: number }) => ({
        url: getImageUrl(img.url),
        instagramUrl: img.instagramUrl,
        similarity: img.similarity,
        likes_count: img.likes_count || null,
      })),
      similarity: result.boosted_score || result.max_similarity || 0,
      raw_similarity: result.max_similarity || 0,
      style_boost: result.style_boost || 0,
      color_boost: result.color_boost || 0,
      location_count: result.location_count,
    }))

    // Return results with metadata
    return NextResponse.json(
      {
        artists,
        totalCount,
        offset,
        limit,
        hasMore: offset + artists.length < totalCount,
        queryTime,
        queryType: search.query_type,
        queryText: search.query_text,
        // Location filter echoed back
        country: countryParam || undefined,
        region: regionParam || undefined,
        city: cityParam || undefined,
        // Instagram attribution (if applicable)
        instagramUsername: search.instagram_username || undefined,
        instagramPostUrl: search.instagram_post_id
          ? `https://instagram.com/p/${search.instagram_post_id}`
          : undefined,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, must-revalidate',
          'Vary': 'Cookie'
        }
      }
    )
  } catch (error) {
    console.error('Search results API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch search results',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
