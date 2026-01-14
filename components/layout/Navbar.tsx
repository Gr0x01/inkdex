'use client'

import Link from 'next/link'
import { useState, useMemo, useRef, useEffect } from 'react'
import { CITIES, type City } from '@/lib/constants/cities'
import { buildCityUrl } from '@/lib/utils/city-helpers'
import NavbarSearch from '@/components/layout/NavbarSearch'
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
 * Shared city link component for consistency between desktop and mobile
 */
function CityLink({
  city,
  onClick,
  className = "editorial-dropdown-item group"
}: {
  city: City
  onClick?: () => void
  className?: string
}) {
  return (
    <Link
      key={city.slug}
      href={buildCityUrl(city.state, city.slug)}
      className={className}
      role="menuitem"
      onClick={onClick}
    >
      <span className="font-semibold">{city.name}</span>
      <span className="font-mono text-xs font-medium text-gray-400 ml-1.5 group-hover:text-gray-600 transition-colors">
        {city.state}
      </span>
    </Link>
  )
}

/**
 * Global navigation header - Editorial Magazine Masthead
 * Design: "Inkdex v2.0" - Refined editorial aesthetic
 * Features: Magazine-style masthead + sophisticated dropdown + global search + user menu
 */
export default function Navbar({ user = null, isPro = false, artistSlug = null }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)

  // Get navbar visibility from context (shared with other sticky elements)
  const { isNavbarHidden, isCompact: _isCompact } = useNavbarVisibility()

  // Memoize sorted cities - only compute once
  const sortedCities = useMemo(
    () => [...CITIES].sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  // Handle dropdown keyboard navigation
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsDropdownOpen(!isDropdownOpen)
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false)
      dropdownButtonRef.current?.focus()
    }
  }

  // Close mobile menu and return focus
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    mobileMenuButtonRef.current?.focus()
  }

  return (
    <header
      className={`navbar-sticky bg-paper border-b-2 border-ink/10 ${isNavbarHidden ? 'navbar-hidden' : ''}`}
      data-navbar-hidden={isNavbarHidden}
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
            {/* Browse Dropdown - Editorial */}
            <div className="relative" ref={dropdownRef}>
              <button
                ref={dropdownButtonRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onKeyDown={handleDropdownKeyDown}
                className="editorial-nav-link flex items-center gap-2 cursor-pointer relative"
                aria-label="Browse cities"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <span className="relative z-10">Browse</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-medium ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
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
              <div
                className={`editorial-dropdown-menu ${isDropdownOpen ? 'editorial-dropdown-menu-open' : ''}`}
                role="menu"
              >
                {/* Decorative top border */}
                <div className="absolute top-0 left-4 right-4 h-[2px] bg-linear-to-r from-transparent via-ink/30 to-transparent" aria-hidden="true" />

                <div className="p-1">
                  {/* Flat Alphabetical City List */}
                  {sortedCities.map((city) => (
                    <CityLink
                      key={city.slug}
                      city={city}
                      onClick={() => setIsDropdownOpen(false)}
                    />
                  ))}
                </div>
              </div>
            </div>

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
          {/* Mobile Search Bar - Only show on mobile, hidden at md+ where navbar search appears */}
          <div className="relative z-10 md:hidden mb-2">
            <NavbarSearch />
          </div>

          {/* Browse Cities Section */}
          <div className="relative z-10">
            <div className="editorial-mobile-link font-bold text-gray-900 cursor-default">
              Browse Cities
            </div>
            <div className="pl-2">
              {sortedCities.map((city) => (
                <CityLink
                  key={city.slug}
                  city={city}
                  className="block editorial-mobile-link text-gray-600 hover:text-ink transition-colors text-sm"
                  onClick={closeMobileMenu}
                />
              ))}
            </div>
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
