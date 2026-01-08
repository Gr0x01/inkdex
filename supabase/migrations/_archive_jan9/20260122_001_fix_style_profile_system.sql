-- Fix: Artist Style Profile System
--
-- Problems fixed:
-- 1. Delete trigger used wrong calculation (count/images instead of count/tags-per-taxonomy)
-- 2. Delete trigger hardcoded taxonomy='technique' instead of reading actual value
-- 3. No trigger existed to populate artist_style_profiles when image_style_tags are inserted
--
-- Solution:
-- 1. Create shared recompute_artist_styles(artist_id) function with correct logic
-- 2. Update delete trigger to use shared function
-- 3. Add INSERT trigger on image_style_tags to populate artist_style_profiles

-- 1. Create/replace shared recompute function with correct per-taxonomy percentages
CREATE OR REPLACE FUNCTION recompute_artist_styles(p_artist_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete existing profiles for this artist
  DELETE FROM artist_style_profiles WHERE artist_id = p_artist_id;

  -- Recompute with per-taxonomy percentages (matching compute-artist-profiles.ts logic)
  -- Percentages are calculated WITHIN each taxonomy (techniques sum to 100%, themes sum to 100%)
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
  JOIN taxonomy_totals tt ON tt.taxonomy = at.taxonomy;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recompute_artist_styles(uuid) IS
  'Recomputes artist_style_profiles for a single artist with correct per-taxonomy percentage calculation.';

-- 2. Update delete trigger to use shared function
CREATE OR REPLACE FUNCTION recompute_artist_styles_on_image_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if artist is being deleted (prevents FK violation during cascade delete)
  IF NOT EXISTS (SELECT 1 FROM artists WHERE id = OLD.artist_id) THEN
    RETURN OLD;
  END IF;

  PERFORM recompute_artist_styles(OLD.artist_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recompute_artist_styles_on_image_delete() IS
  'Trigger function: Recomputes artist_style_profiles when a portfolio_image is deleted.';

-- 3. NEW: Trigger function for image_style_tags INSERT
CREATE OR REPLACE FUNCTION update_artist_styles_on_tag_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_artist_id uuid;
BEGIN
  -- Get artist_id from the image
  SELECT pi.artist_id INTO v_artist_id
  FROM portfolio_images pi
  WHERE pi.id = NEW.image_id;

  IF v_artist_id IS NOT NULL THEN
    PERFORM recompute_artist_styles(v_artist_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_artist_styles_on_tag_insert() IS
  'Trigger function: Updates artist_style_profiles when a new image_style_tag is inserted.';

-- 4. Create the trigger on image_style_tags
DROP TRIGGER IF EXISTS trg_update_artist_styles_on_tag ON image_style_tags;
CREATE TRIGGER trg_update_artist_styles_on_tag
  AFTER INSERT ON image_style_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_styles_on_tag_insert();

COMMENT ON TRIGGER trg_update_artist_styles_on_tag ON image_style_tags IS
  'Automatically updates artist_style_profiles when style tags are added to images.';
