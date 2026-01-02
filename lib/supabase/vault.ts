/**
 * Supabase Vault utilities for encrypted OAuth token storage
 *
 * CRITICAL SECURITY: Replaces plaintext token storage with authenticated encryption
 *
 * Vault Features:
 * - Authenticated encryption (prevents forgery, tamper-resistant)
 * - Encryption key stored separately from database
 * - Automatic decryption via Supabase
 *
 * Usage:
 * - storeInstagramTokens(): Encrypt & store tokens after OAuth callback
 * - getInstagramTokens(): Retrieve & decrypt tokens for API calls
 * - deleteInstagramTokens(): Remove tokens on logout/revocation
 *
 * @see supabase/migrations/20260103_001_vault_token_storage.sql
 */

import { createServiceClient } from './service'

export interface InstagramTokens {
  access_token: string
  refresh_token: string
  expires_at: string // ISO 8601 timestamp
}

/**
 * Store Instagram OAuth tokens in Supabase Vault (encrypted)
 *
 * Creates an encrypted secret in vault.secrets and links it to the user record.
 * If user already has tokens, updates the existing vault secret.
 *
 * Security:
 * - Tokens encrypted at rest using Vault's authenticated encryption
 * - Decryption key managed by Supabase (separate from database)
 * - Never logs decrypted tokens
 *
 * @param userId - User UUID from users table
 * @param tokens - OAuth tokens from Instagram Graph API (via Facebook)
 * @returns Vault secret ID (UUID)
 * @throws Error if Vault storage fails
 *
 * @example
 * ```typescript
 * await storeInstagramTokens(userId, {
 *   access_token: 'EAAx...',
 *   refresh_token: 'EAAx...',
 *   expires_at: '2026-03-03T12:00:00Z'
 * })
 * ```
 */
export async function storeInstagramTokens(
  userId: string,
  tokens: InstagramTokens
): Promise<string> {
  const supabase = createServiceClient()

  // Check if user already has vault tokens
  const { data: existingUser, error: userError } = await supabase
    .from('users')
    .select('instagram_token_vault_id')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user: ${userError.message}`)
  }

  // Serialize tokens as JSON string for Vault storage
  const secretValue = JSON.stringify(tokens)
  const secretName = `instagram_tokens_${userId}`

  // If vault secret already exists, update it
  if (existingUser?.instagram_token_vault_id) {
    console.log(`[Vault] Updating existing secret for user ${userId}`)

    const { error: updateError } = await supabase.rpc('vault_update_secret', {
      secret_id: existingUser.instagram_token_vault_id,
      new_secret: secretValue,
    })

    if (updateError) {
      throw new Error(`Failed to update vault secret: ${updateError.message}`)
    }

    return existingUser.instagram_token_vault_id
  }

  // Create new encrypted secret in Vault
  console.log(`[Vault] Creating new secret for user ${userId}`)

  const { data: vaultData, error: vaultError } = await supabase.rpc('vault_create_secret', {
    secret: secretValue,
    name: secretName,
    description: `Instagram OAuth tokens for user ${userId} (encrypted)`,
  })

  if (vaultError || !vaultData || vaultData.length === 0) {
    throw new Error(`Failed to create vault secret: ${vaultError?.message || 'No data returned'}`)
  }

  // Extract vault ID from RPC response (returns array)
  const vaultId = vaultData[0].id

  // Update user record with Vault reference
  const { error: updateError } = await supabase
    .from('users')
    .update({
      instagram_token_vault_id: vaultId,
      instagram_token_expires_at: tokens.expires_at, // Keep expiry in users table for quick checks
    })
    .eq('id', userId)

  if (updateError) {
    console.error(`[Vault] Failed to link vault to user ${userId}:`, updateError.message)

    // Attempt rollback
    const { error: deleteError } = await supabase.rpc('vault_delete_secret', {
      secret_id: vaultId,
    })

    if (deleteError) {
      // CRITICAL: Orphaned secret! Log for manual cleanup
      console.error(`[Vault] CRITICAL: Orphaned secret ${vaultId} for user ${userId}. Manual cleanup required!`, deleteError.message)
      // TODO: Send alert to monitoring system (e.g., Sentry)
    }

    throw new Error(`Failed to link vault to user: ${updateError.message}`)
  }

  console.log(`[Vault] Successfully stored tokens for user ${userId} (vault_id: ${vaultId})`)
  return vaultId
}

/**
 * Retrieve Instagram OAuth tokens from Supabase Vault (decrypted)
 *
 * Fetches the encrypted secret from Vault and returns decrypted tokens.
 * Uses vault.decrypted_secrets view which handles decryption automatically.
 *
 * Security:
 * - Only accessible via service role (bypasses RLS)
 * - Decryption key managed by Supabase
 * - Returns null if tokens don't exist (safe default)
 *
 * @param userId - User UUID
 * @returns Decrypted tokens or null if not found
 *
 * @example
 * ```typescript
 * const tokens = await getInstagramTokens(userId)
 * if (tokens) {
 *   // Use tokens.access_token for API calls
 *   fetch(instagramApiUrl, {
 *     headers: { Authorization: `Bearer ${tokens.access_token}` }
 *   })
 * }
 * ```
 */
export async function getInstagramTokens(
  userId: string
): Promise<InstagramTokens | null> {
  const supabase = createServiceClient()

  // Get Vault secret ID from user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('instagram_token_vault_id')
    .eq('id', userId)
    .single()

  if (userError || !user?.instagram_token_vault_id) {
    return null
  }

  // Fetch and decrypt secret from Vault using RPC function
  const { data, error } = await supabase.rpc('vault_get_decrypted_secret', {
    secret_id: user.instagram_token_vault_id
  })

  if (error || !data) {
    console.error(`[Vault] Failed to decrypt tokens for user ${userId}:`, error?.message)
    return null
  }

  try {
    return JSON.parse(data) as InstagramTokens
  } catch (parseError) {
    console.error(`[Vault] Failed to parse tokens for user ${userId}:`, parseError)
    return null
  }
}

/**
 * Delete Instagram tokens from Vault (on logout or revocation)
 *
 * Removes the encrypted secret from vault.secrets and clears the user's vault reference.
 * Safe to call even if tokens don't exist (idempotent).
 *
 * Use cases:
 * - User logs out (normal)
 * - OAuth token revoked by Instagram (error recovery)
 * - User deletes account (cleanup)
 *
 * @param userId - User UUID
 *
 * @example
 * ```typescript
 * // On logout
 * await deleteInstagramTokens(userId)
 * await supabase.auth.signOut()
 * ```
 */
export async function deleteInstagramTokens(userId: string): Promise<void> {
  const supabase = createServiceClient()

  // Get Vault ID from user record
  const { data: user } = await supabase
    .from('users')
    .select('instagram_token_vault_id')
    .eq('id', userId)
    .single()

  if (!user?.instagram_token_vault_id) {
    console.log(`[Vault] No tokens to delete for user ${userId}`)
    return
  }

  // Delete secret from Vault
  const { error: vaultError } = await supabase.rpc('vault_delete_secret', {
    secret_id: user.instagram_token_vault_id,
  })

  if (vaultError) {
    console.error(`[Vault] Failed to delete secret:`, vaultError.message)
    // Continue anyway to clear user reference
  }

  // Clear Vault reference in user record
  const { error: updateError } = await supabase
    .from('users')
    .update({
      instagram_token_vault_id: null,
      instagram_token_expires_at: null,
    })
    .eq('id', userId)

  if (updateError) {
    console.error(`[Vault] Failed to clear user vault reference:`, updateError.message)
    return
  }

  console.log(`[Vault] Successfully deleted tokens for user ${userId}`)
}

/**
 * Check if user has valid tokens in Vault
 *
 * Quick check without decrypting the secret. Useful for:
 * - Determining if user needs to re-authenticate
 * - Middleware checks before attempting token refresh
 * - Dashboard UI (show "Connect Instagram" vs "Connected")
 *
 * @param userId - User UUID
 * @returns True if vault secret exists, false otherwise
 *
 * @example
 * ```typescript
 * const hasTokens = await hasInstagramTokens(userId)
 * if (!hasTokens) {
 *   redirect('/connect-instagram')
 * }
 * ```
 */
export async function hasInstagramTokens(userId: string): Promise<boolean> {
  const supabase = createServiceClient()

  // Use RPC function from migration (user_has_vault_tokens)
  const { data, error } = await supabase.rpc('user_has_vault_tokens', {
    user_id_param: userId
  })

  if (error) {
    console.error(`[Vault] Failed to check token existence for user ${userId}:`, error.message)
    return false
  }

  return !!data
}
