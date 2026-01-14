'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SearchError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Search page error:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-bg-primary relative noise-overlay flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center relative z-10">
        {/* Error Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-status-error/20 mb-8 border border-status-error/30">
          <svg
            className="w-10 h-10 text-status-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary mb-4">
          Something Went Wrong
        </h1>
        <p className="font-body text-base text-text-secondary mb-8 leading-relaxed">
          We encountered an error while loading your search results. This has
          been logged and we&apos;ll look into it.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-surface-mid border border-border-medium rounded-lg text-left">
            <p className="font-body text-xs text-status-error break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="font-body text-xs text-text-tertiary mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn btn-primary py-3 px-6"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="btn btn-secondary py-3 px-6"
          >
            New Search
          </Link>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top gradient orb */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-primary opacity-5 rounded-full blur-3xl" />
        {/* Bottom gradient orb */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-secondary opacity-5 rounded-full blur-3xl" />
      </div>
    </main>
  )
}
