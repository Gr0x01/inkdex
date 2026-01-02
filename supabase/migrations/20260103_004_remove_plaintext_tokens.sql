-- Phase 2: Remove Deprecated Plaintext OAuth Token Columns
--
-- CRITICAL SECURITY MIGRATION
-- Removes plaintext Instagram OAuth token storage after migration to Supabase Vault.
--
-- Context:
-- - Phase 1 stored tokens in plaintext (security risk)
-- - Phase 2 migrated to encrypted Vault storage via instagram_token_vault_id
-- - This migration removes the deprecated plaintext columns
--
-- Affected columns (users table):
-- - instagram_access_token (plaintext) → REMOVED
-- - instagram_refresh_token (plaintext) → REMOVED
-- - instagram_token_expires_at (timestamp) → REMOVED
--
-- Safe to run: All Phase 2 code uses Vault storage only
--
-- Date: 2026-01-03
-- Author: Phase 2 Security Hardening

-- Drop deprecated plaintext token columns
ALTER TABLE users
  DROP COLUMN IF EXISTS instagram_access_token,
  DROP COLUMN IF EXISTS instagram_refresh_token,
  DROP COLUMN IF EXISTS instagram_token_expires_at;

-- Verify Vault column still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'instagram_token_vault_id'
  ) THEN
    RAISE EXCEPTION 'instagram_token_vault_id column missing - Vault migration not applied!';
  END IF;
END $$;
