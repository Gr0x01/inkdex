/**
 * Onboarding Validation Schemas
 *
 * Zod schemas for validating onboarding data at each step.
 * Used by API endpoints and frontend forms.
 */

import { z } from 'zod';

/**
 * Step 2: Profile Preview Data
 */
export const profileDataSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  city: z.string().min(1, 'City is required').trim(),
  state: z.string().min(1, 'State is required').trim(),
  bio: z
    .string()
    .max(500, 'Bio cannot exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type ProfileData = z.infer<typeof profileDataSchema>;

/**
 * Step 3: Portfolio Image Selection
 */
export const portfolioSelectionSchema = z.object({
  selectedImageIds: z
    .array(z.string().min(1, 'Invalid image ID'))
    .min(1, 'Please select at least 1 image')
    .max(20, 'You can select up to 20 images'),
});

export type PortfolioSelection = z.infer<typeof portfolioSelectionSchema>;

/**
 * Step 4: Booking Link
 */
export const bookingLinkSchema = z.object({
  bookingLink: z
    .string()
    .url('Please enter a valid URL')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://'
    )
    .optional()
    .or(z.literal('')),
});

export type BookingLink = z.infer<typeof bookingLinkSchema>;

/**
 * Update Session Request (used across steps 2-4)
 */
export const updateSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  step: z.enum(['preview', 'portfolio', 'booking'], {
    errorMap: () => ({ message: 'Invalid onboarding step' }),
  }),
  data: z.union([profileDataSchema, portfolioSelectionSchema, bookingLinkSchema]),
});

export type UpdateSessionRequest = z.infer<typeof updateSessionSchema>;

/**
 * Finalize Onboarding Request
 */
export const finalizeOnboardingSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

export type FinalizeOnboardingRequest = z.infer<typeof finalizeOnboardingSchema>;

/**
 * Instagram Fetch Response (from Step 1)
 */
export const instagramFetchResponseSchema = z.object({
  sessionId: z.string().uuid(),
  fetchedImages: z.array(
    z.object({
      url: z.string().url(),
      instagram_post_id: z.string(),
      caption: z.string().optional(),
      classified: z.boolean(),
    })
  ),
  profileData: z.object({
    bio: z.string().optional(),
    follower_count: z.number().optional(),
    username: z.string(),
  }),
});

export type InstagramFetchResponse = z.infer<typeof instagramFetchResponseSchema>;
