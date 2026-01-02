-- Phase 11: Add sync lock columns for race condition prevention
-- These columns enable atomic lock acquisition to prevent concurrent sync operations

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS sync_in_progress BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_sync_started_at TIMESTAMPTZ;

COMMENT ON COLUMN artists.sync_in_progress IS 'Lock flag to prevent concurrent sync operations';
COMMENT ON COLUMN artists.last_sync_started_at IS 'Timestamp when current sync started (for stale lock detection)';

-- Index for efficient stale lock detection queries
CREATE INDEX IF NOT EXISTS idx_artists_sync_lock
  ON artists(sync_in_progress, last_sync_started_at)
  WHERE sync_in_progress = TRUE;
