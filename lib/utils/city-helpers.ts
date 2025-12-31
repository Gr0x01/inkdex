import { STATES } from '@/lib/constants/cities'

/**
 * Helper function to get state slug from state code
 * Provides type safety and fallback for state code mapping
 *
 * @param stateCode - Two-letter state code (e.g., 'TX', 'CA')
 * @returns State slug (e.g., 'texas', 'california')
 */
export function getStateSlug(stateCode: string): string {
  const state = STATES.find((s) => s.code === stateCode)
  return state?.slug || stateCode.toLowerCase()
}
