import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getImageUrl } from '@/lib/utils/images'
import type { StyleMatch } from '@/lib/search/style-classifier'

/**
 * Internal types for RPC results
 * These match the shape returned by Supabase RPC functions
 */
interface SearchArtistRpcResult {
  artist_id: string
  artist_name: string
  artist_slug: string
  city: string
  region: string | null
  country_code: string | null
  profile_image_url: string | null
  follower_count: number | null
  shop_name: string | null
  instagram_url: string | null
  is_verified: boolean
  is_pro: boolean
  is_featured: boolean
  matching_images: Array<{
    thumbnail_url: string
    image_url: string
    similarity: number
    likes_count: number | null
  }> | null
  similarity: number
  max_likes: number | null
  total_count?: number
  location_count?: number
}

/**
 * Extended result type from unified search_artists RPC
 * Includes style_boost and color_boost
 */
interface SearchArtistRpcResultFull extends SearchArtistRpcResult {
  style_boost: number    // Style boost from SQL
  color_boost: number
  boosted_score: number
}

interface ArtistLocationRow {
  artist_id: string
  artists: ArtistRow | null
}

interface ArtistRow {
  id: string
  name: string
  slug: string
  city?: string
  state?: string
  shop_name?: string | null
  verification_status?: string
  profile_image_url?: string | null
  instagram_handle?: string | null
  follower_count?: number | null
  is_pro?: boolean
  portfolio_images?: PortfolioImageRow[]
}

interface PortfolioImageRow {
  id: string
  storage_thumb_640?: string | null
  instagram_url?: string | null
  likes_count?: number | null
  status?: string
}

interface StateCityRow {
  city: string
  artist_count: number
}

interface FeaturedImageRow {
  id: string
  storage_thumb_640: string | null
  artists: { name: string; slug: string; verification_status: string } | Array<{ name: string; slug: string; verification_status: string }>
}

interface RelatedArtistRow {
  artist_id: string
  artist_name: string
  artist_slug: string
  city: string
  profile_image_url: string | null
  instagram_url: string | null
  shop_name: string | null
  is_verified: boolean
  follower_count: number | null
  similarity: number | null
}

/**
 * Validation helpers
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9._-]+$/ // Allows lowercase, numbers, periods, underscores, hyphens (Instagram handle format)
const STATE_CODE_REGEX = /^[A-Z]{2}$/

function validateUUID(id: string, fieldName: string = 'ID'): void {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`)
  }
}

function validateSlug(slug: string): void {
  if (
    typeof slug !== 'string' ||
    !SLUG_REGEX.test(slug) ||
    slug.length === 0 ||
    slug.length > 50 || // Reduced from 100 for tighter validation
    slug.startsWith('-') ||
    slug.endsWith('-')
  ) {
    throw new Error(`Invalid slug: "${slug}" - must be lowercase alphanumeric with periods, underscores, or hyphens, max 50 characters`)
  }
}

function validateString(str: string, fieldName: string, maxLength: number = 100): void {
  if (typeof str !== 'string' || str.length === 0 || str.length > maxLength) {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string with max ${maxLength} characters`)
  }
}

function validateStateCode(state: string): void {
  if (typeof state !== 'string' || !STATE_CODE_REGEX.test(state)) {
    throw new Error('Invalid state code: must be a 2-letter uppercase code (e.g., TX, CA)')
  }
}

function validateInteger(num: number, fieldName: string, min: number, max: number): void {
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`Invalid ${fieldName}: must be an integer between ${min} and ${max}`)
  }
}

function validateFloat(num: number, fieldName: string, min: number, max: number): void {
  if (typeof num !== 'number' || isNaN(num) || num < min || num > max) {
    throw new Error(`Invalid ${fieldName}: must be a number between ${min} and ${max}`)
  }
}

/**
 * Escape special characters in LIKE/ILIKE patterns to prevent pattern injection
 * @param str - User-provided string to escape
 * @returns Escaped string safe for use in LIKE/ILIKE queries
 *
 * PERFORMANCE NOTE: ILIKE queries with escaped patterns still perform case-insensitive
 * matching which can be slower than exact equality at scale. The migration includes
 * functional indexes on LOWER(city) and LOWER(region) to optimize these queries.
 * If performance degrades at scale (>100k artists), consider:
 * 1. Storing pre-normalized lowercase city/region columns
 * 2. Using exact equality with pre-normalized data
 * 3. Adding trigram indexes (pg_trgm) for fuzzy matching
 * Current approach prioritizes flexibility over raw performance.
 */
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

/**
 * Location filter options for search functions
 */
export interface LocationFilter {
  country?: string | null  // ISO 3166-1 alpha-2 (e.g., 'US', 'UK')
  region?: string | null   // State/province code (e.g., 'TX', 'Ontario')
  city?: string | null     // City name (e.g., 'Austin', 'London')
}

/**
 * Unified artist search by CLIP embedding vector
 *
 * Calls the consolidated `search_artists` SQL function which supports:
 * - Vector similarity search (uses IVFFlat index)
 * - Location filtering (city/region/country)
 * - Style boosting (optional, pass queryStyles)
 * - Color boosting (optional, pass isColorQuery)
 * - Pro/Featured ranking boosts
 * - Pagination with total count
 *
 * @param embedding - 768-dimension CLIP vector
 * @param options - Search options
 * @returns Object with artists array and totalCount
 */
export async function searchArtists(
  embedding: number[],
  options: {
    threshold?: number
    limit?: number
    offset?: number
    /** Detected styles from query for style boosting */
    queryStyles?: StyleMatch[] | null
    isColorQuery?: boolean | null
  } & LocationFilter = {}
) {
  // Validate embedding
  if (!Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error('Invalid embedding: must be an array of 768 numbers')
  }
  if (!embedding.every(n => typeof n === 'number' && Number.isFinite(n))) {
    throw new Error('Invalid embedding: all elements must be finite numbers')
  }

  const supabase = await createClient()
  const {
    threshold = 0.7,
    limit = 20,
    country = null,
    region = null,
    city = null,
    offset = 0,
    queryStyles = null,
    isColorQuery = null,
  } = options

  // Validate options
  validateFloat(threshold, 'threshold', 0, 1)
  validateInteger(limit, 'limit', 1, 100)
  validateInteger(offset, 'offset', 0, 10000)
  if (country !== null) validateString(country, 'country', 10)
  if (region !== null) validateString(region, 'region', 100)
  if (city !== null) validateString(city, 'city', 100)

  // Sanitize embedding for SQL (explicit number validation prevents injection)
  const sanitizedEmbedding = embedding.map(n => {
    if (!Number.isFinite(n)) throw new Error('Invalid embedding value')
    return n.toString()
  }).join(',')

  const { data, error } = await supabase.rpc('search_artists', {
    query_embedding: `[${sanitizedEmbedding}]`,
    match_threshold: threshold,
    match_count: limit,
    city_filter: city,
    region_filter: region,
    country_filter: country,
    offset_param: offset,
    query_styles: queryStyles && queryStyles.length > 0 ? queryStyles : null,
    is_color_query: isColorQuery,
  })

  if (error) {
    console.error('Error searching artists:', error)
    throw error
  }

  // Extract total count from first row
  const totalCount = data && data.length > 0 ? data[0].total_count : 0

  // Transform RPC response to frontend format
  const artists = ((data || []) as SearchArtistRpcResultFull[]).map((result) => ({
    id: result.artist_id,
    name: result.artist_name,
    slug: result.artist_slug,
    city: result.city,
    region: result.region,
    country_code: result.country_code,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count,
    shop_name: result.shop_name,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    is_pro: result.is_pro ?? false,
    is_featured: result.is_featured ?? false,
    images: (result.matching_images || []).map((img) => ({
      url: img.thumbnail_url,  // Actual image path
      instagramUrl: img.image_url,  // Instagram post URL for linking
      similarity: img.similarity,
      likes_count: img.likes_count,
    })),
    max_similarity: result.similarity,
    style_boost: result.style_boost,
    color_boost: result.color_boost,
    boosted_score: result.boosted_score,
    max_likes: result.max_likes,
    location_count: result.location_count,
  }))

  return { artists, totalCount }
}

// Legacy aliases for backwards compatibility during migration
// TODO: Remove these after all callers are updated
export const searchArtistsByEmbedding = async (
  embedding: number[],
  options: { threshold?: number; limit?: number; offset?: number } & LocationFilter = {}
) => {
  const { artists } = await searchArtists(embedding, options)
  return artists
}

export const searchArtistsWithStyleBoost = searchArtists

/**
 * Get artist by slug
 * Wrapped with React cache() for request-level deduplication
 * (prevents duplicate queries when called in generateMetadata + page component)
 */
export const getArtistBySlug = cache(async (slug: string) => {
  // Validate slug
  validateSlug(slug)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artists')
    .select(`
      *,
      portfolio_images (
        id,
        instagram_url,
        storage_thumb_640,
        storage_thumb_1280,
        post_caption,
        post_timestamp,
        likes_count,
        featured
      ),
      locations:artist_locations (
        id,
        city,
        region,
        country_code,
        location_type,
        is_primary,
        display_order
      ),
      style_profiles:artist_style_profiles (
        style_name,
        percentage,
        image_count
      )
    `)
    .eq('slug', slug)
    .order('is_primary', { referencedTable: 'artist_locations', ascending: false })
    .order('display_order', { referencedTable: 'artist_locations', ascending: true })
    .order('percentage', { referencedTable: 'artist_style_profiles', ascending: false })
    .single()

  if (error) {
    console.error('Error fetching artist:', error)
    return null
  }

  return data
})

/**
 * Get artists by city (supports multi-location artists)
 * @param city - City name to search for
 * @returns Artists who work in this city (primary or secondary location)
 */
export async function getArtistsByCity(city: string) {
  // Validate city
  validateString(city, 'city', 100)

  const supabase = await createClient()

  // ✅ OPTIMIZED: Single query with JOIN (no N+1)
  // Use escaped pattern to prevent ILIKE injection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase types don't support dynamic table joins
  const { data, error } = await (supabase as any)
    .from('artist_locations')
    .select(`
      artist_id,
      artists!inner (*)
    `)
    .ilike('city', escapeLikePattern(city))

  if (error) {
    console.error('Error fetching artists by city:', error)
    return []
  }

  // Extract unique artists from results
  const artistsMap = new Map<string, ArtistRow>()
  ;(data as ArtistLocationRow[]).forEach((row) => {
    if (row.artists && !artistsMap.has(row.artist_id)) {
      artistsMap.set(row.artist_id, row.artists)
    }
  })

  return Array.from(artistsMap.values()).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )
}

/**
 * Get all style seeds (for SEO landing pages)
 * Note: Not using unstable_cache() here because createClient() uses cookies()
 * Page-level ISR (revalidate: 86400) handles caching instead
 */
export async function getStyleSeeds() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('style_seeds')
    .select('*')
    .order('style_name')

  if (error) {
    console.error('Error fetching style seeds:', error)
    return []
  }

  return data
}

/**
 * Get featured portfolio images for homepage teaser strip
 * @param limit - Number of images to fetch (default 30)
 */
export async function getFeaturedImages(limit: number = 30) {
  // Validate inputs
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Invalid limit parameter: must be an integer between 1 and 100')
  }

  // Use service client to bypass RLS for public featured images data
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('portfolio_images')
    .select(`
      id,
      storage_thumb_640,
      artists!inner (
        id,
        name,
        slug,
        verification_status
      )
    `)
    .eq('featured', true)
    .eq('status', 'active')
    .not('storage_thumb_640', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured images:', error)
    return []
  }

  // Transform to match FeaturedImage interface and generate public URLs
  return (data as FeaturedImageRow[]).map((item) => {
    const artist = Array.isArray(item.artists) ? item.artists[0] : item.artists
    const publicUrl = getImageUrl(item.storage_thumb_640)

    return {
      id: item.id,
      url: publicUrl,
      artist_name: artist?.name || 'Unknown Artist',
      artist_slug: artist?.slug || '',
      verified: artist?.verification_status === 'verified',
    }
  })
}

/**
 * Get featured artists (admin-curated is_featured=true) with portfolios for homepage grid
 * Supports multi-location artists via artist_locations table
 * @param city - City to filter by
 * @param limit - Number of artists to fetch (default 12)
 * @returns Admin-curated featured artists with at least 4 portfolio images
 */
export async function getFeaturedArtists(city: string, limit: number = 12) {
  // Validate inputs
  if (typeof city !== 'string' || city.length === 0 || city.length > 100) {
    throw new Error('Invalid city parameter: must be a non-empty string with max 100 characters')
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Invalid limit parameter: must be an integer between 1 and 100')
  }

  // Use service client to bypass RLS for public featured artists data
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  // ✅ OPTIMIZED: Single query with JOINs (artist_locations + portfolio_images)
  // Eliminates 1+1 pattern, ~2x faster
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase types don't support dynamic table joins
  const { data, error } = await (supabase as any)
    .from('artist_locations')
    .select(`
      artist_id,
      artists!inner (
        id,
        name,
        slug,
        shop_name,
        verification_status,
        follower_count,
        is_pro,
        portfolio_images!inner (
          id,
          storage_thumb_640,
          status,
          likes_count
        )
      )
    `)
    .ilike('city', escapeLikePattern(city))
    .eq('artists.is_featured', true)
    .eq('artists.portfolio_images.status', 'active')
    .not('artists.portfolio_images.storage_thumb_640', 'is', null)

  if (error) {
    console.error('Error fetching featured artists:', error)
    return []
  }

  // Extract unique artists from location matches
  const artistsMap = new Map<string, ArtistRow>()

  ;(data as ArtistLocationRow[]).forEach((row) => {
    const artist = row.artists
    if (!artist || artistsMap.has(artist.id)) return

    artistsMap.set(artist.id, artist)
  })

  const artists = Array.from(artistsMap.values())
    .sort((a, b) => {
      // Sort by follower count desc, then name asc
      if ((b.follower_count ?? 0) !== (a.follower_count ?? 0)) {
        return (b.follower_count ?? 0) - (a.follower_count ?? 0)
      }
      return (a.name || '').localeCompare(b.name || '')
    })

  // Process artists and their portfolio images
  // Note: Supabase returns nested arrays for related data
  const processedArtists = artists.map((artist) => {
    // artist.portfolio_images is an array of images for this artist
    const portfolioImages = Array.isArray(artist.portfolio_images)
      ? artist.portfolio_images.map((img) => ({
          id: img.id,
          url: getImageUrl(img.storage_thumb_640),
          likes_count: img.likes_count,
        }))
      : []

    return {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      shop_name: artist.shop_name,
      verification_status: artist.verification_status,
      follower_count: artist.follower_count,
      is_pro: artist.is_pro,
      portfolio_images: portfolioImages,
    }
  })

  // Filter artists with 4+ images and limit results
  const filteredArtists = processedArtists
    .filter((artist) => artist.portfolio_images.length >= 4)
    .slice(0, limit)

  return filteredArtists
}

/**
 * Get featured artists grouped by state for homepage (randomized)
 * Uses admin-curated is_featured=true flag
 * @param limitPerState - Number of artists to fetch per state (default 4)
 * @returns Object with state codes as keys and arrays of artists as values
 */
export async function getFeaturedArtistsByStates(limitPerState: number = 4) {
  // Validate inputs
  if (!Number.isInteger(limitPerState) || limitPerState < 1 || limitPerState > 20) {
    throw new Error('Invalid limitPerState parameter: must be an integer between 1 and 20')
  }

  // Use service client to bypass RLS for public featured artists data
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  // Get all admin-curated featured artists across all cities
  // Using a larger limit and randomizing in JS for better distribution per state
  // NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      shop_name,
      verification_status,
      follower_count,
      is_pro,
      artist_locations!inner (
        city,
        region,
        country_code,
        is_primary
      ),
      portfolio_images!inner (
        id,
        storage_thumb_640,
        status,
        likes_count
      )
    `)
    .eq('is_featured', true)
    .eq('artist_locations.is_primary', true)
    .eq('portfolio_images.status', 'active')
    .not('portfolio_images.storage_thumb_640', 'is', null)

  if (error) {
    console.error('Error fetching featured artists by states:', error)
    return {}
  }

  // Define processed artist type
  interface ProcessedArtist {
    id: string
    name: string
    slug: string
    city: string
    state: string
    shop_name?: string | null
    verification_status?: string
    follower_count?: number | null
    is_pro?: boolean
    portfolio_images: Array<{ id: string; url: string; likes_count?: number | null }>
  }

  // Define row type with artist_locations
  interface FeaturedArtistRow {
    id: string
    name: string
    slug: string
    shop_name?: string | null
    verification_status?: string
    follower_count?: number | null
    is_pro?: boolean
    artist_locations: Array<{ city: string | null; region: string | null; country_code: string; is_primary: boolean }>
    portfolio_images: Array<{ id: string; storage_thumb_640: string | null; status: string; likes_count?: number | null }>
  }

  // Process all artists first - extract location from artist_locations (single source of truth)
  const allArtists: ProcessedArtist[] = (data as FeaturedArtistRow[]).map((row) => {
    const portfolioImages = Array.isArray(row.portfolio_images)
      ? row.portfolio_images.map((img) => ({
          id: img.id,
          url: getImageUrl(img.storage_thumb_640),
          likes_count: img.likes_count,
        }))
      : []

    // Get primary location from artist_locations
    const primaryLocation = Array.isArray(row.artist_locations)
      ? row.artist_locations.find((loc) => loc.is_primary) || row.artist_locations[0]
      : null

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: primaryLocation?.city || 'Unknown',
      state: primaryLocation?.region || 'Unknown',
      shop_name: row.shop_name,
      verification_status: row.verification_status,
      follower_count: row.follower_count,
      is_pro: row.is_pro,
      portfolio_images: portfolioImages,
    }
  }).filter((artist) => artist.portfolio_images.length >= 4 && artist.state !== 'Unknown')

  // Randomize using Fisher-Yates shuffle
  const shuffled = [...allArtists]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Group randomized artists by state (taking first limitPerState per state)
  const artistsByState: Record<string, ProcessedArtist[]> = {}

  shuffled.forEach((artist) => {
    const stateCode = artist.state

    if (!stateCode) return

    // Initialize state array if needed
    if (!artistsByState[stateCode]) {
      artistsByState[stateCode] = []
    }

    // Add artist if we don't have enough for this state yet
    if (artistsByState[stateCode].length < limitPerState) {
      artistsByState[stateCode].push(artist)
    }
  })

  return artistsByState
}

/**
 * Get related artists using vector similarity search
 * Optimized version using combined RPC function
 * @param artistId - Artist ID to find similar artists for
 * @param city - City to filter by
 * @param limit - Number of related artists to return (default 3)
 */
export async function getRelatedArtists(
  artistId: string,
  city: string | null,
  limit: number = 3
) {
  // Validate inputs
  validateUUID(artistId, 'artistId')
  if (city) validateString(city, 'city', 100)
  validateInteger(limit, 'limit', 1, 10)

  const supabase = await createClient()

  // Use optimized RPC function that combines embedding fetch + search
  const { data: relatedArtists, error } = await supabase.rpc(
    'find_related_artists',
    {
      source_artist_id: artistId,
      city_filter: city || null,
      match_count: limit,
    }
  )

  if (error) {
    console.error('Error finding related artists:', error)
    return []
  }

  // Transform to expected format (convert storage paths to full URLs)
  return ((relatedArtists || []) as RelatedArtistRow[]).map((artist) => ({
    id: artist.artist_id,
    name: artist.artist_name,
    slug: artist.artist_slug,
    city: artist.city,
    profile_image_url: getImageUrl(artist.profile_image_url),
    instagram_url: artist.instagram_url,
    shop_name: artist.shop_name || null,
    verification_status: artist.is_verified ? 'verified' : 'unclaimed',
    follower_count: artist.follower_count || 0,
    similarity: artist.similarity || 0,
  }))
}

/**
 * Get state with cities and artist counts
 * Optimized version using SQL GROUP BY instead of JavaScript aggregation
 * @param state - State code (e.g., 'TX', 'CA')
 */
export async function getStateWithCities(state: string) {
  // Validate state code
  validateStateCode(state)

  const supabase = await createClient()

  // Use SQL GROUP BY to aggregate in database
  const { data, error } = await supabase.rpc('get_state_cities_with_counts', {
    state_code: state
  })

  if (error) {
    console.error('Error fetching state cities:', error)
    return { cities: [], total: 0 }
  }

  // Transform to expected format
  const cities = ((data || []) as StateCityRow[]).map((row) => ({
    name: row.city,
    slug: row.city.toLowerCase().replace(/\s+/g, '-'),
    artistCount: row.artist_count,
  }))

  // Calculate total
  const total = cities.reduce((sum, city) => sum + city.artistCount, 0)

  return { cities, total }
}

/**
 * Get artists in a city with portfolio images
 * Supports multi-location artists via artist_locations table
 * @param state - State code (e.g., 'TX', 'CA')
 * @param city - City name (e.g., 'Austin', 'Los Angeles')
 * @param limit - Number of artists to return (default 50)
 * @param offset - Pagination offset (default 0)
 */
export async function getCityArtists(
  state: string,
  city: string,
  limit: number = 50,
  offset: number = 0
) {
  // Validate inputs
  validateStateCode(state)
  validateString(city, 'city', 100)
  validateInteger(limit, 'limit', 1, 100)
  validateInteger(offset, 'offset', 0, 10000)

  const supabase = await createClient()

  // Define processed city artist type
  interface ProcessedCityArtist {
    id: string
    name: string
    slug: string
    shop_name: string | null | undefined
    verification_status: string | undefined
    profile_image_url: string | null | undefined
    instagram_handle: string | null | undefined
    follower_count: number | null | undefined
    portfolio_images: Array<{ id: string; url: string; instagram_url: string | null | undefined; likes_count: number | null | undefined }>
  }

  // ✅ OPTIMIZED: Single query with JOIN (artist_locations + artists + portfolio_images)
  // Eliminates 1+1 pattern, ~2x faster
  // Use escaped pattern to prevent ILIKE injection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase types don't support dynamic table joins
  const { data, error, count } = await (supabase as any)
    .from('artist_locations')
    .select(
      `
      artist_id,
      artists!inner (
        id,
        name,
        slug,
        shop_name,
        verification_status,
        profile_image_url,
        instagram_handle,
        follower_count,
        portfolio_images!inner (
          id,
          storage_thumb_640,
          instagram_url,
          likes_count,
          status
        )
      )
    `,
      { count: 'exact' }
    )
    .ilike('city', escapeLikePattern(city))
    .eq('region', state)
    .eq('artists.portfolio_images.status', 'active')
    .not('artists.portfolio_images.storage_thumb_640', 'is', null)

  if (error) {
    console.error('Error fetching city artists:', error)
    return { artists: [], total: 0 }
  }

  // Transform data to group by unique artists and aggregate portfolio images
  const artistsMap = new Map<string, ProcessedCityArtist>()

  ;(data as ArtistLocationRow[]).forEach((row) => {
    const artist = row.artists
    if (!artist) return

    if (!artistsMap.has(artist.id)) {
      artistsMap.set(artist.id, {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        shop_name: artist.shop_name,
        verification_status: artist.verification_status,
        profile_image_url: artist.profile_image_url,
        instagram_handle: artist.instagram_handle,
        follower_count: artist.follower_count,
        portfolio_images: [],
      })
    }

    const artistData = artistsMap.get(artist.id)!

    // portfolio_images is an array from the INNER JOIN
    if (Array.isArray(artist.portfolio_images)) {
      artist.portfolio_images.forEach((image) => {
        if (image?.id) {
          const publicUrl = getImageUrl(image.storage_thumb_640)
          artistData.portfolio_images.push({
            id: image.id,
            url: publicUrl,
            instagram_url: image.instagram_url,
            likes_count: image.likes_count,
          })
        }
      })
    }
  })

  // Convert to array, filter, and sort
  const artists = Array.from(artistsMap.values())
    .filter((artist) => artist.portfolio_images.length >= 1)
    .sort((a, b) => {
      // Sort by verification status desc, then name asc
      if (a.verification_status !== b.verification_status) {
        return b.verification_status === 'verified' ? 1 : -1
      }
      return (a.name || '').localeCompare(b.name || '')
    })
    .slice(offset, offset + limit)

  return {
    artists,
    total: count ?? 0,
  }
}

/**
 * Get artists by location (country, region, city)
 * Used for international location-based browse pages
 *
 * NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data.
 * Legacy fallback to artists table has been removed.
 */
export async function getLocationArtists(
  country: string,
  region: string,
  city: string,
  limit: number = 50,
  offset: number = 0
) {
  // Validate inputs
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error('Invalid country code: must be 2 uppercase letters')
  }
  validateString(region, 'region', 50)
  validateString(city, 'city', 100)
  validateInteger(limit, 'limit', 1, 100)
  validateInteger(offset, 'offset', 0, 10000)

  const supabase = await createClient()

  // Define processed location artist type
  interface ProcessedLocationArtist {
    id: string
    name: string
    slug: string
    shop_name: string | null | undefined
    verification_status: string | undefined
    profile_image_url: string | null | undefined
    instagram_handle: string | null | undefined
    follower_count: number | null | undefined
    portfolio_images: Array<{ id: string; url: string; instagram_url: string | null | undefined; likes_count: number | null | undefined }>
  }

  const artistsMap = new Map<string, ProcessedLocationArtist>()

  // Query 1: Get artists from artist_locations table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase types don't support dynamic table joins
  const { data: locationData, error: locationError } = await (supabase as any)
    .from('artist_locations')
    .select(
      `
      artist_id,
      artists!inner (
        id,
        name,
        slug,
        shop_name,
        verification_status,
        profile_image_url,
        instagram_handle,
        follower_count,
        portfolio_images!inner (
          id,
          storage_thumb_640,
          instagram_url,
          likes_count,
          status
        )
      )
    `
    )
    .eq('country_code', country)
    .ilike('region', escapeLikePattern(region))
    .ilike('city', escapeLikePattern(city))
    .eq('artists.portfolio_images.status', 'active')
    .not('artists.portfolio_images.storage_thumb_640', 'is', null)

  if (locationError) {
    console.error('Error fetching location artists:', locationError)
  }

  // Process artist_locations results
  if (locationData) {
    ;(locationData as ArtistLocationRow[]).forEach((row) => {
      const artist = row.artists
      if (!artist) return

      if (!artistsMap.has(artist.id)) {
        artistsMap.set(artist.id, {
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          shop_name: artist.shop_name,
          verification_status: artist.verification_status,
          profile_image_url: artist.profile_image_url,
          instagram_handle: artist.instagram_handle,
          follower_count: artist.follower_count,
          portfolio_images: [],
        })
      }

      const artistData = artistsMap.get(artist.id)!
      if (Array.isArray(artist.portfolio_images)) {
        artist.portfolio_images.forEach((image) => {
          if (image?.id && !artistData.portfolio_images.some(p => p.id === image.id)) {
            const publicUrl = getImageUrl(image.storage_thumb_640)
            artistData.portfolio_images.push({
              id: image.id,
              url: publicUrl,
              instagram_url: image.instagram_url,
              likes_count: image.likes_count,
            })
          }
        })
      }
    })
  }

  // Legacy fallback to artists table has been removed.
  // artist_locations is now the single source of truth.

  // Convert to array, filter, and sort
  const allArtists = Array.from(artistsMap.values())
    .filter((artist) => artist.portfolio_images.length >= 1)
    .sort((a, b) => {
      // Sort by verification status desc, then follower count desc, then name asc
      if (a.verification_status !== b.verification_status) {
        return b.verification_status === 'verified' ? 1 : -1
      }
      const aFollowers = a.follower_count || 0
      const bFollowers = b.follower_count || 0
      if (aFollowers !== bFollowers) {
        return bFollowers - aFollowers
      }
      return (a.name || '').localeCompare(b.name || '')
    })

  const total = allArtists.length
  const artists = allArtists.slice(offset, offset + limit)

  return {
    artists,
    total,
  }
}

// NOTE: REGION_TO_STATE_CODE was removed - artist_locations is now the single source of truth

/**
 * Get style seed by slug for SEO landing pages
 * @param styleSlug - Style slug (e.g., 'traditional', 'neo-traditional')
 */
export async function getStyleSeedBySlug(styleSlug: string) {
  // Validate slug
  validateSlug(styleSlug)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('style_seeds')
    .select('*')
    .eq('style_name', styleSlug)
    .single()

  if (error) {
    console.error('Error fetching style seed:', error)
    return null
  }

  return data
}

/**
 * Get artists by style using style seed embedding
 * @param styleSlug - Style slug (e.g., 'traditional', 'realism')
 * @param city - Optional city filter
 * @param limit - Number of artists to return (default 20)
 * @param offset - Pagination offset (default 0)
 */
export async function getArtistsByStyle(
  styleSlug: string,
  city: string | null = null,
  limit: number = 20,
  offset: number = 0
) {
  // Validate inputs
  validateSlug(styleSlug)
  validateInteger(limit, 'limit', 1, 100)
  validateInteger(offset, 'offset', 0, 10000)
  if (city !== null) {
    validateString(city, 'city', 100)
  }

  // Get style seed
  const styleSeed = await getStyleSeedBySlug(styleSlug)
  if (!styleSeed || !styleSeed.embedding) {
    console.error(`Style seed not found or missing embedding: ${styleSlug}`)
    return { artists: [], total: 0 }
  }

  // Parse embedding from database (pgvector returns as string like "[0.1,0.2,...]")
  let embeddingString: string
  if (typeof styleSeed.embedding === 'string') {
    // Already a string, use as-is (strip brackets if present)
    embeddingString = styleSeed.embedding.replace(/^\[|\]$/g, '')
  } else if (Array.isArray(styleSeed.embedding)) {
    // Array format, sanitize and join
    embeddingString = styleSeed.embedding.map((n: number) => {
      if (!Number.isFinite(n)) {
        throw new Error('Invalid embedding value in style seed')
      }
      return n.toString()
    }).join(',')
  } else {
    console.error('Unexpected embedding format:', typeof styleSeed.embedding)
    return { artists: [], total: 0 }
  }

  const supabase = await createClient()

  // Use vector similarity search with style seed embedding
  const { data, error } = await supabase.rpc('search_artists', {
    query_embedding: `[${embeddingString}]`,
    match_threshold: 0.15, // Same threshold as regular search
    match_count: limit,
    city_filter: city,
    offset_param: offset,
  })

  if (error) {
    console.error('Error searching artists by style:', error)
    return { artists: [], total: 0 }
  }

  // Transform to match SearchResult interface
  const artists = ((data || []) as SearchArtistRpcResult[]).map((result) => ({
    artist_id: result.artist_id,
    artist_name: result.artist_name,
    artist_slug: result.artist_slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count,
    shop_name: result.shop_name,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    is_pro: result.is_pro ?? false,
    is_featured: result.is_featured ?? false,
    matching_images: (result.matching_images || []).map((img) => ({
      url: img.thumbnail_url,
      instagramUrl: img.image_url,
      similarity: img.similarity,
      likes_count: img.likes_count,
    })),
    similarity: result.similarity,
    max_likes: result.max_likes ?? undefined,
  }))

  return {
    artists,
    total: artists.length,
  }
}

/**
 * Get artists by style seed (optimized version)
 * Takes a pre-fetched style seed object to avoid redundant DB query
 * @param styleSeed - Style seed object with embedding
 * @param city - City to filter by (optional)
 * @param limit - Number of artists to return (default 20)
 * @param offset - Pagination offset (default 0)
 */
export async function getArtistsByStyleSeed(
  styleSeed: { embedding: string | number[] | null },
  city: string | null = null,
  limit: number = 20,
  offset: number = 0
) {
  // Validate inputs
  validateInteger(limit, 'limit', 1, 100)
  validateInteger(offset, 'offset', 0, 10000)
  if (city !== null) validateString(city, 'city', 100)

  if (!styleSeed?.embedding) {
    return { artists: [], total: 0 }
  }

  // Parse and validate embedding with proper security checks
  let embeddingString: string
  if (typeof styleSeed.embedding === 'string') {
    // Parse string as JSON and validate as array
    try {
      const parsed = JSON.parse(styleSeed.embedding)
      if (!Array.isArray(parsed) || parsed.length !== 768) {
        throw new Error('Invalid embedding format: must be array of 768 numbers')
      }
      embeddingString = parsed
        .map((n: number) => {
          if (!Number.isFinite(n)) throw new Error('Invalid embedding value')
          return n.toString()
        })
        .join(',')
    } catch (error) {
      console.error('Error parsing style seed embedding:', error)
      return { artists: [], total: 0 }
    }
  } else if (Array.isArray(styleSeed.embedding)) {
    embeddingString = styleSeed.embedding
      .map((n: number) => {
        if (!Number.isFinite(n)) throw new Error('Invalid embedding')
        return n.toString()
      })
      .join(',')
  } else {
    return { artists: [], total: 0 }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_artists', {
    query_embedding: `[${embeddingString}]`,
    match_threshold: 0.15,
    match_count: limit,
    city_filter: city,
    offset_param: offset,
  })

  if (error) {
    console.error('Error searching artists by style:', error)
    return { artists: [], total: 0 }
  }

  const artists = ((data || []) as SearchArtistRpcResult[]).map((result) => ({
    artist_id: result.artist_id,
    artist_name: result.artist_name,
    artist_slug: result.artist_slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count,
    shop_name: result.shop_name,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    is_pro: result.is_pro ?? false,
    is_featured: result.is_featured ?? false,
    matching_images: (result.matching_images || []).map((img) => ({
      url: img.thumbnail_url,
      instagramUrl: img.image_url,
      similarity: img.similarity,
      likes_count: img.likes_count,
    })),
    similarity: result.similarity,
    max_likes: result.max_likes ?? undefined,
  }))

  return { artists, total: artists.length }
}

/**
 * Get artist by Instagram handle with portfolio embeddings
 * Used for Instagram profile searches to check if artist already exists in DB
 * @param handle - Instagram handle (with or without @ prefix)
 * @returns Artist with portfolio images and embeddings, or null if not found
 */
export async function getArtistByInstagramHandle(handle: string) {
  // Validate and normalize handle
  if (typeof handle !== 'string' || handle.length === 0) {
    throw new Error('Invalid Instagram handle: must be a non-empty string')
  }

  // Remove @ prefix if present
  const normalizedHandle = handle.replace(/^@/, '')

  // Validate format (alphanumeric + dots/underscores, 1-30 chars)
  const INSTAGRAM_HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/
  if (!INSTAGRAM_HANDLE_REGEX.test(normalizedHandle)) {
    throw new Error(
      'Invalid Instagram handle format: must be 1-30 characters (alphanumeric, dots, underscores only)'
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      instagram_handle,
      portfolio_images!inner (
        id,
        embedding,
        status,
        instagram_url,
        storage_thumb_640
      ),
      artist_locations!left (
        city,
        region,
        country_code,
        is_primary
      )
    `)
    .eq('instagram_handle', normalizedHandle)
    .eq('portfolio_images.status', 'active')
    .not('portfolio_images.embedding', 'is', null)
    .single()

  if (error) {
    // Not found is expected for new profiles
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching artist by Instagram handle:', error)
    return null
  }

  return data
}

/**
 * Get cities with artist counts (for dynamic city filter dropdown)
 * @param minCount - Minimum number of artists per city (default 5)
 * @param country - ISO country code filter (e.g., 'US', 'UK')
 * @param region - Region/state filter (e.g., 'TX', 'Ontario')
 * @returns Cities with at least minCount artists
 */
export async function getCitiesWithCounts(
  minCount: number = 5,
  country: string | null = null,
  region: string | null = null
): Promise<Array<{ city: string; region: string; country_code: string; artist_count: number }>> {
  // Validate input
  validateInteger(minCount, 'minCount', 1, 100)
  if (country !== null) validateString(country, 'country', 10)
  if (region !== null) validateString(region, 'region', 100)

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_cities_with_counts', {
    min_count: minCount,
    p_country_code: country,
    p_region: region,
  })

  if (error) {
    console.error('Error fetching cities with counts:', error)
    return []
  }

  return data || []
}

/**
 * Get regions/states with artist counts (for cascading dropdown)
 * @param country - ISO country code (e.g., 'US', 'UK')
 * @returns Regions in the country with artist counts
 */
export async function getRegionsWithCounts(
  country: string = 'US'
): Promise<Array<{ region: string; region_name: string; artist_count: number }>> {
  validateString(country, 'country', 10)

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_regions_with_counts', {
    p_country_code: country,
  })

  if (error) {
    console.error('Error fetching regions with counts:', error)
    return []
  }

  return data || []
}

/**
 * Get countries with artist counts (for country dropdown)
 * @returns Countries with artist counts
 */
export async function getCountriesWithCounts(): Promise<Array<{ country_code: string; artist_count: number }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_countries_with_counts')

  if (error) {
    console.error('Error fetching countries with counts:', error)
    return []
  }

  return data || []
}

/**
 * Get all cities with minimum artist count (for dynamic page generation at build time)
 * @param minArtistCount - Minimum number of artists per city (default 3)
 * @returns Cities with at least minArtistCount artists
 */
export async function getAllCitiesWithMinArtists(minArtistCount: number = 3): Promise<Array<{ city: string; region: string; artist_count: number }>> {
  // Validate input
  validateInteger(minArtistCount, 'minArtistCount', 1, 100)

  // Use service client for build-time static generation (no cookies available)
  // Fall back to createClient for runtime requests
  let supabase
  try {
    supabase = await createClient()
  } catch (_error) {
    // If cookies() fails (build time), use service client
    const { createServiceClient } = await import('@/lib/supabase/service')
    supabase = createServiceClient()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC function not in generated types
  const { data, error } = await supabase.rpc('get_all_cities_with_min_artists' as any, {
    min_artist_count: minArtistCount
  })

  if (error) {
    console.error('Error fetching cities with min artists:', error)
    return []
  }

  return data || []
}

/**
 * Get aggregate stats for homepage hero section
 * Returns artist count, image count, city count, and country count in a single DB call
 */
export async function getHomepageStats(): Promise<{
  artistCount: number
  imageCount: number
  cityCount: number
  countryCount: number
}> {
  // Use service client directly - stats are public data and this avoids
  // cookies() which breaks static generation in Next.js 15
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC function not in generated types yet
  const { data, error } = await supabase.rpc('get_homepage_stats' as any).single()

  if (error || !data) {
    console.error('Error fetching homepage stats:', error)
    // Fallback to reasonable defaults
    return { artistCount: 15000, imageCount: 65000, cityCount: 100, countryCount: 1 }
  }

  // Cast data to expected shape from RPC function
  const stats = data as {
    artist_count: number
    image_count: number
    city_count: number
    country_count: number
  }

  return {
    artistCount: stats.artist_count,
    imageCount: stats.image_count,
    cityCount: stats.city_count,
    countryCount: stats.country_count,
  }
}

/**
 * Country editorial content shape returned from database
 */
export interface CountryEditorialContent {
  countryCode: string
  heroText: string
  sceneHeading: string | null
  sceneText: string
  tipsHeading: string | null
  tipsText: string
  keywords: string[]
  majorCities: string[]
}

/**
 * Get editorial content for a country page
 * Returns null if no content exists for this country
 */
export async function getCountryEditorialContent(
  countryCode: string
): Promise<CountryEditorialContent | null> {
  // Use service client directly - editorial content is public data and this avoids
  // cookies() which breaks static generation in Next.js 15
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Table not in generated types yet
  const { data, error } = await (supabase as any)
    .from('country_editorial_content')
    .select('*')
    .eq('country_code', countryCode.toUpperCase())
    .single()

  if (error || !data) {
    // No content for this country - not an error condition
    return null
  }

  // Cast to expected shape
  const content = data as {
    country_code: string
    hero_text: string
    scene_heading: string | null
    scene_text: string
    tips_heading: string | null
    tips_text: string
    keywords: string[] | null
    major_cities: string[] | null
  }

  return {
    countryCode: content.country_code,
    heroText: content.hero_text,
    sceneHeading: content.scene_heading,
    sceneText: content.scene_text,
    tipsHeading: content.tips_heading,
    tipsText: content.tips_text,
    keywords: content.keywords || [],
    majorCities: content.major_cities || [],
  }
}
