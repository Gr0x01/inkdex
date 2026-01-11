---
Last-Updated: 2026-01-11
Maintainer: RB
Status: In Progress
---

# Database Schema Consolidation Plan (Full Cleanup)

## Summary

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Tables | 38 | 30 | -8 |
| SQL Functions | ~65 | ~55 | -10 |

---

## Part A: Table Consolidation

### A1: Audit/Pipeline Tables (7 → 2)

| Old Tables | New Table |
|------------|-----------|
| `admin_audit_log`, `artist_audit_log`, `instagram_sync_log`, `airtable_sync_log`, `indexnow_submissions` | `unified_audit_log` |
| `pipeline_runs`, `scraping_jobs` | `pipeline_jobs` |

### A2: Drop Unused Tables (-3)

| Table | Status |
|-------|--------|
| `artists_slug_backup` | One-time backup from Jan 2025 |
| `mining_candidates` | Already dropped (migration 20260111210000) |
| `follower_mining_runs` | Already dropped (migration 20260111210000) |
| `hashtag_mining_runs` | Already dropped (migration 20260111210000) |

### A3: Keep As-Is (Already Well-Designed)

| Table | Reason |
|-------|--------|
| `claim_attempts` | **Used by `claim_artist_profile` RPC** (called from `/claim/verify`) |
| `email_log` | Different lifecycle (90-day cleanup) |
| `artist_analytics` | Core Pro feature - daily totals |
| `portfolio_image_analytics` | Core Pro feature - per-image |
| `search_appearances` | Core - search result tracking |
| `searches` | Core - user search history |
| `marketing_outreach` | Active campaign workflow |
| `discovery_queries` | Audit trail for discovery scripts |

---

## Part B: Function Consolidation

### B1: Increment Functions (6 → 1) - HIGH PRIORITY

**Current (6 functions):**
- `increment_profile_view(artist_id)`
- `increment_image_view(image_id)`
- `increment_instagram_click(artist_id)`
- `increment_booking_click(artist_id)`
- `increment_search_appearances(artist_ids[])` - unused
- `increment_pipeline_progress(run_id, processed, failed)` - unused

**New (1 function):**
```sql
CREATE OR REPLACE FUNCTION increment_analytics(
  p_event_type text,  -- 'profile_view', 'image_view', 'instagram_click', 'booking_click'
  p_artist_id uuid DEFAULT NULL,
  p_image_id uuid DEFAULT NULL
) RETURNS void;
```

**Files to update:**
- `app/api/analytics/track/route.ts` - Replace 4 RPC calls with 1

### B2: Location Count Functions (5 → 1) - HIGH PRIORITY

**Current (5 functions):**
- `get_regions_with_counts(country_code)`
- `get_countries_with_counts()`
- `get_cities_with_counts(min_count, country_code, region)`
- `get_state_cities_with_counts(state_code)`
- `get_all_cities_with_min_artists(min_count)` - **BUG: missing GDPR check**

**New (1 function):**
```sql
CREATE OR REPLACE FUNCTION get_location_counts(
  p_grouping text,       -- 'regions', 'countries', 'cities', 'state_cities', 'all_cities'
  p_country_code text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_state_code text DEFAULT NULL,
  p_min_count int DEFAULT 1
) RETURNS TABLE (location_code text, display_name text, artist_count bigint);
```

**Files to update:**
- `lib/supabase/queries.ts` - Update 5 wrapper functions
- `supabase/functions/location/location_counts.sql` - Consolidate + fix GDPR bug

### B3: Style/Tag Triggers - LEAVE AS-IS (Low Priority)

The 4 trigger functions are already well-architected. Only fix:
- **Taxonomy bug** in `recompute_artist_styles_on_image_delete` - hardcodes 'technique' instead of using actual taxonomy

---

## Development Workflow

### Step 1: Create Feature Branch
```bash
git checkout -b feature/db-consolidation
```

### Step 2: Start Local Supabase
```bash
npm run db:local:start
npm run db:local:reset
```

### Step 3: Verify Mining Tables Already Dropped
```sql
-- Run in local Supabase Studio
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('mining_candidates', 'follower_mining_runs', 'hashtag_mining_runs');
-- Should return 0 rows
```

### Step 4: Create Migrations + Update Code
```bash
# Apply migrations to local
npx supabase db push --local

# Update code
npm run dev
npm run test:run
npm run lint
npm run type-check
```

### Step 5: Test on Staging → Merge to Main

---

## Migration Files

### Migration 1: `20260112_001_create_unified_audit_log.sql`

```sql
-- Create unified audit log
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

CREATE INDEX idx_audit_created ON unified_audit_log(created_at DESC);
CREATE INDEX idx_audit_category ON unified_audit_log(event_category, event_type);
CREATE INDEX idx_audit_resource ON unified_audit_log(resource_type, resource_id);

-- Migrate data from old tables
INSERT INTO unified_audit_log (created_at, event_category, event_type, actor_type, actor_id, actor_ip, actor_user_agent, resource_type, resource_id, event_data)
SELECT created_at, 'admin', action, 'admin', admin_email, ip_address, user_agent, resource_type,
       CASE WHEN resource_id ~ '^[0-9a-f-]{36}$' THEN resource_id::uuid ELSE NULL END,
       jsonb_build_object('old_value', old_value, 'new_value', new_value)
FROM admin_audit_log;

INSERT INTO unified_audit_log (created_at, event_category, event_type, resource_type, resource_id, event_data)
SELECT created_at, 'artist', action, 'artist', artist_id, details
FROM artist_audit_log;

INSERT INTO unified_audit_log (created_at, event_category, event_type, actor_type, actor_id, resource_type, resource_id, resource_secondary_id, status, error_message, started_at, completed_at, items_processed, items_succeeded, items_failed)
SELECT created_at, 'sync', 'instagram.' || sync_type,
       CASE WHEN sync_type = 'auto' THEN 'cron' ELSE 'user' END,
       user_id::text, 'artist', artist_id, user_id, status, error_message, started_at, completed_at,
       images_fetched, images_added, images_skipped
FROM instagram_sync_log;

INSERT INTO unified_audit_log (created_at, event_category, event_type, actor_type, actor_id, status, started_at, completed_at, items_processed, items_succeeded, event_data)
SELECT started_at, 'sync', 'airtable.' || direction,
       CASE WHEN triggered_by = 'cron' THEN 'cron' ELSE 'admin' END,
       triggered_by,
       CASE WHEN errors IS NOT NULL THEN 'partial' ELSE 'success' END,
       started_at, completed_at, records_processed, records_created + records_updated,
       jsonb_build_object('sync_type', sync_type, 'records_created', records_created, 'records_updated', records_updated, 'errors', errors)
FROM airtable_sync_log;

INSERT INTO unified_audit_log (created_at, event_category, event_type, actor_type, actor_id, status, items_processed, event_data)
SELECT submitted_at, 'seo', 'indexnow.submit',
       CASE WHEN triggered_by LIKE '%@%' THEN 'admin' ELSE 'system' END,
       triggered_by,
       CASE WHEN response_status >= 200 AND response_status < 300 THEN 'success' ELSE 'failed' END,
       url_count,
       jsonb_build_object('urls', urls, 'engine', engine, 'trigger_source', trigger_source, 'response_status', response_status)
FROM indexnow_submissions;

-- Drop old tables
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS artist_audit_log CASCADE;
DROP TABLE IF EXISTS instagram_sync_log CASCADE;
DROP TABLE IF EXISTS airtable_sync_log CASCADE;
DROP TABLE IF EXISTS indexnow_submissions CASCADE;
```

### Migration 2: `20260112_002_create_pipeline_jobs.sql`

```sql
-- Create unified pipeline jobs
CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    job_type TEXT NOT NULL,
    triggered_by TEXT NOT NULL,
    artist_id UUID,
    target_artist_ids UUID[],
    target_city TEXT,
    target_scope TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending' NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    process_pid INT,
    last_heartbeat_at TIMESTAMPTZ,
    result_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_jobs_status ON pipeline_jobs(status);
CREATE INDEX idx_jobs_created ON pipeline_jobs(created_at DESC);
CREATE INDEX idx_jobs_artist ON pipeline_jobs(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX idx_jobs_type_status ON pipeline_jobs(job_type, status);
CREATE INDEX idx_jobs_heartbeat ON pipeline_jobs(last_heartbeat_at) WHERE status = 'running';

-- Migrate scraping_jobs
INSERT INTO pipeline_jobs (id, created_at, job_type, triggered_by, artist_id, status, started_at, completed_at, error_message, result_data)
SELECT id, created_at, 'scrape_single', 'script', artist_id, status, started_at, completed_at, error_message,
       jsonb_build_object('images_scraped', images_scraped, 'retry_count', retry_count)
FROM scraping_jobs;

-- Migrate pipeline_runs
INSERT INTO pipeline_jobs (id, created_at, job_type, triggered_by, target_artist_ids, target_city, target_scope, status, started_at, completed_at, error_message, total_items, processed_items, failed_items, process_pid, last_heartbeat_at, result_data)
SELECT id, created_at, job_type, triggered_by, target_artist_ids, target_city, target_scope, status, started_at, completed_at, error_message, total_items, processed_items, failed_items, process_pid, last_heartbeat_at, result_summary
FROM pipeline_runs;

-- Drop old tables
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS pipeline_runs CASCADE;

-- Drop unused tables (claim_attempts kept - used by claim flow)
DROP TABLE IF EXISTS artists_slug_backup CASCADE;
```

### Migration 3: `20260112_003_consolidate_increment_functions.sql`

```sql
-- Create unified analytics increment function
CREATE OR REPLACE FUNCTION increment_analytics(
  p_event_type text,
  p_artist_id uuid DEFAULT NULL,
  p_image_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_artist_id UUID;
BEGIN
  CASE p_event_type
    WHEN 'profile_view' THEN
      INSERT INTO artist_analytics (artist_id, date, profile_views)
      VALUES (p_artist_id, CURRENT_DATE, 1)
      ON CONFLICT (artist_id, date) DO UPDATE
      SET profile_views = artist_analytics.profile_views + 1;

    WHEN 'image_view' THEN
      SELECT artist_id INTO v_artist_id FROM portfolio_images WHERE id = p_image_id;
      IF v_artist_id IS NULL THEN RETURN; END IF;

      INSERT INTO portfolio_image_analytics (image_id, artist_id, date, view_count)
      VALUES (p_image_id, v_artist_id, CURRENT_DATE, 1)
      ON CONFLICT (image_id, date) DO UPDATE
      SET view_count = portfolio_image_analytics.view_count + 1;

      INSERT INTO artist_analytics (artist_id, date, image_views)
      VALUES (v_artist_id, CURRENT_DATE, 1)
      ON CONFLICT (artist_id, date) DO UPDATE
      SET image_views = artist_analytics.image_views + 1;

    WHEN 'instagram_click' THEN
      INSERT INTO artist_analytics (artist_id, date, instagram_clicks)
      VALUES (p_artist_id, CURRENT_DATE, 1)
      ON CONFLICT (artist_id, date) DO UPDATE
      SET instagram_clicks = artist_analytics.instagram_clicks + 1;

    WHEN 'booking_click' THEN
      INSERT INTO artist_analytics (artist_id, date, booking_link_clicks)
      VALUES (p_artist_id, CURRENT_DATE, 1)
      ON CONFLICT (artist_id, date) DO UPDATE
      SET booking_link_clicks = artist_analytics.booking_link_clicks + 1;
  END CASE;
END;
$$;

-- Drop old functions
DROP FUNCTION IF EXISTS increment_profile_view(uuid);
DROP FUNCTION IF EXISTS increment_image_view(uuid);
DROP FUNCTION IF EXISTS increment_instagram_click(uuid);
DROP FUNCTION IF EXISTS increment_booking_click(uuid);
DROP FUNCTION IF EXISTS increment_search_appearances(uuid[]);
DROP FUNCTION IF EXISTS increment_pipeline_progress(uuid, int, int);
```

### Migration 4: `20260112_004_consolidate_location_functions.sql`

```sql
-- Create unified location counts function with GDPR fix
CREATE OR REPLACE FUNCTION get_location_counts(
  p_grouping text,
  p_country_code text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_state_code text DEFAULT NULL,
  p_min_count int DEFAULT 1
)
RETURNS TABLE (location_code text, display_name text, artist_count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  -- Skip GDPR countries entirely
  IF p_country_code IS NOT NULL AND is_gdpr_country(p_country_code) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    CASE p_grouping
      WHEN 'regions' THEN al.region
      WHEN 'countries' THEN al.country_code
      WHEN 'cities' THEN al.city_slug
      WHEN 'state_cities' THEN al.city_slug
      WHEN 'all_cities' THEN al.city_slug
    END as location_code,
    CASE p_grouping
      WHEN 'regions' THEN al.region
      WHEN 'countries' THEN al.country_code
      WHEN 'cities' THEN al.city
      WHEN 'state_cities' THEN al.city
      WHEN 'all_cities' THEN al.city || ', ' || al.region
    END as display_name,
    COUNT(DISTINCT al.artist_id)::bigint as artist_count
  FROM artist_locations al
  JOIN artists_with_images awi ON awi.artist_id = al.artist_id
  JOIN artists a ON a.id = al.artist_id
  WHERE a.deleted_at IS NULL
    AND NOT COALESCE(a.is_gdpr_blocked, false)
    AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
    AND (p_country_code IS NULL OR al.country_code = p_country_code)
    AND (p_region IS NULL OR al.region = p_region)
    AND (p_state_code IS NULL OR al.region = p_state_code)
  GROUP BY 1, 2
  HAVING COUNT(DISTINCT al.artist_id) >= p_min_count
  ORDER BY artist_count DESC, display_name;
END;
$$;

-- Keep old functions as wrappers for backward compatibility during transition
-- (Can be dropped in a future migration after code is updated)
```

---

## Code Updates

### New Library Files

**`lib/admin/unified-audit-log.ts`**
**`lib/admin/pipeline-jobs.ts`**

### Files to Update

| File | Changes |
|------|---------|
| `lib/admin/audit-log.ts` | Use `unified_audit_log` |
| `app/api/analytics/track/route.ts` | Use `increment_analytics()` |
| `lib/supabase/queries.ts` | Update location count wrappers |
| `lib/instagram/auto-sync.ts` | Use `logSyncEvent()` |
| `lib/seo/indexnow.ts` | Use `logSeoSubmission()` |
| `scripts/scraping/scrapingdog-scraper.ts` | Use `pipeline_jobs` |
| `lib/admin/pipeline-executor.ts` | Use `pipeline_jobs` |
| `app/api/admin/pipeline/status/route.ts` | Query `pipeline_jobs` |
| `app/api/admin/pipeline/retry/route.ts` | Query `pipeline_jobs` |
| `app/api/admin/airtable/*.ts` | Use unified audit log |
| `app/api/dashboard/sync/status/route.ts` | Query unified audit log |
| `app/api/dashboard/portfolio/import/route.ts` | Use unified audit log |
| `components/admin/PipelineDashboard.tsx` | Update for new job types |

---

## Verification Checklist (How We Ensure Nothing Breaks)

### Pre-Implementation: Validate Understanding
Before writing any code, verify each table/function change:
```sql
-- In local Supabase Studio, check what uses each table/function
SELECT * FROM pg_proc WHERE proname = 'function_name';
SELECT * FROM pg_trigger WHERE tgname LIKE '%table_name%';
```

### Local Testing (Critical Path Coverage)

```bash
npm run db:local:start
npm run db:local:reset
npx supabase db push --local
npm run dev
```

**1. Audit Log Changes - Test Each Writer:**
| Component | Test Action | Expected Result |
|-----------|-------------|-----------------|
| `lib/admin/audit-log.ts` | Admin login at `/admin` | Event in `unified_audit_log` with category='admin' |
| `lib/instagram/auto-sync.ts` | Trigger sync (or mock) | Event with category='sync', type='instagram.*' |
| `app/api/admin/airtable/*.ts` | Push/pull from admin | Events with type='airtable.*' |
| `lib/seo/indexnow.ts` | Submit URL (or mock) | Event with category='seo' |

**2. Pipeline Jobs - Test Each Writer:**
| Component | Test Action | Expected Result |
|-----------|-------------|-----------------|
| `scripts/scraping/scrapingdog-scraper.ts` | Run `npm run scrape-instagram -- --limit 1` | Row in `pipeline_jobs` with job_type='scrape_single' |
| `lib/admin/pipeline-executor.ts` | Trigger job from admin panel | Row with job_type='scrape_batch' |

**3. Analytics Functions - Test Increment:**
```sql
-- Before: check artist_analytics for a known artist
SELECT * FROM artist_analytics WHERE artist_id = 'test-id';

-- Trigger: visit artist page, click Instagram link
-- After: verify counts incremented
SELECT * FROM artist_analytics WHERE artist_id = 'test-id';
```

**4. Location Functions - Test Each Grouping:**
```sql
-- Test unified function with each grouping type
SELECT * FROM get_location_counts('regions', 'US');
SELECT * FROM get_location_counts('countries');
SELECT * FROM get_location_counts('cities', 'US', 'TX');
SELECT * FROM get_location_counts('state_cities', NULL, NULL, 'TX');
SELECT * FROM get_location_counts('all_cities', NULL, NULL, NULL, 3);
```

**5. Claim Flow (Not Changed, But Verify):**
- [ ] Test claim flow at `/claim` - should still work (uses `claim_attempts` which we're keeping)

**6. Run Test Suites:**
```bash
npm run test:run     # Unit tests (47)
npm run lint
npm run type-check
```

### Staging Testing

```bash
git push origin feature/db-consolidation
# Create PR targeting staging
# Wait for Vercel preview deploy
```

**Manual Testing on Staging:**
- [ ] Admin panel loads
- [ ] Pipeline dashboard shows jobs
- [ ] Airtable sync works (push + pull)
- [ ] Artist dashboard shows sync status
- [ ] Location dropdowns work (browse pages)
- [ ] Run E2E tests: `npm run test:e2e`

### Production Deploy

```bash
# Only after staging verified
git checkout main
git merge feature/db-consolidation
npm run db:push    # Apply migrations
git push
```

**Post-Deploy Monitoring:**
- [ ] Check Vercel logs for errors (first 30 min)
- [ ] Test admin panel manually
- [ ] Test artist dashboard manually
- [ ] Verify location dropdowns on city pages

---

## Rollback

Tables are dropped in migrations. If issues:
1. Revert merge commit
2. Restore tables from backup

**Mitigation:** Thorough local + staging testing.
