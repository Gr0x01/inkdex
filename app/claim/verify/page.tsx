import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteScrapedImages } from '@/lib/artist/claim'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    artist_id?: string
    error?: string
  }>
}

export default async function ClaimVerifyPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { artist_id, error } = params

  // Handle OAuth errors
  if (error) {
    return <ClaimErrorPage error={error} />
  }

  if (!artist_id) {
    return <ClaimErrorPage error="missing_artist_id" />
  }

  const supabase = await createClient()

  // Require authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent(`/claim/verify?artist_id=${artist_id}`))
  }

  // Fetch user's Instagram username
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('instagram_username, instagram_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.instagram_username) {
    return <ClaimErrorPage error="no_instagram_account" />
  }

  // Fetch artist profile
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name, slug, instagram_handle, verification_status, claimed_by_user_id')
    .eq('id', artist_id)
    .single()

  if (artistError || !artist) {
    return <ClaimErrorPage error="artist_not_found" />
  }

  // Check if already claimed
  if (artist.verification_status === 'claimed') {
    if (artist.claimed_by_user_id === user.id) {
      redirect(`/dashboard?artist_id=${artist_id}`)
    } else {
      return <ClaimErrorPage error="already_claimed" artistName={artist.name} />
    }
  }

  // ========================================================================
  // ATOMIC CLAIM PROCESS (with race condition protection)
  // ========================================================================

  try {
    // Use atomic RPC function that wraps everything in a transaction
    const { data: result, error: claimError } = await supabase
      .rpc('claim_artist_profile', {
        p_artist_id: artist_id,
        p_user_id: user.id,
        p_instagram_handle: userData.instagram_username,
        p_instagram_id: userData.instagram_id
      })

    if (claimError) {
      console.error('[Claim] RPC error:', claimError)
      return <ClaimErrorPage error="server_error" />
    }

    // Check result from atomic function
    if (!result || !result.success) {
      const errorType = result?.error || 'claim_failed'

      // Map specific errors to error page types
      if (errorType === 'handle_mismatch') {
        return <ClaimErrorPage
          error="handle_mismatch"
          userHandle={userData.instagram_username}
          artistHandle={artist.instagram_handle}
        />
      }

      if (errorType === 'already_claimed') {
        return <ClaimErrorPage error="already_claimed" artistName={artist.name} />
      }

      return <ClaimErrorPage error={errorType} />
    }

    // Async storage cleanup (non-blocking)
    deleteScrapedImages(artist_id).catch(err =>
      console.error('[Claim] Storage cleanup failed (non-critical):', err)
    )

    // Redirect to onboarding
    redirect(`/onboarding/fetch?artist_id=${artist_id}&claimed=true`)

  } catch (error) {
    // Re-throw Next.js redirect errors (they're not real errors)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    console.error('[Claim] Unexpected error:', error)
    return <ClaimErrorPage error="server_error" />
  }
}

function ClaimErrorPage({
  error,
  userHandle,
  artistHandle,
  artistName
}: {
  error: string
  userHandle?: string
  artistHandle?: string
  artistName?: string
}) {
  const errorMessages: Record<string, { title: string; message: string; showBusinessAccountHelp?: boolean }> = {
    handle_mismatch: {
      title: 'Instagram Account Mismatch',
      message: `You logged in as @${userHandle}, but this profile belongs to @${artistHandle}.`
    },
    already_claimed: {
      title: 'Profile Already Claimed',
      message: `This profile has already been claimed${artistName ? ` by ${artistName}` : ''}.`
    },
    artist_not_found: {
      title: 'Artist Not Found',
      message: 'This artist profile does not exist or has been removed.'
    },
    claim_failed: {
      title: 'Claim Failed',
      message: 'An error occurred while claiming this profile. Please try again.'
    },
    no_instagram_account: {
      title: 'Instagram Account Required',
      message: 'We couldn\'t find your Instagram account. Please try connecting again.'
    },
    no_instagram_business_account: {
      title: 'Business Account Required',
      message: 'Instagram requires a Business or Creator account to connect via their API.',
      showBusinessAccountHelp: true
    },
    missing_artist_id: {
      title: 'Invalid Request',
      message: 'Missing artist information. Please try again from the artist profile page.'
    },
    server_error: {
      title: 'Server Error',
      message: 'An unexpected error occurred. Please try again later.'
    },
  }

  const errorInfo = errorMessages[error] || {
    title: 'Error',
    message: 'An unexpected error occurred.',
    showBusinessAccountHelp: false
  }
  const { title, message, showBusinessAccountHelp } = errorInfo

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="grain-overlay absolute inset-0 pointer-events-none opacity-20" />

      <div className="relative max-w-md bg-white border-2 border-ink p-8 text-center">
        <h1 className="font-heading text-2xl font-black text-ink mb-4">
          {title}
        </h1>
        <p className="font-body text-lg text-gray-700 mb-6">
          {message}
        </p>

        {showBusinessAccountHelp && (
          <div className="bg-gray-50 border border-gray-200 p-4 mb-6 text-left">
            <p className="font-body text-base font-semibold text-ink mb-3">
              How to switch to a Business account:
            </p>
            <ol className="font-body text-base text-gray-600 space-y-2 list-decimal list-inside">
              <li>Open Instagram and go to your profile</li>
              <li>Tap <span className="font-semibold">Settings</span> then <span className="font-semibold">Account</span></li>
              <li>Tap <span className="font-semibold">Switch to professional account</span></li>
              <li>Choose <span className="font-semibold">Creator</span> (recommended for artists)</li>
              <li>Connect to a Facebook Page (create one if needed)</li>
              <li>Return here and try again</li>
            </ol>
            <p className="font-body text-sm text-gray-500 mt-3 italic">
              This is free and takes about 2 minutes.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-ink text-paper font-mono text-xs uppercase tracking-wider hover:bg-gray-900 border-2 border-ink"
          >
            Back to Home
          </Link>

          {error === 'handle_mismatch' && (
            <p className="font-mono text-xs font-normal text-gray-500 mt-2">
              Make sure you're logged into the correct Instagram account
            </p>
          )}

          {showBusinessAccountHelp && (
            <a
              href="https://help.instagram.com/502981923235522"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-base text-gray-500 underline hover:text-ink"
            >
              Instagram Help: Switch to Business Account
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
