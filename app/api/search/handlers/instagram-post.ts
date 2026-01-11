import { NextRequest } from 'next/server'
import { generateImageEmbedding } from '@/lib/embeddings/hybrid-client'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import { classifyQueryStyles } from '@/lib/search/style-classifier'
import { analyzeImageColor } from '@/lib/search/color-analyzer'
import {
  fetchInstagramPostImage,
  downloadImageAsBuffer,
  InstagramError,
  ERROR_MESSAGES,
} from '@/lib/instagram/post-fetcher'
import { checkInstagramSearchRateLimit, getClientIp } from '@/lib/rate-limiter'
import { instagramPostSchema } from '../schemas'
import type { SearchInput } from '@/lib/search/search-storage'

/**
 * Rate limit error with retry information
 */
export class RateLimitError extends Error {
  retryAfter: number
  limit: number
  remaining: number
  reset: number

  constructor(rateLimitResult: { reset: number; limit: number; remaining: number }) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    super('Too many Instagram searches. Please try again later.')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
    this.limit = rateLimitResult.limit
    this.remaining = rateLimitResult.remaining
    this.reset = rateLimitResult.reset
  }
}

/**
 * Validation error for Instagram post searches
 */
export class InstagramPostValidationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'InstagramPostValidationError'
    this.status = status
  }
}

/**
 * Handle Instagram post search
 *
 * @param body - Request body (already parsed JSON)
 * @param request - NextRequest for IP extraction
 * @returns SearchInput ready for storage
 * @throws RateLimitError if rate limited
 * @throws InstagramPostValidationError if validation fails
 * @throws InstagramError if Instagram fetch fails
 */
export async function handleInstagramPostSearch(
  body: unknown,
  request: NextRequest
): Promise<SearchInput> {
  const parsed = instagramPostSchema.safeParse(body)
  if (!parsed.success) {
    throw new InstagramPostValidationError('Invalid Instagram post request')
  }

  // Detect and validate Instagram URL
  const detectedUrl = detectInstagramUrl(parsed.data.instagram_url)
  if (!detectedUrl || detectedUrl.type !== 'post') {
    throw new InstagramPostValidationError(
      'Invalid Instagram post URL. Please provide a valid post or reel link.'
    )
  }

  // Rate limiting for Instagram searches (50 per hour per IP)
  const clientIp = getClientIp(request)
  const rateLimitResult = await checkInstagramSearchRateLimit(clientIp)

  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult)
  }

  // Fetch image from Instagram post
  const postData = await fetchInstagramPostImage(detectedUrl.id)

  // Download image as buffer
  const imageBuffer = await downloadImageAsBuffer(postData.imageUrl)

  // Convert Buffer to ArrayBuffer, then to File for embedding generation
  const arrayBuffer = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  ) as ArrayBuffer
  const imageFile = new File([arrayBuffer], 'instagram-post.jpg', {
    type: 'image/jpeg',
  })

  // Generate embedding and analyze color in parallel
  const [embedding, colorResult] = await Promise.all([
    generateImageEmbedding(imageFile),
    analyzeImageColor(imageBuffer),
  ])

  const isColorQuery = colorResult.isColor
  console.log(
    `[Search] IG post color: ${isColorQuery ? 'COLOR' : 'B&G'} (sat: ${colorResult.avgSaturation.toFixed(3)})`
  )

  // Classify query image styles for style-weighted search
  const queryStyles = await classifyQueryStyles(embedding)
  if (queryStyles.length > 0) {
    console.log(
      `[Search] IG post styles: ${queryStyles.map((s) => `${s.style_name}(${(s.confidence * 100).toFixed(0)}%)`).join(', ')}`
    )
  }

  return {
    searchType: 'instagram_post',
    embedding,
    queryText: `Instagram post by @${postData.username}`,
    queryStyles,
    isColorQuery,
    instagramUsername: postData.username,
    instagramPostUrl: detectedUrl.originalUrl,
    artistIdSource: null,
    searchedArtist: null,
  }
}

// Re-export error types and messages for route.ts error handling
export { InstagramError, ERROR_MESSAGES }
