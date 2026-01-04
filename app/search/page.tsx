/* eslint-disable @typescript-eslint/no-explicit-any -- Search result types vary */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArtistCard from '@/components/search/ArtistCard'
import LocationFilter from '@/components/search/LocationFilter'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { generatePageNumbers } from '@/components/pagination/Pagination'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsWithCount } from '@/lib/supabase/queries'
import { getImageUrl } from '@/lib/utils/images'
import { slugToName } from '@/lib/utils/location'

interface SearchPageProps {
  searchParams: Promise<{
    id?: string
    country?: string
    region?: string
    city?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { id, country, region, city, page } = await searchParams

  // Require search ID
  if (!id) {
    notFound()
  }

  // Parse pagination
  const currentPage = parseInt(page || '1', 10)
  const limit = 20
  const offset = (currentPage - 1) * limit

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

  // Extract artist_id_source for exclusion (similar_artist searches)
  const excludeArtistId = search.artist_id_source || null

  // Parse location filters - convert slugs to proper format for DB query
  const countryFilter = country?.toUpperCase() || null
  const regionFilter = region?.toUpperCase() || null
  // Convert city slug to name using centralized utility
  const cityFilter = city ? slugToName(city) : null

  // Search artists with count (single combined query)
  const { artists: rawResults, totalCount } = await searchArtistsWithCount(embedding, {
    country: countryFilter,
    region: regionFilter,
    city: cityFilter,
    limit,
    offset,
    threshold: 0.15,
  })

  // Map results to expected format
  const allResults = (Array.isArray(rawResults) ? rawResults : []).map((result: any) => ({
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
    similarity: result.max_similarity || 0,
    location_count: result.location_count,
  }))

  // Exclude source artist for similar_artist searches
  const artists = excludeArtistId
    ? allResults.filter(artist => artist.artist_id !== excludeArtistId)
    : allResults

  // Track search appearances (fire-and-forget)
  const artistIds = artists.map(a => a.artist_id)
  if (artistIds.length > 0) {
    // Fire-and-forget with error logging
    void (async () => {
      try {
        await supabase.rpc('increment_search_appearances', { p_artist_ids: artistIds })
      } catch (err) {
        console.error('[Search] Tracking failed:', err)
      }
    })()
  }

  // Extract results for rendering
  const total = totalCount  // ✓ FIXED: Use total count from count query
  const queryType = search.query_type
  const queryText = search.query_text
  const instagramUsername = search.instagram_username
  const instagramPostId = search.instagram_post_id
  const hasResults = artists.length > 0
  const totalPages = Math.ceil(total / limit)  // ✓ FIXED: Now calculates correctly

  // Build pagination URLs with proper sanitization
  const buildSearchUrl = (pageNum: number) => {
    const params = new URLSearchParams({ id })
    if (country) params.set('country', country)
    if (region) params.set('region', region)
    if (city) params.set('city', city)
    params.set('page', pageNum.toString())
    return `/search?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-light">
      {/* COMPACT EDITORIAL FILTER BAR - Mobile Optimized */}
      <div className="sticky top-0 z-40 bg-[#F8F7F5] backdrop-blur-md border-b border-ink/10 shadow-sm">
        <div className="w-full px-3 md:px-4 md:container md:mx-auto md:px-6">
          <div className="flex items-center gap-1.5 md:gap-4 h-12 md:h-14 overflow-x-auto scrollbar-hide">
            {/* Back Link - Mobile Friendly */}
            <Link
              href="/"
              className="inline-flex items-center gap-1 md:gap-1.5 font-mono text-[10px] md:text-xs font-medium text-ink/60 hover:text-ink transition-colors duration-fast group flex-shrink-0 uppercase tracking-[0.15em]"
            >
              <svg
                className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 group-hover:-translate-x-0.5 transition-transform duration-fast"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>New</span>
            </Link>

            {/* Vertical Divider */}
            <div className="h-3 md:h-4 w-px bg-ink/10 flex-shrink-0" aria-hidden="true" />

            {/* Query Info - Mobile Responsive */}
            {queryType === 'text' && queryText && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0 flex-1">
                  <svg
                    className="w-3.5 h-3.5 text-ink/30 flex-shrink-0"
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
                    Searched for: <span className="font-body-medium text-ink">&ldquo;{queryText}&rdquo;</span>
                  </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-ink/10" aria-hidden="true" />
              </>
            )}

            {queryType === 'image' && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60">
                  <svg
                    className="w-3.5 h-3.5 text-ink/30 flex-shrink-0"
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
                <div className="hidden sm:block h-4 w-px bg-ink/10 flex-shrink-0" aria-hidden="true" />
              </>
            )}

            {queryType === 'instagram_post' && instagramUsername && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0">
                  <div className="flex-shrink-0 w-3.5 h-3.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-sm" aria-hidden="true" />
                  <span className="truncate">
                    Instagram post by{' '}
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
                <div className="hidden sm:block h-4 w-px bg-ink/10 flex-shrink-0" aria-hidden="true" />
              </>
            )}

            {queryType === 'instagram_profile' && instagramUsername && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0">
                  <div className="flex-shrink-0 w-3.5 h-3.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-sm" aria-hidden="true" />
                  <span className="truncate">
                    Artists similar to{' '}
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
                <div className="hidden sm:block h-4 w-px bg-ink/10 flex-shrink-0" aria-hidden="true" />
              </>
            )}

            {queryType === 'similar_artist' && queryText && (
              <>
                <div className="hidden sm:flex items-center gap-2 font-body text-sm text-ink/60 min-w-0">
                  <svg
                    className="w-3.5 h-3.5 text-ink/30 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="truncate">{queryText}</span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-ink/10 flex-shrink-0" aria-hidden="true" />
              </>
            )}

            {/* Results Count - Desktop Only */}
            <div className="hidden md:block font-mono text-xs font-medium text-ink/70 uppercase tracking-[0.15em] whitespace-nowrap flex-shrink-0">
              {total} {total === 1 ? 'Artist' : 'Artists'}
            </div>

            {/* Vertical Divider - Desktop Only */}
            <div className="hidden md:block h-4 w-px bg-ink/10 flex-shrink-0" aria-hidden="true" />

            {/* City Filter - Mobile Optimized */}
            <div className="flex-shrink-0 ml-auto">
              <ErrorBoundary>
                <LocationFilter />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS GRID - Mobile Optimized */}
      <div className="w-full px-4 md:container md:mx-auto md:px-6 pt-4 md:pt-8 lg:pt-16 pb-6 md:pb-12">
        {hasResults ? (
          <>
            {/* Artist Grid - Unified, sorted by match percentage */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 mb-12">
              {artists.map((artist) => (
                <ArtistCard key={artist.artist_id} artist={artist} />
              ))}
            </div>

            {/* Pagination - Editorial Magazine Style */}
            {totalPages > 1 && (
              <nav
                className="flex items-center justify-center gap-3 flex-wrap mt-16"
                role="navigation"
                aria-label="Search results pagination"
              >
                {/* Previous Button - Editorial */}
                {currentPage > 1 ? (
                  <Link
                    href={buildSearchUrl(currentPage - 1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-base text-ink border-2 border-ink/20 hover:border-ink hover:-translate-y-[2px] hover:shadow-md transition-all duration-fast group"
                    aria-label="Go to previous page"
                  >
                    <svg
                      className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-fast"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span>Previous</span>
                  </Link>
                ) : (
                  <div
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-base text-gray-400 border-2 border-gray-200 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span>Previous</span>
                  </div>
                )}

                {/* Numbered Page Buttons - Clean Editorial */}
                <div className="flex items-center gap-1.5">
                  {generatePageNumbers(currentPage, totalPages).map((pageNum, index) => {
                    if (pageNum === '...') {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 font-body text-lg text-gray-500"
                          aria-hidden="true"
                        >
                          &hellip;
                        </span>
                      )
                    }

                    const page = pageNum as number
                    const isActive = page === currentPage

                    return (
                      <Link
                        key={page}
                        href={buildSearchUrl(page)}
                        className={`
                          min-w-[44px] h-[44px] flex items-center justify-center
                          font-body text-[17px] font-medium
                          border-2 transition-all duration-fast
                          ${isActive
                            ? 'bg-ink border-ink text-paper shadow-sm cursor-default'
                            : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-[2px] hover:shadow-md'
                          }
                        `}
                        aria-label={`Go to page ${page}`}
                        aria-current={isActive ? 'page' : undefined}
                        tabIndex={isActive ? -1 : 0}
                      >
                        {page}
                      </Link>
                    )
                  })}
                </div>

                {/* Next Button - Editorial */}
                {currentPage < totalPages ? (
                  <Link
                    href={buildSearchUrl(currentPage + 1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-base text-ink border-2 border-ink/20 hover:border-ink hover:-translate-y-[2px] hover:shadow-md transition-all duration-fast group"
                    aria-label="Go to next page"
                  >
                    <span>Next</span>
                    <svg
                      className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-fast"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ) : (
                  <div
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-base text-gray-400 border-2 border-gray-200 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <span>Next</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </nav>
            )}
          </>
        ) : (
          // Empty State
          <div className="max-w-md mx-auto text-center py-16 md:py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gray-100 mb-8">
              <svg
                className="w-10 h-10 text-gray-400"
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
            </div>

            <h2 className="font-heading text-3xl font-bold text-ink mb-4">
              No Artists Found
            </h2>
            <p className="font-body text-base text-gray-600 mb-8 leading-relaxed">
              We couldn&apos;t find any artists matching your search.
              {city && ' Try expanding your search to all cities.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {city && (
                <Link
                  href={buildSearchUrl(1)}
                  className="btn btn-primary py-3 px-6"
                >
                  View All Cities
                </Link>
              )}
              <Link
                href="/"
                className="btn btn-secondary py-3 px-6"
              >
                New Search
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
