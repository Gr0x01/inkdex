---
Last-Updated: 2026-01-05
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
        └── search_functions.sql  # Single source of truth
```

---

## Core Patterns

### 1. Centralized Queries
All database access in `lib/supabase/queries.ts`:
- Simple queries: Supabase query builder
- Complex queries: RPC functions

### 2. RPC-First for Search
Vector search uses PostgreSQL RPC functions:
- Single source of truth: `supabase/functions/search_functions.sql`
- **NEVER create migrations that rewrite search functions**

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

## Key Files

| Purpose | File |
|---------|------|
| All DB queries | `lib/supabase/queries.ts` |
| Search RPC functions | `supabase/functions/search_functions.sql` |
| Type definitions | `types/database.ts` (generated) |
| Countries/GDPR | `lib/constants/countries.ts` |
| Redis caching | `lib/redis/cache.ts` |
| Stripe | `lib/stripe/server.ts` |
