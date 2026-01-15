/* eslint-disable @typescript-eslint/no-explicit-any -- Apify API responses vary */
/**
 * Instagram Profile Image Fetcher
 *
 * Fetches multiple images from an Instagram profile.
 * Primary: ScrapingDog (5x cheaper)
 * Fallback: Apify
 */

import { ApifyClient } from 'apify-client';
import { InstagramError, ERROR_MESSAGES } from './post-fetcher';
import { fetchProfileWithScrapingDog } from './scrapingdog-client';
import { normalizeInstagramHandle } from '@/lib/utils/slug';

// Extend error messages for profile-specific errors
export const PROFILE_ERROR_MESSAGES = {
  ...ERROR_MESSAGES,
  INSUFFICIENT_POSTS: "This profile only has videos. Visual search needs at least one image post.",
  NO_POSTS: "This profile has no public posts.",
  SCRAPING_FAILED: "Couldn't fetch images from this profile. Try uploading an image directly.",
  APIFY_ERROR: "Instagram profile scraping service temporarily unavailable. Try again in a few minutes.",
} as const;

/** Metadata for a single Instagram post */
export interface InstagramPostMetadata {
  shortcode: string;        // Instagram shortcode (e.g., "ABC123def_-")
  url: string;              // Full Instagram URL (https://instagram.com/p/{shortcode}/)
  displayUrl: string;       // CDN image URL for downloading
  caption: string | null;
  timestamp: string | null; // ISO 8601
  likesCount: number | null;
}

export interface InstagramProfileData {
  posts: InstagramPostMetadata[]; // Array of post metadata with image URLs
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
 * Fetches recent images from an Instagram profile
 *
 * Uses ScrapingDog as primary (5x cheaper), falls back to Apify.
 *
 * @param username - Instagram username (without @ prefix)
 * @param limit - Maximum number of images to fetch (default: 6, max: 50)
 * @returns Profile data with array of image URLs
 * @throws InstagramError for various failure scenarios
 *
 * @example
 * ```typescript
 * const profile = await fetchInstagramProfileImages('tattooartist', 6);
 * console.log(profile.posts[0].displayUrl); // 'https://...'
 * console.log(profile.posts[0].shortcode); // 'ABC123def'
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

  const normalizedUsername = normalizeInstagramHandle(username);

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

  // Try ScrapingDog first (5x cheaper than Apify)
  if (process.env.SCRAPINGDOG_API_KEY) {
    try {
      const result = await fetchProfileWithScrapingDog(normalizedUsername, limit);
      return result;
    } catch (error) {
      // Don't fallback for auth/config errors - these won't self-heal
      if (error instanceof InstagramError && error.code === 'AUTH_FAILED') {
        console.error(`[Instagram] ScrapingDog auth failed - check SCRAPINGDOG_API_KEY`);
        throw error;
      }

      // Log and fall through to Apify for transient errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Instagram] ScrapingDog failed for @${normalizedUsername}, falling back to Apify: ${errorMessage}`);
    }
  }

  // Fallback to Apify
  return fetchWithApify(normalizedUsername, limit);
}

/**
 * Internal: Fetches profile using Apify
 */
async function fetchWithApify(
  normalizedUsername: string,
  limit: number
): Promise<InstagramProfileData> {
  // Check for Apify API token - prefer FREE tier for lightweight operations
  const apifyToken = process.env.APIFY_API_TOKEN_FREE || process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    console.error('[Apify] Neither APIFY_API_TOKEN_FREE nor APIFY_API_TOKEN is configured');
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

    // Extract posts with full metadata
    const extractedPosts: InstagramPostMetadata[] = [];

    for (const post of posts) {
      // Skip videos
      if (post.type === 'Video') {
        continue;
      }

      // Must have shortcode and displayUrl
      const shortcode = post.shortCode;
      const displayUrl = post.displayUrl;
      if (!shortcode || !displayUrl) {
        continue;
      }

      extractedPosts.push({
        shortcode,
        url: post.url || `https://www.instagram.com/p/${shortcode}/`,
        displayUrl,
        caption: post.caption || null,
        timestamp: post.timestamp || null,
        likesCount: post.likesCount ?? null,
      });

      // Stop if we have enough posts
      if (extractedPosts.length >= limit) {
        break;
      }
    }

    // Validate minimum post count (need at least 1 image for visual search)
    if (extractedPosts.length < 1) {
      throw new InstagramError(
        PROFILE_ERROR_MESSAGES.INSUFFICIENT_POSTS,
        'INSUFFICIENT_POSTS'
      );
    }

    console.log(`[Apify] Extracted ${extractedPosts.length} posts with metadata`);

    return {
      posts: extractedPosts,
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
