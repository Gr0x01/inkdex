-- Add is_test_account flag to exclude test artists from search
-- Test artists can still be accessed directly via profile pages

-- ============================================
-- Add is_test_account column to artists table
-- ============================================
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_artists_is_test_account
ON artists(is_test_account)
WHERE is_test_account = TRUE;

COMMENT ON COLUMN artists.is_test_account IS
  'Flag for test/development accounts. Excluded from search but accessible via direct URL.';

-- ============================================
-- Mark existing test artists
-- ============================================
UPDATE artists
SET is_test_account = TRUE
WHERE instagram_handle IN (
  'test_unclaimed_artist',  -- Jamie Chen
  'test_free_artist',       -- Alex Rivera
  'test_pro_artist'         -- Morgan Black
);

-- ============================================
-- Update search_artists_by_embedding to exclude test accounts
-- ============================================
DROP FUNCTION IF EXISTS search_artists_by_embedding(vector, float, int, text, int);

CREATE OR REPLACE FUNCTION search_artists_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  offset_param int DEFAULT 0
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
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
    -- Apply city filter using artist_locations table for multi-location support
    -- If no city filter, include all artists
    -- If city filter, match against any location (city or region)
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug, a.city, a.profile_image_url,
           a.instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as is_verified,
           COALESCE(a.is_pro, FALSE) as is_pro,
           COALESCE(a.is_featured, FALSE) as is_featured
    FROM artists a
    WHERE (
      city_filter IS NULL
      OR a.city = city_filter  -- Quick check on primary location
      OR EXISTS (
        -- Check all locations for this artist
        SELECT 1 FROM artist_locations al
        WHERE al.artist_id = a.id
          AND (
            LOWER(al.city) = LOWER(city_filter)
            OR LOWER(al.region) = LOWER(city_filter)
          )
      )
    )
    AND a.deleted_at IS NULL  -- Exclude soft-deleted artists
    AND COALESCE(a.is_test_account, FALSE) = FALSE  -- Exclude test accounts from search
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
      AND COALESCE(pi.hidden, FALSE) = FALSE  -- Exclude hidden images
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
    ORDER BY pi.embedding <=> query_embedding
    LIMIT (match_count * 10)  -- Fetch extra to ensure we have enough after grouping
  ),
  aggregated_artists AS (
    -- Group images by artist and aggregate matching images
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
    -- Apply Pro/Featured boosts to ranking
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
  -- Join with artist details, order by boosted score
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
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
  'Vector similarity search with Pro/Featured ranking boosts. Supports multi-location artists. Excludes test accounts.';

-- ============================================
-- Update search_artists_with_count to exclude test accounts
-- ============================================
DROP FUNCTION IF EXISTS search_artists_with_count(vector, float, int, text, int);

CREATE OR REPLACE FUNCTION search_artists_with_count(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  offset_param int DEFAULT 0
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
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
    -- Apply city filter using artist_locations table for multi-location support
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug, a.city, a.profile_image_url,
           a.follower_count, a.shop_name, a.instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as is_verified,
           COALESCE(a.is_pro, FALSE) as is_pro,
           COALESCE(a.is_featured, FALSE) as is_featured
    FROM artists a
    WHERE (
      city_filter IS NULL
      OR a.city = city_filter
      OR EXISTS (
        SELECT 1 FROM artist_locations al
        WHERE al.artist_id = a.id
          AND (
            LOWER(al.city) = LOWER(city_filter)
            OR LOWER(al.region) = LOWER(city_filter)
          )
      )
    )
    AND a.deleted_at IS NULL
    AND COALESCE(a.is_test_account, FALSE) = FALSE  -- Exclude test accounts from search
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
    SELECT COUNT(DISTINCT artist_id) as cnt FROM aggregated_artists
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
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
  'Vector similarity search with count and Pro/Featured ranking boosts. Supports multi-location artists. Excludes test accounts.';

-- ============================================
-- Update find_related_artists to exclude test accounts
-- ============================================
DROP FUNCTION IF EXISTS find_related_artists(uuid, text, int);

CREATE OR REPLACE FUNCTION find_related_artists(
  source_artist_id uuid,
  city_filter text DEFAULT NULL,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
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
  -- Get average embedding for source artist's portfolio
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
    -- Apply city filter using artist_locations for multi-location support
    SELECT DISTINCT ON (a.id)
           a.id, a.name, a.slug, a.city, a.profile_image_url,
           a.instagram_url, a.shop_name, a.follower_count,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as is_verified
    FROM artists a
    WHERE a.id != source_artist_id
      AND (
        city_filter IS NULL
        OR a.city = city_filter
        OR EXISTS (
          SELECT 1 FROM artist_locations al
          WHERE al.artist_id = a.id
            AND (
              LOWER(al.city) = LOWER(city_filter)
              OR LOWER(al.region) = LOWER(city_filter)
            )
        )
      )
      AND a.deleted_at IS NULL
      AND COALESCE(a.is_test_account, FALSE) = FALSE  -- Exclude test accounts from related artists
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
  'Find artists with similar style using portfolio embedding comparison. Supports multi-location filtering. Excludes test accounts.';
