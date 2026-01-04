'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { SearchResult } from '@/types/search'
import { getImageUrl } from '@/lib/utils/images'
import { ProBadge } from '@/components/badges/ProBadge'
import { FeaturedBadge } from '@/components/badges/FeaturedBadge'

/**
 * Format follower count for display
 * Examples: 1234 -> "1.2K", 50000 -> "50K", 1500000 -> "1.5M"
 */
function formatFollowerCount(count: number): string {
  // Handle invalid input defensively
  if (count < 0 || !Number.isFinite(count)) {
    console.warn(`Invalid follower count: ${count}`)
    return '0'
  }

  // Handle billions (unlikely but defensive)
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  }

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return count.toString()
}

interface ArtistCardProps {
  artist: SearchResult
  displayMode?: 'search' | 'browse'
}

export default function ArtistCard({ artist, displayMode = 'search' }: ArtistCardProps) {
  const {
    artist_slug,
    artist_name,
    city,
    instagram_url,
    matching_images,
    similarity,
    follower_count,
    is_pro = false,
    is_featured = false,
  } = artist

  // Multi-location support using location_count from search results
  const locationCount = artist.location_count || 1
  const hasMultipleLocations = locationCount > 1

  // All available images
  const allImages = (matching_images || []).filter(img => img.url && img.instagramUrl)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentImage = allImages[currentIndex]

  // Tooltip state - shows after 2s hover
  const [showTooltip, setShowTooltip] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  // Extract Instagram handle from URL (just the username)
  const instagramHandle = instagram_url
    ? instagram_url.split('/').filter(Boolean).pop()
    : null

  // Convert boosted similarity (with Pro/Featured ranking boosts) to user-friendly percentage
  // Raw CLIP scores are 0.15-0.40, but Pro (+0.05) and Featured (+0.02) boost the display score
  // Rescale boosted range [0.15, 0.47] to [60%, 95%] for better user perception
  const rescaleToUserFriendlyPercentage = (clipScore: number): number => {
    const MIN_CLIP = 0.15  // Minimum search threshold
    const MAX_CLIP = 0.47  // Excellent match + max boosts (0.40 + 0.05 Pro + 0.02 Featured)
    const MIN_DISPLAY = 60 // Display minimum
    const MAX_DISPLAY = 95 // Display maximum

    // Clamp to expected range
    const clamped = Math.max(MIN_CLIP, Math.min(MAX_CLIP, clipScore))

    // Linear rescaling: map [0.15, 0.47] → [60, 95]
    const rescaled = MIN_DISPLAY + ((clamped - MIN_CLIP) / (MAX_CLIP - MIN_CLIP)) * (MAX_DISPLAY - MIN_DISPLAY)

    return Math.round(rescaled)
  }

  const matchPercentage = rescaleToUserFriendlyPercentage(similarity)

  const handleImageClick = (e: React.MouseEvent) => {
    if (allImages.length > 1) {
      e.preventDefault()
      setCurrentIndex((prev) => (prev + 1) % allImages.length)
    }
  }

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setShowTooltip(true)
    }, 2000) // 2s delay
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    setShowTooltip(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
    }
  }, [hoverTimeout])

  // Pro cards span 2 columns and use horizontal layout on desktop
  const isProLayout = is_pro && displayMode === 'search'

  return (
    <Link
      href={`/artist/${artist_slug}`}
      className={`group block bg-paper border-2 border-ink/20 overflow-hidden hover:border-ink hover:-translate-y-[3px] hover:shadow-md transition-all duration-fast ${
        isProLayout ? 'col-span-2' : ''
      }`}
    >
      <div className={isProLayout ? 'flex flex-row h-full gap-2 md:gap-4' : ''}>
        {/* Hero Image (tap to rotate) - Editorial */}
        {currentImage && (
          <div
            className={`relative overflow-hidden bg-gray-100 cursor-pointer ${
              isProLayout
                ? 'aspect-auto flex-1 h-auto'
                : 'aspect-square'
            }`}
            onClick={handleImageClick}
          >
            <Image
              src={getImageUrl(currentImage.url)}
              alt={`${artist_name} portfolio`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.01] transition-transform duration-slow"
            />

            {/* Featured badge on image - only for non-Pro (Pro shows in details) */}
            {is_featured && !is_pro && (
              <div className="absolute top-3 left-3">
                <FeaturedBadge variant="badge" />
              </div>
            )}

            {/* Image counter - Top-right */}
            {allImages.length > 1 && (
              <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-ink/80 backdrop-blur-sm">
                <span className="font-mono text-xs font-medium text-paper tracking-[0.1em] uppercase">
                  {currentIndex + 1}/{allImages.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Artist Info - Editorial Typography */}
        <div className={`${isProLayout ? 'flex-1 flex flex-col justify-between p-0 py-4 sm:py-6 px-1' : 'p-3 sm:p-4 space-y-1'}`}>
          {/* Pro layout - Editorial stats block */}
          {isProLayout ? (
            <>
              <div className="flex flex-col space-y-3 sm:space-y-5">
                {/* Pro badge and percentage row */}
                <div className="flex items-start justify-between gap-2">
                  <ProBadge variant="badge" size="sm" className="sm:hidden" />
                  <ProBadge variant="badge" size="md" className="hidden sm:block" />

                  {/* Match percentage - top right */}
                  {displayMode === 'search' && (
                    <div
                      className="relative flex-shrink-0 pr-2 sm:pr-4"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="font-mono text-xs sm:text-base font-semibold text-ink">
                        {matchPercentage}%
                      </span>

                      {/* Tooltip - appears after 2s hover */}
                      {showTooltip && (
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-ink text-paper text-xs font-body whitespace-nowrap rounded-sm shadow-lg z-10 animate-fade-in">
                          <div className="text-center">
                            How closely this artist&apos;s work
                            <br />
                            matches your search
                          </div>
                          {/* Arrow pointing down */}
                          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-ink" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Handle */}
                {instagramHandle && (
                  <h3 className="font-heading text-sm sm:text-base lg:text-xl font-bold text-ink tracking-tight truncate">
                    @{instagramHandle}
                  </h3>
                )}

                {/* Location */}
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[0.65rem] sm:text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-[0.15em]">
                    {city}
                  </p>
                  {hasMultipleLocations && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                      title={`Works in ${locationCount} locations`}
                    >
                      +{locationCount - 1}
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-ink/10" />

                {/* Featured artist label (if featured) */}
                {is_featured && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#8B7355] font-bold text-xs">+</span>
                    <span className="font-mono text-xs font-semibold text-[#8B7355] uppercase tracking-[0.15em]">
                      Featured Artist
                    </span>
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-ink/10" />
              </div>

              {/* Follower count - bottom */}
              {follower_count !== null && follower_count > 0 && (
                <p className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em] mt-auto">
                  {formatFollowerCount(follower_count)} followers
                </p>
              )}
            </>
          ) : (
            // Standard layout (non-Pro cards)
            <div className="space-y-1">
              {instagramHandle && (
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-base font-bold text-ink tracking-tight">
                    @{instagramHandle}
                  </h3>
                  {is_pro && <ProBadge variant="icon-only" size="sm" />}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em]">
                    {city}
                  </p>
                  {hasMultipleLocations && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                      title={`Works in ${locationCount} locations`}
                    >
                      +{locationCount - 1}
                    </span>
                  )}
                </div>
                {/* Right metric - Match % (search) or Follower count (browse) */}
                {displayMode === 'search' ? (
                  <div
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="font-mono text-xs font-semibold text-ink">
                      {matchPercentage}%
                    </span>

                    {/* Tooltip - appears after 2s hover */}
                    {showTooltip && (
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-ink text-paper text-xs font-body whitespace-nowrap rounded-sm shadow-lg z-10 animate-fade-in">
                        <div className="text-center">
                          How closely this artist&apos;s work
                          <br />
                          matches your search
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-ink" />
                      </div>
                    )}
                  </div>
                ) : (
                  follower_count !== null && follower_count > 0 && (
                    <span className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em]">
                      {formatFollowerCount(follower_count)}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
