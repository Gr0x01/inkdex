import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect /artists (browse page) to /texas (default state browse)
  if (pathname === '/artists') {
    return NextResponse.redirect(new URL('/texas', request.url), 301)
  }

  // Redirect /artists/* to /artist/* (route standardization)
  if (pathname.startsWith('/artists/')) {
    const slug = pathname.replace('/artists/', '')
    return NextResponse.redirect(new URL(`/artist/${slug}`, request.url), 301)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
