/**
 * Location utilities for URL handling and display formatting
 */

import { COUNTRIES } from '@/lib/constants/countries'
import { US_STATES } from '@/lib/constants/states'

// Lookup maps for fast access
const COUNTRY_NAME_MAP = new Map(COUNTRIES.map(c => [c.code, c.name]))
const US_STATE_NAME_MAP = new Map(US_STATES.map(s => [s.code, s.name]))
const US_STATE_CODE_MAP = new Map(US_STATES.map(s => [s.name.toLowerCase(), s.code]))

/**
 * Location filter object used throughout the app
 */
export interface LocationFilter {
  country?: string | null  // ISO 3166-1 alpha-2 (e.g., 'US', 'UK')
  region?: string | null   // State/province code (e.g., 'TX', 'Ontario')
  city?: string | null     // City name (e.g., 'Austin', 'London')
}

/**
 * Parse location from URL search params
 */
export function parseLocationParams(params: URLSearchParams): LocationFilter {
  return {
    country: params.get('country')?.toUpperCase() || null,
    region: params.get('region')?.toUpperCase() || null,
    city: params.get('city') ? slugToName(params.get('city')!) : null,
  }
}

/**
 * Build URL path from location components
 * @example buildLocationPath('us', 'tx', 'austin') => '/us/tx/austin'
 */
export function buildLocationPath(
  country?: string | null,
  region?: string | null,
  city?: string | null
): string {
  const parts: string[] = []

  if (country) {
    parts.push(country.toLowerCase())
    if (region) {
      parts.push(region.toLowerCase())
      if (city) {
        parts.push(nameToSlug(city))
      }
    }
  }

  return parts.length > 0 ? `/${parts.join('/')}` : '/'
}

/**
 * Build URL search params from location filter
 */
export function buildLocationParams(filter: LocationFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.country) params.set('country', filter.country.toLowerCase())
  if (filter.region) params.set('region', filter.region.toLowerCase())
  if (filter.city) params.set('city', nameToSlug(filter.city))
  return params
}

/**
 * Convert a URL slug to display name
 * @example 'los-angeles' => 'Los Angeles'
 */
export function slugToName(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return ''
  }
  // Only process valid slugs (alphanumeric and hyphens)
  const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')

  // Log when sanitization modifies input (potential data quality or injection issue)
  if (sanitized !== slug.toLowerCase() && typeof window === 'undefined') {
    // Server-side only logging to avoid console noise in browser
    console.warn(`[location] slugToName sanitized input: "${slug}" -> "${sanitized}"`)
  }

  if (sanitized.length === 0 || sanitized.length > 100) {
    return ''
  }
  return sanitized
    .split('-')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Convert a display name to URL slug
 * @example 'Los Angeles' => 'los-angeles'
 */
export function nameToSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return ''
  }
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')  // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  // Limit length for safety
  return slug.slice(0, 100)
}

/**
 * Get country display name from code
 * @example 'US' => 'United States'
 */
export function getCountryName(code: string): string {
  if (!code || typeof code !== 'string') {
    return 'Unknown'
  }
  const upperCode = code.toUpperCase()
  // Only return the code as fallback if it looks valid (2 letters)
  if (!isValidCountryCode(code)) {
    return 'Unknown'
  }
  return COUNTRY_NAME_MAP.get(upperCode) || upperCode
}

/**
 * Get region display name
 * For US: state code => state name (e.g., 'TX' => 'Texas')
 * For others: returns the code as-is
 */
export function getRegionName(code: string, countryCode?: string): string {
  if (!code || typeof code !== 'string') {
    return 'Unknown'
  }
  // Validate the region format before using it
  if (!isValidRegion(code)) {
    return 'Unknown'
  }
  if (countryCode?.toUpperCase() === 'US') {
    return US_STATE_NAME_MAP.get(code.toUpperCase()) || code.toUpperCase()
  }
  return code
}

/**
 * Get region code from name (US only)
 * @example 'Texas' => 'TX'
 */
export function getRegionCode(name: string, countryCode?: string): string {
  if (countryCode?.toUpperCase() === 'US') {
    return US_STATE_CODE_MAP.get(name.toLowerCase()) || name.toUpperCase()
  }
  return name.toUpperCase()
}

/**
 * Format a full location string for display
 * @example formatLocation('Austin', 'TX', 'US') => 'Austin, TX'
 * @example formatLocation('London', 'England', 'UK') => 'London, England, UK'
 */
export function formatLocation(
  city?: string | null,
  region?: string | null,
  countryCode?: string | null
): string {
  const parts: string[] = []

  if (city) parts.push(city)
  if (region) {
    // For US, use state code; for international, use region name
    if (countryCode?.toUpperCase() === 'US') {
      parts.push(region.toUpperCase())
    } else {
      parts.push(region)
    }
  }
  // Only show country for non-US
  if (countryCode && countryCode.toUpperCase() !== 'US') {
    parts.push(countryCode.toUpperCase())
  }

  return parts.join(', ')
}

/**
 * Format location for breadcrumbs with full names
 */
export function formatLocationBreadcrumb(
  city?: string | null,
  region?: string | null,
  countryCode?: string | null
): { country?: string; region?: string; city?: string } {
  return {
    country: countryCode ? getCountryName(countryCode) : undefined,
    region: region ? getRegionName(region, countryCode || undefined) : undefined,
    city: city || undefined,
  }
}

/**
 * Validate country code format
 */
export function isValidCountryCode(code: string): boolean {
  return /^[A-Za-z]{2}$/.test(code)
}

/**
 * Validate region format
 */
export function isValidRegion(region: string): boolean {
  return /^[A-Za-z0-9\s-]+$/.test(region) && region.length <= 50
}

/**
 * Validate city slug format
 */
export function isValidCitySlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 50
}

/**
 * Location data from artist_locations table
 */
export interface ArtistLocationData {
  id?: string
  city: string | null
  region: string | null
  country_code: string
  location_type?: 'city' | 'region' | 'country'
  is_primary?: boolean
  display_order?: number
}

/**
 * Get the primary location from an artist's locations array
 * Returns the first location marked as primary, or the first location by display_order
 */
export function getPrimaryLocation(
  locations?: ArtistLocationData[] | null
): ArtistLocationData | null {
  if (!locations || locations.length === 0) return null

  // Find primary location first
  const primary = locations.find(l => l.is_primary)
  if (primary) return primary

  // Fall back to first by display_order (already sorted by query)
  return locations[0]
}
