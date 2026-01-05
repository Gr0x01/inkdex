-- Phase 11: Auto-Sync Infrastructure
-- Adds columns and indexes needed for Instagram auto-sync feature

-- 1. Add instagram_media_id to portfolio_images for deduplication
-- This prevents re-importing the same Instagram post multiple times
ALTER TABLE portfolio_images
  ADD COLUMN IF NOT EXISTS instagram_media_id TEXT;

COMMENT ON COLUMN portfolio_images.instagram_media_id IS 'Instagram media ID for deduplication during sync';

-- 2. Create unique partial index for deduplication
-- Only applies to rows with non-null instagram_media_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_instagram_media_unique
  ON portfolio_images(artist_id, instagram_media_id)
  WHERE instagram_media_id IS NOT NULL;

-- 3. Add sync failure tracking columns to artists table
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS sync_consecutive_failures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_disabled_reason TEXT;

COMMENT ON COLUMN artists.sync_consecutive_failures IS 'Count of consecutive sync failures. Auto-sync disabled at 3.';
COMMENT ON COLUMN artists.sync_disabled_reason IS 'Reason auto-sync was disabled: token_revoked, consecutive_failures';

-- 4. Create efficient index for cron job queries
-- Used to find all Pro artists with auto-sync enabled
CREATE INDEX IF NOT EXISTS idx_artists_auto_sync_eligible
  ON artists(auto_sync_enabled, is_pro, last_instagram_sync_at)
  WHERE auto_sync_enabled = TRUE
    AND is_pro = TRUE
    AND deleted_at IS NULL;

-- 5. Add index on instagram_sync_log for dashboard queries (uses started_at column)
CREATE INDEX IF NOT EXISTS idx_sync_log_artist_recent
  ON instagram_sync_log(artist_id, started_at DESC);

-- 6. Grant necessary permissions
GRANT SELECT, INSERT ON instagram_sync_log TO authenticated;
GRANT SELECT, UPDATE ON artists TO authenticated;
GRANT SELECT, INSERT, UPDATE ON portfolio_images TO authenticated;
