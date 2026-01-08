-- Fix: Check if artist exists before recomputing styles
-- This prevents FK constraint violations when deleting an artist (cascade deletes images)

CREATE OR REPLACE FUNCTION recompute_artist_styles_on_image_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if artist is being deleted (prevents FK violation during cascade delete)
  IF NOT EXISTS (SELECT 1 FROM artists WHERE id = OLD.artist_id) THEN
    RETURN OLD;
  END IF;

  -- Delete existing profiles for this artist
  DELETE FROM artist_style_profiles WHERE artist_id = OLD.artist_id;

  -- Recompute from remaining image tags
  INSERT INTO artist_style_profiles (artist_id, style_name, taxonomy, percentage, image_count)
  SELECT
    OLD.artist_id,
    ist.style_name,
    'technique' as taxonomy,
    (COUNT(*)::float / NULLIF(total.cnt, 0) * 100) as percentage,
    COUNT(*) as image_count
  FROM image_style_tags ist
  JOIN portfolio_images pi ON pi.id = ist.image_id
  CROSS JOIN (
    SELECT COUNT(DISTINCT pi2.id) as cnt
    FROM portfolio_images pi2
    WHERE pi2.artist_id = OLD.artist_id
    AND pi2.status = 'active'
    AND pi2.id != OLD.id  -- Exclude the deleted image
  ) total
  WHERE pi.artist_id = OLD.artist_id
  AND pi.status = 'active'
  AND pi.id != OLD.id  -- Exclude the deleted image
  GROUP BY ist.style_name, total.cnt
  HAVING COUNT(*) > 0;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recompute_artist_styles_on_image_delete() IS
  'Recomputes artist_style_profiles when an image is deleted. Skips if artist is being deleted (cascade).';
