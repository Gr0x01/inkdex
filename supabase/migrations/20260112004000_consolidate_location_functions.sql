-- Migration: Consolidate location count functions
-- Replaces: get_regions_with_counts, get_countries_with_counts, get_cities_with_counts,
--           get_state_cities_with_counts, get_all_cities_with_min_artists
-- Also fixes GDPR bug in get_all_cities_with_min_artists

-- Create unified location counts function
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

    -- Skip GDPR countries entirely
    IF p_country_code IS NOT NULL AND is_gdpr_country(UPPER(p_country_code)) THEN
        RETURN;
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
          AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
          AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
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
          AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
          AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
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
          AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
          AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
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
          AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
          AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
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
          AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
          AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
          AND al.country_code = 'US'
          AND al.city IS NOT NULL
        GROUP BY al.city, al.region, al.country_code
        HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
        ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_location_counts(text, text, text, text, int) TO anon;
GRANT EXECUTE ON FUNCTION get_location_counts(text, text, text, text, int) TO authenticated;

-- Drop old functions (code now uses get_location_counts directly)
DROP FUNCTION IF EXISTS get_regions_with_counts(text);
DROP FUNCTION IF EXISTS get_countries_with_counts();
DROP FUNCTION IF EXISTS get_cities_with_counts(int, text, text);
DROP FUNCTION IF EXISTS get_state_cities_with_counts(text);
DROP FUNCTION IF EXISTS get_all_cities_with_min_artists(int);
