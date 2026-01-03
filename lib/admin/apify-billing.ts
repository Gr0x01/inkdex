/**
 * Apify Billing API Integration
 *
 * Fetches current billing usage from the Apify API.
 * Uses GET /users/me/usage/monthly endpoint for accurate billing data.
 */

interface ApifyUsageResult {
  usage: number;
  currency: string;
  error?: string;
  lastUpdated: string;
}

interface ApifyMonthlyUsageResponse {
  data: {
    totalUsageCreditsUsd: number;
    dailyUsageCreditsUsd: Array<{
      date: string;
      usageCreditsUsd: number;
    }>;
  };
}

// Cache for Apify usage (5 minute TTL)
let cachedUsage: ApifyUsageResult | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
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
    // Use the monthly usage endpoint for accurate billing data
    const response = await fetchWithTimeout(
      'https://api.apify.com/v2/users/me/usage/monthly',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apify API error: ${response.status} - ${errorText}`);
    }

    const data: ApifyMonthlyUsageResponse = await response.json();
    const usage = data.data?.totalUsageCreditsUsd ?? 0;

    cachedUsage = {
      usage: typeof usage === 'number' ? usage : 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    };
    cacheExpiry = now + CACHE_TTL_MS;

    return cachedUsage;
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Apify Billing] Request timed out');
      return {
        usage: 0,
        currency: 'USD',
        error: 'Request timed out',
        lastUpdated: new Date().toISOString(),
      };
    }
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
