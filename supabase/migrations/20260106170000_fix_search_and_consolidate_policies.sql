-- ============================================================================
-- Migration: Fix Search Functions + Consolidate All Permissive Policies
-- Description:
--   1. Make search functions SECURITY DEFINER to bypass RLS (required for search)
--   2. Consolidate all "Service role full access" policies with user-specific policies
--      by making service role policies use TO service_role instead of auth.role() check
--   3. Remove duplicate indexes
-- Date: 2026-01-06
-- ============================================================================

-- ============================================================================
-- PART 1: FIX SEARCH FUNCTIONS - Add SECURITY DEFINER
-- ============================================================================
-- The search functions need SECURITY DEFINER because:
-- 1. They query portfolio_images which has RLS policies
-- 2. The "Public can read visible images" policy has a subquery that checks artists table
-- 3. Anonymous users calling these functions need to bypass RLS to see results

-- Update search_artists_by_embedding
DROP FUNCTION IF EXISTS search_artists_by_embedding(vector, float, int, text, text, text, int);

CREATE OR REPLACE FUNCTION search_artists_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  offset_param int DEFAULT 0
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
  is_verified boolean,
  is_pro boolean,
  is_featured boolean,
  similarity float,
  matching_images jsonb,
  location_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.instagram_url as ri_image_url,
      pi.storage_thumb_640 as ri_thumbnail_url,
      pi.likes_count as ri_likes_count,
      1 - (pi.embedding <=> query_embedding) as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 500
  ),
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
  filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id,
           a.name as fa_name,
           a.slug as fa_slug,
           al.city as fa_city,
           al.region as fa_region,
           al.country_code as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.instagram_url as fa_instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified,
           COALESCE(a.is_pro, FALSE) as fa_is_pro,
           COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM artists a
    INNER JOIN candidate_artists ca ON a.id = ca.ri_artist_id
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND (
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter))
        OR
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter)
         AND LOWER(al.region) = LOWER(region_filter))
        OR
        (city_filter IS NOT NULL
         AND LOWER(al.city) = LOWER(city_filter)
         AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
         AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
      )
  ),
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
  aggregated_artists AS (
    SELECT
      ari.ri_artist_id as aa_artist_id,
      MAX(ari.ri_similarity_score) as aa_best_similarity,
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
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.aa_best_similarity,
      aa.aa_matching_images,
      aa.aa_best_similarity
        + CASE WHEN fa.fa_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.fa_is_featured THEN 0.02 ELSE 0 END as ba_boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.fa_id = aa.aa_artist_id
  ),
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
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
    fa.fa_is_verified,
    fa.fa_is_pro,
    fa.fa_is_featured,
    ba.ba_boosted_score,
    ba.aa_matching_images,
    COALESCE(alc.loc_count, 1)::bigint as location_count
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.fa_id = ba.ba_artist_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.fa_id
  ORDER BY ba.ba_boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

-- Update search_artists_with_count
DROP FUNCTION IF EXISTS search_artists_with_count(vector, float, int, text, text, text, int);

CREATE OR REPLACE FUNCTION search_artists_with_count(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  offset_param int DEFAULT 0
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
  max_likes bigint,
  matching_images jsonb,
  total_count bigint,
  location_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.instagram_url as ri_image_url,
      pi.storage_thumb_640 as ri_thumbnail_url,
      pi.likes_count as ri_likes_count,
      1 - (pi.embedding <=> query_embedding) as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 500
  ),
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
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
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND (
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter))
        OR
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter)
         AND LOWER(al.region) = LOWER(region_filter))
        OR
        (city_filter IS NOT NULL
         AND LOWER(al.city) = LOWER(city_filter)
         AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
         AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
      )
  ),
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
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.aa_best_similarity,
      aa.aa_max_likes,
      aa.aa_matching_images,
      aa.aa_best_similarity
        + CASE WHEN fa.fa_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.fa_is_featured THEN 0.02 ELSE 0 END as ba_boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.fa_id = aa.aa_artist_id
  ),
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
  )
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

-- Update search_artists_with_style_boost
DROP FUNCTION IF EXISTS search_artists_with_style_boost(vector, float, int, text, text, text, int, jsonb, boolean);

CREATE OR REPLACE FUNCTION search_artists_with_style_boost(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  offset_param int DEFAULT 0,
  query_styles jsonb DEFAULT NULL,
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_styles boolean;
  v_style_weight float := 0.15;
  v_color_weight float := 0.10;
BEGIN
  v_has_styles := query_styles IS NOT NULL
    AND jsonb_typeof(query_styles) = 'array'
    AND jsonb_array_length(query_styles) > 0;

  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.instagram_url as ri_image_url,
      pi.storage_thumb_640 as ri_thumbnail_url,
      pi.likes_count as ri_likes_count,
      1 - (pi.embedding <=> query_embedding) as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 500
  ),
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
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
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND (
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter))
        OR
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter)
         AND LOWER(al.region) = LOWER(region_filter))
        OR
        (city_filter IS NOT NULL
         AND LOWER(al.city) = LOWER(city_filter)
         AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
         AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
      )
  ),
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
  artist_color_boost AS (
    SELECT
      fa.fa_id as acb_artist_id,
      CASE
        WHEN is_color_query IS NULL THEN 0.0
        WHEN is_color_query = TRUE AND acp.color_percentage >= 0.7 THEN v_color_weight
        WHEN is_color_query = TRUE AND acp.color_percentage >= 0.3 THEN v_color_weight * 0.5
        WHEN is_color_query = FALSE AND acp.color_percentage <= 0.3 THEN v_color_weight
        WHEN is_color_query = FALSE AND acp.color_percentage <= 0.7 THEN v_color_weight * 0.5
        ELSE 0.0
      END as acb_color_boost
    FROM filtered_artists fa
    LEFT JOIN artist_color_profiles acp ON acp.artist_id = fa.fa_id
  ),
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
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
  )
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

-- Update find_related_artists
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_avg_embedding vector(768);
BEGIN
  SELECT avg(embedding)::vector(768) INTO source_avg_embedding
  FROM portfolio_images
  WHERE portfolio_images.artist_id = source_artist_id
    AND status = 'active'
    AND embedding IS NOT NULL;

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
           a.profile_image_url as fa_profile_image_url,
           a.instagram_url as fa_instagram_url,
           a.shop_name as fa_shop_name,
           a.follower_count as fa_follower_count,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified
    FROM artists a
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.id != source_artist_id
      AND a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND (
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter))
        OR
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND al.country_code = UPPER(country_filter)
         AND LOWER(al.region) = LOWER(region_filter))
        OR
        (city_filter IS NOT NULL
         AND LOWER(al.city) = LOWER(city_filter)
         AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
         AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
      )
  ),
  artist_embeddings AS (
    SELECT
      fa.fa_id as ae_artist_id,
      avg(pi.embedding)::vector(768) as ae_avg_embedding
    FROM filtered_artists fa
    INNER JOIN portfolio_images pi ON pi.artist_id = fa.fa_id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
    GROUP BY fa.fa_id
  ),
  artist_location_counts AS (
    SELECT
      al.artist_id,
      COUNT(*) as loc_count
    FROM artist_locations al
    GROUP BY al.artist_id
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
    COALESCE(alc.loc_count, 1) as location_count
  FROM filtered_artists fa
  INNER JOIN artist_embeddings ae ON ae.ae_artist_id = fa.fa_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.fa_id
  ORDER BY ae.ae_avg_embedding <=> source_avg_embedding
  LIMIT match_count;
END;
$$;

-- Update get_top_artists_by_style
DROP FUNCTION IF EXISTS get_top_artists_by_style(text, int);

CREATE OR REPLACE FUNCTION get_top_artists_by_style(
  p_style_slug text,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  instagram_handle text,
  city text,
  state text,
  similarity_score float,
  best_image_url text,
  is_pro boolean,
  is_featured boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  style_embedding vector(768);
BEGIN
  IF p_style_slug IS NULL OR p_style_slug !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Invalid style_slug format. Use lowercase with hyphens.';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100.';
  END IF;

  SELECT ss.embedding INTO style_embedding
  FROM style_seeds ss
  WHERE ss.style_name = p_style_slug;

  IF style_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.storage_thumb_640 as ri_thumbnail_url,
      1 - (pi.embedding <=> style_embedding) as ri_similarity
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> style_embedding
    LIMIT 500
  ),
  best_per_artist AS (
    SELECT DISTINCT ON (ri.ri_artist_id)
      ri.ri_artist_id as ba_artist_id,
      ri.ri_similarity as ba_similarity,
      ri.ri_thumbnail_url as ba_image_url
    FROM ranked_images ri
    ORDER BY ri.ri_artist_id, ri.ri_similarity DESC
  ),
  filtered_artists AS (
    SELECT DISTINCT ON (bpa.ba_artist_id)
      bpa.ba_artist_id as fa_artist_id,
      a.name as fa_name,
      a.instagram_handle as fa_handle,
      al.city as fa_city,
      al.region as fa_state,
      bpa.ba_similarity as fa_similarity,
      bpa.ba_image_url as fa_image_url,
      COALESCE(a.is_pro, FALSE) as fa_is_pro,
      COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM best_per_artist bpa
    INNER JOIN artists a ON a.id = bpa.ba_artist_id
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
  )
  SELECT
    fa.fa_artist_id,
    fa.fa_name,
    fa.fa_handle,
    fa.fa_city,
    fa.fa_state,
    fa.fa_similarity,
    fa.fa_image_url,
    fa.fa_is_pro,
    fa.fa_is_featured
  FROM filtered_artists fa
  ORDER BY fa.fa_similarity DESC
  LIMIT p_limit;
END;
$$;

-- Update get_homepage_stats
DROP FUNCTION IF EXISTS get_homepage_stats();

CREATE OR REPLACE FUNCTION get_homepage_stats()
RETURNS TABLE (
  artist_count bigint,
  image_count bigint,
  city_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM artists WHERE deleted_at IS NULL)::bigint AS artist_count,
    (SELECT COUNT(*) FROM portfolio_images WHERE status = 'active')::bigint AS image_count,
    (SELECT COUNT(DISTINCT city) FROM artist_locations WHERE country_code = 'US')::bigint AS city_count;
END;
$$;

-- Update classify_embedding_styles
DROP FUNCTION IF EXISTS classify_embedding_styles(vector, int, float);

CREATE OR REPLACE FUNCTION classify_embedding_styles(
  p_embedding vector(768),
  p_max_styles INT DEFAULT 3,
  p_min_confidence FLOAT DEFAULT 0.25
)
RETURNS TABLE (
  style_name TEXT,
  confidence FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- PART 2: CONSOLIDATE PERMISSIVE POLICIES
-- ============================================================================
-- The issue is that "Service role full access" policies use auth.role() = 'service_role'
-- which applies to ALL roles and gets OR'd with user policies.
-- Fix: Make service role policies target only the service_role using TO clause,
-- OR make them RESTRICTIVE so they don't OR with other policies.
-- Best approach: Remove duplicate "Service role can X" policies and keep only
-- the "Service role full access" policies, but scope them properly.

-- ============================================================================
-- 2.1 ARTISTS TABLE - Remove duplicate service role policies
-- ============================================================================

-- Drop the redundant individual service role policies (keep only "full access")
DROP POLICY IF EXISTS "Service role can delete artists" ON artists;
DROP POLICY IF EXISTS "Service role can insert artists" ON artists;
DROP POLICY IF EXISTS "Service role can update artists" ON artists;

-- Recreate "Service role full access" to only apply TO service_role
DROP POLICY IF EXISTS "Service role full access to artists" ON artists;
CREATE POLICY "Service role full access to artists" ON artists
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.2 PORTFOLIO_IMAGES TABLE - Remove duplicate service role policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role can delete portfolio images" ON portfolio_images;
DROP POLICY IF EXISTS "Service role can insert portfolio images" ON portfolio_images;
DROP POLICY IF EXISTS "Service role can update portfolio images" ON portfolio_images;

DROP POLICY IF EXISTS "Service role full access to portfolio_images" ON portfolio_images;
CREATE POLICY "Service role full access to portfolio_images" ON portfolio_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.3 USERS TABLE - Fix service role policy
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to users" ON users;
CREATE POLICY "Service role full access to users" ON users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.4 ARTIST_ANALYTICS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to analytics" ON artist_analytics;
CREATE POLICY "Service role full access to analytics" ON artist_analytics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.5 PORTFOLIO_IMAGE_ANALYTICS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to image analytics" ON portfolio_image_analytics;
CREATE POLICY "Service role full access to image analytics" ON portfolio_image_analytics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.6 SEARCH_APPEARANCES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to search appearances" ON search_appearances;
CREATE POLICY "Service role full access to search appearances" ON search_appearances
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.7 INSTAGRAM_SYNC_LOG TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to sync logs" ON instagram_sync_log;
CREATE POLICY "Service role full access to sync logs" ON instagram_sync_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.8 ONBOARDING_SESSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Service role full access to onboarding sessions" ON onboarding_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.9 CLAIM_ATTEMPTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to claim attempts" ON claim_attempts;
CREATE POLICY "Service role full access to claim attempts" ON claim_attempts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.10 ARTIST_SUBSCRIPTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to subscriptions" ON artist_subscriptions;
CREATE POLICY "Service role full access to subscriptions" ON artist_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.11 STYLE_SEEDS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage style seeds" ON style_seeds;
CREATE POLICY "Service role can manage style seeds" ON style_seeds
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.12 IMAGE_STYLE_TAGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role manage style tags" ON image_style_tags;
CREATE POLICY "Service role manage style tags" ON image_style_tags
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.13 PROMO_CODES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to promo codes" ON promo_codes;
CREATE POLICY "Service role full access to promo codes" ON promo_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.14 DISCOVERY_QUERIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access" ON discovery_queries;
CREATE POLICY "Service role full access to discovery_queries" ON discovery_queries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.15 HASHTAG_MINING_RUNS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access on hashtag_mining_runs" ON hashtag_mining_runs;
CREATE POLICY "Service role full access to hashtag_mining_runs" ON hashtag_mining_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.16 FOLLOWER_MINING_RUNS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access on follower_mining_runs" ON follower_mining_runs;
CREATE POLICY "Service role full access to follower_mining_runs" ON follower_mining_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.17 MINING_CANDIDATES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access on mining_candidates" ON mining_candidates;
CREATE POLICY "Service role full access to mining_candidates" ON mining_candidates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.18 PIPELINE_RUNS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to pipeline_runs" ON pipeline_runs;
CREATE POLICY "Service role full access to pipeline_runs" ON pipeline_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2.19 SCRAPING_JOBS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to scraping_jobs" ON scraping_jobs;
CREATE POLICY "Service role full access to scraping_jobs" ON scraping_jobs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 3: FIX DUPLICATE INDEXES
-- ============================================================================

-- Drop duplicate indexes on artist_locations
DROP INDEX IF EXISTS idx_artist_locations_artist;
-- Keep idx_artist_locations_artist_id

DROP INDEX IF EXISTS idx_artist_locations_primary;
-- Keep idx_artist_locations_artist_primary

-- Drop duplicate index on instagram_sync_log
DROP INDEX IF EXISTS idx_sync_log_artist;
-- Keep idx_sync_log_artist_recent

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'Total RLS policies after consolidation: %', policy_count;
END $$;
