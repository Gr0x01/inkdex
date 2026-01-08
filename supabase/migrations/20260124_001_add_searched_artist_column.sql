-- Add searched_artist column to searches table
-- Stores the searched artist's card data for immediate display in profile searches

ALTER TABLE searches
ADD COLUMN searched_artist JSONB DEFAULT NULL;

COMMENT ON COLUMN searches.searched_artist IS
'For instagram_profile searches: the searched artist card data for immediate display.
Structure: { id, instagram_handle, name, profile_image_url, bio, follower_count, city, images[] }';
