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
| Vector Index | IVFFlat | `lists = sqrt(rows)` |
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
artists              -- 15,626 rows, artist profiles
portfolio_images     -- 68,440 rows, images with embeddings
artist_locations     -- Multi-location support
artist_subscriptions -- Stripe subscription tracking
searches             -- Search session storage
style_seeds          -- 20 style embeddings
```

**Vector Index:**
```sql
-- IVFFlat for 68k images (lists = 261)
CREATE INDEX idx_portfolio_embeddings ON portfolio_images
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 261);
```

---

## Migrations

```
supabase/migrations/
├── 00000000000000_baseline.sql  # Full schema (5,100 lines)
├── README.md
└── _archive/                     # 86 historical migrations
```

**RPC functions:** `supabase/functions/search_functions.sql` (single source of truth)

**New migrations:** Add to `supabase/migrations/` with timestamp prefix (e.g., `20260106_001_feature.sql`)

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
