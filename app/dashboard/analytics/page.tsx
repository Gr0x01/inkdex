/**
 * Analytics Dashboard Page
 * Pro-only route for viewing artist analytics
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
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
    .select('id, name, slug, is_pro')
    .eq('claimed_by_user_id', user.id)
    .single()

  if (!artist) {
    redirect('/dashboard')
  }

  if (!artist.is_pro) {
    redirect('/dashboard?upgrade=analytics')
  }

  return <AnalyticsDashboard artistId={artist.id} artistName={artist.name} />
}
