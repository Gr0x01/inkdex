'use client'

import { useState } from 'react'
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

  const handleImageSelect = (file: File | null, preview: string) => {
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
    <div className="w-full max-w-2xl mx-auto">
      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'image' | 'text')}>
        {/* Tab List */}
        <Tabs.List
          className="flex border-b border-gray-200 mb-8"
          aria-label="Search method"
        >
          <Tabs.Trigger
            value="image"
            className={`
              flex-1 px-6 py-3 text-sm font-medium transition-colors
              border-b-2 -mb-px
              ${
                activeTab === 'image'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              flex-1 px-6 py-3 text-sm font-medium transition-colors
              border-b-2 -mb-px
              ${
                activeTab === 'text'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              className="p-4 bg-red-50 border border-red-200 rounded-lg"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`
              w-full py-4 px-6 rounded-lg font-medium text-white
              transition-all duration-200
              ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 cursor-not-allowed'
              }
            `}
            aria-label={
              isSubmitting ? 'Searching...' : 'Search for tattoo artists'
            }
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
