-- Grant permissions on pgsodium crypto functions for Vault
-- Error: permission denied for function _crypto_aead_det_noncegen

-- The vault.secrets table uses transparent column encryption via pgsodium
-- We need to grant execute on the underlying crypto functions

-- Grant to postgres role (function owner)
GRANT USAGE ON SCHEMA pgsodium TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgsodium TO postgres;

-- Grant to service_role for direct API access
GRANT USAGE ON SCHEMA pgsodium TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgsodium TO service_role;

-- Grant to authenticated users (may be needed for triggers)
GRANT USAGE ON SCHEMA pgsodium TO authenticated;

-- Ensure vault schema permissions
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vault TO service_role;
