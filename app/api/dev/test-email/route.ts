/**
 * Test Email Endpoint (Development Only)
 *
 * Send test emails to verify Resend integration and template rendering.
 *
 * POST /api/dev/test-email
 *
 * Request: {
 *   type: 'welcome' | 'sync_failed' | 'subscription_created' | 'downgrade_warning',
 *   to: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  sendWelcomeEmail,
  sendSyncFailedEmail,
  sendSubscriptionCreatedEmail,
  sendDowngradeWarningEmail,
} from '@/lib/email';

// Validation schema for test email request
const testEmailSchema = z.object({
  type: z.enum([
    'welcome',
    'welcome_pro',
    'sync_failed',
    'sync_failed_reauth',
    'subscription_created',
    'subscription_created_annual',
    'downgrade_warning',
  ]),
  to: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate request with Zod
    const validated = testEmailSchema.parse(body);
    const { type, to } = validated;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let result;

    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail({
          to,
          artistName: 'Alex Rivera',
          profileUrl: `${baseUrl}/alex-rivera`,
          instagramHandle: 'alex.rivera.tattoo',
          isPro: false,
        });
        break;

      case 'welcome_pro':
        result = await sendWelcomeEmail({
          to,
          artistName: 'Morgan Black',
          profileUrl: `${baseUrl}/morgan-black`,
          instagramHandle: 'morgan.black.ink',
          isPro: true,
        });
        break;

      case 'sync_failed':
        result = await sendSyncFailedEmail({
          to,
          artistName: 'Morgan Black',
          failureReason:
            'Failed to fetch posts from Instagram. This may be due to rate limiting or a temporary Instagram issue.',
          failureCount: 2,
          dashboardUrl: `${baseUrl}/dashboard`,
          instagramHandle: 'morgan.black.ink',
          needsReauth: false,
        });
        break;

      case 'sync_failed_reauth':
        result = await sendSyncFailedEmail({
          to,
          artistName: 'Morgan Black',
          failureReason: 'Your Instagram access token has expired. Please reconnect your Instagram account.',
          failureCount: 3,
          dashboardUrl: `${baseUrl}/dashboard`,
          instagramHandle: 'morgan.black.ink',
          needsReauth: true,
        });
        break;

      case 'subscription_created':
        result = await sendSubscriptionCreatedEmail({
          to,
          artistName: 'Alex Rivera',
          plan: 'monthly',
          amount: 15,
          dashboardUrl: `${baseUrl}/dashboard`,
          billingPortalUrl: `${baseUrl}/billing`,
        });
        break;

      case 'subscription_created_annual':
        result = await sendSubscriptionCreatedEmail({
          to,
          artistName: 'Alex Rivera',
          plan: 'yearly',
          amount: 150,
          dashboardUrl: `${baseUrl}/dashboard`,
          billingPortalUrl: `${baseUrl}/billing`,
        });
        break;

      case 'downgrade_warning':
        result = await sendDowngradeWarningEmail({
          to,
          artistName: 'Morgan Black',
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          portfolioImageCount: 50,
          billingPortalUrl: `${baseUrl}/billing`,
          dashboardUrl: `${baseUrl}/dashboard`,
        });
        break;

      default:
        return NextResponse.json(
          {
            error: 'Invalid type',
            validTypes: [
              'welcome',
              'welcome_pro',
              'sync_failed',
              'sync_failed_reauth',
              'subscription_created',
              'subscription_created_annual',
              'downgrade_warning',
            ],
          },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${to}`,
        emailId: result.id,
        type,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('[TestEmail] Error:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
