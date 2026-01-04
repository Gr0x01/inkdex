-- ============================================
-- Marketing Outreach
-- Tracks artist outreach campaigns for growth
-- ============================================

-- Table to track outreach records
CREATE TABLE IF NOT EXISTS marketing_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL DEFAULT 'featured_artist_launch',
  outreach_type TEXT NOT NULL DEFAULT 'instagram_dm',
  status TEXT NOT NULL DEFAULT 'pending',

  -- Generated content
  post_text TEXT,
  post_images TEXT[],

  -- Twins pairing (Phase 2)
  paired_artist_id UUID REFERENCES artists(id),
  similarity_score FLOAT,

  -- Tracking timestamps
  generated_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  dm_sent_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  pro_granted_at TIMESTAMPTZ,
  pro_expires_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(artist_id, campaign_name)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_marketing_outreach_status ON marketing_outreach(status);
CREATE INDEX IF NOT EXISTS idx_marketing_outreach_artist ON marketing_outreach(artist_id);
CREATE INDEX IF NOT EXISTS idx_marketing_outreach_campaign ON marketing_outreach(campaign_name);
CREATE INDEX IF NOT EXISTS idx_marketing_outreach_status_generated ON marketing_outreach(status) WHERE post_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_outreach_pending_claims ON marketing_outreach(artist_id) WHERE claimed_at IS NULL;

-- Status check constraint
ALTER TABLE marketing_outreach ADD CONSTRAINT marketing_outreach_status_check
  CHECK (status IN ('pending', 'generated', 'posted', 'dm_sent', 'claimed', 'converted'));

-- RLS - service role only (admin operations)
ALTER TABLE marketing_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_outreach_service_role"
ON marketing_outreach FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_marketing_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_outreach_updated_at
  BEFORE UPDATE ON marketing_outreach
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_outreach_updated_at();

-- Comments
COMMENT ON TABLE marketing_outreach IS 'Tracks artist outreach campaigns for marketing and growth';
COMMENT ON COLUMN marketing_outreach.status IS 'Workflow stage: pending/generated/posted/dm_sent/claimed/converted';
COMMENT ON COLUMN marketing_outreach.post_images IS 'Array of Supabase Storage URLs for the post images';
COMMENT ON COLUMN marketing_outreach.paired_artist_id IS 'For Design Twins campaigns - the paired artist';
COMMENT ON COLUMN marketing_outreach.similarity_score IS 'CLIP similarity score for twins pairing';
