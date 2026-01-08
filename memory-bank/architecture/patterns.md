---
Last-Updated: 2026-01-09
Maintainer: Claude
Status: Active Reference
---

# Architecture Patterns

## Layered Architecture

```
App Layer (Next.js App Router)
    ↓
Query Layer (lib/supabase/queries.ts)
    ↓
Database (Supabase PostgreSQL + pgvector)
```

**Key points:**
- No Repository/Service layers - business logic in API routes + queries.ts
- RPC-first for complex queries (search functions)
- All database access centralized in `lib/supabase/queries.ts`

---

## Directory Structure

**IMPORTANT:** No `src/` directory. Path alias `@/*` points to `./`

```
/tattoo
├── app/                    # Next.js App Router
│   ├── api/                # 17+ API route groups
│   ├── dashboard/          # Artist dashboard
│   ├── admin/              # Admin panel
│   └── [city]/[state]/     # Dynamic routes
├── components/             # 18 subdirectories
├── lib/
│   ├── supabase/
│   │   ├── queries.ts      # Centralized DB queries (1,200+ lines)
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── service.ts      # Service role client
│   ├── redis/              # Caching
│   ├── stripe/             # Payment
│   └── email/              # Resend
├── types/                  # TypeScript types
├── scripts/                # Data pipeline
└── supabase/
    ├── migrations/         # 30+ migrations
    └── functions/
        ├── _shared/        # Helpers (gdpr.sql, location_filter.sql)
        ├── search/         # vector_search.sql (SOURCE OF TRUTH)
        ├── location/       # location_counts.sql
        ├── admin/          # admin_functions.sql
        └── search_functions.sql  # INDEX (documentation only)
```

---

## Core Patterns

### 1. Centralized Queries
All database access in `lib/supabase/queries.ts`:
- Simple queries: Supabase query builder
- Complex queries: RPC functions

### 2. RPC-First for Search
Vector search uses PostgreSQL RPC functions split into domain files:
- `search/vector_search.sql` - 5 search functions (696 lines)
- `location/location_counts.sql` - 4 location functions (212 lines)
- `admin/admin_functions.sql` - 3 admin functions (276 lines)
- `_shared/` - Helper functions used by multiple domains

**To apply changes:** Run files in Supabase SQL Editor in dependency order (shared → search → location → admin)
**NEVER create migrations that rewrite search functions**

### 3. Supabase Client Singleton
Three clients for different contexts:
- `client.ts` - Browser (anon key)
- `server.ts` - Server components (cookies)
- `service.ts` - Service role (admin ops)

### 4. Server Components + ISR
- Default to Server Components
- Client Components only for interactivity
- ISR with 24h revalidation for static pages

---

## SQL Naming Convention

**CRITICAL:** CTE columns must be prefixed to avoid ambiguity:
- `ri_` for `ranked_images`
- `aa_` for `aggregated_artists`
- `fa_` for `filtered_artists`
- `ba_` for `boosted_artists`

```sql
WITH ranked_images AS (
  SELECT pi.artist_id as ri_artist_id, ...
)
```

---

## Middleware / Proxy

The `proxy.ts` file handles request-level concerns:

### Rate Limiting (In-Memory)
- 60 requests/minute per IP for scrapable paths (`/artist/*`, `/styles/*`, state pages)
- 10-minute block after exceeding limit
- Resets on deploy (acceptable for scraper protection)

### Maintenance Mode (Cached)
- Emergency "break glass" feature toggled via admin panel (Redis)
- **Cached for 60 seconds** to avoid hammering `/api/maintenance/status` on every request
- Worst case: 60s delay before maintenance kicks in (acceptable for emergencies)
- Fails open: if Redis/API unreachable, site stays up

### Redirects
- `/artists` → `/texas` (default state)
- `/artists/*` → `/artist/*` (route standardization)

---

## Key Files

| Purpose | File |
|---------|------|
| All DB queries | `lib/supabase/queries.ts` |
| Search functions | `supabase/functions/search/vector_search.sql` |
| Location functions | `supabase/functions/location/location_counts.sql` |
| Admin functions | `supabase/functions/admin/admin_functions.sql` |
| SQL index/docs | `supabase/functions/search_functions.sql` |
| Type definitions | `types/database.ts` (generated) |
| Countries/GDPR | `lib/constants/countries.ts` |
| Redis caching | `lib/redis/cache.ts` |
| Stripe | `lib/stripe/server.ts` |
| Proxy/middleware | `proxy.ts` |
