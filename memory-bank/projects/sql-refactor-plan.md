# SQL Refactor & Schema Optimization Plan

Last-Updated: 2026-01-06
Maintainer: Claude

## Summary

Refactor Inkdex's SQL infrastructure for 100k+ artist scale:
1. Split `search_functions.sql` (1,365 lines) into domain folders
2. Extract sync/pipeline state from `artists` table (46→34 columns)
3. Drop deprecated `city/state` columns
4. Prepare for 1M+ image scale with `search_tier` column

---

## Phase Checklist

### Phase 0: Setup
- [x] Create git tag `pre-sql-refactor`
- [x] Create folder structure: `supabase/functions/{_shared,search,location,admin}`

### Phase 1: Extract Shared Helpers
- [x] Create `_shared/gdpr.sql` with `is_gdpr_country()` function
- [x] Create `_shared/location_filter.sql` with `matches_location_filter()` function
- [x] Create migration `20260106210000_add_shared_helpers.sql`
- [x] Update `search_functions.sql` to use helpers
- [x] Run `npm run db:push` and verify

### Phase 2: Split SQL into Domain Folders
- [x] Create `search/vector_search.sql` - all vector search functions
- [x] Create `location/location_counts.sql` - location count functions
- [x] Create `admin/admin_functions.sql` - admin utilities
- [x] Run all split files in SQL Editor to verify

### Phase 3: Extract Sync State Table
- [x] Create `artist_sync_state` table with columns:
  - `artist_id` (FK to artists)
  - `auto_sync_enabled`, `last_sync_at`, `last_sync_started_at`
  - `sync_in_progress`, `consecutive_failures`, `disabled_reason`
- [x] Create migration `20260106220000_create_artist_sync_state.sql`
- [x] Migrate existing data from artists table
- [x] Add RLS policies for artist access
- [x] Update TypeScript files (7 files)
  - `lib/instagram/auto-sync.ts` - 23+ sync column references updated
  - `app/api/dashboard/sync/settings/route.ts` - uses artist_sync_state
  - `app/api/dashboard/sync/trigger/route.ts` - no changes needed (reads only)
  - `app/api/dashboard/sync/status/route.ts` - joins artist_sync_state
  - `app/api/onboarding/finalize/route.ts` - inserts/upserts sync state
  - `app/api/onboarding/update-artist/route.ts` - upserts sync state
  - `app/api/stripe/webhook/route.ts` - upserts on pro upgrade/downgrade
- [x] Type check passes

**Note:** All TypeScript files now use `artist_sync_state` table. Old columns on
`artists` table still exist for backward compatibility during transition.

### Phase 4: Extract Pipeline State Table
- [x] Create `artist_pipeline_state` table with columns:
  - `artist_id` (FK to artists)
  - `pipeline_status`, `last_scraped_at`, `scrape_priority`
  - `scraping_blacklisted`, `exclude_from_scraping`, `blacklist_reason`
- [x] Create migration `20260106220001_create_artist_pipeline_state.sql`
- [x] Migrate existing data from artists table
- [x] Add RLS policies
- [x] Update Python files (3 files)
  - `scripts/scraping/apify-scraper.py` - uses artist_pipeline_state for blacklist, pipeline_status, last_scraped_at
  - `scripts/scraping/apify-scraper-batched.py` - uses artist_pipeline_state for blacklist, pipeline_status, last_scraped_at
  - `scripts/scraping/update-profile-metadata.py` - uses artist_pipeline_state for last_scraped_at

**Note:** All Python scripts now use `artist_pipeline_state` table with UPSERT pattern.

### Phase 5: Drop Deprecated Columns
- [x] Remove from artists table:
  - `city`, `state` (replaced by `artist_locations`)
  - Sync columns (moved to `artist_sync_state`)
  - Pipeline columns (moved to `artist_pipeline_state`)
- [x] Update admin components (critical only):
  - `components/admin/ArtistTable.tsx` - No changes needed (uses RPC with artist_locations)
  - `components/admin/ArtistDetailView.tsx` - No changes needed (page fetches from artist_locations)
  - `app/api/dashboard/profile/delete/route.ts` - Updated to use artist_pipeline_state
- [x] Create migration `20260106240000_drop_deprecated_artist_columns.sql`
- [x] Regenerate types
- [x] Verify no broken references (type check passes)

### Phase 6: Add Search Tier Column
- [x] Add `search_tier` enum ('active', 'archive') to `portfolio_images`
- [x] Default all existing images to 'active'
- [x] Document HNSW migration path for 1M+ images
- [x] Create migration `20260106220002_add_search_tier.sql`
- [ ] Create vector index on active tier (run in SQL Editor - takes time)
- [ ] Update search functions to filter by tier (future optimization)

---

## Code Snippets

### is_gdpr_country() Helper

```sql
CREATE OR REPLACE FUNCTION is_gdpr_country(country_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $
  SELECT UPPER(country_code) = ANY(ARRAY[
    -- EU 27
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    -- EEA 3
    'IS', 'LI', 'NO',
    -- Additional GDPR-compliant
    'GB', 'CH'
  ])
$;
```

### matches_location_filter() Helper

```sql
CREATE OR REPLACE FUNCTION matches_location_filter(
  p_city TEXT,
  p_region TEXT,
  p_country_code TEXT,
  city_filter TEXT,
  region_filter TEXT,
  country_filter TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $
  SELECT (
    -- No filter = match all
    (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
    OR
    -- Country only
    (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
     AND p_country_code = UPPER(country_filter))
    OR
    -- Country + region
    (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
     AND p_country_code = UPPER(country_filter)
     AND LOWER(p_region) = LOWER(region_filter))
    OR
    -- City (with optional country/region)
    (city_filter IS NOT NULL
     AND LOWER(p_city) = LOWER(city_filter)
     AND (country_filter IS NULL OR p_country_code = UPPER(country_filter))
     AND (region_filter IS NULL OR LOWER(p_region) = LOWER(region_filter)))
  )
$;
```

### artist_sync_state Table

```sql
CREATE TABLE artist_sync_state (
  artist_id UUID PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  last_post_at TIMESTAMPTZ,
  post_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_state_status ON artist_sync_state(sync_status);
CREATE INDEX idx_sync_state_last_sync ON artist_sync_state(last_sync_at);
```

### artist_pipeline_state Table

```sql
CREATE TABLE artist_pipeline_state (
  artist_id UUID PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  scrape_status TEXT DEFAULT 'pending',
  scrape_priority INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMPTZ,
  embedding_status TEXT DEFAULT 'pending',
  last_embedded_at TIMESTAMPTZ,
  needs_rescrape BOOLEAN DEFAULT FALSE,
  scrape_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_scrape_status ON artist_pipeline_state(scrape_status);
CREATE INDEX idx_pipeline_priority ON artist_pipeline_state(scrape_priority DESC);
```

---

## Rollback Strategy

- Git tag `pre-sql-refactor` captures pre-refactor state
- Each phase is independently reversible
- Emergency rollback: `git checkout pre-sql-refactor && npm run db:push`
- Phase 5 column drops are irreversible - ensure full validation first

---

## Critical Files Reference

**SQL:**
- `supabase/functions/search_functions.sql` - Main search functions
- `supabase/migrations/00000000000000_baseline.sql` - Schema reference

**TypeScript (Sync - Phase 3):**
- `lib/instagram/auto-sync.ts`
- `app/api/dashboard/sync/*.ts`
- `app/api/cron/sync-instagram/route.ts`

**Python (Pipeline - Phase 4):**
- `scripts/scraping/apify-scraper.py`
- `scripts/scraping/apify-scraper-batched.py`

**Types:**
- `types/database.types.ts`

**Admin (Phase 5):**
- `components/admin/ArtistTable.tsx`
- `components/admin/ArtistDetailView.tsx`
