/**
 * Generate a URL-safe slug from artist name and ID
 * Format: "mike-rubendall-abc123"
 */
export function generateArtistSlug(name: string, id: string): string {
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Take first 8 characters of UUID for readability
  const idPart = id.substring(0, 8)

  return `${namePart}-${idPart}`
}

/**
 * Extract artist ID from slug
 * "mike-rubendall-abc123" -> "abc123"
 */
export function extractIdFromSlug(slug: string): string | null {
  const parts = slug.split('-')
  return parts[parts.length - 1] || null
}
