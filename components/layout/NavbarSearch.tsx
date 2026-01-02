'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'

/**
 * Compact navbar search component
 * Design: Purpose-built for navbar with editorial aesthetic
 * Features: All 4 input methods (image, text, IG post, IG profile) in compact form
 */
export default function NavbarSearch() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [textQuery, setTextQuery] = useState('')
  const [detectedInstagramUrl, setDetectedInstagramUrl] = useState<{
    type: 'post' | 'profile' | null
    id: string
    originalUrl: string
  } | null>(null)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Detect Instagram URLs in text input
  useEffect(() => {
    const detected = detectInstagramUrl(textQuery)
    setDetectedInstagramUrl(detected)
  }, [textQuery])

  const handleImageSelect = (file: File) => {
    // Revoke previous blob URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    const preview = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(preview)
    setError(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate: at least one input method
    const hasImage = imageFile !== null
    const hasText = textQuery.trim().length >= 3
    const hasInstagramPost = detectedInstagramUrl?.type === 'post'
    const hasInstagramProfile = detectedInstagramUrl?.type === 'profile'

    if (!hasImage && !hasText && !hasInstagramPost && !hasInstagramProfile) {
      setError('Please enter at least 3 characters or upload an image')
      return
    }

    setIsSubmitting(true)

    try {
      let response: Response

      // Priority: Image > Instagram Post > Instagram Profile > Text
      if (hasImage) {
        const formData = new FormData()
        formData.append('type', 'image')
        formData.append('image', imageFile!)

        response = await fetch('/api/search', {
          method: 'POST',
          body: formData,
        })
      } else if (hasInstagramPost) {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'instagram_post',
            instagram_url: detectedInstagramUrl!.originalUrl,
          }),
        })
      } else if (hasInstagramProfile) {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'instagram_profile',
            instagram_url: detectedInstagramUrl!.originalUrl,
          }),
        })
      } else {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'text',
            text: textQuery.trim(),
          }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()

      // Cleanup blob URL before navigation
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }

      router.push(`/search?id=${data.searchId}`)
    } catch (err) {
      console.error('Search error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to submit search. Please try again.'
      )
      setIsSubmitting(false)
    }
  }

  const canSubmit = (
    imageFile !== null ||
    textQuery.trim().length >= 3 ||
    detectedInstagramUrl?.type === 'post' ||
    detectedInstagramUrl?.type === 'profile'
  ) && !isSubmitting

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="flex items-stretch gap-0.5">
        {/* Input Field Container */}
        <div
          className={`
            flex-1 flex items-center gap-2 h-10 md:h-11 px-2 bg-white/80 border-2
            transition-all duration-150
            ${error ? 'border-red-500/60' : 'border-ink/20'}
            focus-within:border-ink focus-within:bg-white
          `}
        >
          {/* Left: Search Icon OR Image Thumbnail */}
          {imagePreview ? (
            <div className="relative w-6 h-6 md:w-7 md:h-7 flex-shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Upload preview"
                className="w-full h-full object-cover ring-1 ring-ink/20"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-ink text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ) : (
            <svg
              className="w-4 h-4 md:w-5 md:h-5 text-ink/40 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}

          {/* Center: Text Input */}
          <input
            type="text"
            value={textQuery}
            onChange={(e) => {
              setTextQuery(e.target.value)
              setError(null)
            }}
            placeholder="Search artists, styles, or paste Instagram link..."
            maxLength={200}
            className="flex-1 bg-transparent text-sm md:text-base font-body text-ink placeholder:text-ink/35 outline-none focus:outline-none focus:ring-0 min-w-0"
          />

          {/* Instagram Badge (conditional) */}
          {detectedInstagramUrl && !imageFile && (
            <div className="flex-shrink-0 px-2 py-0.5 bg-gradient-to-r from-purple-500/90 to-pink-500/90 animate-[badge-slide-in_150ms_ease-out]">
              <span className="text-[10px] md:text-xs font-mono font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                {detectedInstagramUrl.type === 'post'
                  ? 'IG Post'
                  : `@${detectedInstagramUrl.id.length > 8 ? detectedInstagramUrl.id.slice(0, 8) + '...' : detectedInstagramUrl.id}`}
              </span>
            </div>
          )}

          {/* Upload Button (inside input) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-1.5 -mr-1 hover:bg-ink/5 transition-colors"
            aria-label="Upload reference image"
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 text-ink/40 hover:text-ink transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload reference image"
          />
        </div>

        {/* Search Button - Separate, next to input */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`
            flex-shrink-0 h-10 md:h-11 px-4 md:px-6 border-2
            font-mono text-xs md:text-sm font-bold uppercase tracking-widest
            transition-all duration-150
            ${
              canSubmit
                ? 'bg-ink text-paper border-ink hover:bg-ink/90 active:bg-ink/80'
                : 'bg-ink/5 text-ink/25 border-transparent cursor-not-allowed'
            }
          `}
        >
          Search
        </button>
      </div>

      {/* Inline Loading Spinner (overlay) */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-ink/20 border-t-ink animate-spin" />
        </div>
      )}

      {/* Error Message */}
      {error && !isSubmitting && (
        <div className="absolute top-full left-0 right-0 mt-1.5 px-1">
          <p className="text-xs md:text-sm text-red-600 font-body">{error}</p>
        </div>
      )}
    </form>
  )
}
