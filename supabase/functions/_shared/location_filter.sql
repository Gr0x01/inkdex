-- Location Filter Helper
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
