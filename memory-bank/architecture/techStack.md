---
Last-Updated: 2026-01-05
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
