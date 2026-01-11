/**
 * Add Artist Recommendation API
 *
 * Public endpoint for users to recommend tattoo artists
 * Process:
 * 1. Rate limiting (5 submissions/hour/IP)
 * 2. Turnstile captcha (after 2nd submission)
 * 3. Classifier gate (bio keywords OR image classification)
 * 4. Create artist + queue scraping job
 * 5. Log to artist_recommendations audit table
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { ClassifierResultRecord } from '@/types/classifier.types';
import { toJsonb } from '@/types/database-helpers';
import { getClientIp, checkAddArtistRateLimit } from '@/lib/rate-limiter';
import { verifyTurnstileToken } from '@/lib/turnstile/verify';
import { classifyTattooArtist, saveImagesToTemp } from '@/lib/instagram/classifier';
import { processArtistImages } from '@/lib/processing/process-artist';

// Validation schema
const RecommendSchema = z.object({
  instagram_handle: z
    .string()
    .min(1, 'Instagram handle is required')
    .max(30, 'Instagram handle too long')
    .regex(
      /^@?[a-zA-Z0-9._]+$/,
      'Invalid Instagram handle format'
    )
    .transform(val => val.replace(/^@/, '').toLowerCase()),
  turnstile_token: z.string().optional(),
});

// Initialize Supabase client with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[Recommend API] Missing Supabase configuration - check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

/**
 * Generate a URL-safe slug from Instagram handle
 */
function generateSlug(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

/**
 * POST /api/add-artist/recommend
 * Submit artist recommendation
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Verify request origin
    const origin = request.headers.get('origin');

    // Normalize hostname (strip www prefix for comparison)
    const normalizeHost = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io';
    const originHost = origin ? normalizeHost(origin) : '';
    const configuredHost = normalizeHost(configuredUrl);

    // Allow if normalized hostnames match (handles www vs non-www)
    // Also allow localhost variants in development
    const isLocalhost = originHost === 'localhost' || originHost === '127.0.0.1';
    const isAllowedOrigin = origin && (originHost === configuredHost || isLocalhost);

    if (!origin || !isAllowedOrigin) {
      console.error('[Recommend API] Origin rejected:', { origin, originHost, configuredHost });
      return NextResponse.json(
        { error: 'INVALID_ORIGIN', message: 'Request origin not allowed' },
        { status: 403 }
      );
    }

    // Extract client IP
    const clientIp = getClientIp(request);

    // Check rate limit
    const rateLimit = await checkAddArtistRateLimit(clientIp);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many recommendations. Please try again later.',
          reset: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Require captcha after 2nd submission (remaining < 3)
    const requiresCaptcha = rateLimit.remaining < 3;

    // Parse request body
    const body = await request.json();
    const validation = RecommendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { instagram_handle, turnstile_token } = validation.data;

    // Verify Turnstile token if required
    if (requiresCaptcha) {
      if (!turnstile_token) {
        return NextResponse.json(
          {
            error: 'CAPTCHA_REQUIRED',
            message: 'Please complete the captcha verification.',
          },
          { status: 400 }
        );
      }

      const captchaValid = await verifyTurnstileToken(turnstile_token, clientIp);
      if (!captchaValid) {
        return NextResponse.json(
          {
            error: 'CAPTCHA_FAILED',
            message: 'Captcha verification failed. Please try again.',
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate artist
    const { data: existingArtist, error: lookupError } = await supabase
      .rpc('get_artist_by_handle', {
        p_instagram_handle: instagram_handle,
      })
      .maybeSingle();

    if (lookupError) {
      console.error('[Recommend API] Error checking for existing artist:', lookupError);
      return NextResponse.json(
        {
          error: 'SERVER_ERROR',
          message: 'Unable to verify artist status. Please try again.',
        },
        { status: 500 }
      );
    }

    if (existingArtist) {
      // Log as duplicate
      const duplicateResult: ClassifierResultRecord = {
        passed: true,
        method: 'duplicate',
        confidence: 1.0,
        details: 'Artist already exists in database',
      };

      await supabase.from('artist_recommendations').insert({
        instagram_handle,
        submitter_ip: clientIp,
        status: 'duplicate',
        artist_id: existingArtist.id,
        classifier_result: toJsonb(duplicateResult),
      });

      return NextResponse.json(
        {
          error: 'DUPLICATE',
          message: `@${instagram_handle} is already in our database!`,
          artistUrl: `/artists/${existingArtist.slug}`,
          artistName: existingArtist.name,
        },
        { status: 409 }
      );
    }

    // Run classifier
    console.log(`[Recommend API] Classifying @${instagram_handle}...`);
    const classifierResult = await classifyTattooArtist(instagram_handle);

    // If classifier failed, log and return error
    if (!classifierResult.passed) {
      const rejectedResult: ClassifierResultRecord = {
        passed: classifierResult.passed,
        method: classifierResult.method,
        confidence: classifierResult.confidence,
        details: classifierResult.details,
        bio: classifierResult.bio,
        follower_count: classifierResult.follower_count,
      };

      await supabase.from('artist_recommendations').insert({
        instagram_handle,
        bio: classifierResult.bio,
        follower_count: classifierResult.follower_count,
        submitter_ip: clientIp,
        status: 'rejected',
        classifier_result: toJsonb(rejectedResult),
      });

      return NextResponse.json(
        {
          error: 'CLASSIFIER_FAILED',
          message: classifierResult.details || 'This account does not appear to be a tattoo artist.',
          method: classifierResult.method,
        },
        { status: 400 }
      );
    }

    // Classifier passed - create artist record
    console.log(`[Recommend API] Creating artist record for @${instagram_handle}...`);

    const slug = generateSlug(instagram_handle);
    const { data: newArtist, error: artistError } = await supabase
      .from('artists')
      .insert({
        instagram_handle,
        name: instagram_handle, // Will be updated after scraping
        slug,
        instagram_url: `https://www.instagram.com/${instagram_handle}/`,
        city: 'pending', // Will be updated during onboarding or manual assignment
        bio: classifierResult.bio,
        follower_count: classifierResult.follower_count,
        discovery_source: 'user_recommendation',
        verification_status: 'unclaimed',
      })
      .select('id, slug')
      .single();

    if (artistError || !newArtist) {
      // Check for unique constraint violation (race condition)
      if (artistError?.code === '23505') {
        console.log('[Recommend API] Race condition - artist already created');

        // Fetch the existing artist
        const { data: existing } = await supabase
          .rpc('get_artist_by_handle', { p_instagram_handle: instagram_handle })
          .maybeSingle();

        if (existing) {
          return NextResponse.json(
            {
              error: 'DUPLICATE',
              message: `@${instagram_handle} was just added!`,
              artistUrl: `/artists/${existing.slug}`,
              artistName: existing.name,
            },
            { status: 409 }
          );
        }
      }

      console.error('[Recommend API] Error creating artist:', artistError);
      return NextResponse.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to create artist record. Please try again.',
        },
        { status: 500 }
      );
    }

    // Save images from classifier to temp directory (if available)
    // This avoids re-fetching images that were already downloaded for classification
    let imagesSaved = false;
    if (classifierResult.downloadedImages && classifierResult.downloadedImages.length > 0) {
      console.log(`[Recommend API] Saving ${classifierResult.downloadedImages.length} images from classifier...`);
      const saveResult = await saveImagesToTemp(
        newArtist.id,
        classifierResult.downloadedImages,
        classifierResult.profileImageUrl
      );
      imagesSaved = saveResult.success;

      if (saveResult.success) {
        console.log(`[Recommend API] ✅ Images saved to temp directory`);

        // Fire-and-forget: process images in background
        // Note: In serverless (Vercel), this relies on the function staying alive
        // long enough. If it fails, the scraping job fallback will handle it.
        processArtistImages(newArtist.id)
          .then((result) => {
            console.log(`[Recommend API] Background processing complete: ${result.imagesProcessed} images`);
          })
          .catch((err) => {
            console.error(`[Recommend API] Background processing failed for ${newArtist.id}:`, err);
          });
      } else {
        console.warn(`[Recommend API] Failed to save images: ${saveResult.error}`);
      }
    }

    // Always create scraping job as fallback
    // If background processing succeeds, the job will find images already uploaded
    // If it fails (e.g., serverless timeout), the scraping pipeline will handle it
    const { error: jobError } = await supabase.from('pipeline_jobs').insert({
      artist_id: newArtist.id,
      job_type: 'scrape_single',
      triggered_by: 'recommend-flow',
      status: imagesSaved ? 'running' : 'pending',
    });

    if (jobError && jobError.code !== '23505') { // Ignore duplicate key errors
      console.error('[Recommend API] Error creating scraping job:', jobError);
    }

    // Log to recommendations table
    const approvedResult: ClassifierResultRecord = {
      passed: classifierResult.passed,
      method: classifierResult.method,
      confidence: classifierResult.confidence,
      details: classifierResult.details,
      bio: classifierResult.bio,
      follower_count: classifierResult.follower_count,
    };

    await supabase.from('artist_recommendations').insert({
      instagram_handle,
      bio: classifierResult.bio,
      follower_count: classifierResult.follower_count,
      submitter_ip: clientIp,
      status: 'approved',
      artist_id: newArtist.id,
      classifier_result: toJsonb(approvedResult),
    });

    console.log(`[Recommend API] ✅ Success! Artist ${newArtist.id} created${imagesSaved ? ', images processing in background' : ', scraping queued'}`);

    // Return success - message varies based on whether images were saved
    const successMessage = imagesSaved
      ? `Thanks! We're adding @${instagram_handle} now. They'll appear in search within a few minutes.`
      : `Thanks! We're adding @${instagram_handle} now. They'll appear in search within 30 minutes.`;

    return NextResponse.json(
      {
        success: true,
        message: successMessage,
        handle: instagram_handle,
        artistId: newArtist.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Recommend API] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
