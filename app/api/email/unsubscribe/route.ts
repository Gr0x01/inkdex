/**
 * Email Unsubscribe API
 *
 * POST /api/email/unsubscribe
 *
 * Unsubscribes user from all emails
 * Required for CAN-SPAM, GDPR, CASL compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Validation schema
const unsubscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Service client
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = unsubscribeSchema.parse(body);

    const supabase = getServiceClient();

    // Call unsubscribe function
    const { data, error } = await supabase.rpc('unsubscribe_from_emails', {
      p_email: email,
      p_unsubscribe_all: true,
      p_reason: 'User clicked unsubscribe link',
    });

    if (error) {
      console.error('[Unsubscribe] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[Unsubscribe] User ${email} unsubscribed (preference ID: ${data})`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from all emails',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Unsubscribe] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
