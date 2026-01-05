-- Add CHECK constraints for data validation
-- Prevents invalid data at the database level

-- ============================================
-- users table validation
-- ============================================
-- Email format validation
ALTER TABLE users ADD CONSTRAINT valid_email
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- ============================================
-- artists table validation
-- ============================================
-- Verification status enum
ALTER TABLE artists ADD CONSTRAINT valid_verification_status
  CHECK (verification_status IN ('unclaimed', 'pending', 'verified'));

-- Instagram URL format
ALTER TABLE artists ADD CONSTRAINT valid_instagram_url
  CHECK (instagram_url IS NULL OR instagram_url ~* '^https?://');

-- Website URL format
ALTER TABLE artists ADD CONSTRAINT valid_website_url
  CHECK (website_url IS NULL OR website_url ~* '^https?://');

-- Booking URL format
ALTER TABLE artists ADD CONSTRAINT valid_booking_url
  CHECK (booking_url IS NULL OR booking_url ~* '^https?://');

-- Follower count must be non-negative
ALTER TABLE artists ADD CONSTRAINT valid_follower_count
  CHECK (follower_count IS NULL OR follower_count >= 0);

-- ============================================
-- portfolio_images table validation
-- ============================================
-- Status enum
ALTER TABLE portfolio_images ADD CONSTRAINT valid_status
  CHECK (status IN ('active', 'hidden', 'deleted'));

-- Instagram URL format
ALTER TABLE portfolio_images ADD CONSTRAINT valid_portfolio_instagram_url
  CHECK (instagram_url ~* '^https?://');

-- Likes count must be non-negative
ALTER TABLE portfolio_images ADD CONSTRAINT valid_likes_count
  CHECK (likes_count IS NULL OR likes_count >= 0);

-- ============================================
-- searches table validation
-- ============================================
-- Query type enum
ALTER TABLE searches ADD CONSTRAINT valid_query_type
  CHECK (query_type IN ('image', 'text', 'hybrid'));

-- ============================================
-- scraping_jobs table validation
-- ============================================
-- Job status enum
ALTER TABLE scraping_jobs ADD CONSTRAINT valid_job_status
  CHECK (status IN ('pending', 'running', 'completed', 'failed'));

-- Images scraped must be non-negative
ALTER TABLE scraping_jobs ADD CONSTRAINT valid_images_scraped
  CHECK (images_scraped >= 0);
