'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearch } from '@/components/search/SearchProvider'

/**
 * Global navigation header - Editorial Magazine Masthead
 * Design: "PAPER & INK v2.0" - Refined editorial aesthetic
 * Features: Magazine-style masthead + sophisticated dropdown + global search
 */
export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { openSearch } = useSearch()

  return (
    <header className="bg-paper-white border-b-2 border-ink/10 relative">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-ink/20 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 md:h-24 relative">
          {/* Logo - Editorial Magazine Masthead */}
          <Link href="/" className="flex items-center gap-3 group relative z-10">
            <div className="relative">
              {/* Main logo */}
              <div className="font-display text-3xl md:text-4xl font-[900] text-ink tracking-tight leading-none group-hover:tracking-wide transition-all duration-medium">
                PAPER & INK
              </div>

              {/* Subtle tagline */}
              <div className="hidden md:block font-mono text-[9px] font-light tracking-[0.2em] text-gray-500 uppercase mt-1 text-center">
                Artist Discovery
              </div>
            </div>
          </Link>

          {/* Desktop Navigation - Editorial Style */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <Link
              href="/"
              className="editorial-nav-link group relative"
            >
              <span className="relative z-10">Home</span>
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-left" />
            </Link>

            {/* Search Button - Editorial */}
            <button
              onClick={openSearch}
              className="editorial-nav-link group flex items-center gap-2 relative"
              aria-label="Search"
            >
              <svg
                className="w-3 h-3 group-hover:scale-110 transition-transform duration-medium"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="relative z-10">Search</span>
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-left" />
            </button>

            {/* Browse Dropdown - Editorial */}
            <div className="relative group">
              <button
                className="editorial-nav-link flex items-center gap-2 cursor-pointer relative"
                aria-label="Browse cities"
                aria-haspopup="true"
              >
                <span className="relative z-10">Browse</span>
                <svg
                  className="w-3 h-3 transition-transform duration-medium group-hover:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-left" />
              </button>

              {/* Editorial Dropdown Menu */}
              <div className="editorial-dropdown-menu" role="menu">
                {/* Decorative top border */}
                <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-ink/30 to-transparent" aria-hidden="true" />

                <div className="p-1">
                  {/* Texas Section */}
                  <div className="mb-2">
                    <Link href="/texas" className="editorial-dropdown-header" role="menuitem">
                      Texas
                    </Link>
                    <Link href="/texas/austin" className="editorial-dropdown-item group" role="menuitem">
                      <span className="font-mono text-[9px] text-gray-400 mr-2 group-hover:text-ink transition-colors">→</span>
                      Austin
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-gray-200 my-2 mx-3" aria-hidden="true" />

                  {/* California Section */}
                  <div>
                    <Link href="/california" className="editorial-dropdown-header" role="menuitem">
                      California
                    </Link>
                    <Link href="/california/los-angeles" className="editorial-dropdown-item group" role="menuitem">
                      <span className="font-mono text-[9px] text-gray-400 mr-2 group-hover:text-ink transition-colors">→</span>
                      Los Angeles
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Actions (Search + Menu Toggle) */}
          <div className="md:hidden flex items-center gap-4">
            {/* Mobile Search Button */}
            <button
              onClick={openSearch}
              className="cursor-pointer p-2.5 hover:bg-gray-100 rounded-md transition-all duration-fast active:scale-95"
              aria-label="Search"
            >
              <svg
                className="w-5 h-5 text-ink"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="cursor-pointer p-2.5 hover:bg-gray-100 rounded-md transition-all duration-fast active:scale-95"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <svg
                className="w-6 h-6 text-ink"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-ink/10 to-transparent" aria-hidden="true" />

      {/* Mobile Menu - Editorial */}
      <nav
        id="mobile-navigation"
        className={`md:hidden overflow-hidden transition-all duration-medium border-t-2 border-ink/10 ${
          isMobileMenuOpen ? 'max-h-screen' : 'max-h-0'
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="py-6 px-4 space-y-6 bg-paper-white relative">
          {/* Decorative corner element */}
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5" aria-hidden="true">
            <svg viewBox="0 0 100 100" fill="currentColor" className="text-ink">
              <path d="M0,0 L100,0 L100,100 Z" />
            </svg>
          </div>

          <Link
            href="/"
            className="block editorial-mobile-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </Link>

          {/* Texas */}
          <div className="space-y-3">
            <Link
              href="/texas"
              className="block editorial-mobile-link font-bold"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Texas
            </Link>
            <Link
              href="/texas/austin"
              className="block editorial-mobile-link pl-6 text-gray-600 relative"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="font-mono text-[9px] text-gray-400 absolute left-3">→</span>
              Austin
            </Link>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-ink/20 via-ink/10 to-transparent" aria-hidden="true" />

          {/* California */}
          <div className="space-y-3">
            <Link
              href="/california"
              className="block editorial-mobile-link font-bold"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              California
            </Link>
            <Link
              href="/california/los-angeles"
              className="block editorial-mobile-link pl-6 text-gray-600 relative"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="font-mono text-[9px] text-gray-400 absolute left-3">→</span>
              Los Angeles
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
