-- Create locations table for city/state/country data
-- Supports multi-country location selection with efficient search
-- Data source: SimpleMaps (https://simplemaps.com/data/us-cities)

-- ============================================
-- Create locations table
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- City information
  city text NOT NULL,
  city_ascii text NOT NULL,  -- ASCII version for search (no accents)

  -- State/Region (for countries with states/provinces)
  state_code text,            -- US: "TX", "CA" | Canada: "ON", "BC" | null for others
  state_name text,            -- Full state name: "Texas", "California"

  -- Country
  country_code char(2) NOT NULL,  -- ISO 3166-1 alpha-2: "US", "CA", "MX", "GB"
  country_name text NOT NULL,

  -- Metadata
  population integer,
  lat decimal(10, 7),
  lng decimal(10, 7),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Indexes for fast search and filtering
-- ============================================

-- Primary search: city name + country
CREATE INDEX idx_locations_city_country
ON locations(city_ascii, country_code);

-- Filter by country only
CREATE INDEX idx_locations_country
ON locations(country_code);

-- Filter by state (for US states, Canadian provinces, etc.)
CREATE INDEX idx_locations_state
ON locations(state_code)
WHERE state_code IS NOT NULL;

-- Geospatial index (for future radius searches)
CREATE INDEX idx_locations_coordinates
ON locations(lat, lng);

-- Full-text search on city names
CREATE INDEX idx_locations_city_search
ON locations USING gin(to_tsvector('english', city_ascii));

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE locations IS
  'Global database of cities for location selection. Initially populated with US cities from SimpleMaps.';

COMMENT ON COLUMN locations.city_ascii IS
  'ASCII version of city name (no accents/special chars) for reliable searching';

COMMENT ON COLUMN locations.state_code IS
  'State/province/region code. US uses 2-letter codes (TX, CA). Null for countries without states.';

COMMENT ON COLUMN locations.population IS
  'City population. Used for filtering and sorting by relevance.';

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Public read access (locations are public data)
CREATE POLICY "Locations are publicly readable"
  ON locations
  FOR SELECT
  TO public
  USING (true);

-- Only service role can insert/update (data maintenance)
CREATE POLICY "Only service role can modify locations"
  ON locations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
