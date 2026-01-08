-- ============================================================================
-- Migration: Complete RLS Policy Fix
-- Date: 2026-01-09
-- Issues Fixed:
--   1. artist_sync_state missing INSERT policy (UPSERT fails)
--   2. artist_pipeline_state missing INSERT/UPDATE policies
--   3. artists UPDATE missing WITH CHECK clause
--   4. All UPDATE policies audited for WITH CHECK
--   5. Performance: all auth functions wrapped in subqueries
-- ============================================================================

-- ============================================================================
-- 1. FIX: artists table UPDATE policy (add WITH CHECK)
-- ============================================================================
DROP POLICY IF EXISTS "Artists can update own profile" ON artists;
CREATE POLICY "Artists can update own profile" ON artists
  FOR UPDATE
  USING (claimed_by_user_id = (SELECT auth.uid()) AND deleted_at IS NULL)
  WITH CHECK (claimed_by_user_id = (SELECT auth.uid()) AND deleted_at IS NULL);

-- ============================================================================
-- 2. FIX: artist_sync_state - Add INSERT + fix UPDATE with WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "Artists can view own sync state" ON artist_sync_state;
CREATE POLICY "Artists can view own sync state"
ON artist_sync_state FOR SELECT
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Artists can update own sync state" ON artist_sync_state;
CREATE POLICY "Artists can update own sync state"
ON artist_sync_state FOR UPDATE
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
);

-- NEW: INSERT policy for UPSERT support
DROP POLICY IF EXISTS "Artists can insert own sync state" ON artist_sync_state;
CREATE POLICY "Artists can insert own sync state"
ON artist_sync_state FOR INSERT
WITH CHECK (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role full access" ON artist_sync_state;
CREATE POLICY "Service role full access"
ON artist_sync_state FOR ALL
USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 3. FIX: artist_pipeline_state - Add INSERT/UPDATE for profile delete
-- ============================================================================
DROP POLICY IF EXISTS "Artist owners can view pipeline state" ON artist_pipeline_state;
CREATE POLICY "Artist owners can view pipeline state"
ON artist_pipeline_state FOR SELECT
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
);

-- NEW: INSERT policy for UPSERT support
DROP POLICY IF EXISTS "Artists can insert own pipeline state" ON artist_pipeline_state;
CREATE POLICY "Artists can insert own pipeline state"
ON artist_pipeline_state FOR INSERT
WITH CHECK (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
);

-- NEW: UPDATE policy for profile delete exclusion marking
DROP POLICY IF EXISTS "Artists can update own pipeline state" ON artist_pipeline_state;
CREATE POLICY "Artists can update own pipeline state"
ON artist_pipeline_state FOR UPDATE
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role full access" ON artist_pipeline_state;
CREATE POLICY "Service role full access"
ON artist_pipeline_state FOR ALL
USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 4. FIX: portfolio_images UPDATE policies - Add WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "Artists can update own images" ON portfolio_images;
CREATE POLICY "Artists can update own images" ON portfolio_images
  FOR UPDATE
  USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- 5. FIX: artist_locations UPDATE policy - Add WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "artist_locations_update_own" ON artist_locations;
CREATE POLICY "artist_locations_update_own" ON artist_locations
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_locations.artist_id
    AND a.claimed_by_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_locations.artist_id
    AND a.claimed_by_user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- 6. FIX: users table UPDATE policy - Add WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- 7. FIX: onboarding_sessions UPDATE policy - Add WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can update own onboarding sessions" ON onboarding_sessions
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 8. FIX: email_preferences UPDATE policy - Add WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their own email preferences" ON email_preferences;
CREATE POLICY "Users can update their own email preferences" ON email_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR email = (SELECT auth.email()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR email = (SELECT auth.email()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  RAISE NOTICE 'Total RLS policies after fix: %', policy_count;
END $$;
