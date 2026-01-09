-- Fix Vault function permissions for pgsodium encryption
-- The vault functions need access to pgsodium crypto functions
-- Error was: permission denied for function _crypto_aead_det_noncegen

-- ============================================================================
-- 1. RECREATE VAULT FUNCTIONS WITH PROPER SEARCH PATH
-- ============================================================================

-- Function to create encrypted secret in Vault
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret TEXT,
  name TEXT,
  description TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
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

-- Function to update existing secret
CREATE OR REPLACE FUNCTION vault_update_secret(
  secret_id UUID,
  new_secret TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret,
      updated_at = NOW()
  WHERE id = secret_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault secret % not found', secret_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_update_secret(UUID, TEXT) TO service_role;

-- Function to delete secret from Vault
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_delete_secret(UUID) TO service_role;

-- Function to retrieve and decrypt secret
CREATE OR REPLACE FUNCTION vault_get_decrypted_secret(
  secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN decrypted;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_get_decrypted_secret(UUID) TO service_role;

-- Helper function to check if a user has valid vault tokens
CREATE OR REPLACE FUNCTION user_has_vault_tokens(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  vault_id UUID;
BEGIN
  SELECT instagram_token_vault_id INTO vault_id
  FROM users
  WHERE id = user_id_param;

  IF vault_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM vault.secrets
    WHERE id = vault_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_has_vault_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_vault_tokens(UUID) TO service_role;
