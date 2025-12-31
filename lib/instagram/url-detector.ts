/**
 * Instagram URL Detection Utility
 *
 * Detects and parses Instagram post URLs and profile URLs
 */

export type InstagramUrlType = 'post' | 'profile' | null;

export interface InstagramUrl {
  type: InstagramUrlType;
  id: string; // post_id or username
  originalUrl: string;
}

/**
 * Detects if input is an Instagram URL and extracts relevant information
 *
 * Supported formats:
 * - Posts: instagram.com/p/{post_id}, instagram.com/reel/{reel_id}
 * - Profiles: instagram.com/{username}, @{username}
 *
 * @param input - User input string
 * @returns Parsed Instagram URL or null if not an Instagram URL
 */
export function detectInstagramUrl(input: string): InstagramUrl | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = input.trim();

  // Handle @username format (convert to profile URL)
  if (trimmed.startsWith('@')) {
    const username = trimmed.slice(1);
    if (isValidUsername(username)) {
      return {
        type: 'profile',
        id: username,
        originalUrl: `https://instagram.com/${username}`,
      };
    }
    return null;
  }

  // Instagram post URL patterns (post and reel)
  const postPatterns = [
    // Standard post: instagram.com/p/{post_id}
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/i,
    // Reel: instagram.com/reel/{reel_id}
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i,
  ];

  // Check for post/reel URLs
  for (const pattern of postPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return {
        type: 'post',
        id: match[1],
        originalUrl: normalizeInstagramUrl(trimmed),
      };
    }
  }

  // Instagram profile URL pattern: instagram.com/{username}
  // Must NOT match /p/, /reel/, /tv/, or other Instagram paths
  const profilePattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/i;
  const profileMatch = trimmed.match(profilePattern);

  if (profileMatch && profileMatch[1]) {
    const username = profileMatch[1];

    // Exclude Instagram reserved paths
    const reservedPaths = ['p', 'reel', 'tv', 'stories', 'explore', 'accounts', 'direct', 'reels', 'tagged'];
    if (reservedPaths.includes(username.toLowerCase())) {
      return null;
    }

    if (isValidUsername(username)) {
      return {
        type: 'profile',
        id: username,
        originalUrl: normalizeInstagramUrl(trimmed),
      };
    }
  }

  return null;
}

/**
 * Validates Instagram username format
 *
 * Rules:
 * - Only alphanumeric, dots, and underscores
 * - 1-30 characters
 * - Cannot end with a dot
 *
 * @param username - Username to validate
 * @returns True if valid username format
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 1 || username.length > 30) {
    return false;
  }

  // Username can only contain alphanumeric characters, dots, and underscores
  const usernamePattern = /^[a-zA-Z0-9._]+$/;
  if (!usernamePattern.test(username)) {
    return false;
  }

  // Username cannot end with a dot
  if (username.endsWith('.')) {
    return false;
  }

  return true;
}

/**
 * Validates Instagram post ID format
 *
 * Post IDs are typically 11 characters of base64-like encoding
 *
 * @param postId - Post ID to validate
 * @returns True if valid post ID format
 */
export function isValidPostId(postId: string): boolean {
  if (!postId || postId.length < 8 || postId.length > 15) {
    return false;
  }

  // Post IDs contain alphanumeric characters, underscores, and hyphens
  const postIdPattern = /^[a-zA-Z0-9_-]+$/;
  return postIdPattern.test(postId);
}

/**
 * Normalizes Instagram URL to standard format
 *
 * @param url - Instagram URL to normalize
 * @returns Normalized URL with https:// prefix
 */
function normalizeInstagramUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }

  // Replace http:// with https://
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Remove query parameters for normalization (keep them in original)
  // Actually, let's keep them as they might be needed
  return normalized;
}

/**
 * Validates if a URL is from Instagram domain
 *
 * Security check to prevent SSRF attacks
 *
 * @param url - URL to validate
 * @returns True if URL is from instagram.com
 */
export function isInstagramDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return hostname === 'instagram.com' ||
           hostname === 'www.instagram.com' ||
           hostname.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

/**
 * Safely extracts post ID from Instagram URL
 *
 * SECURITY: Uses validation to prevent SQL injection via pathname parsing
 *
 * @param instagramUrl - Full Instagram post URL
 * @returns Post ID if valid, null if invalid or not found
 */
export function extractPostId(instagramUrl: string): string | null {
  try {
    const parsed = new URL(instagramUrl);

    // Validate domain first
    if (!isInstagramDomain(instagramUrl)) {
      return null;
    }

    // Extract post ID from pathname
    // Format: /p/{post_id}/ or /reel/{reel_id}/
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (pathParts.length >= 2 && (pathParts[0] === 'p' || pathParts[0] === 'reel')) {
      const postId = pathParts[1];

      // Validate post ID format before returning
      if (isValidPostId(postId)) {
        return postId;
      }
    }

    return null;
  } catch {
    return null;
  }
}
