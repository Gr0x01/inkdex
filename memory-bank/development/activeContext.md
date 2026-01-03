---
Last-Updated: 2026-01-03 (Session 6 - 13-City Expansion Researched)
Maintainer: RB
Status: Production Ready - 12/14 Phases Complete (86%) + 13-City Expansion Planned
---

# Active Context: Inkdex

## Current State

**Platform:** Production - 8 cities, 3,553 artists, 9,803 images (100% searchable)

**Live Cities:** Austin, Atlanta, Los Angeles, New York, Chicago, Portland, Seattle, Miami

**Pending Pipeline:** 2,178 artists need image scraping

## Expansion Plan (Next 13 Cities)

**Market Research Complete:** DataForSEO analysis on Jan 3, 2026 identified 13 mid-tier cities with high opportunity scores (77-84/100).

**Recommended Rollout Strategy:**

**Phase A - Quick Wins (Tier 1: Lowest Competition)**
1. Richmond, VA (84/100, 13% comp, 254k searches)
2. Asheville, NC (84/100, 11% comp, 250k searches)
3. Charlotte, NC (84/100, 14% comp, 256k searches)

**Phase B - Volume Play (Tier 2: Strong Mid-Market)**
4. Philadelphia, PA (82/100, 27% comp, 255k searches)
5. Columbus, OH (81/100, 25% comp, 252k searches)
6. Salt Lake City, UT (81/100, 22% comp, 251k searches)
7. Nashville, TN (80/100, 38% comp, 266k searches)
8. San Francisco, CA (80/100, 42% comp, 254k searches)

**Phase C - Scale (Tier 3: Highest Volume)**
9. Phoenix, AZ (79/100, 45% comp, **317k searches** - highest demand)
10. Las Vegas, NV (80/100, 42% comp, 297k searches)
11. San Diego, CA (77/100, 55% comp, 266k searches)
12. San Antonio, TX (79/100, 36% comp, 259k searches)
13. Tampa, FL (78/100, 41% comp, 258k searches)

**Next Actions:**
- Add cities to `lib/constants/cities.ts`
- Run discovery pipeline for Tier 1 cities first
- Batch scraping + embeddings via admin panel

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
| 14 | ✅ | Admin panel (mining dashboard, featured artist management) |
| 15 | ✅ | Multi-location support (international, tier-based limits) |

## Pending Phases

| Phase | Description |
|-------|-------------|
| 9 | Stripe subscription + webhooks |
| 13 | Analytics dashboard (Pro only) |

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
python3 scripts/embeddings/local_batch_embeddings.py  # Generate CLIP embeddings
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
- **Embeddings:** Local GPU primary, Modal.com fallback

## Reference Docs

- **Detailed specs:** `/memory-bank/projects/user-artist-account-implementation.md`
- **Tech stack:** `/memory-bank/architecture/techStack.md`
- **Testing guide:** `/memory-bank/development/testing-guide.md`
