/* eslint-disable @typescript-eslint/no-explicit-any -- Search result types vary */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LocationFilter from '@/components/search/LocationFilter'
import ClearFiltersButton from '@/components/search/ClearFiltersButton'
import { StickyFilterBar } from '@/components/search/StickyFilterBar'
import SearchResultsGrid from '@/components/search/SearchResultsGrid'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsWithStyleBoost } from '@/lib/supabase/queries'
import type { StyleMatch } from '@/lib/search/style-classifier'
import { getImageUrl } from '@/lib/utils/images'
import { slugToName } from '@/lib/utils/location'
import type { SearchResult, SearchedArtistData } from '@/types/search'

interface SearchPageProps {
  searchParams: Promise<{
    id?: string
    country?: string
    region?: string
    city?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { id, country, region, city } = await searchParams

  // Require search ID
  if (!id) {
    notFound()
  }

  // Initial page load - fetch first batch
  const limit = 20

  // Fetch search from database (direct access, no HTTP request)
  const supabase = await createClient()

  const { data: search, error: searchError } = await supabase
    .from('searches')
    .select('*')
    .eq('id', id)
    .single()

  if (searchError || !search) {
    notFound()
  }

  // Parse embedding
  let embedding: number[]
  try {
    embedding = JSON.parse(search.embedding)
  } catch (error) {
    console.error('Failed to parse embedding:', error)
    throw new Error('Invalid embedding format')
  }

  // Parse detected styles for style-weighted search
  let detectedStyles: StyleMatch[] | null = null
  if (search.detected_styles) {
    try {
      detectedStyles = typeof search.detected_styles === 'string'
        ? JSON.parse(search.detected_styles)
        : search.detected_styles
    } catch (error) {
      console.error('Failed to parse detected_styles:', error)
      // Continue without style weighting
    }
  }

  // Get is_color for color-weighted search
  const isColorQuery: boolean | null = search.is_color ?? null

  // Extract artist_id_source for exclusion (similar_artist searches)
  const excludeArtistId = search.artist_id_source || null

  // Get search type and searched artist data (for profile searches)
  const searchType = search.query_type as string
  const searchedArtistData = search.searched_artist as SearchedArtistData | null
  const queryText = search.query_text as string | null
  const instagramUsername = search.instagram_username as string | null
  const instagramPostId = search.instagram_post_id as string | null

  // Parse location filters - convert slugs to proper format for DB query
  const countryFilter = country?.toUpperCase() || null
  const regionFilter = region?.toUpperCase() || null
  // Convert city slug to name using centralized utility
  const cityFilter = city ? slugToName(city) : null

  // Search artists with style and color weighted ranking (first batch only)
  const { artists: rawResults, totalCount } = await searchArtistsWithStyleBoost(embedding, {
    country: countryFilter,
    region: regionFilter,
    city: cityFilter,
    limit,
    offset: 0,
    threshold: 0.15,
    queryStyles: detectedStyles,
    isColorQuery,
  })

  // Map results to SearchResult format
  const allResults: SearchResult[] = (Array.isArray(rawResults) ? rawResults : []).map((result: any) => ({
    artist_id: result.id,
    artist_name: result.name,
    artist_slug: result.slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count || null,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    is_pro: result.is_pro ?? false,
    is_featured: result.is_featured ?? false,
    max_likes: result.max_likes || 0,
    matching_images: (result.images || []).map((img: any) => ({
      url: getImageUrl(img.url),
      instagramUrl: img.instagramUrl,
      similarity: img.similarity,
      likes_count: img.likes_count || null,
    })),
    similarity: result.boosted_score || result.max_similarity || 0,
    location_count: result.location_count,
  }))

  // Handle artist filtering and ordering based on search type
  let artists: SearchResult[]

  if (searchType === 'similar_artist' && excludeArtistId) {
    // For similar_artist searches: exclude the source artist
    artists = allResults.filter(artist => artist.artist_id !== excludeArtistId)
  } else if (searchType === 'instagram_profile' && searchedArtistData) {
    // For instagram_profile searches: show searched artist FIRST
    // Remove from results if present (to avoid duplicate)
    const filteredResults = searchedArtistData.id
      ? allResults.filter(artist => artist.artist_id !== searchedArtistData.id)
      : allResults

    // Build the searched artist card
    const searchedArtistCard: SearchResult = {
      artist_id: searchedArtistData.id || `pending-${searchedArtistData.instagram_handle}`,
      artist_name: searchedArtistData.name,
      artist_slug: searchedArtistData.instagram_handle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      city: searchedArtistData.city,
      profile_image_url: searchedArtistData.profile_image_url,
      follower_count: searchedArtistData.follower_count,
      instagram_url: `https://instagram.com/${searchedArtistData.instagram_handle}`,
      is_verified: searchedArtistData.is_verified ?? false,
      is_pro: searchedArtistData.is_pro ?? false,
      is_featured: searchedArtistData.is_featured ?? false,
      max_likes: 0,  // Not displayed in UI
      matching_images: searchedArtistData.images.map(url => ({
        url: getImageUrl(url),
        similarity: 1.0,  // Perfect match - it's their own work
      })),
      similarity: 1.0,
      is_searched_artist: true,  // Flag for special styling
    }

    // Prepend searched artist
    artists = [searchedArtistCard, ...filteredResults]
  } else {
    artists = allResults
  }

  // Track search appearances with details (fire-and-forget)
  // Exclude searched artist from tracking if it's a pending artist (not in DB yet)
  const trackableArtists = artists.filter(a => !a.artist_id.startsWith('pending-'))
  if (trackableArtists.length > 0) {
    void (async () => {
      try {
        const appearancesData = trackableArtists.map((artist, index) => ({
          artist_id: artist.artist_id,
          rank: index + 1,
          similarity: artist.similarity,
          boosted_score: artist.similarity,
          image_count: artist.matching_images?.length || 3
        }))

        await supabase.rpc('track_search_appearances_with_details', {
          p_search_id: id,
          p_appearances: appearancesData
        })
      } catch (err) {
        console.error('[Search] Tracking failed:', err)
      }
    })()
  }

  // Adjust total count if we added a searched artist
  const displayTotalCount = searchedArtistData ? totalCount + 1 : totalCount

  return (
    <main className="min-h-screen bg-light">
      {/* COMPACT EDITORIAL FILTER BAR - Mobile Optimized */}
      <StickyFilterBar>
        <div className="w-full px-3 md:px-4 md:container md:mx-auto md:px-6">
          <div className="flex items-center gap-1.5 md:gap-4 h-12 md:h-14 overflow-visible">
            {/* Back Link - Mobile Friendly */}
            <Link
              href="/"
              className="inline-flex items-center gap-1 md:gap-1.5 font-mono text-[10px] md:text-xs font-medium text-ink/60 hover:text-ink transition-colors duration-fast group shrink-0 uppercase tracking-[0.15em]"
            >
              <svg
                className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 group-hover:-translate-x-0.5 transition-transform duration-fast"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New
            </Link>

            {/* Separator */}
            <div className="w-px h-4 md:h-5 bg-ink/10 shrink-0" />

            {/* Query Info - Desktop Only */}
            {searchType === 'text' && queryText && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0 flex-1">
                  <svg
                    className="w-3.5 h-3.5 text-ink/30 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="truncate">
                    &ldquo;{queryText}&rdquo;
                  </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-ink/10" aria-hidden="true" />
              </>
            )}

            {searchType === 'image' && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 flex-1">
                  <svg
                    className="w-3.5 h-3.5 text-ink/30 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Image search</span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-ink/10 shrink-0" aria-hidden="true" />
              </>
            )}

            {searchType === 'instagram_post' && instagramUsername && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0 flex-1">
                  <div className="shrink-0 w-3.5 h-3.5 bg-linear-to-r from-purple-500 to-pink-500 rounded-sm" aria-hidden="true" />
                  <span className="truncate">
                    Post by{' '}
                    {instagramPostId ? (
                      <a
                        href={`https://instagram.com/p/${instagramPostId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body-medium text-ink hover:text-purple-600 transition-colors"
                      >
                        @{instagramUsername}
                      </a>
                    ) : (
                      <span className="font-body-medium text-ink">@{instagramUsername}</span>
                    )}
                  </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-ink/10 shrink-0" aria-hidden="true" />
              </>
            )}

            {searchType === 'instagram_profile' && instagramUsername && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0 flex-1">
                  <div className="shrink-0 w-3.5 h-3.5 bg-linear-to-r from-purple-500 to-pink-500 rounded-sm" aria-hidden="true" />
                  <span className="truncate">
                    Similar to{' '}
                    <a
                      href={`https://instagram.com/${instagramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body-medium text-ink hover:text-purple-600 transition-colors"
                    >
                      @{instagramUsername}
                    </a>
                  </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-ink/10 shrink-0" aria-hidden="true" />
              </>
            )}

            {/* Spacer on mobile (when query info is hidden) */}
            <div className="flex-1 sm:hidden" />

            {/* Location Filter - Right aligned */}
            <div className="overflow-visible shrink-0 flex items-center gap-2">
              <ClearFiltersButton />
              <ErrorBoundary fallback={<div className="text-xs text-ink/40">Filter unavailable</div>}>
                <LocationFilter searchId={id} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </StickyFilterBar>

      {/* CONTENT */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Results count */}
        <div className="mb-6">
          <p className="text-sm font-mono text-ink/60">
            {displayTotalCount} {displayTotalCount === 1 ? 'artist' : 'artists'} found
            {cityFilter && ` in ${cityFilter}`}
            {!cityFilter && regionFilter && ` in ${regionFilter}`}
            {!cityFilter && !regionFilter && countryFilter && ` in ${countryFilter}`}
          </p>
        </div>

        {/* Artist Grid with Infinite Scroll */}
        <SearchResultsGrid
          searchId={id}
          initialResults={artists}
          totalCount={displayTotalCount}
          filters={{
            country: country || null,
            region: region || null,
            city: city || null,
          }}
          excludeArtistId={excludeArtistId}
          searchedArtistId={searchedArtistData?.id || null}
          searchMetadata={{
            searchType: searchType as 'image' | 'text' | 'instagram_post' | 'instagram_profile' | 'similar_artist',
            queryLength: queryText?.length,
          }}
        />
      </div>
    </main>
  )
}
