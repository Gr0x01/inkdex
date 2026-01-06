/**
 * Verify Onboarding Return Token
 *
 * Verifies a JWT token from Stripe checkout return URL.
 * Returns the decoded sessionId and artistId if valid.
 *
 * POST /api/onboarding/verify-return-token
 *
 * Request: { token: string }
 * Response: { sessionId: string, artistId: string, upgraded: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOnboardingRateLimit } from '@/lib/rate-limiter';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

// Zod schema for validating JWT payload structure
const returnTokenPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  artistId: z.string().uuid(),
  userId: z.string().uuid(),
  upgraded: z.boolean(),
});

type ReturnTokenPayload = z.infer<typeof returnTokenPayloadSchema>;

export async function POST(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[VerifyReturnToken] JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const parsed = verifyTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Verify the JWT with algorithm restriction
    let decoded: ReturnTokenPayload;
    try {
      const rawDecoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
      });

      // Validate the payload structure with Zod
      const payloadParsed = returnTokenPayloadSchema.safeParse(rawDecoded);
      if (!payloadParsed.success) {
        console.error('[VerifyReturnToken] Invalid payload structure:', payloadParsed.error.flatten());
        return NextResponse.json(
          { error: 'Invalid token payload' },
          { status: 401 }
        );
      }

      decoded = payloadParsed.data;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { error: 'Token has expired. Please try the checkout again.' },
          { status: 401 }
        );
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
      throw jwtError;
    }

    // Validate the user making the request matches the token
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit to prevent brute force attempts
    const rateLimit = await checkOnboardingRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
          },
        }
      );
    }

    if (decoded.userId !== user.id) {
      return NextResponse.json(
        { error: 'Token does not match authenticated user' },
        { status: 403 }
      );
    }

    // Return the decoded values
    return NextResponse.json({
      sessionId: decoded.sessionId,
      artistId: decoded.artistId,
      upgraded: decoded.upgraded,
    });
  } catch (error) {
    console.error('[VerifyReturnToken] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
