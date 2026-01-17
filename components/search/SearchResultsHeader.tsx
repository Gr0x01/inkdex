'use client'

import { useState, useEffect, useMemo } from 'react'
import ShareButton from '@/components/ui/ShareButton'

interface SearchResultsHeaderProps {
  totalCount: number
  queryText?: string | null
  cityFilter?: string | null
  regionFilter?: string | null
  countryFilter?: string | null
}

/**
 * SearchResultsHeader - Inkdex Design System
 *
 * Editorial minimal header showing result count with share action.
 * Sharp edges, mono typography, paper/ink aesthetic.
 */
export default function SearchResultsHeader({
  totalCount,
  queryText,
  cityFilter,
  regionFilter,
  countryFilter,
}: SearchResultsHeaderProps) {
  // Use state to avoid hydration mismatch with window.location
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href)
  }, [])

  // Memoize computed values
  const { locationText, artistWord, shareText, shareTitle } = useMemo(() => {
    const location = cityFilter
      ? ` in ${cityFilter}`
      : regionFilter
        ? ` in ${regionFilter}`
        : countryFilter
          ? ` in ${countryFilter}`
          : ''

    const word = totalCount === 1 ? 'artist' : 'artists'
    const queryPart = queryText ? `${queryText} ` : ''

    return {
      locationText: location,
      artistWord: word,
      shareText: `Found ${totalCount} ${queryPart}tattoo ${word}${location} on Inkdex`,
      shareTitle: `${queryPart}Tattoo Artists${location} | Inkdex`,
    }
  }, [totalCount, queryText, cityFilter, regionFilter, countryFilter])

  return (
    <div className="mb-8 flex items-center justify-between gap-6 border-b border-gray-200 pb-4">
      {/* Result count - editorial mono style */}
      <p className="font-mono text-xs tracking-wider text-gray-500 uppercase">
        <span className="font-semibold text-ink">{totalCount}</span>
        {' '}{artistWord} found{locationText}
      </p>

      {/* Share button - appears after URL is set client-side */}
      {shareUrl && (
        <ShareButton
          url={shareUrl}
          title={shareTitle}
          text={shareText}
          variant="default"
        />
      )}
    </div>
  )
}
