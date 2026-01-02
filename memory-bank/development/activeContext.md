---
Last-Updated: 2026-01-07
Maintainer: RB
Status: Production Ready - 8 Cities Live
---

# Active Context: Inkdex

## Current State

**Platform:** Production - 8 cities, 1,501 artists, 9,803 images (100% searchable)

**Live Cities:** Austin, Atlanta, Los Angeles, New York, Chicago, Portland, Seattle, Miami

**Core Features Working:**
- Multi-modal search (image, text, Instagram post/profile links)
- Artist profiles with claim flow
- City/state/style browse pages with SEO content
- Pro tier with auto-sync, pinning, unlimited portfolio
- **Multi-location support** (Free: 1 location, Pro: up to 20)
- International artist support (195+ countries)
- Storybook component development

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
| 11 | ✅ | Instagram auto-sync for Pro (daily cron) |
| 12 | ✅ | Search ranking boosts + Pro/Featured badges |
| 15 | ✅ | Multi-location support (international, tier-based limits) |

## Pending Phases

| Phase | Description |
|-------|-------------|
| 8 | Legal pages (terms, privacy, about) |
| 9 | Stripe subscription + webhooks |
| 10 | Email notifications (Resend) |
| 13 | Analytics dashboard (Pro only) |
| 14 | Admin panel (featured curation, promo codes) |

## Ready-to-Run Pipelines

**Instagram Mining** (discover new artists):
```bash
npm run mine:hashtags              # ~$2.60/1K posts
npm run mine:followers             # ~$0.10/1K followers
npm run mine:status                # View stats
```

**New City Setup:**
1. Add to `lib/constants/cities.ts`
2. `npm run discover-artists -- --city "City" --state "XX"`
3. `npm run scrape-instagram -- --city "city-slug"`
4. `python scripts/embeddings/local_batch_embeddings.py`
5. Update vector index via `npx tsx scripts/embeddings/create-vector-index.ts`

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
