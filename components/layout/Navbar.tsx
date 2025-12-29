'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Global navigation header with Browse dropdown
 * Design: "SKIN & PAPER" editorial aesthetic
 * Features: Desktop dropdown + accessible mobile menu
 */
export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white-warm border-b border-gray-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="font-display text-2xl md:text-3xl font-[900] text-black-warm group-hover:text-gold-deep transition-colors duration-medium">
              SKIN & PAPER
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <Link href="/" className="nav-link">
              Home
            </Link>

            {/* Browse Dropdown */}
            <div className="relative group">
              <button
                className="nav-link flex items-center gap-1 cursor-pointer"
                aria-label="Browse cities"
                aria-haspopup="true"
              >
                Browse
                <svg
                  className="w-4 h-4 transition-transform duration-medium group-hover:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="dropdown-menu" role="menu">
                {/* Texas Section */}
                <Link href="/texas" className="dropdown-item font-bold" role="menuitem">
                  Texas
                </Link>
                <Link href="/texas/austin" className="dropdown-item pl-6" role="menuitem">
                  → Austin
                </Link>

                {/* California Section */}
                <Link href="/california" className="dropdown-item font-bold mt-2 pt-2 border-t border-gray-200" role="menuitem">
                  California
                </Link>
                <Link href="/california/los-angeles" className="dropdown-item pl-6" role="menuitem">
                  → Los Angeles
                </Link>
              </div>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden cursor-pointer p-2 hover:bg-gold-pale rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <nav
        id="mobile-navigation"
        className={`md:hidden overflow-hidden transition-all duration-300 border-t border-gray-300 ${
          isMobileMenuOpen ? 'max-h-screen' : 'max-h-0'
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="py-4 px-4 space-y-4 bg-white-warm">
          <Link href="/" className="block nav-link" onClick={() => setIsMobileMenuOpen(false)}>
            Home
          </Link>

          {/* Texas */}
          <div className="space-y-2">
            <Link href="/texas" className="block nav-link font-bold" onClick={() => setIsMobileMenuOpen(false)}>
              Texas
            </Link>
            <Link href="/texas/austin" className="block nav-link pl-4 text-gray-600" onClick={() => setIsMobileMenuOpen(false)}>
              → Austin
            </Link>
          </div>

          {/* California */}
          <div className="space-y-2">
            <Link href="/california" className="block nav-link font-bold" onClick={() => setIsMobileMenuOpen(false)}>
              California
            </Link>
            <Link href="/california/los-angeles" className="block nav-link pl-4 text-gray-600" onClick={() => setIsMobileMenuOpen(false)}>
              → Los Angeles
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
