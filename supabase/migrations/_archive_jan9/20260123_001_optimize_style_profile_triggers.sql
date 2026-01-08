-- Optimize: Style Profile Trigger Performance
--
-- Fixes from code review of 20260122_001_fix_style_profile_system.sql:
-- 1. N+1 trigger problem: Statement-level triggers instead of row-level (deduplicate artist recomputes)
-- 2. Cascade delete redundancy: Skip tag triggers when parent image is being deleted
-- 3. Missing UPDATE/DELETE triggers on image_style_tags
--
-- Uses PostgreSQL transition tables (REFERENCING NEW/OLD TABLE) for efficient batch processing

-- 1. Drop the old row-level trigger
DROP TRIGGER IF EXISTS trg_update_artist_styles_on_tag ON image_style_tags;

-- 2. Create unified trigger function for INSERT/UPDATE/DELETE with deduplication
CREATE OR REPLACE FUNCTION update_artist_styles_on_tag_change()
RETURNS TRIGGER AS $$
DECLARE
  v_artist_id uuid;
  v_affected_artists uuid[];
BEGIN
  -- Collect all unique artist IDs affected by this statement
  -- Uses transition tables (new_table for INSERT/UPDATE, old_table for UPDATE/DELETE)

  IF TG_OP = 'INSERT' THEN
    SELECT ARRAY_AGG(DISTINCT pi.artist_id) INTO v_affected_artists
    FROM new_table nt
    JOIN portfolio_images pi ON pi.id = nt.image_id
    WHERE pi.artist_id IS NOT NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    -- For UPDATE, we need to handle both old and new image_ids (in case image_id changed)
    SELECT ARRAY_AGG(DISTINCT pi.artist_id) INTO v_affected_artists
    FROM (
      SELECT image_id FROM new_table
      UNION
      SELECT image_id FROM old_table
    ) changed
    JOIN portfolio_images pi ON pi.id = changed.image_id
    WHERE pi.artist_id IS NOT NULL;

  ELSIF TG_OP = 'DELETE' THEN
    -- For DELETE, check if the parent image still exists (skip cascade scenarios)
    -- When portfolio_image is deleted, its tags cascade delete but the image delete trigger handles recompute
    SELECT ARRAY_AGG(DISTINCT pi.artist_id) INTO v_affected_artists
    FROM old_table ot
    JOIN portfolio_images pi ON pi.id = ot.image_id  -- Only if image still exists
    WHERE pi.artist_id IS NOT NULL;
  END IF;

  -- Recompute for each affected artist (deduplicated)
  IF v_affected_artists IS NOT NULL THEN
    FOREACH v_artist_id IN ARRAY v_affected_artists
    LOOP
      PERFORM recompute_artist_styles(v_artist_id);
    END LOOP;
  END IF;

  RETURN NULL;  -- Ignored for statement-level AFTER triggers
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_artist_styles_on_tag_change() IS
  'Statement-level trigger function: Efficiently updates artist_style_profiles for all affected artists in a single statement. Uses transition tables to deduplicate and handle INSERT/UPDATE/DELETE.';

-- 3. Create statement-level triggers with transition tables

-- INSERT trigger
DROP TRIGGER IF EXISTS trg_update_artist_styles_on_tag_insert ON image_style_tags;
CREATE TRIGGER trg_update_artist_styles_on_tag_insert
  AFTER INSERT ON image_style_tags
  REFERENCING NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_artist_styles_on_tag_change();

-- UPDATE trigger
DROP TRIGGER IF EXISTS trg_update_artist_styles_on_tag_update ON image_style_tags;
CREATE TRIGGER trg_update_artist_styles_on_tag_update
  AFTER UPDATE ON image_style_tags
  REFERENCING NEW TABLE AS new_table OLD TABLE AS old_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_artist_styles_on_tag_change();

-- DELETE trigger
DROP TRIGGER IF EXISTS trg_update_artist_styles_on_tag_delete ON image_style_tags;
CREATE TRIGGER trg_update_artist_styles_on_tag_delete
  AFTER DELETE ON image_style_tags
  REFERENCING OLD TABLE AS old_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_artist_styles_on_tag_change();

-- 4. Drop the old row-level function (no longer needed)
DROP FUNCTION IF EXISTS update_artist_styles_on_tag_insert();

-- 5. Add comments for documentation
COMMENT ON TRIGGER trg_update_artist_styles_on_tag_insert ON image_style_tags IS
  'Statement-level trigger: Recomputes artist_style_profiles when tags are inserted (deduplicated per artist).';

COMMENT ON TRIGGER trg_update_artist_styles_on_tag_update ON image_style_tags IS
  'Statement-level trigger: Recomputes artist_style_profiles when tags are updated.';

COMMENT ON TRIGGER trg_update_artist_styles_on_tag_delete ON image_style_tags IS
  'Statement-level trigger: Recomputes artist_style_profiles when tags are deleted (skips cascade from image delete).';
