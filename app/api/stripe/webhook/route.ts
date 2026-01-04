import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient()
  const userId = session.metadata?.user_id
  const artistId = session.metadata?.artist_id
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!userId || !artistId) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }

  // Get period dates from subscription or items
  const periodStart = subscription.current_period_start
    ?? subscription.items?.data?.[0]?.current_period_start
    ?? subscription.start_date
  const periodEnd = subscription.current_period_end
    ?? subscription.items?.data?.[0]?.current_period_end
    ?? null

  // Upsert subscription record
  const { error: subError } = await supabase
    .from('artist_subscriptions')
    .upsert({
      user_id: userId,
      artist_id: artistId,
      subscription_type: 'pro',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: 'active',
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,artist_id',
    })

  if (subError) {
    console.error('Error upserting subscription:', subError)
    throw subError
  }

  // Update artist to Pro status
  const { error: artistError } = await supabase
    .from('artists')
    .update({
      is_pro: true,
      auto_sync_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', artistId)

  if (artistError) {
    console.error('Error updating artist pro status:', artistError)
    throw artistError
  }

  // Update user account type
  const { error: userError } = await supabase
    .from('users')
    .update({
      account_type: 'artist_pro',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (userError) {
    console.error('Error updating user account type:', userError)
    throw userError
  }

  // Auto-pin existing portfolio images (up to first 6)
  const { data: images } = await supabase
    .from('portfolio_images')
    .select('id')
    .eq('artist_id', artistId)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (images && images.length > 0) {
    // Pin first 6 images
    const toPinIds = images.slice(0, 6).map((img: { id: string }) => img.id)
    for (let i = 0; i < toPinIds.length; i++) {
      await supabase
        .from('portfolio_images')
        .update({
          is_pinned: true,
          pinned_position: i + 1,
        })
        .eq('id', toPinIds[i])
    }
  }

  console.log(`Pro subscription activated for artist ${artistId}`)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const supabase = createAdminClient()
  const subscription = sub as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }
  const artistId = subscription.metadata?.artist_id

  if (!artistId) {
    console.error('Missing artist_id in subscription metadata:', subscription.id)
    return
  }

  const status = subscription.status === 'active' ? 'active' :
    subscription.status === 'past_due' ? 'past_due' :
    subscription.status === 'canceled' ? 'canceled' :
    subscription.status === 'trialing' ? 'trialing' : 'canceled'

  // Get period dates from subscription or items
  const periodStart = subscription.current_period_start
    ?? subscription.items?.data?.[0]?.current_period_start
    ?? subscription.start_date
  const periodEnd = subscription.current_period_end
    ?? subscription.items?.data?.[0]?.current_period_end
    ?? null

  // Update subscription record
  const { error: subError } = await supabase
    .from('artist_subscriptions')
    .update({
      status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (subError) {
    console.error('Error updating subscription:', subError)
  }

  // If subscription is no longer active, downgrade artist
  if (status === 'canceled') {
    await handleSubscriptionCanceled(subscription)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const artistId = subscription.metadata?.artist_id
  const userId = subscription.metadata?.user_id

  if (!artistId) {
    console.error('Missing artist_id in subscription metadata:', subscription.id)
    return
  }

  // Downgrade artist from Pro
  const { error: artistError } = await supabase
    .from('artists')
    .update({
      is_pro: false,
      auto_sync_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', artistId)

  if (artistError) {
    console.error('Error downgrading artist:', artistError)
  }

  // Update user account type
  if (userId) {
    await supabase
      .from('users')
      .update({
        account_type: 'artist_free',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  // Hide images beyond free tier limit (keep first 20)
  const { data: images } = await supabase
    .from('portfolio_images')
    .select('id')
    .eq('artist_id', artistId)
    .eq('hidden', false)
    .order('is_pinned', { ascending: false })
    .order('pinned_position', { ascending: true })
    .order('created_at', { ascending: false })

  if (images && images.length > 20) {
    const toHideIds = images.slice(20).map((img: { id: string }) => img.id)
    await supabase
      .from('portfolio_images')
      .update({ hidden: true })
      .in('id', toHideIds)
  }

  // Unpin all images
  await supabase
    .from('portfolio_images')
    .update({
      is_pinned: false,
      pinned_position: null,
    })
    .eq('artist_id', artistId)

  console.log(`Pro subscription canceled for artist ${artistId}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createAdminClient()

  // Get subscription ID - handle both string and object cases
  const invoiceData = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null
  }
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id

  if (!subscriptionId) return

  // Get subscription to find artist
  const { data: sub } = await supabase
    .from('artist_subscriptions')
    .select('artist_id, user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub) return

  // Update subscription status
  await supabase
    .from('artist_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  // TODO: Send email notification about payment failure
  console.log(`Payment failed for subscription ${subscriptionId}`)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
