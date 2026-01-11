/**
 * Instagram Post Image Fetcher
 *
 * Fetches image URLs from Instagram posts using Apify's Instagram Scraper
 * (Migrated from oEmbed API for reliability - Jan 2026)
 */

import { ApifyClient } from 'apify-client';
import { isInstagramDomain } from './url-detector';

export interface InstagramPostData {
  imageUrl: string;
  username: string;
  caption?: string;
  thumbnailUrl?: string;
}

export class InstagramError extends Error {
  constructor(
    message: string,
    public code:
      | 'PRIVATE_ACCOUNT'
      | 'POST_NOT_FOUND'
      | 'RATE_LIMITED'
      | 'INVALID_URL'
      | 'FETCH_FAILED'
      | 'AUTH_FAILED'
      | 'ACCOUNT_NOT_FOUND'
      | 'INSUFFICIENT_POSTS'
  ) {
    super(message);
    this.name = 'InstagramError';
  }
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  PRIVATE_ACCOUNT: "This account is private. Try a public account or upload an image directly.",
  POST_NOT_FOUND: "This post couldn't be found. It may be deleted or private.",
  RATE_LIMITED: "Too many requests. Please try again in a few minutes.",
  INVALID_URL: "This doesn't look like a valid Instagram link.",
  FETCH_FAILED: "Couldn't fetch image from Instagram. Try uploading it directly.",
  AUTH_FAILED: "Instagram scraping service configuration error. Please contact support.",
  ACCOUNT_NOT_FOUND: "This Instagram account does not exist or has been deleted.",
  INSUFFICIENT_POSTS: "This profile needs at least 3 public posts for accurate matching.",
} as const;

// Apify configuration
const APIFY_ACTOR = 'apify/instagram-scraper';
const DEFAULT_TIMEOUT_SECS = 60; // 1 minute max for single post

/**
 * Fetches image data from an Instagram post using Apify
 *
 * @param postIdOrUrl - Instagram post ID (e.g., "abc123") or full URL
 * @returns Post data including image URL and metadata
 * @throws InstagramError if fetch fails
 */
export async function fetchInstagramPostImage(
  postIdOrUrl: string
): Promise<InstagramPostData> {
  // Construct full URL if only ID provided
  const postUrl = postIdOrUrl.startsWith('http')
    ? postIdOrUrl
    : `https://instagram.com/p/${postIdOrUrl}`;

  // Validate Instagram domain (security check)
  if (!isInstagramDomain(postUrl)) {
    throw new InstagramError(ERROR_MESSAGES.INVALID_URL, 'INVALID_URL');
  }

  // Check for Apify API token
  const apifyToken = process.env.APIFY_API_TOKEN_FREE || process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    console.error('[Apify] Neither APIFY_API_TOKEN_FREE nor APIFY_API_TOKEN is configured');
    throw new InstagramError(
      'Instagram scraping service temporarily unavailable. Please try again later.',
      'FETCH_FAILED'
    );
  }

  try {
    console.log(`[Apify] Fetching post: ${postUrl}`);

    // Initialize Apify client
    const client = new ApifyClient({
      token: apifyToken,
    });

    // Prepare actor input for single post
    const runInput = {
      directUrls: [postUrl],
      resultsType: 'posts',
      resultsLimit: 1,
      addParentData: false,
    };

    // Run the actor and wait for completion
    const run = await client.actor(APIFY_ACTOR).call(runInput, {
      timeout: DEFAULT_TIMEOUT_SECS,
    });

    // Fetch results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      throw new InstagramError(
        ERROR_MESSAGES.POST_NOT_FOUND,
        'POST_NOT_FOUND'
      );
    }

    // Extract post data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = items[0] as any;

    // Get image URL - for videos, use displayUrl (thumbnail)
    const imageUrl = post.displayUrl;
    const username = post.ownerUsername || 'unknown';

    if (!imageUrl) {
      throw new InstagramError(
        'No image found in Instagram post',
        'FETCH_FAILED'
      );
    }

    console.log(`[Apify] Found post by @${username}`);

    return {
      imageUrl,
      username,
      caption: post.caption || undefined,
      thumbnailUrl: imageUrl,
    };
  } catch (error) {
    // Re-throw InstagramError as-is
    if (error instanceof InstagramError) {
      throw error;
    }

    // Handle Apify-specific errors
    if (error instanceof Error) {
      console.error('[Apify] Error fetching post:', error.message);

      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        throw new InstagramError(
          'Instagram is taking too long to respond. Try uploading an image directly.',
          'FETCH_FAILED'
        );
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new InstagramError(
          ERROR_MESSAGES.RATE_LIMITED,
          'RATE_LIMITED'
        );
      }
    }

    // Generic error
    throw new InstagramError(
      error instanceof Error ? error.message : 'Unknown error',
      'FETCH_FAILED'
    );
  }
}

/**
 * Downloads image from URL as buffer
 *
 * SECURITY: Only downloads from trusted Instagram CDN domains to prevent SSRF attacks
 *
 * @param imageUrl - URL of image to download
 * @returns Image data as Buffer
 * @throws InstagramError if URL is from untrusted domain or download fails
 */
export async function downloadImageAsBuffer(imageUrl: string): Promise<Buffer> {
  // Validate the image URL is from a trusted Instagram CDN domain
  try {
    const parsedUrl = new URL(imageUrl);

    // Whitelist of trusted Instagram CDN domains
    const trustedDomains = [
      'cdninstagram.com',
      'instagram.com',
      'fbcdn.net', // Facebook/Instagram CDN
      'scontent.cdninstagram.com',
      'scontent-*.cdninstagram.com', // Wildcard for regional CDNs
    ];

    // Check if hostname matches any trusted domain
    const isTrusted = trustedDomains.some(domain => {
      if (domain.includes('*')) {
        // Handle wildcard patterns (e.g., scontent-*.cdninstagram.com)
        const pattern = domain.replace('*', '[a-z0-9-]+');
        const regex = new RegExp(`^${pattern}$`, 'i');
        return regex.test(parsedUrl.hostname);
      }
      // Exact match or subdomain match
      return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`);
    });

    if (!isTrusted) {
      throw new InstagramError(
        `Untrusted image URL domain: ${parsedUrl.hostname}`,
        'FETCH_FAILED'
      );
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InkdexBot/1.0)',
      },
      // 5 second timeout for image download
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL did not return an image');
    }

    // Check file size (max 10MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error('Image file too large (max 10MB)');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    // Re-throw InstagramError as-is
    if (error instanceof InstagramError) {
      throw error;
    }

    throw new InstagramError(
      `Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FETCH_FAILED'
    );
  }
}

/**
 * Validates if Instagram post is accessible
 *
 * Quick check without downloading full image
 *
 * @param postIdOrUrl - Instagram post ID or URL
 * @returns True if post is accessible
 */
export async function isPostAccessible(postIdOrUrl: string): Promise<boolean> {
  try {
    await fetchInstagramPostImage(postIdOrUrl);
    return true;
  } catch {
    return false;
  }
}
