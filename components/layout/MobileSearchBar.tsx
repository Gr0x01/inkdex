'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import { trackSearchStarted } from '@/lib/analytics/posthog'
import type { SearchType } from '@/lib/analytics/events'
import { useNavbarVisibility } from '@/components/layout/NavbarContext'
import styles from '@/components/home/ShimmerSearch.module.css'

/**
 * Sticky mobile search bar - fixed at bottom of screen on mobile only.
 * Fully functional: text input, image upload, Instagram URL detection.
 */
export default function MobileSearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { isHeroSearchVisible } = useNavbarVisibility()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Visibility state
  const [isMobile, setIsMobile] = useState(false)
  const [cookieBannerHeight, setCookieBannerHeight] = useState(0)

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [textQuery, setTextQuery] = useState('')
  const [detectedInstagramUrl, setDetectedInstagramUrl] = useState<{
    type: 'post' | 'profile' | null
    id: string
    originalUrl: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Cookie banner detection - shift bar up when visible
  useEffect(() => {
    const check = () => {
      const banner = document.querySelector('[aria-labelledby="cookie-banner-title"]')
      setCookieBannerHeight(banner ? 140 : 0)
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

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
    if (detected) {
      setDetectedInstagramUrl(detected)
    } else if (textQuery === '') {
      setDetectedInstagramUrl(null)
    }
  }, [textQuery])

  const handleImageSelect = async (file: File) => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    const preview = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(preview)
    setError(null)
    setIsSubmitting(true)

    trackSearchStarted({
      search_type: 'image',
      source: 'mobile_sticky',
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
      resetForm()
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
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

  const resetForm = () => {
    setIsSubmitting(false)
    setImageFile(null)
    setImagePreview('')
    setTextQuery('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const performSearch = async () => {
    const hasImage = imageFile !== null
    const hasText = textQuery.trim().length >= 3
    const hasInstagramPost = detectedInstagramUrl?.type === 'post'
    const hasInstagramProfile = detectedInstagramUrl?.type === 'profile'

    if (!hasImage && !hasText && !hasInstagramPost && !hasInstagramProfile) {
      setError('Enter at least 3 characters or upload an image')
      return
    }

    const searchType: SearchType = hasImage ? 'image' :
      hasInstagramPost ? 'instagram_post' :
      hasInstagramProfile ? 'instagram_profile' : 'text'

    trackSearchStarted({
      search_type: searchType,
      source: 'mobile_sticky',
      query_preview: hasText ? textQuery.trim().slice(0, 50) : undefined,
    })

    setIsSubmitting(true)

    try {
      let response: Response

      if (hasImage) {
        const formData = new FormData()
        formData.append('type', 'image')
        formData.append('image', imageFile!)
        response = await fetch('/api/search', { method: 'POST', body: formData })
      } else if (hasInstagramPost) {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'instagram_post', instagram_url: detectedInstagramUrl!.originalUrl }),
        })
      } else if (hasInstagramProfile) {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'instagram_profile', instagram_url: detectedInstagramUrl!.originalUrl }),
        })
      } else {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', text: textQuery.trim() }),
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
      resetForm()
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await performSearch()
  }

  const canSubmit = (
    imageFile !== null ||
    textQuery.trim().length >= 3 ||
    detectedInstagramUrl?.type === 'post' ||
    detectedInstagramUrl?.type === 'profile'
  ) && !isSubmitting

  // Visibility logic
  const isHomepage = pathname === '/'
  const shouldShow = isMobile && !(isHomepage && isHeroSearchVisible)

  // Don't render on desktop at all
  if (!isMobile) return null

  return (
    <div
      className={`fixed left-0 right-0 z-40 md:hidden bg-ink/90 backdrop-blur-xl border-t border-white/10 transition-all duration-300 ease-out after:absolute after:left-0 after:right-0 after:top-full after:h-[200px] after:bg-ink/90 after:backdrop-blur-xl ${
        shouldShow
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-full pointer-events-none'
      }`}
      style={{
        bottom: cookieBannerHeight,
        paddingBottom: `max(8px, env(safe-area-inset-bottom))`
      }}
      data-testid="mobile-search-bar"
    >
      <div className="px-4 py-2">
        <form onSubmit={handleSubmit} className="relative">
          <div className={`relative flex items-center h-12 bg-paper/95 shadow-sm ${isSubmitting ? '' : 'border border-ink/10'}`}>
            {/* Loading Glow Effect */}
            {isSubmitting && <div className={styles.loadingGlow} style={{ borderRadius: 0 }} />}
            {/* Left: Search Icon or Image Preview */}
            {imagePreview ? (
              <div className="relative w-9 h-9 ml-2 shrink-0 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="w-full h-full object-cover ring-1 ring-ink/20"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-ink text-paper flex items-center justify-center text-xs leading-none"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ) : (
              <svg
                className="w-5 h-5 ml-3 text-ink/40 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}

            {/* Center: Text Input */}
            <div className="flex-1 px-3">
              <div className={detectedInstagramUrl && !imagePreview ? 'inline-block px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500' : ''}>
                <input
                  type="text"
                  value={textQuery}
                  onChange={(e) => {
                    setTextQuery(e.target.value)
                    setError(null)
                  }}
                  placeholder={detectedInstagramUrl && !imagePreview ? '' : 'Search artists, styles...'}
                  maxLength={200}
                  className={detectedInstagramUrl && !imagePreview
                    ? 'bg-transparent text-base font-body text-white font-bold outline-none w-auto'
                    : 'w-full bg-transparent text-base font-body text-ink placeholder:text-ink/40 outline-none'
                  }
                  data-testid="mobile-search-input"
                />
              </div>
            </div>

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 p-2 hover:bg-ink/5 transition-colors"
              aria-label="Upload image"
            >
              <svg className="w-5 h-5 text-ink/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload reference image"
            />

            {/* Search Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`shrink-0 h-12 px-4 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                canSubmit
                  ? 'bg-orange-500 text-white hover:bg-orange-400'
                  : 'bg-ink/10 text-ink/30 cursor-not-allowed'
              }`}
              data-testid="mobile-search-submit"
            >
              {isSubmitting ? '...' : 'Go'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-1 px-3 py-1 bg-red-50 border border-red-200 text-red-600 text-xs">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
