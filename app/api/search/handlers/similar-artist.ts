import { createClient } from '@/lib/supabase/server'
import { aggregateEmbeddings } from '@/lib/embeddings/aggregate'
import { classifyQueryStyles } from '@/lib/search/style-classifier'
import { parseDbEmbeddings } from '@/lib/search/parse-embeddings'
import { calculateColorProfile } from '@/lib/search/color-profile'
import { similarArtistSchema } from '../schemas'
import type { SearchInput } from '@/lib/search/search-storage'

/**
 * Validation error for similar artist searches
 */
export class SimilarArtistError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'SimilarArtistError'
    this.status = status
  }
}

/**
 * Handle similar artist search
 *
 * @param body - Request body (already parsed JSON)
 * @returns SearchInput ready for storage
 * @throws SimilarArtistError if validation or lookup fails
 */
export async function handleSimilarArtistSearch(body: unknown): Promise<SearchInput> {
  const parsed = similarArtistSchema.safeParse(body)
  if (!parsed.success) {
    throw new SimilarArtistError('Invalid similar artist request')
  }

  const artistId = parsed.data.artist_id

  console.log(`[Similar Artist] Fetching portfolio for artist ${artistId}...`)

  // Fetch artist with portfolio images and embeddings
  const supabase = await createClient()
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select(
      `
      id,
      name,
      slug,
      instagram_handle,
      city,
      portfolio_images!inner (
        id,
        embedding,
        status
      )
    `
    )
    .eq('id', artistId)
    .single()

  // Filter images client-side for active status and non-null embeddings
  if (artist) {
    artist.portfolio_images = (
      artist.portfolio_images as Array<{ id: string; status: string; embedding: unknown }>
    ).filter((img) => img.status === 'active' && img.embedding != null)
  }

  if (artistError || !artist) {
    throw new SimilarArtistError('Artist not found or has no portfolio images', 404)
  }

  if (artist.portfolio_images.length < 3) {
    throw new SimilarArtistError(
      'Artist must have at least 3 portfolio images for similarity search'
    )
  }

  console.log(
    `[Similar Artist] Found ${artist.portfolio_images.length} images, aggregating embeddings...`
  )

  // Parse embeddings from database format
  const embeddings = parseDbEmbeddings(
    artist.portfolio_images as Array<{ embedding: string | number[] }>
  )

  // Aggregate embeddings (same as Instagram profile search)
  const embedding = aggregateEmbeddings(embeddings)

  // Calculate artist's color profile from portfolio images
  const { data: colorStats } = await supabase
    .from('portfolio_images')
    .select('is_color')
    .eq('artist_id', artistId)
    .eq('status', 'active')
    .not('is_color', 'is', null)

  const isColorQuery = colorStats ? calculateColorProfile(colorStats) : null

  if (colorStats && colorStats.length > 0) {
    const colorCount = colorStats.filter((img) => img.is_color === true).length
    const colorPercentage = colorCount / colorStats.length
    console.log(
      `[Similar Artist] Artist color profile: ${(colorPercentage * 100).toFixed(0)}% color → ${isColorQuery === null ? 'mixed' : isColorQuery ? 'COLOR' : 'B&G'}`
    )
  }

  // Classify aggregated embedding styles for style-weighted search
  const queryStyles = await classifyQueryStyles(embedding)
  if (queryStyles.length > 0) {
    console.log(
      `[Similar Artist] Styles: ${queryStyles.map((s) => `${s.style_name}(${(s.confidence * 100).toFixed(0)}%)`).join(', ')}`
    )
  }

  console.log(`[Similar Artist] Aggregated ${embeddings.length} embeddings`)

  return {
    searchType: 'similar_artist',
    embedding,
    queryText: `Artists similar to ${artist.name}`,
    queryStyles,
    isColorQuery,
    instagramUsername: null,
    instagramPostUrl: null,
    artistIdSource: artistId,
    searchedArtist: null,
  }
}
