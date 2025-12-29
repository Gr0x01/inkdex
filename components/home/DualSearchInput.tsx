'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from '@/components/search/ImageUpload'
import TextSearch from '@/components/search/TextSearch'

export default function DualSearchInput() {
  const router = useRouter()

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [textQuery, setTextQuery] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup blob URL on unmount or preview change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const handleImageSelect = (file: File | null, preview: string) => {
    // Revoke previous blob URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(file)
    setImagePreview(preview)
    setError(null)
  }

  const handleTextChange = (value: string) => {
    setTextQuery(value)
    setError(null)
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
        // Submit image as FormData
        const formData = new FormData()
        formData.append('type', 'image')
        formData.append('image', imageFile!)

        response = await fetch('/api/search', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Submit text as JSON
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

      // Cleanup blob URL before navigation to prevent memory leak
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }

      // Redirect to results page
      router.push(`/search?id=${data.searchId}`)
    } catch (err) {
      console.error('Search error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to submit search. Please try again.'
      )
      setIsSubmitting(false)
    }
  }

  const isImageValid = imageFile !== null
  const isTextValid = textQuery.trim().length >= 3 && textQuery.length <= 200
  const canSubmit = (isImageValid || isTextValid) && !isSubmitting

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mobile: Stacked Layout, Desktop: 2-Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Image Upload Column */}
          <div className="space-y-3">
            <label className="block font-body text-small text-text-secondary uppercase tracking-wide">
              Upload Image
            </label>
            <ImageUpload
              onImageSelect={handleImageSelect}
              currentImage={imageFile}
              currentPreview={imagePreview}
              compact={true}
            />
          </div>

          {/* Text Search Column */}
          <div className="space-y-3">
            <label className="block font-body text-small text-text-secondary uppercase tracking-wide">
              or Describe It
            </label>
            <TextSearch
              value={textQuery}
              onChange={handleTextChange}
              rows={3}
              compact={true}
            />
          </div>
        </div>

        {/* OR Divider - Mobile Only */}
        <div className="md:hidden or-divider">
          <div className="line"></div>
          <span className="text">or</span>
          <div className="line"></div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg backdrop-blur-sm animate-fade-in"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="font-body text-sm text-status-error">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button - Fixed on mobile */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`
            w-full py-5 px-6 rounded-lg font-body font-medium text-text-primary uppercase tracking-wide
            transition-all duration-medium ease-smooth
            ${
              canSubmit
                ? 'bg-gradient-accent shadow-lg hover:shadow-glow-accent-strong hover:-translate-y-0.5 active:translate-y-0 search-submit-fixed'
                : 'bg-surface-high text-text-tertiary cursor-not-allowed opacity-50'
            }
          `}
          aria-label={
            isSubmitting ? 'Searching...' : 'Search for tattoo artists'
          }
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-3">
              <svg
                className="animate-spin h-5 w-5 text-text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Searching for artists...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>Find Artists</span>
            </div>
          )}
        </button>
      </form>
    </div>
  )
}
