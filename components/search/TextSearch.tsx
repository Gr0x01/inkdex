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
      {/* Textarea Container */}
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={EXAMPLE_QUERIES[currentExample]}
          className={`
            w-full px-4 py-4 rounded-lg border-2 resize-none
            bg-surface-mid text-text-primary font-body
            placeholder:text-text-tertiary placeholder:italic
            focus:outline-none focus:border-accent-primary focus:shadow-glow-accent
            transition-all duration-fast ease-smooth
            ${error ? 'border-status-error' : 'border-border-medium hover:border-border-strong'}
          `}
          rows={4}
          aria-label="Describe the tattoo style you're looking for"
          aria-describedby="char-count helper-text"
          aria-invalid={!!error}
        />

        {/* Character Count */}
        <div
          id="char-count"
          className={`
            absolute bottom-3 right-3 font-body text-tiny uppercase tracking-wide
            ${
              value.length > MAX_CHARS * 0.9
                ? 'text-status-error font-medium'
                : 'text-text-tertiary'
            }
          `}
          aria-live="polite"
        >
          {charCount}/{MAX_CHARS}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 font-body text-small text-status-error animate-fade-in" role="alert">
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

      {/* Helper Text & Examples */}
      <div id="helper-text" className="space-y-3">
        <p className="font-body text-tiny text-text-tertiary leading-relaxed">
          Describe the vibe, style, or aesthetic you&apos;re looking for in your own words
        </p>

        {/* Example Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-body text-tiny text-text-secondary uppercase tracking-wide">Try:</span>
          {EXAMPLE_QUERIES.slice(0, 4).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="
                font-body text-tiny px-3 py-1.5 rounded-full
                bg-surface-high border border-border-subtle
                text-text-secondary hover:text-text-primary hover:border-border-strong
                transition-all duration-fast ease-smooth
                hover:scale-105
              "
              aria-label={`Use example: ${example}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Success State */}
      {isValid && (
        <div
          className="flex items-start gap-3 p-4 bg-status-success/10 border border-status-success/30 rounded-lg backdrop-blur-sm animate-scale-in"
          role="status"
        >
          <svg
            className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5"
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
          <p className="font-body text-small text-status-success">
            Great description! We&apos;ll search for artists who match this vibe.
          </p>
        </div>
      )}
    </div>
  )
}
