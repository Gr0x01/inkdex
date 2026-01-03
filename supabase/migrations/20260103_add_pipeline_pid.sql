-- Add PID tracking to pipeline_runs for process cancellation
ALTER TABLE pipeline_runs ADD COLUMN process_pid INTEGER;

-- Index for quick PID lookups
CREATE INDEX idx_pipeline_runs_pid ON pipeline_runs(process_pid) WHERE process_pid IS NOT NULL;
