-- Migration: Return boosted score for display consistency
-- Description: Fix Pro artist boosting display - return boosted_score instead of best_similarity
--              to ensure displayed percentages match ranking order
-- Date: 2026-01-04

-- ============================================
-- Update search_artists_by_embedding to return boosted_score
-- ============================================
DROP FUNCTION IF EXISTS search_artists_by_embedding CASCADE;

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
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug,
           COALESCE(al.city, a.city) as artist_city,
           COALESCE(al.region, a.state) as artist_region,
           COALESCE(al.country_code, 'US') as artist_country_code,
           a.profile_image_url,
           a.instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as artist_is_verified,
           COALESCE(a.is_pro, FALSE) as artist_is_pro,
           COALESCE(a.is_featured, FALSE) as artist_is_featured
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND (
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND (al.country_code = UPPER(country_filter) OR (al.country_code IS NULL AND UPPER(country_filter) = 'US')))
        OR
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND (al.country_code = UPPER(country_filter) OR (al.country_code IS NULL AND UPPER(country_filter) = 'US'))
         AND (LOWER(al.region) = LOWER(region_filter) OR LOWER(a.state) = LOWER(region_filter)))
        OR
        (city_filter IS NOT NULL
         AND (
           (LOWER(al.city) = LOWER(city_filter)
            AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
            AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
           OR
           (LOWER(a.city) = LOWER(city_filter)
            AND (country_filter IS NULL OR UPPER(country_filter) = 'US')
            AND (region_filter IS NULL OR LOWER(a.state) = LOWER(region_filter)))
         ))
      )
  ),
  ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as image_id,
      pi.instagram_url as image_url,
      pi.storage_thumb_640 as thumbnail_url,
      pi.likes_count,
      1 - (pi.embedding <=> query_embedding) as similarity_score,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY pi.embedding <=> query_embedding
      ) as rank_in_artist
    FROM portfolio_images pi
    INNER JOIN filtered_artists fa ON pi.artist_id = fa.id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
    ORDER BY pi.embedding <=> query_embedding
    LIMIT (match_count * 10)
  ),
  aggregated_artists AS (
    SELECT
      ri.ri_artist_id as aa_artist_id,
      MAX(ri.similarity_score) as best_similarity,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ri.image_id,
          'image_url', ri.image_url,
          'thumbnail_url', ri.thumbnail_url,
          'likes_count', ri.likes_count,
          'similarity', ROUND(ri.similarity_score::numeric, 3)
        )
        ORDER BY ri.similarity_score DESC
      ) FILTER (WHERE ri.rank_in_artist <= 3) as matching_images_json
    FROM ranked_images ri
    GROUP BY ri.ri_artist_id
  ),
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.best_similarity,
      aa.matching_images_json,
      fa.artist_is_pro,
      fa.artist_is_featured,
      aa.best_similarity
        + CASE WHEN fa.artist_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.artist_is_featured THEN 0.02 ELSE 0 END as boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.id = aa.aa_artist_id
  ),
  artist_location_counts AS (
    SELECT
      al.artist_id,
      COUNT(*) as loc_count
    FROM artist_locations al
    GROUP BY al.artist_id
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.artist_city,
    fa.artist_region,
    fa.artist_country_code,
    fa.profile_image_url,
    fa.instagram_url,
    fa.artist_is_verified,
    fa.artist_is_pro,
    fa.artist_is_featured,
    ba.boosted_score,
    ba.matching_images_json,
    COALESCE(alc.loc_count, 1) as location_count
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.id = ba.ba_artist_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.id
  ORDER BY ba.boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists_by_embedding IS
  'Vector similarity search with Pro/Featured ranking boosts. Returns boosted_score for display (raw similarity + boosts). Supports multi-location artists via artist_locations table. Returns location_count for UI badge display.';

-- ============================================
-- Update search_artists_with_count to return boosted_score
-- ============================================
-- Drop all versions of the function
DROP FUNCTION IF EXISTS search_artists_with_count CASCADE;

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
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug,
           COALESCE(al.city, a.city) as artist_city,
           COALESCE(al.region, a.state) as artist_region,
           COALESCE(al.country_code, 'US') as artist_country_code,
           a.profile_image_url,
           a.follower_count, a.shop_name, a.instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as artist_is_verified,
           COALESCE(a.is_pro, FALSE) as artist_is_pro,
           COALESCE(a.is_featured, FALSE) as artist_is_featured
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND (
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND (al.country_code = UPPER(country_filter) OR (al.country_code IS NULL AND UPPER(country_filter) = 'US')))
        OR
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND (al.country_code = UPPER(country_filter) OR (al.country_code IS NULL AND UPPER(country_filter) = 'US'))
         AND (LOWER(al.region) = LOWER(region_filter) OR LOWER(a.state) = LOWER(region_filter)))
        OR
        (city_filter IS NOT NULL
         AND (
           (LOWER(al.city) = LOWER(city_filter)
            AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
            AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
           OR
           (LOWER(a.city) = LOWER(city_filter)
            AND (country_filter IS NULL OR UPPER(country_filter) = 'US')
            AND (region_filter IS NULL OR LOWER(a.state) = LOWER(region_filter)))
         ))
      )
  ),
  ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as image_id,
      pi.instagram_url as image_url,
      pi.storage_thumb_640 as thumbnail_url,
      pi.likes_count,
      1 - (pi.embedding <=> query_embedding) as similarity_score,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY pi.embedding <=> query_embedding
      ) as rank_in_artist
    FROM portfolio_images pi
    INNER JOIN filtered_artists fa ON pi.artist_id = fa.id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
    ORDER BY pi.embedding <=> query_embedding
    LIMIT (match_count * 10)
  ),
  aggregated_artists AS (
    SELECT
      ri.ri_artist_id as aa_artist_id,
      MAX(ri.similarity_score) as best_similarity,
      MAX(COALESCE(ri.likes_count, 0))::bigint as aa_max_likes,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ri.image_id,
          'image_url', ri.image_url,
          'thumbnail_url', ri.thumbnail_url,
          'likes_count', ri.likes_count,
          'similarity', ROUND(ri.similarity_score::numeric, 3)
        )
        ORDER BY ri.similarity_score DESC
      ) FILTER (WHERE ri.rank_in_artist <= 3) as matching_images_json
    FROM ranked_images ri
    GROUP BY ri.ri_artist_id
  ),
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.best_similarity,
      aa.aa_max_likes,
      aa.matching_images_json,
      fa.artist_is_pro,
      fa.artist_is_featured,
      aa.best_similarity
        + CASE WHEN fa.artist_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.artist_is_featured THEN 0.02 ELSE 0 END as boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.id = aa.aa_artist_id
  ),
  total AS (
    SELECT COUNT(DISTINCT aa.aa_artist_id) as cnt FROM aggregated_artists aa
  ),
  artist_location_counts AS (
    -- Count locations for each artist
    SELECT
      al.artist_id,
      COUNT(*) as loc_count
    FROM artist_locations al
    GROUP BY al.artist_id
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.artist_city,
    fa.artist_region,
    fa.artist_country_code,
    fa.profile_image_url,
    fa.follower_count,
    fa.shop_name,
    fa.instagram_url,
    fa.artist_is_verified,
    fa.artist_is_pro,
    fa.artist_is_featured,
    ba.boosted_score,
    ba.aa_max_likes,
    ba.matching_images_json,
    (SELECT cnt FROM total),
    COALESCE(alc.loc_count, 1) as location_count
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.id = ba.ba_artist_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.id
  ORDER BY ba.boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists_with_count IS
  'Vector similarity search with count and Pro/Featured ranking boosts. Returns boosted_score for display (raw similarity + boosts). Supports multi-location artists. Returns location_count for UI badge display.';
