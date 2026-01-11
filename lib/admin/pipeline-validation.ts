/**
 * Pipeline API Validation Schemas
 *
 * Zod schemas for validating pipeline trigger and retry requests.
 */

import { z } from 'zod';

export const JOB_TYPES = ['scraping', 'processing', 'embeddings'] as const;
export const JOB_SCOPES = ['pending', 'failed', 'all', 'specific'] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type JobScope = (typeof JOB_SCOPES)[number];

/**
 * Trigger job request schema
 */
export const triggerJobSchema = z
  .object({
    jobType: z.enum(JOB_TYPES, {
      errorMap: () => ({ message: `Invalid job type. Must be one of: ${JOB_TYPES.join(', ')}` }),
    }),
    scope: z.enum(JOB_SCOPES, {
      errorMap: () => ({ message: `Invalid scope. Must be one of: ${JOB_SCOPES.join(', ')}` }),
    }),
    artistIds: z.array(z.string().uuid('Invalid artist ID format')).optional(),
    city: z.string().max(100).optional(),
    limit: z.number().int().min(1).max(10000).optional(),
  })
  .refine(
    (data) => {
      // When scope is 'specific', artistIds must be provided and non-empty
      if (data.scope === 'specific') {
        return data.artistIds && data.artistIds.length > 0;
      }
      return true;
    },
    { message: 'artistIds required when scope is "specific"' }
  );

export type TriggerJobRequest = z.infer<typeof triggerJobSchema>;

/**
 * Retry request schema
 */
export const retryJobSchema = z.object({
  target: z.enum(['scraping', 'embeddings'], {
    errorMap: () => ({ message: 'Invalid target. Must be "scraping" or "embeddings"' }),
  }),
  artistIds: z.array(z.string().uuid('Invalid artist ID format')).optional(),
});

export type RetryJobRequest = z.infer<typeof retryJobSchema>;

/**
 * Get runs query params schema
 */
export const getRunsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  jobType: z.enum(JOB_TYPES).optional(),
});

export type GetRunsQuery = z.infer<typeof getRunsQuerySchema>;

/**
 * Get retry jobs query params schema
 */
export const getRetryQuerySchema = z.object({
  target: z.enum(['scraping', 'embeddings']).default('scraping'),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type GetRetryQuery = z.infer<typeof getRetryQuerySchema>;
