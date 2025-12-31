import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateImageEmbedding, generateTextEmbedding } from '@/lib/embeddings/modal-client'
import { detectInstagramUrl, extractPostId } from '@/lib/instagram/url-detector'
import { fetchInstagramPostImage, downloadImageAsBuffer, InstagramError, ERROR_MESSAGES } from '@/lib/instagram/post-fetcher'
import { checkInstagramSearchRateLimit, getClientIp } from '@/lib/rate-limiter'

// Validation schemas
const textSearchSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(3).max(200),
  city: z.string().optional(),
})

const instagramPostSchema = z.object({
  type: z.literal('instagram_post'),
  instagram_url: z.string().min(1),
  city: z.string().optional(),
})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/search
 *
 * Accepts image upload or text query, generates CLIP embedding,
 * stores in searches table, returns searchId
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let searchType: 'image' | 'text' | 'instagram_post'
    let embedding: number[]
    let queryText: string | null = null
    let instagramUsername: string | null = null
    let instagramPostUrl: string | null = null

    // Handle multipart/form-data (image upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()

      const type = formData.get('type') as string
      const imageFile = formData.get('image') as File | null

      // Validate
      if (type !== 'image') {
        return NextResponse.json(
          { error: 'Invalid search type for form data' },
          { status: 400 }
        )
      }

      if (!imageFile) {
        return NextResponse.json(
          { error: 'No image file provided' },
          { status: 400 }
        )
      }

      // Validate file size
      if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 400 }
        )
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: `File type must be one of: ${ALLOWED_TYPES.join(', ')}` },
          { status: 400 }
        )
      }

      searchType = 'image'

      // Generate image embedding
      embedding = await generateImageEmbedding(imageFile)
    }
    // Handle application/json (text search or Instagram post)
    else if (contentType.includes('application/json')) {
      const body = await request.json()

      // Try Instagram post schema first
      const instagramParsed = instagramPostSchema.safeParse(body)
      if (instagramParsed.success) {
        searchType = 'instagram_post'

        // Detect and validate Instagram URL
        const detectedUrl = detectInstagramUrl(instagramParsed.data.instagram_url)
        if (!detectedUrl || detectedUrl.type !== 'post') {
          return NextResponse.json(
            { error: 'Invalid Instagram post URL. Please provide a valid post or reel link.' },
            { status: 400 }
          )
        }

        // Rate limiting for Instagram searches (10 per hour per IP)
        const clientIp = getClientIp(request)
        const rateLimitResult = checkInstagramSearchRateLimit(clientIp)

        if (!rateLimitResult.success) {
          return NextResponse.json(
            {
              error: 'Too many Instagram searches. Please try again later.',
              retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              },
            }
          )
        }

        try {
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
            type: 'image/jpeg'
          })

          // Generate embedding
          embedding = await generateImageEmbedding(imageFile)

          // Store attribution data
          instagramUsername = postData.username
          instagramPostUrl = detectedUrl.originalUrl
          queryText = `Instagram post by @${postData.username}`
        } catch (error) {
          if (error instanceof InstagramError) {
            return NextResponse.json(
              { error: ERROR_MESSAGES[error.code] || error.message },
              { status: 400 }
            )
          }
          throw error
        }
      } else {
        // Try text search schema
        const textParsed = textSearchSchema.safeParse(body)
        if (!textParsed.success) {
          return NextResponse.json(
            { error: 'Invalid request body', details: textParsed.error.errors },
            { status: 400 }
          )
        }

        searchType = 'text'
        queryText = textParsed.data.text

        // Enhance query for better CLIP understanding
        // Add "tattoo" context if not present to help with niche style queries
        const enhancedQuery = queryText.toLowerCase().includes('tattoo')
          ? queryText
          : `${queryText} tattoo`

        // Generate text embedding with enhanced query
        embedding = await generateTextEmbedding(enhancedQuery)
      }
    }
    else {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 400 }
      )
    }

    // Verify embedding is valid
    if (!embedding || embedding.length !== 768) {
      throw new Error(`Invalid embedding dimension: ${embedding?.length}`)
    }

    // Store in searches table
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('searches')
      .insert({
        embedding: `[${embedding.join(',')}]`,
        query_type: searchType,
        query_text: queryText,
        instagram_username: instagramUsername,
        instagram_post_id: instagramPostUrl ? extractPostId(instagramPostUrl) : null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error storing search:', error)
      throw error
    }

    // Return search ID
    return NextResponse.json({
      searchId: data.id,
      queryType: searchType,
    })
  } catch (error) {
    console.error('Search API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to process search',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
