/**
 * Create Embedded Stripe Checkout Session
 *
 * Creates a checkout session for embedded checkout (ui_mode: 'embedded')
 * Used by the onboarding upgrade step to process Pro subscriptions inline.
 *
 * POST /api/stripe/create-embedded-checkout
 *
 * Request: {
 *   plan: 'monthly' | 'yearly',
 *   artistId: string,
 *   sessionId: string (onboarding session),
 *   promoCode?: string
 * }
 * Response: { clientSecret: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES, validateStripeConfig } from '@/lib/stripe/server';
import { checkOnboardingRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import type Stripe from 'stripe';

const embeddedCheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
  artistId: z.string().uuid(),
  sessionId: z.string().uuid(),
  promoCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    validateStripeConfig();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit checkout session creation
    const rateLimit = await checkOnboardingRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = embeddedCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { plan, artistId, sessionId, promoCode } = parsed.data;

    // Validate onboarding session belongs to user and matches artist
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('user_id, artist_id, expires_at')
      .eq('id', sessionId)
      .single();

    // Consolidate session validation to avoid revealing which check failed
    if (
      sessionError ||
      !session ||
      session.user_id !== user.id ||
      session.artist_id !== artistId
    ) {
      return NextResponse.json(
        { error: 'Invalid session. Please start over.' },
        { status: 403 }
      );
    }

    // Check session expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Onboarding session has expired. Please start over.' },
        { status: 410 }
      );
    }

    // Validate artist belongs to user and is not already Pro
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name, is_pro, claimed_by_user_id')
      .eq('id', artistId)
      .single();

    // Consolidate artist validation
    if (artistError || !artist || artist.claimed_by_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Invalid artist. Please start over.' },
        { status: 403 }
      );
    }

    if (artist.is_pro) {
      return NextResponse.json(
        { error: 'You already have an active Pro subscription.' },
        { status: 400 }
      );
    }

    const priceId = STRIPE_PRICES[plan];

    // Generate JWT-signed return token for secure redirect
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[EmbeddedCheckout] JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const returnToken = jwt.sign(
      {
        sessionId,
        artistId,
        userId: user.id,
        upgraded: true,
      },
      jwtSecret,
      {
        expiresIn: '2h',
        algorithm: 'HS256',
      }
    );

    // Check for existing Stripe customer
    const { data: existingSub } = await supabase
      .from('artist_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    // Validate return URL uses HTTPS in production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (
      process.env.NODE_ENV === 'production' &&
      !appUrl?.startsWith('https://')
    ) {
      console.error('[EmbeddedCheckout] NEXT_PUBLIC_APP_URL must use HTTPS in production');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Build embedded checkout session params
    // NOTE: Token in URL is short-lived (2h) and validated against authenticated user
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'embedded',
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: `${appUrl}/onboarding/portfolio?token=${returnToken}`,
      metadata: {
        user_id: user.id,
        artist_id: artistId,
        onboarding_session_id: sessionId,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          artist_id: artistId,
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
    };

    // Set customer or email
    if (existingSub?.stripe_customer_id) {
      sessionParams.customer = existingSub.stripe_customer_id;
    } else if (user.email) {
      sessionParams.customer_email = user.email;
    }

    // Apply promo code if provided
    if (promoCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length === 0) {
          return NextResponse.json(
            { error: `Promo code "${promoCode}" is invalid or expired.` },
            { status: 400 }
          );
        }

        sessionParams.discounts = [
          { promotion_code: promotionCodes.data[0].id },
        ];
        // Remove allow_promotion_codes when using discounts
        delete sessionParams.allow_promotion_codes;
      } catch (promoError) {
        console.error('[EmbeddedCheckout] Promo code lookup error:', promoError);
        return NextResponse.json(
          { error: 'Unable to validate promo code. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Use idempotency key to prevent duplicate subscription creation
    const stripeSession = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `onboarding-${sessionId}-${artistId}-${plan}`,
    });

    // Validate client secret exists (should always exist for embedded mode)
    if (!stripeSession.client_secret) {
      console.error('[EmbeddedCheckout] No client secret returned from Stripe');
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    console.log(
      `[EmbeddedCheckout] Created session for user ${user.id}, artist ${artistId}, plan ${plan}`
    );

    return NextResponse.json({ clientSecret: stripeSession.client_secret });
  } catch (error) {
    console.error('[EmbeddedCheckout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
