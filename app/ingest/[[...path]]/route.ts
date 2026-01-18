import { NextRequest } from 'next/server'

// Using Node.js runtime - edge runtime has fetch issues in local dev
export const runtime = 'nodejs'

const POSTHOG_HOST = 'https://us.i.posthog.com'
const POSTHOG_ASSETS_HOST = 'https://us-assets.i.posthog.com'
const ALLOWED_ORIGINS = ['https://inkdex.io', 'https://www.inkdex.io']
const ALLOWED_PATH_PREFIXES = ['/static', '/e', '/decide', '/capture', '/batch', '/i', '/s']
const REQUEST_TIMEOUT_MS = 10000

function getCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin
  }
  // Allow localhost in development
  if (process.env.NODE_ENV !== 'production' && origin?.includes('localhost')) {
    return origin
  }
  return null
}

async function handler(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/ingest/, '')

  // SSRF protection: validate path
  if (path.includes('..') || path.includes('//')) {
    return new Response('Invalid path', { status: 400 })
  }

  // Only allow known PostHog paths
  const isAllowedPath =
    path === '' || ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
  if (!isAllowedPath) {
    return new Response('Forbidden', { status: 403 })
  }

  // Use assets host for static files
  const host = path.startsWith('/static') ? POSTHOG_ASSETS_HOST : POSTHOG_HOST
  const url = `${host}${path}${request.nextUrl.search}`

  // Get client IP from Vercel headers (first IP in chain is the real client)
  const clientIP =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'

  // Clone headers and add/update forwarding headers
  const headers = new Headers(request.headers)
  headers.set('host', new URL(host).hostname)
  headers.set('x-forwarded-for', clientIP)
  headers.set('x-real-ip', clientIP)

  // Remove sensitive/problematic headers
  headers.delete('connection')
  headers.delete('cookie')
  headers.delete('authorization')

  // Set up timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: request.method,
      headers,
      signal: controller.signal,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.blob()
          : undefined,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    // PostHog unreachable - fail silently for analytics (don't break user experience)
    console.error('[PostHog Proxy] Fetch failed:', error)
    return new Response(null, { status: 502 })
  }
  clearTimeout(timeoutId)

  // Return response with CORS headers
  const responseHeaders = new Headers(response.headers)
  const corsOrigin = getCorsOrigin(request)
  if (corsOrigin) {
    responseHeaders.set('access-control-allow-origin', corsOrigin)
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  })
}

// Handle CORS preflight locally for faster response
export async function OPTIONS(request: NextRequest) {
  const corsOrigin = getCorsOrigin(request)
  return new Response(null, {
    status: 204,
    headers: {
      ...(corsOrigin && { 'access-control-allow-origin': corsOrigin }),
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
      'access-control-max-age': '86400',
    },
  })
}

export const GET = handler
export const POST = handler
