/**
 * Apify Billing API Integration
 *
 * Fetches current billing usage from the Apify API.
 */

import { ApifyClient } from 'apify-client';

interface ApifyUsageResult {
  usage: number;
  currency: string;
  error?: string;
  lastUpdated: string;
}

// Cache for Apify usage (5 minute TTL)
let cachedUsage: ApifyUsageResult | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Promise with timeout wrapper
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Get current month's Apify usage
 */
export async function getApifyUsage(): Promise<ApifyUsageResult> {
  const now = Date.now();

  // Return cached value if still valid
  if (cachedUsage && now < cacheExpiry) {
    return cachedUsage;
  }

  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    return {
      usage: 0,
      currency: 'USD',
      error: 'APIFY_API_TOKEN not configured',
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const client = new ApifyClient({ token });
    const user = await withTimeout(client.user().get(), REQUEST_TIMEOUT_MS);

    // The Apify API returns usage in the plan object
    // Type assertion needed as ApifyClient types may not include all properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = user?.plan as Record<string, unknown> | undefined;
    const usage = (plan?.monthlyUsage as number) ?? (plan?.usageCredits as number) ?? 0;

    cachedUsage = {
      usage: typeof usage === 'number' ? usage : 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    };
    cacheExpiry = now + CACHE_TTL_MS;

    return cachedUsage;
  } catch (error) {
    console.error('[Apify Billing] Failed to fetch usage:', error);
    return {
      usage: 0,
      currency: 'USD',
      error: error instanceof Error ? error.message : 'Failed to fetch Apify usage',
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Clear the usage cache
 */
export function clearApifyCache(): void {
  cachedUsage = null;
  cacheExpiry = 0;
}
