/**
 * Search type definitions for Phase 5: Search Flow
 */

export type SearchQueryType = 'image' | 'text' | 'hybrid' | 'instagram_post' | 'instagram_profile' | 'similar_artist'

export interface SearchRequest {
  type: SearchQueryType
  image?: File
  text?: string
  instagram_url?: string
  artist_id?: string  // For similar_artist searches
  city?: string
}

export interface SearchResponse {
  searchId: string
  queryType: SearchQueryType
}

export interface MatchingImage {
  url: string
  instagramUrl?: string  // Optional for searched artists (scraped images don't have this yet)
  similarity: number
  likes_count?: number | null
}

/**
 * Data for the searched artist, stored in searches table for immediate display
 * Used when a user searches for an Instagram profile
 */
export interface SearchedArtistData {
  id: string | null           // null if artist not yet in DB
  instagram_handle: string
  name: string
  profile_image_url: string | null
  bio: string | null
  follower_count: number | null
  city: string | null
  images: string[]            // The image URLs used for search (for display)
  is_pro?: boolean            // Pro subscription status
  is_featured?: boolean       // Featured artist flag
  is_verified?: boolean       // Verification status (derived from verification_status)
}

export interface SearchResult {
  artist_id: string
  artist_name: string
  artist_slug: string
  city: string | null
  region?: string        // State/province code (e.g., 'TX', 'Ontario')
  country_code?: string  // ISO 3166-1 alpha-2 (e.g., 'US', 'UK')
  profile_image_url: string | null
  follower_count: number | null
  instagram_url: string | null
  is_verified: boolean
  is_pro: boolean        // Pro subscription status (for Pro badge)
  is_featured: boolean   // Featured artist flag (for Featured badge)
  max_likes?: number     // Maximum likes across all portfolio images
  matching_images?: MatchingImage[]
  similarity: number
  location_count?: number // Number of locations this artist works in (for multi-location badge)
  is_searched_artist?: boolean  // True if this is the artist that was searched for (profile search)
}

export interface SearchResultsResponse {
  artists: SearchResult[]
  total: number
  page: number
  limit: number
  queryTime: number
  queryType: SearchQueryType
  queryText?: string
  // Location filters
  country?: string | null
  region?: string | null
  city?: string | null
  // Instagram attribution metadata
  instagramUsername?: string
  instagramPostUrl?: string
  artistName?: string  // For similar_artist searches
}

export interface SearchFormData {
  searchType: 'image' | 'text'
  imageFile?: File
  imagePreview?: string
  textQuery: string
  city?: string
}

/**
 * Artist location data from artist_locations table
 */
export interface ArtistLocation {
  id: string
  city: string | null
  region: string | null
  country_code: string
  location_type: 'city' | 'region' | 'country'
  is_primary: boolean
  display_order: number
}

/**
 * Artist with multi-location support
 * Extends base Artist type with locations array
 */
export interface ArtistWithLocations {
  id: string
  name: string
  slug: string
  city: string
  state: string | null
  locations?: ArtistLocation[]
  // ... other artist fields
}
