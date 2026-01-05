-- Add retry tracking and blacklist functionality to scraping_jobs
-- This prevents infinite retries of persistently failing artists

-- 1. Add retry_count to track how many times we've attempted this artist
ALTER TABLE scraping_jobs
ADD COLUMN retry_count INTEGER DEFAULT 0;

-- 2. Add blacklist flag to artists table (soft delete for scraping)
ALTER TABLE artists
ADD COLUMN scraping_blacklisted BOOLEAN DEFAULT FALSE,
ADD COLUMN blacklist_reason TEXT,
ADD COLUMN blacklisted_at TIMESTAMPTZ;

-- 3. Create index for efficient blacklist queries
CREATE INDEX idx_artists_scraping_blacklisted ON artists(scraping_blacklisted) WHERE scraping_blacklisted = TRUE;

-- 4. Create function to auto-blacklist after N failures
CREATE OR REPLACE FUNCTION check_and_blacklist_artist()
RETURNS TRIGGER AS $$
DECLARE
    failure_count INTEGER;
    max_retries INTEGER := 3; -- Blacklist after 3 failures
BEGIN
    -- Only run on failed jobs
    IF NEW.status = 'failed' THEN
        -- Count total failures for this artist
        SELECT COUNT(*)
        INTO failure_count
        FROM scraping_jobs
        WHERE artist_id = NEW.artist_id
        AND status = 'failed';

        -- If we've hit the retry limit, blacklist the artist
        IF failure_count >= max_retries THEN
            UPDATE artists
            SET
                scraping_blacklisted = TRUE,
                blacklist_reason = 'Exceeded ' || max_retries || ' failed scraping attempts: ' || NEW.error_message,
                blacklisted_at = NOW()
            WHERE id = NEW.artist_id;

            RAISE NOTICE 'Artist % blacklisted after % failures', NEW.artist_id, failure_count;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-blacklist
DROP TRIGGER IF EXISTS trigger_auto_blacklist ON scraping_jobs;
CREATE TRIGGER trigger_auto_blacklist
    AFTER INSERT OR UPDATE ON scraping_jobs
    FOR EACH ROW
    EXECUTE FUNCTION check_and_blacklist_artist();

-- 6. Update existing failed jobs to set retry_count
-- Count how many times each artist has failed
WITH failure_counts AS (
    SELECT
        artist_id,
        COUNT(*) as failures
    FROM scraping_jobs
    WHERE status = 'failed'
    GROUP BY artist_id
)
UPDATE scraping_jobs sj
SET retry_count = fc.failures - 1 -- Subtract 1 because current job is one of them
FROM failure_counts fc
WHERE sj.artist_id = fc.artist_id
AND sj.status = 'failed';

-- 7. Blacklist artists that have already exceeded retry limit
UPDATE artists a
SET
    scraping_blacklisted = TRUE,
    blacklist_reason = 'Exceeded 3 failed scraping attempts (auto-blacklisted during migration)',
    blacklisted_at = NOW()
WHERE a.id IN (
    SELECT artist_id
    FROM scraping_jobs
    WHERE status = 'failed'
    GROUP BY artist_id
    HAVING COUNT(*) >= 3
)
AND scraping_blacklisted IS NOT TRUE; -- Don't update if already blacklisted

-- 8. Comment on columns for documentation
COMMENT ON COLUMN scraping_jobs.retry_count IS 'Number of times this job has been retried (auto-incremented)';
COMMENT ON COLUMN artists.scraping_blacklisted IS 'TRUE if artist should be excluded from scraping (e.g., private account, deleted, persistent failures)';
COMMENT ON COLUMN artists.blacklist_reason IS 'Why this artist was blacklisted from scraping';
COMMENT ON COLUMN artists.blacklisted_at IS 'When the artist was blacklisted';
