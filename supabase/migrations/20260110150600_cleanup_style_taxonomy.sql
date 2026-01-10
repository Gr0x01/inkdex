-- ============================================================================
-- CLEANUP: Remove Legacy Style Tagging System
-- ============================================================================
-- This migration removes:
-- 1. compute_image_style_tags trigger - uses old CLIP seed logic, replaced by ML
-- 2. recompute_artist_styles_on_image_delete trigger - has hardcoded taxonomy bug
-- 3. taxonomy column from image_style_tags, artist_style_profiles, style_seeds
-- 4. style_taxonomy ENUM type
-- 5. Updates classify_embedding_styles() to remove taxonomy parameter
-- 6. Updates recompute_artist_styles() to remove taxonomy references
--
-- The ML classifier (lib/styles/predictor.ts) now handles all image tagging.
-- Statement-level triggers on image_style_tags handle profile recomputation.
-- ============================================================================

-- Step 1: Drop the CLIP-based auto-tagging trigger (replaced by ML classifier)
DROP TRIGGER IF EXISTS compute_image_style_tags_trigger ON portfolio_images;
DROP FUNCTION IF EXISTS compute_image_style_tags();

-- Step 2: Drop the buggy image delete trigger
-- The statement-level triggers on image_style_tags already handle profile recomputation
DROP TRIGGER IF EXISTS recompute_styles_on_image_delete ON portfolio_images;
DROP FUNCTION IF EXISTS recompute_artist_styles_on_image_delete();

-- Step 3: Update recompute_artist_styles() to remove taxonomy references
CREATE OR REPLACE FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  -- Delete existing profiles for this artist that won't be replaced
  DELETE FROM artist_style_profiles
  WHERE artist_id = p_artist_id
    AND style_name NOT IN (
      SELECT ist.style_name
      FROM image_style_tags ist
      JOIN portfolio_images pi ON pi.id = ist.image_id
      WHERE pi.artist_id = p_artist_id
        AND pi.status = 'active'
    );

  -- Upsert profiles (simplified - no taxonomy)
  INSERT INTO artist_style_profiles (artist_id, style_name, percentage, image_count)
  WITH artist_tags AS (
    SELECT
      ist.style_name,
      COUNT(*) as tag_count
    FROM image_style_tags ist
    JOIN portfolio_images pi ON pi.id = ist.image_id
    WHERE pi.artist_id = p_artist_id
      AND pi.status = 'active'
    GROUP BY ist.style_name
  ),
  total_count AS (
    SELECT SUM(tag_count) as total FROM artist_tags
  )
  SELECT
    p_artist_id,
    at.style_name,
    (at.tag_count::float / NULLIF(tc.total, 0) * 100) as percentage,
    at.tag_count as image_count
  FROM artist_tags at
  CROSS JOIN total_count tc
  ON CONFLICT (artist_id, style_name) DO UPDATE SET
    percentage = EXCLUDED.percentage,
    image_count = EXCLUDED.image_count,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") IS
  'Recomputes artist_style_profiles for a single artist. Uses UPSERT to handle concurrent executions safely.';

-- Step 4: Drop old classify_embedding_styles function signatures
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float, style_taxonomy);
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float);

-- Step 5: Recreate classify_embedding_styles without taxonomy parameter
CREATE OR REPLACE FUNCTION "public"."classify_embedding_styles"(
  "p_embedding" "public"."vector",
  "p_max_styles" integer DEFAULT 3,
  "p_min_confidence" double precision DEFAULT 0.35
)
RETURNS TABLE("style_name" "text", "confidence" double precision)
LANGUAGE "plpgsql" STABLE
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.style_name,
    (1 - (p_embedding <=> ss.embedding))::FLOAT as confidence
  FROM style_seeds ss
  WHERE ss.embedding IS NOT NULL
    AND (1 - (p_embedding <=> ss.embedding)) >= p_min_confidence
  ORDER BY p_embedding <=> ss.embedding ASC
  LIMIT p_max_styles;
END;
$$;

COMMENT ON FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer, "p_min_confidence" double precision) IS
  'Classifies an embedding against style seeds. Returns top N styles with confidence scores above threshold.';

-- Step 6: Remove taxonomy columns from tables
-- Note: Using IF EXISTS for idempotency
ALTER TABLE image_style_tags DROP COLUMN IF EXISTS taxonomy;
ALTER TABLE image_style_tags DROP COLUMN IF EXISTS is_primary;
ALTER TABLE artist_style_profiles DROP COLUMN IF EXISTS taxonomy;
ALTER TABLE style_seeds DROP COLUMN IF EXISTS taxonomy;

-- Step 7: Drop the style_taxonomy ENUM type
-- Must be done after columns are dropped
DROP TYPE IF EXISTS style_taxonomy;
