import { generateTextEmbedding } from '@/lib/embeddings/hybrid-client'
import { textSearchSchema } from '../schemas'
import type { SearchInput } from '@/lib/search/search-storage'

/**
 * Handle text-based search
 *
 * @param body - Request body (already parsed JSON)
 * @returns SearchInput ready for storage
 * @throws Error if validation fails or embedding generation fails
 */
export async function handleTextSearch(body: unknown): Promise<SearchInput> {
  const parsed = textSearchSchema.safeParse(body)
  if (!parsed.success) {
    const error = new Error('Invalid request body')
    ;(error as Error & { details: unknown }).details = parsed.error.errors
    throw error
  }

  const queryText = parsed.data.text

  // Enhance query for better CLIP understanding
  // Add "tattoo" context if not present to help with niche style queries
  const enhancedQuery = queryText.toLowerCase().includes('tattoo')
    ? queryText
    : `${queryText} tattoo`

  // Generate text embedding with enhanced query
  const embedding = await generateTextEmbedding(enhancedQuery)

  return {
    searchType: 'text',
    embedding,
    queryText,
    queryStyles: [], // Text search doesn't classify styles
    isColorQuery: null, // Unknown for text search
    instagramUsername: null,
    instagramPostUrl: null,
    artistIdSource: null,
    searchedArtist: null,
  }
}
