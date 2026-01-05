-- Migration: Add filter_non_tattoo_content preference to artists table
-- This allows Pro artists to disable AI classification and import all Instagram images
-- Default: TRUE (filter enabled) maintains backward compatibility

-- Add column with default TRUE
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS filter_non_tattoo_content BOOLEAN DEFAULT TRUE;

-- Add partial index for minority case (filter disabled)
CREATE INDEX IF NOT EXISTS idx_artists_filter_preference
  ON artists(filter_non_tattoo_content)
  WHERE filter_non_tattoo_content = FALSE;

-- Add column comment
COMMENT ON COLUMN artists.filter_non_tattoo_content IS
  'Pro feature: Filter non-tattoo content during auto-sync and manual import using GPT-5-mini classification. TRUE = filter enabled (default), FALSE = import all images.';

-- Backfill existing artists to TRUE (maintains current behavior)
UPDATE artists
SET filter_non_tattoo_content = TRUE
WHERE filter_non_tattoo_content IS NULL;
