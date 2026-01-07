---
Last-Updated: 2026-01-07
Maintainer: RB
Status: Active Guidelines
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
npm run scrape-instagram                 # Apify Instagram scraper
npm run process-images                   # Process + upload images
npm run generate-embeddings              # CLIP embeddings (Modal)
```

### Database
```bash
npm run db:push       # Lint + push to production (PREFERRED)
npm run db:lint       # Lint only (sqlfluff)
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
**Use this to safely test search function changes before production.**

```bash
# One-time setup
npm run db:local:seed         # Pull ~1000 artists from production

# Daily workflow
npm run db:local:start        # Start Docker containers
npm run db:local:reset        # Apply migrations + load seed data
# Edit supabase/functions/search_functions.sql
supabase db push --local      # Test changes locally
# Verify at localhost:3000 (with local env vars)
npm run db:push               # Deploy to production when ready
npm run db:local:stop         # Stop when done
```

**Local URLs:**
- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Inbucket (emails): `http://127.0.0.1:54324`

**To use local DB with app:**
1. Copy keys from `supabase start` output
2. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-start-output>
   SUPABASE_SERVICE_ROLE_KEY=<from-start-output>
   ```
3. Run `npm run dev`

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

---

## Systems to Monitor

### International Artist Miner (VPS)

**Server:** Vultr `66.42.100.208` ($5/mo)
**Service:** `international-miner.service`
**Script:** `/root/international_miner.py`
**Deployed:** 2026-01-07

**What it does:**
1. Tavily web search → discovers artist Instagram handles
2. Instaloader → scrapes 12 images per public profile
3. Uploads WebP thumbnails to Supabase Storage
4. Creates artist + portfolio_images records

**Throughput:** ~1,000-2,000 artists/day, ~12,000-24,000 images/day

**Target regions (31 cities):**
- Canada: Toronto, Vancouver, Montreal, Calgary, Ottawa
- Latin America: Mexico City, São Paulo, Buenos Aires, Bogotá, Lima, Santiago, Medellín, Rio de Janeiro, Guadalajara, Monterrey
- Asia-Pacific: Tokyo, Seoul, Sydney, Melbourne, Singapore, Bangkok, Hong Kong, Taipei, Auckland, Manila, Osaka, Brisbane, Perth, Wellington, Kuala Lumpur

**Monitoring commands:**
```bash
# SSH credentials in /tmp/vps_pass.txt (password: !r6JVs9UUzQZMLr$)
sshpass -f /tmp/vps_pass.txt ssh root@66.42.100.208

# Check service status
systemctl status international-miner

# Watch logs live
journalctl -u international-miner -f

# Recent logs
journalctl -u international-miner -n 100 --no-pager

# Restart if needed
systemctl restart international-miner
```

**Cost:** ~$35-65/month (Tavily ~$1-2/day + VPS $5/mo) vs $200 for 16k artists on Apify

**Known issues:**
- `artist_locations` insert returns 404 (trigger issue) - doesn't block pipeline, artists still created
- Instagram 403/401 errors occasionally - script handles gracefully, continues to next artist

**Local script:** `scripts/instaloader/international_miner.py`
