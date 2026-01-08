-- Remove chicano style from taxonomy
-- The style was being over-applied to all black-and-gray work due to visual similarity
-- Black-and-gray will be added as a new style with proper seed images and embeddings

-- Delete chicano from style_seeds (cascades to image_style_tags and artist_style_profiles)
DELETE FROM style_seeds WHERE style_name = 'chicano';

-- Note: black-and-gray style will be inserted by the seed upload script
-- with proper embeddings generated from new seed images
