/**
 * Helper function to get state slug from state code
 * Returns lowercase state code for new international URL format
 *
 * @param stateCode - Two-letter state code (e.g., 'TX', 'CA')
 * @returns Lowercase state code (e.g., 'tx', 'ca')
 */
export function getStateSlug(stateCode: string): string {
  return stateCode.toLowerCase()
}

/**
 * Build browse page URL for a city
 * Uses new international URL format: /us/tx/austin
 *
 * @param stateCode - Two-letter state code (e.g., 'TX')
 * @param citySlug - City slug (e.g., 'austin')
 * @param countryCode - Two-letter country code (default: 'US')
 * @returns Full browse URL (e.g., '/us/tx/austin')
 */
export function buildCityUrl(stateCode: string, citySlug: string, countryCode: string = 'US'): string {
  return `/${countryCode.toLowerCase()}/${stateCode.toLowerCase()}/${citySlug}`
}
