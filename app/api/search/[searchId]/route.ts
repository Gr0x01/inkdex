import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsByEmbedding } from '@/lib/supabase/queries'
import { CITIES, STATES } from '@/lib/constants/cities'
import { getImageUrl } from '@/lib/utils/images'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Valid city and state slugs for validation
const VALID_CITY_SLUGS = CITIES.map(c => c.slug)
const VALID_STATE_SLUGS = STATES.map(s => s.slug)

// Database result interface (matches what search_artists_by_embedding returns)
interface DbSearchResult {
  id: string
  name: string
  slug: string
  city: string
  profile_image_url: string | null
  follower_count: number | null
  instagram_url: string | null
  is_verified: boolean
  images: Array<{
    url: string
    instagramUrl: string
    similarity: number
  }> | null
  max_similarity: number
}

/**
 * GET /api/search/[searchId]
 *
 * Fetches search from database, runs vector similarity search,
 * returns ranked artist results
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

    // Parse query parameters
    const locationParam = searchParams.get('city') || null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Parse location filter (supports city slugs or "state:slug" format)
    let cities: string[] | null = null
    if (locationParam) {
      if (locationParam.startsWith('state:')) {
        // State filter: convert to list of cities in that state
        const stateSlug = locationParam.replace('state:', '')

        // Validate state slug against whitelist
        if (!VALID_STATE_SLUGS.includes(stateSlug as any)) {
          return NextResponse.json(
            { error: 'Invalid state parameter' },
            { status: 400 }
          )
        }

        const state = STATES.find(s => s.slug === stateSlug)
        cities = state ? (state.cities as unknown as string[]) : null
      } else {
        // Validate city slug against whitelist
        if (!VALID_CITY_SLUGS.includes(locationParam as any)) {
          return NextResponse.json(
            { error: 'Invalid city parameter' },
            { status: 400 }
          )
        }

        // City filter: single city
        cities = [locationParam]
      }
    }

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const offset = (page - 1) * limit

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
    } catch (error) {
      console.error('Failed to parse embedding:', error)
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

    // Search artists by embedding
    // Note: Database function currently supports single city only
    // For multi-city state filters, we pass the first city as a workaround
    // TODO: Update DB function to support array of cities for better state filtering
    const cityFilter = cities && cities.length > 0 ? cities[0] : null

    const startTime = Date.now()
    const results = await searchArtistsByEmbedding(embedding, {
      city: cityFilter,
      limit,
      offset,
      threshold: 0.15, // Lowered to capture niche queries (CLIP cosine similarity range: 0.15-0.4)
    })
    const queryTime = Date.now() - startTime

    // Ensure results is an array (handle null/undefined)
    const rawResults = Array.isArray(results) ? results : []

    // Map database response to match TypeScript types
    // Database returns: id, name, slug, images, max_similarity
    // Frontend expects: artist_id, artist_name, artist_slug, matching_images, similarity
    const artists = (rawResults as DbSearchResult[])
      .map((result) => {
        // Validate required fields
        if (!result.id || !result.name || !result.slug) {
          console.warn('Invalid artist result:', result)
          return null
        }

        return {
          artist_id: result.id,
          artist_name: result.name,
          artist_slug: result.slug,
          city: result.city,
          profile_image_url: result.profile_image_url,
          follower_count: result.follower_count,
          instagram_url: result.instagram_url,
          is_verified: result.is_verified,
          matching_images: (result.images || []).map((img: any) => ({
            url: getImageUrl(img.url), // Convert relative path to absolute URL
            instagramUrl: img.instagramUrl,
            similarity: img.similarity,
          })),
          similarity: result.max_similarity || 0, // max_similarity from DB → similarity
        }
      })
      .filter((artist): artist is NonNullable<typeof artist> => artist !== null)

    // Return results with metadata
    return NextResponse.json({
      artists,
      total: artists.length, // Note: This is approximate, would need COUNT query for exact
      page,
      limit,
      queryTime,
      queryType: search.query_type,
      queryText: search.query_text,
      city: locationParam, // Return original filter parameter
    })
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
