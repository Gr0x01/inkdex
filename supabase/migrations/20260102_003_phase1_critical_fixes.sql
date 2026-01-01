-- Phase 1: Critical Fixes from Code Review
-- Addresses security vulnerabilities and missing policies identified in code review

-- ============================================================================
-- Fix #1: Restore Missing Users INSERT Policy
-- ============================================================================
-- Issue: Supabase Auth cannot create user accounts without INSERT policy
-- Severity: Critical (blocking auth functionality)

DROP POLICY IF EXISTS "Users can insert own data" ON users;

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users can insert own data" ON users IS
  'Allow Supabase Auth to create user records during signup';

-- ============================================================================
-- Fix #2: Optimize increment_search_appearances Function
-- ============================================================================
-- Issue: Loop-based approach is inefficient for batch operations
-- Severity: Critical (performance impact at scale)
-- Improvement: Use single batch INSERT instead of loop

CREATE OR REPLACE FUNCTION increment_search_appearances(p_artist_ids UUID[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO artist_analytics (artist_id, date, search_appearances)
  SELECT unnest(p_artist_ids), CURRENT_DATE, 1
  ON CONFLICT (artist_id, date)
  DO UPDATE SET search_appearances = artist_analytics.search_appearances + 1;
$$;

COMMENT ON FUNCTION increment_search_appearances IS
  'Batch increment search appearances for multiple artists (optimized with single INSERT)';

-- ============================================================================
-- Fix #3: Promo Code Timing Attack Prevention
-- ============================================================================
-- Issue: Different error messages reveal which promo codes exist
-- Severity: Critical (security - enables code enumeration)
-- Fix: Return generic error without revealing failure reason

DROP FUNCTION IF EXISTS validate_promo_code(TEXT);

CREATE OR REPLACE FUNCTION validate_promo_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  discount_type TEXT,
  discount_value INTEGER,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  promo promo_codes%ROWTYPE;
  is_code_valid BOOLEAN := FALSE;
BEGIN
  SELECT * INTO promo FROM promo_codes WHERE code = p_code;

  -- Check all conditions without revealing which failed
  IF FOUND
     AND promo.active
     AND (promo.expires_at IS NULL OR promo.expires_at >= NOW())
     AND (promo.max_uses IS NULL OR promo.current_uses < promo.max_uses) THEN
    is_code_valid := TRUE;
  END IF;

  IF is_code_valid THEN
    RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, TRUE;
  ELSE
    -- Generic error - don't reveal why it's invalid (prevents code enumeration)
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::INTEGER, FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION validate_promo_code IS
  'Validate promo code with generic error (prevents timing attacks and code enumeration)';

-- ============================================================================
-- Fix #4: Promo Code Race Condition Protection
-- ============================================================================
-- Issue: Concurrent requests could exceed max_uses limit
-- Severity: Critical (data integrity)
-- Fix: Add check constraint to enforce limit at commit time

ALTER TABLE promo_codes
  ADD CONSTRAINT check_uses_within_limit
  CHECK (max_uses IS NULL OR current_uses <= max_uses);

COMMENT ON CONSTRAINT check_uses_within_limit ON promo_codes IS
  'Prevent current_uses from exceeding max_uses (enforced at commit time)';

-- ============================================================================
-- Application Layer Notes
-- ============================================================================
-- When applying promo codes in Stripe webhooks or checkout flows:
-- 1. Use SELECT FOR UPDATE to lock the promo_codes row
-- 2. Validate max_uses in application code
-- 3. Increment current_uses within the same transaction
-- 4. Commit to release lock
--
-- Example:
-- BEGIN;
--   SELECT * FROM promo_codes WHERE code = 'CODE123' FOR UPDATE;
--   -- Validate in application
--   UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = 'CODE123';
-- COMMIT;
