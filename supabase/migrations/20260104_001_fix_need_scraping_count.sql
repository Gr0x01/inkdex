-- Fix count_artists_without_images to match scraper's filters
-- This ensures the "Need Scraping" count only includes artists that can actually be scraped

DROP FUNCTION IF EXISTS count_artists_without_images();

CREATE FUNCTION count_artists_without_images()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM artists a
    WHERE a.deleted_at IS NULL
      AND a.instagram_handle IS NOT NULL
      AND a.instagram_private != TRUE
      AND (a.scraping_blacklisted IS NULL OR a.scraping_blacklisted = FALSE)
      AND NOT EXISTS (
        SELECT 1
        FROM portfolio_images pi
        WHERE pi.artist_id = a.id
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Verify the count matches what scraper will find
-- SELECT count_artists_without_images();
