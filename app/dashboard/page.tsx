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

  // Get portfolio image count
  const { count: imageCount } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artist?.id || '')

  // Get sync status for Pro users
  let lastSyncedAt: string | undefined
  let nextSyncAt: string | undefined

  if (isPro && artist?.id) {
    const { data: syncData } = await supabase
      .from('artists')
      .select('last_synced_at')
      .eq('id', artist.id)
      .single()

    if (syncData?.last_synced_at) {
      const lastSync = new Date(syncData.last_synced_at)
      const now = new Date()
      const diffMs = now.getTime() - lastSync.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffHours < 1) {
        lastSyncedAt = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
      } else if (diffHours < 24) {
        lastSyncedAt = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
      } else {
        const diffDays = Math.floor(diffHours / 24)
        lastSyncedAt = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
      }

      // Next sync is 24 hours after last sync
      const nextSync = new Date(lastSync.getTime() + 24 * 60 * 60 * 1000)
      const nextDiffMs = nextSync.getTime() - now.getTime()
      const nextHours = Math.floor(nextDiffMs / (1000 * 60 * 60))
      const nextMinutes = Math.floor((nextDiffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (nextHours < 1) {
        nextSyncAt = `in ${nextMinutes} minute${nextMinutes !== 1 ? 's' : ''}`
      } else {
        nextSyncAt = `in ${nextHours} hour${nextHours !== 1 ? 's' : ''}`
      }
    }
  }

  const firstName = artist?.name?.split(' ')[0]

  return (
    <DashboardOverview
      isPro={isPro}
      firstName={firstName}
      artistId={artist?.id}
      imageCount={imageCount || 0}
      maxImages={isPro ? 100 : 20}
      lastSyncedAt={lastSyncedAt}
      nextSyncAt={nextSyncAt}
    />
  )
}
