import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProBadge } from '@/components/badges/ProBadge'
import { ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user data from database
  const { data: userData } = await supabase
    .from('users')
    .select('instagram_username, account_type, created_at')
    .eq('id', user.id)
    .single()

  // Fetch artist data if user has claimed a profile
  const { data: artist } = await supabase
    .from('artists')
    .select('id, instagram_handle, is_pro, name')
    .eq('claimed_by_user_id', user.id)
    .single()

  const isPro = artist?.is_pro === true

  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      {/* Grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-8 lg:py-12">
        {/* Header */}
        <header className="mb-8 pb-6 border-b border-[var(--gray-300)]">
          {/* Top row: Section label + Pro Badge */}
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--gray-500)]">
              Artist Dashboard
            </p>
            {isPro && <ProBadge variant="badge" size="sm" />}
          </div>

          {/* Bottom row: Welcome + Handle */}
          <div>
            <h1 className="font-heading text-3xl mb-1.5">
              Welcome back{artist?.name ? `, ${artist.name.split(' ')[0]}` : ''}
            </h1>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--gray-500)]">
              @{userData?.instagram_username || artist?.instagram_handle || 'Unknown'}
            </p>
          </div>
        </header>

        {/* Account Info Card */}
        <section className="border-2 border-[var(--ink-black)] bg-white p-6 mb-8 relative">
          {/* Corner accent */}
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-[var(--warm-gray)]" />

          <h2 className="font-heading text-xl mb-4">Account Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                Instagram
              </p>
              <p className="font-body text-lg text-[var(--ink-black)]">
                @{userData?.instagram_username || 'Not connected'}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                Account Type
              </p>
              <p className="font-body text-lg text-[var(--ink-black)] capitalize">
                {isPro ? 'Pro Artist' : userData?.account_type || 'Fan'}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                Member Since
              </p>
              <p className="font-body text-lg text-[var(--ink-black)]">
                {userData?.created_at
                  ? new Date(userData.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/dashboard/portfolio"
              className="group border-2 border-[var(--ink-black)] bg-white p-5 hover:bg-[var(--gray-100)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg mb-1">Manage Portfolio</h3>
                  <p className="font-body text-sm text-[var(--gray-600)]">
                    Add, remove, and reorder your images
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--gray-500)] group-hover:text-[var(--ink-black)] group-hover:translate-x-1 transition-all" />
              </div>
            </a>

            <a
              href="/dashboard/profile"
              className="group border-2 border-[var(--ink-black)] bg-white p-5 hover:bg-[var(--gray-100)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg mb-1">Edit Profile</h3>
                  <p className="font-body text-sm text-[var(--gray-600)]">
                    Update your bio, location, and links
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--gray-500)] group-hover:text-[var(--ink-black)] group-hover:translate-x-1 transition-all" />
              </div>
            </a>
          </div>
        </section>

        {/* Logout */}
        <div className="pt-6 border-t border-[var(--gray-300)]">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="font-mono text-xs tracking-[0.1em] uppercase text-[var(--gray-600)] hover:text-[var(--error)] transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
