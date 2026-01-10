'use client'

interface ProfilePlaceholderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Placeholder for missing or broken artist profile images.
 * Displays a user silhouette icon with consistent styling.
 */
export function ProfilePlaceholder({ size = 'md', className = '' }: ProfilePlaceholderProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  return (
    <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
      <svg
        className={`${iconSizes[size]} text-gray-400`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  )
}
