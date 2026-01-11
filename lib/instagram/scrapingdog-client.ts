/**
 * ScrapingDog Instagram API Client
 *
 * Alternative to Apify for Instagram scraping. ~5x cheaper.
 * - Profile + 12 posts in single request (15 credits)
 *
 * API Docs: https://docs.scrapingdog.com/instagram-scraper-api
 */

import { InstagramError } from './post-fetcher';
import { InstagramPostMetadata, InstagramProfileData, PROFILE_ERROR_MESSAGES } from './profile-fetcher';

const BASE_URL = 'https://api.scrapingdog.com/instagram';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// Response types from ScrapingDog API
interface ScrapingDogMediaItem {
  id: string;
  shortcode: string;
  display_url: string;
  thumbnail: string;
  is_video: boolean;
  caption: string | null;
  likes: number;
  comment: number;
  timestamp: number;
  owner?: {
    id: string;
    username: string;
  };
}

interface ScrapingDogProfileResponse {
  username: string;
  profile_id: string;
  full_name: string;
  bio: string;
  followers_count: number;
  following_count: number;
  is_private: boolean;
  is_verified: boolean;
  profile_pic_url: string;
  profile_pic_url_hd: string;
  category_name?: string;
  bio_links?: Array<{
    title: string;
    url: string;
    link_type: string;
  }>;
  owner_to_timeline_media?: {
    count: number;
    media: ScrapingDogMediaItem[];
  };
}

/**
 * Validates Instagram username format
 */
function isValidUsername(username: string): boolean {
  const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
  return INSTAGRAM_USERNAME_REGEX.test(username) && !username.endsWith('.');
}

/**
 * Get ScrapingDog API key from environment
 * Throws a specific error for auth failures that should NOT trigger fallback
 */
function getApiKey(): string {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  if (!apiKey) {
    throw new InstagramError(
      'ScrapingDog API key not configured',
      'AUTH_FAILED'
    );
  }
  return apiKey;
}

/**
 * Sanitizes error messages to prevent API key leakage
 */
function sanitizeError(error: Error, apiKey: string): string {
  return error.message.replace(apiKey, '[REDACTED]');
}

/**
 * Fetches Instagram profile with recent posts using ScrapingDog
 *
 * This is more efficient than Apify because it returns profile + 12 posts
 * in a single request (15 credits).
 *
 * @param username - Instagram username (without @ prefix)
 * @param limit - Maximum number of images to return (default: 12)
 * @returns Profile data with array of post metadata
 */
export async function fetchProfileWithScrapingDog(
  username: string,
  limit: number = 12
): Promise<InstagramProfileData> {
  // Validate inputs
  if (!username || typeof username !== 'string') {
    throw new InstagramError('Username is required', 'INVALID_URL');
  }

  const normalizedUsername = username.replace(/^@/, '').toLowerCase().trim();

  if (!isValidUsername(normalizedUsername)) {
    throw new InstagramError('Invalid Instagram username format', 'INVALID_URL');
  }

  const apiKey = getApiKey();
  const url = `${BASE_URL}/profile?api_key=${apiKey}&username=${normalizedUsername}`;

  console.log(`[ScrapingDog] Fetching profile: @${normalizedUsername}`);

  // Set up timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json() as ScrapingDogProfileResponse | { message: string; status: number };

    if (!response.ok) {
      const errorData = data as { message: string; status: number };
      // Don't log full error data which might contain sensitive info
      console.error(`[ScrapingDog] API error: ${response.status}`);

      if (response.status === 404 || errorData.message?.includes("doesn't exist")) {
        throw new InstagramError(
          'This Instagram account does not exist or has been deleted.',
          'ACCOUNT_NOT_FOUND'
        );
      }

      if (response.status === 401 || response.status === 403 ||
          errorData.message?.toLowerCase().includes('unauthorized') ||
          errorData.message?.toLowerCase().includes('api key')) {
        throw new InstagramError(
          'ScrapingDog authentication failed. Check API key.',
          'AUTH_FAILED'
        );
      }

      if (response.status === 429) {
        throw new InstagramError(PROFILE_ERROR_MESSAGES.RATE_LIMITED, 'RATE_LIMITED');
      }

      throw new InstagramError(
        errorData.message || 'Failed to fetch Instagram profile',
        'FETCH_FAILED'
      );
    }

    const profile = data as ScrapingDogProfileResponse;

    // Validate response has expected fields
    if (!profile.username || typeof profile.followers_count !== 'number') {
      throw new InstagramError('Invalid response from ScrapingDog API', 'FETCH_FAILED');
    }

    // Check if private
    if (profile.is_private) {
      throw new InstagramError(
        'This Instagram account is private.',
        'PRIVATE_ACCOUNT'
      );
    }

    // Extract posts from profile response
    const mediaItems = profile.owner_to_timeline_media?.media || [];

    console.log(`[ScrapingDog] Found ${profile.followers_count} followers, ${mediaItems.length} posts in response`);

    // Filter to images only and map to our format
    const extractedPosts: InstagramPostMetadata[] = [];

    for (const item of mediaItems) {
      if (item.is_video) continue;
      if (!item.shortcode || !item.display_url) continue;

      extractedPosts.push({
        shortcode: item.shortcode,
        url: `https://www.instagram.com/p/${item.shortcode}/`,
        displayUrl: item.display_url,
        caption: item.caption || null,
        timestamp: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null,
        likesCount: item.likes ?? null,
      });

      if (extractedPosts.length >= limit) break;
    }

    // Validate minimum post count
    if (extractedPosts.length < 3) {
      throw new InstagramError(
        PROFILE_ERROR_MESSAGES.INSUFFICIENT_POSTS,
        'INSUFFICIENT_POSTS'
      );
    }

    console.log(`[ScrapingDog] Extracted ${extractedPosts.length} image posts`);

    return {
      posts: extractedPosts,
      username: normalizedUsername,
      followerCount: profile.followers_count,
      profileImageUrl: profile.profile_pic_url_hd || profile.profile_pic_url,
      bio: profile.bio,
    };

  } catch (error) {
    // Re-throw InstagramError as-is
    if (error instanceof InstagramError) throw error;

    if (error instanceof Error) {
      // Sanitize error message to prevent API key leakage
      const sanitizedMessage = sanitizeError(error, apiKey);
      console.error('[ScrapingDog] Fetch error:', sanitizedMessage);

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        throw new InstagramError(
          'Profile scraping timed out.',
          'RATE_LIMITED'
        );
      }

      if (sanitizedMessage.includes('timeout') || sanitizedMessage.includes('TIMEOUT')) {
        throw new InstagramError(
          'Profile scraping timed out.',
          'RATE_LIMITED'
        );
      }
    }

    throw new InstagramError(PROFILE_ERROR_MESSAGES.SCRAPING_FAILED, 'FETCH_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }
}
