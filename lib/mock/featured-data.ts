// Mock data for featured images and artists until database queries are ready
// This will be replaced with real queries from lib/supabase/queries.ts

export interface FeaturedImage {
  id: string
  url: string
  artist_name: string
  artist_slug: string
  verified: boolean
}

export interface FeaturedArtist {
  id: string
  name: string
  slug: string
  shop_name: string | null
  verification_status: string
  portfolio_images: Array<{
    id: string
    url: string
    likes_count: number | null
  }>
}

// Placeholder data - will be populated from database
export const MOCK_FEATURED_IMAGES: FeaturedImage[] = []

export const MOCK_FEATURED_ARTISTS: FeaturedArtist[] = []
