/**
 * Dashboard Portfolio: Fetch Instagram Images
 *
 * Fetches up to 50 images from authenticated user's Instagram profile
 * and classifies them as tattoo images using GPT-5-mini
 *
 * POST /api/dashboard/portfolio/fetch-instagram
 *
 * Response: { images: FetchedImage[], profileData: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfileImages } from '@/lib/instagram/profile-fetcher';
import { checkPortfolioFetchRateLimit } from '@/lib/rate-limiter';
import OpenAI from 'openai';

interface FetchedImage {
  url: string;
  instagram_post_id: string;
  caption: string | null;
  classified: boolean;
}

/**
 * Classify individual image using GPT-5-mini
 * (Reused logic from onboarding flow)
 */
async function classifyImage(imageUrl: string, index: number): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Portfolio] OPENAI_API_KEY not configured');
    return false; // Conservative: assume not tattoo on error
  }

  const client = new OpenAI({
    apiKey,
    timeout: 30000, // 30 second timeout per request
  });

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
- Shows a tattoo in progress (artist working on it)
- Displays tattoo flash, sketch, or design sheet
- Shows healed tattoo (weeks/months after completion)

Answer 'NO' if:
- Personal selfie where tattoos are incidental
- Lifestyle photo where person just happens to have tattoos
- Promotional graphics/text overlays
- Group photos where tattoos aren't the subject
- Studio/workspace photos without tattoo work visible
- Screenshots of other content

Only answer 'yes' or 'no'.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 10,
    });

    const answer = response.choices[0]?.message?.content?.toLowerCase().trim();
    return answer === 'yes';
  } catch (error) {
    console.error(`[Portfolio] Classification failed for image ${index}:`, error);
    return false; // Conservative: assume not tattoo on error
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check OpenAI API key BEFORE expensive operations
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Portfolio] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Image classification service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // 3. Rate limit (5 fetches per hour per user)
    const rateLimit = checkPortfolioFetchRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many portfolio fetch requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 4. Get Instagram username from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('instagram_username')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.instagram_username) {
      return NextResponse.json(
        { error: 'Instagram not connected. Please reconnect your account.' },
        { status: 400 }
      );
    }

    // 5. Fetch 50 images from Instagram (via Apify or mock)
    console.log(`[Portfolio] Fetching Instagram images for @${userData.instagram_username}...`);
    const profile = await fetchInstagramProfileImages(userData.instagram_username, 50);

    // 6. Classify images in parallel (batch of 6 concurrent, resilient to failures)
    console.log(`[Portfolio] Classifying ${profile.images.length} images...`);
    const batchSize = 6;
    const classificationResults: boolean[] = [];

    for (let i = 0; i < profile.images.length; i += batchSize) {
      const batch = profile.images.slice(i, i + batchSize);

      // Use Promise.allSettled to handle individual failures gracefully
      const batchResults = await Promise.allSettled(
        batch.map((url, localIdx) => classifyImage(url, i + localIdx))
      );

      // Extract results, defaulting to false on error
      const results = batchResults.map((result, idx) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(
            `[Portfolio] Classification failed for image ${i + idx}:`,
            result.reason
          );
          return false; // Conservative: assume not tattoo on error
        }
      });

      classificationResults.push(...results);
    }

    // 6. Build response with classified images
    const classifiedImages: FetchedImage[] = profile.images.map((url, idx) => ({
      url,
      instagram_post_id: `portfolio_${Date.now()}_${idx}`,
      caption: null,
      classified: classificationResults[idx] || false,
    }));

    const tattooCount = classifiedImages.filter((img) => img.classified).length;
    console.log(
      `[Portfolio] Classification complete: ${tattooCount}/${classifiedImages.length} tattoo images`
    );

    return NextResponse.json({
      images: classifiedImages,
      profileData: {
        username: userData.instagram_username,
        totalImages: profile.images.length,
        tattooImages: tattooCount,
      },
    });
  } catch (error: any) {
    console.error('[Portfolio] Fetch Instagram error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Instagram images' },
      { status: 500 }
    );
  }
}
