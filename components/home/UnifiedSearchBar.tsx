'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import SearchError from '@/components/search/SearchError'
import styles from './ShimmerSearch.module.css'

interface UnifiedSearchBarProps {
  /** Force loading state - for Storybook only */
  forceLoading?: boolean
  /** Force Instagram detection state - for Storybook only */
  forceInstagramDetection?: { type: 'post' | 'profile'; id: string; originalUrl: string } | null
  /** Force image preview URL - for Storybook only */
  forceImagePreview?: string | null
  /** Force error message - for Storybook only */
  forceError?: string | null
  /** Force text query value - for Storybook only */
  forceTextQuery?: string | null
}

export default function UnifiedSearchBar({
  forceLoading = false,
  forceInstagramDetection = null,
  forceImagePreview = null,
  forceError = null,
  forceTextQuery = null,
}: UnifiedSearchBarProps) {
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

  // Storybook overrides - combine forced state with internal state
  const displayImagePreview = forceImagePreview ?? imagePreview
  const displayError = forceError ?? error
  const displayTextQuery = forceTextQuery ?? textQuery
  const displayInstagramDetection = forceInstagramDetection ?? detectedInstagramUrl
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

  const handleImageSelect = async (file: File) => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    const preview = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(preview)
    setError(null)

    // Auto-submit immediately when image is selected
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('type', 'image')
      formData.append('image', file)

      const response = await fetch('/api/search', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()

      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
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
    displayImagePreview !== '' ||
    textQuery.trim().length >= 3 ||
    (displayTextQuery?.trim().length ?? 0) >= 3 ||
    detectedInstagramUrl?.type === 'post' ||
    detectedInstagramUrl?.type === 'profile' ||
    displayInstagramDetection?.type === 'post' ||
    displayInstagramDetection?.type === 'profile'
  ) && !isLoading

  return (
    <div className="w-full" id="search">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Input Field Container */}
          <div
            className={`
              relative flex-1 flex items-center gap-4 px-2 sm:px-4 bg-white/95 min-h-[44px] sm:min-h-[64px]
              transition-all duration-150
              ${isLoading ? '' : 'border-2'}
              ${isLoading ? '' : displayError ? 'border-red-500/60' : isDragging ? 'border-ink' : 'border-white/20'}
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
                {displayImagePreview ? (
                  <div className="relative w-8 h-8 flex-shrink-0 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayImagePreview}
                      alt="Upload preview"
                      className="w-full h-full object-cover ring-1 ring-ink/20"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-ink text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
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
                  value={displayTextQuery}
                  onChange={(e) => {
                    setTextQuery(e.target.value)
                    setError(null)
                  }}
                  placeholder="Drop an image or describe a style..."
                  maxLength={200}
                  className="flex-1 bg-transparent text-[16px] sm:text-[20px] font-body text-ink placeholder:text-ink/40 outline-none focus:outline-none focus:ring-0 min-w-0"
                />

                {/* Instagram Badge (conditional) */}
                {displayInstagramDetection && !displayImagePreview && (
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 animate-scale-in">
                    {/* Instagram Icon */}
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-xs font-body font-semibold text-white whitespace-nowrap">
                      {displayInstagramDetection.type === 'post'
                        ? 'Post'
                        : displayInstagramDetection.id.length > 12
                          ? displayInstagramDetection.id.slice(0, 12) + '…'
                          : displayInstagramDetection.id}
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

          {/* Search Button - Same height as input */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`
              w-full sm:w-auto px-6 border-2 h-[44px] sm:h-[64px]
              font-mono text-sm font-bold uppercase tracking-widest
              transition-all duration-150 flex items-center justify-center
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
        {displayError && !isLoading && (
          <SearchError message={displayError} variant="banner" />
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
