-- Discovery Queries Cache Table
-- Prevents duplicate API calls and tracks query performance

CREATE TABLE IF NOT EXISTS discovery_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  city TEXT NOT NULL,
  source TEXT NOT NULL, -- 'tavily' or 'google_places'
  results_count INTEGER DEFAULT 0,
  artists_found TEXT[], -- Array of Instagram handles discovered
  api_cost_estimate DECIMAL(10, 4), -- Track costs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate queries
  UNIQUE(query, city, source)
);

-- Index for fast lookups
CREATE INDEX idx_discovery_queries_city ON discovery_queries(city);
CREATE INDEX idx_discovery_queries_source ON discovery_queries(source);
CREATE INDEX idx_discovery_queries_created ON discovery_queries(created_at DESC);

-- RLS: Service role only
ALTER TABLE discovery_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON discovery_queries FOR ALL
  USING (auth.role() = 'service_role');
