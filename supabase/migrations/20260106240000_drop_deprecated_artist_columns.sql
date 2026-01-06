-- ============================================================================
-- Phase 5: Drop deprecated columns from artists table
-- ============================================================================
-- IRREVERSIBLE: This migration removes columns that have been migrated to
-- artist_sync_state and artist_pipeline_state tables.
--
-- Prerequisites (must be complete before running):
-- - Phase 3: artist_sync_state table created and TypeScript updated
-- - Phase 4: artist_pipeline_state table created and Python updated
-- - All code references updated to use new tables
-- ============================================================================

-- Drop indexes first (they reference the columns being dropped)
DROP INDEX IF EXISTS idx_artists_auto_sync;
DROP INDEX IF EXISTS idx_artists_auto_sync_eligible;
DROP INDEX IF EXISTS idx_artists_pipeline_status;
DROP INDEX IF EXISTS idx_artists_scraping_blacklisted;
DROP INDEX IF EXISTS idx_artists_city;

-- Drop trigger that references pipeline_status (if still exists)
DROP TRIGGER IF EXISTS update_pipeline_on_embedding ON portfolio_images;
DROP FUNCTION IF EXISTS update_artist_pipeline_on_embedding();

-- Drop sync columns (now in artist_sync_state)
ALTER TABLE artists DROP COLUMN IF EXISTS auto_sync_enabled;
ALTER TABLE artists DROP COLUMN IF EXISTS last_instagram_sync_at;
ALTER TABLE artists DROP COLUMN IF EXISTS last_sync_started_at;
ALTER TABLE artists DROP COLUMN IF EXISTS sync_in_progress;
ALTER TABLE artists DROP COLUMN IF EXISTS sync_consecutive_failures;
ALTER TABLE artists DROP COLUMN IF EXISTS sync_disabled_reason;

-- Drop pipeline columns (now in artist_pipeline_state)
ALTER TABLE artists DROP COLUMN IF EXISTS pipeline_status;
ALTER TABLE artists DROP COLUMN IF EXISTS last_scraped_at;
ALTER TABLE artists DROP COLUMN IF EXISTS scraping_blacklisted;
ALTER TABLE artists DROP COLUMN IF EXISTS exclude_from_scraping;
ALTER TABLE artists DROP COLUMN IF EXISTS blacklist_reason;

-- Drop deprecated location columns (replaced by artist_locations table)
-- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
ALTER TABLE artists DROP COLUMN IF EXISTS city;
ALTER TABLE artists DROP COLUMN IF EXISTS state;

-- Add comment documenting the schema change
COMMENT ON TABLE artists IS
  'Core artist profiles. Location data in artist_locations, sync state in artist_sync_state, pipeline state in artist_pipeline_state.';
