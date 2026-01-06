-- ============================================================================
-- Migration: Fix Location Functions - Add SECURITY DEFINER
-- Description: These functions query portfolio_images which has RLS policies.
--   They need SECURITY DEFINER to bypass RLS for anonymous users.
-- Date: 2026-01-06
-- ============================================================================

-- ============================================================================
-- 1. get_regions_with_counts
-- ============================================================================
DROP FUNCTION IF EXISTS get_regions_with_counts(text);

CREATE OR REPLACE FUNCTION get_regions_with_counts(p_country_code text DEFAULT 'US')
RETURNS TABLE (
  region text,
  region_name text,
  artist_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- 2. get_countries_with_counts
-- ============================================================================
DROP FUNCTION IF EXISTS get_countries_with_counts();

CREATE OR REPLACE FUNCTION get_countries_with_counts()
RETURNS TABLE (
  country_code text,
  country_name text,
  artist_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
END;
$$;

-- ============================================================================
-- 3. get_cities_with_counts
-- ============================================================================
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- 4. get_state_cities_with_counts
-- ============================================================================
DROP FUNCTION IF EXISTS get_state_cities_with_counts(text);

CREATE OR REPLACE FUNCTION get_state_cities_with_counts(state_code text)
RETURNS TABLE (
  city text,
  artist_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate state_code format (alphanumeric, spaces, hyphens only)
  IF state_code IS NULL OR state_code !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid state_code format.';
  END IF;

  RETURN QUERY
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
