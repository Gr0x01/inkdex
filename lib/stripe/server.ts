import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Price IDs from environment
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
} as const

export type PricingPlan = keyof typeof STRIPE_PRICES

// Validate price IDs are set
export function validateStripeConfig() {
  if (!process.env.STRIPE_PRICE_MONTHLY) {
    throw new Error('STRIPE_PRICE_MONTHLY is not set')
  }
  if (!process.env.STRIPE_PRICE_YEARLY) {
    throw new Error('STRIPE_PRICE_YEARLY is not set')
  }
}
