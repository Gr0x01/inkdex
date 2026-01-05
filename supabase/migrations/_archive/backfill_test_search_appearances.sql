-- ============================================================================
-- Backfill Test Data: Search Appearances for Morgan Black (Test Pro User)
-- ============================================================================
-- This is a one-time backfill script to populate search appearance history
-- for the test Pro user to validate the Recent Search Appearances feature.
--
-- Test User: Morgan Black
-- User ID: 34f20c4e-03b3-4806-a9d4-5e60acd02ddd
-- Artist ID: 2ed1bfaa-a0e9-4025-a1ba-797e0f0830fa
--
-- Run this script via Supabase SQL Editor (one-time use only)
-- ============================================================================

DO $$
DECLARE
  v_artist_id UUID := '2ed1bfaa-a0e9-4025-a1ba-797e0f0830fa';
  v_search_id UUID;
  v_base_time TIMESTAMPTZ := NOW () - INTERVAL '3 days';
BEGIN

  -- ========================================================================
  -- Search 1: Text search for "blackwork tattoo" (Rank #2, 2 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, query_text, created_at)
  VALUES ('text', 'blackwork tattoo', NOW () - INTERVAL '2 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 2, 0.82, 0.87, 4, NOW () - INTERVAL '2 hours'
  );

  -- ========================================================================
  -- Search 2: Image search (Rank #1, 5 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, created_at)
  VALUES ('image', NOW () - INTERVAL '5 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 1, 0.91, 0.96, 5, NOW () - INTERVAL '5 hours'
  );

  -- ========================================================================
  -- Search 3: Instagram post search (Rank #3, 8 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, instagram_username, created_at)
  VALUES ('instagram_post', 'tattooartist_nyc', NOW () - INTERVAL '8 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 3, 0.78, 0.83, 3, NOW () - INTERVAL '8 hours'
  );

  -- ========================================================================
  -- Search 4: Text search for "geometric sleeve" (Rank #1, 1 day ago)
  -- ========================================================================
  INSERT INTO searches (query_type, query_text, created_at)
  VALUES ('text', 'geometric sleeve', NOW () - INTERVAL '1 day')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 1, 0.88, 0.93, 5, NOW () - INTERVAL '1 day'
  );

  -- ========================================================================
  -- Search 5: Hybrid search (Rank #4, 1 day 6 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, query_text, created_at)
  VALUES ('hybrid', 'minimalist line art', NOW () - INTERVAL '1 day 6 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 4, 0.75, 0.80, 3, NOW () - INTERVAL '1 day 6 hours'
  );

  -- ========================================================================
  -- Search 6: Similar artist search (Rank #2, 2 days ago)
  -- ========================================================================
  INSERT INTO searches (query_type, created_at)
  VALUES ('similar_artist', NOW () - INTERVAL '2 days')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 2, 0.85, 0.90, 4, NOW () - INTERVAL '2 days'
  );

  -- ========================================================================
  -- Search 7: Instagram profile search (Rank #5, 2 days 12 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, instagram_username, created_at)
  VALUES ('instagram_profile', 'inkedmag', NOW () - INTERVAL '2 days 12 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 5, 0.72, 0.77, 3, NOW () - INTERVAL '2 days 12 hours'
  );

  -- ========================================================================
  -- Search 8: Text search for "fine line tattoo" (Rank #1, 3 days ago)
  -- ========================================================================
  INSERT INTO searches (query_type, query_text, created_at)
  VALUES ('text', 'fine line tattoo', NOW () - INTERVAL '3 days')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 1, 0.89, 0.94, 5, NOW () - INTERVAL '3 days'
  );

  -- ========================================================================
  -- Search 9: Image search (Rank #7, 3 days 8 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, created_at)
  VALUES ('image', NOW () - INTERVAL '3 days 8 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 7, 0.68, 0.73, 3, NOW () - INTERVAL '3 days 8 hours'
  );

  -- ========================================================================
  -- Search 10: Text search for "dotwork mandala" (Rank #3, 3 days 18 hours ago)
  -- ========================================================================
  INSERT INTO searches (query_type, query_text, created_at)
  VALUES ('text', 'dotwork mandala', NOW () - INTERVAL '3 days 18 hours')
  RETURNING id INTO v_search_id;

  INSERT INTO search_appearances (
    search_id, artist_id, rank_position, similarity_score, boosted_score,
    matching_images_count, created_at
  ) VALUES (
    v_search_id, v_artist_id, 3, 0.80, 0.85, 4, NOW () - INTERVAL '3 days 18 hours'
  );

  RAISE NOTICE 'Successfully backfilled 10 search appearances for Morgan Black (artist_id: %)', v_artist_id;

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the backfill worked correctly:
--
-- SELECT COUNT(*) AS total_appearances
-- FROM search_appearances
-- WHERE artist_id = '2ed1bfaa-a0e9-4025-a1ba-797e0f0830fa';
--
-- Expected result: 10 rows
-- ============================================================================
