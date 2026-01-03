/**
 * Redis Cache Invalidation Helpers
 *
 * Provides smart cache invalidation strategies based on data changes.
 * Implements pattern-based invalidation and common invalidation workflows.
 *
 * Invalidation Triggers:
 * - Artist updates → Profile, city browse, featured caches
 * - Portfolio changes → Profile, search, analytics caches
 * - Featured toggles → Featured artist caches
 * - Mining completion → Admin dashboard and mining stats
 *
 * Uses SCAN for safe, non-blocking pattern matching in production.
 */

import { invalidateCache, invalidateMultiple } from './cache'

/**
 * Options for artist cache invalidation
 */
export interface InvalidateArtistOptions {
  /** Invalidate artist profile cache */
  profile?: boolean
  /** Invalidate search results cache (after portfolio changes) */
  search?: boolean
  /** Invalidate analytics caches (top images, etc.) */
  analytics?: boolean
  /** Invalidate city browse pages */
  cityBrowse?: boolean
  /** Invalidate featured artists */
  featured?: boolean
}

/**
 * Invalidate all caches related to a specific artist
 *
 * Called when an artist's data changes (profile update, portfolio changes,
 * verification status changes, etc.). Uses selective invalidation based on
 * what actually changed.
 *
 * @param artistSlug - Artist slug (for profile cache)
 * @param options - Which cache groups to invalidate
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // After artist profile update
 * await invalidateArtistCaches('john-doe', {
 *   profile: true,
 *   cityBrowse: true,
 *   featured: true
 * })
 *
 * // After portfolio image upload
 * await invalidateArtistCaches('john-doe', {
 *   profile: true,
 *   search: true,
 *   analytics: true
 * })
 * ```
 */
export async function invalidateArtistCaches(
  artistSlug: string,
  options: InvalidateArtistOptions = {}
): Promise<number> {
  const patterns: string[] = []

  // Default: invalidate profile cache (most common case)
  if (options.profile !== false) {
    patterns.push(`artist:profile:${artistSlug}`)
  }

  // Invalidate search results (portfolio images changed)
  if (options.search) {
    patterns.push('search:*')
  }

  // Invalidate analytics caches (top images, time series)
  if (options.analytics) {
    patterns.push('analytics:*')
  }

  // Invalidate city browse pages (artist added/removed from city)
  if (options.cityBrowse) {
    patterns.push('city:browse:*')
  }

  // Invalidate featured artists (featured status changed)
  if (options.featured) {
    patterns.push('featured:artists:*')
  }

  if (patterns.length === 0) {
    console.warn('[Cache Invalidation] No patterns provided, nothing to invalidate')
    return 0
  }

  console.log(`[Cache Invalidation] Invalidating caches for artist ${artistSlug}:`, patterns)
  return await invalidateMultiple(patterns)
}

/**
 * Invalidate admin dashboard and mining stats caches
 *
 * Called after mining pipeline runs complete or admin data changes.
 * Updates counts and statistics displayed in admin panel.
 *
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // After mining run completes
 * await invalidateAdminCaches()
 *
 * // After manual artist verification
 * await invalidateAdminCaches()
 * ```
 */
export async function invalidateAdminCaches(): Promise<number> {
  console.log('[Cache Invalidation] Invalidating admin caches')

  return await invalidateMultiple([
    'admin:dashboard:*', // Dashboard stats
    'admin:mining:*', // Mining pipeline stats
  ])
}

/**
 * Invalidate featured artists caches
 *
 * Called when artist featured status changes or follower counts update.
 * Featured artists are displayed on homepage, so invalidation is important
 * for consistency.
 *
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // After toggling artist.is_featured
 * await invalidateFeaturedCaches()
 *
 * // After bulk featuring artists
 * await invalidateFeaturedCaches()
 * ```
 */
export async function invalidateFeaturedCaches(): Promise<number> {
  console.log('[Cache Invalidation] Invalidating featured artist caches')
  return await invalidateCache('featured:artists:*')
}

/**
 * Invalidate city-related caches
 *
 * Called when artists are added/removed from a city, or when city artist
 * counts change significantly.
 *
 * @param state - Optional state filter (invalidate only one state's cities)
 * @param city - Optional city filter (invalidate only one city)
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // Invalidate all cities
 * await invalidateCityCaches()
 *
 * // Invalidate all Texas cities
 * await invalidateCityCaches('TX')
 *
 * // Invalidate only Austin, TX
 * await invalidateCityCaches('TX', 'austin')
 * ```
 */
export async function invalidateCityCaches(
  state?: string,
  city?: string
): Promise<number> {
  let pattern: string

  if (state && city) {
    pattern = `city:browse:${state}:${city}:*`
    console.log(`[Cache Invalidation] Invalidating caches for ${city}, ${state}`)
  } else if (state) {
    pattern = `city:browse:${state}:*`
    console.log(`[Cache Invalidation] Invalidating caches for state ${state}`)
  } else {
    pattern = 'city:browse:*'
    console.log('[Cache Invalidation] Invalidating all city caches')
  }

  const browseCount = await invalidateCache(pattern)

  // Also invalidate cities-with-counts cache (dropdown list)
  const countsCount = await invalidateCache('cities:with-counts:*')

  return browseCount + countsCount
}

/**
 * Invalidate search results cache
 *
 * Called when search index is updated (new embeddings, vector index rebuild).
 * This is a heavy operation - only call when search results would actually
 * change for all queries.
 *
 * Note: Normally search cache uses long TTL (24h) and doesn't need manual
 * invalidation. Only call this after major index changes.
 *
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // After vector index rebuild
 * await invalidateSearchCache()
 *
 * // After bulk embedding updates
 * await invalidateSearchCache()
 * ```
 */
export async function invalidateSearchCache(): Promise<number> {
  console.warn('[Cache Invalidation] Invalidating ALL search results cache')
  return await invalidateCache('search:*')
}

/**
 * Invalidate analytics caches for a specific artist
 *
 * Called when analytics data is manually corrected or recalculated.
 * Normally analytics use TTL-based expiration (30 min) and don't need
 * manual invalidation.
 *
 * @param artistId - Artist UUID
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // After manual analytics correction
 * await invalidateAnalyticsCaches('uuid-123')
 * ```
 */
export async function invalidateAnalyticsCaches(artistId: string): Promise<number> {
  console.log(`[Cache Invalidation] Invalidating analytics for artist ${artistId}`)

  return await invalidateMultiple([
    `analytics:summary:*:${artistId}:*`,
    `analytics:top-images:*:${artistId}:*`,
    `analytics:timeseries:*:${artistId}:*`,
  ])
}

/**
 * Invalidate all caches (nuclear option)
 *
 * Only use in emergencies or during deployment of cache schema changes.
 * This will cause a temporary performance hit as all caches rebuild.
 *
 * Requires NODE_ENV !== 'production' to prevent accidental use.
 *
 * @returns Total number of cache keys deleted
 *
 * @example
 * ```typescript
 * // After cache schema migration
 * await invalidateAllCaches()
 * ```
 */
export async function invalidateAllCaches(): Promise<number> {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Cache Invalidation] Blocked: Cannot flush all caches in production')
    console.error('[Cache Invalidation] Use specific invalidation functions instead')
    return 0
  }

  console.warn('[Cache Invalidation] FLUSHING ALL CACHES (development only)')

  return await invalidateMultiple([
    'search:*',
    'admin:*',
    'analytics:*',
    'featured:*',
    'cities:*',
    'artist:*',
    'city:*',
  ])
}

/**
 * Schedule cache invalidation for later execution
 *
 * Useful for invalidating caches after async operations complete
 * (e.g., after scraping job finishes).
 *
 * @param patterns - Cache patterns to invalidate
 * @param delayMs - Delay in milliseconds before invalidation
 * @returns Promise that resolves when invalidation completes
 *
 * @example
 * ```typescript
 * // Invalidate admin caches 30 seconds after mining starts
 * // (gives time for database writes to complete)
 * scheduleInvalidation(['admin:dashboard:*', 'admin:mining:*'], 30000)
 * ```
 */
export function scheduleInvalidation(patterns: string[], delayMs: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      console.log(`[Cache Invalidation] Executing scheduled invalidation after ${delayMs}ms`)
      const count = await invalidateMultiple(patterns)
      resolve(count)
    }, delayMs)
  })
}
