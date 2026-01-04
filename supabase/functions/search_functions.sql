-- ============================================================================
-- SEARCH FUNCTIONS - SINGLE SOURCE OF TRUTH
-- ============================================================================
-- This file contains ALL search-related SQL functions for the Inkdex platform.
--
-- IMPORTANT: When modifying search functions, ALWAYS edit this file.
-- DO NOT create new migration files that rewrite these functions.
--
-- To apply changes:
--   1. Edit this file
--   2. Run: npx supabase db push
--   OR run this file directly in Supabase SQL Editor
--
-- Last Updated: 2026-01-04
-- Features included:
--   - Multi-location support (artist_locations table)
--   - Pro/Featured ranking boosts (+0.05 / +0.02)
--   - Boosted score display (transparency)
--   - Location count for UI badges
--   - GDPR compliance via artists.is_gdpr_blocked column (fast!)
--   - CTE column aliasing (ri_, aa_, ba_ prefixes)
--
-- GDPR SETUP (run once in SQL Editor before using these functions):
--   See: supabase/functions/gdpr_setup.sql
-- ============================================================================

-- ============================================
-- search_artists_by_embedding
-- Main vector similarity search function
-- OPTIMIZED: Vector search FIRST, then filter artists
-- ============================================
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
AS $$
BEGIN
  RETURN QUERY
  -- Step 1: Vector search FIRST (uses index, fast)
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
    LIMIT 500  -- Get top 500 matching images, then filter artists
  ),
  -- Step 2: Filter to images above threshold
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  -- Step 3: Get unique artists from matching images
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
  -- Step 4: Filter artists (GDPR, deleted, location) - now only checking ~100 artists, not 15k
  filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id,
           a.name as fa_name,
           a.slug as fa_slug,
           COALESCE(al.city, a.city) as fa_city,
           COALESCE(al.region, a.state) as fa_region,
           COALESCE(al.country_code, 'US') as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.instagram_url as fa_instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified,
           COALESCE(a.is_pro, FALSE) as fa_is_pro,
           COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM artists a
    INNER JOIN candidate_artists ca ON a.id = ca.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND (
        -- No location filters: return all
        (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
        OR
        -- Country-only filter
        (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
         AND (al.country_code = UPPER(country_filter) OR (al.country_code IS NULL AND UPPER(country_filter) = 'US')))
        OR
        -- Country + Region filter
        (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
         AND (al.country_code = UPPER(country_filter) OR (al.country_code IS NULL AND UPPER(country_filter) = 'US'))
         AND (LOWER(al.region) = LOWER(region_filter) OR LOWER(a.state) = LOWER(region_filter)))
        OR
        -- City filter
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
  -- Step 5: Rank images within each filtered artist
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
  -- Step 6: Aggregate top 3 images per artist
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
  -- Step 7: Apply Pro/Featured boosts
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
  -- Step 8: Get location counts (only for final results)
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
  )
  -- Final output
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

COMMENT ON FUNCTION search_artists_by_embedding IS
  'Vector similarity search - OPTIMIZED to do vector search first, then filter. Returns boosted_score and location_count.';


-- ============================================
-- search_artists_with_count
-- Vector search with total count for pagination
-- OPTIMIZED: Vector search FIRST, then filter artists
-- ============================================
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
AS $$
BEGIN
  RETURN QUERY
  -- Step 1: Vector search FIRST (uses index, fast)
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
  -- Step 2: Filter to images above threshold
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  -- Step 3: Get unique artists from matching images
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
  -- Step 4: Filter artists (GDPR, deleted, location)
  filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id,
           a.name as fa_name,
           a.slug as fa_slug,
           COALESCE(al.city, a.city) as fa_city,
           COALESCE(al.region, a.state) as fa_region,
           COALESCE(al.country_code, 'US') as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.follower_count as fa_follower_count,
           a.shop_name as fa_shop_name,
           a.instagram_url as fa_instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified,
           COALESCE(a.is_pro, FALSE) as fa_is_pro,
           COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM artists a
    INNER JOIN candidate_artists ca ON a.id = ca.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
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
  -- Step 5: Rank images within each filtered artist
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
  -- Step 6: Aggregate top 3 images per artist
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
  -- Step 7: Apply Pro/Featured boosts
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
  -- Step 8: Total count
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  -- Step 9: Get location counts (only for final results)
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
  )
  -- Final output
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

COMMENT ON FUNCTION search_artists_with_count IS
  'Vector similarity search with count - OPTIMIZED to do vector search first, then filter. Returns boosted_score and location_count.';


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
           COALESCE(al.city, a.city) as fa_city,
           COALESCE(al.region, a.state) as fa_region,
           COALESCE(al.country_code, 'US') as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.instagram_url as fa_instagram_url,
           a.shop_name as fa_shop_name,
           a.follower_count as fa_follower_count,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.id != source_artist_id
      AND a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
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

COMMENT ON FUNCTION find_related_artists IS
  'Find artists with similar style based on average portfolio embedding. Excludes EU/GDPR artists for compliance.';


-- ============================================
-- get_regions_with_counts
-- Get regions/states with artist counts
-- ============================================
CREATE OR REPLACE FUNCTION get_regions_with_counts(p_country_code text DEFAULT 'US')
RETURNS TABLE (
  region text,
  region_name text,
  artist_count bigint
)
LANGUAGE plpgsql STABLE
SECURITY INVOKER
AS $$
BEGIN
  -- Validate country code format (2 letters only)
  IF p_country_code IS NULL OR p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
  END IF;

  -- Block GDPR countries entirely
  IF UPPER(p_country_code) IN (
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO',
    'GB', 'CH'
  ) THEN
    -- Return empty result for GDPR countries
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    al.region,
    al.region as region_name,
    COUNT(DISTINCT al.artist_id)::bigint as artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  WHERE al.region IS NOT NULL
    AND al.country_code = UPPER(p_country_code)
    AND a.deleted_at IS NULL
  GROUP BY al.region
  HAVING COUNT(DISTINCT al.artist_id) >= 1
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.region ASC;
END;
$$;

COMMENT ON FUNCTION get_regions_with_counts IS
  'Returns regions/states within a country with artist counts. Excludes GDPR countries.';


-- ============================================
-- get_countries_with_counts
-- Get countries with artist counts
-- ============================================
DROP FUNCTION IF EXISTS get_countries_with_counts();

CREATE OR REPLACE FUNCTION get_countries_with_counts()
RETURNS TABLE (
  country_code text,
  country_name text,
  artist_count bigint
)
LANGUAGE sql STABLE
SECURITY INVOKER
AS $$
  WITH country_counts AS (
    SELECT
      COALESCE(al.country_code, 'US') as code,
      COUNT(DISTINCT al.artist_id)::bigint as cnt
    FROM artist_locations al
    INNER JOIN artists a ON a.id = al.artist_id
    WHERE a.deleted_at IS NULL
      -- Exclude GDPR countries
      AND COALESCE(al.country_code, 'US') NOT IN (
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
        'IS', 'LI', 'NO',
        'GB', 'CH'
      )
    GROUP BY al.country_code
    HAVING COUNT(DISTINCT al.artist_id) >= 1
  )
  SELECT
    cc.code as country_code,
    COALESCE(
      (SELECT DISTINCT l.country_name FROM locations l WHERE l.country_code = cc.code LIMIT 1),
      cc.code
    ) as country_name,
    cc.cnt as artist_count
  FROM country_counts cc
  ORDER BY cc.cnt DESC;
$$;

COMMENT ON FUNCTION get_countries_with_counts IS
  'Returns countries with artist counts. Excludes GDPR countries for compliance.';


-- ============================================
-- get_cities_with_counts
-- Get cities with artist counts
-- ============================================
DROP FUNCTION IF EXISTS get_cities_with_counts(integer, text, text);

CREATE OR REPLACE FUNCTION get_cities_with_counts(
  min_count integer DEFAULT 5,
  p_country_code text DEFAULT NULL,
  p_region text DEFAULT NULL
)
RETURNS TABLE (
  city text,
  region text,
  country_code text,
  artist_count bigint
)
LANGUAGE plpgsql STABLE
SECURITY INVOKER
AS $$
BEGIN
  -- Validate country code format if provided (2 letters only)
  IF p_country_code IS NOT NULL AND p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
  END IF;

  -- Block GDPR countries entirely
  IF p_country_code IS NOT NULL AND UPPER(p_country_code) IN (
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO',
    'GB', 'CH'
  ) THEN
    -- Return empty result for GDPR countries
    RETURN;
  END IF;

  -- Validate region format if provided (alphanumeric, spaces, hyphens only)
  IF p_region IS NOT NULL AND p_region !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid region format.';
  END IF;

  -- Validate min_count is reasonable
  IF min_count < 0 OR min_count > 10000 THEN
    RAISE EXCEPTION 'Invalid min_count value.';
  END IF;

  RETURN QUERY
  SELECT
    al.city,
    al.region,
    al.country_code,
    COUNT(DISTINCT al.artist_id)::bigint AS artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  WHERE al.city IS NOT NULL
    AND a.deleted_at IS NULL
    AND (p_country_code IS NULL OR al.country_code = UPPER(p_country_code))
    AND (p_region IS NULL OR LOWER(al.region) = LOWER(p_region))
    -- Exclude GDPR countries
    AND al.country_code NOT IN (
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
      'IS', 'LI', 'NO',
      'GB', 'CH'
    )
  GROUP BY al.city, al.region, al.country_code
  HAVING COUNT(DISTINCT al.artist_id) >= min_count
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$$;

COMMENT ON FUNCTION get_cities_with_counts IS
  'Returns cities with artist counts. Excludes GDPR countries for compliance.';


-- ============================================
-- get_state_cities_with_counts
-- Get cities within a state with artist counts
-- ============================================
DROP FUNCTION IF EXISTS get_state_cities_with_counts(text);

CREATE OR REPLACE FUNCTION get_state_cities_with_counts(state_code text)
RETURNS TABLE (
  city text,
  artist_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  -- Validate state_code format (alphanumeric, spaces, hyphens only)
  IF state_code IS NULL OR state_code !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid state_code format.';
  END IF;

  RETURN QUERY
  SELECT
    al.city,
    COUNT(DISTINCT al.artist_id) as artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  WHERE al.region = state_code
    AND al.city IS NOT NULL
    AND a.deleted_at IS NULL
    AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
  GROUP BY al.city
  ORDER BY artist_count DESC, al.city ASC;
END;
$$;

COMMENT ON FUNCTION get_state_cities_with_counts IS
  'Get cities within a state/region with artist counts. Excludes GDPR artists for compliance.';


-- ============================================
-- GDPR Performance Index (on artists table)
-- ============================================
-- Note: The is_gdpr_blocked column and index are created by gdpr_setup.sql
-- This index makes the COALESCE(a.is_gdpr_blocked, FALSE) = FALSE check fast
CREATE INDEX IF NOT EXISTS idx_artists_not_gdpr_blocked
ON artists(id) WHERE is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL;
