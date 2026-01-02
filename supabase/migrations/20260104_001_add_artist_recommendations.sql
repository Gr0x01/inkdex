-- Artist Recommendations Table
-- Audit log for public artist submissions via /add-artist page
-- Phase 4: Add Artist Page
-- Created: 2026-01-04

CREATE TABLE IF NOT EXISTS artist_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Instagram profile data
  instagram_handle TEXT NOT NULL,
  instagram_id TEXT,
  bio TEXT,
  follower_count INTEGER,

  -- Classifier results
  classifier_result JSONB,

  -- Submission metadata
  submitter_ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_artist_recommendations_instagram_handle
  ON artist_recommendations(instagram_handle);

CREATE INDEX idx_artist_recommendations_status
  ON artist_recommendations(status);

CREATE INDEX idx_artist_recommendations_created_at
  ON artist_recommendations(created_at DESC);

-- Updated at trigger
CREATE TRIGGER update_artist_recommendations_updated_at
  BEFORE UPDATE ON artist_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE artist_recommendations ENABLE ROW LEVEL SECURITY;

-- Public can insert (rate limited by API)
CREATE POLICY "Anyone can submit artist recommendations"
  ON artist_recommendations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role can manage all records (for API + future admin)
CREATE POLICY "Service role can manage all recommendations"
  ON artist_recommendations
  FOR ALL
  TO service_role
  USING (true);

-- Comments for documentation
COMMENT ON TABLE artist_recommendations IS 'Audit log of public artist submissions via /add-artist page. Classifier gate ensures quality before artist creation.';
COMMENT ON COLUMN artist_recommendations.classifier_result IS 'JSON: { passed: boolean, method: "bio"|"image", confidence: number, details: string }';
COMMENT ON COLUMN artist_recommendations.status IS 'Status: "approved" (artist created, scraping queued), "rejected" (failed classifier), "duplicate" (already exists)';
COMMENT ON COLUMN artist_recommendations.artist_id IS 'Foreign key to created artist record (NULL if rejected or duplicate)';
