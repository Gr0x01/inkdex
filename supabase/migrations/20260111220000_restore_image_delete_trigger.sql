-- ============================================================================
-- RESTORE: Image Delete Trigger for Style Recomputation
-- ============================================================================
--
-- This migration restores the recompute_styles_on_image_delete trigger that was
-- incorrectly removed in migration 20260110150600_cleanup_style_taxonomy.sql.
--
-- PROBLEM: The cleanup migration assumed statement-level triggers on image_style_tags
-- would handle style recomputation when images are deleted. This is architecturally
-- flawed because:
--
--   1. DELETE FROM portfolio_images WHERE id = X
--   2. CASCADE delete removes image_style_tags rows
--   3. trg_update_artist_styles_on_tag_delete fires on image_style_tags
--   4. Trigger tries: JOIN portfolio_images pi ON pi.id = ot.image_id
--   5. JOIN returns EMPTY because image was already deleted in step 1
--   6. No artists found -> no recomputation -> profiles go stale
--
-- SOLUTION: Use BEFORE DELETE trigger on portfolio_images to capture artist_id
-- before the row is removed, then call recompute_artist_styles().
--
-- ============================================================================

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION recompute_artist_styles_on_image_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only recompute for active images with a valid artist
  -- Skip inactive images (already not contributing to profile)
  IF OLD.status = 'active' AND OLD.artist_id IS NOT NULL THEN
    -- Check that artist still exists (skip during cascade artist delete)
    IF EXISTS (SELECT 1 FROM artists WHERE id = OLD.artist_id AND deleted_at IS NULL) THEN
      PERFORM recompute_artist_styles(OLD.artist_id);
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION recompute_artist_styles_on_image_delete() IS
  'Trigger function: Recomputes artist_style_profiles when an active image is deleted. Skips during cascade artist deletes.';

-- Step 2: Create the BEFORE DELETE trigger
-- Must be BEFORE DELETE so we still have access to OLD.artist_id
DROP TRIGGER IF EXISTS recompute_styles_on_image_delete ON portfolio_images;

CREATE TRIGGER recompute_styles_on_image_delete
  BEFORE DELETE ON portfolio_images
  FOR EACH ROW
  EXECUTE FUNCTION recompute_artist_styles_on_image_delete();

COMMENT ON TRIGGER recompute_styles_on_image_delete ON portfolio_images IS
  'Recomputes artist style profiles before an image is deleted to keep style badges accurate.';
