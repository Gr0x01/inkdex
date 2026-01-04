-- Pipeline Heartbeat for Stale Job Detection
-- Adds last_heartbeat_at column to detect stuck/stale pipeline jobs

-- Add heartbeat column to pipeline_runs
ALTER TABLE pipeline_runs
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Add index for efficient stale job queries
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_heartbeat
ON pipeline_runs (status, last_heartbeat_at)
WHERE status IN ('pending', 'running');

-- Comment explaining the column
COMMENT ON COLUMN pipeline_runs.last_heartbeat_at IS
'Last heartbeat timestamp from the running job. Used to detect stale/stuck jobs - if no heartbeat for 5+ minutes while status is running, job is considered stale and auto-cancelled.';
