'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function UnifiedSearchBar() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
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
        {/* Main Search Container - Editorial Card */}
        <div
          className={`
            relative rounded-xl border-2 bg-white shadow-xl transition-all duration-medium
            ${isDragging
              ? 'border-gold-vibrant shadow-gold-strong scale-[1.02]'
              : 'border-gray-300 hover:border-gray-400 hover:shadow-lifted'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Image Preview (if uploaded) */}
          {imagePreview && (
            <div className="p-6 border-b border-gray-200 bg-gray-50 animate-scale-in">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Reference tattoo"
                    className="h-32 w-32 rounded-lg object-cover shadow-md border-2 border-gold-vibrant"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-black-warm text-white-pure rounded-full flex items-center justify-center hover:bg-error hover:scale-110 transition-all shadow-lg"
                    aria-label="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 pt-2">
                  <p className="font-body-medium text-small text-black-warm mb-1">{imageFile?.name}</p>
                  <p className="font-mono text-tiny text-gray-600">
                    {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={textQuery}
              onChange={(e) => {
                setTextQuery(e.target.value)
                setError(null)
              }}
              placeholder="dark floral sketchy, geometric minimal, fine line botanical..."
              rows={1}
              maxLength={200}
              className="w-full px-4 md:px-8 py-4 md:py-6 bg-transparent font-body text-base md:text-lg text-black-warm placeholder:text-gray-500 placeholder:italic resize-none focus:outline-none"
              style={{ minHeight: '80px', maxHeight: '200px' }}
            />

            {/* Bottom Action Bar */}
            <div className="px-4 md:px-8 pb-4 md:pb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-t border-gray-200 pt-4">
              {/* Left: Image Upload Button */}
              <div className="flex items-center gap-3 justify-center sm:justify-start">
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
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gold-vibrant hover:bg-gold-pale transition-all text-gray-700 hover:text-black-warm font-body-medium text-small flex-shrink-0"
                  aria-label="Upload image"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="whitespace-nowrap">Upload Image</span>
                </button>

                {isDragging && (
                  <span className="hidden sm:inline text-small text-gold-deep font-body-medium animate-fade-in">
                    Drop your image here
                  </span>
                )}
              </div>

              {/* Right: Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`
                  flex items-center justify-center gap-2 px-6 py-3 rounded-lg
                  font-mono text-xs font-medium uppercase tracking-wide
                  transition-all duration-300
                  ${
                    canSubmit
                      ? 'bg-gradient-to-r from-gold-vibrant to-gold-deep text-white-pure shadow-gold hover:shadow-gold-strong hover:-translate-y-0.5'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                    <span className="whitespace-nowrap">Searching</span>
                  </>
                ) : (
                  <span className="whitespace-nowrap">Find Artists</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mt-4 p-4 bg-error/10 border-2 border-error rounded-lg animate-fade-in"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="font-body text-small text-error font-medium">{error}</p>
            </div>
          </div>
        )}
      </form>

      {/* Helper Text */}
      <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-body text-small italic">
          Drag and drop an image or describe the vibe you&apos;re looking for
        </p>
      </div>
    </div>
  )
}
