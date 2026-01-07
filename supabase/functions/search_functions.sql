-- ============================================================================
-- SEARCH FUNCTIONS - INDEX / DOCUMENTATION
-- ============================================================================
--
-- DO NOT RUN THIS FILE DIRECTLY - It is documentation only.
-- The split files are the source of truth.
--
-- Functions are split into domain folders for maintainability:
--
--   _shared/gdpr.sql              - is_gdpr_country() helper
--   _shared/location_filter.sql   - matches_location_filter() helper
--   search/vector_search.sql      - 4 vector search functions (SOURCE OF TRUTH)
--   location/location_counts.sql  - 4 location count functions
--   admin/admin_functions.sql     - 3 admin + homepage functions
--
-- CONSOLIDATED Jan 2026: Merged search_artists_by_embedding, search_artists_with_count,
-- and search_artists_with_style_boost into unified `search_artists` function.
--
-- TO APPLY CHANGES:
--   Run files in Supabase SQL Editor in this order:
--   1. _shared/gdpr.sql
--   2. _shared/location_filter.sql
--   3. search/vector_search.sql
--   4. location/location_counts.sql
--   5. admin/admin_functions.sql
--
-- Last Updated: 2026-01-07
-- ============================================================================


-- ============================================================================
-- FUNCTION SIGNATURES (for quick reference)
-- ============================================================================

-- _shared/gdpr.sql:
--   is_gdpr_country(country_code TEXT) → BOOLEAN
--     Returns true if country is in EU/EEA/UK/CH (GDPR-covered)

-- _shared/location_filter.sql:
--   matches_location_filter(p_city, p_region, p_country_code, city_filter, region_filter, country_filter) → BOOLEAN
--     Returns true if location matches the filter criteria

-- search/vector_search.sql:
--   search_artists(
--     query_embedding vector(768),
--     match_threshold float DEFAULT 0.5,
--     match_count int DEFAULT 20,
--     city_filter text DEFAULT NULL,
--     region_filter text DEFAULT NULL,
--     country_filter text DEFAULT NULL,
--     offset_param int DEFAULT 0,
--     query_styles jsonb DEFAULT NULL,      -- optional style boost
--     is_color_query boolean DEFAULT NULL   -- optional color boost
--   ) → unified search with style_boost, color_boost, boosted_score, total_count, location_count
--
--   find_related_artists(source_artist_id uuid, city_filter, region_filter, country_filter, match_count)
--     → related artists by portfolio style similarity
--
--   classify_embedding_styles(p_embedding vector(768), p_max_styles int, p_min_confidence float)
--     → style classifications with confidence scores
--
--   get_search_location_counts(query_embedding vector(768), match_threshold float)
--     → location counts filtered by search results

-- location/location_counts.sql:
--   get_regions_with_counts(p_country_code text DEFAULT 'US') → regions with artist counts
--   get_countries_with_counts() → countries with artist counts
--   get_cities_with_counts(min_count, p_country_code, p_region) → cities with artist counts
--   get_state_cities_with_counts(state_code text) → cities within a state

-- admin/admin_functions.sql:
--   get_top_artists_by_style(p_style_slug text, p_limit int) → top artists for a style
--   get_artists_with_image_counts(...filters...) → paginated admin artist list
--   get_homepage_stats() → aggregate counts for homepage hero


-- ============================================================================
-- CTE NAMING CONVENTION
-- ============================================================================
-- All search functions use prefixed CTE columns to prevent collisions:
--   ri_  = ranked_images CTE
--   fa_  = filtered_artists CTE
--   aa_  = aggregated_artists CTE
--   ba_  = boosted_artists CTE
--   asb_ = artist_style_boost CTE
--   acb_ = artist_color_boost CTE
--   ae_  = artist_embeddings CTE
--   alc_ = artist_location_counts CTE
