'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'
import ImageUpload from './ImageUpload'
import TextSearch from './TextSearch'

export default function SearchTabs() {
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image')

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

    // Validate based on active tab
    if (activeTab === 'image' && !imageFile) {
      setError('Please select an image to upload')
      return
    }

    if (activeTab === 'text' && textQuery.trim().length < 3) {
      setError('Please enter at least 3 characters')
      return
    }

    setIsSubmitting(true)

    try {
      let response: Response

      if (activeTab === 'image') {
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

  const isImageValid = activeTab === 'image' && imageFile !== null
  const isTextValid =
    activeTab === 'text' && textQuery.trim().length >= 3 && textQuery.length <= 200
  const canSubmit = (isImageValid || isTextValid) && !isSubmitting

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'image' | 'text')}>
        {/* Tab List */}
        <Tabs.List
          className="flex border-b border-border-medium mb-8"
          aria-label="Search method"
        >
          <Tabs.Trigger
            value="image"
            className={`
              flex-1 px-6 py-4 font-body text-sm font-medium transition-all duration-medium ease-smooth
              border-b-2 -mb-px uppercase tracking-wide
              ${
                activeTab === 'image'
                  ? 'border-accent-primary text-accent-primary shadow-glow-accent'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
              }
            `}
          >
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Upload Image</span>
            </div>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="text"
            className={`
              flex-1 px-6 py-4 font-body text-sm font-medium transition-all duration-medium ease-smooth
              border-b-2 -mb-px uppercase tracking-wide
              ${
                activeTab === 'text'
                  ? 'border-accent-primary text-accent-primary shadow-glow-accent'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
              }
            `}
          >
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
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <span>Describe Your Vibe</span>
            </div>
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs.Content value="image" className="focus:outline-none">
            <ImageUpload
              onImageSelect={handleImageSelect}
              currentImage={imageFile}
              currentPreview={imagePreview}
            />
          </Tabs.Content>

          <Tabs.Content value="text" className="focus:outline-none">
            <TextSearch value={textQuery} onChange={handleTextChange} />
          </Tabs.Content>

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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`
              w-full py-5 px-6 rounded-lg font-body font-medium text-text-primary uppercase tracking-wide
              transition-all duration-medium ease-smooth
              ${
                canSubmit
                  ? 'bg-gradient-accent shadow-lg hover:shadow-glow-accent-strong hover:-translate-y-0.5 active:translate-y-0'
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
      </Tabs.Root>
    </div>
  )
}
