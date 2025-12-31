-- Migration: Fix query_type constraint to allow new search types
-- Created: 2025-01-01
-- Description: Updates CHECK constraint to include instagram_post, instagram_profile, similar_artist
--
-- Issue: Migration 20251229_004_validation_constraints.sql restricts query_type to
-- only ('image', 'text', 'hybrid') but TypeScript types include additional values
-- that were added in Instagram link support (Phase 1 & 2)
--
-- Fix: Drop old constraint and add updated constraint with all valid query types

-- Drop old constraint
ALTER TABLE searches DROP CONSTRAINT IF EXISTS valid_query_type;

-- Add updated constraint with all valid query types
ALTER TABLE searches ADD CONSTRAINT valid_query_type
  CHECK (query_type IN (
    'image',
    'text',
    'hybrid',
    'instagram_post',
    'instagram_profile',
    'similar_artist'
  ));

-- Add helpful comment for future reference
COMMENT ON COLUMN searches.query_type IS 'Search query type. Valid values: image, text, hybrid, instagram_post, instagram_profile, similar_artist';
