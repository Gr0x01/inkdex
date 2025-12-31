'use client'

import Link from 'next/link'
import CompactArtistCard from './CompactArtistCard'
import type { FeaturedArtist } from '@/lib/mock/featured-data'
import type { State } from '@/lib/constants/cities'

interface FeaturedArtistsByStateProps {
  state: State
  artists: (FeaturedArtist & { city: string; state: string })[]
}

export default function FeaturedArtistsByState({
  state,
  artists,
}: FeaturedArtistsByStateProps) {
  // Don't render if no artists for this state
  if (!artists || artists.length === 0) {
    return null
  }

  // Compute state browse URL
  const stateUrl = `/${state.slug}`

  return (
    <div className="space-y-4">
      {/* State Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          {/* State Label */}
          <p className="font-mono text-[10px] text-gray-500 tracking-[0.3em] uppercase mb-1">
            {state.code}
          </p>
          {/* State Name */}
          <h2 className="font-heading text-[28px] md:text-[32px] text-ink leading-tight">
            {state.name}
          </h2>
        </div>

        {/* View All Link */}
        <Link
          href={stateUrl}
          className="font-mono text-[11px] text-gray-700 hover:text-ink transition-colors duration-300 uppercase tracking-[0.2em] group flex items-center gap-1.5 flex-shrink-0"
        >
          <span>View All</span>
          <svg
            className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300"
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
      </div>

      {/* Artist Cards - Horizontal Scroll */}
      <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
        <div
          className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {artists.map((artist) => (
            <CompactArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </div>
    </div>
  )
}
