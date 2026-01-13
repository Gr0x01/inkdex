'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { SearchResult } from '@/types/search'
import { getImageUrl } from '@/lib/utils/images'
import { ProBadge } from '@/components/badges/ProBadge'
import { FeaturedBadge } from '@/components/badges/FeaturedBadge'
import { capturePostHog } from '@/lib/analytics/posthog'
import { EVENTS } from '@/lib/analytics/events'

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
  /** Position in search results (1-indexed) for analytics */
  resultPosition?: number
  /** Search ID for linking click to search */
  searchId?: string
}

export default function ArtistCard({
  artist,
  displayMode = 'search',
  resultPosition,
  searchId,
}: ArtistCardProps) {
  const {
    artist_id,
    artist_slug,
    artist_name,
    city,
    instagram_url,
    matching_images,
    similarity,
    follower_count,
    profile_image_url,
    is_pro = false,
    is_featured = false,
    is_searched_artist = false,
  } = artist

  // Track click on artist card
  const handleCardClick = () => {
    if (displayMode === 'search' && resultPosition !== undefined) {
      capturePostHog(EVENTS.SEARCH_RESULT_CLICKED, {
        artist_id,
        artist_slug,
        result_position: resultPosition,
        search_id: searchId,
      })
    }
  }

  // Check if this is a pending artist (not yet fully in DB)
  const isPending = artist_id.startsWith('pending-')

  // Multi-location support using location_count from search results
  const locationCount = artist.location_count || 1
  const hasMultipleLocations = locationCount > 1

  // All available images (for searched artist, images may not have instagramUrl yet)
  const allImages = (matching_images || []).filter(img => img.url)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentImage = allImages[currentIndex]

  // Profile image error state - hide if load fails
  const [profileImageError, setProfileImageError] = useState(false)

  // Tooltip state - shows after 2s hover
  const [showTooltip, setShowTooltip] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  // Extract Instagram handle from URL, fallback to artist_name (which is typically the handle)
  const instagramHandle = instagram_url
    ? instagram_url.split('/').filter(Boolean).pop()
    : artist_name

  // Convert raw similarity score to user-friendly percentage
  // Scores now include style/theme/color boosts and can exceed 1.0
  const rescaleToUserFriendlyPercentage = (score: number): number => {
    const MIN_SCORE = 0.15  // Minimum search threshold
    const MAX_SCORE = 1.15  // High match with all boosts (similarity ~0.45 + technique 0.20 + theme 0.10 + color 0.10 + pro 0.05 + featured 0.02 + margin)
    const MIN_DISPLAY = 60 // Display minimum
    const MAX_DISPLAY = 99 // Display maximum

    // Clamp to expected range
    const clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score))

    // Linear rescaling
    const rescaled = MIN_DISPLAY + ((clamped - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * (MAX_DISPLAY - MIN_DISPLAY)

    return Math.round(rescaled)
  }

  // Searched artist always shows 100% (it's their own work)
  const matchPercentage = is_searched_artist ? 100 : rescaleToUserFriendlyPercentage(similarity)

  const handleImageClick = (e: React.MouseEvent) => {
    // Only allow image rotation on search results, not browse pages
    if (displayMode === 'search' && allImages.length > 1) {
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

  // Only Pro cards span 2 columns and use horizontal layout on desktop
  // Featured artists get badge + boost but standard single-width layout
  // On mobile, all cards use standard vertical layout for consistent grid
  const isWideLayout = is_pro && displayMode === 'search'

  // Determine href: for pending artists, link to Instagram; otherwise artist profile
  // For searched artists that have a DB id, link to their profile
  const href = isPending
    ? instagram_url || `https://instagram.com/${instagramHandle}`
    : `/artist/${artist_slug}`

  // Use anchor tag for external links (pending artists)
  const LinkComponent = isPending ? 'a' : Link
  const linkProps = isPending ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <LinkComponent
      href={href}
      {...linkProps}
      onClick={handleCardClick}
      className={`group block w-full min-w-0 bg-paper border-2 overflow-hidden hover:border-ink hover:-translate-y-[3px] hover:shadow-md transition-all duration-fast min-h-[280px] sm:min-h-[320px] lg:min-h-[360px] ${
        isWideLayout ? 'lg:col-span-2' : ''
      } ${is_searched_artist ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-ink/20'}`}
    >
      {/* On mobile/tablet: vertical layout. On lg+: Pro/Featured use horizontal layout */}
      <div className={isWideLayout ? 'lg:flex lg:flex-row h-full lg:gap-4' : ''}>
        {/* Hero Image (tap to rotate) - Editorial */}
        {currentImage && (
          <div
            className={`relative overflow-hidden bg-gray-100 cursor-pointer ${
              isWideLayout
                ? 'aspect-square lg:aspect-auto lg:flex-1 lg:h-auto'
                : 'aspect-square'
            }`}
            onClick={handleImageClick}
          >
            <Image
              src={getImageUrl(currentImage.url)}
              alt={`${artist_name} portfolio`}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.01] transition-transform duration-slow"
            />

            {/* Featured badge on image - show on mobile/tablet, hide on lg+ for Pro/Featured (shown in details instead) */}
            {is_featured && (
              <div className={`absolute top-3 left-3 ${isWideLayout ? 'lg:hidden' : ''}`}>
                <FeaturedBadge variant="badge" />
              </div>
            )}

            {/* Image counter - Top-right (search mode only) */}
            {displayMode === 'search' && allImages.length > 1 && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 py-1 sm:px-2.5 sm:py-1.5 bg-ink/80 backdrop-blur-sm">
                <span className="font-mono text-[10px] sm:text-xs font-medium text-paper tracking-[0.1em] uppercase">
                  {currentIndex + 1}/{allImages.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Mobile/tablet info section for Pro/Featured cards - standard compact layout */}
        {isWideLayout && (
          <div className="p-3 space-y-1 min-w-0 lg:hidden">
            <div className="flex items-center gap-1.5 min-w-0">
              {profile_image_url && !profileImageError && (
                <Image
                  src={getImageUrl(profile_image_url)}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  className="rounded-full object-cover flex-shrink-0"
                  onError={() => setProfileImageError(true)}
                />
              )}
              <h3 className="font-heading text-sm font-bold text-ink tracking-tight truncate min-w-0">
                @{instagramHandle}
              </h3>
              {is_pro && <ProBadge variant="icon-only" size="sm" />}
              {is_featured && !is_pro && <FeaturedBadge variant="icon-only" size="sm" />}
            </div>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <p className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em] truncate">
                  {city}
                </p>
                {hasMultipleLocations && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0"
                    title={`Works in ${locationCount} locations`}
                  >
                    +{locationCount - 1}
                  </span>
                )}
              </div>
              {displayMode === 'search' && (
                <span className="font-mono text-xs font-semibold text-ink flex-shrink-0">
                  {matchPercentage}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Artist Info - Editorial Typography (Desktop lg+ Pro layout OR standard layout) */}
        <div className={`${isWideLayout ? 'hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between lg:p-0 lg:py-6 lg:px-1 min-w-0' : 'p-3 sm:p-4 space-y-1 min-w-0'}`}>
          {/* Pro layout - Editorial stats block (md+ only) */}
          {isWideLayout && (
            <>
              <div className="flex flex-col space-y-3 sm:space-y-5">
                {/* Pro or Featured badge and percentage row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-shrink-0">
                    {is_pro ? (
                      <ProBadge variant="badge" size="md" />
                    ) : is_featured ? (
                      <FeaturedBadge variant="badge" className="text-sm" />
                    ) : null}
                  </div>

                  {/* Match percentage - top right */}
                  {displayMode === 'search' && (
                    <div
                      className="relative flex-shrink-0 pr-4"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="font-mono text-base font-semibold text-ink">
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
                  <div className="flex items-center gap-2">
                    {profile_image_url && !profileImageError && (
                      <Image
                        src={getImageUrl(profile_image_url)}
                        alt=""
                        width={32}
                        height={32}
                        loading="lazy"
                        className="rounded-full object-cover flex-shrink-0"
                        onError={() => setProfileImageError(true)}
                      />
                    )}
                    <h3 className="font-heading text-base lg:text-xl font-bold text-ink tracking-tight truncate">
                      @{instagramHandle}
                    </h3>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-[0.15em]">
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
          )}
          {/* Standard layout (non-enhanced cards) */}
          {!isWideLayout && (
            <div className="space-y-1 min-w-0">
              {instagramHandle && (
                <div className="flex items-center gap-1.5 min-w-0">
                  {profile_image_url && !profileImageError && (
                    <Image
                      src={getImageUrl(profile_image_url)}
                      alt=""
                      width={32}
                      height={32}
                      loading="lazy"
                      className="rounded-full object-cover flex-shrink-0"
                      onError={() => setProfileImageError(true)}
                    />
                  )}
                  <h3 className="font-heading text-sm sm:text-base font-bold text-ink tracking-tight truncate min-w-0">
                    @{instagramHandle}
                  </h3>
                  {is_pro && <ProBadge variant="icon-only" size="sm" />}
                  {is_featured && !is_pro && <FeaturedBadge variant="icon-only" size="sm" />}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <p className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em] truncate">
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
    </LinkComponent>
  )
}
