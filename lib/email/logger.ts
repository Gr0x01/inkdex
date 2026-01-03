/**
 * Email Logging
 *
 * Logs all email sends to database for:
 * - Audit trail
 * - Debugging delivery failures
 * - Compliance (GDPR/CCPA)
 * - Rate limiting
 */

import { createClient } from '@supabase/supabase-js';

// Service client for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
import type { EmailType } from './resend';

export interface EmailLogParams {
  recipientEmail: string;
  userId?: string | null;
  artistId?: string | null;
  emailType: EmailType;
  subject: string;
  success: boolean;
  errorMessage?: string | null;
  resendId?: string | null;
}

/**
 * Log email send attempt to database
 */
export async function logEmailSend(params: EmailLogParams): Promise<string | null> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase.rpc('log_email_send', {
      p_recipient_email: params.recipientEmail,
      p_user_id: params.userId || null,
      p_artist_id: params.artistId || null,
      p_email_type: params.emailType,
      p_subject: params.subject,
      p_success: params.success,
      p_error_message: params.errorMessage || null,
      p_resend_id: params.resendId || null,
    });

    if (error) {
      console.error('[EmailLogger] Failed to log email send:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('[EmailLogger] Unexpected error logging email:', error);
    return null;
  }
}

/**
 * Get user ID and artist ID from email address
 * Used for logging context
 */
export async function getEmailContext(
  recipientEmail: string
): Promise<{ userId: string | null; artistId: string | null }> {
  const supabase = getServiceClient();

  try {
    // Get user ID from email
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', recipientEmail)
      .single();

    const userId = userData?.id || null;

    // Get artist ID if user has claimed an artist profile
    let artistId: string | null = null;
    if (userId) {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id')
        .eq('claimed_by_user_id', userId)
        .single();

      artistId = artistData?.id || null;
    }

    return { userId, artistId };
  } catch (error) {
    console.error('[EmailLogger] Error getting email context:', error);
    return { userId: null, artistId: null };
  }
}
