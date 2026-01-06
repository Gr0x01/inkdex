---
Last-Updated: 2026-01-06
Maintainer: RB
Status: Launched
---

# Technology Stack

## Core Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 16+ (App Router) | Turbopack, React 19, ISR |
| Language | TypeScript (strict) | Path alias: `@/*` → `./` |
| Styling | Tailwind CSS v3 | |
| Database | Supabase PostgreSQL | pgvector for embeddings |
| Vector Index | HNSW | `m=16, ef_construction=128` |
| Caching | Redis (Railway) | Rate limiting, analytics |
| Storage | Supabase Storage | WebP images, CDN |
| Auth | Supabase Auth | Instagram OAuth |
| Payments | Stripe | Checkout, webhooks, portal |
| Email | Resend | Transactional emails |
| Deployment | Vercel | Edge CDN, serverless |

## Embeddings (Hybrid)

| Component | Details |
|-----------|---------|
| Primary | Local GPU (A2000) at `clip.inkdex.io` |
| Fallback | Modal.com A10G (auto-failover) |
| Model | OpenCLIP ViT-L-14 (768-dim) |
| Timeout | 5s local → Modal fallback |

## External Services

| Service | Use Case | Cost |
|---------|----------|------|
| Apify | Instagram scraping | ~$2.60/1K posts |
| Tavily | Artist discovery | ~$0.05/query |
| Modal.com | GPU fallback | ~$0.60/hr |
| OpenAI GPT-5-mini | Image classification | ~$0.02/profile |

### Apify Dual-Account Strategy

Two separate Apify accounts to optimize costs:

| Account | Env Var | Use Case | Cost |
|---------|---------|----------|------|
| **Free** | `APIFY_API_TOKEN_FREE` | Profile searches, Pro auto-sync | $0 ($5/mo credit) |
| **Paid** | `APIFY_API_TOKEN` | Heavy pipeline (hashtag/follower mining, bulk scraper) | Pay-as-you-go |

**Token Selection Logic:**
- `lib/instagram/profile-fetcher.ts` → Uses `FREE` first, falls back to `PAID`
- `lib/instagram/hashtag-scraper.ts` → Uses `PAID` only
- `lib/instagram/follower-scraper.ts` → Uses `PAID` only
- `scripts/scraping/apify-scraper.py` → Uses `PAID` only

**Rationale:** After initial bulk scraping, ongoing needs (Pro auto-sync, profile searches) fit within free tier. Paid account only needed for occasional large discovery batches.

---

## Key Commands

```bash
npm run dev           # Development server
npm run build         # Production build
npm run lint          # ESLint
npm run type-check    # TypeScript check
npm run db:push       # Apply migrations (runs sqlfluff first)
npm run storybook     # Component dev (localhost:6006)
```

---

## Database Schema (Key Tables)

```sql
artists              -- 15,626 rows, artist profiles (34 columns after refactor)
portfolio_images     -- 92,038 rows, images with embeddings
artist_locations     -- Multi-location support (source of truth for location)
artist_sync_state    -- Instagram sync state (extracted from artists)
artist_pipeline_state -- Scraping pipeline state (extracted from artists)
artist_subscriptions -- Stripe subscription tracking
searches             -- Search session storage
style_seeds          -- 20 style embeddings
```

**Vector Index:**
```sql
-- HNSW for 92k images (switched from IVFFlat Jan 7, 2026)
CREATE INDEX idx_portfolio_embeddings ON portfolio_images
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 128);
```

**Index Stats:** 359 MB, ~400ms search latency

**Rebuilding the Vector Index:**
HNSW index creation takes 5-15 minutes and exceeds Supabase SQL Editor timeout.
Must use `psql` with session pooler (port 5432):

```bash
# Install psql if needed
brew install libpq && brew link --force libpq

# Connect via session pooler (not transaction pooler on 6543)
/opt/homebrew/opt/libpq/bin/psql "postgresql://postgres.aerereukzoflvybygolb:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres" << 'EOF'
SET statement_timeout = '60min';
DROP INDEX IF EXISTS idx_portfolio_embeddings;
CREATE INDEX idx_portfolio_embeddings ON portfolio_images
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 128);
EOF
```

**Note:** Direct connection (port 5432 on db.*.supabase.co) requires IPv6 or IPv4 add-on.

---

## Migrations

```
supabase/migrations/
├── 00000000000000_baseline.sql  # Full schema (5,100 lines)
├── README.md
└── _archive/                     # 86 historical migrations
```

**New migrations:** Add to `supabase/migrations/` with timestamp prefix (e.g., `20260106_001_feature.sql`)

---

## SQL Functions (Split Structure)

**Index/Documentation:** `supabase/functions/search_functions.sql` (89 lines, DO NOT RUN)

**Source of Truth Files:**
```
supabase/functions/
├── _shared/
│   ├── gdpr.sql              # is_gdpr_country() - 15 lines
│   └── location_filter.sql   # matches_location_filter() - 27 lines
├── search/
│   └── vector_search.sql     # 5 search functions - 696 lines
├── location/
│   └── location_counts.sql   # 4 location functions - 212 lines
├── admin/
│   └── admin_functions.sql   # 3 admin functions - 276 lines
└── search_functions.sql      # INDEX FILE (documentation only)
```

**To apply changes:**
1. Edit the domain file (e.g., `search/vector_search.sql`)
2. Run in Supabase SQL Editor in dependency order:
   - `_shared/gdpr.sql`
   - `_shared/location_filter.sql`
   - `search/vector_search.sql`
   - `location/location_counts.sql`
   - `admin/admin_functions.sql`

**DO NOT create migrations that rewrite search functions.**

---

## Search Performance

**Optimized Jan 4, 2026:** 2900ms → ~200ms

Key optimizations:
1. Vector search FIRST (uses IVFFlat index)
2. Get top 500 images → ~100 candidate artists
3. Filter/rank after (not 15k artists)
4. `is_gdpr_blocked` column (replaces expensive subquery)

**Ranking boosts:**
- Pro: +0.05
- Featured: +0.02
- Display: `boosted_score` rescaled to 60-95%

---

## Admin Panel

**Routes:** `/admin/` with `(authenticated)` route group
**Auth:** Magic link, email whitelist in `lib/admin/whitelist.ts`

**Key endpoints:**
- `GET /api/admin/mining/stats` - Pipeline stats
- `GET /api/admin/artists` - Paginated list
- `PATCH /api/admin/artists/[id]/featured` - Toggle featured

---

## Stripe Integration

**Endpoints:**
- `POST /api/stripe/create-checkout`
- `POST /api/stripe/webhook`
- `POST /api/stripe/portal`

**Webhook events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

**Pricing:** $15/month or $150/year

**Production setup:**
1. Add env vars to Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Create webhook: `https://inkdex.io/api/stripe/webhook`
3. Enable Customer Portal in Stripe Dashboard

---

## Environment Variables

**Required for production:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# CLIP Embeddings
LOCAL_CLIP_URL=https://clip.inkdex.io
CLIP_API_KEY
MODAL_FUNCTION_URL

# Apify (Instagram scraping)
APIFY_API_TOKEN          # Paid account - heavy pipeline
APIFY_API_TOKEN_FREE     # Free account - lightweight ops (optional, falls back to PAID)

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_YEARLY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Redis
REDIS_URL

# Email
RESEND_API_KEY
```

See `.env.example` for full list.

---

## Local Supabase Development

**Purpose:** Safely test `search_functions.sql` changes before deploying to production.

### How It Works
- Runs ~12 Docker containers locally (Postgres, PostgREST, Studio, etc.)
- **Data persists** between restarts - no re-seeding needed
- Switch between local/production by commenting env vars in `.env.local`

### When to Use Local
- **Schema changes** - ALTER TABLE, new columns, constraints
- **New migrations** - Test before pushing to production
- **Search functions** - `search_functions.sql` changes
- **Risky SQL** - Destructive queries, complex joins, index changes
- **Isolated testing** - Edge cases, debugging with known data

### When to Stay on Production
- **Admin panel** - Need real artist data
- **Scraping/pipelines** - Writing to real database
- **Marketing/outreach** - Real user data
- **Normal dev work** - UI changes, API routes, reads

### Switching (Manual Comment In/Out)
In `.env.local`, comment/uncomment the Supabase credentials:
```bash
# PRODUCTION (default - use for admin, scraping, etc.)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# LOCAL (uncomment only when testing search functions)
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### NPM Scripts
```bash
npm run db:local:seed    # Pull 500 artists from production (one-time)
npm run db:local:start   # Start Docker containers
npm run db:local:stop    # Stop (data persists)
npm run db:local:reset   # Wipe & reload from seed.sql
npm run db:local:status  # Check container status
```

### Local URLs
- **API:** `http://127.0.0.1:54321`
- **Studio (SQL editor):** `http://127.0.0.1:54323`
- **Inbucket (emails):** `http://127.0.0.1:54324`

### Seed Data
- **Script:** `scripts/seed/dump-production-seed.ts`
- **Default:** 500 artists, 6 images each (~3000 images)
- **Output:** `supabase/seed.sql` (~24MB)
- Only re-seed when you want fresh production data
