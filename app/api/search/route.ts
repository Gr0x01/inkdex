import { NextRequest, NextResponse } from 'next/server'
import { handleImageSearch, ImageValidationError } from './handlers/image'
import { handleTextSearch } from './handlers/text'
import {
  handleInstagramPostSearch,
  RateLimitError,
  InstagramError,
  ERROR_MESSAGES,
  InstagramPostValidationError,
} from './handlers/instagram-post'
import {
  handleInstagramProfileSearch,
  InstagramProfileValidationError,
  PROFILE_ERROR_MESSAGES,
} from './handlers/instagram-profile'
import { handleSimilarArtistSearch, SimilarArtistError } from './handlers/similar-artist'
import { storeSearch, SearchInput } from '@/lib/search/search-storage'

/**
 * POST /api/search
 *
 * Accepts image upload or text query, generates CLIP embedding,
 * stores in searches table, returns searchId
 *
 * Search types:
 * - image: multipart/form-data with image file
 * - text: application/json with text query
 * - instagram_post: application/json with Instagram post URL
 * - instagram_profile: application/json with Instagram profile URL
 * - similar_artist: application/json with artist_id UUID
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let searchInput: SearchInput

    // Handle multipart/form-data (image upload)
    if (contentType.includes('multipart/form-data')) {
      searchInput = await handleImageSearch(request)
    }
    // Handle application/json (text search or Instagram)
    else if (contentType.includes('application/json')) {
      const body = await request.json()

      // Route to appropriate handler based on type
      if (body.type === 'instagram_post') {
        searchInput = await handleInstagramPostSearch(body, request)
      } else if (body.type === 'instagram_profile') {
        searchInput = await handleInstagramProfileSearch(body, request)
      } else if (body.type === 'similar_artist') {
        searchInput = await handleSimilarArtistSearch(body)
      } else {
        // Default to text search
        searchInput = await handleTextSearch(body)
      }
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 400 }
      )
    }

    // Store search and return ID
    const { searchId } = await storeSearch(searchInput)

    return NextResponse.json(
      {
        searchId,
        queryType: searchInput.searchType,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    // Handle validation errors
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof InstagramPostValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof InstagramProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof SimilarArtistError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    // Handle rate limiting
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfter: error.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': error.retryAfter.toString(),
            'X-RateLimit-Limit': error.limit.toString(),
            'X-RateLimit-Remaining': error.remaining.toString(),
            'X-RateLimit-Reset': error.reset.toString(),
          },
        }
      )
    }

    // Handle Instagram-specific errors
    if (error instanceof InstagramError) {
      const message =
        ERROR_MESSAGES[error.code] ||
        PROFILE_ERROR_MESSAGES[error.code] ||
        error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Handle text search validation errors (have details property)
    if (
      error instanceof Error &&
      'details' in error &&
      error.message === 'Invalid request body'
    ) {
      return NextResponse.json(
        { error: error.message, details: (error as Error & { details: unknown }).details },
        { status: 400 }
      )
    }

    // Generic error
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
