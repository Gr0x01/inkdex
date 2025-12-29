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

  const { results: artists, total, queryType, queryText } = results
  const hasResults = artists.length > 0
  const totalPages = Math.ceil(total / limit)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Back Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
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
              <span className="font-medium">New Search</span>
            </Link>

            {/* City Filter */}
            <CityFilter />
          </div>

          {/* Query Type Indicator */}
          {queryType === 'text' && queryText && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 text-gray-400"
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
              <span className="text-gray-600">
                Searched for:{' '}
                <span className="font-medium text-gray-900">&ldquo;{queryText}&rdquo;</span>
              </span>
            </div>
          )}

          {queryType === 'image' && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 text-gray-400"
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
              <span className="text-gray-600">Image search</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {hasResults ? (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {total} {total === 1 ? 'Artist' : 'Artists'} Found
              </h1>
              <p className="text-gray-600 mt-1">
                Showing results ranked by style similarity
              </p>
            </div>

            {/* Artist Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
              {artists.map((artist) => (
                <ArtistCard key={artist.artist_id} artist={artist} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                {/* Previous Button */}
                {currentPage > 1 ? (
                  <Link
                    href={`/search?id=${id}${city ? `&city=${city}` : ''}&page=${currentPage - 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg font-medium text-gray-400 cursor-not-allowed">
                    ← Previous
                  </div>
                )}

                {/* Page Indicator */}
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                {/* Next Button */}
                {currentPage < totalPages ? (
                  <Link
                    href={`/search?id=${id}${city ? `&city=${city}` : ''}&page=${currentPage + 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Next →
                  </Link>
                ) : (
                  <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg font-medium text-gray-400 cursor-not-allowed">
                    Next →
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Empty State
          <div className="max-w-md mx-auto text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
              <svg
                className="w-8 h-8 text-gray-400"
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

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              No Artists Found
            </h2>
            <p className="text-gray-600 mb-8">
              We couldn&apos;t find any artists matching your search.
              {city && ' Try expanding your search to all cities.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {city && (
                <Link
                  href={`/search?id=${id}`}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  View All Cities
                </Link>
              )}
              <Link
                href="/"
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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
