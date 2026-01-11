/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing the route
vi.mock('@/lib/stripe/server', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Import after mocks are set up
import { POST } from '../route'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

// Helper to create mock Supabase client
function createMockSupabase(options: {
  user?: { id: string; email?: string } | null
  subscription?: { stripe_customer_id: string } | null
  subscriptionError?: Error | null
}) {
  const {
    user = null,
    subscription = null,
    subscriptionError = null,
  } = options

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: subscription,
        error: subscriptionError,
      }),
    })),
  }
}

describe('Stripe Customer Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://inkdex.io')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Authentication', () => {
    it('returns 401 if not authenticated', async () => {
      const mockSupabase = createMockSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const response = await POST()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Subscription Validation', () => {
    it('returns 400 if no subscription found', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        subscription: null,
        subscriptionError: { message: 'Not found' } as Error,
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const response = await POST()

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('No subscription found')
    })

    it('returns 400 if subscription has no Stripe customer ID', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        subscription: { stripe_customer_id: null } as any,
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const response = await POST()

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('No subscription found')
    })
  })

  describe('Portal Session Creation', () => {
    it('creates portal session successfully', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        subscription: { stripe_customer_id: 'cus_abc123' },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/portal_session_123',
      } as any)

      const response = await POST()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.url).toBe('https://billing.stripe.com/portal_session_123')
    })

    it('passes correct customer ID to Stripe', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        subscription: { stripe_customer_id: 'cus_xyz789' },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/portal_session_456',
      } as any)

      await POST()

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_xyz789',
        return_url: 'https://inkdex.io/dashboard/subscription',
      })
    })

    it('includes correct return URL', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        subscription: { stripe_customer_id: 'cus_test' },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      } as any)

      await POST()

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'https://inkdex.io/dashboard/subscription',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('returns 500 if Stripe portal creation fails', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: 'user-123', email: 'test@example.com' },
        subscription: { stripe_customer_id: 'cus_fail' },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(
        new Error('Stripe API error')
      )

      const response = await POST()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create portal session')
    })
  })
})
