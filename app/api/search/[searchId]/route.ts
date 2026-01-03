import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsByEmbedding } from '@/lib/supabase/queries'
import { getImageUrl } from '@/lib/utils/images'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Validation patterns
const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/
const REGION_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/  // Must start/end with alphanumeric
const CITY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/  // No consecutive/leading/trailing hyphens

// Database result interface (matches what search_artists_by_embedding returns)
interface DbSearchResult {
  id: string
  name: string
  slug: string
  city: string
  region: string
  country_code: string
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
 *
 * Query params:
 * - country: ISO 3166-1 alpha-2 country code (e.g., 'us', 'uk')
 * - region: State/province code (e.g., 'tx', 'ontario')
 * - city: City name slug (e.g., 'austin', 'los-angeles')
 * - page: Page number (default: 1)
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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

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
      // Convert slug to name (e.g., 'los-angeles' -> 'Los Angeles')
      cityFilter = cityParam
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
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

    // Search artists by embedding with location filters
    const startTime = Date.now()
    const results = await searchArtistsByEmbedding(embedding, {
      country: countryFilter,
      region: regionFilter,
      city: cityFilter,
      limit,
      offset,
      threshold: 0.15, // Lowered to capture niche queries (CLIP cosine similarity range: 0.15-0.4)
    })
    const queryTime = Date.now() - startTime

    // Ensure results is an array (handle null/undefined)
    const rawResults = Array.isArray(results) ? results : []

    // Map database response to match TypeScript types
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
          region: result.region,
          country_code: result.country_code,
          profile_image_url: result.profile_image_url,
          follower_count: result.follower_count,
          instagram_url: result.instagram_url,
          is_verified: result.is_verified,
          matching_images: (result.images || []).map((img: { url: string; instagramUrl?: string; similarity?: number }) => ({
            url: getImageUrl(img.url),
            instagramUrl: img.instagramUrl,
            similarity: img.similarity,
          })),
          similarity: result.max_similarity || 0,
        }
      })
      .filter((artist): artist is NonNullable<typeof artist> => artist !== null)

    // Return results with metadata
    return NextResponse.json(
      {
        artists,
        total: artists.length,
        page,
        limit,
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
