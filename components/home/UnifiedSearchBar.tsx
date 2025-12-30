'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSearchCard from '@/components/search/LoadingSearchCard'

export default function UnifiedSearchBar() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [textQuery, setTextQuery] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

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

    // Validate: at least one input method
    const hasImage = imageFile !== null
    const hasText = textQuery.trim().length >= 3

    if (!hasImage && !hasText) {
      setError('Please upload an image or describe what you\'re looking for')
      return
    }

    setIsSubmitting(true)

    try {
      let response: Response

      // Prioritize image if both are provided
      if (hasImage) {
        const formData = new FormData()
        formData.append('type', 'image')
        formData.append('image', imageFile!)

        response = await fetch('/api/search', {
          method: 'POST',
          body: formData,
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

  const canSubmit = (imageFile !== null || textQuery.trim().length >= 3) && !isSubmitting

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-0" id="search">
      <form onSubmit={handleSubmit}>
        {!isSubmitting ? (
          /* Normal Search Bar */
          <div
            className={`
              relative flex items-center gap-2 sm:gap-3
              bg-white rounded-full shadow-2xl
              transition-all duration-300
              ${isDragging ? 'ring-4 ring-ink/50 scale-[1.01]' : ''}
              ${error ? 'ring-2 ring-red-500/50' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {/* Image Preview Thumbnail (if uploaded) */}
            {imagePreview && (
              <div className="flex-shrink-0 pl-2 sm:pl-3 py-2">
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Reference"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-ink"
                  />
                  {/* Note: Using img for blob URL preview */}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors text-xs"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Search Icon */}
            <div className="flex-shrink-0 pl-5 sm:pl-6 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={textQuery}
              onChange={(e) => {
                setTextQuery(e.target.value)
                setError(null)
              }}
              placeholder="Describe your style or upload an image..."
              maxLength={200}
              className="flex-1 py-5 bg-transparent font-body text-base sm:text-lg text-black placeholder:text-gray-400 focus:outline-none"
            />

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload reference image"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-3 sm:p-3.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-all"
              aria-label="Upload image"
              title="Upload image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Search Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`
                flex-shrink-0 mr-1.5 sm:mr-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-mono text-xs sm:text-sm uppercase tracking-wider
                transition-all duration-200 min-w-[80px] sm:min-w-[100px] flex items-center justify-center
                ${
                  canSubmit
                    ? 'bg-ink text-paper hover:opacity-90 hover:-translate-y-0.5 font-bold'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed font-semibold'
                }
              `}
            >
              Search
            </button>
          </div>
        ) : (
          /* Loading State - Replaces Search Bar */
          <LoadingSearchCard
            isVisible={isSubmitting}
            searchType={imageFile ? 'image' : 'text'}
          />
        )}

        {/* Error Message */}
        {error && !isSubmitting && (
          <div className="mt-3 text-center">
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* Drag Hint */}
        {isDragging && !isSubmitting && (
          <div className="mt-3 text-center">
            <p className="text-sm text-ink font-medium animate-pulse">Drop your image here</p>
          </div>
        )}
      </form>
    </div>
  )
}
