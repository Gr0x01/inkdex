'use client'

import Link from 'next/link'
import type { FeaturedArtist } from '@/lib/mock/featured-data'
import { ProBadge } from '@/components/badges/ProBadge'
import { sanitizeText } from '@/lib/utils/sanitize'

interface CompactArtistCardProps {
  artist: FeaturedArtist & { city: string; state: string }
}

export default function CompactArtistCard({ artist }: CompactArtistCardProps) {
  // Get hero image (highest engagement)
  const heroImage = artist.portfolio_images.reduce((prev, current) => {
    const prevLikes = prev.likes_count || 0
    const currentLikes = current.likes_count || 0
    return currentLikes > prevLikes ? current : prev
  }, artist.portfolio_images[0])

  // Artist profile URL - flat structure (artists can move cities/states)
  const artistUrl = `/artist/${artist.slug}`

  return (
    <Link
      href={artistUrl}
      className="group block relative flex-shrink-0 w-[180px] md:w-[200px] lg:w-[220px] snap-start"
    >
      <div className="relative overflow-hidden rounded-lg bg-gray-900 border border-gray-300 hover:border-gray-500 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20">
        {/* Hero Image - Portrait Aspect Ratio */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage.url}
          alt={`${artist.name}'s work`}
          className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Artist Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Artist Name with Pro Badge */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-heading text-sm font-semibold text-white truncate leading-tight">
              {artist.name}
            </h3>
            {artist.is_pro && <ProBadge variant="icon-only" size="sm" />}
          </div>

          {/* Shop Name */}
          {artist.shop_name && (
            <p className="font-mono text-xs font-medium text-gray-400 truncate tracking-wider uppercase">
              {sanitizeText(artist.shop_name)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
