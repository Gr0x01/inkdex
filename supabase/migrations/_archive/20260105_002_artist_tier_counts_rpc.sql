-- Artist Tier Counts RPC Function
-- Replaces 5 separate COUNT queries with a single aggregated query
-- Date: 2026-01-05

CREATE OR REPLACE FUNCTION get_artist_tier_counts()
RETURNS TABLE(
  total BIGINT,
  unclaimed BIGINT,
  claimed_free BIGINT,
  pro BIGINT,
  featured BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND verification_status = 'unclaimed') as unclaimed,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND verification_status = 'claimed' AND is_pro = false) as claimed_free,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_pro = true) as pro,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_featured = true) as featured
  FROM artists;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_artist_tier_counts() IS 'Returns artist counts by tier in a single query (replaces 5 separate COUNT queries)';
