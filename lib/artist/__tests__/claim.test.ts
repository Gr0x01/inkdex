/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { deleteScrapedImages } from '../claim'
import { createServiceClient } from '@/lib/supabase/service'

describe('deleteScrapedImages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing if no images exist', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })),
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    }
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

    await expect(deleteScrapedImages('artist-123')).resolves.not.toThrow()
  })

  it('deletes storage files and database records', async () => {
    const mockImages = [
      {
        id: 'img-1',
        storage_thumb_320: 'artists/artist-123/img-1-320.webp',
        storage_thumb_640: 'artists/artist-123/img-1-640.webp',
        storage_thumb_1280: 'artists/artist-123/img-1-1280.webp',
      },
      {
        id: 'img-2',
        storage_thumb_320: 'artists/artist-123/img-2-320.webp',
        storage_thumb_640: 'artists/artist-123/img-2-640.webp',
        storage_thumb_1280: null, // Some images might not have all sizes
      },
    ]

    const removeMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnThis()

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'portfolio_images') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => {
              // First call is for fetching, second is for deleting
              return {
                data: mockImages,
                error: null,
                then: (resolve: any) => Promise.resolve({ data: mockImages, error: null }).then(resolve),
              }
            }),
            delete: deleteMock.mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      }),
      storage: {
        from: vi.fn(() => ({
          remove: removeMock,
        })),
      },
    }
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

    await deleteScrapedImages('artist-123')

    // Should call storage.from('portfolio-images')
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('portfolio-images')

    // Should call remove with all non-null storage paths
    expect(removeMock).toHaveBeenCalledWith([
      'artists/artist-123/img-1-320.webp',
      'artists/artist-123/img-1-640.webp',
      'artists/artist-123/img-1-1280.webp',
      'artists/artist-123/img-2-320.webp',
      'artists/artist-123/img-2-640.webp',
    ])
  })

  it('throws error if database fetch fails', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })),
    }
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

    await expect(deleteScrapedImages('artist-123')).rejects.toThrow('Failed to fetch scraped images')
  })

  it('continues if storage deletion fails (non-blocking)', async () => {
    const mockImages = [
      {
        id: 'img-1',
        storage_thumb_320: 'path/to/image.webp',
        storage_thumb_640: null,
        storage_thumb_1280: null,
      },
    ]

    // Track if delete was called
    let deleteCalled = false

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'portfolio_images') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              data: mockImages,
              error: null,
              then: (resolve: any) => Promise.resolve({ data: mockImages, error: null }).then(resolve),
            })),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                deleteCalled = true
                return Promise.resolve({ error: null })
              }),
            }),
          }
        }
        return {}
      }),
      storage: {
        from: vi.fn(() => ({
          // Storage deletion fails
          remove: vi.fn().mockResolvedValue({ error: { message: 'Storage error' } }),
        })),
      },
    }
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

    // Should not throw despite storage error
    await expect(deleteScrapedImages('artist-123')).resolves.not.toThrow()

    // Database delete should still be called
    expect(deleteCalled).toBe(true)
  })

  it('throws error if database deletion fails', async () => {
    const mockImages = [
      {
        id: 'img-1',
        storage_thumb_320: 'path/to/image.webp',
        storage_thumb_640: null,
        storage_thumb_1280: null,
      },
    ]

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'portfolio_images') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              data: mockImages,
              error: null,
              then: (resolve: any) => Promise.resolve({ data: mockImages, error: null }).then(resolve),
            })),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: 'Delete failed' },
              }),
            }),
          }
        }
        return {}
      }),
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    }
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

    await expect(deleteScrapedImages('artist-123')).rejects.toThrow('Failed to delete portfolio images')
  })
})
