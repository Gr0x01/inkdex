-- Migration: Add style_taxonomy enum and columns
-- Required by search_artists function and style tagging system

-- Create the style_taxonomy enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'style_taxonomy') THEN
        CREATE TYPE public.style_taxonomy AS ENUM ('technique', 'theme');
    END IF;
END$$;

-- Add taxonomy column to artist_style_profiles
ALTER TABLE public.artist_style_profiles
ADD COLUMN IF NOT EXISTS taxonomy public.style_taxonomy DEFAULT 'technique'::public.style_taxonomy;

-- Add taxonomy column to image_style_tags
ALTER TABLE public.image_style_tags
ADD COLUMN IF NOT EXISTS taxonomy public.style_taxonomy DEFAULT 'technique'::public.style_taxonomy;

-- Add taxonomy column to style_seeds
ALTER TABLE public.style_seeds
ADD COLUMN IF NOT EXISTS taxonomy public.style_taxonomy DEFAULT 'technique'::public.style_taxonomy;

-- Update unique constraint on artist_style_profiles to include taxonomy
-- First drop the old constraint if it exists
ALTER TABLE public.artist_style_profiles
DROP CONSTRAINT IF EXISTS artist_style_profiles_artist_id_style_name_key;

-- Add new constraint with taxonomy (use DO block to handle already exists case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'artist_style_profiles_artist_id_style_name_taxonomy_key'
    ) THEN
        ALTER TABLE public.artist_style_profiles
        ADD CONSTRAINT artist_style_profiles_artist_id_style_name_taxonomy_key
        UNIQUE (artist_id, style_name, taxonomy);
    END IF;
END$$;
