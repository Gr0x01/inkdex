/**
 * Image URL utilities for Supabase storage
 * Centralizes URL construction to avoid duplication and environment variable exposure
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
}

/**
 * Convert a Supabase storage path to a public URL
 * @param path - Storage path (e.g., "folder/image.jpg") or full URL
 * @param bucket - Storage bucket name (default: "portfolio-images")
 * @returns Full public URL
 */
export function getImageUrl(
  path: string | null | undefined,
  bucket: string = 'portfolio-images'
): string {
  if (!path) return '/placeholder-tattoo.jpg'

  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // Construct Supabase storage public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Get the best available image URL from multiple possible sources
 * @param options - Object with possible image paths in priority order
 * @returns Best available image URL
 */
export function getBestImageUrl(options: {
  r2ThumbnailLarge?: string | null
  r2ThumbnailMedium?: string | null
  storageThumbnail?: string | null
  profileImage?: string | null
  fallback?: string
}): string {
  const {
    r2ThumbnailLarge,
    r2ThumbnailMedium,
    storageThumbnail,
    profileImage,
    fallback = '/placeholder-tattoo.jpg',
  } = options

  const path =
    r2ThumbnailLarge ||
    r2ThumbnailMedium ||
    storageThumbnail ||
    profileImage ||
    fallback

  return getImageUrl(path)
}

/**
 * Get portfolio image URL from portfolio image object
 * @param image - Portfolio image object with possible thumbnail paths
 * @returns Image URL
 */
export function getPortfolioImageUrl(image: {
  r2_thumbnail_large?: string | null
  r2_thumbnail_medium?: string | null
  storage_thumb_640?: string | null
}): string {
  return getBestImageUrl({
    r2ThumbnailMedium: image.r2_thumbnail_medium,
    r2ThumbnailLarge: image.r2_thumbnail_large,
    storageThumbnail: image.storage_thumb_640,
  })
}

/**
 * Get artist featured image URL (hero image)
 * @param featuredImage - Featured image object
 * @param profileImage - Artist profile image URL as fallback
 * @returns Image URL
 */
export function getArtistFeaturedImageUrl(
  featuredImage?: {
    r2_thumbnail_large?: string | null
    r2_thumbnail_medium?: string | null
  } | null,
  profileImage?: string | null
): string {
  return getBestImageUrl({
    r2ThumbnailLarge: featuredImage?.r2_thumbnail_large,
    r2ThumbnailMedium: featuredImage?.r2_thumbnail_medium,
    profileImage,
  })
}
