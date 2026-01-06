-- ============================================================================
-- DROP artist_color_profiles TABLE
-- ============================================================================
-- Color boosting now happens at the image level using portfolio_images.is_color
-- directly in the search function. No need for artist-level aggregation table.
--
-- The search function now:
-- 1. Adds is_color to ranked_images CTE
-- 2. Boosts images where is_color matches the query color
-- 3. Aggregates the boost per artist from matching images
-- ============================================================================

-- Drop the table (CASCADE will drop any dependent objects including policies)
DROP TABLE IF EXISTS artist_color_profiles CASCADE;
