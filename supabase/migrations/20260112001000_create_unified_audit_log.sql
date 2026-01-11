-- Migration: Create unified_audit_log table
-- Consolidates: admin_audit_log, artist_audit_log, instagram_sync_log, airtable_sync_log, indexnow_submissions

-- Create unified audit log table
CREATE TABLE IF NOT EXISTS unified_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    event_category TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL DEFAULT 'system',
    actor_id TEXT,
    actor_ip TEXT,
    actor_user_agent TEXT,
    resource_type TEXT,
    resource_id UUID,
    resource_secondary_id UUID,
    event_data JSONB DEFAULT '{}',
    status TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    items_processed INT DEFAULT 0,
    items_succeeded INT DEFAULT 0,
    items_failed INT DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_unified_audit_created ON unified_audit_log(created_at DESC);
CREATE INDEX idx_unified_audit_category ON unified_audit_log(event_category, event_type);
CREATE INDEX idx_unified_audit_resource ON unified_audit_log(resource_type, resource_id);
CREATE INDEX idx_unified_audit_actor ON unified_audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_unified_audit_resource_event ON unified_audit_log(resource_id, event_type) WHERE resource_id IS NOT NULL;

-- Enable RLS
ALTER TABLE unified_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role full access to unified_audit_log"
    ON unified_audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read audit logs for their own artists
CREATE POLICY "Artists can read their own audit logs"
    ON unified_audit_log
    FOR SELECT
    TO authenticated
    USING (
        resource_type = 'artist'
        AND resource_id IN (
            SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
        )
    );

-- Migrate data from admin_audit_log
INSERT INTO unified_audit_log (
    created_at, event_category, event_type, actor_type, actor_id,
    actor_ip, actor_user_agent, resource_type, resource_id, event_data
)
SELECT
    COALESCE(created_at, now()),
    'admin',
    action,
    'admin',
    admin_email,
    ip_address,
    user_agent,
    resource_type,
    CASE WHEN resource_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         THEN resource_id::uuid
         ELSE NULL
    END,
    jsonb_build_object('old_value', old_value, 'new_value', new_value)
FROM admin_audit_log;

-- Migrate data from artist_audit_log
INSERT INTO unified_audit_log (
    created_at, event_category, event_type, resource_type, resource_id, event_data
)
SELECT
    created_at,
    'artist',
    action,
    'artist',
    artist_id,
    COALESCE(details, '{}'::jsonb)
FROM artist_audit_log;

-- Migrate data from instagram_sync_log (uses started_at as created_at)
INSERT INTO unified_audit_log (
    created_at, event_category, event_type, actor_type, actor_id,
    resource_type, resource_id, resource_secondary_id,
    status, error_message, started_at, completed_at,
    items_processed, items_succeeded, items_failed
)
SELECT
    COALESCE(started_at, now()),
    'sync',
    'instagram.' || sync_type,
    CASE WHEN sync_type = 'auto' THEN 'cron' ELSE 'user' END,
    user_id::text,
    'artist',
    artist_id,
    user_id,
    status,
    error_message,
    started_at,
    completed_at,
    COALESCE(images_fetched, 0),
    COALESCE(images_added, 0),
    COALESCE(images_skipped, 0)
FROM instagram_sync_log;

-- Migrate data from airtable_sync_log
INSERT INTO unified_audit_log (
    created_at, event_category, event_type, actor_type, actor_id,
    status, started_at, completed_at, items_processed, items_succeeded, event_data
)
SELECT
    COALESCE(started_at, now()),
    'sync',
    'airtable.' || direction,
    CASE WHEN triggered_by = 'cron' THEN 'cron' ELSE 'admin' END,
    triggered_by,
    CASE WHEN errors IS NOT NULL THEN 'partial' ELSE 'success' END,
    started_at,
    completed_at,
    COALESCE(records_processed, 0),
    COALESCE(records_created, 0) + COALESCE(records_updated, 0),
    jsonb_build_object(
        'sync_type', sync_type,
        'records_created', COALESCE(records_created, 0),
        'records_updated', COALESCE(records_updated, 0),
        'errors', errors
    )
FROM airtable_sync_log;

-- Migrate data from indexnow_submissions
INSERT INTO unified_audit_log (
    created_at, event_category, event_type, actor_type, actor_id,
    status, items_processed, event_data
)
SELECT
    COALESCE(submitted_at, now()),
    'seo',
    'indexnow.submit',
    CASE WHEN triggered_by LIKE '%@%' THEN 'admin' ELSE 'system' END,
    triggered_by,
    CASE WHEN response_status >= 200 AND response_status < 300 THEN 'success' ELSE 'failed' END,
    url_count,
    jsonb_build_object(
        'urls', urls,
        'engine', engine,
        'trigger_source', trigger_source,
        'response_status', response_status,
        'response_body', response_body
    )
FROM indexnow_submissions;

-- Drop old tables
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS artist_audit_log CASCADE;
DROP TABLE IF EXISTS instagram_sync_log CASCADE;
DROP TABLE IF EXISTS airtable_sync_log CASCADE;
DROP TABLE IF EXISTS indexnow_submissions CASCADE;
