import { z } from 'zod'

/**
 * Validation schemas for search API requests
 */

export const textSearchSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(3).max(200),
  city: z.string().optional(),
})

export const instagramPostSchema = z.object({
  type: z.literal('instagram_post'),
  instagram_url: z.string().min(1),
  city: z.string().optional(),
})

export const instagramProfileSchema = z.object({
  type: z.literal('instagram_profile'),
  instagram_url: z.string().min(1),
  city: z.string().optional(),
  bypass_gdpr_check: z.boolean().optional(),
})

export const similarArtistSchema = z.object({
  type: z.literal('similar_artist'),
  artist_id: z.string().uuid(),
  city: z.string().optional(),
})

/**
 * Image upload constraints
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Type exports for handler use
 */
export type TextSearchInput = z.infer<typeof textSearchSchema>
export type InstagramPostInput = z.infer<typeof instagramPostSchema>
export type InstagramProfileInput = z.infer<typeof instagramProfileSchema>
export type SimilarArtistInput = z.infer<typeof similarArtistSchema>
