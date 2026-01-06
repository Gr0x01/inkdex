/**
 * Onboarding Validation Schemas
 *
 * Zod schemas for validating onboarding data at each step.
 * Used by API endpoints and frontend forms.
 */

import { z } from 'zod';
import { isValidCountryCode } from '@/lib/constants/countries';

/**
 * Sanitize city/region input - only allow safe characters
 */
function sanitizeLocationString(str: string): string {
  // Allow letters (including accented), spaces, hyphens, apostrophes, periods, commas
  return str.replace(/[^a-zA-ZÀ-ÿ\s\-'.,]/g, '').trim();
}

/**
 * Location Schema (international support)
 */
export const locationSchema = z.object({
  city: z.string().max(100).transform(val => val ? sanitizeLocationString(val) : null).nullable(),
  region: z.string().max(100).transform(val => val ? sanitizeLocationString(val) : null).nullable(),
  countryCode: z.string().length(2, 'Country code must be 2 characters').default('US')
    .refine(isValidCountryCode, { message: 'Invalid country code' }),
  locationType: z.enum(['city', 'region', 'country']),
  isPrimary: z.boolean(),
}).refine(
  (data) => {
    // City type requires city field
    if (data.locationType === 'city' && !data.city) {
      return false;
    }
    // Region type requires region field
    if (data.locationType === 'region' && !data.region) {
      return false;
    }
    // International locations require city
    if (data.countryCode !== 'US' && data.locationType === 'city' && !data.city) {
      return false;
    }
    return true;
  },
  { message: 'Invalid location: required fields missing for location type' }
);

export type LocationData = z.infer<typeof locationSchema>;

/**
 * Step 2: Profile Preview Data
 */
export const profileDataSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  // New locations array format
  locations: z
    .array(locationSchema)
    .min(1, 'At least one location is required')
    .max(20, 'Maximum 20 locations allowed')
    .optional(),
  // Legacy city/state fields for backward compatibility
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  bio: z
    .string()
    .max(500, 'Bio cannot exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Either locations array OR city/state must be provided
    const hasLocations = data.locations && data.locations.length > 0;
    const hasLegacy = data.city && data.city.length > 0;
    return hasLocations || hasLegacy;
  },
  { message: 'At least one location is required' }
);

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
 * Email validation schema
 * - Standard email format (RFC 5322)
 * - Max 254 characters (RFC 5321)
 * - Normalize to lowercase and trim whitespace
 * - Reject synthetic @instagram.inkdex.io addresses
 */
const realEmailSchema = z
  .string()
  .min(1, 'Email is required')
  .transform((email) => email.toLowerCase().trim())
  .pipe(
    z.string()
      .email('Please enter a valid email address')
      .max(254, 'Email address is too long')
      .refine(
        (email) => !email.endsWith('@instagram.inkdex.io'),
        'Please use your real email address'
      )
  );

/**
 * Step 1 (NEW): Info Step - Basic profile info only
 * Location and booking link are collected in optional Steps 2 & 3
 */
export const infoStepSchema = z.object({
  email: realEmailSchema,
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  bio: z
    .string()
    .max(500, 'Bio cannot exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type InfoStepData = z.infer<typeof infoStepSchema>;

/**
 * Step 3 (NEW): Sync Preferences - Auto-sync and filtering settings
 */
export const syncPreferencesSchema = z.object({
  autoSyncEnabled: z.boolean().default(false),
  filterNonTattoo: z.boolean().default(true),
});

export type SyncPreferencesData = z.infer<typeof syncPreferencesSchema>;

/**
 * Update Session Request (supports both new and legacy steps)
 */
export const updateSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  step: z.enum(['info', 'locations', 'sync_preferences', 'preview', 'portfolio', 'booking'], {
    errorMap: () => ({ message: 'Invalid onboarding step' }),
  }),
  data: z.union([infoStepSchema, locationSchema, syncPreferencesSchema, profileDataSchema, portfolioSelectionSchema, bookingLinkSchema]),
});

export type UpdateSessionRequest = z.infer<typeof updateSessionSchema>;

/**
 * Finalize Onboarding Request
 */
export const finalizeOnboardingSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  keepSession: z.boolean().optional().default(false),
});

export type FinalizeOnboardingRequest = z.infer<typeof finalizeOnboardingSchema>;

/**
 * Update Artist Request (for optional steps after finalize)
 */
export const updateArtistSchema = z.object({
  artistId: z.string().uuid('Invalid artist ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  bookingUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal(''))
    .or(z.literal(null)),
  autoSyncEnabled: z.boolean().optional(),
  filterNonTattoo: z.boolean().optional(),
  locations: z.array(locationSchema).optional(),
  deleteSession: z.boolean().optional().default(false),
});

export type UpdateArtistRequest = z.infer<typeof updateArtistSchema>;

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
