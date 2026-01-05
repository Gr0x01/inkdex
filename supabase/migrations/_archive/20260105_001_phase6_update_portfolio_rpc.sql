/**
 * Phase 6: Update get_artist_portfolio() RPC function
 *
 * Adds missing fields needed for portfolio management:
 * - hidden (for filtering visible images)
 * - import_source (for displaying import source labels)
 * - storage_original_path (for delete route storage cleanup)
 *
 * Applied: 2026-01-05
 */

-- Drop and recreate function with updated return type
DROP FUNCTION IF EXISTS get_artist_portfolio(UUID);

CREATE OR REPLACE FUNCTION get_artist_portfolio(p_artist_id UUID)
RETURNS TABLE (
  id UUID,
  instagram_post_id TEXT,
  instagram_url TEXT,
  storage_original_path TEXT,
  storage_thumb_320 TEXT,
  storage_thumb_640 TEXT,
  storage_thumb_1280 TEXT,
  post_caption TEXT,
  post_timestamp TIMESTAMPTZ,
  likes_count INTEGER,
  is_pinned BOOLEAN,
  pinned_position INTEGER,
  hidden BOOLEAN,
  import_source TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pi.id,
    pi.instagram_post_id,
    pi.instagram_url,
    pi.storage_original_path,
    pi.storage_thumb_320,
    pi.storage_thumb_640,
    pi.storage_thumb_1280,
    pi.post_caption,
    pi.post_timestamp,
    pi.likes_count,
    pi.is_pinned,
    pi.pinned_position,
    pi.hidden,
    pi.import_source,
    pi.created_at
  FROM portfolio_images pi
  WHERE pi.artist_id = p_artist_id
    AND pi.hidden = FALSE
    AND pi.artist_id IN (SELECT id FROM artists WHERE deleted_at IS NULL)
  ORDER BY
    pi.is_pinned DESC,
    pi.pinned_position ASC NULLS LAST,
    pi.created_at DESC;
$$;

COMMENT ON FUNCTION get_artist_portfolio(UUID) IS 'Returns portfolio images for an artist, ordered by pinned position. Filters out hidden images and deleted artists. Updated in Phase 6 to include hidden and import_source fields.';
