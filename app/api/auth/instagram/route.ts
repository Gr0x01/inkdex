import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

/**
 * GET /api/auth/instagram
 *
 * Instagram OAuth initiation endpoint (via Facebook Login)
 * Called by Phase 3 (claim flow) and Phase 4 (add-artist flow)
 *
 * Flow:
 * 1. Generates CSRF token (state parameter)
 * 2. Stores state in httpOnly cookie (expires in 10 minutes)
 * 3. Redirects to Facebook OAuth dialog with Instagram permissions
 * 4. Facebook redirects back to /auth/callback with auth code + state
 *
 * Query Parameters:
 * - redirect (optional): Where to redirect after successful OAuth (e.g., /onboarding, /dashboard)
 *
 * Example:
 * ```
 * <a href="/api/auth/instagram?redirect=/onboarding">Connect Instagram</a>
 * ```
 *
 * Security:
 * - CSRF protection via state parameter
 * - httpOnly cookies prevent XSS access
 * - 10-minute expiration limits attack window
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const redirectPath = searchParams.get('redirect') || '/dashboard'

    // Generate CSRF token (32 bytes = 64 hex characters)
    const state = randomBytes(32).toString('hex')

    // Store in httpOnly cookie (expires in 10 minutes)
    const cookieStore = await cookies()
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Build Facebook OAuth URL
    // Note: Using Facebook OAuth because Instagram Basic Display API was sunset Dec 4, 2024
    // Instagram Graph API requires Business/Creator accounts (not Personal)
    //
    // Instagram Content Permissions (added via Facebook App "Use cases"):
    // - instagram_basic: Instagram Business account profile
    // - instagram_content_publish: Post content to Instagram
    // - pages_show_list: List of Pages the user manages
    // - pages_read_engagement: Read Page engagement data
    // - business_management: Manage business assets
    const authParams = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      state,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
      response_type: 'code',
    })

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${authParams}`

    console.log('[OAuth] Initiating Instagram OAuth flow:', {
      redirectPath,
      stateLength: state.length,
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[OAuth] Initiation error:', error)

    // Redirect to homepage with error
    const errorUrl = new URL('/', request.url)
    errorUrl.searchParams.set('error', 'oauth_init_failed')
    return NextResponse.redirect(errorUrl)
  }
}
