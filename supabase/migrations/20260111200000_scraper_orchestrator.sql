-- Scraper Orchestrator Schema
-- Multi-instance scraper with shared state, work distribution, and IP rotation

-- =============================================================================
-- TABLE: scraper_workers
-- Worker instance registration and health tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS scraper_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name TEXT UNIQUE NOT NULL,
  vultr_instance_id TEXT,
  ip_address INET,
  status TEXT DEFAULT 'provisioning'
    CHECK (status IN ('provisioning', 'active', 'rotating', 'offline', 'terminated')),
  last_heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT now(),
  current_city_slug TEXT,
  current_artist_handle TEXT,
  artists_processed INTEGER DEFAULT 0,
  images_processed INTEGER DEFAULT 0,
  consecutive_401s INTEGER DEFAULT 0,
  total_401s_lifetime INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraper_workers_status ON scraper_workers(status);
CREATE INDEX IF NOT EXISTS idx_scraper_workers_heartbeat ON scraper_workers(last_heartbeat_at);

-- =============================================================================
-- TABLE: scraper_city_queue
-- Work distribution across cities
-- =============================================================================
CREATE TABLE IF NOT EXISTS scraper_city_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug TEXT UNIQUE NOT NULL,
  city_name TEXT NOT NULL,
  region TEXT,
  country_code CHAR(2) NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  claimed_by_worker_id UUID REFERENCES scraper_workers(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  artists_discovered INTEGER DEFAULT 0,
  artists_processed INTEGER DEFAULT 0,
  last_processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraper_city_queue_status ON scraper_city_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_city_queue_worker ON scraper_city_queue(claimed_by_worker_id);

-- =============================================================================
-- TABLE: scraper_artist_queue
-- Individual artist work items
-- =============================================================================
CREATE TABLE IF NOT EXISTS scraper_artist_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_handle TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  claimed_by_worker_id UUID REFERENCES scraper_workers(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  images_scraped INTEGER DEFAULT 0,
  follower_count INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  artist_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_handle_per_city UNIQUE (instagram_handle, city_slug)
);

CREATE INDEX IF NOT EXISTS idx_scraper_artist_queue_status ON scraper_artist_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraper_artist_queue_city ON scraper_artist_queue(city_slug, status);
CREATE INDEX IF NOT EXISTS idx_scraper_artist_queue_worker ON scraper_artist_queue(claimed_by_worker_id);

-- =============================================================================
-- TABLE: scraper_rate_limit_events
-- Track rate limit events for IP rotation decisions
-- =============================================================================
CREATE TABLE IF NOT EXISTS scraper_rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES scraper_workers(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  error_code TEXT,
  error_message TEXT,
  artist_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_worker ON scraper_rate_limit_events(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_ip ON scraper_rate_limit_events(ip_address, created_at DESC);

-- =============================================================================
-- TABLE: scraper_orchestrator_log
-- Orchestrator actions audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS scraper_orchestrator_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  worker_id UUID REFERENCES scraper_workers(id) ON DELETE SET NULL,
  worker_name TEXT,
  old_instance_id TEXT,
  new_instance_id TEXT,
  old_ip INET,
  new_ip INET,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_log_action ON scraper_orchestrator_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_log_worker ON scraper_orchestrator_log(worker_id, created_at DESC);

-- =============================================================================
-- RPC: claim_next_city
-- Atomically claim the highest priority pending city
-- =============================================================================
CREATE OR REPLACE FUNCTION claim_next_city(p_worker_id UUID)
RETURNS TABLE (
  id UUID,
  city_slug TEXT,
  city_name TEXT,
  region TEXT,
  country_code TEXT,
  priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city scraper_city_queue;
BEGIN
  -- Get and claim the highest priority pending city
  UPDATE scraper_city_queue
  SET
    status = 'in_progress',
    claimed_by_worker_id = p_worker_id,
    claimed_at = now(),
    started_at = COALESCE(started_at, now()),
    updated_at = now()
  WHERE scraper_city_queue.id = (
    SELECT sq.id FROM scraper_city_queue sq
    WHERE sq.status = 'pending'
    ORDER BY sq.priority DESC, sq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO v_city;

  IF v_city.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_city.id,
    v_city.city_slug,
    v_city.city_name,
    v_city.region,
    v_city.country_code::TEXT,
    v_city.priority;
END;
$$;

-- =============================================================================
-- RPC: claim_next_artist
-- Atomically claim next artist in a city
-- =============================================================================
CREATE OR REPLACE FUNCTION claim_next_artist(p_worker_id UUID, p_city_slug TEXT)
RETURNS TABLE (
  id UUID,
  instagram_handle TEXT,
  city_slug TEXT,
  retry_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artist scraper_artist_queue;
BEGIN
  UPDATE scraper_artist_queue
  SET
    status = 'in_progress',
    claimed_by_worker_id = p_worker_id,
    claimed_at = now()
  WHERE scraper_artist_queue.id = (
    SELECT sq.id FROM scraper_artist_queue sq
    WHERE sq.city_slug = p_city_slug
      AND sq.status = 'pending'
    ORDER BY sq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO v_artist;

  IF v_artist.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_artist.id,
    v_artist.instagram_handle,
    v_artist.city_slug,
    v_artist.retry_count;
END;
$$;

-- =============================================================================
-- RPC: complete_artist
-- Mark artist as completed with results
-- =============================================================================
CREATE OR REPLACE FUNCTION complete_artist(
  p_artist_queue_id UUID,
  p_status TEXT,
  p_images_scraped INTEGER DEFAULT 0,
  p_follower_count INTEGER DEFAULT NULL,
  p_artist_id UUID DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scraper_artist_queue
  SET
    status = p_status,
    completed_at = now(),
    images_scraped = p_images_scraped,
    follower_count = p_follower_count,
    artist_id = p_artist_id,
    error_message = p_error_message
  WHERE id = p_artist_queue_id;

  -- Update city progress
  UPDATE scraper_city_queue
  SET
    artists_processed = artists_processed + 1,
    last_processed_at = now(),
    updated_at = now()
  WHERE city_slug = (
    SELECT city_slug FROM scraper_artist_queue WHERE id = p_artist_queue_id
  );
END;
$$;

-- =============================================================================
-- RPC: release_stale_claims
-- Release claims from dead/stale workers
-- =============================================================================
CREATE OR REPLACE FUNCTION release_stale_claims(p_stale_threshold_minutes INTEGER DEFAULT 10)
RETURNS TABLE (
  released_artists INTEGER,
  released_cities INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released_artists INTEGER := 0;
  v_released_cities INTEGER := 0;
  v_threshold INTERVAL;
BEGIN
  v_threshold := (p_stale_threshold_minutes || ' minutes')::INTERVAL;

  -- Release stale artist claims
  UPDATE scraper_artist_queue
  SET
    status = 'pending',
    claimed_by_worker_id = NULL,
    claimed_at = NULL,
    retry_count = retry_count + 1
  WHERE status = 'in_progress'
    AND claimed_at < now() - v_threshold;
  GET DIAGNOSTICS v_released_artists = ROW_COUNT;

  -- Release stale city claims (only if no artists processed recently)
  UPDATE scraper_city_queue
  SET
    status = 'pending',
    claimed_by_worker_id = NULL,
    claimed_at = NULL,
    retry_count = retry_count + 1
  WHERE status = 'in_progress'
    AND claimed_at < now() - v_threshold
    AND (last_processed_at IS NULL OR last_processed_at < now() - v_threshold);
  GET DIAGNOSTICS v_released_cities = ROW_COUNT;

  RETURN QUERY SELECT v_released_artists, v_released_cities;
END;
$$;

-- =============================================================================
-- RPC: register_worker
-- Register a new worker instance
-- =============================================================================
CREATE OR REPLACE FUNCTION register_worker(
  p_worker_name TEXT,
  p_vultr_instance_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker_id UUID;
BEGIN
  INSERT INTO scraper_workers (
    worker_name,
    vultr_instance_id,
    ip_address,
    status,
    started_at,
    last_heartbeat_at
  )
  VALUES (
    p_worker_name,
    p_vultr_instance_id,
    p_ip_address,
    'active',
    now(),
    now()
  )
  ON CONFLICT (worker_name) DO UPDATE
  SET
    vultr_instance_id = COALESCE(p_vultr_instance_id, scraper_workers.vultr_instance_id),
    ip_address = COALESCE(p_ip_address, scraper_workers.ip_address),
    status = 'active',
    started_at = now(),
    last_heartbeat_at = now(),
    consecutive_401s = 0,
    updated_at = now()
  RETURNING id INTO v_worker_id;

  RETURN v_worker_id;
END;
$$;

-- =============================================================================
-- RPC: worker_heartbeat
-- Update worker heartbeat and current status
-- =============================================================================
CREATE OR REPLACE FUNCTION worker_heartbeat(
  p_worker_id UUID,
  p_current_city_slug TEXT DEFAULT NULL,
  p_current_artist_handle TEXT DEFAULT NULL,
  p_artists_processed INTEGER DEFAULT NULL,
  p_images_processed INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scraper_workers
  SET
    last_heartbeat_at = now(),
    current_city_slug = COALESCE(p_current_city_slug, current_city_slug),
    current_artist_handle = COALESCE(p_current_artist_handle, current_artist_handle),
    artists_processed = COALESCE(p_artists_processed, artists_processed),
    images_processed = COALESCE(p_images_processed, images_processed),
    updated_at = now()
  WHERE id = p_worker_id;
END;
$$;

-- =============================================================================
-- RPC: report_rate_limit
-- Report a rate limit event and increment counter
-- =============================================================================
CREATE OR REPLACE FUNCTION report_rate_limit(
  p_worker_id UUID,
  p_error_code TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_artist_handle TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip INET;
  v_consecutive INTEGER;
BEGIN
  -- Get worker IP
  SELECT ip_address INTO v_ip FROM scraper_workers WHERE id = p_worker_id;

  -- Insert rate limit event
  INSERT INTO scraper_rate_limit_events (
    worker_id,
    ip_address,
    error_code,
    error_message,
    artist_handle
  )
  VALUES (
    p_worker_id,
    v_ip,
    p_error_code,
    p_error_message,
    p_artist_handle
  );

  -- Increment consecutive counter and get new value
  UPDATE scraper_workers
  SET
    consecutive_401s = consecutive_401s + 1,
    total_401s_lifetime = total_401s_lifetime + 1,
    last_error = p_error_message,
    updated_at = now()
  WHERE id = p_worker_id
  RETURNING consecutive_401s INTO v_consecutive;

  RETURN v_consecutive;
END;
$$;

-- =============================================================================
-- RPC: reset_rate_limit_counter
-- Reset consecutive 401 counter after successful scrape
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_rate_limit_counter(p_worker_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scraper_workers
  SET
    consecutive_401s = 0,
    last_error = NULL,
    updated_at = now()
  WHERE id = p_worker_id
    AND consecutive_401s > 0;
END;
$$;

-- =============================================================================
-- RPC: get_fleet_status
-- Get status of all workers for admin panel
-- =============================================================================
CREATE OR REPLACE FUNCTION get_fleet_status()
RETURNS TABLE (
  id UUID,
  worker_name TEXT,
  vultr_instance_id TEXT,
  ip_address INET,
  status TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  current_city_slug TEXT,
  current_artist_handle TEXT,
  artists_processed INTEGER,
  images_processed INTEGER,
  consecutive_401s INTEGER,
  total_401s_lifetime INTEGER,
  last_error TEXT,
  uptime_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.worker_name,
    w.vultr_instance_id,
    w.ip_address,
    w.status,
    w.last_heartbeat_at,
    w.started_at,
    w.current_city_slug,
    w.current_artist_handle,
    w.artists_processed,
    w.images_processed,
    w.consecutive_401s,
    w.total_401s_lifetime,
    w.last_error,
    EXTRACT(EPOCH FROM (now() - w.started_at))::INTEGER as uptime_seconds
  FROM scraper_workers w
  WHERE w.status != 'terminated'
  ORDER BY w.worker_name;
END;
$$;

-- =============================================================================
-- RPC: get_queue_stats
-- Get queue statistics for admin panel
-- =============================================================================
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE (
  cities_pending INTEGER,
  cities_in_progress INTEGER,
  cities_completed INTEGER,
  artists_pending INTEGER,
  artists_in_progress INTEGER,
  artists_completed INTEGER,
  artists_failed INTEGER,
  total_images_scraped BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM scraper_city_queue WHERE status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM scraper_city_queue WHERE status = 'in_progress'),
    (SELECT COUNT(*)::INTEGER FROM scraper_city_queue WHERE status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM scraper_artist_queue WHERE status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM scraper_artist_queue WHERE status = 'in_progress'),
    (SELECT COUNT(*)::INTEGER FROM scraper_artist_queue WHERE status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM scraper_artist_queue WHERE status = 'failed'),
    (SELECT COALESCE(SUM(images_scraped), 0) FROM scraper_artist_queue);
END;
$$;

-- =============================================================================
-- RPC: log_orchestrator_action
-- Log an orchestrator action
-- =============================================================================
CREATE OR REPLACE FUNCTION log_orchestrator_action(
  p_action TEXT,
  p_worker_id UUID DEFAULT NULL,
  p_worker_name TEXT DEFAULT NULL,
  p_old_instance_id TEXT DEFAULT NULL,
  p_new_instance_id TEXT DEFAULT NULL,
  p_old_ip INET DEFAULT NULL,
  p_new_ip INET DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO scraper_orchestrator_log (
    action,
    worker_id,
    worker_name,
    old_instance_id,
    new_instance_id,
    old_ip,
    new_ip,
    reason,
    details
  )
  VALUES (
    p_action,
    p_worker_id,
    p_worker_name,
    p_old_instance_id,
    p_new_instance_id,
    p_old_ip,
    p_new_ip,
    p_reason,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE scraper_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_city_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_artist_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_orchestrator_log ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (may have been created without TO service_role)
DROP POLICY IF EXISTS "Service role full access" ON scraper_workers;
DROP POLICY IF EXISTS "Service role full access" ON scraper_city_queue;
DROP POLICY IF EXISTS "Service role full access" ON scraper_artist_queue;
DROP POLICY IF EXISTS "Service role full access" ON scraper_rate_limit_events;
DROP POLICY IF EXISTS "Service role full access" ON scraper_orchestrator_log;

-- Service role has full access (orchestrator and workers use service key)
-- Note: TO service_role restricts to service role only
CREATE POLICY "Service role full access" ON scraper_workers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON scraper_city_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON scraper_artist_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON scraper_rate_limit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON scraper_orchestrator_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE scraper_workers IS 'Worker instances for distributed scraping';
COMMENT ON TABLE scraper_city_queue IS 'Cities to process, claimed by workers';
COMMENT ON TABLE scraper_artist_queue IS 'Artists to scrape, claimed by workers';
COMMENT ON TABLE scraper_rate_limit_events IS 'Rate limit events for IP rotation decisions';
COMMENT ON TABLE scraper_orchestrator_log IS 'Audit log for orchestrator actions';
