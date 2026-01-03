import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/config/env'
import { isAdminEmail } from '@/lib/admin/whitelist'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Block /dev routes in production
  if (
    process.env.NODE_ENV === 'production' &&
    pathname.startsWith('/dev')
  ) {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  // Skip auth check entirely for static assets and health checks
  const skipAuthPaths = [
    '/api/health',
    '/_next',
    '/favicon.ico',
  ]

  if (skipAuthPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Public paths that don't require auth but still need Supabase session handling
  const publicPaths = [
    '/',
    '/admin/login', // Admin login page is public
  ]

  // Allow public access to city and artist pages (they're SEO pages)
  const _isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/')) ||
    pathname.match(/^\/(austin|los-angeles|new-york|chicago|portland|seattle|miami|atlanta)/) ||
    pathname.startsWith('/artist/')

  // Set pathname on request headers for ConditionalLayout to read
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
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
            request: {
              headers: requestHeaders,
            },
          })
          // Determine if this is an admin route for stricter CSRF protection
          const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // CSRF protection: Strict for admin auth cookies only (prevents OAuth issues)
              // Regular routes use Lax to allow Instagram OAuth redirects
              sameSite: (isAdminRoute && name.includes('auth')) ? 'strict' : (options?.sameSite ?? 'lax'),
            })
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Admin routes (require authentication + admin email whitelist)
  // Exclude /admin/login which is public
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin/login'

  if (isAdminPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Check if user is an admin
    if (!isAdminEmail(user.email)) {
      // Not authorized - redirect to home
      console.warn(`[Middleware] Unauthorized admin access attempt: ${user.email}`)
      return NextResponse.redirect(new URL('/', request.url))
    }

    return supabaseResponse
  }

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
