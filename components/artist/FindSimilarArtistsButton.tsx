'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FindSimilarArtistsButtonProps {
  artistId: string
  artistName: string
  city: string
}

export default function FindSimilarArtistsButton({
  artistId,
  artistName,
  city,
}: FindSimilarArtistsButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCityFilter, setUseCityFilter] = useState(true)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'similar_artist',
          artist_id: artistId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create search')
      }

      const { searchId } = await response.json()

      // Navigate with optional city filter
      const params = new URLSearchParams({ id: searchId })
      if (useCityFilter) {
        params.set('city', city.toLowerCase().replace(/\s+/g, '-'))
      }

      router.push(`/search?${params.toString()}`)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Main Button */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="block w-full py-3 px-5 bg-transparent text-ink text-center font-mono text-[0.6875rem] font-[600] tracking-[0.15em] uppercase transition-all duration-medium hover:bg-gray-100 border-2 border-ink disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            Searching...
          </span>
        ) : (
          'Find Similar Artists →'
        )}
      </button>

      {/* City Toggle */}
      <button
        onClick={() => setUseCityFilter(!useCityFilter)}
        className="w-full text-center font-body text-[0.75rem] text-gray-500 hover:text-ink transition-colors duration-fast"
      >
        {useCityFilter ? (
          <span>
            Searching in {city} only •{' '}
            <span className="underline">Search all cities</span>
          </span>
        ) : (
          <span>
            Searching all cities •{' '}
            <span className="underline">Search {city} only</span>
          </span>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="text-center">
          <p className="font-body text-[0.75rem] text-error">{error}</p>
        </div>
      )}
    </div>
  )
}
