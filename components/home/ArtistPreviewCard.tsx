'use client'

import Link from 'next/link'
import type { FeaturedArtist } from '@/lib/mock/featured-data'
import { isArtistFeatured } from '@/lib/utils/featured'

interface ArtistPreviewCardProps {
  artist: FeaturedArtist
}

export default function ArtistPreviewCard({ artist }: ArtistPreviewCardProps) {
  const isVerified = artist.verification_status === 'verified'
  const isFeatured = isArtistFeatured(artist.follower_count)

  // Get first 4 portfolio images
  const portfolioImages = artist.portfolio_images.slice(0, 4)

  // Ensure we have exactly 4 images (fill with placeholders if needed)
  while (portfolioImages.length < 4) {
    portfolioImages.push({
      id: `placeholder-${portfolioImages.length}`,
      url: '/placeholder-tattoo.jpg',
      likes_count: null,
    })
  }

  return (
    <Link
      href={`/artist/${artist.slug}`}
      className="group block relative overflow-hidden rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-600 transition-all duration-300 lift-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      {/* Portfolio Preview Grid (2x2) */}
      <div className="portfolio-preview-grid relative">
        {portfolioImages.map((image, index) => (
          <div key={image.id} className="relative overflow-hidden bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`${artist.name}'s work ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Note: Using img for simplicity in grid layout - images already optimized in storage */}
          </div>
        ))}
      </div>

      {/* Glass Morphism Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent border-t border-gray-800/50 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Artist Name */}
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-heading text-sm font-bold text-white truncate">
                {artist.name}
              </h3>
              {isVerified && (
                <svg
                  className="w-3.5 h-3.5 text-white flex-shrink-0"
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
              <p className="font-mono text-xs font-medium text-gray-400 truncate tracking-wider uppercase">
                {artist.shop_name}
              </p>
            )}
          </div>

          {/* Arrow Icon */}
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-white flex-shrink-0 group-hover:translate-x-1 transition-all duration-300"
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
