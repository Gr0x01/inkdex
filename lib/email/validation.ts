/**
 * Email Parameter Validation
 *
 * Validates and sanitizes all email parameters to prevent:
 * - Email header injection
 * - XSS via email clients
 * - Open redirect vulnerabilities
 * - Invalid data
 */

import { z } from 'zod';

/**
 * Base email validation
 */
const baseEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
});

/**
 * Artist name validation
 * - Allows letters, spaces, hyphens, apostrophes
 * - Min 1, max 100 characters
 * - Strips newlines and control characters
 */
const artistNameSchema = z
  .string()
  .min(1, 'Artist name is required')
  .max(100, 'Artist name too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'Invalid characters in artist name')
  .transform((val) => val.trim().replace(/[\r\n\t]/g, ''));

/**
 * Instagram handle validation
 * - Allows letters, numbers, dots, underscores
 * - Min 1, max 30 characters (Instagram limit)
 * - Removes @ if present
 */
const instagramHandleSchema = z
  .string()
  .min(1, 'Instagram handle is required')
  .max(30, 'Instagram handle too long')
  .regex(/^@?[a-zA-Z0-9._]+$/, 'Invalid Instagram handle format')
  .transform((val) => val.replace(/^@/, ''));

/**
 * URL validation (internal URLs only)
 * - Must be on inkdex.io domain
 * - Prevents open redirects
 */
const inkdexUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.hostname === 'inkdex.io' ||
          parsed.hostname.endsWith('.inkdex.io') ||
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1'
        );
      } catch {
        return false;
      }
    },
    {
      message: 'URL must be on inkdex.io domain or localhost',
    }
  );

/**
 * Welcome email parameters
 */
export const welcomeEmailSchema = baseEmailSchema.extend({
  artistName: artistNameSchema,
  profileUrl: inkdexUrlSchema,
  instagramHandle: instagramHandleSchema,
  isPro: z.boolean().optional(),
});

export type WelcomeEmailParams = z.infer<typeof welcomeEmailSchema>;

/**
 * Sync failed email parameters
 */
export const syncFailedEmailSchema = baseEmailSchema.extend({
  artistName: artistNameSchema,
  failureReason: z
    .string()
    .min(1)
    .max(500)
    .transform((val) => val.trim()),
  failureCount: z.number().int().min(1).max(10),
  dashboardUrl: inkdexUrlSchema,
  instagramHandle: instagramHandleSchema,
  needsReauth: z.boolean().optional(),
});

export type SyncFailedEmailParams = z.infer<typeof syncFailedEmailSchema>;

/**
 * Subscription created email parameters
 */
export const subscriptionCreatedEmailSchema = baseEmailSchema.extend({
  artistName: artistNameSchema,
  plan: z.enum(['monthly', 'yearly']),
  amount: z.number().int().min(1).max(10000),
  dashboardUrl: inkdexUrlSchema,
  billingPortalUrl: inkdexUrlSchema,
});

export type SubscriptionCreatedEmailParams = z.infer<typeof subscriptionCreatedEmailSchema>;

/**
 * Downgrade warning email parameters
 */
export const downgradeWarningEmailSchema = baseEmailSchema.extend({
  artistName: artistNameSchema,
  endDate: z.string().min(1).max(100),
  portfolioImageCount: z.number().int().min(0).max(1000),
  billingPortalUrl: inkdexUrlSchema,
  dashboardUrl: inkdexUrlSchema,
});

export type DowngradeWarningEmailParams = z.infer<typeof downgradeWarningEmailSchema>;

/**
 * Payment failed email parameters
 */
export const paymentFailedEmailSchema = baseEmailSchema.extend({
  artistName: artistNameSchema,
  billingPortalUrl: inkdexUrlSchema,
});

export type PaymentFailedEmailParams = z.infer<typeof paymentFailedEmailSchema>;
