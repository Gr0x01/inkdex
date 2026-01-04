'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface StyleCardProps {
  styleName: string
  displayName: string
  imageUrl: string
}

export default function StyleCard({ styleName: _styleName, displayName, imageUrl }: StyleCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (isLoading) return
    setIsLoading(true)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          text: `${displayName.toLowerCase()} tattoo`,
        }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      router.push(`/search?id=${data.searchId}`)
    } catch (error) {
      console.error('Style search error:', error)
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="group relative block aspect-square sm:aspect-[4/5] md:aspect-[3/4] overflow-hidden bg-gray-900 w-full text-left"
    >
      {/* Background Image */}
      <Image
        src={imageUrl}
        alt={`${displayName} tattoo style`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Style Name */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <h3 className="font-mono text-xs sm:text-sm font-bold text-white uppercase tracking-[0.25em] leading-tight">
          {displayName}
        </h3>

        {/* Arrow indicator on hover */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <span className="font-mono text-[10px] text-white/70 uppercase tracking-wider">
            Explore
          </span>
          <svg
            className="w-3 h-3 text-white/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
      </div>

      {/* Corner accent */}
      <div className="absolute top-3 right-3 w-2 h-2 border-t-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors duration-300" />
    </button>
  )
}
