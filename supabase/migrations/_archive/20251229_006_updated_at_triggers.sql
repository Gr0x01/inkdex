-- Add automatic updated_at triggers
-- Automatically maintains timestamp when records are updated

-- ============================================
-- Create trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Apply triggers to tables with updated_at
-- ============================================

-- users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- artists table
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- style_seeds table
CREATE TRIGGER update_style_seeds_updated_at
  BEFORE UPDATE ON style_seeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
