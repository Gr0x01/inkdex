/**
 * Instagram Profile Image Fetcher
 *
 * Fetches multiple images from an Instagram profile using Apify's Instagram Profile Scraper
 * Used for Instagram profile URL searches to aggregate portfolio embeddings
 */

import { ApifyClient } from 'apify-client';
import { InstagramError, ERROR_MESSAGES } from './post-fetcher';

// Extend error messages for profile-specific errors
export const PROFILE_ERROR_MESSAGES = {
  ...ERROR_MESSAGES,
  INSUFFICIENT_POSTS: "This profile needs at least 3 public posts for accurate matching.",
  NO_POSTS: "This profile has no public posts.",
  SCRAPING_FAILED: "Couldn't fetch images from this profile. Try uploading an image directly.",
  APIFY_ERROR: "Instagram profile scraping service temporarily unavailable. Try again in a few minutes.",
} as const;

export interface InstagramProfileData {
  images: string[]; // Array of image URLs (displayUrl from posts)
  username: string;
  followerCount?: number;
  profileImageUrl?: string;
  bio?: string;
}

// Apify configuration
const APIFY_ACTOR = 'apify/instagram-profile-scraper';
const DEFAULT_TIMEOUT_SECS = 120; // 2 minutes max for profile scraping

/**
 * Validates Instagram username format
 * @param username - Instagram username (without @ prefix)
 * @returns True if valid format
 */
function isValidUsername(username: string): boolean {
  // Instagram usernames: 1-30 chars, alphanumeric + dots/underscores, no trailing dot
  const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
  return INSTAGRAM_USERNAME_REGEX.test(username) && !username.endsWith('.');
}

/**
 * Fetches recent images from an Instagram profile using Apify
 *
 * This function calls Apify's Instagram Profile Scraper actor to fetch
 * recent public posts from a profile. Images are extracted from the
 * latestPosts array and returned as URLs.
 *
 * @param username - Instagram username (without @ prefix)
 * @param limit - Maximum number of images to fetch (default: 6, max: 50)
 * @returns Profile data with array of image URLs
 * @throws InstagramError for various failure scenarios
 *
 * @example
 * ```typescript
 * const profile = await fetchInstagramProfileImages('tattooartist', 6);
 * console.log(profile.images); // ['https://...', 'https://...']
 * ```
 */
export async function fetchInstagramProfileImages(
  username: string,
  limit: number = 6
): Promise<InstagramProfileData> {
  // Validate inputs
  if (!username || typeof username !== 'string') {
    throw new InstagramError(
      'Username is required',
      'INVALID_URL'
    );
  }

  // Remove @ prefix if present
  const normalizedUsername = username.replace(/^@/, '').toLowerCase().trim();

  // Validate username format
  if (!isValidUsername(normalizedUsername)) {
    throw new InstagramError(
      'Invalid Instagram username format',
      'INVALID_URL'
    );
  }

  // Validate limit
  if (limit < 1 || limit > 50) {
    throw new Error('Limit must be between 1 and 50');
  }

  // Check for Apify API token
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    console.error('[Apify] APIFY_API_TOKEN is not configured');
    throw new InstagramError(
      'Profile scraping service temporarily unavailable. Please try again later.',
      'FETCH_FAILED'
    );
  }

  try {
    // Initialize Apify client
    const client = new ApifyClient({
      token: apifyToken,
    });

    // Prepare actor input
    const runInput = {
      usernames: [normalizedUsername],
      resultsLimit: limit,
      resultsType: 'posts',
      searchType: 'user',
      searchLimit: 1,
      addParentData: false,
    };

    console.log(`[Apify] Scraping profile @${normalizedUsername} (limit: ${limit})...`);

    // Run the actor and wait for completion
    const run = await client.actor(APIFY_ACTOR).call(runInput, {
      timeout: DEFAULT_TIMEOUT_SECS,
    });

    // Fetch results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      throw new InstagramError(
        'No profile data found. The account may be private or deleted.',
        'PRIVATE_ACCOUNT'
      );
    }

    // Extract profile data
    const profile = items[0] as any;
    const posts = profile.latestPosts || [];

    // Extract metadata
    const followerCount = profile.followersCount || 0;
    const profileImageUrl = profile.profilePicUrlHD || profile.profilePicUrl;
    const bio = profile.biography;

    console.log(`[Apify] Found ${posts.length} posts, ${followerCount} followers`);

    // Handle no posts
    if (posts.length === 0) {
      throw new InstagramError(
        PROFILE_ERROR_MESSAGES.NO_POSTS,
        'PRIVATE_ACCOUNT' // Reuse code for consistency
      );
    }

    // Extract image URLs from posts
    const images: string[] = [];

    for (const post of posts) {
      // Skip videos
      if (post.type === 'Video') {
        continue;
      }

      // Get displayUrl (high-quality image)
      const imageUrl = post.displayUrl;
      if (imageUrl && typeof imageUrl === 'string') {
        images.push(imageUrl);
      }

      // Stop if we have enough images
      if (images.length >= limit) {
        break;
      }
    }

    // Validate minimum image count
    if (images.length < 3) {
      throw new InstagramError(
        PROFILE_ERROR_MESSAGES.INSUFFICIENT_POSTS,
        'PRIVATE_ACCOUNT' // Reuse code for consistency
      );
    }

    console.log(`[Apify] Extracted ${images.length} image URLs`);

    return {
      images,
      username: normalizedUsername,
      followerCount,
      profileImageUrl,
      bio,
    };

  } catch (error) {
    // Re-throw InstagramError as-is
    if (error instanceof InstagramError) {
      throw error;
    }

    // Handle Apify-specific errors
    if (error instanceof Error) {
      console.error('[Apify] Error fetching profile:', error.message);

      // Check for common error patterns
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        throw new InstagramError(
          'Profile scraping timed out. The profile may be too large or Instagram is slow.',
          'RATE_LIMITED'
        );
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new InstagramError(
          PROFILE_ERROR_MESSAGES.RATE_LIMITED,
          'RATE_LIMITED'
        );
      }

      // Generic Apify error
      throw new InstagramError(
        PROFILE_ERROR_MESSAGES.APIFY_ERROR,
        'FETCH_FAILED'
      );
    }

    // Unknown error
    throw new InstagramError(
      PROFILE_ERROR_MESSAGES.SCRAPING_FAILED,
      'FETCH_FAILED'
    );
  }
}
