/**
 * OpenAI Billing API Integration
 *
 * Fetches current billing usage from the OpenAI API.
 * Requires OPENAI_ADMIN_KEY (separate from regular API key).
 */

interface OpenAIUsageResult {
  usage: number;
  currency: string;
  error?: string;
  lastUpdated: string;
}

// Cache for OpenAI usage (5 minute TTL)
let cachedUsage: OpenAIUsageResult | null = null;
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
 * Get current month's OpenAI usage
 */
export async function getOpenAIUsage(): Promise<OpenAIUsageResult> {
  const now = Date.now();

  // Return cached value if still valid
  if (cachedUsage && now < cacheExpiry) {
    return cachedUsage;
  }

  // Try admin key first, fall back to regular API key
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  const apiKey = process.env.OPENAI_API_KEY;
  const key = adminKey || apiKey;

  if (!key) {
    return {
      usage: 0,
      currency: 'USD',
      error: 'No OpenAI API key configured',
      lastUpdated: new Date().toISOString(),
    };
  }

  if (!adminKey) {
    // Without admin key, we can't fetch billing - return a note
    return {
      usage: 0,
      currency: 'USD',
      error: 'OPENAI_ADMIN_KEY not set - using database estimates only',
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    // Get start of current month as Unix timestamp
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startTime = Math.floor(startOfMonth.getTime() / 1000);

    // Fetch costs from OpenAI API with timeout
    const response = await fetchWithTimeout(
      `https://api.openai.com/v1/organization/costs?start_time=${startTime}&limit=31`,
      {
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Sum up costs from all days
    // The response structure: { data: [{ results: [{ amount: { value: number } }] }] }
    let totalCost = 0;
    if (data.data && Array.isArray(data.data)) {
      for (const day of data.data) {
        if (day.results && Array.isArray(day.results)) {
          for (const result of day.results) {
            totalCost += result.amount?.value ?? 0;
          }
        }
      }
    }

    cachedUsage = {
      usage: totalCost,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    };
    cacheExpiry = now + CACHE_TTL_MS;

    return cachedUsage;
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[OpenAI Billing] Request timed out');
      return {
        usage: 0,
        currency: 'USD',
        error: 'Request timed out',
        lastUpdated: new Date().toISOString(),
      };
    }
    console.error('[OpenAI Billing] Failed to fetch usage:', error);
    return {
      usage: 0,
      currency: 'USD',
      error: error instanceof Error ? error.message : 'Failed to fetch OpenAI usage',
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Clear the usage cache
 */
export function clearOpenAICache(): void {
  cachedUsage = null;
  cacheExpiry = 0;
}
