-- Streamlined Onboarding Migration
-- Transforms 5-step blocking flow into 2-step non-blocking flow
-- Migration Date: 2026-01-04

-- Step 1: Add fetch status tracking columns
ALTER TABLE onboarding_sessions
ADD COLUMN IF NOT EXISTS fetch_status TEXT DEFAULT 'pending'
  CHECK (fetch_status IN ('pending', 'in_progress', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS fetch_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fetch_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fetch_error TEXT;

-- Step 2: Remove selected_image_ids (no longer needed - auto-import all classified)
ALTER TABLE onboarding_sessions
DROP COLUMN IF EXISTS selected_image_ids;

-- Step 3: Update current_step constraint (1-2 instead of 1-5)
ALTER TABLE onboarding_sessions
DROP CONSTRAINT IF EXISTS onboarding_sessions_current_step_check;

ALTER TABLE onboarding_sessions
ADD CONSTRAINT onboarding_sessions_current_step_check
CHECK (current_step >= 1 AND current_step <= 2);

-- Step 4: Migrate in-progress sessions
UPDATE onboarding_sessions
SET
  current_step = CASE
    WHEN current_step IN (1, 2) THEN 1  -- Fetch/Preview → Info
    WHEN current_step IN (3, 4, 5) THEN 2  -- Portfolio/Booking/Complete → Launch
    ELSE 1
  END,
  fetch_status = CASE
    WHEN fetched_images IS NOT NULL
      AND jsonb_array_length(fetched_images) > 0
      THEN 'completed'
    ELSE 'pending'
  END
WHERE current_step > 2;  -- Only update sessions that need migration

-- Add comment for documentation
COMMENT ON COLUMN onboarding_sessions.fetch_status IS 'Background Instagram fetch status: pending, in_progress, completed, failed';
COMMENT ON COLUMN onboarding_sessions.fetch_started_at IS 'When background Instagram fetch started';
COMMENT ON COLUMN onboarding_sessions.fetch_completed_at IS 'When background Instagram fetch completed';
COMMENT ON COLUMN onboarding_sessions.fetch_error IS 'Error message if fetch failed';
