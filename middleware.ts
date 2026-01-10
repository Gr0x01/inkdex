import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** Validate 2-letter ISO country code format */
function isValidCountryCode(code: string | null): code is string {
  return code !== null && /^[A-Z]{2}$/i.test(code)
}

/**
 * Root middleware
 *
 * 1. Sets geo cookie from Vercel's x-vercel-ip-country header
 * 2. Delegates to Supabase middleware for auth handling
 */
export async function middleware(request: NextRequest) {
  // Get country code from Vercel's geo header, validate format
  const rawCountry = request.headers.get('x-vercel-ip-country')
  const country = isValidCountryCode(rawCountry) ? rawCountry.toUpperCase() : 'US'

  // Run Supabase middleware first to get auth-handled response
  const response = await updateSession(request)

  // Set geo cookie if not already set or different (case-insensitive comparison)
  // Cookie is HttpOnly: false so client JS can read it
  const existingGeo = request.cookies.get('inkdex_geo')?.value?.toUpperCase()
  if (existingGeo !== country) {
    response.cookies.set('inkdex_geo', country, {
      httpOnly: false, // Allow client-side JS to read
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
