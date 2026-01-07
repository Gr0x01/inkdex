/**
 * Input validation for OG image route parameters
 * Validates and sanitizes user input before database queries
 */

// Valid country codes (ISO 3166-1 alpha-2)
const VALID_COUNTRY_CODES = new Set(['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'MX', 'BR', 'JP', 'KR', 'NZ', 'IE', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ'])

// US state/territory codes
const US_REGION_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
])

// Canadian province codes
const CA_REGION_CODES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
])

/**
 * Validate country code format and existence
 */
export function isValidCountryCode(country: string): boolean {
  if (!country || typeof country !== 'string') return false
  const code = country.toUpperCase()
  // Allow known codes or any 2-letter code for flexibility
  return /^[A-Z]{2}$/.test(code)
}

/**
 * Validate region code format
 */
export function isValidRegionCode(region: string, countryCode: string): boolean {
  if (!region || typeof region !== 'string') return false
  const code = region.toUpperCase()

  // Must be 2-3 alphanumeric characters
  if (!/^[A-Z0-9]{2,3}$/.test(code)) return false

  // Validate against known regions for specific countries
  const upperCountry = countryCode.toUpperCase()
  if (upperCountry === 'US') return US_REGION_CODES.has(code)
  if (upperCountry === 'CA') return CA_REGION_CODES.has(code)

  // For other countries, allow any 2-3 char code
  return true
}

/**
 * Validate city slug format
 * Allows lowercase letters, numbers, and hyphens
 */
export function isValidCitySlug(city: string): boolean {
  if (!city || typeof city !== 'string') return false
  // Must be 1-100 chars, lowercase alphanumeric with hyphens
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(city) && !city.includes('--')
}

/**
 * Validate style slug format
 * Allows lowercase letters, numbers, and hyphens
 */
export function isValidStyleSlug(style: string): boolean {
  if (!style || typeof style !== 'string') return false
  // Must be 1-50 chars, lowercase alphanumeric with hyphens
  return /^[a-z0-9][a-z0-9-]{0,49}$/.test(style) && !style.includes('--')
}

/**
 * Sanitize a string for safe display (remove potential injection characters)
 */
export function sanitizeDisplayText(text: string, maxLength: number = 100): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .slice(0, maxLength)
    .trim()
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string }

/**
 * Validate country page params
 */
export function validateCountryParams(params: {
  country: string
}): ValidationResult<{ countryCode: string }> {
  if (!isValidCountryCode(params.country)) {
    return { valid: false, error: `Invalid country code: ${params.country}` }
  }
  return { valid: true, data: { countryCode: params.country.toUpperCase() } }
}

/**
 * Validate region page params
 */
export function validateRegionParams(params: {
  country: string
  region: string
}): ValidationResult<{ countryCode: string; regionCode: string }> {
  if (!isValidCountryCode(params.country)) {
    return { valid: false, error: `Invalid country code: ${params.country}` }
  }
  const countryCode = params.country.toUpperCase()

  if (!isValidRegionCode(params.region, countryCode)) {
    return { valid: false, error: `Invalid region code: ${params.region}` }
  }

  return {
    valid: true,
    data: {
      countryCode,
      regionCode: params.region.toUpperCase(),
    },
  }
}

/**
 * Validate city page params
 */
export function validateCityParams(params: {
  country: string
  region: string
  city: string
}): ValidationResult<{ countryCode: string; regionCode: string; citySlug: string }> {
  const regionResult = validateRegionParams(params)
  if (!regionResult.valid) return regionResult

  if (!isValidCitySlug(params.city)) {
    return { valid: false, error: `Invalid city slug: ${params.city}` }
  }

  return {
    valid: true,
    data: {
      ...regionResult.data,
      citySlug: params.city,
    },
  }
}

/**
 * Validate city+style page params
 */
export function validateStyleParams(params: {
  country: string
  region: string
  city: string
  style: string
}): ValidationResult<{
  countryCode: string
  regionCode: string
  citySlug: string
  styleSlug: string
}> {
  const cityResult = validateCityParams(params)
  if (!cityResult.valid) return cityResult

  if (!isValidStyleSlug(params.style)) {
    return { valid: false, error: `Invalid style slug: ${params.style}` }
  }

  return {
    valid: true,
    data: {
      ...cityResult.data,
      styleSlug: params.style,
    },
  }
}
