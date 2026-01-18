import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateImageEmbedding } from '@/lib/embeddings/hybrid-client'
import { aggregateEmbeddings } from '@/lib/embeddings/aggregate'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import { extractLocationFromBio } from '@/lib/instagram/bio-location-extractor'
import { classifyQueryStyles } from '@/lib/search/style-classifier'
import { analyzeImageColor } from '@/lib/search/color-analyzer'
import { parseDbEmbeddings } from '@/lib/search/parse-embeddings'
import { calculateColorProfile } from '@/lib/search/color-profile'
import {
  fetchInstagramProfileImages,
  PROFILE_ERROR_MESSAGES,
} from '@/lib/instagram/profile-fetcher'
import { downloadImageAsBuffer, InstagramError } from '@/lib/instagram/post-fetcher'
import { getArtistByInstagramHandle } from '@/lib/supabase/queries'
import { checkInstagramSearchRateLimit, getClientIp } from '@/lib/rate-limiter'
import { saveImagesToTempFromBuffers } from '@/lib/instagram/image-saver'
import { processArtistImages } from '@/lib/processing/process-artist'
import { instagramProfileSchema } from '../schemas'
import type { SearchInput } from '@/lib/search/search-storage'
import type { SearchedArtistData } from '@/types/search'

// Re-export from instagram-post for shared use
export { RateLimitError } from './instagram-post'
import { RateLimitError } from './instagram-post'

// Constants
const MIN_IMAGES_FOR_DB_PATH = 3

/**
 * Validation error for Instagram profile searches
 */
export class InstagramProfileValidationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'InstagramProfileValidationError'
    this.status = status
  }
}

/**
 * Handle Instagram profile search
 *
 * This is the most complex handler with two code paths:
 * 1. DB path: Artist exists with sufficient images → use existing embeddings
 * 2. Scrape path: Artist missing or insufficient images → scrape via Apify/ScrapingDog
 *
 * @param body - Request body (already parsed JSON)
 * @param request - NextRequest for IP extraction
 * @returns SearchInput ready for storage
 * @throws RateLimitError if rate limited
 * @throws InstagramProfileValidationError if validation fails
 * @throws InstagramError if Instagram fetch fails
 */
export async function handleInstagramProfileSearch(
  body: unknown,
  request: NextRequest
): Promise<SearchInput> {
  const parsed = instagramProfileSchema.safeParse(body)
  if (!parsed.success) {
    throw new InstagramProfileValidationError('Invalid Instagram profile URL request')
  }

  // Detect and validate Instagram URL
  const detectedUrl = detectInstagramUrl(parsed.data.instagram_url)
  if (!detectedUrl || detectedUrl.type !== 'profile') {
    throw new InstagramProfileValidationError(
      'Invalid Instagram profile URL. Please provide a valid profile link or @username.'
    )
  }

  // Rate limiting for Instagram searches (50 per hour per IP)
  const clientIp = getClientIp(request)
  const rateLimitResult = await checkInstagramSearchRateLimit(clientIp)

  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult)
  }

  const username = detectedUrl.id
  const supabaseService = createServiceClient()

  // Check if artist exists with sufficient images (single query)
  console.log(`[Profile Search] Checking DB for @${username}...`)
  const existingArtist = await getArtistByInstagramHandle(username)

  // === DB PATH: Use existing embeddings ===
  if (
    existingArtist &&
    existingArtist.portfolio_images &&
    existingArtist.portfolio_images.length >= MIN_IMAGES_FOR_DB_PATH
  ) {
    return handleDbPath(existingArtist, username)
  }

  // === SCRAPE PATH: Fetch from Instagram ===
  // Artist may exist but have insufficient images
  const artistRecord = existingArtist
    ? { id: existingArtist.id, name: existingArtist.name, slug: existingArtist.slug }
    : null
  return handleScrapePath(username, artistRecord, supabaseService)
}

/**
 * DB Path: Artist exists with sufficient images
 */
async function handleDbPath(
  existingArtist: Awaited<ReturnType<typeof getArtistByInstagramHandle>>,
  username: string
): Promise<SearchInput> {
  // Guard: ensure artist data is complete (caller already validated, but TypeScript needs this)
  if (!existingArtist || !existingArtist.portfolio_images) {
    throw new InstagramProfileValidationError('Artist data is incomplete')
  }

  console.log(
    `[Profile Search] Found in DB with ${existingArtist.portfolio_images.length} images - using existing embeddings`
  )

  // Parse embeddings from database
  const embeddings = parseDbEmbeddings(
    existingArtist.portfolio_images as Array<{ embedding: string | number[] }>
  )

  // Aggregate embeddings
  const embedding = aggregateEmbeddings(embeddings)

  // For DB artists, calculate color profile from portfolio images
  const supabase = await createClient()
  const { data: colorStats } = await supabase
    .from('portfolio_images')
    .select('is_color')
    .eq('artist_id', existingArtist.id)
    .eq('status', 'active')
    .not('is_color', 'is', null)

  const isColorQuery = colorStats ? calculateColorProfile(colorStats) : null

  if (colorStats && colorStats.length > 0) {
    const colorCount = colorStats.filter((img) => img.is_color === true).length
    const colorPercentage = colorCount / colorStats.length
    console.log(
      `[Profile Search] Artist color profile: ${(colorPercentage * 100).toFixed(0)}% color → ${isColorQuery === null ? 'mixed' : isColorQuery ? 'COLOR' : 'B&G'}`
    )
  }

  // Classify aggregated embedding styles for style-weighted search
  const queryStyles = await classifyQueryStyles(embedding)
  if (queryStyles.length > 0) {
    console.log(
      `[Profile Search] Styles: ${queryStyles.map((s) => `${s.style_name}(${(s.confidence * 100).toFixed(0)}%)`).join(', ')}`
    )
  }

  // Fetch additional artist fields for search result card
  const { data: artistDetails } = await supabase
    .from('artists')
    .select(
      `
      profile_image_url, bio, follower_count, is_pro, is_featured, verification_status,
      artist_locations!left (city, is_primary)
    `
    )
    .eq('id', existingArtist.id)
    .single()

  // Get primary city from artist_locations
  const locations = artistDetails?.artist_locations as Array<{
    city: string | null
    is_primary: boolean
  }> | null
  const primaryLocation = locations?.find((l) => l.is_primary) || locations?.[0]
  const artistCity = primaryLocation?.city || null

  // Calculate is_verified from verification_status
  const verificationStatus = artistDetails?.verification_status as string | null
  const isVerified = verificationStatus === 'verified' || verificationStatus === 'claimed'

  // Build searched artist data for immediate display
  const searchedArtist: SearchedArtistData = {
    id: existingArtist.id,
    instagram_handle: username,
    name: existingArtist.name,
    profile_image_url: artistDetails?.profile_image_url || null,
    bio: artistDetails?.bio || null,
    follower_count: artistDetails?.follower_count || null,
    city: artistCity,
    images: (existingArtist.portfolio_images as Array<{ storage_thumb_640?: string | null }>)
      .slice(0, 3)
      .map((img) => img.storage_thumb_640)
      .filter(Boolean) as string[],
    is_pro: artistDetails?.is_pro ?? false,
    is_featured: artistDetails?.is_featured ?? false,
    is_verified: isVerified,
  }

  console.log(`[Profile Search] Instant search completed (DB lookup)`)

  return {
    searchType: 'instagram_profile',
    embedding,
    queryText: `Artists similar to @${username}`,
    queryStyles,
    isColorQuery,
    instagramUsername: username,
    instagramPostUrl: null,
    artistIdSource: null,
    searchedArtist,
  }
}

/**
 * Scrape Path: Artist missing or insufficient images
 */
async function handleScrapePath(
  username: string,
  artistRecord: { id: string; name: string; slug: string } | null,
  supabaseService: ReturnType<typeof createServiceClient>
): Promise<SearchInput> {
  // Artist may exist but have no images, or may not exist at all
  if (artistRecord) {
    console.log(
      `[Profile Search] Artist exists (${artistRecord.id}) but has insufficient images - scraping via Apify...`
    )
  } else {
    console.log(`[Profile Search] Artist not in DB - scraping via Apify...`)
  }

  const profileData = await fetchInstagramProfileImages(username, 12)

  if (profileData.posts.length < 1) {
    throw new InstagramProfileValidationError(PROFILE_ERROR_MESSAGES.INSUFFICIENT_POSTS)
  }

  // Extract location from bio using GPT-4.1-nano
  const extractedLocation = await extractLocationFromBio(profileData.bio)

  if (extractedLocation) {
    console.log(
      `[Profile Search] Location extracted: ${extractedLocation.city || 'Unknown'}, ${extractedLocation.stateCode || extractedLocation.countryCode} (${extractedLocation.confidence})`
    )
  }

  console.log(
    `[Profile Search] Fetched ${profileData.posts.length} posts, downloading images...`
  )

  // Download images in parallel with metadata
  const imagesWithMetadata = await Promise.all(
    profileData.posts.map(async (post) => ({
      buffer: await downloadImageAsBuffer(post.displayUrl),
      shortcode: post.shortcode,
      url: post.url,
      displayUrl: post.displayUrl,
      caption: post.caption,
      timestamp: post.timestamp,
      likesCount: post.likesCount,
    }))
  )

  // Extract buffers for processing
  const imageBuffers = imagesWithMetadata.map((img) => img.buffer)

  // Convert buffers to Files for embedding generation
  const imageFiles = imageBuffers.map((buffer, i) => {
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer

    return new File([arrayBuffer], `profile-${i}.jpg`, {
      type: 'image/jpeg',
    })
  })

  // Generate embeddings and analyze colors in parallel
  const [embeddings, colorResults] = await Promise.all([
    Promise.all(imageFiles.map((file) => generateImageEmbedding(file))),
    Promise.all(imageBuffers.map((buffer) => analyzeImageColor(buffer))),
  ])

  console.log(`[Profile Search] Generated ${embeddings.length} embeddings, aggregating...`)

  // Aggregate embeddings
  const embedding = aggregateEmbeddings(embeddings)

  // Determine overall color using majority vote
  const colorCount = colorResults.filter((r) => r.isColor).length
  const colorPercentage = colorCount / colorResults.length
  const isColorQuery =
    colorPercentage > 0.6 ? true : colorPercentage < 0.4 ? false : null
  console.log(
    `[Profile Search] Color analysis: ${colorCount}/${colorResults.length} color → ${isColorQuery === null ? 'mixed' : isColorQuery ? 'COLOR' : 'B&G'}`
  )

  // Classify aggregated embedding styles for style-weighted search
  const queryStyles = await classifyQueryStyles(embedding)
  if (queryStyles.length > 0) {
    console.log(
      `[Profile Search] Styles: ${queryStyles.map((s) => `${s.style_name}(${(s.confidence * 100).toFixed(0)}%)`).join(', ')}`
    )
  }

  // Determine artist ID - use existing or create new
  let artistId: string | null = artistRecord?.id || null

  // Only create new artist if they don't exist
  if (!artistRecord) {
    console.log(`[Profile Search] Creating new artist @${username}...`)
    try {
      // Add short timestamp suffix to prevent slug collisions (artist_123 vs artist.123)
      const baseSlug = username.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`

      const { data: newArtist, error: artistError } = await supabaseService
        .from('artists')
        .insert({
          instagram_handle: username,
          name: profileData.username || username,
          slug,
          instagram_url: `https://www.instagram.com/${username}/`,
          bio: profileData.bio || null,
          follower_count: profileData.followerCount || null,
          discovery_source: 'profile_search',
          verification_status: 'unclaimed',
        })
        .select('id')
        .single()

      if (newArtist) {
        artistId = newArtist.id
        console.log(`[Profile Search] Created artist ${artistId}`)

        // Insert location if we extracted a city
        if (extractedLocation && extractedLocation.city) {
          try {
            const { error: locationError } = await supabaseService
              .from('artist_locations')
              .insert({
                artist_id: artistId,
                city: extractedLocation.city,
                region: extractedLocation.stateCode,
                country_code: extractedLocation.countryCode || 'US',
                is_primary: true,
                location_type: 'studio',
              })

            if (locationError) {
              console.error(`[Profile Search] Failed to insert location:`, locationError.message)
            } else {
              console.log(
                `[Profile Search] Location saved: ${extractedLocation.city}, ${extractedLocation.stateCode}`
              )
            }
          } catch (locError) {
            console.error(`[Profile Search] Error inserting location:`, locError)
          }
        }
      } else if (artistError) {
        console.error(`[Profile Search] Failed to create artist:`, artistError.message)
        console.warn(`[Profile Search] WARNING: Images scraped for @${username} will not be saved (no artist record)`)
      }
    } catch (createError) {
      console.error(`[Profile Search] Error creating artist:`, createError)
      console.warn(`[Profile Search] WARNING: Images scraped for @${username} will not be saved (no artist record)`)
    }
  }

  // Build searched artist data for immediate display
  const searchedArtist: SearchedArtistData = {
    id: artistId,
    instagram_handle: username,
    name: artistRecord?.name || profileData.username || username,
    profile_image_url: profileData.profileImageUrl || null,
    bio: profileData.bio || null,
    follower_count: profileData.followerCount || null,
    city: extractedLocation?.city || null,
    images: profileData.posts.slice(0, 3).map((p) => p.displayUrl),
  }

  // Process images for the artist (existing or new)
  if (artistId) {
    try {
      const saveResult = await saveImagesToTempFromBuffers(
        artistId,
        imagesWithMetadata,
        profileData.profileImageUrl
      )

      if (saveResult.success) {
        console.log(`[Profile Search] Images saved to temp, processing in background...`)

        // Background processing with job status tracking
        const currentArtistId = artistId // Capture for closure
        processArtistImages(currentArtistId)
          .then(async (result) => {
            console.log(
              `[Profile Search] Background processing complete: ${result.imagesProcessed} images`
            )
            // Update job status to completed
            await supabaseService
              .from('pipeline_jobs')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('artist_id', currentArtistId)
              .eq('job_type', 'scrape_single')
              .eq('status', 'running')
          })
          .catch(async (err) => {
            console.error(`[Profile Search] Background processing failed:`, err)
            // Update job status to failed for potential retry
            await supabaseService
              .from('pipeline_jobs')
              .update({
                status: 'failed',
                error_message: err instanceof Error ? err.message : 'Unknown error',
              })
              .eq('artist_id', currentArtistId)
              .eq('job_type', 'scrape_single')
              .eq('status', 'running')
          })
      } else {
        console.warn(`[Profile Search] Failed to save images: ${saveResult.error}`)
      }

      // Create scraping job as fallback
      const { error: jobError } = await supabaseService.from('pipeline_jobs').insert({
        artist_id: artistId,
        job_type: 'scrape_single',
        triggered_by: 'profile-search',
        status: saveResult.success ? 'running' : 'pending',
      })
      if (!jobError || jobError.code === '23505') {
        console.log(`[Profile Search] Created scraping job for @${username}`)
      }
    } catch (saveError) {
      console.error(`[Profile Search] Error saving images:`, saveError)
    }
  }

  console.log(`[Profile Search] Apify scraping completed`)

  return {
    searchType: 'instagram_profile',
    embedding,
    queryText: `Artists similar to @${username}`,
    queryStyles,
    isColorQuery,
    instagramUsername: username,
    instagramPostUrl: null,
    artistIdSource: null,
    searchedArtist,
  }
}

// Re-export error types and messages for route.ts error handling
export { InstagramError, PROFILE_ERROR_MESSAGES }
