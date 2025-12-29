import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()

  const {
    threshold = 0.7,
    limit = 20,
    city = null,
    offset = 0,
  } = options

  const { data, error } = await supabase.rpc('search_artists_by_embedding', {
    query_embedding: `[${embedding.join(',')}]`,
    match_threshold: threshold,
    match_count: limit,
    city_filter: city,
    offset_param: offset,
  })

  if (error) {
    console.error('Error searching artists:', error)
    throw error
  }

  return data
}

/**
 * Get artist by slug
 */
export async function getArtistBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artists')
    .select(`
      *,
      portfolio_images (
        id,
        instagram_url,
        r2_thumbnail_medium,
        r2_thumbnail_large,
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
