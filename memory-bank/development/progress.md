---
Last-Updated: 2026-01-07
Maintainer: RB
Status: Production Ready
---

# Progress Log: Inkdex

## Platform Metrics

| Metric | Value |
|--------|-------|
| Cities | 8 |
| Artists | 1,501 |
| Images | 9,803 (100% with embeddings) |
| Static Pages | ~1,600 |
| SEO Content | ~65,000 words |

## Recent Completions

### Jan 7, 2026
- **Phase 15 complete** - Multi-location support for artists
  - New `artist_locations` table with international support (195+ countries)
  - Free tier: 1 location (US: city OR state, International: city + country)
  - Pro tier: Up to 20 locations worldwide
  - LocationPicker component for onboarding
  - LocationManager component for dashboard
  - Search functions updated for multi-location filtering
  - Atomic location updates via RPC (prevents race conditions)
  - Input sanitization and country code whitelist validation

### Jan 5, 2026
- **Storybook setup** - Component dev with mock auth (5 user states)
- **Phase 6 complete** - Pro tier features (crown badges, pinning, unlimited portfolio)
- **Phase 7 complete** - Profile editor with multi-step delete

### Jan 4, 2026
- **Phase 4 complete** - Add-artist page (self-add + recommendations)

### Jan 3, 2026
- **Vercel Analytics** - Page views + Web Vitals tracking
- **Phase 3 complete** - Claim flow with atomic transactions

### Jan 2, 2026
- **Phase 11 complete** - Instagram auto-sync for Pro (daily cron)
- **Phase 12 complete** - Search ranking boosts + badges
- **Instagram Mining Pipeline** - Ready for 10k+ artist discovery
- **Phase 1-2 complete** - Database schema + OAuth infrastructure

### Jan 1, 2026
- **5-city expansion** - NYC, Chicago, Portland, Seattle, Miami
- **SEO editorial content** - 80 style pages + 8 city + 8 state pages
- **Image cleanup** - Removed 1,364 non-portfolio images
- **Smart unified input** - Auto-detects images, text, Instagram URLs

### Dec 31, 2025
- **Atlanta + LA expansion** - 386 artists, 2,378 images
- **Instagram post/profile search** - Paste URL to find similar
- **Hybrid CLIP system** - Local GPU + Modal fallback

### Dec 29-30, 2025
- **Austin launch** - 188 artists, 1,257 images
- **Core search** - Image upload + text query
- **Featured artist system** - Based on engagement metrics

## Cost Summary

| Item | Cost |
|------|------|
| Discovery (8 cities) | ~$26 |
| Scraping (Apify) | ~$160-200 |
| Classification | ~$4 |
| Embeddings | ~$2 |
| **Total one-time** | ~$200 |
| **Monthly** | ~$7 |

## Architecture Decisions

1. **IVFFlat** over HNSW - Better for our 10k vector scale
2. **Apify** over Instaloader - 10x faster scraping
3. **GPT-5-nano** for classification - $0.01/2,500 images
4. **Hybrid CLIP** - 90% cost reduction vs Modal-only
5. **Handle matching** for claims - All artists have handles, none have IDs

## Known Issues

- ESLint warnings in `/scripts` (dev tools, non-blocking)
- Rate limiter in-memory (resets on deploy, acceptable for MVP)

## Next Priorities

1. **Phase 8** - Legal pages before Pro launch
2. **Phase 9** - Stripe integration
3. **Phase 13** - Analytics dashboard
4. Run mining pipeline for 10k+ artists
