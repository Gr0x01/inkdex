/**
 * Email Rate Limiting
 *
 * Prevents email abuse by limiting sends per recipient per time period.
 * Uses database-backed rate limiting for distributed system support.
 */

import { createClient } from '@supabase/supabase-js';
import type { EmailType } from './resend';

// Service client for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Rate limit configuration per email type
 */
const RATE_LIMITS: Partial<Record<EmailType, { maxPerHour: number; maxPerDay: number }>> = {
  welcome: { maxPerHour: 5, maxPerDay: 10 },
  sync_failed: { maxPerHour: 3, maxPerDay: 10 },
  sync_reauthenticate: { maxPerHour: 2, maxPerDay: 5 },
  subscription_created: { maxPerHour: 5, maxPerDay: 20 },
  subscription_cancelled: { maxPerHour: 5, maxPerDay: 20 },
  downgrade_warning: { maxPerHour: 2, maxPerDay: 5 },
  profile_deleted: { maxPerHour: 2, maxPerDay: 5 },
};

export interface RateLimitResult {
  allowed: boolean;
  hourlyCount: number;
  dailyCount: number;
  reason?: string;
}

/**
 * Check if email send is within rate limits
 */
export async function checkEmailRateLimit(
  recipientEmail: string,
  emailType: EmailType
): Promise<RateLimitResult> {
  const supabase = getServiceClient();
  const limits = RATE_LIMITS[emailType] || { maxPerHour: 10, maxPerDay: 50 };

  try {
    // Call database function to check rate limit
    const { data, error } = await supabase.rpc('check_email_rate_limit', {
      p_recipient_email: recipientEmail,
      p_email_type: emailType,
      p_max_per_hour: limits.maxPerHour,
      p_max_per_day: limits.maxPerDay,
    });

    if (error) {
      console.error('[EmailRateLimit] Error checking rate limit:', error);
      // Fail open - allow send if rate limit check fails
      return {
        allowed: true,
        hourlyCount: 0,
        dailyCount: 0,
      };
    }

    const result = data?.[0];
    if (!result) {
      // No result, allow send
      return {
        allowed: true,
        hourlyCount: 0,
        dailyCount: 0,
      };
    }

    return {
      allowed: result.allowed,
      hourlyCount: result.hourly_count,
      dailyCount: result.daily_count,
      reason: result.reason,
    };
  } catch (error) {
    console.error('[EmailRateLimit] Unexpected error:', error);
    // Fail open
    return {
      allowed: true,
      hourlyCount: 0,
      dailyCount: 0,
    };
  }
}

/**
 * Check if user can receive this email type (preferences check)
 */
export async function canReceiveEmail(
  recipientEmail: string,
  emailType: EmailType
): Promise<boolean> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase.rpc('can_receive_email', {
      p_email: recipientEmail,
      p_email_type: emailType,
    });

    if (error) {
      console.error('[EmailPreferences] Error checking preferences:', error);
      // Fail open - allow send if preferences check fails
      return true;
    }

    return data === true;
  } catch (error) {
    console.error('[EmailPreferences] Unexpected error:', error);
    // Fail open
    return true;
  }
}
