-- IndexNow submission tracking for SEO notifications
-- Tracks submissions to Bing and Yandex for auditing and debugging

CREATE TABLE IF NOT EXISTS indexnow_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  urls TEXT[] NOT NULL,
  url_count INTEGER NOT NULL,
  engine TEXT NOT NULL,  -- 'bing', 'yandex', 'all'
  trigger_source TEXT NOT NULL,  -- 'artist_created', 'content_updated', 'admin_manual', 'city_launched'
  response_status INTEGER,
  response_body JSONB,
  triggered_by TEXT,  -- Admin email or 'system'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying recent submissions
CREATE INDEX IF NOT EXISTS idx_indexnow_submissions_date
  ON indexnow_submissions(submitted_at DESC);

-- Index for filtering by trigger source
CREATE INDEX IF NOT EXISTS idx_indexnow_submissions_source
  ON indexnow_submissions(trigger_source);

-- Comment on table
COMMENT ON TABLE indexnow_submissions IS 'Tracks IndexNow submissions to search engines for SEO auditing';

-- Enable Row Level Security
-- This table is admin-only, accessed via service role key which bypasses RLS
-- No policies = deny all access from anon/authenticated users
ALTER TABLE indexnow_submissions ENABLE ROW LEVEL SECURITY;
