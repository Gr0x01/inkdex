/**
 * Cloudflare Turnstile server-side verification
 *
 * Verifies Turnstile tokens against Cloudflare's siteverify endpoint
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

import { fetchWithTimeout, TIMEOUTS } from '@/lib/utils/fetch-with-timeout';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token
 *
 * @param token - The Turnstile response token from client
 * @param remoteIp - Optional client IP address
 * @returns True if verification passes, false otherwise
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not configured');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetchWithTimeout(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
        timeout: TIMEOUTS.FAST, // 5s - quick verification
      }
    );

    const data = (await response.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      console.warn('Turnstile verification failed:', data['error-codes']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}
