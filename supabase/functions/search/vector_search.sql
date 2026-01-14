-- ============================================================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================================================
-- Main vector similarity search functions for artist discovery.
-- Depends on: _shared/gdpr.sql, _shared/location_filter.sql
--
-- Functions:
--   - search_artists: Unified vector search with style + color boosts
--   - find_related_artists: Find similar artists by portfolio
--   - classify_embedding_styles: Classify embedding against style seeds
--   - get_search_location_counts: Location counts for filter UI
--
-- Updated Jan 2026: Simplified (removed multi-axis taxonomy, ML classifier handles tagging)
-- ============================================================================

-- ============================================
-- search_artists
-- Unified vector similarity search function with style + color boosts
-- ============================================
-- OPTIMIZED: Vector search FIRST (uses index), then filter artists
--
-- Parameters:
--   query_embedding: 768-dim CLIP embedding
--   match_threshold: Minimum similarity score (default 0.5)
--   match_count: Max results to return (default 20)
--   city_filter/region_filter/country_filter: Location filters (optional)
--   offset_param: Pagination offset (default 0)
--   query_styles: JSONB array of {style_name, confidence} for style boost (optional)
--   is_color_query: true=color, false=B&G, null=no preference (optional)
--
-- Returns: style_boost, color_boost, boosted_score, total_count
-- ============================================
DROP FUNCTION IF EXISTS search_artists(vector, float, int, text, text, text, int, jsonb, boolean);
DROP FUNCTION IF EXISTS search_artists(vector, float, int, text, text, text, int, jsonb, boolean, jsonb);
DROP FUNCTION IF EXISTS search_artists_with_style_boost(vector, float, int, text, text, text, int, jsonb, boolean);
DROP FUNCTION IF EXISTS search_artists_with_style_boost(vector, float, int, text, text, text, int, jsonb);
DROP FUNCTION IF EXISTS search_artists_by_embedding(vector, float, int, text, text, text, int);
DROP FUNCTION IF EXISTS search_artists_with_count(vector, float, int, text, text, text, int);

CREATE OR REPLACE FUNCTION search_artists(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  offset_param int DEFAULT 0,
  query_styles jsonb DEFAULT NULL,      -- Simplified: single styles array
  is_color_query boolean DEFAULT NULL
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
  style_boost float,
  color_boost float,
  boosted_score float,
  max_likes bigint,
  matching_images jsonb,
  total_count bigint,
  location_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_styles boolean;
  v_style_weight float := 0.20;
  v_color_weight float := 0.10;
BEGIN
  v_has_styles := query_styles IS NOT NULL
    AND jsonb_typeof(query_styles) = 'array'
    AND jsonb_array_length(query_styles) > 0;

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
      AND COALESCE(pi.is_tattoo, TRUE) = TRUE
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
  -- Step 4: Filter artists (GDPR, location, deleted, blacklisted)
  filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id,
           a.name as fa_name,
           a.slug as fa_slug,
           al.city as fa_city,
           al.region as fa_region,
           al.country_code as fa_country_code,
           -- Use storage paths (preferred) with fallback to legacy CDN URL
           COALESCE(a.profile_storage_thumb_640, a.profile_storage_thumb_320, a.profile_storage_path, a.profile_image_url) as fa_profile_image_url,
           a.follower_count as fa_follower_count,
           a.shop_name as fa_shop_name,
           a.instagram_url as fa_instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified,
           COALESCE(a.is_pro, FALSE) as fa_is_pro,
           COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM artists a
    INNER JOIN candidate_artists ca ON a.id = ca.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN artist_pipeline_state aps ON aps.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND COALESCE(aps.scraping_blacklisted, FALSE) = FALSE  -- Exclude blacklisted artists
      AND (
        COALESCE(a.is_gdpr_blocked, FALSE) = FALSE  -- is_gdpr_blocked=FALSE means whitelisted
        OR a.claimed_by_user_id IS NOT NULL  -- Claimed = implicit consent
      )
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
  ),
  -- Step 5: Calculate style boost per artist (simplified - no taxonomy)
  artist_style_boost AS (
    SELECT
      fa.fa_id as asb_artist_id,
      CASE WHEN v_has_styles THEN
        COALESCE(
          (
            SELECT SUM(
              (qs.confidence::float) * (asp.percentage / 100.0) * v_style_weight
            )
            FROM jsonb_to_recordset(query_styles) AS qs(style_name text, confidence float)
            INNER JOIN artist_style_profiles asp
              ON asp.artist_id = fa.fa_id
              AND asp.style_name = qs.style_name
          ),
          0.0
        )
      ELSE 0.0
      END as asb_style_boost
    FROM filtered_artists fa
  ),
  -- Step 6: Calculate color boost per artist (aggregated from image-level)
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
  -- Step 9: Apply all boosts (pro, featured, style, color)
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.aa_best_similarity,
      aa.aa_max_likes,
      aa.aa_matching_images,
      COALESCE(asb.asb_style_boost, 0.0)::float as ba_style_boost,
      COALESCE(acb.acb_color_boost, 0.0)::float as ba_color_boost,
      aa.aa_best_similarity
        + CASE WHEN fa.fa_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.fa_is_featured THEN 0.02 ELSE 0 END
        + COALESCE(asb.asb_style_boost, 0.0)
        + COALESCE(acb.acb_color_boost, 0.0) as ba_boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.fa_id = aa.aa_artist_id
    LEFT JOIN artist_style_boost asb ON asb.asb_artist_id = aa.aa_artist_id
    LEFT JOIN artist_color_boost acb ON acb.acb_artist_id = aa.aa_artist_id
  ),
  -- Step 10: Total count for pagination
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  -- Step 11: Location counts per artist
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
    ba.ba_style_boost,
    ba.ba_color_boost,
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
  'Unified vector similarity search with style + color boosts. Style boost (0.20 weight) matches against artist_style_profiles.';


-- ============================================
-- find_related_artists
-- Find similar artists based on portfolio style
-- ============================================
DROP FUNCTION IF EXISTS find_related_artists(uuid, text, text, text, int);

CREATE OR REPLACE FUNCTION find_related_artists(
  source_artist_id uuid,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
  region text,
  country_code text,
  profile_image_url text,
  instagram_url text,
  shop_name text,
  is_verified boolean,
  follower_count int,
  similarity float,
  location_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  source_avg_embedding vector(768);
BEGIN
  -- Get average embedding for source artist
  SELECT avg(embedding)::vector(768) INTO source_avg_embedding
  FROM portfolio_images
  WHERE portfolio_images.artist_id = source_artist_id
    AND status = 'active'
    AND embedding IS NOT NULL
    AND COALESCE(is_tattoo, TRUE) = TRUE;

  IF source_avg_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id, a.name as fa_name, a.slug as fa_slug,
           al.city as fa_city,
           al.region as fa_region,
           al.country_code as fa_country_code,
           -- Use storage paths (preferred) with fallback to legacy CDN URL
           COALESCE(a.profile_storage_thumb_640, a.profile_storage_thumb_320, a.profile_storage_path, a.profile_image_url) as fa_profile_image_url,
           a.instagram_url as fa_instagram_url,
           a.shop_name as fa_shop_name,
           a.follower_count as fa_follower_count,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN artist_pipeline_state aps ON aps.artist_id = a.id
    WHERE a.id != source_artist_id
      AND a.deleted_at IS NULL
      AND COALESCE(aps.scraping_blacklisted, FALSE) = FALSE  -- Exclude blacklisted artists
      AND (
        COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
        OR a.claimed_by_user_id IS NOT NULL
      )
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
  ),
  artist_embeddings AS (
    SELECT
      fa.fa_id as ae_artist_id,
      avg(pi.embedding)::vector(768) as ae_avg_embedding
    FROM filtered_artists fa
    INNER JOIN portfolio_images pi ON pi.artist_id = fa.fa_id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.is_tattoo, TRUE) = TRUE
    GROUP BY fa.fa_id
  )
  SELECT
    fa.fa_id,
    fa.fa_name,
    fa.fa_slug,
    fa.fa_city,
    fa.fa_region,
    fa.fa_country_code,
    fa.fa_profile_image_url,
    fa.fa_instagram_url,
    fa.fa_shop_name,
    fa.fa_is_verified,
    fa.fa_follower_count,
    (1 - (ae.ae_avg_embedding <=> source_avg_embedding))::float as similarity,
    -- Inline subquery: only counts locations for the few returned artists, not all 16k
    COALESCE((SELECT COUNT(*) FROM artist_locations al WHERE al.artist_id = fa.fa_id), 1) as location_count
  FROM filtered_artists fa
  INNER JOIN artist_embeddings ae ON ae.ae_artist_id = fa.fa_id
  ORDER BY ae.ae_avg_embedding <=> source_avg_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION find_related_artists IS
  'Find artists with similar style based on average portfolio embedding. Excludes EU/GDPR artists for compliance.';


-- ============================================
-- classify_embedding_styles
-- Classify an embedding against style seeds
-- ============================================
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float);
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float, style_taxonomy);

CREATE OR REPLACE FUNCTION classify_embedding_styles(
  p_embedding vector(768),
  p_max_styles int DEFAULT 3,
  p_min_confidence float DEFAULT 0.35
)
RETURNS TABLE (
  style_name text,
  confidence float
)
LANGUAGE plpgsql STABLE
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

COMMENT ON FUNCTION classify_embedding_styles IS
  'Classifies an embedding against style seeds. Returns top N styles with confidence scores above threshold.';


-- ============================================
-- get_search_location_counts
-- Get location counts filtered by search embedding
-- Returns only locations that have matching artists
-- ============================================
DROP FUNCTION IF EXISTS get_search_location_counts(vector, float);

CREATE OR REPLACE FUNCTION get_search_location_counts(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.15
)
RETURNS TABLE (
  location_type text,
  country_code text,
  region text,
  city text,
  artist_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Step 1: Vector search to find matching images (same as main search)
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      1 - (pi.embedding <=> query_embedding) as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
      AND COALESCE(pi.is_tattoo, TRUE) = TRUE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 2000
  ),
  threshold_images AS (
    SELECT DISTINCT ri_artist_id
    FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  -- Step 2: Get matching artists with their primary locations
  matching_artists AS (
    SELECT DISTINCT
      a.id as artist_id,
      al.country_code as al_country_code,
      al.region as al_region,
      al.city as al_city
    FROM artists a
    INNER JOIN threshold_images ti ON a.id = ti.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN artist_pipeline_state aps ON aps.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND COALESCE(aps.scraping_blacklisted, FALSE) = FALSE  -- Exclude blacklisted artists
      AND (
        COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
        OR a.claimed_by_user_id IS NOT NULL
      )
  ),
  -- Step 3: Aggregate by country
  country_counts AS (
    SELECT
      'country'::text as loc_type,
      ma.al_country_code,
      NULL::text as loc_region,
      NULL::text as loc_city,
      COUNT(DISTINCT ma.artist_id) as cnt
    FROM matching_artists ma
    WHERE ma.al_country_code IS NOT NULL
    GROUP BY ma.al_country_code
  ),
  -- Step 4: Aggregate by region (only US for now)
  region_counts AS (
    SELECT
      'region'::text as loc_type,
      ma.al_country_code,
      ma.al_region as loc_region,
      NULL::text as loc_city,
      COUNT(DISTINCT ma.artist_id) as cnt
    FROM matching_artists ma
    WHERE ma.al_country_code = 'US'
      AND ma.al_region IS NOT NULL
    GROUP BY ma.al_country_code, ma.al_region
  ),
  -- Step 5: Aggregate by city
  city_counts AS (
    SELECT
      'city'::text as loc_type,
      ma.al_country_code,
      ma.al_region as loc_region,
      ma.al_city as loc_city,
      COUNT(DISTINCT ma.artist_id) as cnt
    FROM matching_artists ma
    WHERE ma.al_city IS NOT NULL
    GROUP BY ma.al_country_code, ma.al_region, ma.al_city
  )
  -- Combine all location types
  SELECT loc_type, al_country_code, loc_region, loc_city, cnt
  FROM country_counts
  UNION ALL
  SELECT loc_type, al_country_code, loc_region, loc_city, cnt
  FROM region_counts
  UNION ALL
  SELECT loc_type, al_country_code, loc_region, loc_city, cnt
  FROM city_counts
  ORDER BY cnt DESC;
END;
$$;

COMMENT ON FUNCTION get_search_location_counts IS
  'Returns location counts filtered by search embedding. Only includes locations with matching artists.';
