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
    <section className="w-full py-6 bg-surface-low/50 border-y border-border-subtle" aria-label="Featured tattoo work">
      <div className="container mx-auto">
        <h2 className="font-body text-tiny text-text-secondary uppercase tracking-wide mb-4">
          Trending Styles
        </h2>

        {/* Horizontal Scrolling Strip */}
        <div className="scroll-x-snap">
          {images.map((image) => (
            <button
              key={image.id}
              onClick={() => handleImageClick(image.id)}
              className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-lg"
              aria-label={`View work by ${image.artist_name}`}
            >
              {/* Image Container */}
              <div className="relative overflow-hidden rounded-lg w-[100px] h-[100px] md:w-[120px] md:h-[120px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={`Tattoo work by ${image.artist_name}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Note: Using img - images already optimized in storage */}

                {/* Artist Badge Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 glass opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-medium">
                  <div className="flex items-center gap-1">
                    <p className="font-body text-tiny text-text-primary truncate flex-1">
                      {image.artist_name}
                    </p>
                    {image.verified && (
                      <svg
                        className="w-3 h-3 text-accent-primary flex-shrink-0"
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
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
