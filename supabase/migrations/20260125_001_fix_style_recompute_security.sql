-- Fix: Make style recompute trigger run as SECURITY DEFINER
-- The trigger needs to INSERT into artist_style_profiles which has RLS enabled
-- Without SECURITY DEFINER, the trigger runs with caller's permissions and gets blocked

CREATE OR REPLACE FUNCTION recompute_artist_styles_on_image_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

COMMENT ON FUNCTION recompute_artist_styles_on_image_delete() IS
  'Recomputes artist_style_profiles when an image is deleted. Runs as SECURITY DEFINER to bypass RLS.';
