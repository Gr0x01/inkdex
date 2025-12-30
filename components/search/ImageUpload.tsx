'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface ImageUploadProps {
  onImageSelect: (file: File | null, preview: string) => void
  currentImage?: File | null
  currentPreview?: string | null
  compact?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export default function ImageUpload({
  onImageSelect,
  currentImage,
  currentPreview,
  compact = false,
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null)

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError('File size exceeds 10MB limit')
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('File must be JPEG, PNG, or WebP')
        } else {
          setError('Invalid file')
        }
        return
      }

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]

        // Create preview URL
        const preview = URL.createObjectURL(file)
        onImageSelect(file, preview)
      }
    },
    [onImageSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: false,
  })

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setError(null)
    onImageSelect(null, '')
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg text-center cursor-pointer
          transition-all duration-medium ease-smooth
          ${compact ? 'p-6' : 'p-8 md:p-12'}
          ${
            isDragActive
              ? 'border-accent-primary bg-accent-primary/10 shadow-glow-accent-strong'
              : currentPreview
              ? 'border-border-medium bg-surface-low hover:border-border-strong'
              : 'border-border-medium bg-surface-mid hover:border-accent-primary hover:shadow-glow-accent'
          }
          ${error ? 'border-status-error bg-status-error/5' : ''}
        `}
        role="button"
        aria-label="Upload image"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ;(e.target as HTMLElement).click()
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <input {...getInputProps()} aria-label="File upload input" />

        {currentPreview ? (
          <div className={`space-y-3 animate-scale-in ${compact ? 'space-y-2' : 'space-y-4'}`}>
            {/* Image Preview */}
            <div className="relative inline-block">
              <img
                src={currentPreview}
                alt="Upload preview"
                className={`${
                  compact ? 'max-h-32' : 'max-h-80'
                } max-w-full rounded-lg shadow-lg mx-auto border border-border-subtle`}
              />
            </div>

            {/* File Info */}
            {!compact && (
              <div className="font-body text-small text-text-secondary">
                <p className="font-medium text-text-primary">{currentImage?.name}</p>
                <p className="text-text-tertiary mt-1">
                  {currentImage
                    ? `${(currentImage.size / 1024 / 1024).toFixed(2)} MB`
                    : ''}
                </p>
              </div>
            )}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className={`inline-flex items-center gap-2 font-body ${
                compact ? 'text-tiny' : 'text-small'
              } text-status-error hover:text-status-error/80 font-medium transition-colors duration-fast uppercase tracking-wide`}
              aria-label="Clear selected image"
            >
              <svg
                className={compact ? 'w-3 h-3' : 'w-4 h-4'}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {compact ? 'Remove' : 'Remove & choose different'}
            </button>
          </div>
        ) : (
          <div className={compact ? 'space-y-2' : 'space-y-4'}>
            {/* Upload Icon */}
            <div className="flex justify-center">
              <div className={`
                ${compact ? 'w-12 h-12' : 'w-20 h-20'} rounded-xl flex items-center justify-center
                ${isDragActive ? 'bg-accent-primary/20' : 'bg-surface-high'}
                transition-colors duration-medium
              `}>
                <svg
                  className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} ${
                    isDragActive ? 'text-accent-primary' : 'text-text-tertiary'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* Upload Text */}
            <div>
              <p className={`font-body ${compact ? 'text-small' : 'text-base'} font-medium text-text-primary mb-1`}>
                {isDragActive ? (
                  'Drop your image here'
                ) : (
                  <>
                    <span className="text-accent-primary hover:text-accent-primary-hover transition-colors">
                      Click to upload
                    </span>
                    {' '}or drag and drop
                  </>
                )}
              </p>
              {(!compact || isFocused) && (
                <p className="font-body text-tiny text-text-tertiary uppercase tracking-wide">
                  JPEG, PNG, or WebP (max 10MB)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mt-3 flex items-center gap-2 font-body text-small text-status-error animate-fade-in"
          role="alert"
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
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
          {error}
        </div>
      )}

      {/* Helper Text */}
      {!currentPreview && !error && !compact && (
        <p className="mt-3 font-body text-tiny text-text-tertiary leading-relaxed">
          Upload a reference image of tattoos you like. We&apos;ll find artists with similar styles.
        </p>
      )}
    </div>
  )
}
