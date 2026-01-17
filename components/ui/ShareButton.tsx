'use client'

import { useState, useCallback } from 'react'
import { Share2, Check } from 'lucide-react'

interface ShareButtonProps {
  url: string
  title: string
  text: string
  /** Optional: className overrides */
  className?: string
  /** Optional: button variant - 'default' for full button, 'minimal' for icon-only */
  variant?: 'default' | 'minimal'
}

/**
 * ShareButton - Inkdex Design System
 *
 * Editorial minimal aesthetic with sharp edges.
 * Uses Web Share API on mobile, clipboard fallback on desktop.
 */
export default function ShareButton({
  url,
  title,
  text,
  className = '',
  variant = 'default',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

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

  // Minimal variant - just the icon with ink aesthetic
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleShare}
        className={`group relative p-2 border border-gray-300 hover:border-ink hover:bg-ink transition-all duration-200 ${className}`}
        aria-label="Share this content"
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" strokeWidth={2.5} />
        ) : (
          <Share2 className="w-4 h-4 text-gray-500 group-hover:text-paper transition-colors duration-200" strokeWidth={1.5} />
        )}

        {/* Tooltip */}
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-ink text-paper font-mono text-[10px] uppercase tracking-wider whitespace-nowrap">
            Copied
          </span>
        )}
      </button>
    )
  }

  // Default variant - full button matching Inkdex CTA style
  return (
    <button
      onClick={handleShare}
      className={`group relative flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:border-ink hover:bg-ink font-mono text-xs font-medium tracking-wider uppercase transition-all duration-200 ${className}`}
      aria-label="Share this content"
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
