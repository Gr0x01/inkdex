'use client'

import { useState, useEffect } from 'react'

interface TextSearchProps {
  value: string
  onChange: (value: string) => void
}

const MIN_CHARS = 3
const MAX_CHARS = 200

const EXAMPLE_QUERIES = [
  'dark floral sketchy',
  'geometric but organic',
  'fine line minimalist',
  'watercolor botanical',
  'traditional japanese',
  'blackwork mandala',
]

export default function TextSearch({ value, onChange }: TextSearchProps) {
  const [charCount, setCharCount] = useState(value.length)
  const [error, setError] = useState<string | null>(null)
  const [currentExample, setCurrentExample] = useState(0)

  useEffect(() => {
    setCharCount(value.length)

    // Validate
    if (value.length > 0 && value.length < MIN_CHARS) {
      setError(`At least ${MIN_CHARS} characters required`)
    } else if (value.length > MAX_CHARS) {
      setError(`Maximum ${MAX_CHARS} characters`)
    } else {
      setError(null)
    }
  }, [value])

  // Rotate example queries
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % EXAMPLE_QUERIES.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= MAX_CHARS) {
      onChange(newValue)
    }
  }

  const handleExampleClick = (example: string) => {
    onChange(example)
  }

  const isValid = value.length >= MIN_CHARS && value.length <= MAX_CHARS

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={EXAMPLE_QUERIES[currentExample]}
          className={`
            w-full px-4 py-3 rounded-lg border-2 resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors duration-200
            ${error ? 'border-red-400' : 'border-gray-300'}
          `}
          rows={4}
          aria-label="Describe the tattoo style you're looking for"
          aria-describedby="char-count helper-text"
          aria-invalid={!!error}
        />

        <div
          id="char-count"
          className={`
            absolute bottom-3 right-3 text-xs
            ${
              value.length > MAX_CHARS * 0.9
                ? 'text-red-500 font-medium'
                : 'text-gray-400'
            }
          `}
          aria-live="polite"
        >
          {charCount}/{MAX_CHARS}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1" role="alert">
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

      <div id="helper-text" className="space-y-2">
        <p className="text-xs text-gray-500">
          Describe the vibe, style, or aesthetic you&apos;re looking for in your own
          words
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-600">Try:</span>
          {EXAMPLE_QUERIES.slice(0, 4).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              aria-label={`Use example: ${example}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {isValid && (
        <div
          className="flex items-start gap-2 p-3 bg-green-50 rounded-lg"
          role="status"
        >
          <svg
            className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-800">
            Great description! We&apos;ll search for artists who match this vibe.
          </p>
        </div>
      )}
    </div>
  )
}
