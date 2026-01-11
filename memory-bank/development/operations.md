---
Last-Updated: 2026-01-11
Maintainer: RB
Status: Active Guidelines (VPS/Instaloader removed - now using ScrapingDog)
---

# Operations Guide

## Quality Gates

```bash
npm run lint          # Must pass
npm run type-check    # Must pass
npm run build         # Must succeed
npm run db:push       # For migrations (runs sqlfluff first)
```

**Use `code-reviewer` subagent after significant changes.**

---

## Migration Workflow (CRITICAL)

### Migration File Naming
**Format:** `YYYYMMDD_NNN_description.sql`
- `YYYYMMDD` = today's date (e.g., `20260109`)
- `NNN` = sequential number for that day (e.g., `001`, `002`)
- `description` = kebab-case description

**Examples:**
- `20260109_001_add_user_preferences.sql`
- `20260109_002_fix_rls_policy.sql`

### Before Deploying
**ALWAYS verify schema before any deployment:**
```bash
npx tsx scripts/migrations/verify-production-schema.ts
```
This outputs SQL to check for missing functions/tables. Run in Supabase SQL Editor.

### Creating New Migrations
1. Create migration in `supabase/migrations/` with correct naming format
2. **Apply to production immediately:** `npm run db:push`
3. Only archive migrations AFTER they've been applied AND baseline is updated

### Squashing to Baseline
When migration history gets messy, squash to a new baseline:
```bash
# 1. Dump current production schema
npx supabase db dump --schema public -f supabase/migrations/00000000000000_baseline.sql

# 2. Archive old migrations
mkdir -p supabase/migrations/_archive_YYYYMMDD
mv supabase/migrations/2026*.sql supabase/migrations/_archive_YYYYMMDD/

# 3. Reset schema_migrations table
psql "$DATABASE_URL" -c "
TRUNCATE supabase_migrations.schema_migrations;
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('00000000000000', '00000000000000_baseline.sql', '{}');
"

# 4. Verify
npx supabase db push --dry-run  # Should say "up to date"
```

### Archiving Migrations
**NEVER archive a migration before it's applied to production!**

1. Verify migration was applied: check Supabase → Database → Migrations
2. Update `00000000000000_baseline.sql` with the new schema
3. Move to `_archive/` folder

### If You Find Missing Schema
1. Check `00000000000000_baseline.sql` for the definition
2. If not there, check `_archive/` folder for unapplied migrations
3. Run the SQL directly in Supabase SQL Editor
4. Add to baseline if missing

### Schema Drift Detection

**Run before deployments:**
```bash
npm run db:audit    # Generates SQL to audit production
```

This auto-extracts expected objects from baseline and generates queries to detect:
- Functions with empty `search_path` (the `''` bug)
- Missing tables, functions, indexes, triggers
- Tables without RLS enabled
- Missing pgcrypto infrastructure (for token encryption)

**Common Issues:**

1. **search_path bug:** When Supabase dumps functions via `pg_dump`, it serializes `SET search_path = ''` (empty) instead of `SET search_path = 'public'`. Every time functions get recreated from dumps, they break with "relation does not exist" errors.

2. **Baseline divergence:** Migrations archived before being applied to production, or manual SQL Editor changes without migrations.

**Recovery:**
1. Run `npm run db:audit` and copy queries to SQL Editor
2. Check which objects are missing/broken
3. Apply reconciliation migration: `npm run db:push`
4. After fix verified, update baseline from prod:
   ```bash
   npx supabase db dump --schema public -f supabase/migrations/00000000000000_baseline.sql
   ```

---

## Critical Rules

### Search Functions - SPLIT STRUCTURE
**Index File:** `supabase/functions/search_functions.sql` (documentation only)

**Source of Truth Files:**
- `_shared/gdpr.sql` - GDPR helper
- `_shared/location_filter.sql` - Location filter helper
- `search/vector_search.sql` - 5 search functions
- `location/location_counts.sql` - 4 location count functions
- `admin/admin_functions.sql` - Admin functions

**To apply changes:** Run files in Supabase SQL Editor in dependency order (shared → search → location → admin).

**DO NOT create migrations that rewrite search functions.**

### SECURITY DEFINER Functions MUST Have search_path
**All `SECURITY DEFINER` functions MUST include `SET search_path = public`.**

Without this, the function runs with an empty search_path and cannot find tables:
```
ERROR: relation "artists" does not exist
```

**Correct pattern:**
```sql
CREATE OR REPLACE FUNCTION my_function()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- REQUIRED!
AS $$
BEGIN
  -- Can now find tables in public schema
  SELECT * FROM artists;
END;
$$;
```

**Post-Incident (Jan 9, 2026):**
Multiple trigger functions (`check_location_limit`, `sync_primary_location`) had `search_path=""` (empty), causing location updates to fail. Fixed by adding `SET search_path = public` to all SECURITY DEFINER functions.

### Trigger Functions MUST Be Cascade-Safe
**Trigger functions that INSERT/UPDATE must check if parent exists first.**

When a parent row is deleted (e.g., `DELETE FROM artists`), child tables cascade delete. Triggers on child tables fire, but the parent is already gone. If the trigger tries to INSERT/UPDATE a table with an FK back to the parent, you get: `violates foreign key constraint`.

**Correct pattern:**
```sql
CREATE OR REPLACE FUNCTION my_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if parent no longer exists (cascade delete scenario)
  IF NOT EXISTS (SELECT 1 FROM artists WHERE id = OLD.artist_id AND deleted_at IS NULL) THEN
    RETURN OLD;
  END IF;

  -- Safe to INSERT/UPDATE now
  INSERT INTO artist_style_profiles (...) VALUES (...);
  RETURN OLD;
END;
$$;
```

**Functions that follow this pattern:**
- `recompute_artist_styles_on_image_delete()` - checks artist exists
- `update_artist_styles_on_tag_change()` - checks artist exists via JOIN

**Post-Incident (Jan 9, 2026):**
Artist deletion failed twice because `recompute_artist_styles_on_image_delete()` tried to INSERT into `artist_style_profiles` after the artist was already deleted. Fixed by adding existence check.

### RPC Functions Called from SSR Need User ID Parameter
**`auth.uid()` returns NULL when called from Next.js server-side Supabase client.**

For RPC functions that need to verify ownership, pass the user ID as a parameter:
```sql
CREATE FUNCTION update_something(
  p_record_id UUID,
  p_user_id UUID DEFAULT NULL  -- For SSR clients
)
...
AS $$
BEGIN
  -- Use COALESCE to support both SSR (p_user_id) and direct calls (auth.uid())
  IF NOT EXISTS (
    SELECT 1 FROM records
    WHERE id = p_record_id
      AND owner_id = COALESCE(p_user_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;
```

### SQL Naming Convention (Prevents Ambiguous Column Errors)
CTE columns MUST be prefixed:
- `ri_` for `ranked_images`
- `aa_` for `aggregated_artists`
- `fa_` for `filtered_artists`
- `ba_` for `boosted_artists`

```sql
WITH ranked_images AS (
  SELECT pi.artist_id as ri_artist_id, ...
)
```

### Parallelization
**ALWAYS parallelize and batch operations by default.** Serial execution is ONLY for initial testing.

### Minimal Implementation (KISS + YAGNI)
1. Ask: "What is the smallest change that solves this?"
2. Implement only that minimum
3. Stop and check in before adding abstractions

---

## RLS Policy Best Practices

### UPDATE Policies MUST have WITH CHECK
PostgreSQL RLS requires both clauses for UPDATE:
- `USING` - filters which rows can be selected for update
- `WITH CHECK` - validates the new row values after update

Without `WITH CHECK`, updates can fail silently or return empty results.

**Pattern:**
```sql
CREATE POLICY "policy_name" ON table_name
  FOR UPDATE
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

### Always wrap auth functions in subqueries
Use `(SELECT auth.uid())` not `auth.uid()` to prevent per-row evaluation during query planning.

```sql
-- GOOD
USING (claimed_by_user_id = (SELECT auth.uid()))

-- BAD (performance issue)
USING (claimed_by_user_id = auth.uid())
```

### INSERT policies need WITH CHECK only
INSERT policies use `WITH CHECK` only - there's no existing row to filter with `USING`.

```sql
CREATE POLICY "policy_name" ON table_name
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

### Post-Incident (Jan 9, 2026) - RLS Fix
Missing `WITH CHECK` on `artists` UPDATE policy caused `filter_non_tattoo_content` updates to fail silently, returning empty results misinterpreted as "Pro subscription no longer active."

Fixed in migration `20260127_001_fix_rls_policies_complete.sql`:
- Added `WITH CHECK` to all UPDATE policies
- Added missing INSERT policies to `artist_sync_state` and `artist_pipeline_state`

---

## Commands

### Development
```bash
npm run dev           # Dev server
npm run storybook     # Component dev (localhost:6006)
```

### Data Pipeline
```bash
npm run mine:hashtags                    # Discover artists from hashtags
npm run mine:classify                    # GPT classification of candidates
npm run mine:status                      # View pipeline stats
npm run scrape-instagram                 # ScrapingDog batch (50 concurrent)
npm run scrape-instagram -- --limit 100  # Test with N artists
npm run scrape-instagram -- --profile-only  # Profile images only
npm run scrape-instagram:apify           # Legacy Apify scraper (30 concurrent)
npm run process-images                   # Process + upload images
npm run generate-embeddings              # CLIP embeddings (Modal)
```

### Database
```bash
npm run db:push       # Lint + push to production (PREFERRED)
npm run db:lint       # Lint only (sqlfluff)
npm run db:audit      # Generate audit SQL (drift detection)
npm run db:verify     # Verify expected objects exist
npx supabase db push  # Push without lint
```

### Manual Vector Index Rebuild
HNSW index creation takes 5-15 minutes and **exceeds Supabase SQL Editor timeout**.
Must use `psql` with session pooler (port 5432, not transaction pooler on 6543):

```bash
# Install psql if needed
brew install libpq && brew link --force libpq

# Connect via session pooler and rebuild
/opt/homebrew/opt/libpq/bin/psql "postgresql://postgres.aerereukzoflvybygolb:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres" << 'EOF'
SET statement_timeout = '60min';
DROP INDEX IF EXISTS idx_portfolio_embeddings;
CREATE INDEX idx_portfolio_embeddings ON portfolio_images
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 128);
EOF
```

**Why not SQL Editor or migrations?**
- SQL Editor has ~60s upstream timeout
- Migrations run in transactions (can't use CONCURRENTLY)
- Session pooler allows long-running statements

**Note:** Direct connection (db.*.supabase.co:5432) requires IPv6 or IPv4 add-on.

### Local Supabase Development
**Use this to safely test search function changes and ML tagging before production.**

```bash
# Seed generation (connects to production, dumps to supabase/seed.sql)
npx tsx scripts/seed/dump-production-seed.ts --artists=500           # Small (~3k images, 30MB)
npx tsx scripts/seed/dump-production-seed.ts --artists=20000 --all-images  # Full (~92k images, 1GB)

# Daily workflow
npm run db:local:start        # Start Docker containers
npm run db:local:reset        # Apply migrations + load seed data
npm run db:local:status       # Check status
npm run db:local:stop         # Stop when done
```

**Local URLs:**
- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Inbucket (emails): `http://127.0.0.1:54324`

**To use local DB with app:**
1. Edit `.env.local` - comment PRODUCTION section, uncomment LOCAL section:
   ```bash
   # --- PRODUCTION (uncomment for production) ---
   # NEXT_PUBLIC_SUPABASE_URL=https://aerereukzoflvybygolb.supabase.co
   # ...

   # --- LOCAL (active) ---
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
   ```
2. Run `npm run dev`

**Seed Script Options:**
- `--artists=N` - Number of artists to export (default: 500)
- `--images=N` - Images per artist (default: 6)
- `--all-images` - Export all images per artist (overrides --images)

**Note:** Seed script skips `image_style_tags` export (network issues with large batches). Regenerate locally:
```bash
npx tsx scripts/styles/tag-images-ml.ts --clear --concurrency 200
npx tsx scripts/styles/compute-artist-profiles.ts --clear
```

**Current Local DB (Jan 9, 2026):**
- 13,432 artists
- 68,282 images with embeddings
- Ready for style tagging iteration

---

## Pipeline Status Lifecycle

`artist_pipeline_state.scrape_status`:
- `pending` → New artist, needs scraping
- `scraping` → Currently being scraped
- `complete` → Scraped successfully
- `failed` → Scraping failed

`artist_pipeline_state.embedding_status`:
- `pending` → Needs embeddings
- `complete` → Embeddings generated

---

## GDPR Compliance

**Two-layer defense:**

1. **Discovery Filter:** `lib/instagram/bio-location-extractor.ts`
   - Rejects EU/EEA/UK/CH artists during discovery

2. **Search Filter:** `supabase/functions/search_functions.sql`
   - Excludes GDPR countries from all search results
   - Uses `artist_locations.country_code` blocklist

**GDPR countries (32):** AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE, GB, IS, LI, NO, CH

---

## Multi-Location Support

- `artist_locations` table stores all locations
- Free tier: 1 location / Pro tier: Up to 20
- One location marked `is_primary = true`

**API Endpoints:**
- `GET /api/dashboard/locations`
- `POST /api/dashboard/locations/add`
- `DELETE /api/dashboard/locations/remove`
- `PATCH /api/dashboard/locations/set-primary`

---

## Code Style

- **Components:** PascalCase (`SearchInput.tsx`)
- **Functions:** camelCase (`searchArtistsByEmbedding()`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types:** PascalCase (`ArtistProfile`)
- **Files:** kebab-case (`image-processing.ts`)

---

## Commit Convention

```
feat: Add image upload component
fix: Fix vector search performance
docs: Update techStack.md
refactor: Simplify artist card
perf: Optimize IVFFlat index
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Vector search | <500ms |
| Page load (LCP) | <2s |
| Lighthouse | 90+ all categories |
| Bundle size | <200KB first load |

---

## Subagent Usage

| Agent | When to Use |
|-------|-------------|
| `code-reviewer` | After implementing features |
| `backend-architect` | Before API/database changes |
| `frontend-developer` | Complex UI work |
| `ui-designer` | Design system work |

**Workflow:** Implement → Run quality checks → `code-reviewer` → Address Critical issues
