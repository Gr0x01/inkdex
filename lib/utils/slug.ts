/**
 * Slug Generation Utility
 *
 * Centralized slug generation from Instagram handles to ensure consistency
 * across discovery scripts and prevent invalid slug formats.
 *
 * @module lib/utils/slug
 */

/**
 * Normalize Instagram handle for database lookups and API calls.
 *
 * Instagram handles are case-insensitive (Chou_tatt == chou_tatt).
 * This function normalizes handles to lowercase for consistent DB queries.
 *
 * @param handle - Instagram handle (with or without @ prefix)
 * @returns Normalized handle (lowercase, no @, trimmed)
 * @throws Error if handle is empty after normalization
 *
 * @example
 * ```typescript
 * normalizeInstagramHandle('@Chou_tatt')   // 'chou_tatt'
 * normalizeInstagramHandle('DuH.Tattoos')  // 'duh.tattoos'
 * normalizeInstagramHandle('  @INK_ART ')  // 'ink_art'
 * ```
 */
export function normalizeInstagramHandle(handle: string): string {
  if (!handle) {
    throw new Error('Instagram handle cannot be empty')
  }

  const normalized = handle.trim().replace(/^@+/, '').toLowerCase()

  if (!normalized) {
    throw new Error(`Instagram handle "${handle}" is empty after normalization`)
  }

  return normalized
}

/**
 * Generate a valid slug from an Instagram handle
 *
 * Instagram handles are globally unique, making them ideal for slugs.
 * This function sanitizes handles to meet validation requirements:
 * - Lowercase alphanumeric characters and hyphens only
 * - Max 50 characters
 * - No leading or trailing hyphens
 *
 * @param instagramHandle - Instagram handle (with or without @ prefix)
 * @returns Valid slug that passes /^[a-z0-9-]+$/ regex
 * @throws Error if handle is empty or produces an invalid slug
 *
 * @example
 * ```typescript
 * generateSlugFromInstagram('@duh.tattoos')  // 'duh-tattoos'
 * generateSlugFromInstagram('_dr_woo_')      // 'dr-woo'
 * generateSlugFromInstagram('ink_by_stax')   // 'ink-by-stax'
 * generateSlugFromInstagram('@no.fun.sara')  // 'no-fun-sara'
 * ```
 */
export function generateSlugFromInstagram(instagramHandle: string): string {
  // Remove @ prefix if present and trim whitespace
  const handle = instagramHandle.replace(/^@/, '').trim()

  // Validate non-empty input
  if (!handle) {
    throw new Error('Instagram handle cannot be empty')
  }

  // Sanitize handle:
  // 1. Convert to lowercase
  // 2. Replace all non-alphanumeric characters with hyphens
  // 3. Remove leading and trailing hyphens
  // 4. Truncate to 50 characters max
  const slug = handle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace special chars (dots, underscores, etc.) with hyphens
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
    .substring(0, 50)              // Enforce max 50 chars

  // Validate result is non-empty (handles that are all special characters)
  if (!slug || slug.length === 0) {
    throw new Error(
      `Instagram handle "${instagramHandle}" produces invalid slug (all special characters)`
    )
  }

  // Defense-in-depth: Validate against slug regex
  const SLUG_REGEX = /^[a-z0-9-]+$/
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(
      `Generated slug "${slug}" contains invalid characters (this should not happen)`
    )
  }

  return slug
}
