/**
 * Bio Location Extractor
 *
 * Parses Instagram bios to extract city and state information
 * for tattoo artist discovery. Uses known cities from the platform
 * and common bio patterns.
 *
 * Also detects EU/GDPR countries to enable filtering of artists
 * from regions with strict data protection laws.
 */

import { CITIES, STATES } from '@/lib/constants/cities';
import { isGDPRCountry, getCountryCode as _getCountryCode } from '@/lib/constants/countries';

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
  countryCode: string | null;  // ISO 3166-1 alpha-2 (e.g., 'US', 'GB', 'DE')
  isGDPR: boolean;             // true if country falls under GDPR/UK GDPR/Swiss DPA
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

// City name variations and aliases (US)
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

// ============================================================================
// GDPR/EU Location Detection
// ============================================================================

/**
 * Major cities in GDPR countries, mapped to their country code.
 * Used to detect EU artists even when only a city is mentioned.
 */
const GDPR_CITY_TO_COUNTRY: Record<string, string> = {
  // United Kingdom
  'london': 'GB',
  'manchester': 'GB',
  'birmingham': 'GB',
  'leeds': 'GB',
  'glasgow': 'GB',
  'liverpool': 'GB',
  'bristol': 'GB',
  'edinburgh': 'GB',
  'brighton': 'GB',
  'nottingham': 'GB',
  'sheffield': 'GB',
  'newcastle': 'GB',
  'cardiff': 'GB',
  'belfast': 'GB',
  // Germany
  'berlin': 'DE',
  'munich': 'DE',
  'münchen': 'DE',
  'hamburg': 'DE',
  'frankfurt': 'DE',
  'cologne': 'DE',
  'köln': 'DE',
  'düsseldorf': 'DE',
  'dusseldorf': 'DE',
  'stuttgart': 'DE',
  'leipzig': 'DE',
  'dortmund': 'DE',
  'essen': 'DE',
  'bremen': 'DE',
  'dresden': 'DE',
  'hanover': 'DE',
  'hannover': 'DE',
  'nuremberg': 'DE',
  'nürnberg': 'DE',
  // France
  'paris': 'FR',
  'marseille': 'FR',
  'lyon': 'FR',
  'toulouse': 'FR',
  'nice': 'FR',
  'nantes': 'FR',
  'strasbourg': 'FR',
  'montpellier': 'FR',
  'bordeaux': 'FR',
  'lille': 'FR',
  'rennes': 'FR',
  // Netherlands
  'amsterdam': 'NL',
  'rotterdam': 'NL',
  'the hague': 'NL',
  'den haag': 'NL',
  'utrecht': 'NL',
  'eindhoven': 'NL',
  // Spain
  'madrid': 'ES',
  'barcelona': 'ES',
  'valencia': 'ES',
  'seville': 'ES',
  'sevilla': 'ES',
  'bilbao': 'ES',
  'malaga': 'ES',
  'málaga': 'ES',
  // Italy
  'rome': 'IT',
  'roma': 'IT',
  'milan': 'IT',
  'milano': 'IT',
  'naples': 'IT',
  'napoli': 'IT',
  'turin': 'IT',
  'torino': 'IT',
  'florence': 'IT',
  'firenze': 'IT',
  'bologna': 'IT',
  'venice': 'IT',
  'venezia': 'IT',
  // Portugal
  'lisbon': 'PT',
  'lisboa': 'PT',
  'porto': 'PT',
  // Belgium
  'brussels': 'BE',
  'bruxelles': 'BE',
  'antwerp': 'BE',
  'antwerpen': 'BE',
  'ghent': 'BE',
  'gent': 'BE',
  // Austria
  'vienna': 'AT',
  'wien': 'AT',
  'salzburg': 'AT',
  'graz': 'AT',
  // Switzerland
  'zurich': 'CH',
  'zürich': 'CH',
  'geneva': 'CH',
  'genève': 'CH',
  'basel': 'CH',
  'bern': 'CH',
  // Poland
  'warsaw': 'PL',
  'warszawa': 'PL',
  'krakow': 'PL',
  'kraków': 'PL',
  'wroclaw': 'PL',
  'wrocław': 'PL',
  'poznan': 'PL',
  'poznań': 'PL',
  'gdansk': 'PL',
  'gdańsk': 'PL',
  // Ireland
  'dublin': 'IE',
  'cork': 'IE',
  'galway': 'IE',
  // Czech Republic
  'prague': 'CZ',
  'praha': 'CZ',
  'brno': 'CZ',
  // Hungary
  'budapest': 'HU',
  // Greece
  'athens': 'GR',
  'athina': 'GR',
  'thessaloniki': 'GR',
  // Sweden
  'stockholm': 'SE',
  'gothenburg': 'SE',
  'göteborg': 'SE',
  'malmo': 'SE',
  'malmö': 'SE',
  // Denmark
  'copenhagen': 'DK',
  'københavn': 'DK',
  // Norway
  'oslo': 'NO',
  'bergen': 'NO',
  // Finland
  'helsinki': 'FI',
  // Romania
  'bucharest': 'RO',
  'bucurești': 'RO',
  // Bulgaria
  'sofia': 'BG',
  // Croatia
  'zagreb': 'HR',
  // Slovakia
  'bratislava': 'SK',
  // Slovenia
  'ljubljana': 'SI',
  // Lithuania
  'vilnius': 'LT',
  // Latvia
  'riga': 'LV',
  // Estonia
  'tallinn': 'EE',
  // Iceland
  'reykjavik': 'IS',
  'reykjavík': 'IS',
  // Luxembourg
  'luxembourg': 'LU',
  // Malta
  'valletta': 'MT',
  // Cyprus
  'nicosia': 'CY',
};

/**
 * Country name variations mapped to ISO country code.
 * Includes common abbreviations and alternative names.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // Full names
  'united kingdom': 'GB',
  'england': 'GB',
  'scotland': 'GB',
  'wales': 'GB',
  'northern ireland': 'GB',
  'great britain': 'GB',
  'britain': 'GB',
  'germany': 'DE',
  'deutschland': 'DE',
  'france': 'FR',
  'netherlands': 'NL',
  'holland': 'NL',
  'spain': 'ES',
  'españa': 'ES',
  'italy': 'IT',
  'italia': 'IT',
  'portugal': 'PT',
  'belgium': 'BE',
  'belgique': 'BE',
  'austria': 'AT',
  'österreich': 'AT',
  'switzerland': 'CH',
  'suisse': 'CH',
  'schweiz': 'CH',
  'poland': 'PL',
  'polska': 'PL',
  'ireland': 'IE',
  'czech republic': 'CZ',
  'czechia': 'CZ',
  'hungary': 'HU',
  'magyarország': 'HU',
  'greece': 'GR',
  'hellas': 'GR',
  'sweden': 'SE',
  'sverige': 'SE',
  'denmark': 'DK',
  'danmark': 'DK',
  'norway': 'NO',
  'norge': 'NO',
  'finland': 'FI',
  'suomi': 'FI',
  'romania': 'RO',
  'românia': 'RO',
  'bulgaria': 'BG',
  'croatia': 'HR',
  'hrvatska': 'HR',
  'slovakia': 'SK',
  'slovensko': 'SK',
  'slovenia': 'SI',
  'slovenija': 'SI',
  'lithuania': 'LT',
  'lietuva': 'LT',
  'latvia': 'LV',
  'latvija': 'LV',
  'estonia': 'EE',
  'eesti': 'EE',
  'iceland': 'IS',
  'ísland': 'IS',
  'luxembourg': 'LU',
  'malta': 'MT',
  'cyprus': 'CY',
  'liechtenstein': 'LI',
  // Common abbreviations
  'uk': 'GB',
  'u.k.': 'GB',
  'u.k': 'GB',
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
 * Detect GDPR country from a location string.
 * Checks for:
 * 1. Known GDPR city names (e.g., "London", "Berlin", "Paris")
 * 2. Country names or abbreviations (e.g., "Germany", "UK", "France")
 *
 * @param locationStr - Text that may contain a city or country
 * @returns Country code if GDPR country detected, null otherwise
 */
function detectGDPRCountry(locationStr: string): string | null {
  if (!locationStr) return null;

  const normalized = locationStr.toLowerCase().trim();

  // Check for known GDPR cities using word boundary matching
  // This prevents false positives like "berling" matching "berlin"
  for (const [city, countryCode] of Object.entries(GDPR_CITY_TO_COUNTRY)) {
    // Escape special regex characters in city names (e.g., for cities with dots)
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedCity}\\b`, 'i');
    if (regex.test(normalized)) {
      debugLog(`GDPR city detected: "${city}" -> ${countryCode}`);
      return countryCode;
    }
  }

  // Check for country names
  for (const [name, countryCode] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    // Use word boundary matching to avoid false positives
    // e.g., "Poland" should match but "Polandish" should not
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(normalized)) {
      debugLog(`GDPR country name detected: "${name}" -> ${countryCode}`);
      return countryCode;
    }
  }

  return null;
}

/**
 * Check if a bio contains GDPR location indicators.
 * Quick check for filtering before full extraction.
 *
 * @param bio - Instagram bio text
 * @returns Object with isGDPR flag and detected country code
 */
export function checkBioForGDPR(bio: string | undefined): { isGDPR: boolean; countryCode: string | null } {
  if (!bio) {
    return { isGDPR: false, countryCode: null };
  }

  const countryCode = detectGDPRCountry(bio);
  return {
    isGDPR: countryCode !== null && isGDPRCountry(countryCode),
    countryCode,
  };
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

  // First, check for GDPR country indicators in the full bio
  // This catches cases like "Berlin, Germany" or "UK tattoo artist"
  const gdprCheck = checkBioForGDPR(bio);

  // Try each pattern
  for (const pattern of LOCATION_PATTERNS) {
    const match = bio.match(pattern);
    if (match) {
      const potentialCity = match[1]?.trim();
      const potentialState = match[2]?.trim();

      debugLog(`Pattern matched: "${match[0]}" -> city="${potentialCity}", state="${potentialState}"`);

      if (!potentialCity) continue;

      // Check if this matched city is a GDPR city
      const gdprCountryFromCity = detectGDPRCountry(potentialCity);
      if (gdprCountryFromCity) {
        debugLog(`GDPR location detected in pattern: ${potentialCity} -> ${gdprCountryFromCity}`);
        return {
          city: potentialCity,
          state: null,
          citySlug: null,
          stateCode: null,
          countryCode: gdprCountryFromCity,
          isGDPR: true,
          confidence: 'high',
          rawMatch: match[0],
        };
      }

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
          countryCode: 'US',  // US city matched
          isGDPR: false,
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
            countryCode: 'US',  // Valid US state code
            isGDPR: false,
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
        countryCode: 'US',
        isGDPR: false,
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
          countryCode: 'US',
          isGDPR: false,
          confidence: 'low',
          rawMatch: alias,
        };
      }
    }
  }

  // If no US location found but we detected a GDPR country earlier, return that
  if (gdprCheck.isGDPR && gdprCheck.countryCode) {
    debugLog(`No US location, but GDPR country detected: ${gdprCheck.countryCode}`);
    return {
      city: null,
      state: null,
      citySlug: null,
      stateCode: null,
      countryCode: gdprCheck.countryCode,
      isGDPR: true,
      confidence: 'medium',
      rawMatch: bio.substring(0, 50), // Use part of bio as raw match
    };
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
