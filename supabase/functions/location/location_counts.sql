-- ============================================================================
-- LOCATION COUNT FUNCTIONS
-- ============================================================================
-- Functions for getting artist counts by geographic area.
--
-- Functions:
--   - get_regions_with_counts: Regions/states with artist counts
--   - get_countries_with_counts: Countries with artist counts
--   - get_cities_with_counts: Cities with artist counts
--   - get_state_cities_with_counts: Cities within a state
-- ============================================================================

-- ============================================
-- get_regions_with_counts
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
  IF p_country_code IS NULL OR p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
      AND COALESCE(pi.is_tattoo, TRUE) = TRUE
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
  'Returns regions/states within a country with artist counts.';


-- ============================================
-- get_countries_with_counts
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
  'Returns countries with artist counts.';


-- ============================================
-- get_cities_with_counts
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
  IF p_country_code IS NOT NULL AND p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
  END IF;

  IF p_region IS NOT NULL AND p_region !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid region format.';
  END IF;

  IF min_count < 0 OR min_count > 10000 THEN
    RAISE EXCEPTION 'Invalid min_count value.';
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
      AND COALESCE(pi.is_tattoo, TRUE) = TRUE
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
  GROUP BY al.city, al.region, al.country_code
  HAVING COUNT(DISTINCT al.artist_id) >= min_count
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$$;

COMMENT ON FUNCTION get_cities_with_counts IS
  'Returns cities with artist counts.';


-- ============================================
-- get_state_cities_with_counts
-- ============================================
DROP FUNCTION IF EXISTS get_state_cities_with_counts(text);

CREATE OR REPLACE FUNCTION get_state_cities_with_counts(state_code text)
RETURNS TABLE (
  city text,
  artist_count bigint
)
LANGUAGE plpgsql STABLE
SECURITY INVOKER
AS $$
BEGIN
  IF state_code IS NULL OR state_code !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid state_code format.';
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
      AND COALESCE(pi.is_tattoo, TRUE) = TRUE
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
  GROUP BY al.city
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$$;

COMMENT ON FUNCTION get_state_cities_with_counts IS
  'Get cities within a state/region with artist counts.';


-- ============================================
-- get_location_counts (unified function)
-- ============================================
-- This is the primary function used by the app.
-- Consolidates regions, countries, cities, state_cities, all_cities queries.
DROP FUNCTION IF EXISTS get_location_counts(text, text, text, text, int);

CREATE OR REPLACE FUNCTION get_location_counts(
    p_grouping text,
    p_country_code text DEFAULT NULL,
    p_region text DEFAULT NULL,
    p_state_code text DEFAULT NULL,
    p_min_count int DEFAULT 1
)
RETURNS TABLE (
    location_code text,
    display_name text,
    region_code text,
    country_code text,
    artist_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
    -- Validate grouping type
    IF p_grouping NOT IN ('regions', 'countries', 'cities', 'state_cities', 'all_cities') THEN
        RAISE EXCEPTION 'Invalid grouping type: %. Must be one of: regions, countries, cities, state_cities, all_cities', p_grouping;
    END IF;

    -- Validate country code format
    IF p_country_code IS NOT NULL AND p_country_code !~ '^[A-Za-z]{2}$' THEN
        RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
    END IF;

    -- Validate min_count
    IF p_min_count < 0 OR p_min_count > 10000 THEN
        RAISE EXCEPTION 'Invalid min_count value. Must be between 0 and 10000.';
    END IF;

    -- Handle each grouping type with appropriate GROUP BY
    IF p_grouping = 'regions' THEN
        RETURN QUERY
        SELECT
            al.region::text AS location_code,
            al.region::text AS display_name,
            al.region::text AS region_code,
            al.country_code::text AS country_code,
            COUNT(DISTINCT al.artist_id)::bigint AS artist_count
        FROM artist_locations al
        INNER JOIN artists a ON a.id = al.artist_id
        INNER JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active' AND pi.storage_thumb_640 IS NOT NULL
        WHERE a.deleted_at IS NULL
          AND al.country_code = UPPER(COALESCE(p_country_code, 'US'))
          AND al.region IS NOT NULL
        GROUP BY al.region, al.country_code
        HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
        ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.region ASC;

    ELSIF p_grouping = 'countries' THEN
        RETURN QUERY
        SELECT
            al.country_code::text AS location_code,
            al.country_code::text AS display_name,
            NULL::text AS region_code,
            al.country_code::text AS country_code,
            COUNT(DISTINCT al.artist_id)::bigint AS artist_count
        FROM artist_locations al
        INNER JOIN artists a ON a.id = al.artist_id
        INNER JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active' AND pi.storage_thumb_640 IS NOT NULL
        WHERE a.deleted_at IS NULL
        GROUP BY al.country_code
        HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
        ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.country_code ASC;

    ELSIF p_grouping = 'cities' THEN
        RETURN QUERY
        SELECT
            lower(replace(al.city, ' ', '-'))::text AS location_code,
            al.city::text AS display_name,
            al.region::text AS region_code,
            al.country_code::text AS country_code,
            COUNT(DISTINCT al.artist_id)::bigint AS artist_count
        FROM artist_locations al
        INNER JOIN artists a ON a.id = al.artist_id
        INNER JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active' AND pi.storage_thumb_640 IS NOT NULL
        WHERE a.deleted_at IS NULL
          AND (p_country_code IS NULL OR al.country_code = UPPER(p_country_code))
          AND (p_region IS NULL OR LOWER(al.region) = LOWER(p_region))
          AND al.city IS NOT NULL
        GROUP BY al.city, al.region, al.country_code
        HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
        ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;

    ELSIF p_grouping = 'state_cities' THEN
        RETURN QUERY
        SELECT
            lower(replace(al.city, ' ', '-'))::text AS location_code,
            al.city::text AS display_name,
            al.region::text AS region_code,
            al.country_code::text AS country_code,
            COUNT(DISTINCT al.artist_id)::bigint AS artist_count
        FROM artist_locations al
        INNER JOIN artists a ON a.id = al.artist_id
        INNER JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active' AND pi.storage_thumb_640 IS NOT NULL
        WHERE a.deleted_at IS NULL
          AND LOWER(al.region) = LOWER(COALESCE(p_state_code, p_region))
          AND al.city IS NOT NULL
        GROUP BY al.city, al.region, al.country_code
        HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
        ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;

    ELSIF p_grouping = 'all_cities' THEN
        RETURN QUERY
        SELECT
            lower(replace(al.city, ' ', '-'))::text AS location_code,
            (al.city || ', ' || al.region)::text AS display_name,
            al.region::text AS region_code,
            al.country_code::text AS country_code,
            COUNT(DISTINCT al.artist_id)::bigint AS artist_count
        FROM artist_locations al
        INNER JOIN artists a ON a.id = al.artist_id
        INNER JOIN portfolio_images pi ON pi.artist_id = a.id AND pi.status = 'active' AND pi.storage_thumb_640 IS NOT NULL
        WHERE a.deleted_at IS NULL
          AND al.country_code = 'US'
          AND al.city IS NOT NULL
        GROUP BY al.city, al.region, al.country_code
        HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
        ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
    END IF;
END;
$$;

COMMENT ON FUNCTION get_location_counts IS
  'Unified location counts function. Supports groupings: regions, countries, cities, state_cities, all_cities.';
