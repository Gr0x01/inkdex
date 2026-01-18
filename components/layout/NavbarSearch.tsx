'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import SearchError from '@/components/search/SearchError'
import styles from '@/components/home/ShimmerSearch.module.css'
import { trackSearchStarted } from '@/lib/analytics/posthog'
import type { SearchType } from '@/lib/analytics/events'

interface NavbarSearchProps {
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
  /** Force GDPR error state - for Storybook only */
  forceGdprError?: { message: string; detectedCountry: string } | null
}

/**
 * Compact navbar search component
 * Design: Purpose-built for navbar with editorial aesthetic
 * Features: All 4 input methods (image, text, IG post, IG profile) in compact form
 */
export default function NavbarSearch({
  forceLoading = false,
  forceInstagramDetection = null,
  forceImagePreview = null,
  forceError = null,
  forceTextQuery = null,
  forceGdprError = null,
}: NavbarSearchProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

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
  const [gdprError, setGdprError] = useState<{
    message: string
    detectedCountry: string
  } | null>(null)

  // Storybook overrides - combine forced state with internal state
  const displayImagePreview = forceImagePreview ?? imagePreview
  const displayError = forceError ?? error
  const displayTextQuery = forceTextQuery ?? textQuery
  const displayInstagramDetection = forceInstagramDetection ?? detectedInstagramUrl
  const displayGdprError = forceGdprError ?? gdprError

  // Combined loading state (for Storybook testing)
  const isLoading = forceLoading || isSubmitting

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Detect Instagram URLs in text input - style as tag when detected
  useEffect(() => {
    const detected = detectInstagramUrl(textQuery)
    if (detected) {
      setDetectedInstagramUrl(detected)
    } else if (textQuery === '') {
      // Only clear detection when input is explicitly empty (user cleared it)
      setDetectedInstagramUrl(null)
    }
  }, [textQuery])

  const handleImageSelect = async (file: File) => {
    // Revoke previous blob URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    const preview = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(preview)
    setError(null)

    // Auto-submit immediately when image is selected (bypasses handleSubmit)
    setIsSubmitting(true)

    // Track search started (only fires here for image auto-submit, handleSubmit handles other types)
    trackSearchStarted({
      search_type: 'image',
      source: 'navbar',
    })

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

      // Reset form state after navigation
      setIsSubmitting(false)
      setImageFile(null)
      setImagePreview('')
      setTextQuery('')
      setError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

  const performSearch = async (bypassGdprCheck = false) => {
    // Validate: at least one input method
    const hasImage = imageFile !== null
    const hasText = textQuery.trim().length >= 3
    const hasInstagramPost = detectedInstagramUrl?.type === 'post'
    const hasInstagramProfile = detectedInstagramUrl?.type === 'profile'

    if (!hasImage && !hasText && !hasInstagramPost && !hasInstagramProfile) {
      setError('Please enter at least 3 characters or upload an image')
      return
    }

    // Determine search type for tracking
    const searchType: SearchType = hasImage ? 'image' :
      hasInstagramPost ? 'instagram_post' :
      hasInstagramProfile ? 'instagram_profile' : 'text'

    // Track search started
    trackSearchStarted({
      search_type: searchType,
      source: 'navbar',
      query_preview: hasText ? textQuery.trim().slice(0, 50) : undefined,
    })

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
            bypass_gdpr_check: bypassGdprCheck,
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

        // Handle GDPR location detection error
        if (errorData.code === 'GDPR_LOCATION_DETECTED') {
          setGdprError({
            message: errorData.error,
            detectedCountry: errorData.detectedCountry,
          })
          setIsSubmitting(false)
          return
        }

        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()

      // Cleanup blob URL before navigation
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }

      // Navigate to results
      router.push(`/search?id=${data.searchId}`)

      // Reset form state after successful search (prevents stuck spinner + clears input)
      setIsSubmitting(false)
      setImageFile(null)
      setImagePreview('')
      setTextQuery('')
      setError(null)
      setGdprError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to submit search. Please try again.'
      )
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setGdprError(null)
    await performSearch(false)
  }

  const handleGdprBypass = async () => {
    setGdprError(null)
    await performSearch(true)
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
  ) && !isSubmitting

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="flex items-start gap-0">
        {/* Input Column - contains input field and GDPR error below it */}
        <div className="flex-1 flex flex-col">
          {/* Input Field Container */}
          <div
            className={`
              relative flex items-center gap-4 h-10 md:h-11 px-4 bg-white/80
              transition-all duration-150
              ${isLoading ? '' : 'border-2'}
              ${isLoading ? '' : displayError ? 'border-red-500/60' : 'border-ink/20'}
              ${isLoading ? '' : 'focus-within:border-ink focus-within:bg-white'}
            `}
          >
          {/* Loading Glow Effect - only on input container */}
          {isLoading && <div className={styles.loadingGlow} style={{ borderRadius: 0 }} />}
          {/* Left: Search Icon OR Image Thumbnail */}
          {displayImagePreview ? (
            <div className="relative w-7 h-7 md:w-8 md:h-8 shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImagePreview}
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
              className="w-4 h-4 md:w-5 md:h-5 text-ink/40 shrink-0"
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

          {/* Center: Text Input - styled as Instagram tag when detected */}
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <div className={displayInstagramDetection && !displayImagePreview ? 'px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 animate-scale-in' : 'flex-1'}>
              <input
                ref={textInputRef}
                type="text"
                value={displayTextQuery}
                onChange={(e) => {
                  setTextQuery(e.target.value)
                  setError(null)
                }}
                placeholder={displayInstagramDetection && !displayImagePreview ? '' : 'Search artists, styles, or paste Instagram link...'}
                maxLength={200}
                size={displayInstagramDetection && !displayImagePreview ? Math.max(1, displayTextQuery.length) : undefined}
                className={displayInstagramDetection && !displayImagePreview
                  ? 'bg-transparent text-sm md:text-base font-body text-white font-bold leading-[1.5] outline-none focus:outline-none focus:ring-0 w-auto'
                  : 'w-full bg-transparent text-sm md:text-base font-body text-ink placeholder:text-ink/35 outline-none focus:outline-none focus:ring-0'
                }
              />
            </div>
          </div>

          {/* Upload Button (inside input) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 hover:bg-ink/5 transition-colors"
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

          {/* Error Message - dropdown below input */}
          {displayError && !isSubmitting && (
            <SearchError message={displayError} variant="inline" />
          )}
          </div>

          {/* GDPR Location Error - inside input column */}
          {displayGdprError && !isSubmitting && (
            <div
              className="mt-1 bg-ink/95 backdrop-blur-sm px-4 py-2 animate-fade-in flex items-center justify-between gap-3 shadow-lg"
              role="alert"
            >
              <p className="font-body text-xs text-paper/90">
                Artist in <strong>{displayGdprError.detectedCountry}</strong> requires consent. <Link href="/add-artist" className="underline hover:text-white">Claim profile</Link>
              </p>
              <button
                type="button"
                onClick={handleGdprBypass}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-ink text-xs font-medium transition-colors shrink-0"
              >
                Proceed
              </button>
            </div>
          )}
        </div>

        {/* Search Button - Separate, next to input */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`
            shrink-0 h-10 md:h-11 px-4 md:px-6 border-2 min-w-[80px] md:min-w-[90px]
            font-mono text-xs md:text-sm font-bold uppercase tracking-widest
            transition-all duration-150 flex items-center justify-center
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
    </form>
  )
}
