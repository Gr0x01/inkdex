/**
 * Admin Magic Link Login Endpoint
 *
 * Generates and sends a magic link for admin authentication.
 * Only whitelisted admin emails can request a magic link.
 *
 * POST /api/admin/auth/login
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { checkRateLimit } from '@/lib/redis/rate-limiter';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Check rate limit (Redis-based, 5 attempts per minute)
    const rateLimitResult = await checkRateLimit(
      `admin-login:${normalizedEmail}`,
      5, // max attempts
      60 * 1000 // 1 minute window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    // Check if email is whitelisted
    if (!isAdminEmail(normalizedEmail)) {
      // Don't reveal whether the email exists - always return success
      // This prevents email enumeration attacks
      console.warn(`[Admin] Unauthorized login attempt: ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        message: 'If this email is authorized, a magic link has been sent.',
      });
    }

    // Create Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Admin] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists in Supabase Auth
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!existingUser) {
      // Create the admin user if they don't exist
      const { error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true, // Auto-confirm admin emails
      });

      if (createError) {
        console.error('[Admin] Failed to create admin user:', createError);
        return NextResponse.json(
          { error: 'Failed to create admin account' },
          { status: 500 }
        );
      }

      console.log(`[Admin] Created new admin user: ${normalizedEmail}`);
    }

    // Generate magic link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${appUrl}/admin`,
      },
    });

    if (linkError || !linkData) {
      console.error('[Admin] Failed to generate magic link:', linkError);
      return NextResponse.json(
        { error: 'Failed to send login link' },
        { status: 500 }
      );
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      console.error('[Admin] No action link in response');
      return NextResponse.json(
        { error: 'Failed to generate login link' },
        { status: 500 }
      );
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Admin] Development magic link for ${normalizedEmail}:`);
      console.log(actionLink);
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Inkdex <no-reply@inkdex.io>',
      to: normalizedEmail,
      subject: 'Inkdex Admin Login',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Admin Login</h2>
          <p>Click the button below to log in to the Inkdex admin panel:</p>
          <p style="margin: 24px 0;">
            <a href="${actionLink}"
               style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Log In to Admin
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link expires in 1 hour. If you didn't request this, you can ignore this email.
          </p>
        </div>
      `,
      text: `Log in to Inkdex Admin: ${actionLink}\n\nThis link expires in 1 hour.`,
    });

    if (emailError) {
      console.error('[Admin] Failed to send email via Resend:', emailError);
      return NextResponse.json(
        { error: 'Failed to send login email' },
        { status: 500 }
      );
    }

    console.log(`[Admin] Magic link sent to: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: 'If this email is authorized, a magic link has been sent.',
      // Only include link info in development for testing
      ...(process.env.NODE_ENV === 'development' && {
        devLink: linkData.properties?.action_link,
      }),
    });
  } catch (error) {
    console.error('[Admin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
