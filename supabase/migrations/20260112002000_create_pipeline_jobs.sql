-- Migration: Create pipeline_jobs table
-- Consolidates: pipeline_runs, scraping_jobs

-- Create unified pipeline jobs table
CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    job_type TEXT NOT NULL,
    triggered_by TEXT NOT NULL DEFAULT 'system',
    artist_id UUID,
    target_artist_ids UUID[],
    target_city TEXT,
    target_scope TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending' NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    process_pid INT,
    last_heartbeat_at TIMESTAMPTZ,
    result_data JSONB DEFAULT '{}'
);

-- Check constraints
ALTER TABLE pipeline_jobs ADD CONSTRAINT pipeline_jobs_status_check
    CHECK (status = ANY (ARRAY['pending', 'running', 'completed', 'failed', 'cancelled']));

ALTER TABLE pipeline_jobs ADD CONSTRAINT pipeline_jobs_job_type_check
    CHECK (job_type = ANY (ARRAY[
        'scraping', 'processing', 'embeddings',  -- batch job types
        'scrape_single'  -- individual artist scraping
    ]));

-- Create indexes
CREATE INDEX idx_pipeline_jobs_status ON pipeline_jobs(status);
CREATE INDEX idx_pipeline_jobs_created ON pipeline_jobs(created_at DESC);
CREATE INDEX idx_pipeline_jobs_artist ON pipeline_jobs(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX idx_pipeline_jobs_type_status ON pipeline_jobs(job_type, status);
CREATE INDEX idx_pipeline_jobs_heartbeat ON pipeline_jobs(last_heartbeat_at) WHERE status = 'running';
CREATE INDEX idx_pipeline_jobs_pid ON pipeline_jobs(process_pid) WHERE process_pid IS NOT NULL;

-- Prevent duplicate active scrape jobs for the same artist
CREATE UNIQUE INDEX idx_pipeline_jobs_unique_active_artist_scrape
    ON pipeline_jobs(artist_id)
    WHERE status IN ('pending', 'running')
    AND job_type = 'scrape_single'
    AND artist_id IS NOT NULL;

-- Unique constraint for active batch jobs (only one pending/running job per batch type)
CREATE UNIQUE INDEX idx_pipeline_jobs_unique_active_batch
    ON pipeline_jobs(job_type)
    WHERE status = ANY (ARRAY['pending', 'running'])
    AND job_type != 'scrape_single';

-- Foreign key to artists (for individual scraping jobs)
ALTER TABLE pipeline_jobs
    ADD CONSTRAINT pipeline_jobs_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role full access to pipeline_jobs"
    ON pipeline_jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger function (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION update_pipeline_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_pipeline_jobs_updated_at
    BEFORE UPDATE ON pipeline_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_jobs_updated_at();

-- Update the auto-blacklist trigger to work with pipeline_jobs
CREATE OR REPLACE FUNCTION check_and_blacklist_artist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    failure_count INTEGER;
    max_retries INTEGER := 3;
BEGIN
    -- Only applies to individual scraping jobs
    IF NEW.job_type = 'scrape_single' AND NEW.status = 'failed' AND NEW.artist_id IS NOT NULL THEN
        SELECT COUNT(*)
        INTO failure_count
        FROM pipeline_jobs
        WHERE artist_id = NEW.artist_id
        AND job_type = 'scrape_single'
        AND status = 'failed';

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
$$;

CREATE TRIGGER trigger_auto_blacklist_pipeline
    AFTER INSERT OR UPDATE ON pipeline_jobs
    FOR EACH ROW
    EXECUTE FUNCTION check_and_blacklist_artist();

-- Migrate data from scraping_jobs
INSERT INTO pipeline_jobs (
    id, created_at, updated_at, job_type, triggered_by, artist_id,
    status, started_at, completed_at, error_message, result_data
)
SELECT
    id,
    COALESCE(created_at, now()),
    COALESCE(created_at, now()),
    'scrape_single',
    'script',
    artist_id,
    status,
    started_at,
    completed_at,
    error_message,
    jsonb_build_object(
        'images_scraped', COALESCE(images_scraped, 0),
        'retry_count', COALESCE(retry_count, 0)
    )
FROM scraping_jobs;

-- Migrate data from pipeline_runs
INSERT INTO pipeline_jobs (
    id, created_at, updated_at, job_type, triggered_by,
    target_artist_ids, target_city, target_scope, status,
    started_at, completed_at, error_message,
    total_items, processed_items, failed_items,
    process_pid, last_heartbeat_at, result_data
)
SELECT
    id,
    COALESCE(created_at, now()),
    COALESCE(updated_at, now()),
    job_type,
    triggered_by,
    target_artist_ids,
    target_city,
    target_scope,
    status,
    started_at,
    completed_at,
    error_message,
    COALESCE(total_items, 0),
    COALESCE(processed_items, 0),
    COALESCE(failed_items, 0),
    process_pid,
    last_heartbeat_at,
    COALESCE(result_summary, '{}'::jsonb)
FROM pipeline_runs;

-- Drop old tables and their triggers
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS pipeline_runs CASCADE;

-- Drop unused backup table
DROP TABLE IF EXISTS artists_slug_backup CASCADE;

-- Drop old trigger function that referenced pipeline_runs
DROP FUNCTION IF EXISTS update_pipeline_runs_updated_at() CASCADE;
