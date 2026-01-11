/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import type Stripe from 'stripe'

// Mock dependencies before importing the route
vi.mock('@/lib/stripe/server', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendPaymentFailedEmail: vi.fn(),
}))

// Import after mocks are set up
import { POST } from '../route'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPaymentFailedEmail } from '@/lib/email'

// Helper to create mock NextRequest
function createMockRequest(body: string, signature: string | null = 'valid-signature'): NextRequest {
  const headers = new Headers()
  if (signature) {
    headers.set('stripe-signature', signature)
  }

  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers,
  })
}

// Helper to create mock Supabase client
function createMockSupabase() {
  // Track calls for assertions
  const inCalls: Array<[string, string[]]> = []

  // Create a chainable mock that resolves to { data: null, error: null }
  const createChain = (defaultData: unknown = null) => {
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'insert', 'update', 'upsert', 'eq', 'order', 'limit']

    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain)
    }

    chain.in = vi.fn().mockImplementation((field: string, values: string[]) => {
      inCalls.push([field, values])
      return Promise.resolve({ data: null, error: null })
    })

    chain.single = vi.fn().mockResolvedValue({ data: null, error: null })

    // Make chain thenable (resolves when awaited)
    chain.then = (resolve: (value: { data: unknown; error: null }) => void) => {
      return Promise.resolve({ data: defaultData, error: null }).then(resolve)
    }

    return chain
  }

  const mockChain = createChain()

  return {
    from: vi.fn(() => mockChain),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    _mockChain: mockChain,
    _inCalls: inCalls,
    _setQueryResult: (data: unknown) => {
      // Update the chain's then to return this data
      mockChain.then = (resolve: (value: { data: unknown; error: null }) => void) => {
        return Promise.resolve({ data, error: null }).then(resolve)
      }
    },
  }
}

describe('Stripe Webhook Handler', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      NEXT_PUBLIC_APP_URL: 'https://inkdex.io',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Signature Validation', () => {
    it('returns 400 if stripe-signature header is missing', async () => {
      const request = createMockRequest('{}', null)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing signature')
    })

    it('returns 500 if STRIPE_WEBHOOK_SECRET is not set', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET
      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Webhook not configured')
    })

    it('returns 400 if signature verification fails', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Webhook Error')
    })
  })

  describe('checkout.session.completed', () => {
    const mockSession: Partial<Stripe.Checkout.Session> = {
      id: 'cs_test_123',
      metadata: {
        user_id: 'user-123',
        artist_id: 'artist-456',
      },
      subscription: 'sub_789',
      customer: 'cus_abc',
      customer_details: {
        email: 'artist@example.com',
      } as Stripe.Checkout.Session.CustomerDetails,
    }

    it('activates pro subscription successfully', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: mockSession },
      } as unknown as Stripe.Event)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_789',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        items: { data: [] },
      } as unknown as Stripe.Response<Stripe.Subscription>)

      // Mock portfolio images query - set the query result
      mockSupabase._setQueryResult([{ id: 'img-1' }, { id: 'img-2' }])

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)

      // Verify subscription was upserted
      expect(mockSupabase.from).toHaveBeenCalledWith('artist_subscriptions')
      expect(mockSupabase.from).toHaveBeenCalledWith('artists')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('handles missing metadata gracefully', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            ...mockSession,
            metadata: {}, // Missing user_id and artist_id
          }
        },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      // Should still return 200 (logged error but didn't throw)
      expect(response.status).toBe(200)
    })

    it('normalizes and validates email from Stripe checkout', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Mock user query to return synthetic email - first call returns synthetic, rest return null
      mockSupabase._mockChain.single = vi.fn()
        .mockResolvedValueOnce({ data: { email: 'artist_456@instagram.inkdex.io' }, error: null })
        .mockResolvedValue({ data: null, error: null })

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            ...mockSession,
            customer_details: {
              email: '  ARTIST@Example.COM  ', // Uppercase with whitespace
            },
          }
        },
      } as unknown as Stripe.Event)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_789',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        items: { data: [] },
      } as unknown as Stripe.Response<Stripe.Subscription>)

      mockSupabase._setQueryResult([])

      const request = createMockRequest('{}')
      await POST(request)

      // Verify email was updated (normalized to lowercase)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })
  })

  describe('customer.subscription.updated', () => {
    // Use custom type since Stripe SDK types don't include deprecated period fields directly
    const mockSubscription = {
      id: 'sub_789',
      status: 'active',
      metadata: {
        artist_id: 'artist-456',
        user_id: 'user-123',
      },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
      items: { data: [] },
    } as unknown as Stripe.Subscription

    it('updates subscription status', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('artist_subscriptions')
    })

    it('handles canceled status by downgrading artist', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Mock images query for cancellation cleanup - no images over limit
      mockSupabase._setQueryResult([])

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            ...mockSubscription,
            status: 'canceled',
          }
        },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should update artist is_pro to false
      expect(mockSupabase.from).toHaveBeenCalledWith('artists')
    })

    it('handles missing artist_id in metadata', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            ...mockSubscription,
            metadata: {}, // Missing artist_id
          }
        },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      // Should return 200 but not update anything
      expect(response.status).toBe(200)
    })
  })

  describe('customer.subscription.deleted', () => {
    const mockSubscription: Partial<Stripe.Subscription> = {
      id: 'sub_789',
      metadata: {
        artist_id: 'artist-456',
        user_id: 'user-123',
      },
    }

    it('downgrades artist and disables auto-sync', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Mock images query - no images over limit
      mockSupabase._setQueryResult([])

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('artists')
      expect(mockSupabase.from).toHaveBeenCalledWith('artist_sync_state')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('hides images beyond free tier limit', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Create 25 mock images (5 over the 20 limit)
      const mockImages = Array.from({ length: 25 }, (_, i) => ({ id: `img-${i}` }))
      mockSupabase._setQueryResult(mockImages)

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      await POST(request)

      // Should call .in() to hide images beyond limit (images 20-24)
      expect(mockSupabase._inCalls.length).toBeGreaterThan(0)
      const hideCall = mockSupabase._inCalls.find(([field]) => field === 'id')
      expect(hideCall).toBeDefined()
      expect(hideCall![1].length).toBe(5) // 5 images over the limit
    })
  })

  describe('invoice.payment_failed', () => {
    const mockInvoice = {
      id: 'in_123',
      subscription: 'sub_789',
    } as unknown as Stripe.Invoice

    it('marks subscription as past_due and sends email', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Mock subscription lookup - override single for this test
      mockSupabase._mockChain.single = vi.fn().mockResolvedValue({
        data: {
          artist_id: 'artist-456',
          user_id: 'user-123',
          artists: { name: 'Test Artist' },
          users: { email: 'artist@example.com' },
        },
        error: null,
      })

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.payment_failed',
        data: { object: mockInvoice },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('artist_subscriptions')
      expect(sendPaymentFailedEmail).toHaveBeenCalledWith({
        to: 'artist@example.com',
        artistName: 'Test Artist',
        billingPortalUrl: 'http://localhost:3000/api/stripe/portal',
      })
    })

    it('handles missing subscription ID', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            ...mockInvoice,
            subscription: null,
          }
        },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      // Should return 200 but not do anything
      expect(response.status).toBe(200)
      expect(sendPaymentFailedEmail).not.toHaveBeenCalled()
    })

    it('handles subscription object instead of string', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Mock subscription lookup - override single for this test
      mockSupabase._mockChain.single = vi.fn().mockResolvedValue({
        data: {
          artist_id: 'artist-456',
          user_id: 'user-123',
          artists: { name: 'Test Artist' },
          users: { email: 'artist@example.com' },
        },
        error: null,
      })

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            ...mockInvoice,
            subscription: { id: 'sub_789' } as any, // Object instead of string
          }
        },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(sendPaymentFailedEmail).toHaveBeenCalled()
    })
  })

  describe('Unhandled Events', () => {
    it('returns 200 for unhandled event types', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'some.other.event',
        data: { object: {} },
      } as unknown as Stripe.Event)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 if handler throws an error', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

      // Make upsert throw an error
      const upsertMock = mockSupabase._mockChain.upsert as ReturnType<typeof vi.fn>
      upsertMock.mockRejectedValueOnce(new Error('Database error'))

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              user_id: 'user-123',
              artist_id: 'artist-456',
            },
            subscription: 'sub_789',
            customer: 'cus_abc',
          }
        },
      } as unknown as Stripe.Event)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_789',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        items: { data: [] },
      } as unknown as Stripe.Response<Stripe.Subscription>)

      const request = createMockRequest('{}')
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Webhook handler failed')
    })
  })
})
