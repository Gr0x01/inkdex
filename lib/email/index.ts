/**
 * Email Service - Main Entry Point
 *
 * Centralized email sending with React Email templates and Resend.
 * All parameters are validated and sanitized before sending.
 */

import { render } from '@react-email/components';
import WelcomeEmail from './templates/welcome';
import SyncFailedEmail from './templates/sync-failed';
import SubscriptionCreatedEmail from './templates/subscription-created';
import DowngradeWarningEmail from './templates/downgrade-warning';
import PaymentFailedEmail from './templates/payment-failed';
import { sendEmail, type EmailType as _EmailType } from './resend';
import {
  welcomeEmailSchema,
  syncFailedEmailSchema,
  subscriptionCreatedEmailSchema,
  downgradeWarningEmailSchema,
  paymentFailedEmailSchema,
  type WelcomeEmailParams,
  type SyncFailedEmailParams,
  type SubscriptionCreatedEmailParams,
  type DowngradeWarningEmailParams,
  type PaymentFailedEmailParams,
} from './validation';

/**
 * Send welcome email after onboarding
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  // Validate and sanitize all inputs
  const validated = welcomeEmailSchema.parse(params);

  const html = await render(
    WelcomeEmail({
      artistName: validated.artistName,
      profileUrl: validated.profileUrl,
      instagramHandle: validated.instagramHandle,
      isPro: validated.isPro || false,
      to: validated.to,
    })
  );

  const text = `Welcome to Inkdex${validated.isPro ? ' Pro' : ''}, ${validated.artistName}! Your profile is now live at ${validated.profileUrl}`;

  return sendEmail({
    to: validated.to,
    subject: `Welcome to Inkdex${validated.isPro ? ' Pro' : ''}! 🎨`,
    html,
    text,
    type: 'welcome',
  });
}

/**
 * Send sync failed email
 */
export async function sendSyncFailedEmail(params: SyncFailedEmailParams) {
  // Validate and sanitize all inputs
  const validated = syncFailedEmailSchema.parse(params);

  const html = await render(
    SyncFailedEmail({
      artistName: validated.artistName,
      failureReason: validated.failureReason,
      failureCount: validated.failureCount,
      dashboardUrl: validated.dashboardUrl,
      instagramHandle: validated.instagramHandle,
      needsReauth: validated.needsReauth || false,
      to: validated.to,
    })
  );

  const text = `Hi ${validated.artistName}, we couldn't sync your Instagram posts. ${validated.needsReauth ? 'You need to reconnect your Instagram account.' : 'We\'ll retry automatically.'} Visit ${validated.dashboardUrl} for details.`;

  return sendEmail({
    to: validated.to,
    subject: validated.needsReauth
      ? 'Action Required: Reconnect Instagram'
      : 'Instagram Sync Issue',
    html,
    text,
    type: validated.needsReauth ? 'sync_reauthenticate' : 'sync_failed',
  });
}

/**
 * Send subscription created email
 */
export async function sendSubscriptionCreatedEmail(params: SubscriptionCreatedEmailParams) {
  // Validate and sanitize all inputs
  const validated = subscriptionCreatedEmailSchema.parse(params);

  const html = await render(
    SubscriptionCreatedEmail({
      artistName: validated.artistName,
      plan: validated.plan,
      amount: validated.amount,
      dashboardUrl: validated.dashboardUrl,
      billingPortalUrl: validated.billingPortalUrl,
      to: validated.to,
    })
  );

  const text = `Welcome to Inkdex Pro, ${validated.artistName}! Your ${validated.plan} subscription is now active. Visit ${validated.dashboardUrl} to explore your new features.`;

  return sendEmail({
    to: validated.to,
    subject: 'Welcome to Inkdex Pro! 👑',
    html,
    text,
    type: 'subscription_created',
  });
}

/**
 * Send downgrade warning email (7 days before)
 */
export async function sendDowngradeWarningEmail(params: DowngradeWarningEmailParams) {
  // Validate and sanitize all inputs
  const validated = downgradeWarningEmailSchema.parse(params);

  const html = await render(
    DowngradeWarningEmail({
      artistName: validated.artistName,
      endDate: validated.endDate,
      portfolioImageCount: validated.portfolioImageCount,
      billingPortalUrl: validated.billingPortalUrl,
      dashboardUrl: validated.dashboardUrl,
      to: validated.to,
    })
  );

  const text = `Hi ${validated.artistName}, your Pro subscription ends ${validated.endDate}. Visit ${validated.billingPortalUrl} to reactivate and keep your Pro features.`;

  return sendEmail({
    to: validated.to,
    subject: 'Your Pro Subscription is Ending',
    html,
    text,
    type: 'downgrade_warning',
  });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(params: PaymentFailedEmailParams) {
  // Validate and sanitize all inputs
  const validated = paymentFailedEmailSchema.parse(params);

  const html = await render(
    PaymentFailedEmail({
      artistName: validated.artistName,
      billingPortalUrl: validated.billingPortalUrl,
      to: validated.to,
    })
  );

  const text = `Hi ${validated.artistName}, we couldn't process your Pro subscription payment. Please update your payment method at ${validated.billingPortalUrl}`;

  return sendEmail({
    to: validated.to,
    subject: 'Payment Issue - Update Your Payment Method',
    html,
    text,
    type: 'payment_failed',
  });
}

// Re-export types and utilities
export { sendEmail, type EmailType } from './resend';
