/**
 * IndexNow Integration for Inkdex
 *
 * Notifies Bing and Yandex when content changes via the IndexNow protocol.
 * Supports batch submissions (up to 10,000 URLs per request).
 *
 * @see https://www.indexnow.org/documentation
 */

import { createClient } from '@/lib/supabase/server'

const INDEXNOW_ENDPOINTS = {
  bing: 'https://www.bing.com/indexnow',
  yandex: 'https://yandex.com/indexnow',
} as const

type IndexNowEngine = keyof typeof INDEXNOW_ENDPOINTS | 'all'

export interface IndexNowResult {
  engine: string
  success: boolean
  status?: number
  message?: string
  urlCount: number
}

export interface IndexNowSubmission {
  urls: string[]
  engine: IndexNowEngine
  triggerSource: string
  triggeredBy?: string
}

/**
 * Get the IndexNow key from environment
 */
function getIndexNowKey(): string {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    throw new Error('INDEXNOW_KEY environment variable is not set')
  }
  return key
}

/**
 * Get the base URL for the site
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'
}

/**
 * Submit URLs to a specific IndexNow endpoint with retry logic
 */
async function submitToEndpoint(
  urls: string[],
  engine: keyof typeof INDEXNOW_ENDPOINTS,
  maxRetries: number = 3
): Promise<IndexNowResult> {
  const key = getIndexNowKey()
  const host = new URL(getBaseUrl()).host
  const endpoint = INDEXNOW_ENDPOINTS[engine]

  let lastError: string | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host,
          key,
          keyLocation: `${getBaseUrl()}/${key}.txt`,
          urlList: urls,
        }),
      })

      // IndexNow returns 200/202 for success, 400/403/422 for errors
      const success = response.status >= 200 && response.status < 300

      // Don't retry on client errors (4xx) - these won't change
      if (response.status >= 400 && response.status < 500) {
        return {
          engine,
          success: false,
          status: response.status,
          message: await response.text(),
          urlCount: urls.length,
        }
      }

      if (success) {
        return {
          engine,
          success,
          status: response.status,
          message: 'Submitted successfully',
          urlCount: urls.length,
        }
      }

      // Server error (5xx) - retry
      lastError = `HTTP ${response.status}: ${await response.text()}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Wait before retry (exponential backoff: 1s, 2s, 4s)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
    }
  }

  return {
    engine,
    success: false,
    message: `Failed after ${maxRetries} retries: ${lastError}`,
    urlCount: urls.length,
  }
}

/**
 * Log submission to database for auditing
 */
async function logSubmission(
  submission: IndexNowSubmission,
  results: IndexNowResult[]
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('indexnow_submissions').insert({
      urls: submission.urls,
      url_count: submission.urls.length,
      engine: submission.engine,
      trigger_source: submission.triggerSource,
      triggered_by: submission.triggeredBy || 'system',
      response_status: results[0]?.status,
      response_body: results,
    })
  } catch (error) {
    // Log but don't fail - submission tracking is non-critical
    console.error('[IndexNow] Failed to log submission:', error)
  }
}

/**
 * Validate that URLs belong to this domain
 */
function validateUrls(urls: string[]): { valid: string[]; filtered: number } {
  const baseUrl = getBaseUrl()
  const domain = new URL(baseUrl).hostname

  const valid = urls.filter((url) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname === domain
    } catch {
      return false
    }
  })

  return { valid, filtered: urls.length - valid.length }
}

/**
 * Submit URLs to IndexNow
 *
 * @param urls - Array of full URLs to submit (must be from this domain)
 * @param engine - Target engine(s): 'bing', 'yandex', or 'all'
 * @param triggerSource - What triggered this submission (for logging)
 * @param triggeredBy - Who triggered this (admin email or 'system')
 */
export async function submitToIndexNow(
  urls: string[],
  engine: IndexNowEngine = 'all',
  triggerSource: string = 'manual',
  triggeredBy?: string
): Promise<IndexNowResult[]> {
  if (urls.length === 0) {
    return []
  }

  // Validate URLs belong to this domain (security: prevent submitting external URLs)
  const { valid: validUrls, filtered } = validateUrls(urls)

  if (validUrls.length === 0) {
    console.warn('[IndexNow] No valid URLs from this domain provided')
    return []
  }

  if (filtered > 0) {
    console.warn(`[IndexNow] Filtered out ${filtered} external/invalid URLs`)
  }

  // IndexNow supports up to 10,000 URLs per request
  const MAX_URLS = 10000
  const urlsToSubmit = validUrls.slice(0, MAX_URLS)

  if (validUrls.length > MAX_URLS) {
    console.warn(`[IndexNow] Truncated ${validUrls.length} URLs to ${MAX_URLS}`)
  }

  const results: IndexNowResult[] = []

  if (engine === 'all') {
    // Submit to both Bing and Yandex in parallel
    const [bingResult, yandexResult] = await Promise.all([
      submitToEndpoint(urlsToSubmit, 'bing'),
      submitToEndpoint(urlsToSubmit, 'yandex'),
    ])
    results.push(bingResult, yandexResult)
  } else {
    const result = await submitToEndpoint(urlsToSubmit, engine)
    results.push(result)
  }

  // Log to database
  await logSubmission(
    { urls: urlsToSubmit, engine, triggerSource, triggeredBy },
    results
  )

  return results
}

/**
 * Notify IndexNow about newly created artists
 *
 * @param artistSlugs - Array of artist slugs that were created
 */
export async function notifyArtistCreated(
  artistSlugs: string[]
): Promise<IndexNowResult[]> {
  if (artistSlugs.length === 0) return []

  const baseUrl = getBaseUrl()
  const urls = artistSlugs.map((slug) => `${baseUrl}/artist/${slug}`)

  console.log(`[IndexNow] Notifying about ${urls.length} new artists`)

  return submitToIndexNow(urls, 'all', 'artist_created')
}

/**
 * Notify IndexNow about a newly launched city
 *
 * @param citySlug - City slug (e.g., 'austin')
 * @param stateSlug - State slug (e.g., 'texas')
 * @param styleSlags - Optional array of style slugs to include
 */
export async function notifyCityLaunched(
  citySlug: string,
  stateSlug: string,
  styleSlugs?: string[]
): Promise<IndexNowResult[]> {
  const baseUrl = getBaseUrl()
  const urls: string[] = []

  // City page
  urls.push(`${baseUrl}/${stateSlug}/${citySlug}`)

  // Style pages for this city
  if (styleSlugs && styleSlugs.length > 0) {
    for (const style of styleSlugs) {
      urls.push(`${baseUrl}/${stateSlug}/${citySlug}/${style}`)
    }
  }

  // Guide page (if guides feature is enabled)
  urls.push(`${baseUrl}/guides/${citySlug}`)

  console.log(`[IndexNow] Notifying about city launch: ${citySlug} (${urls.length} URLs)`)

  return submitToIndexNow(urls, 'all', 'city_launched')
}

/**
 * Notify IndexNow about updated content
 *
 * @param urls - Full URLs that were updated
 */
export async function notifyContentUpdated(
  urls: string[]
): Promise<IndexNowResult[]> {
  if (urls.length === 0) return []

  console.log(`[IndexNow] Notifying about ${urls.length} content updates`)

  return submitToIndexNow(urls, 'all', 'content_updated')
}

/**
 * Get recent IndexNow submissions for admin dashboard
 */
export async function getRecentSubmissions(limit: number = 20): Promise<{
  submissions: Array<{
    id: string
    submitted_at: string
    url_count: number
    engine: string
    trigger_source: string
    response_status: number | null
    triggered_by: string
  }>
  stats: {
    total: number
    last24h: number
    successRate: number
  }
}> {
  const supabase = await createClient()

  // Get recent submissions
  const { data: submissions } = await supabase
    .from('indexnow_submissions')
    .select('id, submitted_at, url_count, engine, trigger_source, response_status, triggered_by')
    .order('submitted_at', { ascending: false })
    .limit(limit)

  // Get stats
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const { count: total } = await supabase
    .from('indexnow_submissions')
    .select('*', { count: 'exact', head: true })

  const { count: last24h } = await supabase
    .from('indexnow_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', oneDayAgo.toISOString())

  const { count: successful } = await supabase
    .from('indexnow_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('response_status', 200)
    .lt('response_status', 300)

  const successRate = total && total > 0 ? ((successful || 0) / total) * 100 : 100

  return {
    submissions: submissions || [],
    stats: {
      total: total || 0,
      last24h: last24h || 0,
      successRate: Math.round(successRate),
    },
  }
}
