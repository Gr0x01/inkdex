-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (for future auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  instagram_id TEXT UNIQUE,
  instagram_username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artists table
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  instagram_handle TEXT UNIQUE NOT NULL,
  instagram_id TEXT,  -- Instagram user ID for OAuth matching
  shop_name TEXT,
  city TEXT NOT NULL,
  state TEXT,
  profile_image_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  bio TEXT,
  google_place_id TEXT,

  -- Discovery metadata
  discovery_source TEXT,
  verification_status TEXT DEFAULT 'unclaimed',  -- 'unclaimed', 'pending', 'verified'
  instagram_private BOOLEAN DEFAULT false,
  follower_count INTEGER,

  -- Artist claiming (future)
  claimed_by_user_id UUID REFERENCES users(id),
  claimed_at TIMESTAMPTZ,
  verification_token TEXT,
  bio_override TEXT,  -- Claimed artists can customize
  contact_email TEXT,
  booking_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ
);

-- Portfolio images
CREATE TABLE portfolio_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  instagram_post_id TEXT UNIQUE NOT NULL,
  instagram_url TEXT NOT NULL,
  r2_original_path TEXT,
  r2_thumbnail_small TEXT,
  r2_thumbnail_medium TEXT,
  r2_thumbnail_large TEXT,
  post_caption TEXT,
  post_timestamp TIMESTAMPTZ,
  likes_count INTEGER,
  embedding vector(768),
  status TEXT DEFAULT 'active',  -- 'active', 'hidden', 'deleted'
  featured BOOLEAN DEFAULT false,  -- For claimed artists to highlight work
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Searches (temporary storage for search sessions)
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding vector(768),
  query_type TEXT NOT NULL,  -- 'image', 'text', 'hybrid'
  query_text TEXT,  -- For text searches, store the original query
  image_url TEXT,  -- For image searches, store the uploaded image URL (if applicable)
  user_id UUID REFERENCES users(id),  -- NULL for anonymous, track for logged in
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved artists (future - bookmarks)
CREATE TABLE saved_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

-- Scraping jobs
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id),
  status TEXT DEFAULT 'pending',
  images_scraped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Style seeds (for SEO landing pages)
CREATE TABLE style_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_name TEXT UNIQUE NOT NULL,  -- 'fine-line', 'traditional', 'geometric'
  display_name TEXT NOT NULL,  -- 'Fine Line', 'Traditional', 'Geometric'
  seed_image_url TEXT NOT NULL,  -- Example image representing this style
  embedding vector(768) NOT NULL,  -- CLIP embedding of seed image
  description TEXT,  -- For SEO meta description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_artists_city ON artists(city);
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_instagram_id ON artists(instagram_id);
CREATE INDEX idx_artists_claimed_by ON artists(claimed_by_user_id);
CREATE INDEX idx_portfolio_artist ON portfolio_images(artist_id);
CREATE INDEX idx_portfolio_status ON portfolio_images(status);
CREATE INDEX idx_portfolio_featured ON portfolio_images(featured) WHERE featured = true;
CREATE INDEX idx_saved_artists_user ON saved_artists(user_id);
CREATE INDEX idx_saved_artists_artist ON saved_artists(artist_id);
CREATE INDEX idx_searches_query_type ON searches(query_type);
CREATE INDEX idx_searches_created_at ON searches(created_at DESC);
CREATE INDEX idx_style_seeds_name ON style_seeds(style_name);
