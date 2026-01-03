/* eslint-disable @typescript-eslint/no-explicit-any -- JSONB requires any type for Supabase */
/**
 * Database helper utilities for type-safe operations
 */

/**
 * Convert a typed object to JSONB-compatible format for Supabase
 *
 * This helper exists because Supabase auto-generated types define JSONB columns as `any`,
 * but we want to maintain type safety before the database layer.
 *
 * @param value - The typed value to convert to JSONB
 * @returns The value cast to `any` for Supabase JSONB insertion
 *
 * @example
 * ```typescript
 * const result: ClassifierResultRecord = { passed: true, method: 'bio', ... };
 * await supabase.from('artist_recommendations').insert({
 *   classifier_result: toJsonb(result), // Type-safe before cast
 * });
 * ```
 */
export function toJsonb<T>(value: T): any {
  return value as unknown as any;
}
