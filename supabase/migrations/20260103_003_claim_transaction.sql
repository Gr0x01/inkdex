-- ============================================================================
-- PHASE 3: CLAIM FLOW - ATOMIC TRANSACTION & SECURITY FIXES
-- ============================================================================
-- Migration: 20260103_003_claim_transaction.sql
-- Purpose: Fix race conditions and add transaction wrapping for claim process
-- Critical: Prevents double-claims and data corruption
-- ============================================================================

-- Create audit table for claim attempts
CREATE TABLE IF NOT EXISTS claim_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_handle_attempted TEXT NOT NULL,
  artist_handle TEXT NOT NULL,
  outcome TEXT NOT NULL, -- 'success', 'handle_mismatch', 'already_claimed', 'invalid_handle', etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claim_attempts_artist ON claim_attempts(artist_id);
CREATE INDEX idx_claim_attempts_user ON claim_attempts(user_id);
CREATE INDEX idx_claim_attempts_outcome ON claim_attempts(outcome);
CREATE INDEX idx_claim_attempts_created ON claim_attempts(created_at DESC);

COMMENT ON TABLE claim_attempts IS 'Audit log for all claim attempts (successful and failed)';

-- Atomic claim function with transaction wrapping
CREATE OR REPLACE FUNCTION claim_artist_profile(
  p_artist_id UUID,
  p_user_id UUID,
  p_instagram_handle TEXT,
  p_instagram_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_artist_handle TEXT;
  v_clean_handle TEXT;
  v_updated_count INT;
BEGIN
  -- Validate and sanitize input handle
  IF p_instagram_handle IS NULL OR p_instagram_handle = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_handle',
      'message', 'Instagram handle is required'
    );
  END IF;

  -- Clean and validate handle format
  v_clean_handle := LOWER(TRIM(REPLACE(p_instagram_handle, '@', '')));

  IF v_clean_handle !~ '^[a-z0-9._]{1,30}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_handle',
      'message', 'Invalid Instagram handle format'
    );
  END IF;

  -- Get artist's current handle for audit
  SELECT instagram_handle INTO v_artist_handle
  FROM artists
  WHERE id = p_artist_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'artist_not_found',
      'message', 'Artist profile not found'
    );
  END IF;

  -- Atomic update with race condition protection
  UPDATE artists
  SET
    claimed_by_user_id = p_user_id,
    claimed_at = NOW(),
    verification_status = 'claimed',
    instagram_id = COALESCE(p_instagram_id, instagram_id) -- Don't overwrite with NULL
  WHERE id = p_artist_id
    AND verification_status = 'unclaimed' -- Race condition protection
    AND deleted_at IS NULL
    AND LOWER(instagram_handle) = v_clean_handle; -- Handle verification

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Check if update succeeded
  IF v_updated_count = 0 THEN
    -- Determine specific failure reason
    DECLARE
      v_current_status TEXT;
      v_current_handle TEXT;
    BEGIN
      SELECT verification_status, instagram_handle
      INTO v_current_status, v_current_handle
      FROM artists
      WHERE id = p_artist_id AND deleted_at IS NULL;

      IF v_current_status = 'claimed' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'already_claimed',
          'message', 'This profile has already been claimed'
        );
      ELSIF LOWER(v_current_handle) != v_clean_handle THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'handle_mismatch',
          'message', 'Instagram handle does not match this profile'
        );
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'claim_failed',
          'message', 'Unable to claim profile'
        );
      END IF;
    END;
  END IF;

  -- Delete portfolio images (CASCADE handles references)
  DELETE FROM portfolio_images WHERE artist_id = p_artist_id;

  -- Log successful claim
  INSERT INTO claim_attempts (
    artist_id,
    user_id,
    instagram_handle_attempted,
    artist_handle,
    outcome
  ) VALUES (
    p_artist_id,
    p_user_id,
    p_instagram_handle,
    v_artist_handle,
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'artist_id', p_artist_id,
    'message', 'Profile claimed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log failed claim
    INSERT INTO claim_attempts (
      artist_id,
      user_id,
      instagram_handle_attempted,
      artist_handle,
      outcome
    ) VALUES (
      p_artist_id,
      p_user_id,
      p_instagram_handle,
      COALESCE(v_artist_handle, 'unknown'),
      'error'
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'server_error',
      'message', 'An unexpected error occurred'
    );
END;
$$;

COMMENT ON FUNCTION claim_artist_profile IS 'Atomically claims artist profile with race condition protection and audit logging';

-- Update can_claim_artist with input validation
CREATE OR REPLACE FUNCTION can_claim_artist(
  p_artist_id UUID,
  p_instagram_id TEXT DEFAULT NULL,
  p_instagram_handle TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_clean_handle TEXT;
BEGIN
  -- Validate and sanitize handle if provided
  IF p_instagram_handle IS NOT NULL THEN
    v_clean_handle := LOWER(TRIM(REPLACE(p_instagram_handle, '@', '')));

    -- Validate Instagram handle format
    IF v_clean_handle !~ '^[a-z0-9._]{1,30}$' THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM artists
    WHERE id = p_artist_id
      AND verification_status = 'unclaimed'
      AND deleted_at IS NULL
      AND (
        -- Match on instagram_id (if available)
        (p_instagram_id IS NOT NULL AND instagram_id = p_instagram_id)
        OR
        -- Match on instagram_handle (PRIMARY METHOD with validation)
        (v_clean_handle IS NOT NULL AND LOWER(instagram_handle) = v_clean_handle)
      )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION claim_artist_profile TO authenticated;
GRANT EXECUTE ON FUNCTION can_claim_artist TO authenticated;

-- Add RLS policies for claim_attempts
ALTER TABLE claim_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own claim attempts"
  ON claim_attempts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to claim attempts"
  ON claim_attempts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
