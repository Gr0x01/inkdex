import { createClient } from '@/lib/supabase/server'
import { getImageUrl } from '@/lib/utils/images'

/**
 * Validation helpers
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9-]+$/ // Removed periods and underscores for security
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
    throw new Error('Invalid slug: must be lowercase alphanumeric with hyphens only, max 50 characters, no leading/trailing hyphens')
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
 * Search artists by CLIP embedding vector
 * @param embedding - 768-dimension CLIP vector
 * @param options - Search options (threshold, limit, city filter, offset)
 * @returns Ranked artists with matching images
 */
export async function searchArtistsByEmbedding(
  embedding: number[],
  options: {
    threshold?: number
    limit?: number
    city?: string | null
    offset?: number
  } = {}
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
    city = null,
    offset = 0,
  } = options

  // Validate options
  validateFloat(threshold, 'threshold', 0, 1)
  validateInteger(limit, 'limit', 1, 100)
  validateInteger(offset, 'offset', 0, 10000)
  if (city !== null) {
    validateString(city, 'city', 100)
  }

  // Sanitize embedding for SQL (explicit number validation prevents injection)
  const sanitizedEmbedding = embedding.map(n => {
    if (!Number.isFinite(n)) {
      throw new Error('Invalid embedding value detected')
    }
    return n.toString()
  }).join(',')

  const { data, error } = await supabase.rpc('search_artists_by_embedding', {
    query_embedding: `[${sanitizedEmbedding}]`,
    match_threshold: threshold,
    match_count: limit,
    city_filter: city,
    offset_param: offset,
  })

  if (error) {
    console.error('Error searching artists:', error)
    throw error
  }

  // Transform RPC response: RPC returns matching_images as JSONB (auto-parsed),
  // but frontend expects it as 'images' with specific structure
  return (data || []).map((result: any) => ({
    id: result.artist_id,
    name: result.artist_name,
    slug: result.artist_slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count,
    shop_name: result.shop_name,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    images: (result.matching_images || []).map((img: any) => ({
      url: img.thumbnail_url,  // Use thumbnail_url (actual image path), not image_url (Instagram post URL)
      instagramUrl: img.image_url,  // Instagram post URL for linking
      similarity: img.similarity,
      likes_count: img.likes_count,
    })),
    max_similarity: result.similarity,
    max_likes: result.max_likes,
  }))
}

/**
 * Get artist by slug
 */
export async function getArtistBySlug(slug: string) {
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
      )
    `)
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching artist:', error)
    return null
  }

  return data
}

/**
 * Get artists by city
 */
export async function getArtistsByCity(city: string) {
  // Validate city
  validateString(city, 'city', 100)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('city', city)
    .order('name')

  if (error) {
    console.error('Error fetching artists by city:', error)
    return []
  }

  return data
}

/**
 * Get all style seeds (for SEO landing pages)
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
  return data.map((item: any) => {
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
 * Get featured artists (50k+ followers) with portfolios for homepage grid
 * @param city - City to filter by
 * @param limit - Number of artists to fetch (default 12)
 * @returns Artists with 50k+ followers and at least 4 portfolio images
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

  // Get featured artists (50k+ followers) with their portfolio images
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      shop_name,
      verification_status,
      follower_count,
      portfolio_images!inner (
        id,
        storage_thumb_640,
        status,
        likes_count
      )
    `)
    .eq('city', city)
    .gte('follower_count', 50000)
    .eq('portfolio_images.status', 'active')
    .not('portfolio_images.storage_thumb_640', 'is', null)
    .order('follower_count', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching featured artists:', error)
    return []
  }

  // Process artists and their portfolio images
  // Note: Supabase returns nested arrays for related data
  const artists = data.map((row: any) => {
    // row.portfolio_images is an array of images for this artist
    const portfolioImages = Array.isArray(row.portfolio_images)
      ? row.portfolio_images.map((img: any) => ({
          id: img.id,
          url: getImageUrl(img.storage_thumb_640),
          likes_count: img.likes_count,
        }))
      : []

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      shop_name: row.shop_name,
      verification_status: row.verification_status,
      follower_count: row.follower_count,
      portfolio_images: portfolioImages,
    }
  })

  // Filter artists with 4+ images and limit results
  const filteredArtists = artists
    .filter((artist: any) => artist.portfolio_images.length >= 4)
    .slice(0, limit)

  return filteredArtists
}

/**
 * Get featured artists grouped by state for homepage (randomized)
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

  // Get all featured artists (100k+ followers) across all cities
  // Using a larger limit and randomizing in JS for better distribution per state
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      city,
      state,
      shop_name,
      verification_status,
      follower_count,
      portfolio_images!inner (
        id,
        storage_thumb_640,
        status,
        likes_count
      )
    `)
    .gte('follower_count', 100000)
    .eq('portfolio_images.status', 'active')
    .not('portfolio_images.storage_thumb_640', 'is', null)

  if (error) {
    console.error('Error fetching featured artists by states:', error)
    return {}
  }

  // Process all artists first
  const allArtists = data.map((row: any) => {
    const portfolioImages = Array.isArray(row.portfolio_images)
      ? row.portfolio_images.map((img: any) => ({
          id: img.id,
          url: getImageUrl(img.storage_thumb_640),
          likes_count: img.likes_count,
        }))
      : []

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      state: row.state,
      shop_name: row.shop_name,
      verification_status: row.verification_status,
      follower_count: row.follower_count,
      portfolio_images: portfolioImages,
    }
  }).filter((artist: any) => artist.portfolio_images.length >= 4)

  // Randomize using Fisher-Yates shuffle
  const shuffled = [...allArtists]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Group randomized artists by state (taking first limitPerState per state)
  const artistsByState: Record<string, any[]> = {}

  shuffled.forEach((artist: any) => {
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
 * Uses the artist's first portfolio image embedding to find similar artists
 * @param artistId - Artist ID to find similar artists for
 * @param city - City to filter by
 * @param limit - Number of related artists to return (default 3)
 */
export async function getRelatedArtists(
  artistId: string,
  city: string,
  limit: number = 3
) {
  // Validate inputs
  validateUUID(artistId, 'artistId')
  validateString(city, 'city', 100)
  validateInteger(limit, 'limit', 1, 10)

  const supabase = await createClient()

  // 1. Get the artist's first portfolio image embedding
  const { data: firstImage, error: imageError } = await supabase
    .from('portfolio_images')
    .select('embedding')
    .eq('artist_id', artistId)
    .eq('status', 'active')
    .not('embedding', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (imageError || !firstImage?.embedding) {
    console.error('Error fetching artist embedding:', imageError)
    return []
  }

  // Parse embedding from database (pgvector returns as string like "[0.1,0.2,...]")
  let embeddingString: string
  if (typeof firstImage.embedding === 'string') {
    // Already a string, use as-is (strip brackets if present)
    embeddingString = firstImage.embedding.replace(/^\[|\]$/g, '')
  } else if (Array.isArray(firstImage.embedding)) {
    // Array format, sanitize and join
    embeddingString = firstImage.embedding.map((n: number) => {
      if (!Number.isFinite(n)) {
        throw new Error('Invalid embedding value in database')
      }
      return n.toString()
    }).join(',')
  } else {
    console.error('Unexpected embedding format:', typeof firstImage.embedding)
    return []
  }

  // 2. Use RPC function to find similar artists in same city
  const { data: similarArtists, error: searchError } = await supabase.rpc(
    'search_artists_by_embedding',
    {
      query_embedding: `[${embeddingString}]`,
      match_threshold: 0.5, // Lower threshold for same-city artists
      match_count: limit + 1, // +1 to account for filtering out current artist
      city_filter: city,
      offset_param: 0,
    }
  )

  if (searchError) {
    console.error('Error searching similar artists:', searchError)
    return []
  }

  // 3. Filter out current artist and limit results
  const filtered = similarArtists
    ?.filter((artist: any) => artist.artist_id !== artistId)
    .slice(0, limit)
    .map((artist: any) => ({
      id: artist.artist_id,
      name: artist.artist_name,
      slug: artist.artist_slug,
      city: artist.city,
      profile_image_url: artist.profile_image_url,
      instagram_url: artist.instagram_url,
      shop_name: artist.shop_name || null,
      verification_status: artist.is_verified ? 'verified' : 'unclaimed',
      follower_count: artist.follower_count || 0,
      similarity: artist.similarity || 0,
    }))

  return filtered || []
}

/**
 * Get state with cities and artist counts
 * @param state - State code (e.g., 'TX', 'CA')
 */
export async function getStateWithCities(state: string) {
  // Validate state code
  validateStateCode(state)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artists')
    .select('city')
    .eq('state', state)

  if (error) {
    console.error('Error fetching state cities:', error)
    return { cities: [], total: 0 }
  }

  // Group by city and count artists
  const cityMap = new Map<string, number>()
  data.forEach((row) => {
    const city = row.city
    cityMap.set(city, (cityMap.get(city) || 0) + 1)
  })

  const cities = Array.from(cityMap.entries()).map(([name, count]) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    artistCount: count,
  }))

  // Sort by artist count (descending)
  cities.sort((a, b) => b.artistCount - a.artistCount)

  return {
    cities,
    total: data.length,
  }
}

/**
 * Get artists in a city with portfolio images
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

  const { data, error, count } = await supabase
    .from('artists')
    .select(
      `
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
        likes_count
      )
    `,
      { count: 'exact' }
    )
    .eq('state', state)
    .eq('city', city)
    .eq('portfolio_images.status', 'active')
    .not('portfolio_images.storage_thumb_640', 'is', null)
    .order('verification_status', { ascending: false })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching city artists:', error)
    return { artists: [], total: 0 }
  }

  // Transform data to group portfolio images by artist
  const artistsMap = new Map()

  data.forEach((row: any) => {
    if (!artistsMap.has(row.id)) {
      artistsMap.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        shop_name: row.shop_name,
        verification_status: row.verification_status,
        profile_image_url: row.profile_image_url,
        instagram_handle: row.instagram_handle,
        portfolio_images: [],
      })
    }

    const artist = artistsMap.get(row.id)

    // portfolio_images is an array from the INNER JOIN
    if (Array.isArray(row.portfolio_images)) {
      row.portfolio_images.forEach((image: any) => {
        if (image?.id) {
          const publicUrl = getImageUrl(image.storage_thumb_640)
          artist.portfolio_images.push({
            id: image.id,
            url: publicUrl,
            likes_count: image.likes_count,
          })
        }
      })
    }
  })

  const artists = Array.from(artistsMap.values()).filter(
    (artist: any) => artist.portfolio_images.length >= 1
  )

  return {
    artists,
    total: count ?? 0,
  }
}

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
  const { data, error } = await supabase.rpc('search_artists_by_embedding', {
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
  const artists = (data || []).map((result: any) => ({
    artist_id: result.artist_id,
    artist_name: result.artist_name,
    artist_slug: result.artist_slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count,
    shop_name: result.shop_name,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    matching_images: (result.matching_images || []).map((img: any) => ({
      url: img.thumbnail_url,
      instagramUrl: img.image_url,
      similarity: img.similarity,
      likes_count: img.likes_count,
    })),
    similarity: result.similarity,
    max_likes: result.max_likes,
  }))

  return {
    artists,
    total: artists.length,
  }
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
      city,
      state,
      portfolio_images!inner (
        id,
        embedding,
        status,
        instagram_url,
        storage_thumb_640
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
