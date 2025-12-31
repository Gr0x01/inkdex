/**
 * Instagram Post Image Fetcher
 *
 * Fetches image URLs from Instagram posts using the public oEmbed API
 */

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
    public code: 'PRIVATE_ACCOUNT' | 'POST_NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_URL' | 'FETCH_FAILED'
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
} as const;

/**
 * Fetches image data from an Instagram post using oEmbed API
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

  // Instagram oEmbed API endpoint
  const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}`;

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InkdexBot/1.0)',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });

    // Handle different HTTP status codes
    if (response.status === 404) {
      throw new InstagramError(ERROR_MESSAGES.POST_NOT_FOUND, 'POST_NOT_FOUND');
    }

    if (response.status === 429) {
      throw new InstagramError(ERROR_MESSAGES.RATE_LIMITED, 'RATE_LIMITED');
    }

    if (response.status === 403 || response.status === 401) {
      throw new InstagramError(ERROR_MESSAGES.PRIVATE_ACCOUNT, 'PRIVATE_ACCOUNT');
    }

    if (!response.ok) {
      throw new InstagramError(
        `Instagram API returned ${response.status}`,
        'FETCH_FAILED'
      );
    }

    const data = await response.json();

    // Extract image URL from oEmbed response
    // The oEmbed API returns thumbnail_url for images
    const imageUrl = data.thumbnail_url || data.url;
    const username = extractUsernameFromTitle(data.author_name || data.title || '');

    if (!imageUrl) {
      throw new InstagramError(
        'No image found in Instagram post',
        'FETCH_FAILED'
      );
    }

    return {
      imageUrl,
      username: username || 'unknown',
      caption: data.title || undefined,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (error) {
    // Re-throw InstagramError as-is
    if (error instanceof InstagramError) {
      throw error;
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new InstagramError(
        'Instagram is taking too long to respond. Try uploading an image directly.',
        'FETCH_FAILED'
      );
    }

    // Handle network errors
    if (error instanceof Error && error.name === 'TypeError') {
      throw new InstagramError(
        'Network error while fetching from Instagram. Please try again.',
        'FETCH_FAILED'
      );
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
 * Extracts username from Instagram oEmbed title
 *
 * oEmbed title format is typically: "Username on Instagram: caption..."
 *
 * @param title - oEmbed title or author_name
 * @returns Extracted username or empty string
 */
function extractUsernameFromTitle(title: string): string {
  if (!title) return '';

  // Try to extract from "Username on Instagram" format
  const match = title.match(/^(.+?)\s+on\s+Instagram/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Try to extract from "@username" format
  const atMatch = title.match(/@([a-zA-Z0-9._]+)/);
  if (atMatch && atMatch[1]) {
    return atMatch[1];
  }

  return title.trim();
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
