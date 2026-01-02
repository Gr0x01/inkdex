-- Phase 2: Migrate OAuth tokens from plaintext to Supabase Vault
-- CRITICAL SECURITY FIX: Encrypted token storage
-- Created: 2026-01-03
-- Purpose: Replace plaintext instagram_access_token/instagram_refresh_token columns with encrypted Vault storage

-- ============================================================================
-- 1. SUPABASE VAULT EXTENSION
-- ============================================================================

-- Note: supabase_vault extension is pre-installed on Supabase projects
-- No need to explicitly enable - it's already available in the 'vault' schema
-- Provides authenticated encryption for secrets with separate decryption key

-- ============================================================================
-- 2. ADD VAULT REFERENCE COLUMN TO USERS TABLE
-- ============================================================================

-- This column will store the UUID reference to the encrypted secret in vault.secrets
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS instagram_token_vault_id UUID REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Create index for faster Vault lookups (used in lib/supabase/vault.ts)
CREATE INDEX IF NOT EXISTS idx_users_vault_token ON users(instagram_token_vault_id);

-- ============================================================================
-- 3. DEPRECATE PLAINTEXT TOKEN COLUMNS
-- ============================================================================

-- Mark old columns as deprecated (will be removed in future migration 20260110_002)
-- Keep columns for backwards compatibility during Phase 2 implementation
-- After Phase 2 is stable and verified, these columns will be dropped

COMMENT ON COLUMN users.instagram_access_token IS
  'DEPRECATED (2026-01-03): Use instagram_token_vault_id to reference encrypted token in vault.secrets. This plaintext column will be removed in migration 20260110_002. Do not use for new code.';

COMMENT ON COLUMN users.instagram_token_expires_at IS
  'DEPRECATED (2026-01-03): Expiry timestamp now stored within encrypted vault secret. Will be removed in migration 20260110_002.';

COMMENT ON COLUMN users.instagram_refresh_token IS
  'DEPRECATED (2026-01-03): Use instagram_token_vault_id to reference encrypted token in vault.secrets. This plaintext column will be removed in migration 20260110_002. Do not use for new code.';

-- ============================================================================
-- 4. HELPER FUNCTION: VERIFY VAULT SECRET EXISTS
-- ============================================================================

-- Helper function to check if a user has valid vault tokens
-- Used by application code to verify token storage integrity
CREATE OR REPLACE FUNCTION user_has_vault_tokens(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to access vault
AS $$
DECLARE
  vault_id UUID;
BEGIN
  -- Get vault ID from user record
  SELECT instagram_token_vault_id INTO vault_id
  FROM users
  WHERE id = user_id_param;

  -- Return true if vault ID exists and references a valid secret
  IF vault_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if secret exists in vault
  RETURN EXISTS (
    SELECT 1
    FROM vault.secrets
    WHERE id = vault_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_vault_tokens(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION user_has_vault_tokens(UUID) IS
  'Check if a user has valid Instagram tokens stored in Vault. Returns TRUE if vault secret exists, FALSE otherwise. Used to verify token storage integrity.';

-- ============================================================================
-- 5. VAULT RPC FUNCTIONS FOR TOKEN MANAGEMENT
-- ============================================================================

-- Function to create encrypted secret in Vault
-- Used by lib/supabase/vault.ts storeInstagramTokens()
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret TEXT,
  name TEXT,
  description TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to access vault
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Insert into vault.secrets (Supabase Vault table)
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret, name, description)
  RETURNING vault.secrets.id INTO secret_id;

  RETURN QUERY SELECT secret_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION vault_create_secret(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION vault_create_secret(TEXT, TEXT, TEXT) IS
  'Create encrypted secret in Supabase Vault. Returns UUID of created secret. Used for storing Instagram OAuth tokens.';

-- Function to update existing secret
-- Used by lib/supabase/vault.ts when refreshing tokens
CREATE OR REPLACE FUNCTION vault_update_secret(
  secret_id UUID,
  new_secret TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret,
      updated_at = NOW()
  WHERE id = secret_id;

  -- Raise exception if secret doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault secret % not found', secret_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_update_secret(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION vault_update_secret(UUID, TEXT) IS
  'Update existing Vault secret. Used when refreshing Instagram tokens. Throws exception if secret not found.';

-- Function to delete secret from Vault
-- Used by lib/supabase/vault.ts on logout/revocation
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;

  -- Don't raise exception if not found (idempotent delete)
END;
$$;

GRANT EXECUTE ON FUNCTION vault_delete_secret(UUID) TO service_role;

COMMENT ON FUNCTION vault_delete_secret(UUID) IS
  'Delete secret from Vault. Idempotent (safe to call even if secret does not exist). Used on user logout.';

-- Function to retrieve and decrypt secret
-- Used by lib/supabase/vault.ts getInstagramTokens()
CREATE OR REPLACE FUNCTION vault_get_decrypted_secret(
  secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decrypted TEXT;
BEGIN
  -- Fetch decrypted secret from vault.decrypted_secrets view
  SELECT decrypted_secret INTO decrypted
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN decrypted;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_get_decrypted_secret(UUID) TO service_role;

COMMENT ON FUNCTION vault_get_decrypted_secret(UUID) IS
  'Retrieve and decrypt Vault secret. Returns NULL if secret not found. Used for fetching Instagram tokens.';

-- ============================================================================
-- 6. MIGRATION VERIFICATION
-- ============================================================================

-- Verify column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'instagram_token_vault_id'
  ) THEN
    RAISE EXCEPTION 'instagram_token_vault_id column not added. Migration failed.';
  END IF;
END
$$;

-- Verify index was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'users'
      AND indexname = 'idx_users_vault_token'
  ) THEN
    RAISE EXCEPTION 'idx_users_vault_token index not created. Migration failed.';
  END IF;
END
$$;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 Vault migration completed successfully';
  RAISE NOTICE 'All new Instagram OAuth tokens will be stored encrypted in vault.secrets';
  RAISE NOTICE 'Old plaintext columns marked as deprecated (will be removed in 20260110_002)';
END
$$;
