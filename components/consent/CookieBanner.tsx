'use client'

/**
 * Cookie Consent Banner
 *
 * Bottom banner shown on first visit (if no consent exists)
 * - Three buttons: Customize, Reject All, Accept All
 * - Privacy policy link
 * - Slide-up animation on mount
 * - Auto-hides if DNT enabled or consent already given
 *
 * GDPR Compliance:
 * - Explicit opt-in required (default: no analytics)
 * - Clear information about cookies
 * - Link to privacy policy
 * - Easy to reject all
 *
 * Accessibility:
 * - ARIA dialog attributes
 * - Keyboard navigation
 * - Screen reader friendly
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { needsConsentBanner, acceptAll, rejectAll, CONSENT_CHANGE_EVENT } from '@/lib/consent/consent-manager'
import { CookieSettingsModal } from './CookieSettingsModal'

/**
 * Announce to screen readers (ARIA live region)
 */
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => announcement.remove(), 1000)
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Check if banner should show on mount
  useEffect(() => {
    setShowBanner(needsConsentBanner())

    // Listen for consent changes (from other tabs or components)
    const handleConsentChange = () => {
      setShowBanner(needsConsentBanner())
    }

    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange)
    window.addEventListener('storage', handleConsentChange)

    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange)
      window.removeEventListener('storage', handleConsentChange)
    }
  }, [])

  // Handle accept all
  const handleAcceptAll = () => {
    acceptAll()
    announceToScreenReader('Cookie preferences saved: All cookies accepted')

    // Track consent decision with Vercel Analytics
    if (typeof window !== 'undefined' && (window as any).va) {
      ;(window as any).va('event', 'Consent Decision', { analytics_enabled: true })
    }

    setShowBanner(false)
  }

  // Handle reject all
  const handleRejectAll = () => {
    rejectAll()
    announceToScreenReader('Cookie preferences saved: Only essential cookies accepted')

    // Track consent decision with Vercel Analytics (privacy-safe, no GA cookies)
    if (typeof window !== 'undefined' && (window as any).va) {
      ;(window as any).va('event', 'Consent Decision', { analytics_enabled: false })
    }

    setShowBanner(false)
  }

  // Handle customize
  const handleCustomize = () => {
    setShowModal(true)
  }

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false)
    // Re-check if banner should still show
    setShowBanner(needsConsentBanner())
  }

  if (!showBanner) return null

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-800 bg-black animate-slide-up"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Content */}
            <div className="flex-1">
              <h3
                id="cookie-banner-title"
                className="font-libre-baskerville text-lg font-bold text-white"
              >
                We Value Your Privacy
              </h3>
              <p
                id="cookie-banner-description"
                className="mt-1 font-crimson-pro text-sm text-stone-400"
              >
                We use cookies to enhance your experience and analyze site usage with Google Analytics.{' '}
                <Link
                  href="/legal/privacy"
                  className="underline transition-colors hover:text-accent"
                >
                  Learn more
                </Link>
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row md:flex-shrink-0">
              <button
                type="button"
                onClick={handleCustomize}
                className="rounded-md border border-stone-700 bg-transparent px-4 py-2 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-stone-300 transition-colors hover:bg-stone-800"
              >
                Customize
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="rounded-md bg-stone-800 px-4 py-2 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-stone-300 transition-colors hover:bg-stone-700"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-md bg-accent px-4 py-2 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-black transition-opacity hover:opacity-90"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      <CookieSettingsModal isOpen={showModal} onClose={handleModalClose} />
    </>
  )
}
