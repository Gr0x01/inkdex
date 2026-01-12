-- Add missing unique constraint on (artist_id, style_name) for the recompute_artist_styles function
-- The function uses ON CONFLICT (artist_id, style_name) but only the 3-column constraint existed
-- This was causing PostgreSQL error 42P10 when deleting images (trigger couldn't find matching constraint)

ALTER TABLE artist_style_profiles
ADD CONSTRAINT artist_style_profiles_artist_id_style_name_key
UNIQUE (artist_id, style_name);
