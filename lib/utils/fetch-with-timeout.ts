/* eslint-disable @typescript-eslint/no-explicit-any -- Fetch API requires flexible types */
/**
 * Fetch with Timeout Utility
 *
 * Prevents hung requests to external APIs from exhausting serverless function limits.
 *
 * Usage:
 *   const response = await fetchWithTimeout('https://api.example.com', {
 *     method: 'POST',
 *     timeout: 30000, // 30 seconds
 *   });
 *
 * Features:
 * - Automatic AbortController cleanup
 * - Default 30s timeout
 * - Clear error messages
 * - Works with all fetch options
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /**
   * Timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Fetch with automatic timeout handling
 *
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Response
 * @throws Error if request times out or fails
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  // Prevent signal conflicts - caller should use timeout option instead
  if ('signal' in fetchOptions) {
    throw new Error(
      'fetchWithTimeout does not support custom AbortSignal - use timeout option instead'
    );
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Provide clear error messages
    if (error.name === 'AbortError') {
      throw new Error(
        `Request timeout: ${url} did not respond within ${timeout}ms`
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Fetch with timeout and automatic JSON parsing
 *
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Parsed JSON response
 * @throws Error if request times out, fails, or JSON is invalid
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} (${url})`
    );
  }

  try {
    return await response.json();
  } catch (_error) {
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

/**
 * Fetch with timeout and automatic text parsing
 *
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Response text
 * @throws Error if request times out or fails
 */
export async function fetchText(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<string> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} (${url})`
    );
  }

  return await response.text();
}

/**
 * Recommended timeout values for different services
 */
export const TIMEOUTS = {
  /** Fast API calls (health checks, simple queries) */
  FAST: 5000, // 5s

  /** Standard API calls (most external APIs) */
  STANDARD: 30000, // 30s

  /** Slow operations (image downloads, large responses) */
  SLOW: 60000, // 60s

  /** Very slow operations (embeddings, ML inference) */
  VERY_SLOW: 120000, // 120s (2 minutes)
} as const;
