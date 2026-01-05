-- Add index on (state, city) for efficient state aggregation queries
-- This index optimizes the get_state_cities_with_counts() function
-- Note: Cannot use CONCURRENTLY in migration context (runs in transaction)
CREATE INDEX IF NOT EXISTS idx_artists_state_city
  ON artists(state, city);

COMMENT ON INDEX idx_artists_state_city IS
  'Composite index for efficient state/city grouping in get_state_cities_with_counts()';
