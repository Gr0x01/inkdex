'use client'

import { useState } from 'react'
import { capturePostHog } from '@/lib/analytics/posthog'
import { EVENTS } from '@/lib/analytics/events'

interface ClaimProfileButtonProps {
  artistId: string
  artistSlug: string
  artistName: string
  instagramHandle: string
  verificationStatus: string
}

export default function ClaimProfileButton({
  artistId,
  artistSlug,
  artistName: _artistName,
  instagramHandle,
  verificationStatus,
}: ClaimProfileButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Don't show if already claimed
  if (verificationStatus !== 'unclaimed') {
    return null
  }

  const handleClaim = () => {
    setIsLoading(true)

    // Track claim started event
    capturePostHog(EVENTS.CLAIM_STARTED, {
      artist_id: artistId,
      artist_slug: artistSlug,
      source_page: typeof window !== 'undefined' ? window.location.pathname : '/artist',
    })

    // Redirect to OAuth with claim context
    const redirectPath = `/claim/verify?artist_id=${artistId}`
    window.location.href = `/api/auth/instagram?redirect=${encodeURIComponent(redirectPath)}`
  }

  return (
    <div className="pt-4 border-t border-gray-200">
      <button
        onClick={handleClaim}
        disabled={isLoading}
        className="w-full py-2.5 bg-featured text-ink text-center font-mono text-xs font-semibold tracking-widest uppercase transition-all duration-200 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-ink"
      >
        {isLoading ? 'Redirecting...' : 'Claim This Page →'}
      </button>
      <p className="mt-2 text-center font-mono text-xs font-normal text-gray-500">
        Are you @{instagramHandle.replace('@', '')}?
      </p>
    </div>
  )
}
