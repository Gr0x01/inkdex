-- Artist Locations Table (International Support)
-- Supports multiple locations per artist with tier-based limits:
-- - Free tier: 1 location (US: city OR state, International: city + country)
-- - Pro tier: Up to 20 locations worldwide

-- Create artist_locations table
CREATE TABLE artist_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,

  -- Location fields (international support)
  city TEXT,                    -- NULL for state/country-only locations
  region TEXT,                  -- State/Province/Region (e.g., 'TX', 'Ontario', 'England')
  country_code TEXT NOT NULL DEFAULT 'US' CHECK (LENGTH(country_code) = 2),

  -- Location type for validation and display
  -- 'city' = specific city (city required)
  -- 'region' = state/province level (region required, no city)
  -- 'country' = country-wide (only country_code)
  location_type TEXT NOT NULL CHECK (location_type IN ('city', 'region', 'country')),

  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- City type requires city field
  CONSTRAINT city_required_for_city_type
    CHECK (location_type != 'city' OR city IS NOT NULL),

  -- Region type requires region field
  CONSTRAINT region_required_for_region_type
    CHECK (location_type != 'region' OR region IS NOT NULL)
);

-- Prevent duplicate locations for same artist
-- Uses functional unique index to handle NULLs properly
CREATE UNIQUE INDEX unique_artist_location
  ON artist_locations (
    artist_id,
    LOWER(COALESCE(city, '')),
    LOWER(COALESCE(region, '')),
    country_code
  );

-- Performance indexes
CREATE INDEX idx_artist_locations_artist ON artist_locations(artist_id);
CREATE INDEX idx_artist_locations_city ON artist_locations(LOWER(city)) WHERE city IS NOT NULL;
CREATE INDEX idx_artist_locations_region ON artist_locations(LOWER(region)) WHERE region IS NOT NULL;
CREATE INDEX idx_artist_locations_country ON artist_locations(country_code);
CREATE INDEX idx_artist_locations_primary ON artist_locations(artist_id) WHERE is_primary = TRUE;
-- Composite index for city + region queries (common search pattern)
CREATE INDEX idx_artist_locations_city_region ON artist_locations(LOWER(city), region) WHERE city IS NOT NULL;

-- Ensure exactly one primary location per artist
CREATE UNIQUE INDEX unique_primary_location
  ON artist_locations (artist_id)
  WHERE is_primary = TRUE;

-- Enable RLS
ALTER TABLE artist_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can read locations (public profiles)
CREATE POLICY "artist_locations_select_public" ON artist_locations
  FOR SELECT USING (true);

-- Artists can manage their own locations
CREATE POLICY "artist_locations_insert_own" ON artist_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artist_locations.artist_id
        AND a.claimed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "artist_locations_update_own" ON artist_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artist_locations.artist_id
        AND a.claimed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "artist_locations_delete_own" ON artist_locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artist_locations.artist_id
        AND a.claimed_by_user_id = auth.uid()
    )
  );

-- Function to enforce location limits based on tier
CREATE OR REPLACE FUNCTION check_location_limit()
RETURNS TRIGGER AS $$
DECLARE
  is_pro BOOLEAN;
  location_count INTEGER;
  max_locations INTEGER;
BEGIN
  -- Get artist's pro status
  SELECT a.is_pro INTO is_pro
  FROM artists a
  WHERE a.id = NEW.artist_id;

  -- Set limit based on tier
  max_locations := CASE WHEN is_pro THEN 20 ELSE 1 END;

  -- Count existing locations (excluding current for updates)
  SELECT COUNT(*) INTO location_count
  FROM artist_locations
  WHERE artist_id = NEW.artist_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF location_count >= max_locations THEN
    RAISE EXCEPTION 'Location limit reached. % tier allows % location(s).',
      CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END, max_locations;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_location_limit
  BEFORE INSERT OR UPDATE ON artist_locations
  FOR EACH ROW
  EXECUTE FUNCTION check_location_limit();

-- Function to sync primary location to artists table (backward compatibility)
CREATE OR REPLACE FUNCTION sync_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  -- When a location is marked as primary, update artists table
  IF NEW.is_primary = TRUE THEN
    UPDATE artists
    SET
      city = COALESCE(NEW.city, NEW.region, ''),
      state = CASE
        WHEN NEW.country_code = 'US' THEN COALESCE(NEW.region, '')
        ELSE NEW.country_code
      END
    WHERE id = NEW.artist_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_primary_location_trigger
  AFTER INSERT OR UPDATE ON artist_locations
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION sync_primary_location();

-- Migrate existing artists to artist_locations
-- All existing artists are US-based with city/state
INSERT INTO artist_locations (artist_id, city, region, country_code, location_type, is_primary, display_order)
SELECT
  id as artist_id,
  city,
  state as region,
  'US' as country_code,
  CASE
    WHEN city IS NOT NULL AND city != '' THEN 'city'
    WHEN state IS NOT NULL AND state != '' THEN 'region'
    ELSE 'country'
  END as location_type,
  TRUE as is_primary,
  0 as display_order
FROM artists
WHERE city IS NOT NULL AND city != ''
ON CONFLICT DO NOTHING;

-- Helper function to get formatted location string
CREATE OR REPLACE FUNCTION format_location(
  p_city TEXT,
  p_region TEXT,
  p_country_code TEXT
)
RETURNS TEXT AS $$
BEGIN
  IF p_country_code = 'US' THEN
    -- US format: "Austin, TX" or just "TX"
    IF p_city IS NOT NULL AND p_city != '' THEN
      RETURN p_city || ', ' || COALESCE(p_region, '');
    ELSIF p_region IS NOT NULL AND p_region != '' THEN
      RETURN p_region || ' (statewide)';
    ELSE
      RETURN 'United States';
    END IF;
  ELSE
    -- International format: "Tokyo, Japan" or "London, England, UK"
    IF p_city IS NOT NULL AND p_city != '' THEN
      IF p_region IS NOT NULL AND p_region != '' THEN
        RETURN p_city || ', ' || p_region || ', ' || p_country_code;
      ELSE
        RETURN p_city || ', ' || p_country_code;
      END IF;
    ELSIF p_region IS NOT NULL AND p_region != '' THEN
      RETURN p_region || ', ' || p_country_code;
    ELSE
      RETURN p_country_code;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get all locations for an artist (for API responses)
CREATE OR REPLACE FUNCTION get_artist_locations(p_artist_id UUID)
RETURNS TABLE (
  id UUID,
  city TEXT,
  region TEXT,
  country_code TEXT,
  location_type TEXT,
  is_primary BOOLEAN,
  display_order INTEGER,
  formatted TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.city,
    al.region,
    al.country_code,
    al.location_type,
    al.is_primary,
    al.display_order,
    format_location(al.city, al.region, al.country_code) as formatted
  FROM artist_locations al
  WHERE al.artist_id = p_artist_id
  ORDER BY al.is_primary DESC, al.display_order ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Atomic location update function (prevents race conditions)
-- Deletes existing locations and inserts new ones in a single transaction
CREATE OR REPLACE FUNCTION update_artist_locations(
  p_artist_id UUID,
  p_locations JSONB
)
RETURNS VOID AS $$
DECLARE
  loc JSONB;
  i INTEGER := 0;
BEGIN
  -- Verify caller owns this artist
  IF NOT EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = p_artist_id
      AND a.claimed_by_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this artist profile';
  END IF;

  -- Delete all existing locations for this artist
  DELETE FROM artist_locations WHERE artist_id = p_artist_id;

  -- Insert new locations
  FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
  LOOP
    INSERT INTO artist_locations (
      artist_id,
      city,
      region,
      country_code,
      location_type,
      is_primary,
      display_order
    ) VALUES (
      p_artist_id,
      loc->>'city',
      loc->>'region',
      COALESCE(loc->>'country_code', 'US'),
      loc->>'location_type',
      COALESCE((loc->>'is_primary')::BOOLEAN, i = 0),
      COALESCE((loc->>'display_order')::INTEGER, i)
    );
    i := i + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON artist_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON artist_locations TO authenticated;
GRANT EXECUTE ON FUNCTION format_location TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_artist_locations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_artist_locations TO authenticated;
