/**
 * Tattoo Artist Classifier
 *
 * Two-stage classifier to determine if an Instagram profile belongs to a tattoo artist:
 * 1. Bio keyword check (instant, free)
 * 2. Image classification fallback (GPT-5-mini, ~$0.02 per attempt)
 */

import OpenAI from 'openai';
import axios from 'axios';
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
// Exported for use in bulk mining operations
export const BIO_KEYWORDS = [
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

// Extended keywords for bulk discovery (broader matching)
// These catch professional artists with style-focused or booking-focused bios
export const EXTENDED_BIO_KEYWORDS = [
  ...BIO_KEYWORDS,
  // Booking/availability signals
  'booking',
  'appointments',
  'dm for',
  'book now',
  'books open',
  'books closed',
  'waitlist',
  // Professional terms
  'flash',
  'custom work',
  'guest artist',
  'resident artist',
  // Style keywords (strong artist signal)
  'blackwork',
  'fineline',
  'fine line',
  'traditional',
  'neo-traditional',
  'realism',
  'portrait',
  'geometric',
  'dotwork',
  'watercolor',
  'japanese',
  'irezumi',
  'tribal',
  'new school',
  'old school',
  'lettering',
  'script',
  'color realism',
  'black and grey',
  'black & grey',
  'ornamental',
  'mandala',
  'minimalist',
  'illustrative',
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
 * Quick bio-only check for bulk mining operations
 * Uses extended keywords for broader matching
 *
 * @param bio - Instagram bio text
 * @param useExtended - Whether to use extended keywords (default: true)
 * @returns true if bio indicates tattoo artist
 */
export function isTattooArtistByBio(
  bio: string | undefined,
  useExtended: boolean = true
): boolean {
  if (!bio) return false;

  const bioLower = bio.toLowerCase();
  const keywords = useExtended ? EXTENDED_BIO_KEYWORDS : BIO_KEYWORDS;
  return keywords.some(keyword => bioLower.includes(keyword));
}

/**
 * Get matching keywords from bio (for debugging/logging)
 *
 * @param bio - Instagram bio text
 * @returns Array of matched keywords
 */
export function getMatchingBioKeywords(bio: string | undefined): string[] {
  if (!bio) return [];

  const bioLower = bio.toLowerCase();
  return EXTENDED_BIO_KEYWORDS.filter(keyword => bioLower.includes(keyword));
}

/**
 * Download an image and convert to base64 data URL
 * Instagram CDN URLs expire quickly, so we must download before sending to OpenAI
 */
async function downloadAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn(`[Classifier] Failed to download image: ${error instanceof Error ? error.message : 'unknown'}`);
    return null;
  }
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

  // Download up to 6 images as base64 (Instagram CDN URLs expire quickly)
  const imagesToProcess = images.slice(0, 6);
  console.log(`[Classifier] Downloading ${imagesToProcess.length} images as base64...`);

  const base64Images = await Promise.all(
    imagesToProcess.map(url => downloadAsBase64(url))
  );

  // Filter out failed downloads
  const validImages = base64Images.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    console.warn('[Classifier] No images could be downloaded');
    return {
      passed: false,
      confidence: 0,
      details: 'Could not download any images for classification',
    };
  }

  console.log(`[Classifier] Downloaded ${validImages.length}/${imagesToProcess.length} images`);

  // Classify images in parallel
  const classificationPromises = validImages.map(async (base64Image, index) => {
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
                  url: base64Image,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_completion_tokens: 10,
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      const isTattoo = result === 'yes';

      console.log(`[Classifier] Image ${index + 1}/${validImages.length}: ${isTattoo ? 'TATTOO' : 'NOT TATTOO'}`);

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
