/**
 * Simple in-memory rate limiter
 *
 * PRODUCTION WARNING: This in-memory limiter is NOT suitable for:
 * - Multi-instance deployments (load balancing)
 * - High traffic (>1000 unique IPs/hour)
 * - Persistent rate limits across deployments
 *
 * Migrate to @upstash/ratelimit for production:
 * https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_ENTRIES = 10000; // Prevent memory exhaustion

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request should be allowed
   *
   * @param key - Unique identifier (e.g., IP address)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success flag and metadata
   */
  check(
    key: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    // Emergency cleanup if map grows too large
    if (this.storage.size > this.MAX_ENTRIES) {
      console.warn(`[RateLimiter] Emergency cleanup triggered (size: ${this.storage.size})`);
      this.cleanup();
    }

    const now = Date.now();
    const entry = this.storage.get(key);

    // No previous entry or window expired - allow request
    if (!entry || now >= entry.resetAt) {
      this.storage.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    // Within rate limit window
    if (entry.count < limit) {
      entry.count++;
      this.storage.set(key, entry);

      return {
        success: true,
        limit,
        remaining: limit - entry.count,
        reset: entry.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries from storage
   */
  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.storage.forEach((entry, key) => {
      if (now >= entry.resetAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.storage.delete(key));
  }

  /**
   * Clear all rate limit data (for testing)
   */
  reset() {
    this.storage.clear();
  }

  /**
   * Cleanup interval on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

// Global singleton instance
const globalRateLimiter = new RateLimiter();

/**
 * Rate limit Instagram search requests
 *
 * Limits: 10 Instagram searches per hour per IP
 *
 * @param identifier - Unique identifier (IP address or user ID)
 * @returns Rate limit check result
 */
export function checkInstagramSearchRateLimit(identifier: string) {
  return globalRateLimiter.check(
    `instagram_search:${identifier}`,
    10, // 10 requests
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
export function checkGeneralSearchRateLimit(identifier: string) {
  return globalRateLimiter.check(
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
export function checkAddArtistRateLimit(identifier: string) {
  return globalRateLimiter.check(
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
export function checkOnboardingRateLimit(identifier: string) {
  return globalRateLimiter.check(
    `onboarding:${identifier}`,
    3, // 3 sessions
    60 * 60 * 1000 // per hour
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

// Export singleton for testing
export const rateLimiter = globalRateLimiter;
