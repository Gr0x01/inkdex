/**
 * Instagram OAuth Callback Handler (via Facebook Login)
 *
 * IMPORTANT: This is infrastructure only. Called by:
 * - Phase 3: "Claim This Page" button on unclaimed artist profiles
 * - Phase 4: "/add-artist" page (self-add flow)
 *
 * OAuth Flow:
 * 1. Validates CSRF token (state parameter)
 * 2. Exchanges auth code for Facebook access token
 * 3. Fetches Instagram Business account ID via Facebook Graph API
 * 4. Fetches Instagram profile (username, ID)
 * 5. Creates/updates user in Supabase
 * 6. Encrypts & stores tokens in Vault (NOT plaintext!)
 * 7. Creates Supabase Auth session
 * 8. Redirects based on flow context (claim → onboarding, add-artist → onboarding, default → dashboard)
 *
 * Instagram API Note:
 * - Instagram Basic Display API was sunset Dec 4, 2024
 * - We use Instagram Graph API via Facebook Login
 * - Requires Business/Creator account (Personal accounts won't work)
 * - Artist must connect Instagram to a Facebook Page
 *
 * @see /memory-bank/projects/user-artist-account-implementation.md Phase 2
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { storeInstagramTokens } from '@/lib/supabase/vault'
import { cookies } from 'next/headers'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  state: z.string().min(1, 'State parameter required'),
})

// ============================================================================
// FACEBOOK / INSTAGRAM GRAPH API ENDPOINTS
// ============================================================================

const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'
const FACEBOOK_ACCOUNTS_URL = 'https://graph.facebook.com/v21.0'
const INSTAGRAM_ME_URL = 'https://graph.instagram.com/me'

// ============================================================================
// ERROR MESSAGES
// ============================================================================

const ERROR_MESSAGES = {
  oauth_denied: 'You denied access. Please try again to continue.',
  invalid_params: 'Invalid OAuth callback parameters. Please try again.',
  csrf_mismatch: 'Security validation failed. Please try again.',
  token_exchange_failed: 'Failed to authenticate with Facebook. Please try again.',
  no_instagram_account: 'Could not find Instagram Business account. Make sure it is connected to your Facebook Page.',
  no_instagram_business_account: 'Please connect an Instagram Business or Creator account to your Facebook Page.',
  profile_fetch_failed: 'Could not retrieve Instagram profile. Please try again.',
  user_creation_failed: 'Failed to create account. Please contact support.',
  server_error: 'An error occurred. Please try again later.',
} as const

// ============================================================================
// OAUTH CALLBACK HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[OAuth] Callback received:', {
      hasCode: !!code,
      hasState: !!state,
      error: error || 'none',
    })

    // ------------------------------------------------------------------------
    // HANDLE OAUTH DENIAL
    // ------------------------------------------------------------------------

    if (error) {
      console.error('[OAuth] User denied:', error, errorDescription)

      // Redirect back to origin (claim page or add-artist page)
      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(
          `${redirectUrl}?error=oauth_denied&message=${encodeURIComponent(errorDescription || ERROR_MESSAGES.oauth_denied)}`,
          request.url
        )
      )
    }

    // ------------------------------------------------------------------------
    // VALIDATE REQUIRED PARAMETERS
    // ------------------------------------------------------------------------

    const validation = callbackSchema.safeParse({ code, state })
    if (!validation.success) {
      console.error('[OAuth] Invalid params:', validation.error.errors)

      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(`${redirectUrl}?error=invalid_params`, request.url)
      )
    }

    // ------------------------------------------------------------------------
    // VALIDATE CSRF TOKEN (STATE PARAMETER)
    // ------------------------------------------------------------------------

    const cookieStore = await cookies()
    const storedState = cookieStore.get('oauth_state')?.value

    if (!storedState || storedState !== state) {
      console.error('[OAuth] CSRF validation failed:', {
        storedState: storedState ? 'exists' : 'missing',
        providedState: state?.substring(0, 8) + '...',
        match: storedState === state,
      })

      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(`${redirectUrl}?error=csrf_mismatch`, request.url)
      )
    }

    console.log('[OAuth] CSRF validation passed')

    // ------------------------------------------------------------------------
    // EXCHANGE AUTHORIZATION CODE FOR ACCESS TOKEN
    // ------------------------------------------------------------------------

    console.log('[OAuth] Exchanging code for access token...')

    // Get the redirect parameter from query string
    const redirectPath = searchParams.get('redirect') || '/dashboard'

    // Build redirect_uri that matches EXACTLY what was sent to Facebook
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`

    const tokenResponse = await fetch(FACEBOOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: validation.data.code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[OAuth] Token exchange failed:', errorData)

      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(`${redirectUrl}?error=token_exchange_failed`, request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token } = tokenData

    console.log('[OAuth] Access token obtained')

    // ------------------------------------------------------------------------
    // FETCH INSTAGRAM BUSINESS ACCOUNT FROM FACEBOOK
    // ------------------------------------------------------------------------

    console.log('[OAuth] Fetching Instagram Business account...')

    // Get Facebook user's pages (needed to access Instagram Business account)
    const facebookUserId = tokenData.user_id || 'me'
    const accountsResponse = await fetch(
      `${FACEBOOK_ACCOUNTS_URL}/${facebookUserId}/accounts?fields=instagram_business_account&access_token=${access_token}`
    )

    if (!accountsResponse.ok) {
      console.error('[OAuth] Failed to fetch Facebook pages')

      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(`${redirectUrl}?error=no_instagram_account`, request.url)
      )
    }

    const accountsData = await accountsResponse.json()

    // Extract Instagram Business account from first page
    const instagramBusinessAccount = accountsData.data?.[0]?.instagram_business_account

    if (!instagramBusinessAccount) {
      console.error('[OAuth] No Instagram Business account found')

      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(
          `${redirectUrl}?error=no_instagram_business_account&message=${encodeURIComponent(ERROR_MESSAGES.no_instagram_business_account)}`,
          request.url
        )
      )
    }

    console.log('[OAuth] Instagram Business account found:', instagramBusinessAccount.id)

    // ------------------------------------------------------------------------
    // FETCH INSTAGRAM PROFILE
    // ------------------------------------------------------------------------

    console.log('[OAuth] Fetching Instagram profile...')

    const profileResponse = await fetch(
      `${INSTAGRAM_ME_URL}?fields=id,username&access_token=${access_token}&user_id=${instagramBusinessAccount.id}`
    )

    if (!profileResponse.ok) {
      console.error('[OAuth] Profile fetch failed')

      const redirectUrl = searchParams.get('redirect') || '/'
      return NextResponse.redirect(
        new URL(`${redirectUrl}?error=profile_fetch_failed`, request.url)
      )
    }

    const profile = await profileResponse.json()
    const instagramUserId = instagramBusinessAccount.id
    const instagramUsername = profile.username

    console.log('[OAuth] Instagram profile fetched:', {
      userId: instagramUserId,
      username: instagramUsername,
    })

    // ------------------------------------------------------------------------
    // CREATE/UPDATE USER IN SUPABASE
    // ------------------------------------------------------------------------

    const supabase = await createClient()

    // Check if user exists (match on Instagram user ID)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('instagram_id', instagramUserId)
      .single()

    let userId: string

    if (existingUser) {
      // Update existing user
      console.log('[OAuth] Updating existing user:', existingUser.id)

      userId = existingUser.id
      await supabase
        .from('users')
        .update({
          instagram_username: instagramUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    } else {
      // Create new user
      console.log('[OAuth] Creating new user')

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          instagram_id: instagramUserId,
          instagram_username: instagramUsername,
          account_type: 'artist_free', // Default for OAuth users (they're claiming or adding)
        })
        .select('id')
        .single()

      if (insertError || !newUser) {
        console.error('[OAuth] User creation failed:', insertError)

        const redirectUrl = searchParams.get('redirect') || '/'
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=user_creation_failed`, request.url)
        )
      }

      userId = newUser.id
      console.log('[OAuth] New user created:', userId)
    }

    // ------------------------------------------------------------------------
    // STORE TOKENS IN VAULT (ENCRYPTED)
    // ------------------------------------------------------------------------

    console.log('[OAuth] Storing tokens in Vault (encrypted)...')

    await storeInstagramTokens(userId, {
      access_token,
      refresh_token: tokenData.refresh_token || access_token, // Instagram may not provide refresh token
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    })

    console.log('[OAuth] Tokens stored in Vault')

    // ------------------------------------------------------------------------
    // CREATE SUPABASE AUTH SESSION
    // ------------------------------------------------------------------------

    console.log('[OAuth] Creating Supabase Auth session...')

    // Check if user exists in Supabase Auth
    const { data: authData } = await supabase.auth.admin.listUsers()
    const existingAuthUser = authData?.users.find(
      u => u.user_metadata?.instagram_id === instagramUserId
    )

    let authUserId: string

    if (existingAuthUser) {
      // User exists - sign them in
      console.log('[OAuth] Existing auth user found:', existingAuthUser.id)
      authUserId = existingAuthUser.id

      // Generate one-time link token for automatic sign-in
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: existingAuthUser.email!,
      })

      if (linkError || !linkData) {
        console.error('[OAuth] Failed to generate sign-in link:', linkError)
        const redirectUrl = searchParams.get('redirect') || '/'
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=auth_failed`, request.url)
        )
      }

      // Sign in with the generated token
      const { error: signInError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (signInError) {
        console.error('[OAuth] Sign-in failed:', signInError)
      }
    } else {
      // Create new auth user with synthetic email
      console.log('[OAuth] Creating new auth user...')

      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: `${instagramUserId}@instagram.inkdex.io`,
        email_confirm: true, // Skip email verification
        user_metadata: {
          instagram_id: instagramUserId,
          instagram_username: instagramUsername,
          provider: 'instagram',
        },
      })

      if (createError || !newAuthUser.user) {
        console.error('[OAuth] Failed to create auth user:', createError)
        const redirectUrl = searchParams.get('redirect') || '/'
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=auth_creation_failed`, request.url)
        )
      }

      authUserId = newAuthUser.user.id

      // Generate one-time link token for automatic sign-in
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: newAuthUser.user.email!,
      })

      if (linkError || !linkData) {
        console.error('[OAuth] Failed to generate sign-in link:', linkError)
        const redirectUrl = searchParams.get('redirect') || '/'
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=auth_failed`, request.url)
        )
      }

      // Sign in with the generated token
      const { error: signInError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (signInError) {
        console.error('[OAuth] Sign-in failed:', signInError)
      }
    }

    console.log('[OAuth] Supabase Auth session created')

    // ------------------------------------------------------------------------
    // REDIRECT BASED ON FLOW CONTEXT
    // ------------------------------------------------------------------------

    // Phase 3 (claim flow) and Phase 4 (add-artist) will set this redirect param
    const redirectUrl = searchParams.get('redirect') || '/dashboard'

    console.log('[OAuth] Redirecting to:', redirectUrl)

    // Clear CSRF cookie
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    response.cookies.delete('oauth_state')

    return response
  } catch (error) {
    console.error('[OAuth] Callback error:', error)

    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/'
    return NextResponse.redirect(
      new URL(`${redirectUrl}?error=server_error`, request.url)
    )
  }
}
