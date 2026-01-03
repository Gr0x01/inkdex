import ArtistPreviewCard from './ArtistPreviewCard'
import type { FeaturedArtist } from '@/lib/mock/featured-data'
import { CITIES, STATES } from '@/lib/constants/cities'

interface FeaturedArtistsGridProps {
  artists: FeaturedArtist[]
  city: string
}

export default function FeaturedArtistsGrid({ artists, city }: FeaturedArtistsGridProps) {
  // Don't render if no artists
  if (artists.length === 0) {
    return null
  }

  // Compute city browse page URL from constants
  const cityData = CITIES.find(c => c.name === city)
  const stateData = STATES.find(s => s.code === cityData?.state)
  const cityHref = stateData && cityData ? `/${stateData.slug}/${cityData.slug}` : '/texas'

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="text-center mb-12 md:mb-16">
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="h-px w-12 bg-gray-700"></div>
          <h2 className="font-mono text-tiny text-gray-500 tracking-[0.3em] uppercase">
            {city}
          </h2>
          <div className="h-px w-12 bg-gray-700"></div>
        </div>
        <h2 className="font-heading text-h2 text-white mb-4">
          Featured Artists
        </h2>
        <p className="font-body text-base text-gray-400 max-w-2xl mx-auto">
          Explore portfolios from verified tattoo artists
        </p>
      </div>

      {/* Artists Grid - Responsive: 1-col → 2-col → 3-col */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
        {artists.map((artist) => (
          <ArtistPreviewCard key={artist.id} artist={artist} />
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center mt-12 md:mt-16">
        <a
          href={cityHref}
          className="inline-flex items-center gap-2 font-mono text-tiny font-medium text-gray-400 hover:text-white transition-colors duration-300 uppercase tracking-[0.2em] group"
        >
          <span>View All Artists</span>
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
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
        </a>
      </div>
    </div>
  )
}
