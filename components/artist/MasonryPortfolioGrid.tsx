import Image from 'next/image'
import { getPortfolioImageUrl } from '@/lib/utils/images'
import { sanitizeCaption } from '@/lib/utils/sanitize'

interface PortfolioImage {
  id: string
  instagram_url: string
  storage_thumb_640?: string | null
  storage_thumb_1280?: string | null
  post_caption?: string | null
  post_timestamp?: string | null
}

interface MasonryPortfolioGridProps {
  images: PortfolioImage[]
  artistName: string
}

export default function MasonryPortfolioGrid({
  images,
  artistName,
}: MasonryPortfolioGridProps) {
  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="font-body text-gray-500 italic">
          No portfolio images available
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Masonry Grid using CSS columns */}
      <div
        className="columns-1 sm:columns-2 gap-2 space-y-2"
        style={{ columnFill: 'balance' }}
      >
        {images.map((image, index) => (
          <a
            key={image.id}
            href={image.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block relative break-inside-avoid mb-2"
          >
            {/* Image Container */}
            <div className="relative overflow-hidden bg-gray-100 border border-gray-300 transition-all duration-medium group-hover:border-ink group-hover:shadow-lg">
              <Image
                src={getPortfolioImageUrl(image)}
                alt={
                  image.post_caption ||
                  `${artistName}'s tattoo work ${index + 1}`
                }
                width={1280}
                height={1280}
                sizes="(max-width: 640px) 100vw, 50vw"
                className="w-full h-auto object-cover"
                loading={index < 6 ? 'eager' : 'lazy'}
              />

              {/* Hover Overlay with Caption */}
              {image.post_caption && (
                <div className="absolute inset-0 bg-ink/90 opacity-0 group-hover:opacity-100 transition-opacity duration-medium p-6 flex items-end">
                  <p
                    className="font-body text-[0.9375rem] text-paper leading-relaxed line-clamp-6"
                    dangerouslySetInnerHTML={{ __html: sanitizeCaption(image.post_caption) }}
                  />
                </div>
              )}

              {/* Instagram Icon (complete logo) */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-ink/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-medium">
                <svg
                  className="w-5 h-5 text-paper"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
