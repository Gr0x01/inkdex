/**
 * Tattoo Artist Classifier
 *
 * Two-stage classifier to determine if an Instagram profile belongs to a tattoo artist:
 * 1. Bio keyword check (instant, free)
 * 2. Image classification fallback (GPT-5-mini, ~$0.02 per attempt)
 */

import OpenAI from 'openai';
import { fetchInstagramProfileImages, InstagramProfileData } from './profile-fetcher';

export interface ClassifierResult {
  passed: boolean;
  method: 'bio' | 'image' | 'error';
  confidence: number; // 0-1
  details: string;
  instagram_id?: string;
  bio?: string;
  follower_count?: number;
}

// Tattoo artist bio keywords (case-insensitive)
const BIO_KEYWORDS = [
  'tattoo',
  'tattooist',
  'tattoo artist',
  'tattooer',
  'ink',
  'inked',
  'tattooing',
  'body art',
  'custom tattoos',
  'tattoo shop',
  'tattoo studio',
];

/**
 * Check if bio contains tattoo-related keywords
 */
function checkBioForTattooKeywords(bio: string | undefined): boolean {
  if (!bio) return false;

  const bioLower = bio.toLowerCase();
  return BIO_KEYWORDS.some(keyword => bioLower.includes(keyword));
}

/**
 * Classify images using GPT-5-mini to determine if they show tattoo work
 * Need at least 3 out of 6 images to show tattoos
 */
async function classifyImages(images: string[]): Promise<{
  passed: boolean;
  confidence: number;
  details: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Classifier] OPENAI_API_KEY is not configured');
    return {
      passed: false,
      confidence: 0,
      details: 'Classification service temporarily unavailable. Please try again later.',
    };
  }

  const client = new OpenAI({ apiKey });

  // Classify up to 6 images in parallel
  const imagesToClassify = images.slice(0, 6);
  const classificationPromises = imagesToClassify.map(async (imageUrl, index) => {
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

      console.log(`[Classifier] Image ${index + 1}/${imagesToClassify.length}: ${isTattoo ? 'TATTOO' : 'NOT TATTOO'}`);

      return isTattoo;
    } catch (error) {
      console.error(`[Classifier] Error classifying image ${index + 1}:`, error);
      return false; // Conservative: assume not tattoo on error
    }
  });

  // Wait for all classifications
  const results = await Promise.all(classificationPromises);
  const tattooCount = results.filter(Boolean).length;
  const totalImages = results.length;

  // Need at least 3 tattoo images to pass
  const passed = tattooCount >= 3;
  const confidence = totalImages > 0 ? tattooCount / totalImages : 0;

  const details = passed
    ? `${tattooCount}/${totalImages} images show tattoo work`
    : `Only ${tattooCount}/${totalImages} images show tattoo work (need at least 3)`;

  return {
    passed,
    confidence,
    details,
  };
}

/**
 * Classify an Instagram profile to determine if it belongs to a tattoo artist
 *
 * Process:
 * 1. Fetch profile data (bio, images)
 * 2. Check bio for keywords (instant, free)
 * 3. If no bio match, classify images with GPT-5-mini (~$0.02)
 *
 * @param username - Instagram username (with or without @ prefix)
 * @returns Classification result with method and confidence
 * @throws Error if profile fetch fails or account is private
 */
export async function classifyTattooArtist(
  username: string
): Promise<ClassifierResult> {
  try {
    // Remove @ prefix if present
    const normalizedUsername = username.replace(/^@/, '').toLowerCase().trim();

    console.log(`[Classifier] Classifying @${normalizedUsername}...`);

    // Fetch profile data with images
    let profileData: InstagramProfileData;
    try {
      profileData = await fetchInstagramProfileImages(normalizedUsername, 6);
    } catch (error: any) {
      // Return error classification for private accounts or fetch failures
      return {
        passed: false,
        method: 'error',
        confidence: 0,
        details: error.message || 'Failed to fetch Instagram profile',
      };
    }

    const { bio, followerCount, images } = profileData;

    // Stage 1: Bio keyword check (instant, free)
    if (checkBioForTattooKeywords(bio)) {
      console.log('[Classifier] ✅ PASS - Bio contains tattoo keywords');
      return {
        passed: true,
        method: 'bio',
        confidence: 1.0,
        details: 'Bio contains tattoo-related keywords',
        bio,
        follower_count: followerCount,
      };
    }

    console.log('[Classifier] No bio keywords found, checking images...');

    // Stage 2: Image classification (GPT-5-mini, ~$0.02)
    const imageResult = await classifyImages(images);

    if (imageResult.passed) {
      console.log('[Classifier] ✅ PASS - Portfolio shows tattoo work');
    } else {
      console.log('[Classifier] ❌ FAIL - Not enough tattoo work in portfolio');
    }

    return {
      passed: imageResult.passed,
      method: 'image',
      confidence: imageResult.confidence,
      details: imageResult.details,
      bio,
      follower_count: followerCount,
    };
  } catch (error) {
    console.error('[Classifier] Unexpected error:', error);

    return {
      passed: false,
      method: 'error',
      confidence: 0,
      details: error instanceof Error ? error.message : 'Unknown classification error',
    };
  }
}
