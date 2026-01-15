import { NextRequest, NextResponse } from 'next/server'
import { generateTextEmbedding } from '@/lib/embeddings/hybrid-client'
import { searchArtistsWithStyleBoost } from '@/lib/supabase/queries'
import { getImageUrl } from '@/lib/utils/images'
import { slugToName } from '@/lib/utils/location'

// Validation patterns
const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/
const REGION_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/
const CITY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * GET /api/search/query
 *
 * Stateless text search - generates CLIP embedding on-the-fly.
 * No database write - perfect for ad traffic and shareable URLs.
 *
 * Query params:
 * - q: Text query (required, 3-200 chars)
 * - country: ISO 3166-1 alpha-2 country code (e.g., 'us', 'uk')
 * - region: State/province code (e.g., 'tx', 'ontario')
 * - city: City name slug (e.g., 'austin', 'los-angeles')
 * - offset: Number of results to skip (for infinite scroll)
 * - limit: Results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Get and validate query text
    const queryText = searchParams.get('q')
    if (!queryText) {
      return NextResponse.json(
        { error: 'Missing required parameter: q' },
        { status: 400 }
      )
    }

    const trimmedQuery = queryText.trim()
    if (trimmedQuery.length < 3) {
      return NextResponse.json(
        { error: 'Query too short (min 3 characters)' },
        { status: 400 }
      )
    }
    if (trimmedQuery.length > 200) {
      return NextResponse.json(
        { error: 'Query too long (max 200 characters)' },
        { status: 400 }
      )
    }

    // Parse location filter parameters
    const countryParam = searchParams.get('country')
    const regionParam = searchParams.get('region')
    const cityParam = searchParams.get('city')

    // Parse pagination
    const offsetParam = searchParams.get('offset')
    const limitParam = searchParams.get('limit')

    const offset = offsetParam ? parseInt(offsetParam, 10) : 0
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    // Validate pagination
    if (isNaN(offset) || isNaN(limit)) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const MAX_OFFSET = 10000
    if (offset < 0 || offset > MAX_OFFSET || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
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

    // Enhance query for better CLIP understanding
    const enhancedQuery = trimmedQuery.toLowerCase().includes('tattoo')
      ? trimmedQuery
      : `${trimmedQuery} tattoo`

    // Generate CLIP embedding (deterministic - same query = same embedding)
    const startTime = Date.now()
    const embedding = await generateTextEmbedding(enhancedQuery)
    const embeddingTime = Date.now() - startTime

    // Search artists
    const searchStartTime = Date.now()
    const { artists: rawResults, totalCount } = await searchArtistsWithStyleBoost(embedding, {
      country: countryFilter,
      region: regionFilter,
      city: cityFilter,
      limit,
      offset,
      threshold: 0.15,
      queryStyles: null, // Text queries don't have style classification
      isColorQuery: null, // Unknown for text search
    })
    const searchTime = Date.now() - searchStartTime

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
        queryTime: embeddingTime + searchTime,
        embeddingTime,
        searchTime,
        queryType: 'text',
        queryText: trimmedQuery,
        // Location filter echoed back
        country: countryParam || undefined,
        region: regionParam || undefined,
        city: cityParam || undefined,
      },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes - same query = same results
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Vary': 'Accept-Encoding'
        }
      }
    )
  } catch (error) {
    console.error('[/api/search/query] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to search',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
