/**
 * Redis-Based Rate Limiter
 *
 * Uses Railway Redis for distributed rate limiting across serverless instances.
 * Implements sliding window algorithm for accurate rate limiting.
 *
 * Migration from in-memory Map (Jan 9, 2026):
 * - Supports multi-instance deployments
 * - Persistent rate limits across deployments
 * - Accurate sliding window (not fixed window)
 * - No memory leaks in serverless
 */

import { checkRateLimit, resetRateLimit as redisResetRateLimit } from './redis/rate-limiter';

/**
 * Rate limit Instagram search requests
 *
 * Limits: 50 Instagram searches per hour per IP
 * (Raised from 10 after migrating from oEmbed to Apify - Jan 2026)
 *
 * @param identifier - Unique identifier (IP address or user ID)
 * @returns Rate limit check result
 */
export async function checkInstagramSearchRateLimit(identifier: string) {
  return checkRateLimit(
    `instagram_search:${identifier}`,
    50, // 50 requests per hour (Apify handles its own limits)
    60 * 60 * 1000 // per hour
  );
}

/**
 * Rate limit general search requests (text/image)
 *
 * Limits: 100 searches per hour per IP
 *
 * @param identifier - Unique identifier (IP address or user ID)
 * @returns Rate limit check result
 */
export async function checkGeneralSearchRateLimit(identifier: string) {
  return checkRateLimit(
    `general_search:${identifier}`,
    100, // 100 requests
    60 * 60 * 1000 // per hour
  );
}

/**
 * Rate limit add artist requests (recommend + self-add)
 *
 * Limits: 5 submissions per hour per IP
 *
 * @param identifier - Unique identifier (IP address)
 * @returns Rate limit check result
 */
export async function checkAddArtistRateLimit(identifier: string) {
  return checkRateLimit(
    `add_artist:${identifier}`,
    5, // 5 submissions
    60 * 60 * 1000 // per hour
  );
}

/**
 * Rate limit onboarding requests (expensive OpenAI calls)
 *
 * Limits: 3 onboarding sessions per hour per user
 *
 * @param identifier - User ID (authenticated users only)
 * @returns Rate limit check result
 */
export async function checkOnboardingRateLimit(identifier: string) {
  return checkRateLimit(
    `onboarding:${identifier}`,
    3, // 3 sessions
    60 * 60 * 1000 // per hour
  );
}

/**
 * Rate limit portfolio fetch requests (expensive Instagram + OpenAI calls)
 *
 * Limits: 5 portfolio fetches per hour per user
 * Separate from onboarding to allow independent tuning
 *
 * @param identifier - User ID (authenticated users only)
 * @returns Rate limit check result
 */
export async function checkPortfolioFetchRateLimit(identifier: string) {
  return checkRateLimit(
    `portfolio_fetch:${identifier}`,
    5, // 5 fetches (more lenient than onboarding)
    60 * 60 * 1000 // per hour
  );
}

/**
 * Rate limit profile update requests
 *
 * Limits: 10 profile updates per hour per user
 * Prevents spam and abuse of profile update endpoint
 *
 * @param identifier - User ID (authenticated users only)
 * @returns Rate limit check result
 */
export async function checkProfileUpdateRateLimit(identifier: string) {
  return checkRateLimit(
    `profile_update:${identifier}`,
    10, // 10 updates
    60 * 60 * 1000 // per hour
  );
}

/**
 * Rate limit profile delete requests
 *
 * Limits: 1 delete attempt per day per user
 * Prevents accidental rapid deletion attempts
 *
 * @param identifier - User ID (authenticated users only)
 * @returns Rate limit check result
 */
export async function checkProfileDeleteRateLimit(identifier: string) {
  return checkRateLimit(
    `profile_delete:${identifier}`,
    1, // 1 delete attempt
    24 * 60 * 60 * 1000 // per day
  );
}

/**
 * Get client IP from request headers
 *
 * Checks common headers set by proxies and CDNs (Vercel, Cloudflare, etc.)
 *
 * @param request - Next.js request object
 * @returns Client IP address
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const headers = request.headers;

  // Vercel forwards the real IP in x-forwarded-for
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, first is the client
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare sets CF-Connecting-IP
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Development fallback
  return '127.0.0.1';
}

/**
 * Rate limit manual sync requests (Pro feature)
 *
 * Limits: 1 manual sync per hour per user
 * Prevents abuse of expensive Instagram + classification calls
 *
 * @param identifier - User ID (authenticated Pro users only)
 * @returns Rate limit check result
 */
export async function checkManualSyncRateLimit(identifier: string) {
  return checkRateLimit(
    `manual_sync:${identifier}`,
    1, // 1 sync
    60 * 60 * 1000 // per hour
  );
}

/**
 * Reset rate limit for testing
 */
export async function resetRateLimitForTesting(key: string) {
  return redisResetRateLimit(key);
}
