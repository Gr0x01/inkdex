/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase Storage client types are dynamic */
/**
 * Supabase Storage Utilities
 * Handles image uploads, downloads, and management for portfolio images
 */

// Load environment variables for Node.js scripts (no-op in Next.js)
import * as dotenv from 'dotenv';
if (typeof window === 'undefined') {
  dotenv.config({ path: '.env.local' });
}

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
  );
}

const BUCKET_NAME = 'portfolio-images';

// Create Supabase client (server-side with service role)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Upload image buffer to Supabase Storage
 */
export async function uploadImage(
  path: string,
  buffer: Buffer,
  options?: {
    contentType?: string;
    upsert?: boolean;
  }
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: options?.contentType || 'image/jpeg',
        upsert: options?.upsert || false,
        cacheControl: '31536000', // 1 year cache
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const publicUrl = getPublicUrl(path);
    return { success: true, publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Upload image from file path
 */
export async function uploadImageFromFile(
  filePath: string,
  storagePath: string,
  options?: {
    contentType?: string;
    upsert?: boolean;
  }
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const buffer = readFileSync(filePath);
    return await uploadImage(storagePath, buffer, options);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get public URL for a storage path
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete image from storage
 */
export async function deleteImage(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete multiple images from storage
 */
export async function deleteImages(paths: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if bucket exists
 */
export async function checkBucketExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Failed to list buckets:', error.message);
      return false;
    }

    return data?.some(b => b.name === BUCKET_NAME) || false;
  } catch (error: any) {
    console.error('Error checking bucket:', error.message);
    return false;
  }
}

/**
 * List files in a folder
 */
export async function listFiles(
  folder: string
): Promise<{ success: boolean; files?: Array<{ name: string; id: string }>; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, files: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate UUID format for artist IDs
 */
function validateArtistId(artistId: string): boolean {
  // UUID format: lowercase hex + hyphens, 36 chars
  return /^[a-f0-9-]{36}$/.test(artistId);
}

/**
 * Validate post ID format for storage paths
 * Supports:
 * - Instagram shortcodes: alphanumeric + underscore/hyphen, 8-15 chars (e.g., "C1234567890")
 * - Manual imports: manual_{timestamp}_{index} format (e.g., "manual_1767900959187_0")
 */
function validatePostId(postId: string): boolean {
  // Manual import format: manual_<digits>_<digits>
  if (postId.startsWith('manual_')) {
    return /^manual_\d+_\d+$/.test(postId);
  }
  // Instagram shortcode: alphanumeric + underscore/hyphen, 8-15 chars
  return /^[A-Za-z0-9_-]{8,15}$/.test(postId);
}

/**
 * Generate storage paths for an image set (original + 3 thumbnails)
 */
export function generateImagePaths(artistId: string, postId: string) {
  // Validate inputs to prevent path traversal
  if (!validateArtistId(artistId)) {
    throw new Error(`Invalid artistId format: ${artistId}`);
  }
  if (!validatePostId(postId)) {
    throw new Error(`Invalid postId format: ${postId}`);
  }

  return {
    original: `original/${artistId}/${postId}.jpg`,
    thumb320: `thumbs/320/${artistId}/${postId}.webp`,
    thumb640: `thumbs/640/${artistId}/${postId}.webp`,
    thumb1280: `thumbs/1280/${artistId}/${postId}.webp`,
  };
}

/**
 * Generate storage paths for artist profile image (original + 2 thumbnails)
 * Profile images only need 320 and 640 since they're displayed small
 */
export function generateProfileImagePaths(artistId: string) {
  // Validate input to prevent path traversal
  if (!validateArtistId(artistId)) {
    throw new Error(`Invalid artistId format: ${artistId}`);
  }

  return {
    original: `profiles/original/${artistId}.jpg`,
    thumb320: `profiles/320/${artistId}.webp`,
    thumb640: `profiles/640/${artistId}.webp`,
  };
}

/**
 * Get storage stats (requires admin access)
 */
export async function getStorageStats(): Promise<{
  success: boolean;
  totalFiles?: number;
  error?: string;
}> {
  try {
    // List all top-level folders
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    if (error) {
      return { success: false, error: error.message };
    }

    // This is a simplified version - for actual stats, you'd need to recursively count files
    return { success: true, totalFiles: data?.length || 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
