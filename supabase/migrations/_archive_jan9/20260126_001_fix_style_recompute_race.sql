-- Fix: Race condition in recompute_artist_styles
--
-- Problem: When multiple images for the same artist are processed concurrently,
-- the recompute function can race:
-- 1. Transaction A: DELETE artist_style_profiles WHERE artist_id = X
-- 2. Transaction B: DELETE artist_style_profiles WHERE artist_id = X
-- 3. Transaction A: INSERT artist_style_profiles (succeeds)
-- 4. Transaction B: INSERT artist_style_profiles (fails: duplicate key)
--
-- Solution: Use INSERT ... ON CONFLICT DO UPDATE instead of DELETE + INSERT

CREATE OR REPLACE FUNCTION recompute_artist_styles(p_artist_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete existing profiles for this artist that won't be replaced
  -- (We'll upsert the new ones, so this just cleans up any orphaned styles)
  DELETE FROM artist_style_profiles
  WHERE artist_id = p_artist_id
    AND style_name NOT IN (
      SELECT ist.style_name
      FROM image_style_tags ist
      JOIN portfolio_images pi ON pi.id = ist.image_id
      WHERE pi.artist_id = p_artist_id
        AND pi.status = 'active'
    );

  -- Upsert with per-taxonomy percentages (matching compute-artist-profiles.ts logic)
  -- Uses ON CONFLICT to handle concurrent executions gracefully
  INSERT INTO artist_style_profiles (artist_id, style_name, taxonomy, percentage, image_count)
  WITH artist_tags AS (
    SELECT
      ist.style_name,
      COALESCE(ist.taxonomy, 'technique') as taxonomy,
      COUNT(*) as tag_count
    FROM image_style_tags ist
    JOIN portfolio_images pi ON pi.id = ist.image_id
    WHERE pi.artist_id = p_artist_id
      AND pi.status = 'active'
    GROUP BY ist.style_name, ist.taxonomy
  ),
  taxonomy_totals AS (
    SELECT taxonomy, SUM(tag_count) as total
    FROM artist_tags
    GROUP BY taxonomy
  )
  SELECT
    p_artist_id,
    at.style_name,
    at.taxonomy,
    (at.tag_count::float / NULLIF(tt.total, 0) * 100) as percentage,
    at.tag_count as image_count
  FROM artist_tags at
  JOIN taxonomy_totals tt ON tt.taxonomy = at.taxonomy
  ON CONFLICT (artist_id, style_name) DO UPDATE SET
    taxonomy = EXCLUDED.taxonomy,
    percentage = EXCLUDED.percentage,
    image_count = EXCLUDED.image_count,
    updated_at = now();
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION recompute_artist_styles(uuid) IS
  'Recomputes artist_style_profiles for a single artist. Uses UPSERT to handle concurrent executions safely.';
