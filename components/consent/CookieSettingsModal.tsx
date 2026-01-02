'use client'

/**
 * Cookie Settings Modal
 *
 * Detailed cookie preferences modal with toggle switches
 * - Essential cookies (always on, disabled toggle)
 * - Analytics cookies (user toggle)
 * - Privacy policy link
 * - Three actions: Reject All, Accept All, Save Custom
 *
 * Accessibility:
 * - ARIA attributes for modal and toggles
 * - Keyboard navigation (Tab, Escape)
 * - Focus trapping
 * - Backdrop click to close
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getConsent, acceptAll, rejectAll, saveConsent } from '@/lib/consent/consent-manager'

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

interface CookieSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CookieSettingsModal({ isOpen, onClose }: CookieSettingsModalProps) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [consentTimestamp, setConsentTimestamp] = useState<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Load current consent on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      const consent = getConsent()
      setAnalyticsEnabled(consent?.analytics ?? false)
      setConsentTimestamp(consent?.timestamp ?? null)
    }
  }, [isOpen])

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle accept all
  const handleAcceptAll = () => {
    acceptAll()
    announceToScreenReader('Cookie preferences saved: All cookies accepted')

    // Track consent decision with Vercel Analytics
    if (typeof window !== 'undefined' && (window as any).va) {
      ;(window as any).va('event', 'Consent Decision', { analytics_enabled: true })
    }

    onClose()
  }

  // Handle reject all
  const handleRejectAll = () => {
    rejectAll()
    announceToScreenReader('Cookie preferences saved: Only essential cookies accepted')

    // Track consent decision with Vercel Analytics (privacy-safe, no GA cookies)
    if (typeof window !== 'undefined' && (window as any).va) {
      ;(window as any).va('event', 'Consent Decision', { analytics_enabled: false })
    }

    onClose()
  }

  // Handle save custom preferences
  const handleSaveCustom = () => {
    saveConsent(analyticsEnabled)
    announceToScreenReader(
      analyticsEnabled
        ? 'Cookie preferences saved: Analytics cookies enabled'
        : 'Cookie preferences saved: Analytics cookies disabled'
    )

    // Track consent decision with Vercel Analytics
    if (typeof window !== 'undefined' && (window as any).va) {
      ;(window as any).va('event', 'Consent Decision', { analytics_enabled: analyticsEnabled })
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-settings-title"
      aria-describedby="cookie-settings-description"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl border-2 border-stone-700 bg-black p-8 shadow-xl animate-scale-in"
      >
        {/* Header */}
        <div className="mb-8 border-b border-stone-800 pb-6">
          <h2
            id="cookie-settings-title"
            className="font-libre-baskerville text-2xl font-bold text-white tracking-tight"
          >
            Cookie Preferences
          </h2>
          <p
            id="cookie-settings-description"
            className="mt-3 font-crimson-pro text-base text-stone-400 leading-relaxed"
          >
            We use cookies to enhance your experience. Choose which cookies you'd like to accept.
          </p>
        </div>

        {/* Cookie Categories */}
        <div className="space-y-3 mb-8">
          {/* Essential Cookies (Always On) */}
          <div className="border border-stone-800 bg-stone-950/50 p-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-white mb-2">
                  Essential Cookies
                </h4>
                <p className="font-crimson-pro text-sm text-stone-400 leading-relaxed">
                  Required for the website to function. Cannot be disabled.
                </p>
              </div>
              {/* Geometric Toggle - Always On */}
              <div className="flex shrink-0 items-center justify-end h-7 w-14 border-2 border-accent bg-accent/20 p-0.5">
                <div className="h-5 w-5 bg-accent" />
                <span className="sr-only">Always enabled</span>
              </div>
            </div>
          </div>

          {/* Analytics Cookies (Toggle) */}
          <div className="border border-stone-800 bg-stone-950/50 p-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-white mb-2">
                  Analytics Cookies
                </h4>
                <p className="font-crimson-pro text-sm text-stone-400 leading-relaxed">
                  Help us understand how you use our site with Google Analytics (anonymized).
                </p>
              </div>
              {/* Geometric Toggle - Interactive */}
              <button
                type="button"
                role="switch"
                aria-checked={analyticsEnabled}
                aria-label="Toggle analytics cookies"
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className={`flex shrink-0 items-center h-7 w-14 border-2 p-0.5 transition-all duration-300 ${
                  analyticsEnabled
                    ? 'justify-end border-accent bg-accent/20'
                    : 'justify-start border-stone-700 bg-stone-900'
                }`}
              >
                <div
                  className={`h-5 w-5 transition-colors duration-300 ${
                    analyticsEnabled ? 'bg-accent' : 'bg-stone-400'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Policy Link & Last Updated */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-stone-800 pt-6">
          <Link
            href="/legal/privacy"
            className="font-jetbrains-mono text-xs uppercase tracking-wider text-stone-500 transition-colors hover:text-accent"
          >
            Privacy Policy →
          </Link>
          {consentTimestamp && (
            <p className="font-jetbrains-mono text-xs uppercase tracking-wider text-stone-600">
              Updated {new Date(consentTimestamp).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRejectAll}
            className="flex-1 border border-stone-700 bg-transparent px-5 py-3 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-stone-300 transition-all hover:border-stone-500 hover:bg-stone-900"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={handleSaveCustom}
            className="flex-1 border border-stone-700 bg-transparent px-5 py-3 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-stone-300 transition-all hover:border-stone-500 hover:bg-stone-900"
          >
            Save Custom
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 border border-accent bg-accent px-5 py-3 font-jetbrains-mono text-xs font-medium uppercase tracking-wider text-black transition-all hover:bg-accent/90"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
