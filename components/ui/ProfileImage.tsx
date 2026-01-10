'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ProfilePlaceholder } from './ProfilePlaceholder'

interface ProfileImageProps {
  src: string | null | undefined
  alt: string
  fill?: boolean
  sizes?: string
  className?: string
  placeholderSize?: 'sm' | 'md' | 'lg'
}

const PLACEHOLDER_PATHS = ['/placeholder-tattoo.svg', '/placeholder-tattoo.jpg']

/**
 * Profile image component with automatic fallback to placeholder.
 * Handles missing URLs and broken/404 images gracefully.
 */
export function ProfileImage({
  src,
  alt,
  fill = true,
  sizes = '200px',
  className = 'object-cover',
  placeholderSize = 'md',
}: ProfileImageProps) {
  const [hasError, setHasError] = useState(false)

  // Show placeholder if no src, if it's a placeholder path, or if image failed to load
  const isPlaceholder = src && PLACEHOLDER_PATHS.includes(src)
  if (!src || isPlaceholder || hasError) {
    return <ProfilePlaceholder size={placeholderSize} />
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
