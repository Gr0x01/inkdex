/**
 * Tattoo Image Filter
 *
 * Uses GPT-5-mini to filter out non-tattoo images from scraped portfolios.
 * Cost: ~$0.001 per image (using detail: 'low')
 */

import OpenAI from 'openai';
import sharp from 'sharp';

const TATTOO_FILTER_PROMPT = `Is this an image showcasing tattoo work? Rate your confidence from 0 to 100.

100 (definitely tattoo):
- Shows a completed tattoo on someone's body as the main subject
- Shows a tattoo being worked on (in-progress shop photo)
- Close-up of tattoo artwork

0 (definitely NOT tattoo):
- Personal selfie/portrait where tattoos are just visible but not the focus
- Lifestyle photos (beach, family gatherings, parties) where person happens to have tattoos
- Promotional graphics (text announcements, flyers, event posters)
- Holiday/celebration posts without tattoo focus
- Photos where tattoos are purely incidental background elements

Reply with ONLY a number from 0-100.`;

// Legacy prompt for backwards compatibility
const TATTOO_FILTER_PROMPT_LEGACY = `Is this an image showcasing tattoo work? Answer 'yes' if the primary purpose is to display a tattoo (finished or in-progress).

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

Answer only 'yes' or 'no'.`;

export interface ImageToFilter {
  /** Unique identifier (e.g., shortcode) */
  id: string;
  /** Image buffer */
  buffer: Buffer;
}

export interface FilterResult {
  id: string;
  isTattoo: boolean;
  /** Confidence score from 0-1 (0.5 = 50% confidence it's a tattoo) */
  confidence: number;
}

export interface FilterSummary {
  total: number;
  kept: number;
  dropped: number;
  results: FilterResult[];
}

/** Retryable HTTP status codes */
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 3;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Classify a single image and return confidence score (with retry logic)
 * @returns confidence score 0-1 (0.5 = 50% confident it's a tattoo)
 */
async function classifySingleImage(
  imageBase64: string,
  index: number,
  total: number,
  retryCount = 0
): Promise<number> {
  const client = getOpenAIClient();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: TATTOO_FILTER_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_completion_tokens: 16,
    });

    const rawResult = response.choices[0]?.message?.content || '';
    const result = rawResult.trim();

    // Parse numeric confidence (0-100) and convert to 0-1
    // Handle responses like "85", "85%", "Yes, 85", etc.
    const numberMatch = result.match(/\d+/);
    const parsed = numberMatch ? parseInt(numberMatch[0], 10) : NaN;
    const confidence = !isNaN(parsed) ? Math.max(0, Math.min(100, parsed)) / 100 : 0.5;

    const status =
      confidence >= 0.5 ? '✓ TATTOO' : confidence >= 0.3 ? '? BORDERLINE' : '✗ DROP';
    console.log(
      `    [Filter] Image ${index + 1}/${total}: ${status} (${Math.round(confidence * 100)}%)`
    );

    return confidence;
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;

    // Retry on transient errors with exponential backoff
    if (status && RETRYABLE_STATUSES.includes(status) && retryCount < MAX_RETRIES) {
      const waitTime = Math.min(5000 * Math.pow(2, retryCount), 60000);
      console.log(`    [Filter] Rate limited on image ${index + 1}, retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return classifySingleImage(imageBase64, index, total, retryCount + 1);
    }

    console.error(`    [Filter] Error classifying image ${index + 1}:`, error);
    // Conservative: return high confidence on error (don't lose potential tattoos)
    return 0.75;
  }
}

/**
 * Classify a single image using legacy yes/no prompt (for backwards compatibility)
 */
async function classifySingleImageLegacy(
  imageBase64: string,
  index: number,
  total: number,
  retryCount = 0
): Promise<boolean> {
  const client = getOpenAIClient();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: TATTOO_FILTER_PROMPT_LEGACY },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_completion_tokens: 256,
    });

    const rawResult = response.choices[0]?.message?.content || '';
    const result = rawResult.trim().toLowerCase();
    // Handle variations like "yes", "yes!", "yes, this is a tattoo"
    const isTattoo = result === 'yes' || result.startsWith('yes');

    console.log(`    [Filter] Image ${index + 1}/${total}: ${isTattoo ? '✓ TATTOO' : '✗ DROP'}`);

    return isTattoo;
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;

    // Retry on transient errors with exponential backoff
    if (status && RETRYABLE_STATUSES.includes(status) && retryCount < MAX_RETRIES) {
      const waitTime = Math.min(5000 * Math.pow(2, retryCount), 60000);
      console.log(`    [Filter] Rate limited on image ${index + 1}, retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return classifySingleImageLegacy(imageBase64, index, total, retryCount + 1);
    }

    console.error(`    [Filter] Error classifying image ${index + 1}:`, error);
    // Conservative: keep image on error (don't lose potential tattoos)
    return true;
  }
}

/**
 * Convert file buffer to base64 data URL (converts WebP to JPEG for GPT compatibility)
 */
export async function bufferToBase64(buffer: Buffer): Promise<string> {
  // Check if WebP (GPT-5-mini doesn't handle WebP well)
  const isWebp = buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';

  if (isWebp) {
    // Convert to JPEG
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  }

  // Detect content type from magic bytes
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const contentType = isJpeg ? 'image/jpeg' : 'image/png';

  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/** Confidence threshold for keeping images (50% = tattoo) */
export const TATTOO_CONFIDENCE_THRESHOLD = 0.5;
/** Confidence threshold for auto-delete (below this = obvious garbage) */
export const AUTO_DELETE_THRESHOLD = 0.3;

/**
 * Filter an array of images, classifying each with confidence scores
 *
 * @param images - Array of image buffers with their IDs
 * @param concurrency - Max parallel classifications (default 6)
 * @returns Filter summary with confidence scores for each image
 */
export async function filterTattooImages(
  images: Array<{ id: string; buffer: Buffer }>,
  concurrency = 6
): Promise<FilterSummary> {
  if (images.length === 0) {
    return { total: 0, kept: 0, dropped: 0, results: [] };
  }

  console.log(`    [Filter] Classifying ${images.length} images...`);

  const results: FilterResult[] = [];

  // Process in batches to respect concurrency
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (image, batchIndex) => {
        const globalIndex = i + batchIndex;
        const base64 = await bufferToBase64(image.buffer);
        const confidence = await classifySingleImage(base64, globalIndex, images.length);
        return {
          id: image.id,
          isTattoo: confidence >= TATTOO_CONFIDENCE_THRESHOLD,
          confidence,
        };
      })
    );

    results.push(...batchResults);
  }

  const kept = results.filter((r) => r.isTattoo).length;
  const dropped = results.filter((r) => !r.isTattoo).length;

  console.log(`    [Filter] Result: ${kept} tattoos, ${dropped} dropped`);

  return {
    total: images.length,
    kept,
    dropped,
    results,
  };
}

/**
 * Filter images using legacy yes/no classification (for backwards compatibility)
 * Used by scraping pipeline when confidence scores not needed
 */
/**
 * Classify a single image buffer and return tattoo status + confidence
 * Used by image processing pipeline to tag incoming images
 */
export async function classifyImage(buffer: Buffer): Promise<{ isTattoo: boolean; confidence: number }> {
  const base64 = await bufferToBase64(buffer);
  const confidence = await classifySingleImage(base64, 0, 1);
  return {
    isTattoo: confidence >= TATTOO_CONFIDENCE_THRESHOLD,
    confidence,
  };
}

export async function filterTattooImagesLegacy(
  images: Array<{ id: string; buffer: Buffer }>,
  concurrency = 6
): Promise<FilterSummary> {
  if (images.length === 0) {
    return { total: 0, kept: 0, dropped: 0, results: [] };
  }

  console.log(`    [Filter] Classifying ${images.length} images (legacy mode)...`);

  const results: FilterResult[] = [];

  // Process in batches to respect concurrency
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (image, batchIndex) => {
        const globalIndex = i + batchIndex;
        const base64 = await bufferToBase64(image.buffer);
        const isTattoo = await classifySingleImageLegacy(base64, globalIndex, images.length);
        return {
          id: image.id,
          isTattoo,
          confidence: isTattoo ? 1.0 : 0.0,
        };
      })
    );

    results.push(...batchResults);
  }

  const kept = results.filter((r) => r.isTattoo).length;
  const dropped = results.filter((r) => !r.isTattoo).length;

  console.log(`    [Filter] Result: ${kept} tattoos, ${dropped} dropped`);

  return {
    total: images.length,
    kept,
    dropped,
    results,
  };
}
