'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { ProBadge } from '@/components/badges/ProBadge'

interface NavbarUserMenuProps {
  user: {
    id: string
    avatar_url: string | null
    instagram_username: string | null
  } | null
  isPro?: boolean
  artistSlug?: string | null
}

/**
 * Validate avatar URL to prevent malicious external URLs
 * Only allows URLs from trusted sources (Supabase, Instagram CDN)
 */
function isValidAvatarUrl(url: string | null): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const allowedHosts = [
      /\.supabase\.co$/,
      /\.cdninstagram\.com$/,
      /cdninstagram\.com$/,
      /\.fbcdn\.net$/,
    ]
    return allowedHosts.some(pattern => pattern.test(parsed.hostname))
  } catch {
    return false
  }
}

/**
 * NavbarUserMenu - User profile menu for logged in users
 *
 * Logged in: Shows avatar circle with green status dot, links to dashboard
 * Pro users: Shows crown badge next to avatar
 * Logged out: Shows "Log In" button
 */
export function NavbarUserMenu({ user, isPro = false, artistSlug = null }: NavbarUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }

  // Logged out state - show login link (matches other nav links)
  if (!user) {
    return (
      <Link
        href="/login"
        className="editorial-nav-link relative group"
      >
        <span className="relative z-10">Log In</span>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-left" />
      </Link>
    )
  }

  // Logged in state - show avatar with dropdown
  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/50 rounded-full"
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* Avatar with pro badge overlay */}
        <div className="relative">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={`${user.instagram_username || 'User'} profile picture`}
              width={44}
              height={44}
              priority
              unoptimized
              className="w-11 h-11 rounded-full object-cover border-2 border-ink/10 hover:border-ink/30 transition-colors"
            />
          ) : (
            // Fallback avatar with initials
            <div className="w-11 h-11 rounded-full bg-ink/10 flex items-center justify-center border-2 border-ink/10 hover:border-ink/30 transition-colors">
              <span className="font-mono text-base font-bold text-ink/60">
                {user.instagram_username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}

          {/* Pro badge in bottom-right corner */}
          {isPro && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-purple-600 rounded-full p-0.5 border-2 border-paper">
              <svg className="w-2.5 h-2.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
                <path d="M5 21h14" />
              </svg>
            </div>
          )}
        </div>
      </button>

      {/* Dropdown menu - Editorial Style */}
      <div
        className={`absolute right-0 top-full mt-2 w-52 bg-paper border border-ink/10 rounded shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        role="menu"
      >
        {/* User info header */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-body text-sm text-ink/70 truncate" style={{ textTransform: 'none' }}>
              @{user.instagram_username || 'user'}
            </span>
            {isPro && <ProBadge size="sm" variant="icon-only" className="shrink-0" />}
          </div>
        </div>

        {/* Menu items */}
        <div className="pb-2">
          <Link
            href="/dashboard"
            className="block px-4 py-2 font-body text-[15px] text-ink/80 hover:text-ink hover:bg-ink/4 transition-colors duration-150"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          {artistSlug && (
            <Link
              href={`/artist/${artistSlug}`}
              className="block px-4 py-2 font-body text-[15px] text-ink/80 hover:text-ink hover:bg-ink/4 transition-colors duration-150"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Portfolio
            </Link>
          )}
          <form action="/api/auth/logout" method="POST" className="w-full">
            <button
              type="submit"
              className="w-full text-left px-4 py-2 font-body text-[15px] text-ink/50 hover:text-red-600 hover:bg-red-50/50 transition-colors duration-150"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Log Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * Mobile version - simplified for mobile menu
 */
export function NavbarUserMenuMobile({ user, isPro = false, artistSlug = null, onNavigate }: NavbarUserMenuProps & { onNavigate?: () => void }) {
  // Logged out state
  if (!user) {
    return (
      <Link
        href="/login"
        className="editorial-mobile-link font-bold text-ink hover:text-gray-700 transition-colors border-b border-gray-200 pb-2 flex items-center gap-2"
        onClick={onNavigate}
      >
        Log In →
      </Link>
    )
  }

  // Logged in state
  return (
    <div>
      {/* User info */}
      <div className="flex items-center gap-3 mb-2">
        {isValidAvatarUrl(user.avatar_url) ? (
          <Image
            src={user.avatar_url}
            alt={`${user.instagram_username || 'User'} profile picture`}
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover border-2 border-ink/10"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center border-2 border-ink/10">
            <span className="font-mono text-sm font-bold text-ink/60">
              {user.instagram_username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-ink/80">
            @{user.instagram_username || 'user'}
          </span>
          {isPro && <ProBadge size="sm" variant="icon-only" />}
        </div>
      </div>

      {/* Mobile menu links */}
      <div className="pl-1">
        <Link
          href="/dashboard"
          className="block editorial-mobile-link text-ink hover:text-gray-700 transition-colors"
          onClick={onNavigate}
        >
          Dashboard
        </Link>
        {artistSlug && (
          <Link
            href={`/artist/${artistSlug}`}
            className="block editorial-mobile-link text-ink/70 hover:text-ink transition-colors"
            onClick={onNavigate}
          >
            Portfolio
          </Link>
        )}
        <form action="/api/auth/logout" method="POST" className="w-full">
          <button
            type="submit"
            className="w-full text-left editorial-mobile-link text-red-600 hover:text-red-700 transition-colors"
            onClick={onNavigate}
          >
            Log Out
          </button>
        </form>
      </div>
    </div>
  )
}
