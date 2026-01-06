-- ============================================
-- Fix RLS Security Errors
-- Enable RLS on tables missing it
-- ============================================

-- 1. admin_audit_log - Admin-only, service_role access
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert (via server-side API)
CREATE POLICY "Service role can insert audit logs"
  ON admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service_role can select (admin panel queries)
CREATE POLICY "Service role can read audit logs"
  ON admin_audit_log
  FOR SELECT
  TO service_role
  USING (true);

-- 2. artists_slug_backup - Legacy backup table, restrict all access
-- This table is safe to drop but enable RLS for now
ALTER TABLE artists_slug_backup ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (for potential rollback)
CREATE POLICY "Service role can access slug backup"
  ON artists_slug_backup
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. artist_color_profiles - Public read, service_role write
ALTER TABLE artist_color_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read color profiles (used in search)
CREATE POLICY "Anyone can read color profiles"
  ON artist_color_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can manage color profiles (pipeline)
CREATE POLICY "Service role can manage color profiles"
  ON artist_color_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
