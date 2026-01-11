/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing the route
vi.mock('@/lib/stripe/server', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    promotionCodes: {
      list: vi.fn(),
    },
  },
  STRIPE_PRICES: {
    monthly: 'price_monthly_test',
    yearly: 'price_yearly_test',
  },
  validateStripeConfig: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Import after mocks are set up
import { POST } from '../route'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

// Helper to create mock NextRequest
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/stripe/create-checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Helper to create mock Supabase client
function createMockSupabase(options: {
  user?: { id: string; email?: string } | null
  artist?: { id: string; name: string; is_pro: boolean } | null
  artistError?: Error | null
  existingSubscription?: { stripe_customer_id: string } | null
}) {
  const {
    user = null,
    artist = null,
    artistError = null,
    existingSubscription = null,
  } = options

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'artists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: artist,
            error: artistError,
          }),
        }
      }
      if (table === 'artist_subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: existingSubscription,
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  }
}

describe('Stripe Create Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    vi.stubEnv('STRIPE_PRICE_MONTHLY', 'price_monthly_test')
    vi.stubEnv('STRIPE_PRICE_YEARLY', 'price_yearly_test')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://inkdex.io')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Authentication', () => {
    it('returns 401 if not authenticated', async () => {
      const mockSupabase = createMockSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ plan: 'monthly' })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Artist Validation', () => {
    it('returns 400 if no artist profile found', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: null,
        artistError: { message: 'Not found' } as Error,
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ plan: 'monthly' })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('No artist profile found')
    })

    it('returns 400 if already a Pro subscriber', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: true },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ plan: 'monthly' })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('already have an active Pro subscription')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for invalid plan', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ plan: 'invalid' })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request')
    })

    it('returns 400 for missing plan', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Checkout Session Creation', () => {
    it('creates checkout session with monthly price', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
      } as any)

      const request = createMockRequest({ plan: 'monthly' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.url).toBe('https://checkout.stripe.com/session_123')

      // Verify checkout session params
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [
            {
              price: 'price_monthly_test',
              quantity: 1,
            },
          ],
          metadata: expect.objectContaining({
            user_id: 'user-123',
            artist_id: 'artist-456',
            plan: 'monthly',
          }),
        })
      )
    })

    it('creates checkout session with yearly price', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_456',
      } as any)

      const request = createMockRequest({ plan: 'yearly' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_yearly_test',
              quantity: 1,
            },
          ],
        })
      )
    })

    it('includes customer_email for new customers', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
        existingSubscription: null,
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_789',
      } as any)

      const request = createMockRequest({ plan: 'monthly' })
      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'test@example.com',
        })
      )
    })

    it('uses existing customer ID for returning customers', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
        existingSubscription: { stripe_customer_id: 'cus_existing' },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_abc',
      } as any)

      const request = createMockRequest({ plan: 'monthly' })
      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
        })
      )
    })

    it('includes correct success and cancel URLs', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_def',
      } as any)

      const request = createMockRequest({ plan: 'monthly' })
      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://inkdex.io/dashboard?upgraded=true',
          cancel_url: 'https://inkdex.io/dashboard/subscription?canceled=true',
        })
      )
    })
  })

  describe('Promo Code Handling', () => {
    it('applies valid promo code', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.promotionCodes.list).mockResolvedValue({
        data: [{ id: 'promo_123' }],
      } as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_promo',
      } as any)

      const request = createMockRequest({ plan: 'monthly', promoCode: 'SAVE20' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(stripe.promotionCodes.list).toHaveBeenCalledWith({
        code: 'SAVE20',
        active: true,
        limit: 1,
      })
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [{ promotion_code: 'promo_123' }],
        })
      )
    })

    it('ignores invalid promo code and continues', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      // Return empty list for invalid promo
      vi.mocked(stripe.promotionCodes.list).mockResolvedValue({
        data: [],
      } as any)

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_nopromo',
      } as any)

      const request = createMockRequest({ plan: 'monthly', promoCode: 'INVALID' })
      const response = await POST(request)

      // Should still succeed without discount
      expect(response.status).toBe(200)
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          discounts: expect.anything(),
        })
      )
    })

    it('continues if promo code lookup throws', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.promotionCodes.list).mockRejectedValue(
        new Error('Stripe API error')
      )

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_error',
      } as any)

      const request = createMockRequest({ plan: 'monthly', promoCode: 'ERROR' })
      const response = await POST(request)

      // Should still succeed
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 if Stripe checkout creation fails', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        artist: { id: 'artist-456', name: 'Test Artist', is_pro: false },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(
        new Error('Stripe API error')
      )

      const request = createMockRequest({ plan: 'monthly' })
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create checkout session')
    })
  })
})
