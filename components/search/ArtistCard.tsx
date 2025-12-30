'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { SearchResult } from '@/types/search'

interface ArtistCardProps {
  artist: SearchResult
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const {
    artist_slug,
    artist_name,
    city,
    instagram_url,
    matching_images,
    similarity,
  } = artist

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

  // Convert CLIP similarity to user-friendly percentage
  // CLIP scores are conservative (0.15-0.40 is typical range for good matches)
  // Rescale to 60-95% for better user perception
  const rescaleToUserFriendlyPercentage = (clipScore: number): number => {
    const MIN_CLIP = 0.15  // Minimum search threshold
    const MAX_CLIP = 0.40  // Excellent match threshold
    const MIN_DISPLAY = 60 // Display minimum
    const MAX_DISPLAY = 95 // Display maximum

    // Clamp to expected range
    const clamped = Math.max(MIN_CLIP, Math.min(MAX_CLIP, clipScore))

    // Linear rescaling: map [0.15, 0.40] → [60, 95]
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

  return (
    <Link
      href={`/artist/${artist_slug}`}
      className="group block bg-paper border-2 border-ink/20 overflow-hidden hover:border-ink hover:-translate-y-[3px] hover:shadow-md transition-all duration-fast"
    >
      {/* TOP: Hero Image (tap to rotate) - Editorial */}
      {currentImage && (
        <div
          className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer"
          onClick={handleImageClick}
        >
          <Image
            src={currentImage.url}
            alt={`${artist_name} portfolio`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.01] transition-transform duration-slow"
          />

          {/* Image counter - Refined */}
          {allImages.length > 1 && (
            <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-ink/80 backdrop-blur-sm">
              <span className="font-mono text-[10px] font-medium text-paper tracking-[0.1em] uppercase">
                {currentIndex + 1}/{allImages.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM: Artist Info - Editorial Typography */}
      <div className="p-3 sm:p-4 space-y-1">
        {instagramHandle && (
          <h3 className="font-heading text-[15px] font-bold text-ink tracking-tight">
            @{instagramHandle}
          </h3>
        )}
        <p className="font-body text-[13px] text-gray-700 leading-relaxed">
          {artist_name}
        </p>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
            {city}
          </p>
          {/* Match percentage with tooltip */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <span className="font-mono text-[10px] text-ink font-medium">
              {matchPercentage}%
            </span>

            {/* Tooltip - appears after 2s hover */}
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-ink text-paper text-[11px] font-body whitespace-nowrap rounded-sm shadow-lg z-10 animate-fade-in">
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
        </div>
      </div>
    </Link>
  )
}
