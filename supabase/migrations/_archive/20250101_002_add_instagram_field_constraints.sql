-- Add CHECK constraints for Instagram fields in searches table
-- Ensures data integrity and prevents malformed data

-- Constraint for instagram_username
-- Instagram usernames: 1-30 chars, alphanumeric + dots/underscores, cannot end with dot
ALTER TABLE searches
ADD CONSTRAINT instagram_username_format CHECK (
  instagram_username IS NULL OR (
    length(instagram_username) >= 1 AND
    length(instagram_username) <= 30 AND
    instagram_username ~ '^[a-zA-Z0-9._]+$' AND
    instagram_username !~ '\.$'
  )
);

-- Constraint for instagram_post_id
-- Instagram post IDs: 8-15 chars, alphanumeric + underscores/hyphens
ALTER TABLE searches
ADD CONSTRAINT instagram_post_id_format CHECK (
  instagram_post_id IS NULL OR (
    length(instagram_post_id) >= 8 AND
    length(instagram_post_id) <= 15 AND
    instagram_post_id ~ '^[a-zA-Z0-9_-]+$'
  )
);

-- Add comments for documentation
COMMENT ON CONSTRAINT instagram_username_format ON searches IS
  'Validates Instagram username format: 1-30 chars, alphanumeric with dots/underscores, no trailing dot';

COMMENT ON CONSTRAINT instagram_post_id_format ON searches IS
  'Validates Instagram post ID format: 8-15 chars, alphanumeric with underscores/hyphens';
