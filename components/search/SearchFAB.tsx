'use client'

import { useEffect, useState } from 'react'
import { useSearch } from './SearchProvider'

export default function SearchFAB() {
  const { openSearch } = useSearch()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={openSearch}
      className="fixed bottom-6 right-6 md:hidden
                 w-14 h-14 rounded-full
                 bg-ink
                 text-paper
                 shadow-lg
                 hover:scale-105 active:scale-95
                 transition-all duration-200
                 z-40
                 flex items-center justify-center
                 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
      aria-label="Open search"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </button>
  )
}
