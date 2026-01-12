'use client'

import { useEffect } from 'react'

/**
 * Tracks page load time for measuring time-to-first-search.
 * Sets a timestamp in sessionStorage when mounted on the homepage.
 * Only sets if not already set (preserves original landing time).
 */
export function PageLoadTracker() {
  useEffect(() => {
    // Only set if we don't already have a page load time
    // This preserves the original landing time for returning visitors
    if (!sessionStorage.getItem('inkdex_page_load_time')) {
      sessionStorage.setItem('inkdex_page_load_time', Date.now().toString())
    }
  }, [])

  return null
}
