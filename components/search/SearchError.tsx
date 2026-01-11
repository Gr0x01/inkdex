'use client'

interface SearchErrorProps {
  /** The error message to display */
  message: string
  /** Visual variant - 'inline' for navbar, 'banner' for hero */
  variant?: 'inline' | 'banner'
  /** Additional CSS classes */
  className?: string
}

/**
 * Error display for search components
 * Follows Inkdex editorial aesthetic - sharp edges, clean typography
 *
 * Variants:
 * - `inline`: For navbar (compact, on light background)
 * - `banner`: For hero (on dark background, matches search bar width)
 */
export default function SearchError({
  message,
  variant = 'inline',
  className = '',
}: SearchErrorProps) {
  if (variant === 'banner') {
    // Hero variant: editorial left border, visible on dark background
    return (
      <div
        className={`
          mt-3
          border-l-2 border-status-error
          bg-white/10
          px-4 py-2.5
          animate-fade-in
          ${className}
        `}
        role="alert"
      >
        <p className="font-body text-sm text-paper/90 tracking-wide">
          {message}
        </p>
      </div>
    )
  }

  // Inline variant: dropdown tooltip below input
  return (
    <div
      className={`
        absolute top-full left-0 right-0 mt-2
        bg-paper border border-ink/10
        shadow-lg
        px-4 py-3
        animate-fade-in
        z-50
        ${className}
      `}
      role="alert"
    >
      <p className="font-body text-sm text-status-error">{message}</p>
    </div>
  )
}
