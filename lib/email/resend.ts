/**
 * Resend Email Client
 *
 * Centralized email sending utility using Resend API.
 * Handles rate limiting, error handling, and logging.
 */

import { Resend } from 'resend';
import { checkEmailRateLimit, canReceiveEmail } from './rate-limiter';
import { logEmailSend, getEmailContext } from './logger';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_CONFIG = {
  from: 'Inkdex <no-reply@inkdex.io>',
  replyTo: 'support@inkdex.io',
  unsubscribeUrl: (email: string) =>
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/unsubscribe?email=${encodeURIComponent(email)}`,
} as const;

/**
 * Email types for analytics and logging
 */
export type EmailType =
  | 'welcome'
  | 'subscription_created'
  | 'subscription_expiring'
  | 'subscription_cancelled'
  | 'sync_failed'
  | 'sync_reauthenticate'
  | 'downgrade_warning'
  | 'payment_failed'
  | 'profile_deleted';

/**
 * Send email with rate limiting, preference checking, error handling, and logging
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  type,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
}) {
  // Get email context (user ID, artist ID) for logging
  const context = await getEmailContext(to);

  try {
    // 1. Check email preferences (can user receive this type?)
    const canReceive = await canReceiveEmail(to, type);
    if (!canReceive) {
      console.log(`[EMAIL] User ${to} has unsubscribed from ${type} emails`);

      // Log as skipped
      await logEmailSend({
        recipientEmail: to,
        userId: context.userId,
        artistId: context.artistId,
        emailType: type,
        subject,
        success: false,
        errorMessage: 'User has unsubscribed from this email type',
      });

      return { success: false, error: 'User has unsubscribed', skipped: true };
    }

    // 2. Check rate limits
    const rateLimit = await checkEmailRateLimit(to, type);
    if (!rateLimit.allowed) {
      console.warn(
        `[EMAIL] Rate limit exceeded for ${to} (${type}): ${rateLimit.reason}`
      );

      // Log as rate limited
      await logEmailSend({
        recipientEmail: to,
        userId: context.userId,
        artistId: context.artistId,
        emailType: type,
        subject,
        success: false,
        errorMessage: rateLimit.reason || 'Rate limit exceeded',
      });

      return {
        success: false,
        error: rateLimit.reason || 'Rate limit exceeded',
        rateLimited: true,
      };
    }

    // 3. Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html,
      text,
      replyTo: EMAIL_CONFIG.replyTo,
    });

    // Log successful send
    console.log(`[EMAIL] Sent ${type} to ${to}:`, result.data?.id);

    await logEmailSend({
      recipientEmail: to,
      userId: context.userId,
      artistId: context.artistId,
      emailType: type,
      subject,
      success: true,
      resendId: result.data?.id,
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    // Log error
    console.error(`[EMAIL] Failed to send ${type} to ${to}:`, error);

    await logEmailSend({
      recipientEmail: to,
      userId: context.userId,
      artistId: context.artistId,
      emailType: type,
      subject,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return { success: false, error };
  }
}

/**
 * Send batch emails (max 100 per request per Resend limits)
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    type: EmailType;
  }>
) {
  // Resend limit is 100 emails per batch
  const BATCH_SIZE = 100;
  const results = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    try {
      const batchResult = await resend.batch.send(
        batch.map((email) => ({
          from: EMAIL_CONFIG.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          replyTo: EMAIL_CONFIG.replyTo,
        }))
      );

      console.log(`[EMAIL] Sent batch of ${batch.length} emails:`, batchResult.data);
      results.push({ success: true, data: batchResult.data });
    } catch (error) {
      console.error(`[EMAIL] Failed to send batch:`, error);
      results.push({ success: false, error });
    }
  }

  return results;
}
