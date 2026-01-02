import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardHome from '@/components/dashboard/DashboardHome'

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
  const handle = userData?.instagram_username || artist?.instagram_handle || 'unknown'
  const memberSince = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : undefined

  return (
    <DashboardHome
      handle={handle}
      isPro={isPro}
      name={artist?.name}
      instagramUsername={userData?.instagram_username}
      accountType={userData?.account_type}
      memberSince={memberSince}
    />
  )
}
