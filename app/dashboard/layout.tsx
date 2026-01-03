import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardToolbar from '@/components/dashboard/DashboardToolbar'
import { FetchStatusBanner } from '@/components/dashboard/FetchStatusBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Grain texture overlay */}
      <div className="grain-overlay fixed inset-0 pointer-events-none opacity-10" />

      {/* Sticky Navigation Toolbar */}
      <DashboardToolbar />

      {/* Main Content (full width, no sidebar) */}
      <main className="mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
        <div className="py-6">
          {/* Instagram Fetch Status Banner */}
          <FetchStatusBanner />

          {children}
        </div>
      </main>
    </div>
  )
}
