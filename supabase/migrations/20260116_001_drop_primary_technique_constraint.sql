-- ============================================================================
-- DROP PRIMARY TECHNIQUE CONSTRAINT
-- ============================================================================
-- The old tagging model forced ONE primary technique per image. We've moved to
-- a simpler 0-3 styles per image model without forced assignment.
-- This constraint was causing batch insert failures.
-- ============================================================================

DROP INDEX IF EXISTS idx_one_primary_technique;

COMMENT ON TABLE image_style_tags IS
  'Style tags for portfolio images. Each image can have 0-3 style tags based on CLIP embedding similarity to style seeds.';
