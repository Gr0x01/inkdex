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
      className="group block bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      {/* TOP: Hero Image (tap to rotate) */}
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
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Image counter */}
          {allImages.length > 1 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs font-mono rounded">
              {currentIndex + 1}/{allImages.length}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM: Artist Info */}
      <div className="p-3">
        {instagramHandle && (
          <h3 className="font-heading text-sm font-semibold text-black-warm mb-0.5">
            @{instagramHandle}
          </h3>
        )}
        <p className="font-body text-xs text-gray-500 mb-1">
          {artist_name}
        </p>
        <p className="font-body text-xs text-gray-600">
          {city}
        </p>
      </div>
    </Link>
  )
}
