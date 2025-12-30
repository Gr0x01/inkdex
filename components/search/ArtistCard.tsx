'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
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
  } = artist

  // All available images
  const allImages = (matching_images || []).filter(img => img.url && img.instagramUrl)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentImage = allImages[currentIndex]

  // Extract Instagram handle from URL (just the username)
  const instagramHandle = instagram_url
    ? instagram_url.split('/').filter(Boolean).pop()
    : null

  const handleImageClick = (e: React.MouseEvent) => {
    if (allImages.length > 1) {
      e.preventDefault()
      setCurrentIndex((prev) => (prev + 1) % allImages.length)
    }
  }

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
        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
          {city}
        </p>
      </div>
    </Link>
  )
}
