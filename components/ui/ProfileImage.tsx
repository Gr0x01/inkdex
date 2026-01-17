'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ProfilePlaceholder } from './ProfilePlaceholder'
import { BLUR_DATA_URL } from '@/lib/constants/images'

interface ProfileImageProps {
  src: string | null | undefined
  alt: string
  fill?: boolean
  sizes?: string
  priority?: boolean
  quality?: number
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
  priority = false,
  quality = 75,
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
      priority={priority}
      quality={quality}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
