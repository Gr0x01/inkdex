/**
 * Search type definitions for Phase 5: Search Flow
 */

export type SearchQueryType = 'image' | 'text' | 'hybrid'

export interface SearchRequest {
  type: SearchQueryType
  image?: File
  text?: string
  city?: string
}

export interface SearchResponse {
  searchId: string
  queryType: SearchQueryType
}

export interface MatchingImage {
  url: string
  instagramUrl: string
  similarity: number
}

export interface SearchResult {
  artist_id: string
  artist_name: string
  artist_slug: string
  city: string
  profile_image_url: string | null
  instagram_url: string | null
  is_verified: boolean
  matching_images?: MatchingImage[]
  similarity: number
}

export interface SearchResultsResponse {
  artists: SearchResult[]
  total: number
  page: number
  limit: number
  queryTime: number
  queryType: SearchQueryType
  queryText?: string
  city?: string | null
}

export interface SearchFormData {
  searchType: 'image' | 'text'
  imageFile?: File
  imagePreview?: string
  textQuery: string
  city?: string
}
