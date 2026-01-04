/**
 * Dashboard Overview Page
 * Analytics for Pro users, upgrade CTA for Free users
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardOverview from '@/components/dashboard/DashboardOverview'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch artist data
  const { data: artist } = await supabase
    .from('artists')
    .select('id, instagram_handle, is_pro, name')
    .eq('claimed_by_user_id', user.id)
    .single()

  const isPro = artist?.is_pro === true
  const firstName = artist?.name?.split(' ')[0]

  return (
    <DashboardOverview
      isPro={isPro}
      firstName={firstName}
      artistId={artist?.id}
    />
  )
}
