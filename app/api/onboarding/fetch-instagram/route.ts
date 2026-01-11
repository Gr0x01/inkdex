/**
 * Onboarding Step 1: Fetch Instagram Images
 *
 * Fetches up to 50 images from user's Instagram profile and classifies them
 * Creates onboarding_sessions row with results
 *
 * POST /api/onboarding/fetch-instagram
 *
 * Request: (no body - uses authenticated user's instagram_username)
 * Response: { sessionId: string, fetchedImages: [...], profileData: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfileImages } from '@/lib/instagram/profile-fetcher';
import { checkOnboardingRateLimit } from '@/lib/rate-limiter';
import OpenAI from 'openai';

interface FetchedImage {
  url: string;
  instagram_post_id: string;
  caption: string | null;
  classified: boolean;
}

/**
 * Classify individual image using GPT-5-mini
 */
async function classifyImage(imageUrl: string, index: number): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Onboarding] OPENAI_API_KEY not configured');
    return false; // Conservative: assume not tattoo on error
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Is this an image showcasing tattoo work? Answer 'yes' if the primary purpose is to display a tattoo (finished or in-progress).

Answer 'YES' if:
- Shows a completed tattoo on someone's body (any angle or quality)
- Shows a tattoo being worked on (in-progress shop photo)
- The main subject is the tattoo artwork itself

Answer 'NO' if:
- Personal selfie/portrait where tattoos are just visible but not the focus
- Lifestyle photos (beach, family gatherings, parties) where person happens to have tattoos
- Promotional graphics (text announcements, flyers, event posters)
- Holiday/celebration posts without tattoo focus
- Photos where tattoos are purely incidental background elements

Answer only 'yes' or 'no'.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 10,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    const isTattoo = result === 'yes';

    console.log(`[Onboarding] Image ${index + 1}: ${isTattoo ? 'TATTOO' : 'NOT TATTOO'}`);

    return isTattoo;
  } catch (error) {
    console.error(`[Onboarding] Error classifying image ${index + 1}:`, error);
    return false; // Conservative: assume not tattoo on error
  }
}

export async function POST(_request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check rate limit (3 onboarding sessions per hour)
    const rateLimit = await checkOnboardingRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many onboarding attempts. Please try again later.' },
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

    // 3. Get user's Instagram username from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('instagram_username')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.instagram_username) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect your Instagram account first.' },
        { status: 400 }
      );
    }

    const instagramUsername = userData.instagram_username;

    // 4. Fetch Instagram profile images (up to 50)
    console.log(`[Onboarding] Fetching Instagram images for @${instagramUsername}...`);

    let profileData;
    try {
      profileData = await fetchInstagramProfileImages(instagramUsername, 50);
    } catch (error) {
      console.error('[Onboarding] Instagram fetch failed:', error);

      // Handle specific Instagram errors
      const instagramError = error as { code?: string };
      if (instagramError.code === 'PRIVATE_ACCOUNT') {
        return NextResponse.json(
          { error: 'Your Instagram account is private. Please make it public to continue onboarding.' },
          { status: 403 }
        );
      } else if (instagramError.code === 'RATE_LIMITED') {
        return NextResponse.json(
          { error: 'Instagram rate limit reached. Please try again in a few minutes.' },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch Instagram images. Please try again later.' },
          { status: 500 }
        );
      }
    }

    const { posts, bio, followerCount, username } = profileData;

    console.log(`[Onboarding] Fetched ${posts.length} images from @${username}`);

    // 5. Classify images in parallel (6 concurrent GPT-5-mini calls)
    const BATCH_SIZE = 6;
    const classifiedImages: FetchedImage[] = [];

    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((post, batchIndex) =>
        classifyImage(post.displayUrl, i + batchIndex)
      );

      const batchResults = await Promise.all(batchPromises);

      batch.forEach((post, batchIndex) => {
        classifiedImages.push({
          url: post.displayUrl,
          instagram_post_id: post.shortcode, // Real Instagram shortcode
          caption: post.caption,
          classified: batchResults[batchIndex],
        });
      });

      console.log(`[Onboarding] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(posts.length / BATCH_SIZE)}`);
    }

    const tattooCount = classifiedImages.filter((img) => img.classified).length;
    console.log(`[Onboarding] Classification complete: ${tattooCount}/${classifiedImages.length} images are tattoos`);

    // 6. Create onboarding_sessions row with results
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({
        user_id: user.id,
        fetched_images: classifiedImages,
        profile_data: {
          bio: bio || null,
          follower_count: followerCount || null,
          username,
        },
        current_step: 1,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[Onboarding] Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to save onboarding session. Please try again.' },
        { status: 500 }
      );
    }

    // 7. Return session data
    return NextResponse.json({
      sessionId: session.id,
      fetchedImages: classifiedImages,
      profileData: {
        bio: bio || null,
        follower_count: followerCount || null,
        username,
      },
    });
  } catch (error) {
    console.error('[Onboarding] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
