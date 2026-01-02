import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    artist_id?: string
    claimed?: string
  }>
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { artist_id, claimed } = params

  const supabase = await createClient()

  // Require authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch user data
  const { data: userData } = await supabase
    .from('users')
    .select('instagram_username')
    .eq('id', user.id)
    .single()

  // Fetch artist if artist_id provided
  let artistData = null
  if (artist_id) {
    const { data } = await supabase
      .from('artists')
      .select('name, slug, city, state')
      .eq('id', artist_id)
      .eq('claimed_by_user_id', user.id)
      .single()

    artistData = data
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="grain-overlay absolute inset-0 pointer-events-none opacity-20" />

      <div className="relative max-w-2xl mx-auto px-4 py-16">
        {/* Success Banner */}
        {claimed === 'true' && (
          <div className="mb-8 p-4 bg-featured border-2 border-ink">
            <p className="font-mono text-xs uppercase tracking-wider text-ink text-center">
              ✓ Profile Claimed Successfully
            </p>
          </div>
        )}

        <div className="bg-white border-2 border-ink p-8 md:p-12">
          <h1 className="font-heading text-4xl font-black text-ink mb-4">
            Welcome, @{userData?.instagram_username || 'Artist'}!
          </h1>

          {artistData && (
            <p className="font-body text-lg text-gray-700 mb-8">
              You've successfully claimed your profile in {artistData.city}, {artistData.state}.
            </p>
          )}

          {/* Next Steps */}
          <div className="border-t-2 border-gray-200 pt-8 mb-8">
            <h2 className="font-heading text-2xl font-black text-ink mb-4">
              What's Next?
            </h2>
            <ul className="space-y-3 font-body text-gray-700">
              <li className="flex items-start gap-3">
                <span className="font-mono text-featured font-bold">1.</span>
                <span>Visit your dashboard to customize your profile</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-featured font-bold">2.</span>
                <span>Upload your best work to showcase your style</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-featured font-bold">3.</span>
                <span>Update your bio and booking information</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/dashboard${artist_id ? `?artist_id=${artist_id}` : ''}`}
              className="flex-1 py-4 bg-ink text-paper text-center font-mono text-sm font-semibold uppercase tracking-wider hover:bg-gray-900 border-2 border-ink"
            >
              Go to Dashboard →
            </Link>
            {artistData && (
              <Link
                href={`/artist/${artistData.slug}`}
                className="flex-1 py-4 bg-transparent text-ink text-center font-mono text-sm font-semibold uppercase tracking-wider hover:bg-gray-100 border-2 border-ink"
              >
                View Profile
              </Link>
            )}
          </div>

          <div className="mt-8 p-4 bg-gray-50 border border-gray-200">
            <p className="font-mono text-xs text-gray-600 text-center">
              🚧 Portfolio upload and settings coming in Phase 4
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
