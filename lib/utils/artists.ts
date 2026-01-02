import type { SearchResult } from '@/types/search'
import type { FeaturedArtist } from '@/lib/mock/featured-data'

/**
 * Build Instagram profile URL from username handle
 * Handles @prefix removal and basic validation
 */
function buildInstagramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null

  // Remove @ prefix and trim whitespace
  const cleanHandle = handle.trim().replace(/^@+/, '')

  // Basic validation (alphanumeric, dots, underscores only)
  if (!/^[a-zA-Z0-9._]+$/.test(cleanHandle)) {
    console.warn(`Invalid Instagram handle format: ${handle}`)
    return null
  }

  return `https://instagram.com/${cleanHandle}`
}

/**
 * Transform FeaturedArtist to SearchResult format for ArtistCard component
 * Used by city browse pages to enable unified card design
 *
 * @param artist - Artist data from database query
 * @param city - City name for display
 * @returns SearchResult with similarity set to 0 (not applicable for browse pages)
 */
export function transformToSearchResult(
  artist: FeaturedArtist & { instagram_handle?: string; is_featured?: boolean },
  city: string
): SearchResult {
  return {
    artist_id: artist.id,
    artist_name: artist.name,
    artist_slug: artist.slug,
    city: city,
    profile_image_url: artist.profile_image_url || null,
    follower_count: artist.follower_count,
    instagram_url: buildInstagramUrl(artist.instagram_handle),
    is_verified: artist.verification_status === 'verified',
    is_pro: artist.is_pro ?? false,
    is_featured: artist.is_featured ?? false,
    matching_images: (artist.portfolio_images || []).map(img => ({
      url: img.url,
      instagramUrl: img.instagram_url || '',
      similarity: 0,  // Not applicable for browse pages
      likes_count: img.likes_count,
    })),
    similarity: 0,  // Not applicable for browse pages
  }
}
