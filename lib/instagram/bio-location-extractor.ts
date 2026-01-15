/**
 * Bio Location Extractor
 *
 * Extracts location information from Instagram bios using GPT-4.1-nano.
 * Also provides fast regex-based GDPR detection for filtering.
 */

import OpenAI from 'openai';
import { isGDPRCountry } from '@/lib/constants/countries';

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for bio location extraction');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ExtractedLocation {
  city: string | null;
  state: string | null;
  citySlug: string | null;
  stateCode: string | null;
  countryCode: string | null;  // ISO 3166-1 alpha-2 (e.g., 'US', 'GB', 'DE')
  isGDPR: boolean;
  confidence: 'high' | 'medium' | 'low';
  rawMatch: string;
}

interface GPTLocationResponse {
  city: string | null;
  region: string | null;
  country_code: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
}

const SYSTEM_PROMPT = `Extract location from tattoo artist Instagram bio. Return JSON only.

Rules:
1. US locations: city + 2-letter state code (e.g., "Austin, TX" -> city: "Austin", region: "TX", country_code: "US")
2. International: city + region/province + ISO 3166-1 alpha-2 country code
3. Recognize patterns: "📍Austin", "Based in NYC", "ATX tattoos", "Brooklyn NY", "LA based", "Seattle WA"
4. Common US abbreviations: NYC=New York, LA=Los Angeles, ATX=Austin, PHX=Phoenix, PDX=Portland, SEA=Seattle, CHI=Chicago, SF=San Francisco, NOLA=New Orleans, BK/BKN=Brooklyn
5. If only state/country mentioned, set city: null
6. If location unclear or not mentioned, return all null fields
7. Confidence: high (explicit "📍" or "based in"), medium (city/state detected), low (uncertain)

JSON format: {"city":"Austin","region":"TX","country_code":"US","confidence":"high"}`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Extract location from bio using GPT-4.1-nano
 */
async function extractWithGPT(bio: string, retryCount = 0): Promise<GPTLocationResponse | null> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: bio.substring(0, 500) },
      ],
      max_tokens: 100,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      city: parsed.city || null,
      region: parsed.region || null,
      country_code: parsed.country_code || null,
      confidence: parsed.confidence || null,
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };

    // Retry on rate limit
    if (err?.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return extractWithGPT(bio, retryCount + 1);
    }

    // Log error but don't throw - return null to indicate no extraction
    console.error(`[BioExtractor] GPT extraction failed: ${err?.message || 'Unknown error'}`);
    return null;
  }
}

/**
 * Extract location information from an Instagram bio using GPT-4.1-nano
 *
 * @param bio - Instagram bio text
 * @returns Extracted location or null if no location found
 */
export async function extractLocationFromBio(bio: string | undefined): Promise<ExtractedLocation | null> {
  if (!bio || bio.trim().length === 0) {
    return null;
  }

  const gptResult = await extractWithGPT(bio);

  // If GPT failed or returned no location data, return null
  if (!gptResult || (!gptResult.city && !gptResult.region && !gptResult.country_code)) {
    return null;
  }

  const countryCode = gptResult.country_code?.toUpperCase() || null;
  const isGDPR = countryCode ? isGDPRCountry(countryCode) : false;

  return {
    city: gptResult.city,
    state: gptResult.region,  // Map 'region' to 'state' for backward compatibility
    citySlug: gptResult.city ? gptResult.city.toLowerCase().replace(/\s+/g, '-') : null,
    stateCode: gptResult.region?.toUpperCase() || null,
    countryCode,
    isGDPR,
    confidence: gptResult.confidence || 'medium',
    rawMatch: bio.substring(0, 100),
  };
}

/**
 * Synchronous version for backward compatibility - uses regex only
 * @deprecated Use extractLocationFromBio (async) instead
 */
export function extractLocationFromBioSync(_bio: string | undefined): ExtractedLocation | null {
  console.warn('[BioExtractor] extractLocationFromBioSync is deprecated. Use async extractLocationFromBio instead.');
  // Return null - sync extraction no longer supported
  return null;
}

// ============================================================================
// GDPR Detection (Fast regex-based check for filtering)
// ============================================================================

/**
 * Major cities in GDPR countries for fast regex-based detection
 */
const GDPR_CITIES = new Set([
  // UK
  'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'liverpool', 'bristol', 'edinburgh',
  // Germany
  'berlin', 'munich', 'münchen', 'hamburg', 'frankfurt', 'cologne', 'köln', 'düsseldorf', 'stuttgart',
  // France
  'paris', 'marseille', 'lyon', 'toulouse', 'bordeaux', 'lille',
  // Netherlands
  'amsterdam', 'rotterdam', 'utrecht',
  // Spain
  'madrid', 'barcelona', 'valencia', 'seville',
  // Italy
  'rome', 'roma', 'milan', 'milano', 'naples', 'florence', 'venice',
  // Others
  'brussels', 'vienna', 'wien', 'zurich', 'zürich', 'geneva', 'warsaw', 'krakow', 'dublin',
  'prague', 'praha', 'budapest', 'athens', 'stockholm', 'copenhagen', 'oslo', 'helsinki',
  'lisbon', 'lisboa', 'porto',
]);

const GDPR_COUNTRY_NAMES = new Set([
  'uk', 'u.k.', 'united kingdom', 'england', 'scotland', 'wales', 'britain',
  'germany', 'deutschland', 'france', 'netherlands', 'holland', 'spain', 'españa',
  'italy', 'italia', 'portugal', 'belgium', 'austria', 'österreich',
  'switzerland', 'suisse', 'schweiz', 'poland', 'polska', 'ireland',
  'czech republic', 'czechia', 'hungary', 'greece', 'sweden', 'sverige',
  'denmark', 'danmark', 'norway', 'norge', 'finland', 'suomi',
]);

/**
 * Fast regex-based check for GDPR location indicators.
 * Use this for quick filtering before full GPT extraction.
 *
 * @param bio - Instagram bio text
 * @returns Object with isGDPR flag
 */
export function checkBioForGDPR(bio: string | undefined): { isGDPR: boolean; countryCode: string | null } {
  if (!bio) {
    return { isGDPR: false, countryCode: null };
  }

  const normalized = bio.toLowerCase();

  // Check for GDPR city names
  for (const city of GDPR_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(normalized)) {
      return { isGDPR: true, countryCode: null }; // Don't bother mapping city->country for quick check
    }
  }

  // Check for GDPR country names
  for (const country of GDPR_COUNTRY_NAMES) {
    const regex = new RegExp(`\\b${country.replace(/\./g, '\\.')}\\b`, 'i');
    if (regex.test(normalized)) {
      return { isGDPR: true, countryCode: null };
    }
  }

  // Check for EU flag emojis
  const euFlags = ['🇬🇧', '🇩🇪', '🇫🇷', '🇳🇱', '🇪🇸', '🇮🇹', '🇵🇹', '🇧🇪', '🇦🇹', '🇨🇭', '🇵🇱', '🇮🇪', '🇸🇪', '🇩🇰', '🇳🇴', '🇫🇮'];
  for (const flag of euFlags) {
    if (bio.includes(flag)) {
      return { isGDPR: true, countryCode: null };
    }
  }

  return { isGDPR: false, countryCode: null };
}

/**
 * Batch extract locations from multiple bios
 *
 * @param bios - Array of Instagram bios
 * @param concurrency - Number of concurrent extractions (default: 10)
 * @returns Map of bio index to extracted location
 */
export async function extractLocationsFromBios(
  bios: (string | undefined)[],
  concurrency = 10
): Promise<Map<number, ExtractedLocation>> {
  const results = new Map<number, ExtractedLocation>();

  // Process in batches for concurrency control
  for (let i = 0; i < bios.length; i += concurrency) {
    const batch = bios.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (bio, batchIndex) => {
        const index = i + batchIndex;
        const location = await extractLocationFromBio(bio);
        return { index, location };
      })
    );

    for (const { index, location } of batchResults) {
      if (location) {
        results.set(index, location);
      }
    }
  }

  return results;
}
