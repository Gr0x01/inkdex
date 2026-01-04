---
Last-Updated: 2026-01-04 (Session 9 - 96-City Expansion Complete)
Maintainer: RB
Status: Production Ready - 13/14 Phases Complete (93%) - Only Stripe Remaining
---

# Active Context: Inkdex

## Current State

**Platform:** Production - 96 cities, 14,307 artists, ~25,000 images

**Live Cities:** 96 cities across 44 states (see quickstart.md for full list)

**Pending Pipeline:** ~10,000+ artists need image scraping and embeddings

## Recent Expansion (Jan 4, 2026)

**88-City Expansion Complete** - 4 batches via DataForSEO + Tavily:
- **Batch 1**: 13 cities, 1,941 artists discovered
- **Batch 2**: 25 cities, 2,800 artists discovered
- **Batch 3**: 25 cities, 2,556 artists discovered
- **Batch 4**: 25 cities, 2,343 artists discovered
- **Total**: 88 cities, 9,640 new artists, ~$240 discovery cost

**SEO Content Generation** - GPT-4.1 editorial content:
- Generated 800-1000 word city guides for 88 cities
- City-specific neighborhoods, culture, artist insights
- Cost: ~$1.74 (batch processing at 50 cities/parallel)
- 97 total cities now have full SEO editorial content

**New States Added** (Batch 4):
- Vermont (Burlington)
- Connecticut (New Haven)
- Alabama (Birmingham)
- Maine (Portland)
- Alaska (Anchorage)
- District of Columbia (Washington)

**Next Actions:**
- Run image scraping pipeline for new artists (via admin panel)
- Generate embeddings for new portfolio images
- Monitor search performance across new cities
- Consider additional expansion based on success metrics

**Core Features Working:**
- Multi-modal search (image, text, Instagram post/profile links)
- Artist profiles with claim flow
- City/state/style browse pages with SEO content
- Pro tier with auto-sync, pinning, unlimited portfolio
- **Multi-location support** (Free: 1 location, Pro: up to 20)
- International artist support (195+ countries)
- Storybook component development
- **Admin panel** (magic link auth, mining dashboard, featured artist management, **full pipeline control**)

## Completed Phases

| Phase | Status | Summary |
|-------|--------|---------|
| 1 | ✅ | Database schema (subscriptions, analytics, promo codes) |
| 2 | ✅ | Instagram OAuth via Facebook Login + Vault encryption |
| 3 | ✅ | Claim flow with handle matching + audit trail |
| 4 | ✅ | Add-artist page (self-add + recommendations) |
| 5 | ✅ | 5-step onboarding + test user infrastructure |
| 6 | ✅ | Portfolio management (free 20, pro 100, pinning) |
| 7 | ✅ | Profile editor + delete flow |
| 8 | ✅ | Legal pages (terms, privacy, about, contact - Stripe-ready) |
| 10 | ✅ | Email notifications (Resend - welcome, sync failures, rate limiting, unsubscribe) |
| 11 | ✅ | Instagram auto-sync for Pro (daily cron) |
| 12 | ✅ | Search ranking boosts + Pro/Featured badges |
| 13 | ✅ | Analytics dashboard (Redis caching, tracking, Recharts visualization) |
| 14 | ✅ | Admin panel (mining dashboard, featured artist management) |
| 15 | ✅ | Multi-location support (international, tier-based limits) |

## Pending Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 9 | Stripe subscription + webhooks | Not started (legal pages ready) |

## Ready-to-Run Pipelines

**Instagram Mining** (discover new artists):
```bash
npm run mine:hashtags              # ~$2.60/1K posts
npm run mine:followers             # ~$0.10/1K followers
npm run mine:status                # View stats
```

**Content Pipeline** (process artists to searchable):
```bash
npm run scrape-instagram           # Apify parallel scraping
npm run process-images             # Upload to Supabase Storage

# Embeddings (choose one):
python3 scripts/embeddings/local_batch_embeddings.py  # A2000 only (5 hours/20k)
python3 scripts/embeddings/dual_gpu_embeddings.py     # Dual-GPU (1.5 hours/20k, local only)

npx tsx scripts/embeddings/create-vector-index.ts     # Rebuild vector index
```

**Admin Pipeline Control** (via `/admin/pipeline`):
- View pipeline stage counts (Need Images → Need Embeddings → Complete)
- Trigger jobs from UI (Scrape, Generate Embeddings, Rebuild Index)
- Retry failed scraping jobs
- View job history with progress tracking
- Confirmation dialogs for expensive operations
- Audit logging for all pipeline actions
- Rate limiting (10 triggers/hour, 5 retries/hour per admin)
- Race condition prevention via database unique constraint

**New City Setup:**
1. Add to `lib/constants/cities.ts`
2. `npm run discover-artists -- --city "City" --state "XX"`
3. `npm run scrape-instagram -- --city "city-slug"`
4. `python scripts/embeddings/local_batch_embeddings.py`
5. Update vector index via `npx tsx scripts/embeddings/create-vector-index.ts`

## Admin Access

Access via `/admin/login`:
- **Whitelisted emails:** rbaten@gmail.com, gr0x01@pm.me
- **Auth method:** Magic link (Supabase)
- **Dev mode:** Magic link URL returned in API response (no email required)

## Test Users

Access via `/dev/login` (development only):

| User | Type | Purpose |
|------|------|---------|
| Jamie Chen | Unclaimed | Test claim flow |
| Alex Rivera | Free | Test free tier limits |
| Morgan Black | Pro | Test pro features |

## Key Architecture

- **Search:** CLIP embeddings (768-dim) + pgvector IVFFlat
- **Images:** Supabase Storage (WebP thumbnails)
- **Auth:** Supabase Auth + Instagram OAuth via Facebook Login
- **Tokens:** Encrypted in Supabase Vault (no plaintext)
- **Embeddings:** Dual-GPU setup (A2000 + RTX 4080) - local network only
- **Caching:** Redis (Railway) - rate limiting + analytics caching (fail-open design)

## Embedding Infrastructure

**Dual-GPU Setup (Local Development Only):**
- **Primary GPU:** NVIDIA A2000 12GB (Mac/Linux) - `https://clip.inkdex.io`
- **Secondary GPU:** NVIDIA RTX 4080 16GB (Windows) - `http://10.2.0.10:5000`
- **Performance:** ~1.5 hours for 20k images (vs 5 hours A2000 alone)
- **Work Distribution:** 4080 processes 60%, A2000 processes 40%

**Current Limitations:**
- Dual-GPU only works when running admin panel locally (`localhost:3000`)
- Production admin panel (Vercel) can only use A2000 (Windows GPU not accessible)
- To enable dual-GPU in production, would need Cloudflare Tunnel setup (documented in `docs/dual-gpu-cloudflare-setup.md`)

**Recommendation:**
- Use dual-GPU for large local batches (>10k images)
- Use A2000 only for smaller production jobs via admin panel
- For overnight jobs, A2000 alone is fine (5 hours for 20k images)

## Reference Docs

- **Detailed specs:** `/memory-bank/projects/user-artist-account-implementation.md`
- **Tech stack:** `/memory-bank/architecture/techStack.md`
- **Testing guide:** `/memory-bank/development/testing-guide.md`
