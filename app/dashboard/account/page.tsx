/**
 * Dashboard Account Page
 * Account details and settings
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountSettings from '@/components/dashboard/AccountSettings'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user data
  const { data: userData } = await supabase
    .from('users')
    .select('instagram_username, account_type, created_at')
    .eq('id', user.id)
    .single()

  // Fetch artist data
  const { data: artist } = await supabase
    .from('artists')
    .select('id, instagram_handle, is_pro, name')
    .eq('claimed_by_user_id', user.id)
    .single()

  const isPro = artist?.is_pro === true
  const memberSince = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : undefined

  return (
    <AccountSettings
      instagramUsername={userData?.instagram_username}
      accountType={isPro ? 'Pro Artist' : userData?.account_type || 'Fan'}
      memberSince={memberSince}
      email={user.email}
      artistId={artist?.id}
      artistName={artist?.name}
    />
  )
}
