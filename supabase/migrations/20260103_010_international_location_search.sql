-- International Location Search Support
-- Updates search functions to support country_code filtering in addition to city/region
-- Enables cascading location filter: Country → Region → City
--
-- DEPRECATION NOTE: This migration uses COALESCE fallbacks to the legacy artists table
-- columns (a.city, a.state) for backward compatibility during transition:
--   - COALESCE(al.city, a.city)
--   - COALESCE(al.region, a.state)
--   - COALESCE(al.country_code, 'US')
--
-- TODO: Once all artists have been migrated to artist_locations table:
-- 1. Remove COALESCE fallbacks and use artist_locations directly
-- 2. Drop legacy city/state columns from artists table
-- 3. Update these functions to use INNER JOIN instead of LEFT JOIN
-- Target: After data migration script populates artist_locations for all artists

-- ============================================
-- Update search_artists_by_embedding for international
-- ============================================
DROP FUNCTION IF EXISTS search_artists_by_embedding(vector, float, int, text, int);

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
  matching_images jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    -- Apply location filters using artist_locations table
    -- Supports: country only, country+region, or country+region+city
    --
    -- PERFORMANCE: The nested OR conditions may produce suboptimal query plans.
    -- After deploying, verify performance with:
    --   EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    --   SELECT * FROM search_artists_by_embedding(
    --     '[0.1, 0.2, ...]'::vector,  -- test embedding
    --     0.5,                         -- threshold
    --     20,                          -- limit
    --     NULL,                        -- city
    --     'TX',                        -- region
    --     'US',                        -- country
    --     0                            -- offset
    --   );
    -- Target: <100ms for country+region filter with 50k artists
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug,
           COALESCE(al.city, a.city) as city,
           COALESCE(al.region, a.state) as region,
           COALESCE(al.country_code, 'US') as country_code,
           a.profile_image_url,
           a.instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as is_verified,
           COALESCE(a.is_pro, FALSE) as is_pro,
           COALESCE(a.is_featured, FALSE) as is_featured
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND (
        -- No filters: return all artists
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
        -- Country + Region + City filter (or just city for backward compat)
        (city_filter IS NOT NULL
         AND (
           -- Check artist_locations
           (LOWER(al.city) = LOWER(city_filter)
            AND (country_filter IS NULL OR al.country_code = UPPER(country_filter))
            AND (region_filter IS NULL OR LOWER(al.region) = LOWER(region_filter)))
           OR
           -- Fallback to artists table for backward compatibility
           (LOWER(a.city) = LOWER(city_filter)
            AND (country_filter IS NULL OR UPPER(country_filter) = 'US')
            AND (region_filter IS NULL OR LOWER(a.state) = LOWER(region_filter)))
         ))
      )
  ),
  ranked_images AS (
    -- Find matching images with similarity scores
    SELECT
      pi.artist_id,
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
      ri.artist_id,
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
    GROUP BY ri.artist_id
  ),
  boosted_artists AS (
    SELECT
      aa.artist_id,
      aa.best_similarity,
      aa.matching_images_json,
      fa.is_pro,
      fa.is_featured,
      aa.best_similarity
        + CASE WHEN fa.is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.is_featured THEN 0.02 ELSE 0 END as boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.id = aa.artist_id
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
    fa.region,
    fa.country_code,
    fa.profile_image_url,
    fa.instagram_url,
    fa.is_verified,
    fa.is_pro,
    fa.is_featured,
    ba.best_similarity,
    ba.matching_images_json
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.id = ba.artist_id
  ORDER BY ba.boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists_by_embedding IS
  'Vector similarity search with international location filtering. Supports country, region, and city filters.';

-- ============================================
-- Update search_artists_with_count for international
-- ============================================
DROP FUNCTION IF EXISTS search_artists_with_count(vector, float, int, text, int);

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
  total_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug,
           COALESCE(al.city, a.city) as city,
           COALESCE(al.region, a.state) as region,
           COALESCE(al.country_code, 'US') as country_code,
           a.profile_image_url,
           a.follower_count, a.shop_name, a.instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as is_verified,
           COALESCE(a.is_pro, FALSE) as is_pro,
           COALESCE(a.is_featured, FALSE) as is_featured
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
      pi.artist_id,
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
      ri.artist_id,
      MAX(ri.similarity_score) as best_similarity,
      MAX(COALESCE(ri.likes_count, 0)) as max_likes,
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
    GROUP BY ri.artist_id
  ),
  boosted_artists AS (
    SELECT
      aa.artist_id,
      aa.best_similarity,
      aa.max_likes,
      aa.matching_images_json,
      fa.is_pro,
      fa.is_featured,
      aa.best_similarity
        + CASE WHEN fa.is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.is_featured THEN 0.02 ELSE 0 END as boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.id = aa.artist_id
  ),
  total AS (
    SELECT COUNT(DISTINCT aa.artist_id) as cnt FROM aggregated_artists aa
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
    fa.region,
    fa.country_code,
    fa.profile_image_url,
    fa.follower_count,
    fa.shop_name,
    fa.instagram_url,
    fa.is_verified,
    fa.is_pro,
    fa.is_featured,
    ba.best_similarity,
    ba.max_likes,
    ba.matching_images_json,
    (SELECT cnt FROM total)
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.id = ba.artist_id
  ORDER BY ba.boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists_with_count IS
  'Vector similarity search with count and international location filtering.';

-- ============================================
-- Get regions with artist counts (for cascading dropdown)
-- Input validation: Only accepts 2-letter country codes
-- ============================================
CREATE OR REPLACE FUNCTION get_regions_with_counts(p_country_code text DEFAULT 'US')
RETURNS TABLE (
  region text,
  region_name text,
  artist_count bigint
)
LANGUAGE plpgsql STABLE
SECURITY INVOKER  -- Use INVOKER for RLS compliance
AS $$
BEGIN
  -- Validate country code format (2 letters only)
  IF p_country_code IS NULL OR p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
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

GRANT EXECUTE ON FUNCTION get_regions_with_counts(text) TO authenticated, anon;

COMMENT ON FUNCTION get_regions_with_counts IS
  'Returns regions/states within a country with artist counts. Validates country code format.';

-- ============================================
-- Get countries with artist counts and names
-- Returns both code and name in a single query to avoid round-trips
-- ============================================
DROP FUNCTION IF EXISTS get_countries_with_counts();

CREATE OR REPLACE FUNCTION get_countries_with_counts()
RETURNS TABLE (
  country_code text,
  country_name text,
  artist_count bigint
)
LANGUAGE sql STABLE
SECURITY INVOKER  -- Use INVOKER for RLS compliance
AS $$
  WITH country_counts AS (
    SELECT
      COALESCE(al.country_code, 'US') as code,
      COUNT(DISTINCT al.artist_id)::bigint as cnt
    FROM artist_locations al
    INNER JOIN artists a ON a.id = al.artist_id
    WHERE a.deleted_at IS NULL
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

GRANT EXECUTE ON FUNCTION get_countries_with_counts() TO authenticated, anon;

COMMENT ON FUNCTION get_countries_with_counts IS
  'Returns countries with artist counts and names in a single query. For country dropdown in location filter.';

-- ============================================
-- Update get_cities_with_counts for international
-- Input validation for country code and region
-- ============================================
DROP FUNCTION IF EXISTS get_cities_with_counts(integer);

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
SECURITY INVOKER  -- Use INVOKER for RLS compliance
AS $$
BEGIN
  -- Validate country code format if provided (2 letters only)
  IF p_country_code IS NOT NULL AND p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
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
  GROUP BY al.city, al.region, al.country_code
  HAVING COUNT(DISTINCT al.artist_id) >= min_count
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cities_with_counts(integer, text, text) TO authenticated, anon;

COMMENT ON FUNCTION get_cities_with_counts IS
  'Returns cities with artist counts. Validates input parameters.';

-- ============================================
-- Update find_related_artists for international
-- ============================================
DROP FUNCTION IF EXISTS find_related_artists(uuid, text, int);

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
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  avg_embedding vector(768);
BEGIN
  SELECT avg(embedding)::vector(768) INTO avg_embedding
  FROM portfolio_images
  WHERE portfolio_images.artist_id = source_artist_id
    AND status = 'active'
    AND embedding IS NOT NULL;

  IF avg_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug,
           COALESCE(al.city, a.city) as city,
           COALESCE(al.region, a.state) as region,
           COALESCE(al.country_code, 'US') as country_code,
           a.profile_image_url,
           a.instagram_url, a.shop_name, a.follower_count,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as is_verified
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id
    WHERE a.id != source_artist_id
      AND a.deleted_at IS NULL
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
      fa.id as artist_id,
      avg(pi.embedding)::vector(768) as avg_embedding
    FROM filtered_artists fa
    INNER JOIN portfolio_images pi ON pi.artist_id = fa.id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
    GROUP BY fa.id
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
    fa.region,
    fa.country_code,
    fa.profile_image_url,
    fa.instagram_url,
    fa.shop_name,
    fa.is_verified,
    fa.follower_count,
    (1 - (ae.avg_embedding <=> avg_embedding))::float as similarity
  FROM filtered_artists fa
  INNER JOIN artist_embeddings ae ON ae.artist_id = fa.id
  ORDER BY ae.avg_embedding <=> avg_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION find_related_artists IS
  'Find artists with similar style. Supports international location filtering.';

-- ============================================
-- Add indexes for international location filtering
-- ============================================

-- Index on artist_locations for country filtering
CREATE INDEX IF NOT EXISTS idx_artist_locations_country
ON artist_locations(country_code);

-- Index on artist_locations for region filtering (within country)
CREATE INDEX IF NOT EXISTS idx_artist_locations_country_region
ON artist_locations(country_code, region);

-- Index on artist_locations for full location filtering
CREATE INDEX IF NOT EXISTS idx_artist_locations_country_region_city
ON artist_locations(country_code, region, city);

-- Lower case index for case-insensitive city matching
CREATE INDEX IF NOT EXISTS idx_artist_locations_city_lower
ON artist_locations(LOWER(city));

-- Lower case index for case-insensitive region matching
CREATE INDEX IF NOT EXISTS idx_artist_locations_region_lower
ON artist_locations(LOWER(region));

-- Index on artist_id for JOIN operations with artists table
CREATE INDEX IF NOT EXISTS idx_artist_locations_artist_id
ON artist_locations(artist_id);

COMMENT ON INDEX idx_artist_locations_artist_id IS
  'Optimizes JOINs between artist_locations and artists tables';

COMMENT ON INDEX idx_artist_locations_country IS
  'Optimizes country-only location filtering';

COMMENT ON INDEX idx_artist_locations_country_region IS
  'Optimizes country+region location filtering';

COMMENT ON INDEX idx_artist_locations_country_region_city IS
  'Optimizes full location filtering (country+region+city)';
