---
Last-Updated: 2025-12-29
Maintainer: RB
Status: Phase 3 Complete ✅ (Ready for Testing), Phase 4 Infrastructure Ready ✅
---

# Active Context: Tattoo Artist Discovery Platform

## Current Sprint Goals
- **Sprint**: Phase 3 - Instagram Scraping & Image Processing
- **Duration**: Week 3
- **Focus**: Complete scraping pipeline with Apify + Supabase Storage + security hardening
- **Status**: ✅ COMPLETE - Ready for production testing with Austin artists (204)

### Primary Objectives
1. ✅ **COMPLETED (Phase 1):** Production-ready Supabase database with pgvector
2. ✅ **COMPLETED (Phase 1):** Complete security hardening (RLS, constraints, type safety)
3. ✅ **COMPLETED (Phase 1):** Performance optimization (middleware, vector search)
4. ✅ **COMPLETED (Phase 1):** Next.js 15.5 with strict TypeScript
5. ✅ **COMPLETED (Phase 1):** Environment validation and build verification
6. ✅ **COMPLETED (Phase 2):** Instagram-first discovery approach (Tavily API)
7. ✅ **COMPLETED (Phase 2):** Query caching system (prevents duplicate API calls)
8. ✅ **COMPLETED (Phase 2):** Shop website scraper (Puppeteer)
9. ✅ **COMPLETED (Phase 2):** Austin discovery (204 artists - 102% of target, $3.46 cost)
10. ✅ **COMPLETED (Phase 3):** Supabase Storage bucket setup (portfolio-images)
11. ✅ **COMPLETED (Phase 3):** Instagram scraping pipeline (Apify + security hardening)
12. ✅ **COMPLETED (Phase 3):** Image processing pipeline (Sharp + WebP thumbnails)
13. **NEXT:** Test scraping with 1-2 Austin artists, then full production run (204 artists)

### Secondary Objectives
- ✅ Test and validate Tavily vs Google Places approach
- ✅ Build query diversification (46 queries → 66 with niche specialties)
- ✅ Implement false positive filtering for shop scraping
- ✅ Final optimization round for Austin (niche specialty queries)
- **NEXT:** Replicate Austin approach for LA

## Current Blockers
**None** - All critical blockers resolved:
- ~~Google Places API~~ - Using Tavily Instagram-first approach instead (more effective)
- ~~Need discovery scripts~~ - Built V2 with caching
- ~~Need scraping approach~~ - Puppeteer shop scraper working

## In Progress
- None - Austin discovery complete, ready to begin LA

## Ready to Start
- Los Angeles discovery using proven Austin approach:
  - 66 Tavily queries (same categories, LA neighborhoods)
  - Google Places shop discovery
  - Shop website scraping with false positive filtering
  - Target: 200-300 artists, estimated cost: ~$3-4

## Recently Completed (Dec 29, 2025)

### Phase 0: Market Analysis (Complete)
- ✅ DataForSEO market analysis script created
- ✅ Analyzed 8 cities: LA, NYC, Austin, Miami, Portland, Chicago, Seattle, Denver
- ✅ All cities scored HIGH (74-81/100 opportunity scores)
- ✅ Selected launch cities: **Austin, TX + Los Angeles, CA**
- ✅ Updated implementation plan with market insights
- ✅ Identified key competitor (inkzup.com) and opportunity gap (visual search)
- ✅ Documented multi-modal search UX strategy (image + text + visual picker)
- ✅ Designed hybrid SEO approach (no manual tags, seed embeddings for style pages)
- ✅ Created comprehensive implementation plan with 8 phases (MVP + post-MVP)
- ✅ Future-proofed database schema for auth, artist claiming, and saved artists

### Phase 1: Infrastructure Setup (✅ COMPLETE - Dec 29, 2025)

**Database & Backend (Production-Ready):**
- ✅ Supabase project created (ID: aerereukzoflvybygolb)
- ✅ pgvector extension enabled
- ✅ Complete database schema (7 tables):
  - `users` - Future auth (RLS enabled)
  - `artists` - Artist profiles with claiming fields (RLS enabled)
  - `portfolio_images` - Instagram images with 768-dim embeddings (RLS enabled)
  - `searches` - Search session storage (RLS enabled)
  - `saved_artists` - User bookmarks (RLS enabled)
  - `scraping_jobs` - Track scraping progress
  - `style_seeds` - SEO landing page seed images
- ✅ **Complete RLS policies** (15 policies across 5 tables)
  - Public read access + service role writes for artists/portfolio_images
  - User-scoped access for saved_artists/searches
- ✅ **Database validation constraints**
  - Email format, URL format, status enums
  - Non-negative counts (followers, likes, images)
- ✅ **NOT NULL constraints** (prevents orphaned records)
- ✅ **Automatic updated_at triggers** (3 tables)
- ✅ Optimized `search_artists_by_embedding()` function with CTE performance
- ✅ **Deferred IVFFlat index** (to be created after data load with optimal parameters)
- ✅ **8 migration files** in `supabase/migrations/` (version controlled)

**Next.js Application (Production-Ready):**
- ✅ Next.js 15.5 project initialized with App Router
- ✅ TypeScript strict mode + Tailwind CSS configured
- ✅ **Generated TypeScript types** from Supabase schema (`types/database.types.ts`)
- ✅ Supabase client libraries (@supabase/ssr) with **validated environment variables**
- ✅ **Optimized middleware** (skips auth on 95% of routes for performance)
- ✅ Query utilities for vector search
- ✅ Build succeeds with zero errors ✓

**Security & Validation:**
- ✅ **Environment validation** with Zod (`lib/config/env.ts`)
  - Runtime validation of all env vars
  - Clear error messages for missing/invalid values
- ✅ **Type-safe database queries** with generated types
- ✅ **Multi-layer security** (RLS + constraints + TypeScript)

**Developer Experience:**
- ✅ ESLint + Prettier configured
- ✅ Path aliases (@/*) set up
- ✅ Type-checking enabled (strict mode)
- ✅ Development scripts ready (dev, build, lint, type-check)

**Files Created:**
- Configuration: `next.config.js`, `tailwind.config.ts`, `tsconfig.json`
- App structure: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Supabase: `lib/supabase/{client,server,middleware}.ts`
- Utilities: `lib/supabase/queries.ts`, `lib/constants/cities.ts`, `lib/config/env.ts`
- Types: `types/database.types.ts` (generated from Supabase)
- Migrations: `supabase/migrations/20251229_001-008_*.sql` (8 total)

### Phase 2: Artist Discovery (In Progress - Dec 29, 2025)

**Discovery Approach Evolution:**
- ✅ Initial test: Tavily vs Google Places vs shop scraping
- ✅ **Key Finding:** Solo practitioners dominate Austin market (validated hypothesis)
- ✅ **Decision:** Instagram-first Tavily approach + shop scraping supplement
- ✅ **Architecture:** Query caching prevents duplicate API calls & tracks costs

**Austin Discovery Results (✅ COMPLETE: 204 artists):**

**Tavily Discovery (145 artists - 71% of total):**
- **Initial Run:** 46 queries → 114 artists (~$2.30)
  - 5 general + 27 styles + 7 locations + 5 experience + 2 demographic
  - 28 queries cached from first run (saved $1.40)
- **Final Push:** 20 niche specialty queries → 31 new artists (~$1.00)
  - color tattoo, sleeve specialist, handpoke, stick & poke, mandala, botanical, etc.
- **Total Cost:** ~$3.30 for 145 artists
- **Discovery Breakdown:**
  - Location queries: 32 artists (Downtown, South/East/North/West Austin, South Congress, Sixth St)
  - Style queries: 65 artists (traditional, fine line, geometric, japanese, watercolor, etc.)
  - Niche specialty queries: 31 artists (handpoke, botanical, coverup specialist, etc.)
  - General/experience/demographic: 17 artists

**Shop Website Scraping (59 artists - 29% of total):**
- 21 tattoo shop websites scraped via Google Places (~$0.16)
- Puppeteer + Cheerio for HTML parsing
- Discovered 113 Instagram handles
- Filtered 54 false positives (CSS terms, version numbers, domains)
- Final: 59 verified artists from shop rosters
- Key shops: Moon Tattoo (6 artists), No Good Tattoo (17 artists), Serenity (9 artists)

**Final Austin Metrics:**
- **Total Artists:** 204 (102% of 200 minimum target)
- **Total Cost:** $3.46 ($0.017 per artist)
- **Tavily:** 145 artists from 66 queries (71%)
- **Shop Scraping:** 59 artists from 21 shops (29%)
- **Cost Efficiency:** Query caching saved $2.30+ in duplicate API calls

**Tools & Scripts Built:**
1. `tavily-artist-discovery-v2.ts` - Multi-query Instagram discovery with caching
2. `query-generator.ts` - Generates 66 diverse queries (5 general + 27 styles + 7 locations + 5 experience + 2 demographic + 20 niche)
3. `google-places-discovery.ts` - Finds tattoo shops via Google Places API
4. `shop-website-scraper.ts` - Puppeteer-based roster scraping
5. `cleanup-false-positives.ts` - Filters technical terms from scraped handles (54 removed)
6. `check-results.ts` - Quick database stats utility

**Database Enhancements:**
- ✅ `discovery_queries` table - Caches Tavily/Google queries with costs
- ✅ Prevents duplicate API calls across runs
- ✅ Tracks API costs and artists found per query

**Next Steps:**
- ✅ Austin complete - Ready to replicate for Los Angeles
- Replicate exact approach for LA (66 queries with LA neighborhoods)
- Instagram validation (check public/private status for both cities)
- ✅ Portfolio scraping (Apify - Phase 3 complete)

### Phase 3: Instagram Scraping & Image Processing (✅ COMPLETE & TESTED - Dec 29, 2025)

**Status:** ✅ Fully working, tested with real artists, ready for production

**Testing Results (Dec 29, 2025):**
- ✅ Scraped 2 artists successfully (22 images total)
- ✅ Fixed Apify integration (was downloading HTML, now downloads actual JPEGs)
- ✅ Fixed environment loading (dotenv now loads before imports)
- ✅ Fixed database status values ('running' instead of 'in_progress')
- ✅ All images processed and uploaded to Supabase Storage
- ✅ All 3 thumbnail sizes generated (320w, 640w, 1280w WebP)
- ✅ Database metadata inserts successful
- ✅ Temp file cleanup working
- ✅ Storage: 0.06 GB used (0.1% of 100 GB limit)
- ⚠️  **Known Issue**: Not all scraped images are tattoo work (includes personal photos, promotions, etc.)

**Major Decisions:**
- ✅ Switched from Instaloader to Apify (speed & reliability over cost)
  - Apify: 30-60 minutes vs Instaloader: 3-5 hours
  - Cost: $20-40 for 204 artists (worth it for reliability)
- ✅ Used Supabase Storage instead of Cloudflare R2 (simpler, already have it)
- ✅ Two-phase processing: Python downloads to /tmp, Node.js processes & uploads
- ✅ All critical security issues fixed (2 code review rounds)

**Infrastructure Built:**

1. **Database Migrations:**
   - `20251229_010_update_storage_paths.sql` - Updated schema for Supabase Storage
   - `20251229_011_add_unique_constraint.sql` - Prevents duplicate posts (race conditions)

2. **Storage Setup:**
   - `scripts/setup/setup-storage-bucket.ts` - Automated bucket creation
   - Public `portfolio-images` bucket with CDN
   - Folder structure: original/{artist_id}/{post_id}.jpg + 3 WebP thumbnail sizes

3. **Core Libraries:**
   - `lib/storage/supabase-storage.ts` - Upload/download with path traversal prevention
   - `lib/processing/image-processor.ts` - Sharp-based processing (JPEG→WebP, 3 sizes)

4. **Scraping Pipeline:**
   - `scripts/scraping/apify-scraper.py` - Instagram scraping via Apify
   - `scripts/scraping/process-and-upload.ts` - Image processing & Supabase upload
   - `scripts/scraping/validate-scraped-images.ts` - Stats and validation
   - `scripts/scraping/orchestrate-scraping.sh` - Full pipeline automation

5. **Security Hardening (9 Critical Fixes):**
   - ✅ Path traversal prevention (UUID/shortcode validation)
   - ✅ Input validation (Instagram handles, artist IDs)
   - ✅ Storage rollback on DB failures (prevents orphaned files)
   - ✅ Database unique constraint (prevents race conditions)
   - ✅ Upload retry logic (3 attempts with linear backoff)
   - ✅ File cleanup on all paths (prevents disk exhaustion)
   - ✅ Environment variable validation (clear error messages)
   - ✅ Connection leak fix (Python finally block)
   - ✅ Apify timeout (5 minutes per artist)

6. **Resumability Features:**
   - `scraping_jobs` table tracks progress (status: pending/in_progress/completed)
   - Idempotency checks skip already-processed images
   - Can resume after interruption (Ctrl+C, network failure, etc.)

**Expected Results:**
- **Total Images:** 4,080-10,200 (20-50 per artist)
- **Storage Used:** 15-35 GB (WebP compression)
- **Processing Time:** 30-60 minutes for 204 artists
- **Cost:** $20-40 (Apify) + $0 (within Supabase Storage free tier)

**Files Created/Modified:**
- 2 new migrations
- 4 new scripts (setup, scraping, processing, validation)
- 2 new libraries (storage, image processing)
- Updated: `requirements.txt`, `package.json`
- Created: `.env.example` (template for credentials)

**Testing Plan:**
1. Get Apify API token (free $5 credit)
2. Add to `.env.local`: `APIFY_API_TOKEN=apify_api_xxx`
3. Test with 1-2 artists first (modify Python script: add `LIMIT 2`)
4. Validate results with `npm run validate-scraped-images`
5. Run full production scrape: `npm run scrape-instagram`

**Critical Issue Discovered:**
- Not all Instagram images are tattoo work (mix of portfolio + personal + promotional content)
- Need filtering strategy before full production run

**Potential Solutions (To Discuss):**
1. **Manual curation** - Review and delete non-tattoo images after scraping
2. **Caption filtering** - Skip posts without tattoo-related keywords
3. **Image classification** - Use vision model to filter non-tattoo images
4. **Accept mixed content** - CLIP embeddings will naturally cluster tattoos together
5. **Hashtag filtering** - Only scrape posts with tattoo hashtags

**Next Steps:**
- ⏸️  Decide on filtering strategy before full production run
- Then: Run full scrape (202 remaining artists, ~30-60 minutes)
- Proceed to Phase 4 (CLIP embeddings on Modal.com)

## Launch City Selection Results

### Selected Cities:
1. **Austin, TX** (Score: 78/100)
   - 262,100 monthly searches
   - 46% competition (lowest)
   - 12 keywords trending up
   - Visual search opportunity

2. **Los Angeles, CA** (Score: 77/100)
   - 261,920 monthly searches
   - 52% competition
   - 10 keywords trending up
   - Largest artist market

### Key Market Insights:
- **Opportunity Gap:** No strong visual search platform for tattoo artists
- **Main Competitor:** inkzup.com (booking focus, not discovery)
- **Our Differentiator:** Image-based search + portfolio matching (CLIP embeddings)
- **Target:** 200-300 artists per city for MVP
- **Est. Cost:** ~$30-55 per city (one-time), ~$6-11/month recurring

## Next Steps

### Phase 3: Testing & Production Run (Ready - Dec 29, 2025)
1. **Get Apify API Token:**
   - Sign up at https://apify.com (free $5 credit)
   - Get API token from Settings → Integrations
   - Add to `.env.local`: `APIFY_API_TOKEN=apify_api_xxx`

2. **Test with 1-2 Artists:**
   - Modify `apify-scraper.py` line 69: add `LIMIT 2`
   - Run: `python3 scripts/scraping/apify-scraper.py`
   - Run: `npm run process-images`
   - Validate: `npm run validate-scraped-images`

3. **Production Run (204 Artists):**
   - Remove LIMIT from Python script
   - Run: `npm run scrape-instagram` (full pipeline)
   - Expected: 30-60 minutes, 4,000-10,000 images
   - Cost: $20-40 (Apify)

### Phase 4: Embedding Generation (✅ Production-Ready - Dec 29, 2025)
**Status:** All security fixes complete, build passes, ready for Modal deployment

**Infrastructure Complete:**
- ✅ Modal.com Python script with OpenCLIP ViT-L-14 (768-dim)
- ✅ Batch processing capability (100 images/batch)
- ✅ Helper scripts for verification and testing
- ✅ Index creation automation (IVFFlat/HNSW)
- ✅ Modal CLI installed locally
- ✅ **All security fixes applied** (5 Critical issues resolved)
- ✅ **Build verification passed** (TypeScript compilation succeeds)

**Security Hardening Complete (Dec 29, 2025):**
1. ✅ **SSRF Protection** - URL validation, private IP blocking, size limits
2. ✅ **Credential Validation** - Environment variable validation, no exposure in errors
3. ✅ **SQL Injection Prevention** - Parameter validation in index creation
4. ✅ **Transaction Safety** - Batch processing with proper error handling
5. ✅ **Type Safety** - Removed unsafe 'as any' casts, proper RPC type handling
6. ✅ **Performance Index** - Added status column index for batch queries
7. ✅ **Environment Loading** - All TypeScript scripts load dotenv properly

**User Next Steps:**
1. Complete Phase 3 (Instagram scraping) to get portfolio images
2. Authenticate Modal: `modal setup` (opens browser)
3. Create Supabase secret in Modal (one-time)
4. Test with sample batch (10-20 images)
5. Run full batch embedding generation (4,000-10,000 images)
6. Create vector index using helper script (SQL commands provided)
7. Test search performance (<500ms target)

**Files Created:**
- `scripts/embeddings/modal_clip_embeddings.py` - Main Modal.com GPU script (security hardened)
- `scripts/embeddings/check-embeddings.ts` - Verify progress (type-safe)
- `scripts/embeddings/create-vector-index.ts` - Index creation (SQL injection protected)
- `scripts/embeddings/test-search.ts` - Search performance testing (type-safe RPC calls)
- `supabase/migrations/20251229_012_add_status_index.sql` - Performance optimization

**Cost Estimate:** ~$0.30-0.60 per city (one-time GPU processing)

## Context Notes
- ✅ Market validation complete - strong demand across all cities
- ✅ Austin selected for growth potential + low competition
- ✅ LA selected for market size + artist density
- ✅ Visual search gap validates our image-based approach
- ✅ Phase 0 completed in ~5 hours (market analysis)
- ✅ Phase 1 completed in ~8 hours (infrastructure + security hardening)
- **Phase 1 is production-ready** - all critical security and performance issues resolved
- Next: Phase 2 (Artist Discovery) requires external API credentials (R2, Google Maps, Apify)