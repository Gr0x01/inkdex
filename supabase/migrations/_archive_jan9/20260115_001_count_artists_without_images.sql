-- Ensure count_artists_without_images function exists
-- Used by admin pipeline dashboard to show "Need Scraping" count

CREATE OR REPLACE FUNCTION count_artists_without_images()
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
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
$$;

COMMENT ON FUNCTION count_artists_without_images IS
  'Returns count of artists needing image scraping (no portfolio images, not private/blacklisted)';
