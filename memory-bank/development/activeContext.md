---
Last-Updated: 2026-01-06 (Session 19 - Color Search Complete)
Maintainer: RB
Status: Launched - All 15 Phases Complete + Color-Weighted Search
---

# Active Context: Inkdex

## Current State

**Platform:** Production - 116 cities, 15,626 artists, 92,038 images with embeddings

**Live Cities:** 116 cities across all 50 states + DC (see quickstart.md for full list)

**Style System:** 20 styles with averaged CLIP embeddings from multiple seed images

**Color Search:** 92,033 images analyzed, 10,704 artists with color profiles

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

## Color-Weighted Search (Jan 6, 2026) ✅ COMPLETE

**Goal:** Improve search relevance by boosting images whose color profile matches the query image (color vs black-and-gray).

**Status:** Fully deployed and operational.

**Results:**
| Metric | Value |
|--------|-------|
| Images analyzed | 92,033 |
| Color images | ~71% |
| B&G images | ~29% |

**Implementation (Simplified):**
- `portfolio_images.is_color` - boolean column set during scraping
- Color analyzer: `lib/search/color-analyzer.ts` (HSL saturation analysis, threshold 0.15)
- Scraping pipeline: New images classified at ingest (`scripts/scraping/process-batch.ts`)
- SQL function: Image-level color boost in `search_artists_with_style_boost()`
- **No artist-level aggregation needed** - color boost applied directly to matching images

**Color Boost Logic (image-level):**
- Query color matches image color → +0.05 boost to that image's similarity score
- No match → no boost
- Artist's final color boost = average of their matching images' color boosts

**Architecture Decision:**
- Removed `artist_color_profiles` table (over-engineering)
- Color boosting now happens at image level in the search function
- Simpler, no aggregation step needed, works automatically as images are added

**Commands:**
```bash
# Check color analysis status
npx tsx scripts/colors/check-status.ts

# Re-analyze images if needed (run in Codespace for speed)
while true; do npx tsx scripts/colors/analyze-image-colors.ts --limit 10000 --concurrency 100; sleep 2; done
```

---

## SQL Refactor for 100k Scale (Jan 6, 2026) ✅ COMPLETE

**Goal:** Refactor SQL infrastructure to support 100k+ artists and 1-2M images.

**All Phases Complete:**

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Git tag `pre-sql-refactor` + folder structure | ✅ |
| 1 | Extract `is_gdpr_country()` + `matches_location_filter()` | ✅ |
| 2 | Split SQL into `search/`, `location/`, `admin/` folders | ✅ |
| 3 | Create `artist_sync_state` table (extracted from artists) | ✅ |
| 4 | Create `artist_pipeline_state` table (extracted from artists) | ✅ |
| 5 | Drop deprecated columns from artists table | ✅ |
| 6 | Add `search_tier` column for HNSW prep | ✅ |

**New SQL Structure:**
```
supabase/functions/
├── _shared/
│   ├── gdpr.sql              # is_gdpr_country() - 15 lines
│   └── location_filter.sql   # matches_location_filter() - 27 lines
├── search/
│   └── vector_search.sql     # 5 search functions - 696 lines (SOURCE OF TRUTH)
├── location/
│   └── location_counts.sql   # 4 location count functions - 212 lines
├── admin/
│   └── admin_functions.sql   # Admin + homepage stats - 276 lines
└── search_functions.sql      # INDEX FILE - documentation only (112 lines)
```

**Result:** 1,272 line monolith → 5 domain files + 1 index file

**New Tables:**
- `artist_sync_state` - Instagram sync state (extracted from artists)
- `artist_pipeline_state` - Scraping pipeline state (extracted from artists)

**Scale Preparation:**
- `portfolio_images.search_tier` column added ('active'/'archive')
- At 1M+ images: active tier uses HNSW, archive uses IVFFlat
- Reduced 46-column artists table to 34 columns

**Plan Document:** `/memory-bank/projects/sql-refactor-plan.md`

---

## Apify Cost Optimization (Jan 6, 2026)

**Dual-Account Strategy** - Separate free/paid Apify accounts:
- `APIFY_API_TOKEN_FREE` - Free tier ($5/mo credit) for lightweight ops
- `APIFY_API_TOKEN` - Paid account for heavy pipeline scraping

**Token Usage:**
| Operation | Token |
|-----------|-------|
| Profile searches, Pro auto-sync | FREE (fallback to PAID) |
| Hashtag/follower mining, bulk scraper | PAID only |

**Files Changed:**
- `lib/instagram/profile-fetcher.ts` - Uses FREE first
- `lib/config/env.ts` - Added schema validation
- `.env.example` - Documented new var

**Result:** After initial bulk scraping, ongoing costs drop from ~$40/mo to ~$0 (free tier covers Pro auto-sync and profile searches).

## SEO Enhancements (Jan 5, 2026)

**IndexNow Integration** - Notify Bing/Yandex of content changes:
- `lib/seo/indexnow.ts` - Client library with retry logic
- `app/api/seo/indexnow/route.ts` - Admin API for manual submissions
- Auto-notifies when artists discovered via pipeline
- Database tracking in `indexnow_submissions` table
- Key file: `public/{INDEXNOW_KEY}.txt` (generated from env var)
- Env var: `INDEXNOW_KEY` (see .env.local)

**City Guides** - Long-form editorial content:
- `/guides` - Index page listing all guides
- `/guides/[city]` - Individual guide pages (~1,500-2,000 words)
- Components: `TableOfContents`, `NeighborhoodSection`, `GuideCard`
- Content: `lib/content/editorial/guides.ts` (Austin, LA complete)
- Generation: `scripts/seo/generate-guide-content.ts`
- Includes Schema.org Article markup, breadcrumbs, FAQ integration

**Next Actions:**
- Add `INDEXNOW_KEY` to Vercel environment
- Run `npm run db:push` to apply IndexNow migration
- Generate more city guide content: `npx tsx scripts/seo/generate-guide-content.ts --limit 20`
- Run image scraping pipeline for new artists (via admin panel)
- Generate embeddings for new portfolio images
- Monitor search performance across new cities

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
| 9 | ✅ | Stripe subscriptions (checkout, webhooks, customer portal) |
| 10 | ✅ | Email notifications (Resend - welcome, sync failures, rate limiting, unsubscribe) |
| 11 | ✅ | Instagram auto-sync for Pro (daily cron) |
| 12 | ✅ | Search ranking boosts + Pro/Featured badges |
| 13 | ✅ | Analytics dashboard (Redis caching, tracking, Recharts visualization) |
| 14 | ✅ | Admin panel (mining dashboard, featured artist management) |
| 15 | ✅ | Multi-location support (international, tier-based limits) |

## Pending Phases

All 15 phases complete!

**Production Stripe Setup Required:**
- Add env vars to Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Create webhook in Stripe Dashboard → `https://inkdex.io/api/stripe/webhook`
- Switch from test keys (`sk_test_`, `pk_test_`) to live keys (`sk_live_`, `pk_live_`) when ready

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

## Style System

**20 Styles** with averaged CLIP embeddings (multiple seed images per style):

| Category | Styles |
|----------|--------|
| Classic | traditional, neo-traditional, japanese, tribal, chicano |
| Modern | blackwork, illustrative, realism, watercolor, minimalist |
| Specialty | anime, horror, stick-and-poke, new-school, surrealism |
| Technique | dotwork/ornamental, sketch, lettering, biomechanical, trash-polka |

**Top Styles by Coverage:**
- blackwork: 40.9% of images, 6,825 artists
- stick-and-poke: 26.5% of images, 5,199 artists
- illustrative: 26.1% of images, 6,172 artists

**Style Pipeline:**
```bash
# Add new style:
# 1. Add seed images to tmp/seeds/{style}-1.jpg, {style}-2.jpg, etc.
# 2. Add style definition to scripts/styles/generate-averaged-seeds.ts
# 3. Run pipeline:
npx tsx scripts/styles/generate-averaged-seeds.ts --dir ./tmp/seeds
npx tsx scripts/styles/tag-images.ts --clear
npx tsx scripts/styles/compute-artist-profiles.ts --clear
```

## Key Architecture

- **Search:** CLIP embeddings (768-dim) + pgvector IVFFlat
- **Images:** Supabase Storage (WebP thumbnails)
- **Auth:** Supabase Auth + Instagram OAuth via Facebook Login
- **Tokens:** Encrypted in Supabase Vault (no plaintext)
- **Embeddings:** Dual-GPU setup (A2000 + RTX 4080) - local network only
- **Caching:** Redis (Railway) - rate limiting + analytics caching (fail-open design)
- **GDPR Compliance:** EU/EEA/UK/CH artists filtered from discovery + search (see below)
- **Artist Location Sync:** Trigger auto-syncs `artists` → `artist_locations` on INSERT (see below)

## GDPR/Privacy Compliance

**Status:** Implemented (pending migration deployment)

**Two-Layer Defense:**
1. **Discovery Pipeline:** Bio location extractor detects EU cities/countries → artists skipped before insertion
2. **Search Filtering:** SQL functions exclude artists with EU `country_code` in `artist_locations`

**Countries Filtered (32):**
- EU 27 + EEA 3 (Iceland, Liechtenstein, Norway) + UK + Switzerland

**Key Files:**
- `/lib/constants/countries.ts` - `GDPR_COUNTRY_CODES` set + `isGDPRCountry()` helper
- `/lib/instagram/bio-location-extractor.ts` - `checkBioForGDPR()`, EU city/country detection
- `/scripts/discovery/*.ts` - GDPR filtering before artist insertion
- `/supabase/migrations/20260111_007_filter_eu_artists_gdpr.sql` - SQL function updates

**Behavior:**
- Artists with unknown location: NOT filtered (can't determine if EU)
- Artists with any EU location: Filtered (conservative approach)
- Existing EU artists: Hidden from search results after migration

**To Deploy:**
```bash
npm run db:push  # Apply GDPR migration
```

## Artist Location Auto-Sync

**Status:** Deployed (Jan 5, 2026)

**Problem Solved:** Cities like Houston, Dallas, Boston were returning 404 because artists discovered after the `artist_locations` migration had no entries in that table. City pages query `artist_locations`, not `artists`.

**Solution:** Database trigger + backfill migration (`20260105_003_sync_artist_locations.sql`):
1. **Trigger:** `sync_artist_location_on_insert` auto-creates `artist_locations` entry when artist is inserted
2. **Backfill:** One-time INSERT synced all existing artists missing from `artist_locations`

**Key Files:**
- `/supabase/migrations/20260105_003_sync_artist_locations.sql` - Trigger + backfill

**Behavior:**
- New artists automatically get `artist_locations` entry (no script changes needed)
- All discovery scripts (tavily, hashtag-mining, follower-mining, classify-pending) now work correctly
- City pages query `artist_locations` via `getLocationArtists()` in `/lib/supabase/queries.ts`

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
