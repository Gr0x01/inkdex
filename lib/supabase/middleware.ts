import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/config/env'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Block /dev routes in production
  if (
    process.env.NODE_ENV === 'production' &&
    pathname.startsWith('/dev')
  ) {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  // Skip auth check for public routes to improve performance
  const publicPaths = [
    '/',
    '/api/health',
    '/_next',
    '/favicon.ico',
  ]

  // Allow public access to city and artist pages (they're SEO pages)
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path)) ||
    pathname.match(/^\/(austin|los-angeles)/) ||  // City pages
    pathname.startsWith('/artist/')  // Artist profile pages

  if (isPublicPath) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Protected routes (require authentication)
  const protectedPaths = ['/dashboard', '/profile', '/saved']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to homepage with login prompt
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('login', 'true')
      loginUrl.searchParams.set('redirect', pathname) // Return to original page after login
      return NextResponse.redirect(loginUrl)
    }

    // Check if Instagram token needs refresh (non-blocking with deduplication)
    const { needsTokenRefresh } = await import('@/lib/instagram/token-refresh')
    const { refreshWithLock } = await import('@/lib/instagram/refresh-lock')

    const needsRefresh = await needsTokenRefresh(user.id)
    if (needsRefresh) {
      // Refresh in background (don't block request) with deduplication
      refreshWithLock(user.id).catch(err => {
        console.error('[Middleware] Token refresh failed:', err)
      })
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
