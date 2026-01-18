'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import NavbarSearch from '@/components/layout/NavbarSearch'
import NavbarLocationSelect from '@/components/layout/NavbarLocationSelect'
import { NavbarUserMenu, NavbarUserMenuMobile } from '@/components/layout/NavbarUserMenu'
import { useNavbarVisibility } from '@/components/layout/NavbarContext'

interface NavbarUser {
  id: string
  avatar_url: string | null
  instagram_username: string | null
}

interface NavbarProps {
  user?: NavbarUser | null
  isPro?: boolean
  artistSlug?: string | null
}

/**
 * Global navigation header - Editorial Magazine Masthead
 * Design: "Inkdex v2.0" - Refined editorial aesthetic
 * Features: Magazine-style masthead + sophisticated dropdown + global search + user menu
 */
export default function Navbar({ user = null, isPro = false, artistSlug = null }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)

  // Get navbar visibility from context (shared with other sticky elements)
  const { isNavbarHidden, isCompact: _isCompact } = useNavbarVisibility()

  // Close mobile menu and return focus
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    mobileMenuButtonRef.current?.focus()
  }

  return (
    <header
      className={`navbar-sticky bg-paper border-b-2 border-ink/10 ${isNavbarHidden && !isMobileMenuOpen ? 'navbar-hidden' : ''}`}
      data-navbar-hidden={isNavbarHidden && !isMobileMenuOpen}
    >
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-linear-to-r from-transparent via-ink/20 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-3 md:gap-6 relative h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 group relative z-10 shrink-0">
            <div className="font-display font-black text-ink tracking-tight leading-none group-hover:tracking-wide transition-all duration-300 text-2xl md:text-3xl">
              INKDEX
            </div>
            <span className="font-mono font-bold text-ink uppercase tracking-[0.15em] border border-ink leading-none text-[0.4rem] px-1 py-0.5 md:text-[0.5rem] md:px-1.5">
              Beta
            </span>
          </Link>

          {/* Search Bar - Desktop Only */}
          <div className="hidden md:block flex-1 max-w-2xl min-w-0">
            <NavbarSearch />
          </div>

          {/* Desktop Navigation - Editorial Style */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 shrink-0" aria-label="Main navigation">
            {/* Browse Locations - Searchable Select */}
            <NavbarLocationSelect variant="desktop" />

            {/* Add Artist Link */}
            <Link
              href="/add-artist"
              className="editorial-nav-link relative group"
            >
              <span className="relative z-10">Add Artist</span>
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-left" />
            </Link>

            {/* User Menu / Login */}
            <NavbarUserMenu user={user} isPro={isPro} artistSlug={artistSlug} />
          </nav>

          {/* Mobile Actions (Menu Toggle Only) */}
          <div className="lg:hidden flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="cursor-pointer p-1 transition-all duration-fast active:scale-95"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <svg
                className="w-5 h-5 text-ink"
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
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-ink/10 to-transparent" aria-hidden="true" />

      {/* Mobile Menu - Editorial */}
      <nav
        id="mobile-navigation"
        className={`lg:hidden overflow-hidden transition-all duration-medium border-t-2 border-ink/10 ${
          isMobileMenuOpen ? 'max-h-screen' : 'max-h-0'
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="py-3 px-4 bg-paper relative">
          {/* Browse Locations - Searchable Select */}
          <div className="relative z-10 mb-4">
            <div className="editorial-mobile-link font-bold text-gray-900 mb-2">
              Browse Locations
            </div>
            <NavbarLocationSelect variant="mobile" onNavigate={closeMobileMenu} />
          </div>

          {/* Add Artist Link */}
          <div className="relative z-10 mb-4">
            <Link
              href="/add-artist"
              className="editorial-mobile-link font-bold text-ink hover:text-gray-700 transition-colors block"
              onClick={closeMobileMenu}
            >
              Add Artist →
            </Link>
          </div>

          {/* User Menu - At Bottom */}
          <div className="relative z-10 pt-3 border-t border-gray-200">
            <NavbarUserMenuMobile user={user} isPro={isPro} artistSlug={artistSlug} onNavigate={closeMobileMenu} />
          </div>
        </div>
      </nav>
    </header>
  )
}
