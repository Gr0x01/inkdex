-- ============================================================================
-- MULTI-AXIS STYLE TAXONOMY
-- ============================================================================
-- Introduces separate axes for style classification:
--   - Palette: Color vs Black & Gray (already implemented via is_color)
--   - Technique: HOW the tattoo is done (ONE per image, threshold 0.35)
--   - Theme: WHAT the tattoo depicts (0-2 per image, threshold 0.45)
--
-- This fixes over-representation issues (e.g., horror matching normal B&G portraits)
-- by separating the artistic technique from the subject matter.
-- ============================================================================

-- Create taxonomy enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'style_taxonomy') THEN
    CREATE TYPE style_taxonomy AS ENUM ('technique', 'theme');
  END IF;
END$$;

-- ============================================
-- style_seeds: Add taxonomy column
-- ============================================
ALTER TABLE style_seeds
  ADD COLUMN IF NOT EXISTS taxonomy style_taxonomy DEFAULT 'technique';

-- ============================================
-- image_style_tags: Add taxonomy and is_primary columns
-- ============================================
ALTER TABLE image_style_tags
  ADD COLUMN IF NOT EXISTS taxonomy style_taxonomy DEFAULT 'technique',
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

-- ============================================
-- artist_style_profiles: Add taxonomy column
-- ============================================
ALTER TABLE artist_style_profiles
  ADD COLUMN IF NOT EXISTS taxonomy style_taxonomy DEFAULT 'technique';

-- ============================================
-- Constraint: Only ONE primary technique per image
-- ============================================
-- Drop existing index if it exists (in case of re-run)
DROP INDEX IF EXISTS idx_one_primary_technique;

-- Create partial unique index ensuring only one primary technique per image
CREATE UNIQUE INDEX idx_one_primary_technique
  ON image_style_tags (image_id)
  WHERE taxonomy = 'technique' AND is_primary = true;

-- ============================================
-- Classify existing style seeds
-- ============================================
-- Mark technique seeds (artistic styles - HOW it's done)
UPDATE style_seeds SET taxonomy = 'technique'
WHERE style_name IN (
  'realism',
  'traditional',
  'neo-traditional',
  'new-school',
  'blackwork',
  'fine-line',
  'dotwork',
  'watercolor',
  'tribal',
  'biomechanical',
  'trash-polka',
  'sketch',
  'ornamental',
  'geometric'
);

-- Mark theme seeds (subject matter - WHAT it depicts)
UPDATE style_seeds SET taxonomy = 'theme'
WHERE style_name IN (
  'horror',
  'japanese',
  'anime',
  'surrealism'
);

-- Remove deprecated/redundant styles that don't fit cleanly
-- (these are either merged into techniques or too vague)
-- Note: 'black-and-gray' is now handled by is_color boolean
-- Note: 'minimalist' is merged into 'fine-line'
-- Note: 'illustrative' was too vague - use specific techniques instead
-- Note: 'stick-and-poke' is a method, not a style visible in final result
DELETE FROM style_seeds
WHERE style_name IN (
  'black-and-gray',
  'minimalist',
  'illustrative',
  'stick-and-poke',
  'lettering'
);

-- ============================================
-- Update classify_embedding_styles to support taxonomy filtering
-- ============================================
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float);
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float, style_taxonomy);

CREATE OR REPLACE FUNCTION classify_embedding_styles(
  p_embedding vector(768),
  p_max_styles int DEFAULT 3,
  p_min_confidence float DEFAULT 0.35,
  p_taxonomy style_taxonomy DEFAULT NULL
)
RETURNS TABLE (
  style_name text,
  confidence float,
  taxonomy style_taxonomy
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.style_name,
    (1 - (p_embedding <=> ss.embedding))::FLOAT as confidence,
    ss.taxonomy
  FROM style_seeds ss
  WHERE ss.embedding IS NOT NULL
    AND (1 - (p_embedding <=> ss.embedding)) >= p_min_confidence
    AND (p_taxonomy IS NULL OR ss.taxonomy = p_taxonomy)
  ORDER BY p_embedding <=> ss.embedding ASC
  LIMIT p_max_styles;
END;
$$;

COMMENT ON FUNCTION classify_embedding_styles IS
  'Classifies an embedding against style seeds. Optionally filter by taxonomy (technique/theme). Returns top N styles with confidence scores above threshold.';

-- ============================================
-- Update search_artists to use separate technique/theme boosts
-- ============================================
DROP FUNCTION IF EXISTS search_artists(vector, float, int, text, text, text, int, jsonb, boolean);

CREATE OR REPLACE FUNCTION search_artists(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  offset_param int DEFAULT 0,
  query_techniques jsonb DEFAULT NULL,  -- Renamed from query_styles
  is_color_query boolean DEFAULT NULL,
  query_themes jsonb DEFAULT NULL       -- NEW: separate themes parameter
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
  region text,
  country_code text,
  profile_image_url text,
  follower_count int,
  shop_name text,
  instagram_url text,
  is_verified boolean,
  is_pro boolean,
  is_featured boolean,
  similarity float,
  style_boost float,    -- Now represents technique_boost
  color_boost float,
  theme_boost float,    -- NEW: separate theme boost
  boosted_score float,
  max_likes bigint,
  matching_images jsonb,
  total_count bigint,
  location_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_techniques boolean;
  v_has_themes boolean;
  v_technique_weight float := 0.20;  -- Increased from 0.15 - primary match
  v_theme_weight float := 0.10;       -- Secondary boost
  v_color_weight float := 0.10;
BEGIN
  v_has_techniques := query_techniques IS NOT NULL
    AND jsonb_typeof(query_techniques) = 'array'
    AND jsonb_array_length(query_techniques) > 0;

  v_has_themes := query_themes IS NOT NULL
    AND jsonb_typeof(query_themes) = 'array'
    AND jsonb_array_length(query_themes) > 0;

  RETURN QUERY
  -- Step 1: Vector search FIRST (uses index, fast)
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.instagram_url as ri_image_url,
      pi.storage_thumb_640 as ri_thumbnail_url,
      pi.likes_count as ri_likes_count,
      pi.is_color as ri_is_color,
      1 - (pi.embedding <=> query_embedding) as ri_base_similarity,
      -- Color boost at image level
      (1 - (pi.embedding <=> query_embedding)) +
        CASE
          WHEN is_color_query IS NULL THEN 0.0
          WHEN is_color_query = pi.is_color THEN v_color_weight * 0.5
          ELSE 0.0
        END as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 2000
  ),
  -- Step 2: Filter by threshold
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_base_similarity >= match_threshold
  ),
  -- Step 3: Get candidate artist IDs
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
  -- Step 4: Filter artists (GDPR, location, deleted)
  filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id,
           a.name as fa_name,
           a.slug as fa_slug,
           al.city as fa_city,
           al.region as fa_region,
           al.country_code as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.follower_count as fa_follower_count,
           a.shop_name as fa_shop_name,
           a.instagram_url as fa_instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified,
           COALESCE(a.is_pro, FALSE) as fa_is_pro,
           COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM artists a
    INNER JOIN candidate_artists ca ON a.id = ca.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
  ),
  -- Step 5: Calculate TECHNIQUE boost per artist
  artist_technique_boost AS (
    SELECT
      fa.fa_id as atb_artist_id,
      CASE WHEN v_has_techniques THEN
        COALESCE(
          (
            SELECT SUM(
              (qt.confidence::float) * (asp.percentage / 100.0) * v_technique_weight
            )
            FROM jsonb_to_recordset(query_techniques) AS qt(style_name text, confidence float)
            INNER JOIN artist_style_profiles asp
              ON asp.artist_id = fa.fa_id
              AND asp.style_name = qt.style_name
              AND asp.taxonomy = 'technique'
          ),
          0.0
        )
      ELSE 0.0
      END as atb_technique_boost
    FROM filtered_artists fa
  ),
  -- Step 6: Calculate THEME boost per artist (NEW)
  artist_theme_boost AS (
    SELECT
      fa.fa_id as athb_artist_id,
      CASE WHEN v_has_themes THEN
        COALESCE(
          (
            SELECT SUM(
              (qt.confidence::float) * (asp.percentage / 100.0) * v_theme_weight
            )
            FROM jsonb_to_recordset(query_themes) AS qt(style_name text, confidence float)
            INNER JOIN artist_style_profiles asp
              ON asp.artist_id = fa.fa_id
              AND asp.style_name = qt.style_name
              AND asp.taxonomy = 'theme'
          ),
          0.0
        )
      ELSE 0.0
      END as athb_theme_boost
    FROM filtered_artists fa
  ),
  -- Step 7: Calculate color boost per artist (aggregated from image-level)
  artist_color_boost AS (
    SELECT
      ti.ri_artist_id as acb_artist_id,
      CASE
        WHEN is_color_query IS NULL THEN 0.0
        ELSE AVG(
          CASE WHEN is_color_query = ti.ri_is_color THEN v_color_weight * 0.5 ELSE 0.0 END
        )
      END as acb_color_boost
    FROM threshold_images ti
    GROUP BY ti.ri_artist_id
  ),
  -- Step 8: Rank images per artist (top 3)
  artist_ranked_images AS (
    SELECT
      ti.*,
      ROW_NUMBER() OVER (
        PARTITION BY ti.ri_artist_id
        ORDER BY ti.ri_similarity_score DESC
      ) as rank_in_artist
    FROM threshold_images ti
    INNER JOIN filtered_artists fa ON ti.ri_artist_id = fa.fa_id
  ),
  -- Step 9: Aggregate per artist
  aggregated_artists AS (
    SELECT
      ari.ri_artist_id as aa_artist_id,
      MAX(ari.ri_similarity_score) as aa_best_similarity,
      MAX(COALESCE(ari.ri_likes_count, 0))::bigint as aa_max_likes,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ari.ri_image_id,
          'image_url', ari.ri_image_url,
          'thumbnail_url', ari.ri_thumbnail_url,
          'likes_count', ari.ri_likes_count,
          'similarity', ROUND(ari.ri_similarity_score::numeric, 3)
        )
        ORDER BY ari.ri_similarity_score DESC
      ) FILTER (WHERE ari.rank_in_artist <= 3) as aa_matching_images
    FROM artist_ranked_images ari
    GROUP BY ari.ri_artist_id
  ),
  -- Step 10: Apply all boosts (pro, featured, technique, theme, color)
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.aa_best_similarity,
      aa.aa_max_likes,
      aa.aa_matching_images,
      COALESCE(atb.atb_technique_boost, 0.0)::float as ba_technique_boost,
      COALESCE(athb.athb_theme_boost, 0.0)::float as ba_theme_boost,
      COALESCE(acb.acb_color_boost, 0.0)::float as ba_color_boost,
      aa.aa_best_similarity
        + CASE WHEN fa.fa_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.fa_is_featured THEN 0.02 ELSE 0 END
        + COALESCE(atb.atb_technique_boost, 0.0)
        + COALESCE(athb.athb_theme_boost, 0.0)
        + COALESCE(acb.acb_color_boost, 0.0) as ba_boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.fa_id = aa.aa_artist_id
    LEFT JOIN artist_technique_boost atb ON atb.atb_artist_id = aa.aa_artist_id
    LEFT JOIN artist_theme_boost athb ON athb.athb_artist_id = aa.aa_artist_id
    LEFT JOIN artist_color_boost acb ON acb.acb_artist_id = aa.aa_artist_id
  ),
  -- Step 11: Total count for pagination
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  -- Step 12: Location counts per artist
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
  )
  -- Final SELECT
  SELECT
    fa.fa_id,
    fa.fa_name,
    fa.fa_slug,
    fa.fa_city,
    fa.fa_region,
    fa.fa_country_code,
    fa.fa_profile_image_url,
    fa.fa_follower_count,
    fa.fa_shop_name,
    fa.fa_instagram_url,
    fa.fa_is_verified,
    fa.fa_is_pro,
    fa.fa_is_featured,
    ba.aa_best_similarity,
    ba.ba_technique_boost,       -- style_boost now = technique_boost
    ba.ba_color_boost,
    ba.ba_theme_boost,           -- NEW column
    ba.ba_boosted_score,
    ba.aa_max_likes,
    ba.aa_matching_images,
    (SELECT cnt FROM total),
    COALESCE(alc.loc_count, 1)::bigint as location_count
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.fa_id = ba.ba_artist_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.fa_id
  ORDER BY ba.ba_boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists IS
  'Unified vector similarity search with technique + theme + color boosts. Techniques (0.20 weight) match artistic style, themes (0.10 weight) match subject matter.';

-- ============================================
-- Update compute_image_style_tags trigger for multi-axis
-- ============================================
DROP FUNCTION IF EXISTS compute_image_style_tags() CASCADE;

CREATE OR REPLACE FUNCTION compute_image_style_tags()
RETURNS TRIGGER AS $$
DECLARE
  technique_record RECORD;
  theme_record RECORD;
  v_technique_threshold float := 0.35;
  v_theme_threshold float := 0.45;  -- Tighter threshold for themes
  v_theme_count int := 0;
BEGIN
  -- Only process if embedding is set
  IF NEW.embedding IS NULL THEN
    RETURN NEW;
  END IF;

  -- Delete existing tags for this image
  DELETE FROM image_style_tags WHERE image_id = NEW.id;

  -- Step 1: Find ONE best technique (exclusive, lower threshold)
  SELECT style_name, (1 - (NEW.embedding <=> embedding)) as similarity
  INTO technique_record
  FROM style_seeds
  WHERE taxonomy = 'technique' AND embedding IS NOT NULL
  ORDER BY NEW.embedding <=> embedding ASC
  LIMIT 1;

  IF technique_record IS NOT NULL AND technique_record.similarity >= v_technique_threshold THEN
    INSERT INTO image_style_tags
      (image_id, style_name, confidence, taxonomy, is_primary)
    VALUES
      (NEW.id, technique_record.style_name, technique_record.similarity,
       'technique', true);
  END IF;

  -- Step 2: Find top 2 themes (higher threshold to reduce false positives)
  FOR theme_record IN (
    SELECT style_name, (1 - (NEW.embedding <=> embedding)) as similarity
    FROM style_seeds
    WHERE taxonomy = 'theme' AND embedding IS NOT NULL
      AND (1 - (NEW.embedding <=> embedding)) >= v_theme_threshold
    ORDER BY NEW.embedding <=> embedding ASC
    LIMIT 2
  ) LOOP
    INSERT INTO image_style_tags
      (image_id, style_name, confidence, taxonomy, is_primary)
    VALUES
      (NEW.id, theme_record.style_name, theme_record.similarity,
       'theme', false);
    v_theme_count := v_theme_count + 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS compute_image_style_tags_trigger ON portfolio_images;

CREATE TRIGGER compute_image_style_tags_trigger
  AFTER INSERT OR UPDATE OF embedding ON portfolio_images
  FOR EACH ROW
  EXECUTE FUNCTION compute_image_style_tags();

COMMENT ON FUNCTION compute_image_style_tags IS
  'Auto-tags images with ONE technique (threshold 0.35) and up to 2 themes (threshold 0.45). Themes have higher threshold to reduce false positives like horror matching normal portraits.';
