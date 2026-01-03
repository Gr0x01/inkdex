/**
 * Top Images Grid Component
 * Displays top-performing portfolio images by view count
 */

'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface TopImage {
  imageId: string
  imageUrl: string
  instagramUrl: string | null
  viewCount: number
  postCaption: string | null
}

interface TopImagesGridProps {
  topImages: TopImage[]
}

export default function TopImagesGrid({ topImages }: TopImagesGridProps) {
  if (topImages.length === 0) {
    return (
      <div className="border border-gray-200 bg-white p-6">
        <h2 className="font-heading text-xl mb-4">Top Performing Images</h2>
        <p className="font-body text-sm text-gray-500">
          No image views recorded yet.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 bg-white p-6">
      <h2 className="font-heading text-xl mb-4">Top Performing Images</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {topImages.map((image, index) => (
          <div key={image.imageId} className="relative group">
            {/* Rank Badge */}
            <div className="absolute top-2 left-2 z-10 bg-ink text-paper w-6 h-6 flex items-center justify-center font-heading text-sm">
              {index + 1}
            </div>

            {/* Image */}
            <div className="relative aspect-square border-2 border-gray-200 overflow-hidden">
              <Image
                src={image.imageUrl}
                alt={image.postCaption || 'Portfolio image'}
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>

            {/* Stats Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-ink/90 text-paper p-2">
              <p className="font-mono text-xs font-semibold">
                {image.viewCount.toLocaleString()} views
              </p>
            </div>

            {/* Instagram Link */}
            {image.instagramUrl && (
              <a
                href={image.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 z-10 bg-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-4 h-4 text-ink" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
