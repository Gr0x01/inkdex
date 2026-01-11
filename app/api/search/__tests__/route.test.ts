/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing the route
// Note: vi.mock is hoisted, so we can't use variables defined above
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/embeddings/hybrid-client', () => ({
  generateImageEmbedding: vi.fn(),
  generateTextEmbedding: vi.fn(),
}))

vi.mock('@/lib/instagram/url-detector', () => ({
  detectInstagramUrl: vi.fn(),
  extractPostId: vi.fn(),
}))

vi.mock('@/lib/search/style-classifier', () => ({
  classifyQueryStyles: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/search/color-analyzer', () => ({
  analyzeImageColor: vi.fn().mockResolvedValue({ isColor: true, avgSaturation: 0.5 }),
}))

vi.mock('@/lib/instagram/post-fetcher', () => ({
  fetchInstagramPostImage: vi.fn(),
  downloadImageAsBuffer: vi.fn(),
  InstagramError: class InstagramError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
  ERROR_MESSAGES: {
    POST_NOT_FOUND: 'Post not found',
    PRIVATE_PROFILE: 'Profile is private',
  },
}))

vi.mock('@/lib/instagram/profile-fetcher', () => ({
  fetchInstagramProfileImages: vi.fn(),
  PROFILE_ERROR_MESSAGES: {
    PRIVATE_PROFILE: 'Profile is private',
    INSUFFICIENT_POSTS: 'Not enough posts',
  },
}))

vi.mock('@/lib/embeddings/aggregate', () => ({
  // Return inline 768-dim array (can't reference external variable due to hoisting)
  aggregateEmbeddings: vi.fn().mockReturnValue(new Array(768).fill(0.1)),
}))

vi.mock('@/lib/supabase/queries', () => ({
  getArtistByInstagramHandle: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  checkInstagramSearchRateLimit: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/instagram/image-saver', () => ({
  saveImagesToTempFromBuffers: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/processing/process-artist', () => ({
  processArtistImages: vi.fn().mockResolvedValue({ imagesProcessed: 0 }),
}))

// Create mock embedding AFTER mocks are defined (768-dim array)
const mockEmbedding = new Array(768).fill(0.1)

// Import after mocks are set up
import { POST } from '../route'
import { generateTextEmbedding, generateImageEmbedding } from '@/lib/embeddings/hybrid-client'
import { detectInstagramUrl } from '@/lib/instagram/url-detector'
import { createClient } from '@/lib/supabase/server'
import { checkInstagramSearchRateLimit } from '@/lib/rate-limiter'

// Helper to create mock JSON NextRequest
function createJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/search', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Helper to create mock FormData NextRequest for image upload
function createImageRequest(file: File): NextRequest {
  const formData = new FormData()
  formData.append('type', 'image')
  formData.append('image', file)

  return new NextRequest('http://localhost/api/search', {
    method: 'POST',
    body: formData,
  })
}

// Helper to create mock Supabase client
function createMockSupabase() {
  return {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'search-uuid-123' },
        error: null,
      }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }
}

describe('Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mocks
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as any)
    vi.mocked(generateTextEmbedding).mockResolvedValue(mockEmbedding)
    vi.mocked(generateImageEmbedding).mockResolvedValue(mockEmbedding)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Content-Type Validation', () => {
    it('returns 400 for unsupported content type', async () => {
      const request = new NextRequest('http://localhost/api/search', {
        method: 'POST',
        body: 'plain text',
        headers: {
          'Content-Type': 'text/plain',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Content-Type must be')
    })
  })

  describe('Text Search', () => {
    it('returns 400 for text query under 3 characters', async () => {
      const request = createJsonRequest({ type: 'text', text: 'ab' })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request body')
    })

    it('returns 400 for empty text query', async () => {
      const request = createJsonRequest({ type: 'text', text: '' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('succeeds with valid text query', async () => {
      const request = createJsonRequest({ type: 'text', text: 'traditional japanese' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.searchId).toBe('search-uuid-123')
      expect(data.queryType).toBe('text')

      // Verify embedding generation was called
      expect(generateTextEmbedding).toHaveBeenCalledWith('traditional japanese tattoo')
    })

    it('enhances query with "tattoo" context', async () => {
      const request = createJsonRequest({ type: 'text', text: 'floral blackwork' })
      await POST(request)

      // Query should be enhanced with "tattoo" since it's not already present
      expect(generateTextEmbedding).toHaveBeenCalledWith('floral blackwork tattoo')
    })

    it('does not add "tattoo" if already present', async () => {
      const request = createJsonRequest({ type: 'text', text: 'geometric tattoo design' })
      await POST(request)

      // Should not duplicate "tattoo"
      expect(generateTextEmbedding).toHaveBeenCalledWith('geometric tattoo design')
    })

    it('returns 400 for text over 200 characters', async () => {
      const longText = 'a'.repeat(201)
      const request = createJsonRequest({ type: 'text', text: longText })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Image Upload', () => {
    it('returns 400 when no image file provided', async () => {
      const formData = new FormData()
      formData.append('type', 'image')

      const request = new NextRequest('http://localhost/api/search', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('No image file provided')
    })

    it('returns 400 for file over 10MB', async () => {
      // Create a file larger than 10MB
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024)
      const largeFile = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' })

      const request = createImageRequest(largeFile)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('File size exceeds')
    })

    it('returns 400 for invalid file type', async () => {
      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' })

      const request = createImageRequest(pdfFile)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('File type must be')
    })

    it('accepts valid JPEG image', async () => {
      const jpegFile = new File(['fake image content'], 'tattoo.jpg', { type: 'image/jpeg' })

      const request = createImageRequest(jpegFile)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.searchId).toBe('search-uuid-123')
      expect(data.queryType).toBe('image')
    })

    it('accepts valid PNG image', async () => {
      const pngFile = new File(['fake image content'], 'tattoo.png', { type: 'image/png' })

      const request = createImageRequest(pngFile)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('accepts valid WebP image', async () => {
      const webpFile = new File(['fake image content'], 'tattoo.webp', { type: 'image/webp' })

      const request = createImageRequest(webpFile)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Instagram Post Search', () => {
    it('returns 400 for invalid Instagram post URL', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue(null)

      const request = createJsonRequest({
        type: 'instagram_post',
        instagram_url: 'https://example.com/not-instagram',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid Instagram post URL')
    })

    it('returns 400 when URL is profile instead of post', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue({
        type: 'profile',
        id: 'someuser',
        originalUrl: 'https://instagram.com/someuser',
      })

      const request = createJsonRequest({
        type: 'instagram_post',
        instagram_url: 'https://instagram.com/someuser',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid Instagram post URL')
    })

    it('returns 429 when rate limited', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue({
        type: 'post',
        id: 'ABC123xyz',
        originalUrl: 'https://instagram.com/p/ABC123xyz',
      })

      vi.mocked(checkInstagramSearchRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 3600000,
      })

      const request = createJsonRequest({
        type: 'instagram_post',
        instagram_url: 'https://instagram.com/p/ABC123xyz',
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Too many Instagram searches')
    })
  })

  describe('Instagram Profile Search', () => {
    it('returns 400 for invalid Instagram profile URL', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue(null)

      const request = createJsonRequest({
        type: 'instagram_profile',
        instagram_url: 'https://example.com/not-instagram',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid Instagram profile URL')
    })

    it('returns 400 when URL is post instead of profile', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue({
        type: 'post',
        id: 'ABC123',
        originalUrl: 'https://instagram.com/p/ABC123',
      })

      const request = createJsonRequest({
        type: 'instagram_profile',
        instagram_url: 'https://instagram.com/p/ABC123',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid Instagram profile URL')
    })

    it('returns 429 when rate limited', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue({
        type: 'profile',
        id: 'tattooartist',
        originalUrl: 'https://instagram.com/tattooartist',
      })

      vi.mocked(checkInstagramSearchRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 3600000,
      })

      const request = createJsonRequest({
        type: 'instagram_profile',
        instagram_url: 'https://instagram.com/tattooartist',
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Too many Instagram searches')
    })
  })

  describe('Similar Artist Search', () => {
    it('returns 400 for invalid artist_id (not UUID)', async () => {
      const request = createJsonRequest({
        type: 'similar_artist',
        artist_id: 'not-a-valid-uuid',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 404 when artist not found', async () => {
      const mockSupabase = createMockSupabase()
      // Override to return no artist - cast to any to allow different return shape
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'artists') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'search-uuid' }, error: null }),
        }
      }) as typeof mockSupabase.from
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createJsonRequest({
        type: 'similar_artist',
        artist_id: '123e4567-e89b-12d3-a456-426614174000',
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Artist not found')
    })
  })

  describe('Embedding Validation', () => {
    it('returns 500 for invalid embedding dimension', async () => {
      // Return wrong dimension embedding
      vi.mocked(generateTextEmbedding).mockResolvedValue(new Array(512).fill(0.1))

      const request = createJsonRequest({ type: 'text', text: 'traditional tattoo' })
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.message).toContain('Invalid embedding dimension')
    })

    it('returns 500 for null embedding', async () => {
      vi.mocked(generateTextEmbedding).mockResolvedValue(null as any)

      const request = createJsonRequest({ type: 'text', text: 'traditional tattoo' })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Database Error Handling', () => {
    it('returns 500 when database insert fails', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST500', message: 'Database error' },
        }),
      })) as typeof mockSupabase.from
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = createJsonRequest({ type: 'text', text: 'traditional tattoo' })
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to process search')
    })
  })

  describe('Response Format', () => {
    it('returns searchId and queryType on success', async () => {
      const request = createJsonRequest({ type: 'text', text: 'watercolor flowers' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('searchId')
      expect(data).toHaveProperty('queryType')
      expect(typeof data.searchId).toBe('string')
    })

    it('includes no-store cache header', async () => {
      const request = createJsonRequest({ type: 'text', text: 'neo traditional' })
      const response = await POST(request)

      expect(response.headers.get('Cache-Control')).toBe('no-store')
    })
  })

  describe('Security', () => {
    it('rejects artist_id with SQL injection attempt', async () => {
      const request = createJsonRequest({
        type: 'similar_artist',
        artist_id: "'; DROP TABLE artists;--",
      })
      const response = await POST(request)

      // Should fail Zod UUID validation
      expect(response.status).toBe(400)
    })

    it('rejects artist_id with path traversal attempt', async () => {
      const request = createJsonRequest({
        type: 'similar_artist',
        artist_id: '../../../etc/passwd',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('handles text query with HTML/XSS safely', async () => {
      // The route should accept this but the embedding service handles it
      // The key is it doesn't crash and stores safely
      const request = createJsonRequest({
        type: 'text',
        text: '<script>alert("xss")</script> tattoo',
      })
      const response = await POST(request)

      // Should process normally - XSS is handled at rendering, not storage
      expect(response.status).toBe(200)
    })

    it('handles text query with unicode injection', async () => {
      const request = createJsonRequest({
        type: 'text',
        text: 'tattoo\u0000\u001f design',
      })
      const response = await POST(request)

      // Should process without crashing
      expect(response.status).toBe(200)
    })

    it('rejects Instagram URL with javascript protocol', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue(null)

      const request = createJsonRequest({
        type: 'instagram_post',
        instagram_url: 'javascript:alert(1)',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rejects Instagram URL with data protocol', async () => {
      vi.mocked(detectInstagramUrl).mockReturnValue(null)

      const request = createJsonRequest({
        type: 'instagram_profile',
        instagram_url: 'data:text/html,<script>alert(1)</script>',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
