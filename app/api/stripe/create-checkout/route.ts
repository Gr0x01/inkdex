import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICES, validateStripeConfig } from '@/lib/stripe/server'
import { z } from 'zod'
import type Stripe from 'stripe'

const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
  promoCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    validateStripeConfig()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the artist profile for this user
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name, is_pro')
      .eq('claimed_by_user_id', user.id)
      .single()

    if (artistError || !artist) {
      return NextResponse.json(
        { error: 'No artist profile found. Please complete onboarding first.' },
        { status: 400 }
      )
    }

    if (artist.is_pro) {
      return NextResponse.json(
        { error: 'You already have an active Pro subscription.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { plan, promoCode } = parsed.data
    const priceId = STRIPE_PRICES[plan]

    // Check for existing Stripe customer
    const { data: existingSub } = await supabase
      .from('artist_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        artist_id: artist.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          artist_id: artist.id,
        },
      },
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `I agree to the [Terms of Service](${process.env.NEXT_PUBLIC_APP_URL}/legal/terms) and [Privacy Policy](${process.env.NEXT_PUBLIC_APP_URL}/legal/privacy).`,
        },
      },
      allow_promotion_codes: true,
    }

    // Set customer or email
    if (existingSub?.stripe_customer_id) {
      sessionParams.customer = existingSub.stripe_customer_id
    } else if (user.email) {
      sessionParams.customer_email = user.email
    }

    // Apply promo code if provided
    if (promoCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        })

        if (promotionCodes.data.length > 0) {
          sessionParams.discounts = [
            { promotion_code: promotionCodes.data[0].id },
          ]
          // Remove allow_promotion_codes when using discounts
          delete sessionParams.allow_promotion_codes
        }
      } catch {
        // Invalid promo code, continue without it
        console.warn('Invalid promo code:', promoCode)
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
