'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import styles from './ShimmerSearch.module.css'

interface UnifiedSearchBarProps {
  /** Force loading state - for Storybook only */
  forceLoading?: boolean
}

export default function UnifiedSearchBar({ forceLoading = false }: UnifiedSearchBarProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [messageIndex, setMessageIndex] = useState(0)

  // Combined loading state (for Storybook testing)
  const isLoading = forceLoading || isSubmitting

  // Loading messages by search type
  const loadingMessages = {
    image: [
      "Analyzing your image...",
      "Comparing with our portfolio...",
      "Finding your perfect match...",
      "Almost there..."
    ],
    text: [
      "Understanding your style...",
      "Searching through portfolios...",
      "Finding the best artists...",
      "Curating your results..."
    ],
    instagram_post: [
      "Fetching from Instagram...",
      "Analyzing the post...",
      "Finding similar artists...",
      "Almost there..."
    ],
    instagram_profile: [
      "Fetching portfolio from Instagram...",
      "Analyzing recent posts...",
      "Finding artists with similar style...",
      "Almost there..."
    ]
  }

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

  // Loading message rotation
  useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0)
      return
    }

    const searchType = imageFile ? 'image' :
      detectedInstagramUrl?.type === 'post' ? 'instagram_post' :
      detectedInstagramUrl?.type === 'profile' ? 'instagram_profile' : 'text'

    const messages = loadingMessages[searchType]
    setLoadingMessage(messages[0])

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = (prev + 1) % messages.length
        setLoadingMessage(messages[next])
        return next
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [isLoading, imageFile, detectedInstagramUrl])

  const handleImageSelect = (file: File) => {
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
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

    const hasImage = imageFile !== null
    const hasText = textQuery.trim().length >= 3
    const hasInstagramPost = detectedInstagramUrl?.type === 'post'
    const hasInstagramProfile = detectedInstagramUrl?.type === 'profile'

    if (!hasImage && !hasText && !hasInstagramPost && !hasInstagramProfile) {
      setError('Please upload an image or describe what you\'re looking for')
      return
    }

    setIsSubmitting(true)

    try {
      let response: Response

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'instagram_post',
            instagram_url: detectedInstagramUrl!.originalUrl,
          }),
        })
      } else if (hasInstagramProfile) {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'instagram_profile',
            instagram_url: detectedInstagramUrl!.originalUrl,
          }),
        })
      } else {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }

      // 10s delay to show loading state while search processes
      await new Promise((resolve) => setTimeout(resolve, 10000))

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
  ) && !isLoading

  return (
    <div className="w-full max-w-3xl mx-auto px-4" id="search">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row items-stretch gap-0.5">
          {/* Input Field Container */}
          <div
            className={`
              relative flex-1 flex items-center gap-4 h-16 px-4 bg-white/95
              transition-all duration-150
              ${isLoading ? '' : 'border-2'}
              ${isLoading ? '' : error ? 'border-red-500/60' : isDragging ? 'border-ink' : 'border-white/20'}
              ${isLoading ? '' : 'focus-within:border-white/60'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {/* Loading Glow Effect - only on input container */}
            {isLoading && <div className={styles.loadingGlow} style={{ borderRadius: 0 }} />}

            {isLoading ? (
              /* Loading State Content */
              <div className="flex-1 flex items-center justify-center">
                <p
                  key={messageIndex}
                  className="font-body text-base sm:text-lg text-gray-600 animate-fade-in"
                >
                  {loadingMessage}
                </p>
              </div>
            ) : (
              <>
                {/* Left: Search Icon OR Image Thumbnail */}
                {imagePreview ? (
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="w-full h-full object-cover ring-1 ring-ink/20"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <svg
                    className="w-5 h-5 text-ink/40 flex-shrink-0"
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
                  ref={inputRef}
                  type="text"
                  value={textQuery}
                  onChange={(e) => {
                    setTextQuery(e.target.value)
                    setError(null)
                  }}
                  placeholder="Paste an Instagram link, describe your style, or drop an image..."
                  maxLength={200}
                  className="flex-1 bg-transparent text-[20px] font-body text-ink placeholder:text-ink/40 outline-none focus:outline-none focus:ring-0 min-w-0"
                />

                {/* Instagram Badge (conditional) */}
                {detectedInstagramUrl && !imageFile && (
                  <div className="flex-shrink-0 px-2.5 py-1 bg-gradient-to-r from-purple-500/90 to-pink-500/90 animate-[badge-slide-in_150ms_ease-out]">
                    <span className="text-xs sm:text-sm font-mono font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      {detectedInstagramUrl.type === 'post'
                        ? 'IG Post'
                        : `@${detectedInstagramUrl.id.length > 10 ? detectedInstagramUrl.id.slice(0, 10) + '...' : detectedInstagramUrl.id}`}
                    </span>
                  </div>
                )}

                {/* Upload Button (inside input) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-2.5 hover:bg-ink/5 transition-colors"
                  aria-label="Upload reference image"
                >
                  <svg
                    className="w-5 h-5 text-ink/40 hover:text-ink transition-colors"
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
              </>
            )}
          </div>

          {/* Search Button - Separate, next to input */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`
              h-16 px-4 border-2
              font-mono text-sm sm:text-base font-bold uppercase tracking-widest
              transition-all duration-150
              ${
                canSubmit
                  ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-400 active:bg-orange-600'
                  : 'bg-white/5 text-white/30 border-transparent cursor-not-allowed'
              }
            `}
          >
            Search
          </button>
        </div>

        {/* Error Message */}
        {error && !isLoading && (
          <div className="mt-3 text-center">
            <p className="text-sm text-red-400 font-body">{error}</p>
          </div>
        )}

        {/* Drag Hint */}
        {isDragging && !isLoading && (
          <div className="mt-3 text-center">
            <p className="text-sm text-white/80 font-medium animate-pulse">Drop your image here</p>
          </div>
        )}
      </form>
    </div>
  )
}
