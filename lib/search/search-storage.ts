import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { extractPostId } from '@/lib/instagram/url-detector'
import type { StyleMatch } from './style-classifier'
import type { SearchedArtistData } from '@/types/search'

/**
 * Input for storing a search in the database
 */
export interface SearchInput {
  searchType: 'image' | 'text' | 'instagram_post' | 'instagram_profile' | 'similar_artist'
  embedding: number[]
  queryText: string | null
  queryStyles: StyleMatch[]
  isColorQuery: boolean | null
  instagramUsername: string | null
  instagramPostUrl: string | null
  artistIdSource: string | null
  searchedArtist: SearchedArtistData | null
}

/**
 * Result from storing a search
 */
export interface StoreSearchResult {
  searchId: string
}

// Zod schema for validating searched artist data before storage
const searchedArtistSchema = z.object({
  id: z.string().uuid().nullable(),
  instagram_handle: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  profile_image_url: z.string().nullable().or(z.literal(null)),
  bio: z.string().max(2000).nullable().or(z.literal(null)),
  follower_count: z.number().int().min(0).nullable().or(z.literal(null)),
  city: z.string().max(100).nullable().or(z.literal(null)),
  images: z.array(z.string().min(1)).max(10),
  is_pro: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_verified: z.boolean().optional(),
})

/**
 * Validate embedding dimension
 */
export function validateEmbedding(embedding: number[] | undefined): void {
  if (!embedding || embedding.length !== 768) {
    throw new Error(`Invalid embedding dimension: ${embedding?.length}`)
  }
}

/**
 * Store a search in the database
 *
 * @param input - Search input data
 * @returns Object containing the searchId
 * @throws Error if embedding is invalid or database insert fails
 */
export async function storeSearch(input: SearchInput): Promise<StoreSearchResult> {
  // Verify embedding is valid
  validateEmbedding(input.embedding)

  const supabase = await createClient()

  // Validate searched artist data before storage (security: prevent JSONB injection)
  let validatedSearchedArtist: SearchedArtistData | null = null
  if (input.searchedArtist) {
    const validation = searchedArtistSchema.safeParse(input.searchedArtist)
    if (validation.success) {
      validatedSearchedArtist = validation.data
    } else {
      console.warn('[Search] Invalid searched_artist data, skipping:', validation.error.errors)
    }
  }

  // Build insert payload with style and color data
  const insertPayload: Record<string, unknown> = {
    embedding: `[${input.embedding.join(',')}]`,
    query_type: input.searchType,
    query_text: input.queryText,
    instagram_username: input.instagramUsername,
    instagram_post_id: input.instagramPostUrl ? extractPostId(input.instagramPostUrl) : null,
    artist_id_source: input.artistIdSource,
    detected_styles: input.queryStyles.length > 0 ? input.queryStyles : null,
    primary_style: input.queryStyles[0]?.style_name || null,
    is_color: input.isColorQuery,
    searched_artist: validatedSearchedArtist,
  }

  console.log('[Search] Inserting with style classification:', {
    styles: input.queryStyles.map(s => s.style_name).join(', ') || 'none',
    primaryStyle: input.queryStyles[0]?.style_name,
    isColor: input.isColorQuery
  })

  let { data, error } = await supabase
    .from('searches')
    .insert(insertPayload)
    .select('id')
    .single()

  console.log('[Search] Insert result:', { success: !error, errorCode: error?.code })

  // Fallback: if schema cache is stale, retry without style columns
  if (error?.code === 'PGRST204' && error?.message?.includes('detected_styles')) {
    console.warn('[Search] Schema cache stale, retrying without style columns')
    const fallbackPayload = {
      embedding: `[${input.embedding.join(',')}]`,
      query_type: input.searchType,
      query_text: input.queryText,
      instagram_username: input.instagramUsername,
      instagram_post_id: input.instagramPostUrl ? extractPostId(input.instagramPostUrl) : null,
      artist_id_source: input.artistIdSource,
    }
    const result = await supabase
      .from('searches')
      .insert(fallbackPayload)
      .select('id')
      .single()
    data = result.data
    error = result.error
  }

  if (error || !data) {
    console.error('Error storing search:', error)
    throw error || new Error('No data returned from search insert')
  }

  return { searchId: data.id }
}
