-- ============================================================================
-- Migration: Consolidate Multiple Permissive Policies
-- Description: Fix "Multiple Permissive Policies" warnings by consolidating
--              overlapping RLS policies. Multiple permissive policies on the
--              same table/operation are OR'd together, which can lead to
--              unintended access patterns.
-- Date: 2026-01-06
-- ============================================================================

-- ============================================================================
-- 1. ARTISTS TABLE
-- Problem: Two overlapping SELECT policies:
--   - "Public can read active artists" USING (deleted_at IS NULL)
--   - "Public read access to artists" USING (true)
-- The USING(true) policy makes the other one redundant.
-- Solution: Keep only the stricter policy (deleted_at IS NULL)
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public read access to artists" ON artists;

-- The "Public can read active artists" policy remains and properly filters deleted artists

-- ============================================================================
-- 2. ARTISTS TABLE - Multiple UPDATE policies
-- Problem: Two UPDATE policies for claimed artists:
--   - "Artists can update own profile" with deleted_at check
--   - "Claimed artists can update own profile" without deleted_at check
-- Solution: Keep only one, the stricter one with deleted_at check
-- ============================================================================

DROP POLICY IF EXISTS "Claimed artists can update own profile" ON artists;

-- "Artists can update own profile" remains (has deleted_at IS NULL check)

-- ============================================================================
-- 3. PORTFOLIO_IMAGES TABLE - Multiple SELECT policies
-- Problem: Three overlapping SELECT policies:
--   - "Public can read visible images" (hidden=false AND artist not deleted)
--   - "Public read access to active portfolio images" (status='active')
--   - "Artists can read own images" (claimed artist)
-- The first two are redundant/conflicting for public access.
-- Solution: Keep the most appropriate public policy
-- ============================================================================

-- Drop the simpler status-only check (less comprehensive)
DROP POLICY IF EXISTS "Public read access to active portfolio images" ON portfolio_images;

-- "Public can read visible images" remains (checks both hidden flag AND artist status)
-- "Artists can read own images" remains (allows artists to see their own hidden images)

-- ============================================================================
-- 4. PORTFOLIO_IMAGES TABLE - Multiple UPDATE policies
-- Problem: Two UPDATE policies for artists:
--   - "Artists can update own images"
--   - "Claimed artists can manage own portfolio images"
-- Both do the same thing (check claimed_by_user_id).
-- Solution: Keep only one
-- ============================================================================

DROP POLICY IF EXISTS "Claimed artists can manage own portfolio images" ON portfolio_images;

-- "Artists can update own images" remains

-- ============================================================================
-- 5. USERS TABLE - Redundant INSERT policies
-- Problem: Two INSERT policies:
--   - "Users can insert own data"
--   - "Users can insert own profile"
-- Both have identical WITH CHECK (id = (SELECT auth.uid()))
-- Solution: Keep only one
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- "Users can insert own data" remains

-- ============================================================================
-- 6. USERS TABLE - Redundant SELECT policies
-- Problem: Two SELECT policies:
--   - "Users can read own data"
--   - "Users can view own profile"
-- Both have identical USING (id = (SELECT auth.uid()))
-- Solution: Keep only one
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- "Users can read own data" remains

-- ============================================================================
-- 7. USERS TABLE - Redundant UPDATE policies
-- Problem: Two UPDATE policies:
--   - "Users can update own data"
--   - "Users can update own profile"
-- Both have identical USING (id = (SELECT auth.uid()))
-- Solution: Keep only one
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- "Users can update own data" remains

-- ============================================================================
-- 8. Convert service role FOR ALL policies to RESTRICTIVE where appropriate
-- Note: Service role policies using auth.role() = 'service_role' are fine
-- as permissive because they only match for service_role, not regular users.
-- No changes needed here - the "multiple permissive" warning is a false
-- positive when policies target different roles/conditions.
-- ============================================================================

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  table_name TEXT;
  policies_per_table RECORD;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'Total RLS policies after consolidation: %', policy_count;

  -- List tables with multiple SELECT policies (potential issues)
  FOR policies_per_table IN
    SELECT tablename, COUNT(*) as cnt
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
    GROUP BY tablename
    HAVING COUNT(*) > 2
    ORDER BY cnt DESC
  LOOP
    RAISE NOTICE 'Table % has % SELECT policies', policies_per_table.tablename, policies_per_table.cnt;
  END LOOP;
END $$;
