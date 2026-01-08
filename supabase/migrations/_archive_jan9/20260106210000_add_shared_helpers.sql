-- Add shared SQL helper functions for search operations
-- These replace hardcoded logic duplicated across search_functions.sql

-- GDPR country check (replaces 11+ hardcoded lists)
CREATE OR REPLACE FUNCTION is_gdpr_country(country_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT UPPER(country_code) = ANY(ARRAY[
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO', 'GB', 'CH'
  ])
$$;

-- Location filter (replaces 4+ duplicated filter blocks)
CREATE OR REPLACE FUNCTION matches_location_filter(
  p_city TEXT, p_region TEXT, p_country_code TEXT,
  city_filter TEXT, region_filter TEXT, country_filter TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (
    (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
    OR
    (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
     AND p_country_code = UPPER(country_filter))
    OR
    (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
     AND p_country_code = UPPER(country_filter)
     AND LOWER(p_region) = LOWER(region_filter))
    OR
    (city_filter IS NOT NULL
     AND LOWER(p_city) = LOWER(city_filter)
     AND (country_filter IS NULL OR p_country_code = UPPER(country_filter))
     AND (region_filter IS NULL OR LOWER(p_region) = LOWER(region_filter)))
  )
$$;
