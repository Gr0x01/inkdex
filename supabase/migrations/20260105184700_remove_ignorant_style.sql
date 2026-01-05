-- Remove ignorant style from taxonomy
-- The style is too similar to stick-and-poke and minimalist
-- Visual similarity causes confusion and redundancy in the style system

-- Delete ignorant from style_seeds (cascades to image_style_tags and artist_style_profiles)
DELETE FROM style_seeds
WHERE style_name = 'ignorant';
