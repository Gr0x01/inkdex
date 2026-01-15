'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ArtistCard from '@/components/search/ArtistCard'
import { SearchResult } from '@/types/search'
import { trackSearchConversion } from '@/lib/analytics/conversions'
import type { SearchType } from '@/lib/analytics/events'

interface SearchResultsGridProps {
  /** Search ID for DB-backed searches (mutually exclusive with queryText) */
  searchId?: string | null
  /** Query text for stateless searches (mutually exclusive with searchId) */
  queryText?: string | null
  initialResults: SearchResult[]
  totalCount: number
  filters: {
    country?: string | null
    region?: string | null
    city?: string | null
  }
  /** Exclude this artist from results (for similar_artist searches) */
  excludeArtistId?: string | null
  /** The searched artist ID (for instagram_profile searches) - exclude from pagination */
  searchedArtistId?: string | null
  /** Search metadata for analytics tracking */
  searchMetadata?: {
    searchType: SearchType
    queryLength?: number
  }
}

const BATCH_SIZE = 20

export default function SearchResultsGrid({
  searchId,
  queryText,
  initialResults,
  totalCount,
  filters,
  excludeArtistId,
  searchedArtistId,
  searchMetadata,
}: SearchResultsGridProps) {
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialResults.length < totalCount)
  const loaderRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store loadMore in a ref to avoid recreating observer on every render
  const loadMoreRef = useRef<() => Promise<void>>(undefined)

  // Load more results
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    // Need either searchId or queryText to paginate
    if (!searchId && !queryText) {
      console.warn('[SearchResultsGrid] No searchId or queryText for pagination')
      return
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        offset: results.length.toString(),
        limit: BATCH_SIZE.toString(),
      })

      if (filters.country) params.set('country', filters.country)
      if (filters.region) params.set('region', filters.region)
      if (filters.city) params.set('city', filters.city)

      // Use stateless query endpoint if queryText provided, otherwise use searchId
      let endpoint: string
      if (queryText) {
        params.set('q', queryText)
        endpoint = `/api/search/query?${params}`
      } else {
        endpoint = `/api/search/${searchId}?${params}`
      }

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to load more results')
      }

      const data = await response.json()

      // Filter out excluded artist (similar_artist) and searched artist (instagram_profile)
      let newArtists: SearchResult[] = data.artists || []
      if (excludeArtistId) {
        newArtists = newArtists.filter(
          (artist: SearchResult) => artist.artist_id !== excludeArtistId
        )
      }
      if (searchedArtistId) {
        newArtists = newArtists.filter(
          (artist: SearchResult) => artist.artist_id !== searchedArtistId
        )
      }

      setResults((prev) => [...prev, ...newArtists])
      setHasMore(data.hasMore ?? false)
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('[InfiniteScroll] Error loading more:', err)
      setError('Failed to load more results')
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [searchId, queryText, results.length, filters, excludeArtistId, searchedArtistId, loading, hasMore])

  // Keep loadMoreRef in sync
  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  // Intersection Observer for auto-loading
  useEffect(() => {
    const loader = loaderRef.current
    if (!loader) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          loadMoreRef.current?.()
        }
      },
      {
        rootMargin: '200px', // Trigger 200px before reaching the loader
      }
    )

    observer.observe(loader)

    return () => {
      observer.disconnect()
    }
  }, []) // Empty deps - observer is stable, uses ref for callback

  // Reset results when filters change (handled by parent via URL navigation)
  useEffect(() => {
    setResults(initialResults)
    setHasMore(initialResults.length < totalCount)
    setLoading(false)
    setError(null)
  }, [initialResults, totalCount])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Track search conversion for PostHog + Google Ads (once per search)
  const hasTrackedRef = useRef(false)
  useEffect(() => {
    if (!hasTrackedRef.current && initialResults.length > 0) {
      hasTrackedRef.current = true

      // Check if this is the user's first search (stored in sessionStorage)
      const hasSearchedBefore = typeof window !== 'undefined' &&
        sessionStorage.getItem('inkdex_has_searched') === 'true'

      // Calculate time to first search if we have a page load timestamp
      let timeToSearchMs: number | undefined
      if (typeof window !== 'undefined') {
        const pageLoadTime = sessionStorage.getItem('inkdex_page_load_time')
        if (pageLoadTime) {
          timeToSearchMs = Date.now() - parseInt(pageLoadTime, 10)
        }
      }

      trackSearchConversion({
        search_type: searchMetadata?.searchType,
        query_length: searchMetadata?.queryLength,
        result_count: totalCount,
        city_filter: filters.city || undefined,
        is_first_search: !hasSearchedBefore,
        time_to_search_ms: timeToSearchMs,
        search_id: searchId || undefined, // undefined for stateless searches
      })

      // Mark that user has searched
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('inkdex_has_searched', 'true')
      }
    }
  }, []) // Intentionally run once on mount - empty deps array is correct here

  return (
    <>
      {/* Artist Grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          {results.map((artist, index) => (
            <ArtistCard
              key={artist.artist_id}
              artist={artist}
              resultPosition={index + 1}
              searchId={searchId || undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-ink/60">No matching artists found</p>
          {(filters.city || filters.region) && (
            <p className="text-sm text-ink/40 mt-2">
              Try broadening your location filter
            </p>
          )}
        </div>
      )}

      {/* Infinite Scroll Loader */}
      <div ref={loaderRef} className="mt-8 flex justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-ink/40">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-mono">Loading more...</span>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={loadMore}
              className="mt-2 text-sm text-ink/60 hover:text-ink underline"
            >
              Try again
            </button>
          </div>
        )}

        {!hasMore && results.length > BATCH_SIZE && (
          <p className="text-sm font-mono text-ink/40">
            All {totalCount} artists loaded
          </p>
        )}
      </div>
    </>
  )
}
