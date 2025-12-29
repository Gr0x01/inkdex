import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArtistCard from '@/components/search/ArtistCard'
import CityFilter from '@/components/search/CityFilter'
import { SearchResultsResponse } from '@/types/search'

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

  // Build API URL
  const apiUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search/${id}`)
  if (city) apiUrl.searchParams.set('city', city)
  apiUrl.searchParams.set('page', currentPage.toString())
  apiUrl.searchParams.set('limit', limit.toString())

  // Fetch results
  let results: SearchResultsResponse
  try {
    const response = await fetch(apiUrl.toString(), {
      cache: 'no-store', // Always get fresh results for now
    })

    if (!response.ok) {
      if (response.status === 404) {
        notFound()
      }
      throw new Error(`Failed to fetch results: ${response.statusText}`)
    }

    results = await response.json()
  } catch (error) {
    console.error('Error fetching search results:', error)
    throw error
  }

  const { artists, total, queryType, queryText } = results
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
    <main className="min-h-screen bg-bg-primary relative noise-overlay">
      {/* Header */}
      <div className="bg-surface-low/80 border-b border-border-subtle backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Back Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-body text-sm font-medium text-text-secondary hover:text-accent-primary transition-colors duration-fast group"
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-fast"
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

            {/* City Filter */}
            <CityFilter />
          </div>

          {/* Query Type Indicator */}
          {queryType === 'text' && queryText && (
            <div className="mt-4 flex items-center gap-2 font-body text-sm text-text-secondary">
              <svg
                className="w-5 h-5 text-text-tertiary"
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
              <span>
                Searched for:{' '}
                <span className="font-medium text-text-primary">&ldquo;{queryText}&rdquo;</span>
              </span>
            </div>
          )}

          {queryType === 'image' && (
            <div className="mt-4 flex items-center gap-2 font-body text-sm text-text-secondary">
              <svg
                className="w-5 h-5 text-text-tertiary"
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
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        {hasResults ? (
          <>
            {/* Results Count */}
            <div className="mb-8 md:mb-12">
              <h1 className="font-display text-3xl md:text-4xl font-[800] text-text-primary mb-2">
                {total} {total === 1 ? 'Artist' : 'Artists'} Found
              </h1>
              <p className="font-body text-base text-text-secondary">
                Showing results ranked by style similarity
              </p>
            </div>

            {/* Artist Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12 stagger-fade-up">
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
                  <div className="px-6 py-2.5 bg-surface-mid/50 border border-border-subtle rounded-lg font-body text-sm font-medium text-text-tertiary uppercase tracking-wide cursor-not-allowed opacity-50">
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
                <span className="font-body text-sm text-text-secondary px-4">
                  Page <span className="text-text-primary font-medium">{currentPage}</span> of{' '}
                  <span className="text-text-primary font-medium">{totalPages}</span>
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
                  <div className="px-6 py-2.5 bg-surface-mid/50 border border-border-subtle rounded-lg font-body text-sm font-medium text-text-tertiary uppercase tracking-wide cursor-not-allowed opacity-50">
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-surface-mid mb-8">
              <svg
                className="w-10 h-10 text-text-tertiary"
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

            <h2 className="font-display text-3xl font-[800] text-text-primary mb-4">
              No Artists Found
            </h2>
            <p className="font-body text-base text-text-secondary mb-8 leading-relaxed">
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

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top gradient orb */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-primary opacity-5 rounded-full blur-3xl" />
        {/* Bottom gradient orb */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-secondary opacity-5 rounded-full blur-3xl" />
      </div>
    </main>
  )
}
