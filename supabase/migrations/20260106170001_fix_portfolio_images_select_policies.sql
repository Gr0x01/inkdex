-- ============================================================================
-- Migration: Fix portfolio_images SELECT policies
-- Description: Consolidate the two SELECT policies on portfolio_images
--   - "Public can read visible images" - applies to anon and authenticated
--   - "Artists can read own images" - should only apply to authenticated
-- The issue is both policies apply to all roles, causing multiple permissive warnings.
-- Fix: Scope "Artists can read own images" to authenticated only using TO clause
-- Date: 2026-01-06
-- ============================================================================

-- Drop and recreate "Artists can read own images" to only apply to authenticated
DROP POLICY IF EXISTS "Artists can read own images" ON portfolio_images;

CREATE POLICY "Artists can read own images" ON portfolio_images
  FOR SELECT TO authenticated
  USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

-- The "Public can read visible images" policy already exists and handles public access
-- No changes needed for it
