-- ============================================================================
-- Phase 3: Extract sync state from artists table
-- ============================================================================
-- Creates artist_sync_state table and migrates existing data.
-- The artists table sync columns will be dropped in Phase 5.
-- ============================================================================

-- Create the new sync state table
CREATE TABLE IF NOT EXISTS artist_sync_state (
  artist_id UUID PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,

  -- Sync scheduling
  auto_sync_enabled BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_sync_started_at TIMESTAMPTZ,
  sync_in_progress BOOLEAN DEFAULT FALSE,

  -- Sync health
  consecutive_failures INTEGER DEFAULT 0,
  disabled_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sync_state_auto_enabled
ON artist_sync_state(auto_sync_enabled) WHERE auto_sync_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_sync_state_last_sync
ON artist_sync_state(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_sync_state_in_progress
ON artist_sync_state(sync_in_progress) WHERE sync_in_progress = TRUE;

-- Migrate existing data from artists table
INSERT INTO artist_sync_state (
  artist_id,
  auto_sync_enabled,
  last_sync_at,
  last_sync_started_at,
  sync_in_progress,
  consecutive_failures,
  disabled_reason,
  created_at,
  updated_at
)
SELECT
  id,
  COALESCE(auto_sync_enabled, FALSE),
  last_instagram_sync_at,
  last_sync_started_at,
  COALESCE(sync_in_progress, FALSE),
  COALESCE(sync_consecutive_failures, 0),
  sync_disabled_reason,
  COALESCE(created_at, NOW()),
  NOW()
FROM artists
WHERE auto_sync_enabled = TRUE
   OR last_instagram_sync_at IS NOT NULL
   OR sync_in_progress = TRUE
ON CONFLICT (artist_id) DO UPDATE SET
  auto_sync_enabled = EXCLUDED.auto_sync_enabled,
  last_sync_at = EXCLUDED.last_sync_at,
  last_sync_started_at = EXCLUDED.last_sync_started_at,
  sync_in_progress = EXCLUDED.sync_in_progress,
  consecutive_failures = EXCLUDED.consecutive_failures,
  disabled_reason = EXCLUDED.disabled_reason,
  updated_at = NOW();

-- Add RLS policies
ALTER TABLE artist_sync_state ENABLE ROW LEVEL SECURITY;

-- Artists can view their own sync state
CREATE POLICY "Artists can view own sync state"
ON artist_sync_state FOR SELECT
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
  )
);

-- Artists can update their own sync state (for enabling/disabling auto-sync)
CREATE POLICY "Artists can update own sync state"
ON artist_sync_state FOR UPDATE
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
  )
);

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access"
ON artist_sync_state FOR ALL
USING (auth.role() = 'service_role');

COMMENT ON TABLE artist_sync_state IS
  'Stores Instagram sync state for claimed artists. Extracted from artists table for cleaner schema.';
