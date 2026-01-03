/**
 * Bio Location Extractor
 *
 * Parses Instagram bios to extract city and state information
 * for tattoo artist discovery. Uses known cities from the platform
 * and common bio patterns.
 */

import { CITIES, STATES } from '@/lib/constants/cities';

// Enable debug logging via environment variable
const DEBUG = process.env.DEBUG_LOCATION_EXTRACTOR === 'true';

function debugLog(message: string, data?: unknown): void {
  if (DEBUG) {
    console.log(`[LocationExtractor] ${message}`, data !== undefined ? data : '');
  }
}

export interface ExtractedLocation {
  city: string | null;
  state: string | null;
  citySlug: string | null;
  stateCode: string | null;
  confidence: 'high' | 'medium' | 'low';
  rawMatch: string;
}

// Common location patterns in Instagram bios
const LOCATION_PATTERNS = [
  // "📍 Austin" or "📍Austin, TX"
  /📍\s*([A-Za-z\s]+)(?:,?\s*([A-Z]{2}))?/i,
  // "Based in Austin" or "Based in Austin, TX"
  /based\s+in\s+([A-Za-z\s]+)(?:,?\s*([A-Z]{2}))?/i,
  // "Austin-based" or "NYC-based"
  /([A-Za-z\s]+)-based/i,
  // "Austin, TX" or "Los Angeles, CA"
  /([A-Za-z\s]+),\s*([A-Z]{2})\b/,
  // "@ Austin" (sometimes used for location)
  /@\s+([A-Za-z\s]+)(?:,?\s*([A-Z]{2}))?/i,
  // "Located in Austin"
  /located\s+in\s+([A-Za-z\s]+)(?:,?\s*([A-Z]{2}))?/i,
  // "Austin tattoo artist" or "NYC tattooer"
  /([A-Za-z\s]+)\s+(?:tattoo\s*(?:artist|er)?|tattooist|ink)/i,
];

// City name variations and aliases
const CITY_ALIASES: Record<string, string> = {
  'nyc': 'new-york',
  'new york city': 'new-york',
  'ny': 'new-york',
  'la': 'los-angeles',
  'los angeles': 'los-angeles',
  'atl': 'atlanta',
  'chi': 'chicago',
  'pdx': 'portland',
  'sea': 'seattle',
  'mia': 'miami',
  'sf': 'san-francisco', // Future city
  'san fran': 'san-francisco',
};

// State name to code mapping
const STATE_NAME_TO_CODE: Record<string, string> = {};
STATES.forEach(state => {
  STATE_NAME_TO_CODE[state.name.toLowerCase()] = state.code;
});

// Build city lookup from CITIES constant
const CITY_LOOKUP: Map<string, typeof CITIES[number]> = new Map();
CITIES.forEach(city => {
  // Add by slug
  CITY_LOOKUP.set(city.slug, city);
  // Add by name (lowercase)
  CITY_LOOKUP.set(city.name.toLowerCase(), city);
});

// Add aliases
Object.entries(CITY_ALIASES).forEach(([alias, slug]) => {
  const city = CITY_LOOKUP.get(slug);
  if (city) {
    CITY_LOOKUP.set(alias, city);
  }
});

/**
 * Normalize a city name for matching
 */
function normalizeCityName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Try to match a city name against known cities
 */
function matchCity(cityName: string): typeof CITIES[number] | null {
  const normalized = normalizeCityName(cityName);

  // Direct match
  if (CITY_LOOKUP.has(normalized)) {
    return CITY_LOOKUP.get(normalized) || null;
  }

  // Try removing common suffixes
  const withoutSuffix = normalized
    .replace(/\s*(city|metro|area|downtown)$/i, '')
    .trim();

  if (CITY_LOOKUP.has(withoutSuffix)) {
    return CITY_LOOKUP.get(withoutSuffix) || null;
  }

  return null;
}

/**
 * Validate state code against known states
 */
function validateStateCode(code: string | undefined): string | null {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  const state = STATES.find(s => s.code === upperCode);
  return state ? state.code : null;
}

/**
 * Extract location information from an Instagram bio
 *
 * @param bio - Instagram bio text
 * @returns Extracted location or null if no location found
 */
export function extractLocationFromBio(bio: string | undefined): ExtractedLocation | null {
  if (!bio) {
    debugLog('Empty bio provided');
    return null;
  }

  debugLog('Processing bio:', bio.substring(0, 100));

  // Try each pattern
  for (const pattern of LOCATION_PATTERNS) {
    const match = bio.match(pattern);
    if (match) {
      const potentialCity = match[1]?.trim();
      const potentialState = match[2]?.trim();

      debugLog(`Pattern matched: "${match[0]}" -> city="${potentialCity}", state="${potentialState}"`);

      if (!potentialCity) continue;

      const city = matchCity(potentialCity);

      if (city) {
        // Validate state if provided
        const validatedState = validateStateCode(potentialState);
        const stateMatches = !potentialState || validatedState === city.state;

        debugLog(`City matched: ${city.name}, ${city.state} (confidence: ${stateMatches ? 'high' : 'medium'})`);

        return {
          city: city.name,
          state: city.state,
          citySlug: city.slug,
          stateCode: city.state,
          confidence: stateMatches ? 'high' : 'medium',
          rawMatch: match[0],
        };
      }

      debugLog(`City not in database: "${potentialCity}"`);

      // City not in our database, but we found a pattern
      // Store with state only if we can validate it
      if (potentialState) {
        const validatedState = validateStateCode(potentialState);
        if (validatedState) {
          debugLog(`Unknown city but valid state: ${validatedState}`);
          return {
            city: null, // City not in our supported list
            state: null,
            citySlug: null,
            stateCode: validatedState,
            confidence: 'low',
            rawMatch: match[0],
          };
        }
      }
    }
  }

  // Try direct city name search in bio (less reliable)
  const bioLower = bio.toLowerCase();
  for (const city of CITIES) {
    if (bioLower.includes(city.name.toLowerCase())) {
      return {
        city: city.name,
        state: city.state,
        citySlug: city.slug,
        stateCode: city.state,
        confidence: 'low', // Lower confidence for substring match
        rawMatch: city.name,
      };
    }
  }

  // Check for city aliases in bio
  for (const [alias, slug] of Object.entries(CITY_ALIASES)) {
    if (bioLower.includes(alias)) {
      const city = CITY_LOOKUP.get(slug);
      if (city) {
        return {
          city: city.name,
          state: city.state,
          citySlug: city.slug,
          stateCode: city.state,
          confidence: 'low',
          rawMatch: alias,
        };
      }
    }
  }

  debugLog('No location pattern matched');
  return null;
}

/**
 * Batch extract locations from multiple bios
 *
 * @param bios - Array of Instagram bios
 * @returns Map of bio index to extracted location
 */
export function extractLocationsFromBios(
  bios: (string | undefined)[]
): Map<number, ExtractedLocation> {
  const results = new Map<number, ExtractedLocation>();

  bios.forEach((bio, index) => {
    const location = extractLocationFromBio(bio);
    if (location) {
      results.set(index, location);
    }
  });

  return results;
}

/**
 * Get extraction statistics for a batch of bios
 */
export function getLocationExtractionStats(
  bios: (string | undefined)[]
): {
  total: number;
  extracted: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  extractionRate: number;
} {
  const locations = extractLocationsFromBios(bios);
  const total = bios.filter(Boolean).length;

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  locations.forEach(loc => {
    if (loc.confidence === 'high') highConfidence++;
    else if (loc.confidence === 'medium') mediumConfidence++;
    else lowConfidence++;
  });

  return {
    total,
    extracted: locations.size,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    extractionRate: total > 0 ? locations.size / total : 0,
  };
}
