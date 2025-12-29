-- Add NOT NULL constraints to required fields
-- Prevents orphaned records and data integrity issues

-- ============================================
-- portfolio_images table
-- ============================================
-- Prevent orphaned portfolio images without artist
ALTER TABLE portfolio_images ALTER COLUMN artist_id SET NOT NULL;

-- Ensure status is always set
ALTER TABLE portfolio_images ALTER COLUMN status SET NOT NULL;

-- ============================================
-- searches table
-- ============================================
-- Ensure query type is always specified
ALTER TABLE searches ALTER COLUMN query_type SET NOT NULL;

-- ============================================
-- scraping_jobs table
-- ============================================
-- Ensure job status is always set
ALTER TABLE scraping_jobs ALTER COLUMN status SET NOT NULL;

-- Ensure images scraped count is always set (default 0)
ALTER TABLE scraping_jobs ALTER COLUMN images_scraped SET NOT NULL;
