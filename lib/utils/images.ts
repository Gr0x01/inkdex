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
  storageThumb1280?: string | null
  storageThumb640?: string | null
  storageThumb320?: string | null
  profileImage?: string | null
  fallback?: string
}): string {
  const {
    storageThumb1280,
    storageThumb640,
    storageThumb320,
    profileImage,
    fallback = '/placeholder-tattoo.jpg',
  } = options

  const path =
    storageThumb1280 ||
    storageThumb640 ||
    storageThumb320 ||
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
  storage_thumb_1280?: string | null
  storage_thumb_640?: string | null
  storage_thumb_320?: string | null
}): string {
  return getBestImageUrl({
    storageThumb1280: image.storage_thumb_1280,
    storageThumb640: image.storage_thumb_640,
    storageThumb320: image.storage_thumb_320,
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
    storage_thumb_1280?: string | null
    storage_thumb_640?: string | null
  } | null,
  profileImage?: string | null
): string {
  return getBestImageUrl({
    storageThumb1280: featuredImage?.storage_thumb_1280,
    storageThumb640: featuredImage?.storage_thumb_640,
    profileImage,
  })
}

/**
 * Get artist profile image URL with fallback chain
 * Priority: storage_thumb_640 > storage_thumb_320 > storage_path > legacy CDN URL > placeholder
 * @param artist - Artist object with profile image fields
 * @returns Image URL
 */
export function getProfileImageUrl(artist: {
  profile_storage_thumb_640?: string | null
  profile_storage_thumb_320?: string | null
  profile_storage_path?: string | null
  profile_image_url?: string | null // legacy fallback (Instagram CDN)
}): string {
  const path =
    artist.profile_storage_thumb_640 ||
    artist.profile_storage_thumb_320 ||
    artist.profile_storage_path ||
    artist.profile_image_url

  return getImageUrl(path)
}
