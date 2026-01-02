import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Instagram</label>
            <p className="text-xl">@{userData?.instagram_username || 'Unknown'}</p>
          </div>

          <div>
            <label className="text-sm text-zinc-400">Account Type</label>
            <p className="text-xl capitalize">{userData?.account_type || 'fan'}</p>
          </div>

          <div>
            <label className="text-sm text-zinc-400">Member Since</label>
            <p className="text-xl">
              {userData?.created_at
                ? new Date(userData.created_at).toLocaleDateString()
                : 'Unknown'}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <a
            href="/dashboard/portfolio"
            className="inline-block px-6 py-3 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors font-semibold"
          >
            Manage Portfolio →
          </a>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </form>
        </div>

        <p className="mt-4 text-sm text-zinc-500">
          ✅ Phase 6 Portfolio Management Complete
        </p>
      </div>
    </div>
  )
}
