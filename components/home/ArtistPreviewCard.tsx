'use client'

import Link from 'next/link'
import type { FeaturedArtist } from '@/lib/mock/featured-data'
import { isArtistFeatured } from '@/lib/utils/featured'

interface ArtistPreviewCardProps {
  artist: FeaturedArtist
}

export default function ArtistPreviewCard({ artist }: ArtistPreviewCardProps) {
  const isVerified = artist.verification_status === 'verified'
  const isFeatured = isArtistFeatured(artist.portfolio_images)

  // Get first 4 portfolio images
  const portfolioImages = artist.portfolio_images.slice(0, 4)

  // Ensure we have exactly 4 images (fill with placeholders if needed)
  while (portfolioImages.length < 4) {
    portfolioImages.push({
      id: `placeholder-${portfolioImages.length}`,
      url: '/placeholder-tattoo.jpg', // You'll want to add a placeholder image
      likes_count: null,
    })
  }

  return (
    <Link
      href={`/artist/${artist.slug}`}
      className="group block relative overflow-hidden rounded-xl bg-surface-low border border-border-subtle hover:border-border-strong transition-all duration-medium lift-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      {/* Portfolio Preview Grid (2x2) */}
      <div className="portfolio-preview-grid relative">
        {portfolioImages.map((image, index) => (
          <div key={image.id} className="relative overflow-hidden bg-surface-mid">
            <img
              src={image.url}
              alt={`${artist.name}'s work ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}

        {/* Featured badge - Top-right corner */}
        {isFeatured && (
          <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-accent/90 backdrop-blur-sm border border-accent-bright/30 shadow-lg">
            <span className="font-mono text-[10px] font-bold text-paper tracking-[0.15em] uppercase">
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Glass Morphism Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 glass border-t border-border-subtle translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-medium ease-smooth">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Artist Name */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-base font-bold text-text-primary truncate">
                {artist.name}
              </h3>
              {isVerified && (
                <svg
                  className="w-4 h-4 text-accent-primary flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label="Verified artist"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Shop Name */}
            {artist.shop_name && (
              <p className="font-body text-tiny text-text-secondary truncate">
                {artist.shop_name}
              </p>
            )}
          </div>

          {/* Arrow Icon */}
          <svg
            className="w-5 h-5 text-accent-primary flex-shrink-0 group-hover:translate-x-1 transition-transform duration-medium"
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
      </div>
    </Link>
  )
}
