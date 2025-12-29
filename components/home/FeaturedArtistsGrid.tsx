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
    <section className="container mx-auto px-4 py-12 md:py-16">
      {/* Section Header */}
      <div className="text-center mb-10 md:mb-12">
        <h2 className="font-display text-h2 font-[800] text-text-primary mb-3">
          Discover {city} Artists
        </h2>
        <p className="font-body text-small text-text-secondary max-w-2xl mx-auto">
          Explore portfolios from verified tattoo artists in your area
        </p>
      </div>

      {/* Artists Grid - Responsive: 2-col → 3-col → 4-col */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {artists.map((artist) => (
          <ArtistPreviewCard key={artist.id} artist={artist} />
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center mt-10 md:mt-12">
        <a
          href={cityHref}
          className="inline-flex items-center gap-2 font-body text-small font-medium text-accent-primary hover:text-accent-primary-hover transition-colors duration-fast uppercase tracking-wide group"
        >
          <span>View All {city} Artists</span>
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-medium"
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
    </section>
  )
}
