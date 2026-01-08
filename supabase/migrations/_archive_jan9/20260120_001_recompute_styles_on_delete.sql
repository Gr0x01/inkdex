-- Recompute artist style profiles when images are deleted
-- This ensures style badges stay accurate after admin cleanup

CREATE OR REPLACE FUNCTION recompute_artist_styles_on_image_delete()
RETURNS TRIGGER AS $$
BEGIN
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

-- Trigger fires BEFORE DELETE so we still have access to OLD.artist_id
DROP TRIGGER IF EXISTS recompute_styles_on_image_delete ON portfolio_images;
CREATE TRIGGER recompute_styles_on_image_delete
  BEFORE DELETE ON portfolio_images
  FOR EACH ROW
  EXECUTE FUNCTION recompute_artist_styles_on_image_delete();

COMMENT ON FUNCTION recompute_artist_styles_on_image_delete() IS
  'Recomputes artist_style_profiles when an image is deleted to keep style badges accurate';
