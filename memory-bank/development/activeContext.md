---
Last-Updated: 2026-01-11
Maintainer: RB
Status: Launched - Production
---

# Active Context: Inkdex

## Current State

**Platform:** Production - 116 cities, 16,324 artists, 99,258 images with embeddings

**Live Cities:** 116 cities across all 50 states + DC (see quickstart.md for full list)

**Style System:** ML classifier (sklearn logistic regression) trained on 15k GPT-labeled images

**Display Styles:** 11 styles (added japanese + anime after ML accuracy improved)

**Color Search:** 92,033 images analyzed, 10,704 artists with color profiles

---

## Google Search Console SEO Fixes (Jan 11, 2026) ✅

**Problem:** Google Search Console reported:
- 4.46K pages "Discovered - currently not indexed" (404 URLs!)
- 26 pages "Duplicate without user-selected canonical" (www vs non-www)
- 23 pages "Crawled - currently not indexed"

**Root Causes:**

1. **CRITICAL: Sitemap URL format was wrong** - Generated `/texas/austin` instead of `/us/tx/austin`
   - State URLs: `/${state.slug}` → should be `/us/${state.code.toLowerCase()}`
   - City URLs: `/${state.slug}/${citySlug}` → should be `/us/${regionCode}/${citySlug}`
   - Style URLs: similar fix
   - This caused 4.46K pages to be 404 errors in sitemap!

2. **No www → non-www redirect** - Both www.inkdex.io and inkdex.io served same content

3. **Conflicting robots.txt files** - `public/robots.txt` (allows AI) vs `app/robots.ts` (blocks AI)

4. **Relative canonical URLs** - Some pages used `/artist/slug` instead of `https://inkdex.io/artist/slug`

**Fixes Applied:**

| Fix | File |
|-----|------|
| Fixed sitemap URL format | `app/sitemap.ts` |
| Added www redirect (308) | `next.config.js` |
| Deleted conflicting robots | Removed `public/robots.txt` |
| Made canonicals absolute | `app/artist/[slug]/page.tsx`, `app/[country]/page.tsx`, `app/[country]/[region]/page.tsx` |
| Added missing pages to sitemap | Style guides, learn guides, marketing pages |

**Pages Added to Sitemap:**
- `/styles`, `/for-artists`, `/how-it-works`, `/first-tattoo`, `/how-to-find-tattoo-artist`, `/pricing`
- `/guides/styles`, `/guides/styles/{style}` (style guide pages)
- `/guides/learn`, `/guides/learn/{topic}` (topical guide pages)

**Next Steps:**
1. Deploy to production
2. Resubmit sitemap in GSC (`https://inkdex.io/sitemap.xml`)
3. Click "Validate Fix" on GSC issues
4. Wait 2-7 days for Google to re-crawl and index

**Verification:**
```bash
# Check sitemap locally
npm run dev
# Visit http://localhost:3000/sitemap.xml - verify URLs are /us/tx/austin format

# Test www redirect
curl -I https://www.inkdex.io/  # Should return 308 → https://inkdex.io/
```

---

## ScrapingDog Migration (Jan 11, 2026) ✅

**Goal:** Replace Instaloader VPS and Apify with ScrapingDog API for Instagram scraping (5x cheaper than Apify).

**Status:** Complete - ScrapingDog is now primary for both single profiles AND batch scraping.

**Architecture:**
- **Batch Scraper:** `scripts/scraping/scrapingdog-scraper.ts` - 50 concurrent requests (Standard plan)
- **Single Profile:** `lib/instagram/profile-fetcher.ts` - ScrapingDog first, Apify fallback
- **API Client:** `lib/instagram/scrapingdog-client.ts` - Low-level ScrapingDog wrapper
- **Cost:** ~$90/mo for 1M credits (~66k profiles) - Standard plan with 50 concurrency

**Commands:**
```bash
npm run scrape-instagram              # ScrapingDog batch (50 concurrent)
npm run scrape-instagram -- --limit 100   # Test with N artists
npm run scrape-instagram -- --profile-only # Profile images only
npm run scrape-instagram:apify        # Legacy Apify scraper (30 concurrent)
```

**Removed (archived):**
- VPS orchestrator system (`scripts/_archive/orchestrator/`)
- Instaloader scripts (`scripts/_archive/instaloader/`)
- Admin orchestrator page and VultrMinerStatus component
- `/api/admin/vultr/*` and `/api/admin/orchestrator/*` routes

**Env var:** `SCRAPINGDOG_API_KEY` (required for primary scraping)

---

## Style Tag Retrigger Fix (Jan 11, 2026) ✅

**Problem 1: Image deletion didn't retrigger style recomputation**

Migration `20260110150600` removed the `recompute_styles_on_image_delete` trigger, assuming statement-level triggers on `image_style_tags` would handle it. This was architecturally flawed - when an image is deleted, the cascade delete on tags happens *after* the image is gone, so the JOIN to find the artist returns empty.

**Fix:** Restored BEFORE DELETE trigger on `portfolio_images` in migration `20260111220000_restore_image_delete_trigger.sql`.

**Problem 2: Auto-sync bypassed style tagging**

`lib/instagram/auto-sync.ts` generated embeddings but never called `predictStyles()` or wrote to `image_style_tags`. Pro artists' auto-synced images had no style tags.

**Fix:** Added style prediction to auto-sync flow - now calls `predictStyles()` after embedding generation and inserts to `image_style_tags`.

**Files Changed:**
- `supabase/migrations/20260111220000_restore_image_delete_trigger.sql` - New: Restore trigger
- `lib/instagram/auto-sync.ts` - Add style prediction + tag insertion
- `scripts/maintenance/retag-missing-styles.ts` - Fix infinite loop on no-style images
- `scripts/maintenance/recompute-all-artist-profiles.ts` - New: Recompute ALL profiles

**Additional Issue Found:** The `trg_update_artist_styles_on_tag_insert` trigger wasn't reliably aggregating image_style_tags into artist_style_profiles. 11,578 of 12,120 artists were missing profiles. Ran full recompute to fix.

**Verification:**
```bash
# Check trigger exists
npx supabase migration list

# Check orphaned images (should be 0 or very low)
npx tsx scripts/maintenance/retag-missing-styles.ts --dry-run

# Count artists with profiles (should be ~12k)
npx tsx scripts/debug/check-artist-tags.ts --count-profiles

# Check specific artist
npx tsx scripts/debug/check-artist-tags.ts <artist-id>

# Recompute all profiles (if needed)
npx tsx scripts/maintenance/recompute-all-artist-profiles.ts
```

---

## Local Supabase Setup (Jan 9, 2026) ✅

**Purpose:** Safe testing environment for style tagging system iteration (threshold tuning, retraining classifier, new styles) without affecting production.

**Current Local DB Stats:**
| Table | Records |
|-------|---------|
| Artists | 13,432 |
| Portfolio Images | 68,282 |
| Style Seeds | 20 |
| Image Style Tags | Regenerated locally |

**Setup:**
1. `.env.local` configured to switch between production/local (see comments in file)
2. Seed data generated from production via `dump-production-seed.ts`
3. Style tags regenerated locally with raised thresholds

**Key Commands:**
```bash
# Generate fresh seed from production (requires prod credentials in .env.local)
npx tsx scripts/seed/dump-production-seed.ts --artists 5000 --all-images

# Start local Supabase
npm run db:local:start

# Load seed data (applies migrations + seed.sql)
npm run db:local:reset

# Stop local Supabase
npm run db:local:stop

# Regenerate style tags with current thresholds
npx tsx scripts/styles/tag-images-ml.ts --clear --concurrency 200
```

**Local URLs:**
| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio (SQL Editor) | http://127.0.0.1:54323 |
| Inbucket (Test Emails) | http://127.0.0.1:54324 |

**Note:** After iterating on thresholds locally, apply same changes to production via `npm run db:push` and re-run tagging scripts against production.

---

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

## Airtable Marketing Integration (Jan 7, 2026) ✅ COMPLETE

**Goal:** Flexible marketing workflow via Airtable as source of truth.

**Features:**
- **Push to Airtable**: Select artist candidates by follower range, push with full data (photos, bio, stats)
- **Pull from Airtable**: Sync status updates, featured flags, notes back to DB
- **Auto-sync**: Vercel cron every 5 minutes pulls changes
- **Featured expiration**: `featured_expires_at` auto-clears `is_featured` via pg_cron

**New Files:**
- `lib/airtable/client.ts` - Airtable API wrapper
- `app/api/admin/airtable/push/route.ts` - Push artists to Airtable
- `app/api/admin/airtable/pull/route.ts` - Pull updates from Airtable
- `app/api/admin/airtable/status/route.ts` - Sync status endpoint
- `app/api/cron/airtable-sync/route.ts` - Auto-sync cron job
- `components/admin/AirtableSyncPanel.tsx` - Admin UI panel

**Database Changes:**
- `artists.featured_at`, `artists.featured_expires_at` - Featured expiration
- `marketing_outreach.airtable_record_id`, `airtable_synced_at` - Sync tracking
- `airtable_sync_log` table - Audit trail
- `expire_featured_artists()` function - Auto-expire via pg_cron

**Airtable Schema (Outreach table):**
- DB-pushed fields: instagram_handle, name, city, follower_count, bio, profile_url, image_1-4
- User-editable: status, featured, feature_days, post_date, dm_date, response_notes

**Env vars:** `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`, `AIRTABLE_OUTREACH_TABLE_ID`

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
│   └── vector_search.sql     # 4 search functions - 519 lines (SOURCE OF TRUTH)
├── location/
│   └── location_counts.sql   # 4 location count functions - 212 lines
├── admin/
│   └── admin_functions.sql   # Admin + homepage stats - 276 lines
└── search_functions.sql      # INDEX FILE - documentation only
```

**Result:** 1,272 line monolith → 5 domain files + 1 index file

**Search Function Consolidation (Jan 7, 2026):**
- Merged `search_artists_by_embedding`, `search_artists_with_count`, `search_artists_with_style_boost` → single `search_artists()`
- Style/color params are optional (default NULL)
- Reduced `vector_search.sql` from 803 → 519 lines
- TS wrapper: unified `searchArtists()` in `lib/supabase/queries.ts`

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
| 14 | ✅ | Admin panel (pipeline dashboard, featured artist management) |
| 15 | ✅ | Multi-location support (international, tier-based limits) |

## Ready-to-Run Pipelines

**Content Pipeline** (process artists to searchable):
```bash
npm run scrape-instagram           # ScrapingDog parallel scraping
npm run process-images             # Upload to Supabase Storage

# Embeddings (dual-GPU: 4080 60% + A2000 40%)
python3 scripts/embeddings/dual_gpu_embeddings.py     # 1.5 hours/20k images

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
4. `python scripts/embeddings/dual_gpu_embeddings.py`
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

## Embedding & Style Tagging Pipeline Fix (Jan 9, 2026) ✅

**Problem:** Multiple image processing flows were broken:

| Flow | Images | Embeddings | Style Tags |
|------|--------|------------|------------|
| Auto-sync (Pro daily) | ✅ | ✅ | ✅ |
| Manual import (dashboard) | ❌ URL only | ❌ | ❌ |
| Profile search | ⚠️ Storage OK | ❌ | ❌ |
| process-artist.ts | ✅ Storage | ❌ | ❌ |

**Root Causes:**
1. Manual import stored raw Instagram URLs without downloading/processing
2. `processArtistImages()` uploaded to storage but never generated embeddings
3. Style predictor was locked inside batch script, not available as library

**Solution:**

1. **Extracted ML Style Predictor** (`lib/styles/predictor.ts`)
   - `predictStyles(embedding)` - returns styles above threshold
   - Per-style thresholds: anime=0.65, japanese=0.60, surrealism=0.55
   - Lazy-loads classifier from `models/style-classifier.json`

2. **Created Unified Processing Pipeline** (`lib/processing/process-image-complete.ts`)
   - Single function: download → thumbnails → storage → embedding → color → styles → DB
   - SSRF protection (allowed hosts: instagram.com, cdninstagram.com, fbcdn.net)
   - Embedding retry with exponential backoff (3 retries, max 10s delay)
   - Used by manual import and can be used by other flows

3. **Fixed Manual Import** (`app/api/dashboard/portfolio/import/route.ts`)
   - Returns immediately with `{ processing: true }`
   - Fire-and-forget background processing with 9-minute timeout
   - Deletes existing images, processes new ones through full pipeline
   - Audit logging for error recovery

4. **Fixed process-artist.ts**
   - Now generates CLIP embeddings inline
   - Predicts styles and inserts to `image_style_tags`
   - Skips images entirely if embedding fails (rollbacks storage uploads)
   - Sets `status: 'active'` only when embedding exists

5. **Added Retag Cron Job** (`app/api/cron/retag-missing-styles/route.ts`)
   - Hourly cron finds images with embeddings but no style tags
   - Processes up to 300 images per run (50s timeout protection)
   - Catches any images that slipped through without tags

**Key Files:**
- `lib/styles/predictor.ts` - ML style prediction library
- `lib/processing/process-image-complete.ts` - Unified pipeline
- `lib/processing/process-artist.ts` - Fixed inline embedding + styles
- `lib/storage/supabase-storage.ts` - Fixed `validatePostId()` for manual imports
- `app/api/cron/retag-missing-styles/route.ts` - Hourly cleanup cron
- `scripts/maintenance/retag-missing-styles.ts` - Manual script version

**Commands:**
```bash
# Manual retag (dry run)
npx tsx scripts/maintenance/retag-missing-styles.ts --dry-run

# Manual retag (live)
npx tsx scripts/maintenance/retag-missing-styles.ts
```

---

## Verification Status Fix (Jan 9, 2026) ✅

**Problem:** Artists added via profile search or recommend flow got `verification_status='pending'` instead of `'unclaimed'`, which hid the "Claim This Page" button on their profiles.

**Root Cause:** Two API routes incorrectly used `'pending'` status:
- `/api/add-artist/recommend` (line 234)
- `/api/search` (line 382)

All discovery scripts correctly used `'unclaimed'`, but these two user-facing routes didn't.

**Fix:**
1. Changed both routes to use `verification_status: 'unclaimed'`
2. Fixed 6 existing artists in DB with orphaned `'pending'` status (no `claimed_by_user_id`)

**Key Insight:** `'pending'` status has no defined purpose - all unclaimed artists should be `'unclaimed'`. The claim flow transitions directly to `'claimed'` when an artist completes Instagram OAuth.

---

## Image Saving Fix for Search/Recommend (Jan 8, 2026) ✅

**Problem:** When artists were added via profile search or recommend flow, images were downloaded for classification/embedding but then discarded. The scraping job would re-fetch the same images later, wasting Apify credits.

**Solution:** Save downloaded images immediately to temp directory and process them in background:
1. **Profile Search** (`/api/search` with `instagram_profile`): Images already downloaded for embedding generation → save to `/tmp/instagram/{artistId}/` → fire-and-forget processing
2. **Recommend Flow** (`/api/add-artist/recommend`): Classifier downloads images for GPT classification → save buffers → fire-and-forget processing

**Key Files:**
- `lib/instagram/classifier.ts` - `saveImagesToTemp()` for recommend flow
- `lib/instagram/image-saver.ts` - `saveImagesToTempFromBuffers()` for search flow
- `lib/processing/process-artist.ts` - Single-artist image processing (extracted from `process-batch.ts`)
- `app/api/search/route.ts` - Profile search now saves + processes images
- `app/api/add-artist/recommend/route.ts` - Recommend now saves + processes images

**Behavior:**
- API returns immediately (fast UX)
- Images processed in background via fire-and-forget
- Scraping job created as fallback (status: `'processing'` if images saved, `'pending'` otherwise)
- If background processing fails, scraping pipeline handles it later

**Security Fixes:**
- UUID validation prevents path traversal attacks
- `maxContentLength` (10MB) prevents resource exhaustion
- Cleanup on error prevents partial file leaks

---

## ML Style Classifier (Deployed Jan 8, 2026) ✅

**Philosophy:** ML classifier trained on GPT-labeled data is more accurate than CLIP seed comparison.

**Display Styles (11)** - shown on artist profile badges:
- traditional, neo-traditional, realism, black-and-gray, blackwork
- new-school, watercolor, ornamental, fine-line, japanese, anime

**Search-Only Styles** (kept for relevance, not displayed):
- tribal, trash-polka, biomechanical, sketch, geometric, dotwork, surrealism, lettering

**Anime/Japanese Threshold Tuning (Jan 9, 2026):**

Problem: Blackwork/ornamental images were being incorrectly tagged as anime/japanese with 0.66-0.76 confidence.

**Three-layer defense applied:**
1. Raised anime ML threshold: 0.50 → 0.65 → **0.80** (require 80% confidence)
2. Raised japanese ML threshold: 0.50 → 0.60 → **0.75** (require 75% confidence)
3. Display threshold: 35% (`MIN_STYLE_PERCENTAGE`) + minimum 3 images (`MIN_STYLE_IMAGE_COUNT`)

**Cleanup (Jan 9, 2026):**
- Deleted 658 anime tags + 3,132 more = ~3,790 total below 0.80
- Deleted 477 japanese tags + 3,360 more = ~3,837 total below 0.75

**Per-Style ML Thresholds** (in `lib/styles/predictor.ts`):
- Default: 0.50
- Anime: 0.80
- Japanese: 0.75
- Surrealism: 0.55

**Key Files:**
- `lib/styles/predictor.ts` - **ML predictor library** (used by all processing flows)
- `lib/constants/styles.ts` - `DISPLAY_STYLES` (11), `MIN_STYLE_PERCENTAGE` (35%), `MIN_STYLE_IMAGE_COUNT` (3)
- `models/style-classifier.json` - Trained weights (768 coef + intercept per style)
- `scripts/styles/tag-images-ml.ts` - Batch ML tagging (for bulk operations)
- `scripts/styles/tag-images.ts` - CLIP seed tagging (legacy)
- `app/admin/(authenticated)/styles/label/page.tsx` - Manual labeling UI (backup)

**Style Pipeline:**
```bash
# ML Classifier (recommended)
npx tsx scripts/styles/tag-images-ml.ts --clear --concurrency 200
npx tsx scripts/styles/compute-artist-profiles.ts --clear

# To retrain (if more labels needed):
npx tsx scripts/styles/batch-label-gpt.ts --limit 10000
npx tsx scripts/styles/export-training-data.ts
python3 scripts/styles/train-classifier.py
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

## Production Schema Incident Fix (Jan 9, 2026) ✅

**Problem:** Several SQL functions and tables were missing from production, causing 500 errors in the artist dashboard (portfolio, profile editing, analytics).

**Root Cause:** Migrations were archived to `_archive/` folder before being applied to production AND before the baseline was updated. This left production missing:
- Functions: `get_artist_portfolio`, `update_artist_locations`, `search_appearances` tracking functions, `sync_artist_to_locations`, `update_artist_pipeline_on_embedding`, `get_all_cities_with_min_artists`
- Tables: `search_appearances`, `artist_audit_log`

**Fix Applied:**
1. Ran missing function/table definitions directly in Supabase SQL Editor
2. Created verification script: `scripts/migrations/verify-production-schema.ts`
3. Added npm command: `npm run db:verify`
4. Updated `operations.md` with migration workflow rules

**Prevention Going Forward:**
1. **Before deploying:** Run `npm run db:verify` to check for missing schema
2. **Creating migrations:** Apply immediately with `npm run db:push`
3. **Archiving migrations:** NEVER archive before applying to production AND updating baseline

**Key Files:**
- `scripts/migrations/verify-production-schema.ts` - Schema verification script
- `memory-bank/development/operations.md` - Updated with Migration Workflow section

---

## Dashboard Duplicate Key Fix (Jan 9, 2026) ✅

**Problem:** Dashboard overview page showed React console errors: "Encountered two children with the same key" with UUIDs as duplicate keys.

**Root Cause:** The `get_recent_search_appearances` SQL function could return duplicate `search_id` values when the same search was tracked multiple times in `search_appearances` table (no unique constraint on `search_id, artist_id`). The `RecentSearchesTable` component used `searchId` as React keys, causing the duplicate key warnings.

**Fix:** Added `DISTINCT ON (sa.search_id)` to the SQL function to ensure each search ID appears only once in results.

**Files Changed:**
- `supabase/functions/admin/admin_functions.sql` - Added function to source of truth
- `supabase/migrations/20260109_001_fix_search_appearances_duplicates.sql` - Migration applied

---

## Profile Location Save Fix + Migration Squash (Jan 9, 2026) ✅

**Problem:** Saving location changes in the artist dashboard failed with `relation "artists" does not exist`.

**Root Causes (multiple issues):**
1. `auth.uid()` returns NULL from SSR Supabase client - RPC ownership check failed
2. `check_location_limit` trigger had `search_path=""` (empty) - couldn't find artists table
3. `sync_primary_location` trigger had `search_path=""` AND referenced removed columns (`city`, `state`)

**Fixes Applied:**
1. Added `p_user_id` parameter to `update_artist_locations` RPC with `COALESCE(p_user_id, auth.uid())`
2. Fixed `check_location_limit` with `SET search_path = public`
3. Made `sync_primary_location` a no-op (columns no longer exist in artists table)

**Migration Squash:**
After creating 7 incremental fix migrations, squashed all migrations to a fresh baseline:
- New baseline: `00000000000000_baseline.sql` (5,930 lines)
- Old migrations archived to `_archive_jan9/` (41 files)
- Reset `schema_migrations` table to just the baseline

**Key Learning:** SECURITY DEFINER functions MUST have `SET search_path = public` or they can't find tables.

---

## Schema Drift Reconciliation (Jan 11, 2026) ✅

**Problem:** Persistent schema drift between baseline and production caused by:
1. **search_path bug** - `pg_dump` serializes `SET search_path = ''` (empty) instead of `'public'`
2. **Baseline squash before prod sync** - Migrations archived before being applied
3. **No drift detection** - Manual verification only, no automated checks

**Solution - Comprehensive Reconciliation:**

1. **Created `db:audit` command** (`scripts/migrations/audit-schema.ts`)
   - Auto-extracts expected schema from baseline (not hardcoded)
   - Generates SQL to detect functions with bad search_path
   - Detects missing tables, functions, indexes, triggers
   - Input validation prevents SQL injection from malicious baseline

2. **Applied reconciliation migration** (`20260111_001_reconcile_schema.sql`)
   - Fixed 29 functions with empty `search_path = ''`
   - Added pgcrypto token encryption infrastructure
   - Consolidated 4 pending migrations into one idempotent migration
   - Removed pgsodium grants (Supabase platform restriction)

3. **Updated baseline from production**
   - Fresh dump ensures search_path fixes persist
   - Before: 29 functions with `search_path = ''`
   - After: 0 functions with empty search_path, 40 with `'public'`

**New Commands:**
```bash
npm run db:audit    # Generate audit SQL for drift detection
npm run db:verify   # Verify expected objects exist (legacy)
```

**Key Files:**
- `scripts/migrations/audit-schema.ts` - Enhanced drift detection
- `supabase/migrations/20260111_001_reconcile_schema.sql` - Reconciliation migration
- `memory-bank/development/operations.md` - Schema Drift Detection section added

**pgcrypto Token Encryption:**
- Table: `encrypted_instagram_tokens`
- Functions: `store_encrypted_token`, `get_decrypted_token`, `delete_encrypted_token`
- Uses `pgp_sym_encrypt` with `TOKEN_ENCRYPTION_KEY` env var
- Replaces Supabase Vault (had pgsodium permission issues)

---

## Database Audit (Jan 9, 2026) ✅

**Goal:** Comprehensive post-consolidation audit to verify schema health.

**Audit Results:**
| Check | Status |
|-------|--------|
| SECURITY DEFINER functions with search_path | ✅ All have `SET search_path = public` |
| Tables with RLS enabled | ✅ All public tables have RLS |
| RLS tables with policies | ✅ All RLS-enabled tables have policies |
| Vector index health | ✅ 407 MB HNSW, 243 uses |
| pgcrypto infrastructure | ✅ Table + 3 functions working |
| Reconciliation migration applied | ✅ Verified |

**Issues Fixed:**
1. `create_pipeline_run` - Added `SET search_path = public`
2. `get_all_cities_with_min_artists` - Added `SET search_path = public`
3. `airtable_sync_log` - Enabled RLS + added service role policy
4. `email_log` - Added service role policy
5. `indexnow_submissions` - Added service role policy
6. **25 application functions** - Added `SET search_path = public` for consistency

**Remaining Warnings (Acceptable):**
- `vector` extension in public schema (pgvector requirement, cannot change)
- 2 intentionally permissive RLS policies (`artist_recommendations`, `pipeline_runs`)

**Commands Used:**
```bash
npm run db:audit    # Generated audit SQL
npm run db:push     # Applied fixes (partially, then via MCP)
```

---

## Testing Infrastructure (Jan 11, 2026) ✅

**Goal:** Automated testing to catch bugs before production.

**Status:** Complete - CI/CD pipeline running on GitHub Actions.

**What's in place:**
- `staging` branch with Vercel preview + Stripe test mode
- GitHub Actions CI: lint → type-check → test → build
- Vitest with 47 tests (URL detector + Stripe webhooks)
- Test commands: `npm run test`, `npm run test:run`, `npm run test:coverage`

**Key Files:**
- `.github/workflows/ci.yml` - CI workflow
- `vitest.config.ts` / `vitest.setup.ts` - Test configuration
- `lib/instagram/__tests__/url-detector.test.ts` - 31 URL validation tests
- `app/api/stripe/webhook/__tests__/route.test.ts` - 16 webhook tests
- `memory-bank/development/staging-setup.md` - Staging env setup guide

**Next (optional):** Playwright E2E tests for critical user flows.

---

## Reference Docs

- **Detailed specs:** `/memory-bank/projects/user-artist-account-implementation.md`
- **Tech stack:** `/memory-bank/architecture/techStack.md`
- **Staging setup:** `/memory-bank/development/staging-setup.md`
