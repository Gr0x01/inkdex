---
Last-Updated: 2026-01-06
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

### Search Functions - SINGLE SOURCE OF TRUTH
**File:** `supabase/functions/search_functions.sql`

**DO NOT create migrations that rewrite search functions.** Edit the file directly, then run `npx supabase db push`.

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

`artists.pipeline_status`:
- `pending_scrape` → New artist, needs scraping
- `scraping` → Currently being scraped
- `pending_embeddings` → Scraped, awaiting embeddings
- `complete` → Fully searchable
- `failed` → Scraping failed

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
