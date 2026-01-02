-- Add unique constraint on instagram_handle (case-insensitive)
-- Prevents race condition where two simultaneous requests could create duplicate artists
-- Phase 4: Add-Artist Security Fix
-- Created: 2026-01-04

-- Drop existing unique constraint if it exists (may already be there)
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_instagram_handle_key;

-- Add case-insensitive unique constraint
-- This uses a functional index to enforce uniqueness on LOWER(instagram_handle)
CREATE UNIQUE INDEX IF NOT EXISTS artists_instagram_handle_lower_unique
  ON artists (LOWER(instagram_handle))
  WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON INDEX artists_instagram_handle_lower_unique IS 'Case-insensitive unique constraint on instagram_handle. Excludes soft-deleted artists. Prevents race conditions in artist creation.';
