# Apify to ScrapingDog Migration

**Started:** 2026-01-11
**Status:** In Progress
**Goal:** Replace Apify with ScrapingDog for Instagram scraping (~5x cost reduction)

---

## Cost Comparison

| Service | Cost for 16k Artists | Monthly Plan |
|---------|---------------------|--------------|
| Apify | ~$200 | $49+ |
| **ScrapingDog** | **~$36** | $90 (Standard, 1M credits) |

**Savings:** ~$160 per 16k artists (~80% reduction)

---

## Testing Summary (2026-01-11)

| Test | Result |
|------|--------|
| Profile data fetching | ✅ |
| Posts included in response | ✅ 12 per request |
| Image URL downloading | ✅ CDN links work |
| Error handling | ✅ Private/deleted/invalid |
| Success rate | ✅ 90% (13/14 profiles) |
| Response time | ✅ ~2s avg |
| Data structure match | ✅ 1:1 with Apify |

**Test credits used:** 225

---

## Files to Migrate

### High Priority (Core Functionality)

- [x] `lib/instagram/profile-fetcher.ts`
  - Used by: Search API, recommend flow, profile lookups, auto-sync
  - Change: ScrapingDog primary, Apify fallback
  - Status: **COMPLETE** (2026-01-11)

- [x] `lib/instagram/auto-sync.ts`
  - Uses `fetchInstagramProfileImages` from profile-fetcher.ts
  - Status: **COMPLETE** (automatically uses ScrapingDog via profile-fetcher)

### Medium Priority (Batch Scripts)

- [ ] `scripts/scraping/apify-scraper.py`
  - Used by: Bulk artist scraping pipeline
  - Change: Create new ScrapingDog batch scraper or update existing
  - Status: **Not started**

- [ ] `scripts/scraping/process-batch.ts`
  - Used by: Processing scraped images
  - Change: May need updates if data format differs
  - Status: **Not started**

### Low Priority (Mining/Discovery)

- [ ] `lib/instagram/hashtag-scraper.ts`
  - Used by: Hashtag mining for artist discovery
  - Note: Check if ScrapingDog has hashtag API
  - Status: **Not started**

- [ ] `lib/instagram/follower-scraper.ts`
  - Used by: Follower mining from seed accounts
  - Note: Check if ScrapingDog has followers API
  - Status: **Not started**

---

## New Files Created

- [x] `lib/instagram/scrapingdog-client.ts` - Core client library
- [x] `scripts/scraping/test-scrapingdog.ts` - Single profile test
- [x] `scripts/scraping/test-scrapingdog-batch.ts` - Batch test script

---

## Environment Variables

- [x] `SCRAPINGDOG_API_KEY` added to `.env.local`
- [ ] Add to Vercel environment variables (production)
- [x] Add to `.env.example` for documentation
- [x] Add to `lib/config/env.ts` schema validation

---

## Migration Strategy

### Phase 1: Dual-Client Setup (Current)
1. Keep Apify as fallback
2. Add ScrapingDog as primary for profile fetching
3. Monitor success rates and costs

### Phase 2: Full Migration
1. Switch all profile fetching to ScrapingDog
2. Update batch scraping scripts
3. Deprecate Apify for profiles (keep for hashtag/follower mining if needed)

### Phase 3: Cleanup
1. Remove unused Apify code
2. Update documentation
3. Cancel/downgrade Apify subscription

---

## ScrapingDog API Reference

**Base URL:** `https://api.scrapingdog.com/instagram`

**Endpoints:**
- `GET /profile?api_key=KEY&username=USERNAME` - Profile + 12 posts (15 credits)
- `GET /posts?api_key=KEY&id=USER_ID` - More posts, paginated (15 credits)

**Credit Costs:**
- Profile request: 15 credits
- Posts request: 15 credits

**Plans:**
- Free: 1,000 credits
- Lite: $40/mo - 200K credits
- Standard: $90/mo - 1M credits (~66k profiles)
- Pro: $200/mo - 3M credits

---

## Progress Log

### 2026-01-11 (Session 2)
- **Refactored `profile-fetcher.ts`** - ScrapingDog primary, Apify fallback
- Updated `lib/config/env.ts` with schema validation
- Updated `.env.example` with documentation
- Tested end-to-end: ScrapingDog works, Apify fallback works
- **Credits used this session:** 15 (1 profile test)
- **Total credits used:** 240

### 2026-01-11 (Session 1)
- Created ScrapingDog client library
- Tested 14 profiles, 90% success rate
- Verified image downloads work
- Confirmed 1:1 data structure match with Apify
- Added API key to `.env.local`
- Created this project doc
- **Credits used:** 225

---

## Open Questions

1. Does ScrapingDog have hashtag scraping API? (for mining)
2. Does ScrapingDog have followers API? (for seed mining)
3. Rate limits at scale? (need to test with larger batch)

---

## Rollback Plan

If ScrapingDog issues arise:
1. Apify client remains in codebase
2. Switch `INSTAGRAM_SCRAPER_PRIMARY` env var to `apify`
3. No code changes needed if we implement feature flag
