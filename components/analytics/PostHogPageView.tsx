'use client'

/**
 * PostHog Pageview Tracker
 *
 * Manually captures pageviews on client-side navigation.
 * Required for Next.js App Router since automatic capture only works
 * on initial page load, not subsequent client-side navigations.
 *
 * This component should be included in the root layout, wrapped by PostHogProvider.
 *
 * Performance optimization:
 * - Uses custom usePostHogInstance hook instead of posthog-js/react
 * - This avoids bundling posthog-js (~80KB) in the initial bundle
 */

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { usePostHogInstance } from './PostHogProvider'

function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHogInstance()

  useEffect(() => {
    // Skip if posthog not ready or no pathname
    if (!posthog || !pathname) return

    // Exclude admin pages from analytics
    if (pathname.startsWith('/admin')) return

    // Build full URL for accurate tracking
    let url = window.origin + pathname
    const search = searchParams.toString()
    if (search) {
      url += `?${search}`
    }

    // Capture the pageview with full URL
    posthog.capture('$pageview', {
      $current_url: url,
    })
  }, [pathname, searchParams, posthog])

  return null
}

/**
 * PostHogPageView wrapped in Suspense
 *
 * useSearchParams() requires Suspense boundary in Next.js App Router
 * to avoid client-side rendering issues during static generation.
 */
export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  )
}
