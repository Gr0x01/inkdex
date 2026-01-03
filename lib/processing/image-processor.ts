/* eslint-disable @typescript-eslint/no-explicit-any -- Sharp library types require flexible handling */
/**
 * Image Processing Utilities
 * Handles image resizing, format conversion, and thumbnail generation using Sharp
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';

/**
 * Thumbnail sizes configuration
 */
export const THUMBNAIL_SIZES = {
  small: 320,
  medium: 640,
  large: 1280,
} as const;

/**
 * WebP quality (85% is good balance of size vs quality)
 */
const WEBP_QUALITY = 85;

/**
 * Maximum original image size (for memory safety)
 */
const MAX_ORIGINAL_SIZE = 2048;

/**
 * Process a local image file and generate all thumbnails
 * Returns buffers for original (optimized) + 3 WebP thumbnails
 */
export async function processLocalImage(
  filePath: string
): Promise<{
  success: boolean;
  buffers?: {
    original: Buffer;
    thumb320: Buffer;
    thumb640: Buffer;
    thumb1280: Buffer;
  };
  error?: string;
}> {
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    // Read file
    const inputBuffer = readFileSync(filePath);

    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, error: 'Invalid image: missing dimensions' };
    }

    // Process original (resize if too large, optimize)
    const originalBuffer = await sharp(inputBuffer)
      .resize(MAX_ORIGINAL_SIZE, MAX_ORIGINAL_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    // Generate thumbnails in parallel
    const [thumb320, thumb640, thumb1280] = await Promise.all([
      generateThumbnail(inputBuffer, THUMBNAIL_SIZES.small),
      generateThumbnail(inputBuffer, THUMBNAIL_SIZES.medium),
      generateThumbnail(inputBuffer, THUMBNAIL_SIZES.large),
    ]);

    return {
      success: true,
      buffers: {
        original: originalBuffer,
        thumb320,
        thumb640,
        thumb1280,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate a single WebP thumbnail at specified width
 */
async function generateThumbnail(buffer: Buffer, width: number): Promise<Buffer> {
  return await sharp(buffer)
    .resize(width, null, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/**
 * Convert image buffer to WebP format
 */
export async function convertToWebP(
  buffer: Buffer,
  quality?: number
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  try {
    const webpBuffer = await sharp(buffer)
      .webp({ quality: quality || WEBP_QUALITY })
      .toBuffer();

    return { success: true, buffer: webpBuffer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  filePath: string
): Promise<{ success: boolean; width?: number; height?: number; error?: string }> {
  try {
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, error: 'Invalid image: missing dimensions' };
    }

    return {
      success: true,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Optimize JPEG without resizing
 */
export async function optimizeJPEG(
  inputPath: string
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  try {
    const buffer = await sharp(inputPath)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return { success: true, buffer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Batch process multiple images
 */
export async function processImageBatch(
  filePaths: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{
  success: boolean;
  results?: Array<{
    filePath: string;
    success: boolean;
    buffers?: {
      original: Buffer;
      thumb320: Buffer;
      thumb640: Buffer;
      thumb1280: Buffer;
    };
    error?: string;
  }>;
  error?: string;
}> {
  try {
    const results = [];

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const result = await processLocalImage(filePath);

      results.push({
        filePath,
        ...result,
      });

      if (onProgress) {
        onProgress(i + 1, filePaths.length);
      }
    }

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Calculate storage size for image buffers
 */
export function calculateStorageSize(buffers: {
  original: Buffer;
  thumb320: Buffer;
  thumb640: Buffer;
  thumb1280: Buffer;
}): {
  original: number;
  thumb320: number;
  thumb640: number;
  thumb1280: number;
  total: number;
  totalMB: string;
} {
  const sizes = {
    original: buffers.original.length,
    thumb320: buffers.thumb320.length,
    thumb640: buffers.thumb640.length,
    thumb1280: buffers.thumb1280.length,
    total: 0,
    totalMB: '0',
  };

  sizes.total =
    sizes.original + sizes.thumb320 + sizes.thumb640 + sizes.thumb1280;
  sizes.totalMB = (sizes.total / 1024 / 1024).toFixed(2);

  return sizes;
}
