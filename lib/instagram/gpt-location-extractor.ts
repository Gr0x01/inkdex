/**
 * GPT-Based Bio Location Extractor
 *
 * Uses GPT-4.1-mini to extract location from Instagram bios.
 * Much more accurate than regex - handles abbreviations, emojis,
 * international locations, and varied formatting.
 *
 * Cost: ~$0.000042 per extraction (~$8.40 for 200k artists)
 */

import OpenAI from 'openai';
import { isGDPRCountry } from '@/lib/constants/countries';

export interface GPTExtractedLocation {
  city: string | null;
  stateCode: string | null; // region/state/province code
  countryCode: string | null; // ISO 3166-1 alpha-2
  isGDPR: boolean;
  confidence: 'high' | 'medium' | 'low';
}

interface GPTResponse {
  city: string | null;
  region: string | null;
  country_code: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const SYSTEM_PROMPT = `Extract location from tattoo artist Instagram bio. Return JSON only.

Rules:
1. US locations: city + 2-letter state code (e.g., "Austin, TX" -> city: "Austin", region: "TX", country_code: "US")
2. International: city + region/province + ISO 3166-1 alpha-2 country code (e.g., "Toronto" -> city: "Toronto", region: "ON", country_code: "CA")
3. Recognize patterns: "📍Austin", "Based in NYC", "ATX tattoos", "Brooklyn NY", "Torrance, Ca", "Seattle WA"
4. Common US abbreviations: NYC=New York, LA=Los Angeles, ATX=Austin, PHX=Phoenix, PDX=Portland, SEA=Seattle, CHI=Chicago
5. If only state mentioned (e.g., "Texas artist"), set city: null, region: "TX", country_code: "US"
6. If location unclear or not mentioned, return all null fields
7. Confidence: high (explicit "📍" or "based in"), medium (city/state detected), low (uncertain)

JSON format only:
{"city":"Austin","region":"TX","country_code":"US","confidence":"high"}`;

const MAX_RETRIES = 5;

function isValidGPTResponse(obj: unknown): obj is GPTResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const loc = obj as Record<string, unknown>;
  const validConfidence = ['high', 'medium', 'low', null, undefined];
  return (
    (loc.city === null || loc.city === undefined || typeof loc.city === 'string') &&
    (loc.region === null || loc.region === undefined || typeof loc.region === 'string') &&
    (loc.country_code === null || loc.country_code === undefined || typeof loc.country_code === 'string') &&
    validConfidence.includes(loc.confidence as string | null | undefined)
  );
}

/**
 * Extract location from a single bio using GPT-4.1-mini.
 * Non-blocking, suitable for async integration into pipelines.
 *
 * @param bio - Instagram bio text
 * @param openaiClient - Optional OpenAI client (creates one if not provided)
 * @returns Extracted location or null if extraction fails
 */
export async function extractLocationWithGPT(
  bio: string | null | undefined,
  openaiClient?: OpenAI
): Promise<GPTExtractedLocation | null> {
  if (!bio || bio.trim() === '') {
    return null;
  }

  // Validate API key if creating a new client
  if (!openaiClient && !process.env.OPENAI_API_KEY) {
    console.error('[GPTLocationExtractor] OPENAI_API_KEY is not configured');
    return null;
  }

  const client = openaiClient || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result = await callGPTWithRetry(client, bio, 0);
  if (!result) return null;

  // Transform to our interface
  return {
    city: result.city || null,
    stateCode: result.region || null,
    countryCode: result.country_code || null,
    isGDPR: result.country_code ? isGDPRCountry(result.country_code) : false,
    confidence: result.confidence || 'low',
  };
}

const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

async function callGPTWithRetry(
  client: OpenAI,
  bio: string,
  retryCount: number
): Promise<GPTResponse | null> {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: bio.substring(0, 500) }, // Truncate long bios
      ],
      max_tokens: 50,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[GPTLocationExtractor] Invalid JSON response:', content.substring(0, 100));
      return null;
    }

    if (!isValidGPTResponse(parsed)) {
      console.error('[GPTLocationExtractor] Invalid response structure');
      return null;
    }

    return parsed;
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (status && RETRYABLE_STATUSES.includes(status) && retryCount < MAX_RETRIES) {
      // Transient error - exponential backoff
      const waitTime = Math.min(5000 * Math.pow(2, retryCount), 60000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return callGPTWithRetry(client, bio, retryCount + 1);
    }

    console.error(`[GPTLocationExtractor] Error: ${message}`);
    return null;
  }
}

