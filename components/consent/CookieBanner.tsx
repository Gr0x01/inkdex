'use client'

/**
 * Cookie Consent Banner
 *
 * Bottom banner shown on first visit (if no consent exists)
 * - Two buttons: Customize, Accept All
 * - Privacy policy link
 * - Slide-up animation on mount
 * - Auto-hides if DNT enabled or consent already given
 * - Reject All option available in Customize modal
 *
 * GDPR Compliance:
 * - Explicit opt-in required (default: no analytics)
 * - Clear information about cookies
 * - Link to privacy policy
 * - Easy to reject all (via Customize modal)
 *
 * Accessibility:
 * - ARIA dialog attributes
 * - Keyboard navigation
 * - Screen reader friendly
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { needsConsentBanner, acceptAll, CONSENT_CHANGE_EVENT } from '@/lib/consent/consent-manager'
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
        className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-stone-800 bg-black animate-slide-up"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            {/* Content */}
            <div className="flex-1">
              <h3
                id="cookie-banner-title"
                className="font-libre-baskerville text-lg font-bold text-white tracking-tight"
              >
                We Value Your Privacy
              </h3>
              <p
                id="cookie-banner-description"
                className="mt-2 font-crimson-pro text-base text-stone-400 leading-relaxed"
              >
                We use cookies to enhance your experience and analyze site usage with Google Analytics.{' '}
                <Link
                  href="/legal/privacy"
                  className="text-stone-300 underline decoration-stone-600 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
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
                className="border border-stone-700 bg-transparent px-5 py-2.5 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-stone-300 transition-all hover:border-stone-500 hover:bg-stone-900"
              >
                Customize
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="border border-accent bg-accent px-5 py-2.5 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-black transition-all hover:bg-accent/90"
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
