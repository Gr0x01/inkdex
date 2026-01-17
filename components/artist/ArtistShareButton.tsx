'use client'

import { useState, useMemo, useCallback } from 'react'
import { Share2, Check } from 'lucide-react'

interface ArtistShareButtonProps {
  artistSlug: string
  artistHandle: string | null
  artistName: string
  city?: string | null
}

/**
 * Sanitize text for sharing - removes characters that could cause issues
 */
function sanitizeForShare(text: string): string {
  return text.replace(/[<>"'&]/g, '').trim()
}

/**
 * ArtistShareButton - Inkdex Design System
 *
 * Full-width CTA button matching the artist profile button aesthetic.
 * Sharp edges, mono typography, border-2 border-ink style.
 */
export default function ArtistShareButton({
  artistSlug,
  artistHandle,
  artistName,
  city,
}: ArtistShareButtonProps) {
  const [copied, setCopied] = useState(false)

  // Memoize sanitized share content
  const { url, title, text } = useMemo(() => {
    const shareUrl = `https://inkdex.io/artist/${encodeURIComponent(artistSlug)}`
    const safeName = sanitizeForShare(artistName)
    const safeHandle = artistHandle ? sanitizeForShare(artistHandle) : null
    const safeCity = city ? sanitizeForShare(city) : null

    const displayName = safeHandle ? `@${safeHandle}` : safeName
    const locationText = safeCity ? ` in ${safeCity}` : ''

    return {
      url: shareUrl,
      title: `${displayName} - Tattoo Artist${locationText} | Inkdex`,
      text: `Check out ${displayName}'s tattoo portfolio${locationText} on Inkdex`,
    }
  }, [artistSlug, artistHandle, artistName, city])

  const handleShare = useCallback(async () => {
    // Try Web Share API first (mainly mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [url, title, text])

  return (
    <button
      onClick={handleShare}
      className="group relative w-full py-2.5 border-2 border-gray-300 hover:border-ink hover:bg-ink font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2"
      aria-label={`Share ${artistHandle ? `@${artistHandle}` : artistName}'s profile`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
          <span className="text-success">Copied</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-paper transition-colors duration-200" strokeWidth={1.5} />
          <span className="text-gray-500 group-hover:text-paper transition-colors duration-200">Share</span>
        </>
      )}
    </button>
  )
}
