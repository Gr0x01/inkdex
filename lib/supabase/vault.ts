/**
 * Token encryption utilities using pgcrypto
 *
 * Uses PostgreSQL pgcrypto extension for symmetric encryption of OAuth tokens.
 * This replaces Supabase Vault which has permission issues with pgsodium.
 *
 * Security:
 * - Tokens encrypted at rest using AES via pgp_sym_encrypt
 * - Encryption key stored in environment variable (never in database)
 * - Only accessible via service role (bypasses RLS)
 */

import { createServiceClient } from './service'

export interface InstagramTokens {
  access_token: string
  refresh_token: string
  expires_at: string // ISO 8601 timestamp
}

// Encryption key from environment - must be set in production
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'dev-encryption-key-change-in-prod'

/**
 * Store Instagram OAuth tokens (encrypted)
 *
 * @param userId - User UUID from users table
 * @param tokens - OAuth tokens from Instagram Graph API
 * @returns Token record ID
 */
export async function storeInstagramTokens(
  userId: string,
  tokens: InstagramTokens
): Promise<string> {
  const supabase = createServiceClient()

  // Serialize tokens as JSON
  const tokenData = JSON.stringify(tokens)

  console.log(`[Tokens] Storing encrypted tokens for user ${userId}`)

  // Store using pgcrypto encryption
  const { data, error } = await supabase.rpc('store_encrypted_token', {
    p_user_id: userId,
    p_token_data: tokenData,
    p_encryption_key: ENCRYPTION_KEY,
  })

  if (error) {
    console.error(`[Tokens] Failed to store tokens:`, error.message)
    throw new Error(`Failed to store tokens: ${error.message}`)
  }

  // Update user record with expiry for quick checks
  const { error: updateError } = await supabase
    .from('users')
    .update({
      instagram_token_expires_at: tokens.expires_at,
    })
    .eq('id', userId)

  if (updateError) {
    console.error(`[Tokens] Failed to update user expiry:`, updateError.message)
    // Non-fatal - tokens are still stored
  }

  console.log(`[Tokens] Successfully stored tokens for user ${userId}`)
  return data
}

/**
 * Retrieve Instagram OAuth tokens (decrypted)
 *
 * @param userId - User UUID
 * @returns Decrypted tokens or null if not found
 */
export async function getInstagramTokens(
  userId: string
): Promise<InstagramTokens | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('get_decrypted_token', {
    p_user_id: userId,
    p_encryption_key: ENCRYPTION_KEY,
  })

  if (error) {
    console.error(`[Tokens] Failed to retrieve tokens for user ${userId}:`, error.message)
    return null
  }

  if (!data) {
    return null
  }

  try {
    return JSON.parse(data) as InstagramTokens
  } catch (parseError) {
    console.error(`[Tokens] Failed to parse tokens for user ${userId}:`, parseError)
    return null
  }
}

/**
 * Delete Instagram tokens
 *
 * @param userId - User UUID
 */
export async function deleteInstagramTokens(userId: string): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase.rpc('delete_encrypted_token', {
    p_user_id: userId,
  })

  if (error) {
    console.error(`[Tokens] Failed to delete tokens:`, error.message)
    // Continue anyway
  }

  // Clear user expiry
  await supabase
    .from('users')
    .update({
      instagram_token_expires_at: null,
    })
    .eq('id', userId)

  console.log(`[Tokens] Deleted tokens for user ${userId}`)
}

/**
 * Check if user has valid tokens
 *
 * @param userId - User UUID
 * @returns True if tokens exist
 */
export async function hasInstagramTokens(userId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('encrypted_instagram_tokens')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return true
}
