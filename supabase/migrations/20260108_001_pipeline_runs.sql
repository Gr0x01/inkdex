-- Pipeline Runs: Track admin-triggered pipeline jobs
-- Migration: 20260108_001_pipeline_runs.sql

-- Create pipeline_runs table to track jobs triggered from admin UI
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job type and status
  job_type TEXT NOT NULL CHECK (job_type IN ('scraping', 'processing', 'embeddings', 'index_rebuild')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Who triggered it
  triggered_by TEXT NOT NULL,

  -- Scope (what to process)
  target_scope TEXT NOT NULL DEFAULT 'pending' CHECK (target_scope IN ('pending', 'failed', 'all', 'specific')),
  target_artist_ids UUID[],
  target_city TEXT,

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results/errors
  error_message TEXT,
  result_summary JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created ON pipeline_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_job_type ON pipeline_runs(job_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pipeline_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pipeline_runs_updated_at ON pipeline_runs;
CREATE TRIGGER set_pipeline_runs_updated_at
  BEFORE UPDATE ON pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_runs_updated_at();

-- RLS policies (admin-only access)
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access to pipeline_runs"
  ON pipeline_runs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE pipeline_runs IS 'Tracks pipeline jobs (scraping, embeddings, etc.) triggered from admin UI';
COMMENT ON COLUMN pipeline_runs.job_type IS 'Type of job: scraping, processing, embeddings, index_rebuild';
COMMENT ON COLUMN pipeline_runs.target_scope IS 'Which items to process: pending, failed, all, or specific artist IDs';
COMMENT ON COLUMN pipeline_runs.result_summary IS 'JSON summary of job results (e.g., images scraped, artists processed)';
