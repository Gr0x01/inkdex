/**
 * Mock data utilities for testing Phase 5 search flow
 *
 * Provides synthetic embeddings and mock artist data for development
 * before Phase 3/4 (Instagram scraping + CLIP embeddings) are complete.
 */

import { SearchResult } from '@/types/search'

/**
 * Generate a synthetic 768-dimensional CLIP embedding
 * L2 normalized to match real embeddings
 */
export function generateMockEmbedding(): number[] {
  const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1)

  // L2 normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => val / norm)
}

/**
 * Mock artist search results for testing UI
 */
export function generateMockSearchResults(count: number = 6): SearchResult[] {
  const cities = ['Austin, TX', 'Los Angeles, CA']
  const artistNames = [
    'Sarah Martinez',
    'Mike Chen',
    'Elena Rodriguez',
    'James Wilson',
    'Maya Patel',
    'Alex Thompson',
    'Jordan Kim',
    'Taylor Brown',
    'Casey Davis',
    'Morgan Lee',
  ]

  return Array.from({ length: count }, (_, i) => ({
    artist_id: `mock-${i + 1}`,
    artist_name: artistNames[i % artistNames.length],
    artist_slug: `${artistNames[i % artistNames.length].toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
    city: cities[i % 2],
    profile_image_url: null,
    instagram_url: `https://instagram.com/${artistNames[i % artistNames.length].toLowerCase().replace(/\s+/g, '')}`,
    is_verified: i % 3 === 0, // Every 3rd artist is verified
    matching_images: Array.from({ length: 3 }, (_, j) => ({
      url: `https://via.placeholder.com/400x400?text=Portfolio+${j + 1}`,
      instagramUrl: `https://instagram.com/p/mock${i}${j}`,
      similarity: 0.85 - (i * 0.05) - (j * 0.03), // Decreasing similarity
    })),
    similarity: 0.85 - (i * 0.05), // Top result = 0.85, decreases by 0.05
  }))
}

/**
 * Insert mock search into database for testing
 * Useful for manually testing the results page
 */
export async function createMockSearch(
  type: 'image' | 'text' = 'image',
  queryText?: string
): Promise<string> {
  const embedding = generateMockEmbedding()

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      text: queryText || 'mock search query',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create mock search: ${response.statusText}`)
  }

  const data = await response.json()
  return data.searchId
}

/**
 * Test data for development/storybook
 */
export const MOCK_ARTIST_RESULT: SearchResult = {
  artist_id: 'test-1',
  artist_name: 'Sarah Martinez',
  artist_slug: 'sarah-martinez-1',
  city: 'Austin, TX',
  profile_image_url: null,
  instagram_url: 'https://instagram.com/sarahmartinez',
  is_verified: true,
  matching_images: [
    {
      url: 'https://via.placeholder.com/400x400?text=Portfolio+1',
      instagramUrl: 'https://instagram.com/p/test1',
      similarity: 0.92,
    },
    {
      url: 'https://via.placeholder.com/400x400?text=Portfolio+2',
      instagramUrl: 'https://instagram.com/p/test2',
      similarity: 0.88,
    },
    {
      url: 'https://via.placeholder.com/400x400?text=Portfolio+3',
      instagramUrl: 'https://instagram.com/p/test3',
      similarity: 0.85,
    },
  ],
  similarity: 0.92,
}
