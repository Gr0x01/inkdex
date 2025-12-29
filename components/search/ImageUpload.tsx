'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void
  currentImage?: File | null
  currentPreview?: string | null
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
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null)

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
    onImageSelect(null as any, '')
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${error ? 'border-red-400' : ''}
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
      >
        <input {...getInputProps()} aria-label="File upload input" />

        {currentPreview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={currentPreview}
                alt="Upload preview"
                className="max-h-64 max-w-full rounded-lg shadow-md mx-auto"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{currentImage?.name}</p>
              <p className="text-gray-400">
                {currentImage
                  ? `${(currentImage.size / 1024 / 1024).toFixed(2)} MB`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
              aria-label="Clear selected image"
            >
              Remove and choose different image
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
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

            <div>
              <p className="text-base font-medium text-gray-700">
                {isDragActive ? (
                  'Drop your image here'
                ) : (
                  <>
                    <span className="text-blue-600 hover:text-blue-700">
                      Click to upload
                    </span>{' '}
                    or drag and drop
                  </>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                JPEG, PNG, or WebP (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          className="mt-2 text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg
            className="w-4 h-4"
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
        </p>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Upload a reference image of tattoos you like. We&apos;ll find artists with
        similar styles.
      </p>
    </div>
  )
}
