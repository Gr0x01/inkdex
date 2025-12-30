'use client'

import { useRouter } from 'next/navigation'
import type { FeaturedImage } from '@/lib/mock/featured-data'

interface VisualTeaserStripProps {
  images: FeaturedImage[]
}

export default function VisualTeaserStrip({ images }: VisualTeaserStripProps) {
  const router = useRouter()

  const handleImageClick = (imageId: string) => {
    // Navigate to search with this image as reference
    router.push(`/search?imageId=${imageId}`)
  }

  // Don't render if no images
  if (images.length === 0) {
    return null
  }

  return (
    <div className="w-full" aria-label="Featured tattoo work">
      {/* Horizontal Scrolling Strip */}
      <div className="scroll-x-snap px-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => handleImageClick(image.id)}
            className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
            aria-label={`View work by ${image.artist_name}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Image Container */}
            <div className="relative overflow-hidden rounded-lg w-[140px] h-[140px] md:w-[160px] md:h-[160px] border-2 border-gray-800 group-hover:border-gray-600 transition-all duration-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={`Tattoo work by ${image.artist_name}`}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {/* Note: Using img - images already optimized in storage */}

              {/* Dark Overlay with Artist Badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="font-mono text-[10px] text-white uppercase tracking-wider truncate flex-1">
                      {image.artist_name}
                    </p>
                    {image.verified && (
                      <svg
                        className="w-3 h-3 text-white flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
