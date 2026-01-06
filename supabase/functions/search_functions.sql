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
-- Last Updated: 2026-01-06
-- Features included:
--   - Multi-location support (artist_locations table is SINGLE SOURCE OF TRUTH)
--   - Pro/Featured ranking boosts (+0.05 / +0.02)
--   - Boosted score display (transparency)
--   - Location count for UI badges
--   - GDPR compliance via artists.is_gdpr_blocked column (fast!)
--   - CTE column aliasing (ri_, aa_, ba_ prefixes)
--   - NOTE: artists.city/state are DEPRECATED - use artist_locations only
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
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
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
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
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
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
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
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
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
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
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
-- UPDATED: Now includes legacy artists table for US artists
-- UPDATED: Only counts artists with active portfolio images
-- ============================================
DROP FUNCTION IF EXISTS get_regions_with_counts(text);

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
  IF is_gdpr_country(p_country_code) THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
  -- First get artists with active portfolio images
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    al.region as region,
    al.region as region_name,
    COUNT(DISTINCT al.artist_id)::bigint as artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  INNER JOIN artists_with_images awi ON awi.artist_id = a.id
  WHERE al.region IS NOT NULL
    AND al.country_code = UPPER(p_country_code)
    AND a.deleted_at IS NULL
  GROUP BY al.region
  HAVING COUNT(DISTINCT al.artist_id) >= 1
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.region ASC;
END;
$$;

COMMENT ON FUNCTION get_regions_with_counts IS
  'Returns regions/states within a country with artist counts. Only includes artists with active portfolio images. Uses artist_locations as single source of truth. Excludes GDPR countries.';


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
      AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
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
-- UPDATED: Now includes legacy artists table for US artists
-- UPDATED: Only counts artists with active portfolio images
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
  IF p_country_code IS NOT NULL AND is_gdpr_country(p_country_code) THEN
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
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
  -- First get artists with active portfolio images
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    al.city as city,
    al.region as region,
    al.country_code as country_code,
    COUNT(DISTINCT al.artist_id)::bigint AS artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  INNER JOIN artists_with_images awi ON awi.artist_id = a.id
  WHERE al.city IS NOT NULL
    AND a.deleted_at IS NULL
    AND (p_country_code IS NULL OR al.country_code = UPPER(p_country_code))
    AND (p_region IS NULL OR LOWER(al.region) = LOWER(p_region))
    -- Exclude GDPR countries
    AND NOT is_gdpr_country(al.country_code)
  GROUP BY al.city, al.region, al.country_code
  HAVING COUNT(DISTINCT al.artist_id) >= min_count
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$$;

COMMENT ON FUNCTION get_cities_with_counts IS
  'Returns cities with artist counts. Only includes artists with active portfolio images. Uses artist_locations as single source of truth. Excludes GDPR countries for compliance.';


-- ============================================
-- get_state_cities_with_counts
-- Get cities within a state with artist counts
-- UPDATED: Now includes legacy artists table for US artists
-- UPDATED: Only counts artists with active portfolio images
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
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
  -- First get artists with active portfolio images
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    al.city as city,
    COUNT(DISTINCT al.artist_id)::bigint as artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  INNER JOIN artists_with_images awi ON awi.artist_id = a.id
  WHERE LOWER(al.region) = LOWER(state_code)
    AND al.city IS NOT NULL
    AND a.deleted_at IS NULL
    AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
  GROUP BY al.city
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$$;

COMMENT ON FUNCTION get_state_cities_with_counts IS
  'Get cities within a state/region with artist counts. Only includes artists with active portfolio images. Uses artist_locations as single source of truth. Excludes GDPR artists for compliance.';


-- ============================================
-- get_top_artists_by_style
-- Get top artists ranked by style similarity
-- Used for marketing curation (admin panel)
-- ============================================
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
SECURITY INVOKER
AS $$
DECLARE
  style_embedding vector(768);
BEGIN
  -- Validate style_slug format (alphanumeric, hyphens only)
  IF p_style_slug IS NULL OR p_style_slug !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Invalid style_slug format. Use lowercase with hyphens.';
  END IF;

  -- Validate limit
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100.';
  END IF;

  -- Get the style seed embedding
  SELECT ss.embedding INTO style_embedding
  FROM style_seeds ss
  WHERE ss.style_name = p_style_slug;

  -- If style not found, return empty
  IF style_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Step 1: Vector search (uses index)
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
    LIMIT 500  -- Top 500 matching images
  ),
  -- Step 2: Get best image per artist
  best_per_artist AS (
    SELECT DISTINCT ON (ri.ri_artist_id)
      ri.ri_artist_id as ba_artist_id,
      ri.ri_similarity as ba_similarity,
      ri.ri_thumbnail_url as ba_image_url
    FROM ranked_images ri
    ORDER BY ri.ri_artist_id, ri.ri_similarity DESC
  ),
  -- Step 3: Join with artist data and locations, filter GDPR/deleted
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
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
  -- Final output: ranked by similarity
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

COMMENT ON FUNCTION get_top_artists_by_style IS
  'Returns top N artists ranked by similarity to a style seed. Used for marketing curation. Excludes GDPR/deleted artists.';


-- ============================================
-- GDPR Performance Index (on artists table)
-- ============================================
-- Note: The is_gdpr_blocked column and index are created by gdpr_setup.sql
-- This index makes the COALESCE(a.is_gdpr_blocked, FALSE) = FALSE check fast
CREATE INDEX IF NOT EXISTS idx_artists_not_gdpr_blocked
ON artists(id) WHERE is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL;


-- ============================================
-- get_artists_with_image_counts (Admin Function)
-- Paginated artist list with image counts for admin dashboard
-- UPDATED: Uses artist_locations instead of artists.city/state
-- ============================================
DROP FUNCTION IF EXISTS get_artists_with_image_counts(integer, integer, text, text, text, text, boolean, boolean, text, text);

CREATE OR REPLACE FUNCTION get_artists_with_image_counts(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_search text DEFAULT NULL,
  p_location_city text DEFAULT NULL,
  p_location_state text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_is_featured boolean DEFAULT NULL,
  p_has_images boolean DEFAULT NULL,
  p_sort_by text DEFAULT 'instagram_handle',
  p_sort_order text DEFAULT 'asc'
)
RETURNS TABLE (
  id uuid,
  name text,
  instagram_handle text,
  city text,
  state text,
  is_featured boolean,
  is_pro boolean,
  verification_status text,
  follower_count bigint,
  slug text,
  deleted_at timestamp with time zone,
  image_count bigint,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  -- NOTE: artist_locations is the SINGLE SOURCE OF TRUTH for location data
  WITH artist_images AS (
    SELECT
      a.id AS ai_id,
      a.name AS ai_name,
      a.instagram_handle AS ai_instagram_handle,
      COALESCE(al.city, '') AS ai_city,
      COALESCE(al.region, '') AS ai_state,
      a.is_featured AS ai_is_featured,
      a.is_pro AS ai_is_pro,
      a.verification_status::TEXT AS ai_verification_status,
      a.follower_count AS ai_follower_count,
      a.slug AS ai_slug,
      a.deleted_at AS ai_deleted_at,
      COUNT(pi.id) FILTER (WHERE pi.hidden = false) AS ai_image_count
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
    WHERE a.deleted_at IS NULL
      -- Search filter (name or Instagram handle)
      AND (
        p_search IS NULL
        OR a.name ILIKE '%' || p_search || '%'
        OR a.instagram_handle ILIKE '%' || p_search || '%'
      )
      -- Location filter (using artist_locations)
      AND (p_location_city IS NULL OR al.city = p_location_city)
      AND (p_location_state IS NULL OR al.region = p_location_state)
      -- Tier filter
      AND (
        p_tier IS NULL
        OR (p_tier = 'unclaimed' AND a.verification_status = 'unclaimed')
        OR (p_tier = 'free' AND a.verification_status = 'claimed' AND a.is_pro = false)
        OR (p_tier = 'pro' AND a.verification_status = 'claimed' AND a.is_pro = true)
      )
      -- Featured filter
      AND (p_is_featured IS NULL OR a.is_featured = p_is_featured)
    GROUP BY a.id, al.city, al.region
  )
  SELECT
    ai.ai_id,
    ai.ai_name,
    ai.ai_instagram_handle,
    ai.ai_city,
    ai.ai_state,
    ai.ai_is_featured,
    ai.ai_is_pro,
    ai.ai_verification_status,
    ai.ai_follower_count,
    ai.ai_slug,
    ai.ai_deleted_at,
    ai.ai_image_count,
    COUNT(*) OVER() AS total_count
  FROM artist_images ai
  WHERE
    -- Has images filter (applied after aggregation)
    p_has_images IS NULL
    OR (p_has_images = true AND ai.ai_image_count > 0)
    OR (p_has_images = false AND ai.ai_image_count = 0)
  ORDER BY
    CASE WHEN p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
        ELSE ai.ai_instagram_handle
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
        ELSE ai.ai_instagram_handle
      END
    END DESC NULLS LAST,
    -- Numeric sorts (image_count, is_featured)
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'image_count' THEN ai.ai_image_count END ASC NULLS LAST,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'image_count' THEN ai.ai_image_count END DESC NULLS LAST,
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'is_featured' THEN ai.ai_is_featured::int END ASC,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'is_featured' THEN ai.ai_is_featured::int END DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_artists_with_image_counts IS
  'Returns paginated artist list with image counts for admin dashboard. Uses artist_locations as single source of truth for location data.';


-- ============================================
-- CLEANUP: Remove legacy sync trigger
-- The sync_artist_to_locations trigger is no longer needed since:
-- 1. artist_locations is now the SINGLE SOURCE OF TRUTH
-- 2. Discovery scripts write directly to artist_locations
-- 3. artists.city/state columns will be dropped
-- ============================================
DROP TRIGGER IF EXISTS sync_artist_location_on_change ON artists;
DROP TRIGGER IF EXISTS sync_artist_location_on_insert ON artists;
DROP FUNCTION IF EXISTS sync_artist_to_locations();


-- ============================================
-- Performance Index for artist_locations joins
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artist_locations_artist_primary
ON artist_locations(artist_id) WHERE is_primary = TRUE;


-- ============================================
-- get_homepage_stats
-- Returns aggregate counts for homepage hero section
-- Single query, all counts in parallel subqueries
-- ============================================
CREATE OR REPLACE FUNCTION get_homepage_stats()
RETURNS TABLE (
  artist_count bigint,
  image_count bigint,
  city_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM artists WHERE deleted_at IS NULL)::bigint AS artist_count,
    (SELECT COUNT(*) FROM portfolio_images WHERE status = 'active')::bigint AS image_count,
    (SELECT COUNT(DISTINCT city) FROM artist_locations WHERE country_code = 'US')::bigint AS city_count;
END;
$$;

COMMENT ON FUNCTION get_homepage_stats IS
  'Returns aggregate counts (artists, images, cities) for homepage hero section. Single DB call with parallel subqueries.';


-- ============================================
-- classify_embedding_styles
-- Classify an embedding against all style seeds
-- Returns top N styles above confidence threshold
-- Used for style-weighted search
-- ============================================
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
  'Classifies an embedding against style seeds. Returns top N styles with confidence scores above threshold. Used for style-weighted search.';


-- ============================================
-- search_artists_with_style_boost
-- Vector search with style-weighted ranking
-- Boosts artists who specialize in detected query styles
-- Also boosts artists whose color profile matches query image
-- ============================================
DROP FUNCTION IF EXISTS search_artists_with_style_boost(vector, float, int, text, text, text, int, jsonb);
DROP FUNCTION IF EXISTS search_artists_with_style_boost(vector, float, int, text, text, text, int, jsonb, boolean);

CREATE OR REPLACE FUNCTION search_artists_with_style_boost(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  region_filter text DEFAULT NULL,
  country_filter text DEFAULT NULL,
  offset_param int DEFAULT 0,
  query_styles jsonb DEFAULT NULL,  -- [{"style_name": "geometric", "confidence": 0.85}, ...]
  is_color_query boolean DEFAULT NULL  -- TRUE = colorful query, FALSE = B&G query, NULL = unknown
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
  v_style_weight float := 0.15;  -- Max style boost contribution
  v_color_weight float := 0.10;  -- Max color boost contribution
BEGIN
  -- Check if we have style data to use (must be non-null array with elements)
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
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
  ),
  -- Step 5: Compute style boost per artist
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
  -- Step 5b: Compute color boost per artist
  -- Boost artists whose color profile matches the query image color
  artist_color_boost AS (
    SELECT
      fa.fa_id as acb_artist_id,
      CASE
        -- No color info: no boost
        WHEN is_color_query IS NULL THEN 0.0
        -- Color query + color-heavy artist (>=70% color): full boost
        WHEN is_color_query = TRUE AND acp.color_percentage >= 0.7 THEN v_color_weight
        -- Color query + mixed artist (30-70%): partial boost
        WHEN is_color_query = TRUE AND acp.color_percentage >= 0.3 THEN v_color_weight * 0.5
        -- B&G query + B&G-heavy artist (<=30% color): full boost
        WHEN is_color_query = FALSE AND acp.color_percentage <= 0.3 THEN v_color_weight
        -- B&G query + mixed artist (30-70%): partial boost
        WHEN is_color_query = FALSE AND acp.color_percentage <= 0.7 THEN v_color_weight * 0.5
        -- Mismatch: no boost
        ELSE 0.0
      END as acb_color_boost
    FROM filtered_artists fa
    LEFT JOIN artist_color_profiles acp ON acp.artist_id = fa.fa_id
  ),
  -- Step 6: Rank images within each filtered artist
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
  -- Step 7: Aggregate top 3 images per artist
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
  -- Step 8: Apply all boosts (Pro + Featured + Style + Color)
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
  -- Step 9: Total count
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  -- Step 10: Get location counts
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

COMMENT ON FUNCTION search_artists_with_style_boost IS
  'Vector search with style and color weighted ranking. Boosts artists who specialize in detected query styles and whose color profile matches query image. Returns style_boost and color_boost separately for transparency.';
