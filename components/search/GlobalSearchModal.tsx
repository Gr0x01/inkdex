'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSearch } from './SearchProvider'
import UnifiedSearchBar from '../home/UnifiedSearchBar'

export default function GlobalSearchModal() {
  const { isOpen, closeSearch } = useSearch()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Auto-close on navigation (pathname change)
  const pathname = usePathname()
  useEffect(() => {
    closeSearch()
  }, [pathname, closeSearch])

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSearch()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeSearch])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY

      // Save reference to element that had focus
      previousFocusRef.current = document.activeElement as HTMLElement

      // Lock body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      return () => {
        // Restore scroll
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)

        // Return focus to trigger element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isOpen])

  // Focus management - focus first input when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector(
          'input, textarea'
        ) as HTMLInputElement | null
        firstInput?.focus()
      }, 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black-warm/60 backdrop-blur-sm z-50
                   animate-fade-in"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* Modal/Drawer Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        aria-describedby="search-modal-description"
        className="fixed z-50
                   md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                   md:w-full md:max-w-3xl md:max-h-[90vh]
                   md:animate-scale-in

                   max-md:bottom-0 max-md:left-0 max-md:right-0
                   max-md:animate-slide-up

                   bg-white-warm rounded-t-3xl md:rounded-3xl
                   shadow-xl
                   overflow-hidden"
      >
        {/* Screen reader only titles */}
        <h2 id="search-modal-title" className="sr-only">
          Search for tattoo artists
        </h2>
        <p id="search-modal-description" className="sr-only">
          Upload an image or describe your style to find matching artists in
          Austin or Los Angeles
        </p>

        {/* Close button */}
        <button
          onClick={closeSearch}
          className="absolute top-4 right-4 z-10
                     w-10 h-10 rounded-full
                     flex items-center justify-center
                     text-gray-600 hover:text-black-warm
                     hover:bg-gray-100
                     transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-gold-vibrant"
          aria-label="Close search"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Search content with safe area padding for mobile */}
        <div className="p-6 md:p-8 pb-safe max-md:pb-8">
          <UnifiedSearchBar />
        </div>
      </div>
    </>
  )
}
