import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArtistCard from '@/components/search/ArtistCard'
import CityFilter from '@/components/search/CityFilter'
import { SearchResultsResponse } from '@/types/search'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsByEmbedding } from '@/lib/supabase/queries'
import { CITIES, STATES } from '@/lib/constants/cities'
import { getImageUrl } from '@/lib/utils/images'

interface SearchPageProps {
  searchParams: Promise<{
    id?: string
    city?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { id, city, page } = await searchParams

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

  // Parse location filter
  let cities: string[] | null = null
  if (city) {
    if (city.startsWith('state:')) {
      const stateSlug = city.replace('state:', '')
      const state = STATES.find(s => s.slug === stateSlug)
      cities = state ? (state.cities as unknown as string[]) : null
    } else {
      cities = [city]
    }
  }
  const cityFilter = cities && cities.length > 0 ? cities[0] : null

  // Search artists
  const startTime = Date.now()
  const rawResults = await searchArtistsByEmbedding(embedding, {
    city: cityFilter,
    limit,
    offset,
    threshold: 0.25,
  })
  const queryTime = Date.now() - startTime

  // Map results to expected format
  const artists = (Array.isArray(rawResults) ? rawResults : []).map((result: any) => ({
    artist_id: result.id,
    artist_name: result.name,
    artist_slug: result.slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    matching_images: (result.images || []).map((img: any) => ({
      url: getImageUrl(img.url),
      instagramUrl: img.instagramUrl,
      similarity: img.similarity,
    })),
    similarity: result.max_similarity || 0,
  }))

  // Extract results for rendering
  const total = artists.length
  const queryType = search.query_type
  const queryText = search.query_text
  const hasResults = artists.length > 0
  const totalPages = Math.ceil(total / limit)

  // Build pagination URLs with proper sanitization
  const buildSearchUrl = (pageNum: number) => {
    const params = new URLSearchParams({ id })
    if (city) params.set('city', city)
    params.set('page', pageNum.toString())
    return `/search?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-light">
      {/* COMPACT SINGLE-LINE HEADER */}
      <div className="bg-white/90 border-b border-gray-200 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            {/* Left Section: Back Button + Query Info */}
            <div className="flex items-center gap-6 flex-1 min-w-0">
              {/* Back Link */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-mono text-xs font-medium text-gray-600 hover:text-ink transition-colors duration-fast group flex-shrink-0 uppercase tracking-wider"
              >
                <svg
                  className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-fast"
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
                <span>New Search</span>
              </Link>

              {/* Query Info - Inline */}
              {queryType === 'text' && queryText && (
                <div className="flex items-center gap-2 font-body text-sm text-gray-600 min-w-0">
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                    Searched for: <span className="font-medium text-ink">&ldquo;{queryText}&rdquo;</span>
                  </span>
                </div>
              )}

              {queryType === 'image' && (
                <div className="flex items-center gap-2 font-body text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
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
              )}
            </div>

            {/* Right Section: Results Count + Location Filter */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Results Count - Compact */}
              <div className="font-mono text-xs font-medium text-gray-700 uppercase tracking-wider">
                {total} {total === 1 ? 'Artist' : 'Artists'} Found
              </div>

              {/* City Filter */}
              <CityFilter />
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS GRID - Starts Immediately */}
      <div className="container mx-auto px-6 py-8">
        {hasResults ? (
          <>
            {/* Artist Grid */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-12">
              {artists.map((artist) => (
                <ArtistCard key={artist.artist_id} artist={artist} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {/* Previous Button */}
                {currentPage > 1 ? (
                  <Link
                    href={buildSearchUrl(currentPage - 1)}
                    className="btn btn-secondary py-2.5"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </Link>
                ) : (
                  <div className="px-6 py-2.5 bg-gray-100 border border-gray-200 rounded-lg font-mono text-xs font-medium text-gray-400 uppercase tracking-wide cursor-not-allowed opacity-50">
                    <svg
                      className="w-4 h-4 inline-block mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </div>
                )}

                {/* Page Indicator */}
                <span className="font-body text-sm text-gray-600 px-4">
                  Page <span className="text-ink font-medium">{currentPage}</span> of{' '}
                  <span className="text-ink font-medium">{totalPages}</span>
                </span>

                {/* Next Button */}
                {currentPage < totalPages ? (
                  <Link
                    href={buildSearchUrl(currentPage + 1)}
                    className="btn btn-secondary py-2.5"
                  >
                    Next
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ) : (
                  <div className="px-6 py-2.5 bg-gray-100 border border-gray-200 rounded-lg font-mono text-xs font-medium text-gray-400 uppercase tracking-wide cursor-not-allowed opacity-50">
                    Next
                    <svg
                      className="w-4 h-4 inline-block ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
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
