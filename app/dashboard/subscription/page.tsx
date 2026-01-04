/**
 * Subscription Management Page
 * Shows current plan, upgrade options, and billing management
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubscriptionManager from '@/components/dashboard/SubscriptionManager'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch artist and subscription data
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, is_pro')
    .eq('claimed_by_user_id', user.id)
    .single()

  if (!artist) {
    redirect('/onboarding')
  }

  const { data: subscription } = await supabase
    .from('artist_subscriptions')
    .select('*')
    .eq('artist_id', artist.id)
    .single()

  return (
    <div className="max-w-2xl">
      <header className="pt-8 mb-8">
        <h1 className="font-heading text-3xl mb-1">Subscription</h1>
        <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
          Manage your plan
        </p>
      </header>

      <SubscriptionManager
        isPro={artist.is_pro}
        subscription={subscription}
      />
    </div>
  )
}
