---
Last-Updated: 2025-12-31 (Updated: Modal container warmup optimization)
Maintainer: RB
Status: Phase 3-6 COMPLETE ✅, Modal Warmup COMPLETE ✅, Ready for Phase 7 ✅
---

# Active Context: Tattoo Artist Discovery Platform

## Current Sprint Goals
- **Sprint**: Phase 4 Finalization - Vector Index & Semantic Search
- **Duration**: Week 5
- **Focus**: Production-ready semantic search with IVFFlat vector index
- **Status**: ✅ COMPLETE - Vector index created, 190ms avg search time

### Primary Objectives
1. ✅ **COMPLETED (Phase 1):** Production-ready Supabase database with pgvector
2. ✅ **COMPLETED (Phase 1):** Complete security hardening (RLS, constraints, type safety)
3. ✅ **COMPLETED (Phase 1):** Performance optimization (middleware, vector search)
4. ✅ **COMPLETED (Phase 1):** Next.js 16.1 with strict TypeScript + Turbopack
5. ✅ **COMPLETED (Phase 1):** Environment validation and build verification
6. ✅ **COMPLETED (Phase 2):** Instagram-first discovery approach (Tavily API)
7. ✅ **COMPLETED (Phase 2):** Query caching system (prevents duplicate API calls)
8. ✅ **COMPLETED (Phase 2):** Shop website scraper (Puppeteer)
9. ✅ **COMPLETED (Phase 2):** Austin discovery (204 artists - 102% of target, $3.46 cost)
10. ✅ **COMPLETED (Phase 3):** Supabase Storage bucket setup (portfolio-images)
11. ✅ **COMPLETED (Phase 3):** Instagram scraping pipeline (Apify + parallel processing)
12. ✅ **COMPLETED (Phase 3):** GPT-5-nano batch image classification (1,282 tattoo images)
13. ✅ **COMPLETED (Phase 3):** Image processing & upload (Sharp + WebP + 100 concurrent uploads)
14. ✅ **COMPLETED (Phase 4):** CLIP embedding generation (1,257 images, 768-dim vectors)
15. ✅ **COMPLETED (Phase 4):** IVFFlat vector index (lists=35, 190ms avg search time)
16. ✅ **COMPLETED (Phase 5):** Complete search flow UI (landing page, results, API routes)
17. ✅ **COMPLETED (Phase 6):** Artist profile pages with state/city SEO hierarchy (188 pages)
18. ✅ **COMPLETED (Dec 30):** Search quality optimization (threshold 0.25→0.15, query enhancement)
19. ✅ **COMPLETED (Dec 30):** Numbered pagination with page buttons (1, 2, 3...10)
20. ✅ **COMPLETED (Dec 30):** Style seeds from Tattoodo (10 styles, 57 images, CLIP embeddings)
21. ✅ **COMPLETED (Dec 31):** Modal container warmup optimization (25s → 2-5s search latency)
22. **NEXT:** Phase 7 - Style landing pages & SEO optimization

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
- None - All infrastructure complete, ready for Phase 7

## Ready to Start
- Los Angeles discovery using proven Austin approach:
  - 66 Tavily queries (same categories, LA neighborhoods)
  - Google Places shop discovery
  - Shop website scraping with false positive filtering
  - Target: 200-300 artists, estimated cost: ~$3-4

## Future Enhancements (Ideas to Explore)

### Search Result Confidence Sectioning (Dec 30, 2025)
**Concept:** Section search results by similarity score confidence levels to give users better context.

**Proposed Structure:**
- **Best Matches** (similarity >0.30): "These are the artists we're most confident match your search"
- **Similar Styles** (similarity 0.20-0.30): "Good matches but slightly less confident"
- **You Might Also Like** (similarity 0.15-0.20): "Worth exploring, more experimental matches"

**Open Questions:**
1. Visual treatment - section headers, background tints, similarity badges on cards?
2. Pagination interaction - mix tiers on pages or dedicate pages to each tier?
3. Empty states - how to handle when no "Best Matches" exist?
4. Threshold tuning - need to test with real searches to find optimal ranges

**Status:** Tabled for now (user working on card redesign), revisit after Phase 7

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
- ✅ Next.js 16.1.1 project with App Router + Turbopack (default bundler)
- ✅ TypeScript strict mode + Tailwind CSS configured
- ✅ **Generated TypeScript types** from Supabase schema (`types/database.types.ts`)
- ✅ Supabase client libraries (@supabase/ssr) with **validated environment variables**
- ✅ **Optimized middleware** (skips auth on 95% of routes for performance)
- ✅ Query utilities for vector search
- ✅ Build succeeds with zero errors ✓
- ✅ **UPGRADED (Dec 30):** Next.js 15.5.9 → 16.1.1 (Turbopack stable, React 19.2)

**Security & Validation:**
- ✅ **Environment validation** with Zod (`lib/config/env.ts`)
  - Runtime validation of all env vars
  - Clear error messages for missing/invalid values
- ✅ **Type-safe database queries** with generated types
- ✅ **Multi-layer security** (RLS + constraints + TypeScript)

**Developer Experience:**
- ✅ ESLint 9.39.2 with flat config format (eslint.config.mjs)
  - Configured for Next.js 16 compatibility
  - TypeScript ESLint + Next.js plugin
  - Scripts directory ignored (dev tools, not production code)
  - 26 remaining any type errors (non-blocking, in complex error handling)
- ✅ Prettier configured
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

**Critical Issue Discovered & ✅ RESOLVED (Dec 29, 2025):**
- ⚠️  Not all Instagram images are tattoo work (mix of portfolio + personal + promotional content)
- ✅ **IMPLEMENTED:** GPT-5-nano vision classification with async parallel batch processing
  - **Architecture:** Download → Classify in parallel (Flex tier) → Filter
  - **Model:** `gpt-5-nano-2025-08-07` with vision capability
  - **Tier:** Flex tier (1-5 min latency, 50% discount vs Standard)
  - **Concurrency:** 5,000 images/batch (Tier 5: 30k RPM, 180M TPM)
  - **Cost:** $0.000155/image (~$0.39 for 2,500 images, ~$15.50 for 100k)
  - **Accuracy:** 95%+ (tested on 20 existing images - 19/20 correct)
  - **Implementation:** `scripts/scraping/apify-scraper.py` with async batch classification
  - **Details:** `/memory-bank/architecture/decision-image-filtering.md`

**Testing Results (Dec 29, 2025):**
- ✅ Phase 0 test: 20 images from Supabase, 95% accuracy (19/20 correct)
- ✅ Phase 1 test: 2 artists (7 images total)
  - Artist 1: 4/5 kept (1 non-tattoo filtered)
  - Artist 2: 2/2 kept (all tattoos)
  - Total: 86% tattoo rate (6/7 kept)
- ✅ Parallel batch classification working perfectly
- ✅ Flex tier successfully reducing cost by 50%
- ✅ Processing time: ~2 minutes for 2 artists

**Production Metrics (Expected for 204 Artists):**
- **Input:** ~2,500-3,000 scraped images
- **Output:** ~1,600-1,800 clean tattoo images (60-70% pass rate)
- **Filtered:** ~700-900 non-tattoo images (30-40%)
- **Cost:** ~$0.39 total for classification
- **Storage Savings:** ~1.8 GB (no non-tattoo uploads)
- **Processing Time:** ~10-15 minutes (with Tier 5 parallel processing)

**Production Run Complete (Dec 29, 2025):**
- ✅ Scraped 188 Austin artists (16 bad handles deleted from database)
- ✅ Downloaded 1,692 Instagram images with 8-20 parallel Apify calls
- ✅ GPT-5-nano classification: 1,282 tattoo images kept (75.8% pass rate)
- ✅ Uploaded 1,106 images to Supabase Storage with 100 concurrent uploads (~2-3 min)
- ✅ Database cleanup: Deleted 16 failed artist records with invalid handles
- ✅ Total pipeline time: ~90 minutes (scraping + classification + upload)

**Performance Optimizations Applied:**
- Parallel scraping: 8 concurrent Apify calls (balanced for rate limits)
- Batch classification: All 1,692 images classified in single GPT-5-nano Flex tier batch
- Parallel uploads: 100 concurrent uploads (leveraging 1 Gbps bandwidth)

**Next Steps:**
✅ Phase 3 Complete - Moving to Phase 4 embedding generation

### Phase 4: CLIP Embedding Generation & Vector Index (✅ FULLY COMPLETE - Dec 30, 2025)

**Status:** ✅ All 1,257 images have embeddings + IVFFlat vector index created

**Production Results (Dec 30, 2025):**
- ✅ Generated embeddings for all 1,257 portfolio images (100%)
- ✅ Model: OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - 768 dimensions
- ✅ GPU: Modal.com A10G (~$0.60/hour, billed per second)
- ✅ Image status workflow: `pending` → `active` after embedding
- ✅ Total processing time: ~2-3 hours (with Modal 300s timeout limitations)
- ✅ Success rate: 100% (1,257/1,257 embeddings generated, 0 errors)
- ✅ All embeddings L2 normalized for cosine similarity search
- ✅ **Vector Index Created:** IVFFlat with lists=35 (10 seconds to build)
- ✅ **Search Performance:** 190ms average query time (5x faster than sequential scan)

**Architecture & Workflow:**
1. **Status Lifecycle:**
   - Images uploaded with `status='pending'` (not searchable)
   - Embedding generation queries `WHERE embedding IS NULL AND status='pending'`
   - After embedding generated → `status='active'` (searchable)
   - Supports incremental updates (only processes new images)

2. **Database Schema Updates:**
   - ✅ Migration `20251230_001_add_pending_status.sql` - Added 'pending' to status enum
   - ✅ Modified upload script to use `status='pending'`
   - ✅ Modified Modal script to set `status='active'` after success

3. **Processing Strategy:**
   - Batch size: 50 images per batch (Modal timeout constraint)
   - Max batches per run: 2 batches (stays under 300s timeout)
   - Automatic resume capability (idempotent, skips existing embeddings)
   - Total: ~26 runs of 50 images to complete all 1,257

**Performance Optimization:**
- GPU processing: ~60-90s per 50 images (CLIP inference)
- Image download: ~30-60s per 50 images (Supabase Storage → Modal)
- Database writes: ~10-20s per 50 images (batch updates)
- Total per batch: ~2-3 minutes (well under 5-minute timeout with buffer)

**Modal Configuration:**
- Container timeout: 7200s (2 hours max)
- Remote method timeout: 300s (5 minutes, cannot be overridden)
- Batching strategy: Process in chunks to avoid cumulative timeout
- Cost: ~$1.50-2.00 total for full run (A10G GPU time)

**Files Created/Modified:**
- `scripts/embeddings/modal_clip_embeddings.py` - Fixed schema to use `storage_original_path` and `portfolio-images` bucket
- `scripts/scraping/process-and-upload.ts` - Changed to insert with `status='pending'`
- `supabase/migrations/20251230_001_add_pending_status.sql` - Added pending status support

**Key Learnings:**
1. **Modal timeout architecture**: Remote method calls have 300s hard timeout (separate from container lifetime)
2. **Cumulative timeout**: Multiple batch calls accumulate toward 300s limit, need to process in smaller chunks
3. **Optimal batch size**: 50 images/batch, 2 batches/run = ~200-250s total (safe margin)
4. **Resume capability**: Automatic resume by querying `WHERE embedding IS NULL` enables fault tolerance
5. **Status workflow**: `pending` → `active` lifecycle prevents incomplete images from appearing in search

**Vector Index Configuration (Dec 30, 2025):**
- **Index Type:** IVFFlat (optimal for 1k-10k images)
- **Lists Parameter:** 35 (sqrt(1,257) for balanced speed/recall)
- **Distance Metric:** `vector_cosine_ops` (cosine similarity)
- **Build Time:** ~10 seconds for 1,257 vectors
- **Index Name:** `idx_portfolio_embeddings`

**Performance Metrics (Tested Dec 30, 2025):**
- **Average Search Time:** 190ms (well under 500ms target ✓)
- **Min Search Time:** 184ms
- **Max Search Time:** 211ms
- **Speedup vs Sequential:** 5-10x faster
- **Threshold Testing:** Optimal range 0.5-0.7 for balanced precision/recall

**End-to-End Search Performance Breakdown:**

The complete user search flow has the following stages:

1. **Image upload to API:** ~500ms (network transfer)
2. **Modal.com CLIP embedding generation:** ~2-5 seconds ⚠️ PRIMARY BOTTLENECK
   - Serverless GPU cold start overhead
   - CLIP ViT-L-14 inference on A10G GPU
   - Warm containers: ~1-2 seconds
   - Cold containers: ~3-5 seconds
3. **Store embedding in Supabase:** ~100ms
4. **Vector similarity search (IVFFlat):** ~190ms ✓ OPTIMIZED
   - Before index: 500-1000ms (sequential scan)
   - After index: 190ms (5x faster)
5. **Return results to client:** ~200ms

**Total End-to-End Latency:** ~3-6 seconds (warm: ~2-3s, cold: ~4-6s)

**What the Vector Index Fixed:**
- ✅ Database search: 500-1000ms → 190ms (saved ~500-800ms)
- ✅ 5x speedup on similarity search portion
- ✅ Sub-200ms query times enable real-time search at scale

**What's Still Slow (Expected):**
- ⚠️ Modal.com GPU inference: 2-5 seconds (serverless cold start)
- This is normal and expected for serverless GPU functions
- Alternative: Keep Modal container warm (costs ~$0.60/hour continuous)
- Trade-off: Pay-per-query (slow start) vs always-on (fast, but costly)

**Production Recommendation:**
- For MVP: Accept 2-5s latency (pay-per-query, no ongoing costs)
- For scale: Keep 1-2 warm containers ($15-30/month for instant response)

**Phase 4 Complete - Ready for Production:**
- Search is using real CLIP embeddings from Modal.com (no mock data)
- Vector index enables fast semantic similarity search
- All 1,257 images searchable with sub-200ms query times
- End-to-end search latency: 2-6 seconds (acceptable for MVP)
- Ready to proceed to Phase 7: Style landing pages & SEO optimization

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

### Phase 4: Embedding Generation (✅ TESTED & WORKING - Dec 29, 2025)
**Status:** Fully tested on Modal.com GPU, embeddings generating correctly, ready for production

**Infrastructure Complete:**
- ✅ Modal.com Python script with OpenCLIP ViT-L-14 (768-dim)
- ✅ Batch processing capability (100 images/batch)
- ✅ Helper scripts for verification and testing
- ✅ Index creation automation (IVFFlat/HNSW)
- ✅ Modal CLI installed locally
- ✅ **All security fixes applied** (5 Critical issues resolved)
- ✅ **Build verification passed** (TypeScript compilation succeeds)
- ✅ **GPU test successful** - A10G GPU working, embeddings generated
- ✅ **Supabase integration working** - Client connected and validated

**Testing Results (Dec 29, 2025):**
- ✅ Modal authentication complete
- ✅ Supabase secrets created in Modal dashboard
- ✅ Test embedding generated successfully
- ✅ GPU confirmed working (CUDA device)
- ✅ 768-dimensional embeddings with L2 norm = 1.0
- ✅ Modal container builds in ~85 seconds (cached after first build)

**Fixes Applied During Setup:**
1. ✅ **Secret name** - Changed from "supabase-secret" to "supabase" (matches Modal UI)
2. ✅ **NumPy version** - Pinned to <2 for torch 2.1.2 compatibility
3. ✅ **Supabase library** - Upgraded from 2.3.4 to 2.15.0 (fixes httpx proxy error)

**Security Hardening Complete (Dec 29, 2025):**
1. ✅ **SSRF Protection** - URL validation, private IP blocking, size limits
2. ✅ **Credential Validation** - Environment variable validation, no exposure in errors
3. ✅ **SQL Injection Prevention** - Parameter validation in index creation
4. ✅ **Transaction Safety** - Batch processing with proper error handling
5. ✅ **Type Safety** - Removed unsafe 'as any' casts, proper RPC type handling
6. ✅ **Performance Index** - Added status column index for batch queries
7. ✅ **Environment Loading** - All TypeScript scripts load dotenv properly

**Ready for Production:**
1. Complete Phase 3 (Instagram scraping) to get portfolio images
2. Run batch embedding generation: `python3 -m modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch --batch-size 100`
3. Create vector index: `npx tsx scripts/embeddings/create-vector-index.ts`
4. Test search performance: `npx tsx scripts/embeddings/test-search.ts` (<500ms target)

**Files Created:**
- `scripts/embeddings/modal_clip_embeddings.py` - Main Modal.com GPU script (security hardened)
- `scripts/embeddings/check-embeddings.ts` - Verify progress (type-safe)
- `scripts/embeddings/create-vector-index.ts` - Index creation (SQL injection protected)
- `scripts/embeddings/test-search.ts` - Search performance testing (type-safe RPC calls)
- `supabase/migrations/20251229_012_add_status_index.sql` - Performance optimization

**Cost Estimate:** ~$0.30-0.60 per city (one-time GPU processing)

### Phase 5: Search Flow UI (✅ COMPLETE & REDESIGNED - Dec 29, 2025)

**Status:** ✅ Production-ready with "INK & ETHER" dark editorial design system

**Design System: "INK & ETHER"**
- **Aesthetic:** Dark editorial gallery experience (noir + artistic)
- **Typography:** Space Grotesk (display), JetBrains Mono (body), Crimson Pro (accent)
- **Colors:** Deep charcoal backgrounds (#0a0a0a), electric blue accents (#3b82f6) with glow effects
- **Visual Effects:** Noise texture overlay, grayscale→color image hover, staggered animations
- **Differentiation:** Feels like an art gallery for tattoo discovery, not a corporate search platform

**Design Consultation Process:**
1. ✅ Invoked `frontend-design` skill for guidelines
2. ✅ Delegated to `ui-designer` for comprehensive design system creation
3. ✅ Delegated to `frontend-developer` for implementation
4. ✅ Delegated to `code-reviewer` for security + accessibility review
5. ✅ Fixed 3 critical warnings (blob URL leak, text contrast, URL sanitization)

**Components Built:**
1. ✅ Landing page with dark hero + gradient background
2. ✅ Image upload with dark theme + glow effects
3. ✅ Text search with dark textarea + example pills
4. ✅ Search tabs with active state glow
5. ✅ Artist cards with grayscale→color hover effect
6. ✅ City filter with dark dropdown
7. ✅ Search results page with sticky glass-morphism header
8. ✅ Loading skeletons with shimmer animation
9. ✅ Error boundary with dark theme
10. ✅ Mock data utilities for testing

**Architecture:**
- Next.js 15.5 App Router with Server Components
- TypeScript strict mode (zero errors)
- Tailwind CSS with extended custom theme
- @radix-ui primitives (Tabs, Select)
- CSS-only animations (no JS for performance)
- Font optimization (Space Grotesk, JetBrains Mono, Crimson Pro)

**Build Status:**
- ✅ TypeScript compilation: PASS
- ✅ Next.js production build: SUCCESS
- ✅ Bundle size: 130 KB (landing), 138 KB (search results) - 31-36% under 200 KB target
- ✅ ESLint: 1 warning (<img> in ImageUpload.tsx - acceptable for blob URLs)

**Code Review Results (code-reviewer agent):**
- **Critical Issues:** None ✅
- **Warnings Fixed:**
  1. ✅ Blob URL memory leak - Added useEffect cleanup
  2. ✅ Text contrast - Updated tertiary color from #6b6b6b → #888888 (WCAG AA)
  3. ✅ URL sanitization - URLSearchParams for pagination
- **Accessibility:** 93% WCAG AA compliant (will be 100% after contrast fix)
- **Security:** No XSS vulnerabilities, proper input validation
- **Performance:** 129-138 KB bundle (excellent)

**Design System Files Created:**
- `/DESIGN_SYSTEM.md` - Complete specification (typography, colors, effects)
- `/IMPLEMENTATION_GUIDE.md` - Developer handoff with testing checklists
- `/DESIGN_SUMMARY.md` - High-level overview + principles
- `/QUICK_REFERENCE.md` - Copy-paste reference for developers

**Implementation Files (15 total):**
- `app/globals.css` - CSS variables, animations, utility classes
- `app/layout.tsx` - Font loading configuration
- `app/page.tsx` - Dark hero landing page
- `app/search/page.tsx` - Search results with dark theme
- `app/search/loading.tsx` - Skeleton states
- `app/search/error.tsx` - Error boundary
- `components/search/SearchTabs.tsx` - Dark tabs with glow
- `components/search/ImageUpload.tsx` - Dark drag-drop uploader
- `components/search/TextSearch.tsx` - Dark textarea
- `components/search/ArtistCard.tsx` - Gallery card with grayscale hover
- `components/search/CityFilter.tsx` - Dark dropdown
- `tailwind.config.ts` - Extended theme (colors, fonts, keyframes)
- `types/search.ts` - Type definitions
- `app/api/search/route.ts` - POST search endpoint
- `app/api/search/[searchId]/route.ts` - GET results endpoint

**Key Visual Features:**
- Staggered fade-up animations (100ms delays)
- Noise texture overlay (SVG grain 5% opacity)
- Glow effects on interactive elements
- Grayscale→color transition on image hover
- Glass morphism header (backdrop-blur)
- Gradient orbs for atmospheric lighting
- Lift-on-hover card effects (-4px translate)

**What Works Now:**
- Upload image or enter text on dark-themed landing page
- Submit form with animated loading state
- Redirect to search results page
- See empty state with encouraging copy
- Full UI/UX flow validated with dark aesthetic
- Responsive design (mobile, tablet, desktop)
- Accessibility compliant (WCAG AA)

**Ready for Phase 3/4 Completion:**
Once Instagram scraping and CLIP embeddings are generated:
1. Set `NEXT_PUBLIC_MOCK_EMBEDDINGS=false`
2. Deploy Modal.com functions
3. Update `MODAL_FUNCTION_URL` in .env
4. Artist cards will populate with real data
5. Search quality validation (70%+ relevance target)

**Next Steps:**
1. Run full production Instagram scrape (204 Austin artists)
2. Test GPT-5-nano image filtering accuracy
3. Generate CLIP embeddings (Phase 4)
4. Test search quality with real data
5. Deploy to production

### Phase 6: Artist Profile Pages & SEO (✅ COMPLETE - Dec 30, 2025)

**Status:** ✅ Production-ready with comprehensive security hardening

**Production Results:**
- ✅ 188 artist profile pages generated at build time
- ✅ State/city browse hierarchy (2 states, 2 cities)
- ✅ All pages SEO optimized with JSON-LD, Open Graph, sitemap
- ✅ Zero CRITICAL security issues (3 critical vulnerabilities fixed)
- ✅ Build succeeds with TypeScript strict mode

**Routes Created:**
1. **Artist Pages (`/artist/[slug]`):**
   - Hero section with split-screen layout (featured image + artist info)
   - Portfolio grid (3-column responsive) with smart interstitials
   - Bio block (after 9 images)
   - Related artists with vector similarity (after 18 images)
   - Claim profile CTA (after 27 images)
   - Mobile sticky Instagram footer
   - Loading states and custom 404 page

2. **State/City Browse Pages:**
   - State pages (`/texas`, `/california`): City cards with artist counts
   - City pages (`/texas/austin`, `/california/los-angeles`): Artist grid
   - Breadcrumb navigation with JSON-LD schema

**Components Built (6 files):**
- `ArtistHero.tsx` - Split-screen hero with Instagram CTA
- `PortfolioGrid.tsx` - Responsive grid with interstitials (Server Component)
- `BioInterstitial.tsx` - Artist bio content block
- `RelatedArtists.tsx` - Vector similarity search using CLIP embeddings
- `ClaimProfileCTA.tsx` - Placeholder claim link (non-functional MVP)
- `InstagramStickyFooter.tsx` - Mobile-only sticky CTA (Client Component)

**Database Query Functions (3 new):**
- `getRelatedArtists()` - Vector similarity with IVFFlat (threshold: 0.5, city filter)
- `getStateWithCities()` - State-level artist aggregation
- `getCityArtists()` - City-level artist listings with pagination

**Security Hardening (3 CRITICAL fixes):**
1. ✅ **XSS Prevention in JSON-LD:**
   - Created `lib/utils/seo.ts` with `sanitizeForJsonLd()` function
   - Sanitizes all user-generated content in structured data
   - Applied to all Person, LocalBusiness, and Breadcrumb schemas

2. ✅ **Input Validation:**
   - Validation helpers: UUID, slug, string, state code, integer, float
   - All 6 query functions now validate inputs before DB operations
   - Updated slug regex to support periods and underscores

3. ✅ **Centralized Image URLs:**
   - Reused `lib/utils/images.ts` from homepage work
   - Eliminated environment variable exposure in components
   - Removed duplicate URL construction across 6 files

**SEO & Performance:**
- Dynamic sitemap generation (`app/sitemap.ts`)
- Robots.txt configuration (`app/robots.ts`)
- JSON-LD schemas: Person, LocalBusiness, Breadcrumb
- Canonical URLs, Open Graph metadata
- Responsive images with `next/image` (priority on hero, lazy after 6)
- ISR with 24h revalidation

**Technical Architecture:**
- Next.js 15.5 App Router with generateStaticParams
- Server Components for all routes (except sticky footer)
- Service role client for build-time data fetching (avoids cookies error)
- Vector similarity search using CLIP embeddings from Phase 4
- "INK & ETHER" dark editorial design system (from Phase 5)

**Build Metrics:**
- 188 artist pages + 4 browse pages (192 total)
- Build time: ~2 minutes
- No TypeScript errors
- Bundle size within target (<200 KB)

**Files Created:**
- 6 artist components
- 3 route pages (artist, state, city)
- 2 SEO files (sitemap, robots)
- 1 SEO utility (sanitization)
- 1 migration script (state field verification)
- 1 middleware redirect (/artists/ → /artist/)

**Known Issues (WARNING-level, not blocking):**
- Hydration mismatch in InstagramStickyFooter (window.innerWidth check)
- 6 eager-loaded images may be excessive (recommend 3-4)
- No error boundaries on artist routes (nice-to-have)

**Next Steps:**
- Create vector index for related artists (IVFFlat with optimal parameters)
- Test related artists relevance (target: 70%+ similarity within city)
- Consider adding error boundaries for production stability
- Optimize eager image loading count (6 → 3-4)

### Style Seeds from Tattoodo (✅ COMPLETE - Dec 30, 2025)

**Status:** ✅ 10 tattoo styles with CLIP embeddings in database

**Source:** https://www.tattoodo.com/articles/a-beginners-guide-popular-tattoo-styles-briefly-explained-6969

**Results:**
- **57 seed images** downloaded from Tattoodo (5-6 per style)
- **All images uploaded** to Supabase Storage (`portfolio-images/style-seeds/`)
- **57 CLIP embeddings** generated via Modal.com (ViT-L-14, 768-dim)
- **10 representative seeds** inserted into `style_seeds` table
- **100% success rate** - All embeddings generated without errors

**Styles Seeded:**
1. **Traditional** - Bold lines, bright colors, roses and anchors
2. **Realism** - Photo-realistic portraits and nature
3. **Watercolor** - Soft, flowing, brush-dabbled pastels
4. **Tribal** - Bold geometric patterns, black ink
5. **New School** - Cartoonish, vibrant, 90s aesthetic
6. **Neo Traditional** - Modern evolution with vibrant colors
7. **Japanese** - Dragons, phoenixes, folklore (Irezumi)
8. **Blackwork** - Solely black ink, sacred geometry
9. **Illustrative** - Etching, engraving, fine line
10. **Chicano** - Fine line, Mexican culture, LA style

**Tools & Scripts Created:**
- `scripts/style-seeds/style-seeds-data.ts` - Style definitions from Tattoodo
- `scripts/style-seeds/download-and-upload-seeds.ts` - Download & upload pipeline
- `scripts/style-seeds/generate-seed-embeddings.ts` - Image preparation
- `scripts/style-seeds/generate-seed-embeddings-simple.py` - Modal.com GPU processing
- `scripts/style-seeds/populate-style-seeds.ts` - Database insertion
- `scripts/style-seeds/verify-seeds.ts` - Verification utility

**NPM Scripts:**
```bash
npm run seeds:download              # Download images from Tattoodo
npm run seeds:prepare-embeddings    # Prepare for GPU processing
npm run seeds:generate-embeddings   # Generate CLIP embeddings (Modal.com)
npm run seeds:populate              # Insert into database
npm run seeds:all                   # Run complete pipeline
```

**Next Steps for Phase 7:**
1. Create style landing pages (e.g., `/texas/austin/traditional`)
2. Build style browse UI component
3. Implement style-based artist search using seed embeddings
4. Add style filters to search results
5. SEO optimization for style pages

### Modal Container Warmup Optimization (✅ COMPLETE - Dec 31, 2025)

**Status:** ✅ Production-ready with security hardening

**Problem Identified:**
- **Modal cold starts:** 20-25s per search (container startup + model loading)
- **User experience:** Unacceptable latency for first search
- **Warming cost:** $210-240/month for 24/7 keep-warm (too expensive for MVP)

**Solution Implemented:**
1. **Container Scaledown Window:** 10-minute idle timeout (stays warm between searches)
2. **Pre-warmup on Page Load:** Fire-and-forget warmup request when user lands on homepage
3. **Feature Flag:** `NEXT_PUBLIC_ENABLE_WARMUP` to disable when organic traffic keeps containers warm

**Architecture:**
```
User Journey:
1. User lands on homepage → ModalWarmup component fires
2. Container spins up in background (20-25s)
3. User browses/enters query (~30-60s)
4. User submits search → Container is warm (2-5s response!)
5. Subsequent searches within 10min → 2-5s (warm)
6. After 10min idle → Container shuts down (saves money)
```

**Performance Results:**
| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| First search (cold) | 25s | 2-5s (pre-warmed!) | **83-90% faster** |
| Searches within 10min | 25s (cold every time) | 2-5s (warm) | **83-90% faster** |
| After 10min idle | 25s | 25s (acceptable, infrequent) | Same |

**Cost Analysis:**
- **Warmup cost:** ~$0.001 per homepage visit (0.3s GPU time for text embedding)
- **Expected monthly cost:** ~$3-5/month (100-200 visitors/day)
- **Savings:** $205-237/month vs 24/7 keep-warm ($210-240/month)
- **Cost efficiency:** 98% savings while maintaining fast UX

**Security Hardening (Code Review):**
1. ✅ **SSRF Prevention:** URL validation (whitelist `.modal.run` domain, HTTPS only)
2. ✅ **Rate Limiting:** Max 1 warmup per IP per minute (prevents cost abuse)
3. ✅ **Cache-Control Headers:** Prevents caching of POST responses
4. ✅ **Timing Metrics:** Logs warmup duration for monitoring
5. ✅ **Error Handling:** Silent failures (non-critical optimization)
6. ✅ **Memory Leak Prevention:** Automatic cleanup of rate limit cache

**Files Created:**
- `app/api/warmup/route.ts` - Warmup API endpoint (138 lines, production-ready)
- `components/warmup/ModalWarmup.tsx` - Client-side warmup trigger
- Updated: `scripts/embeddings/modal_clip_embeddings.py` (scaledown_window parameter)
- Updated: `.env.example` (NEXT_PUBLIC_ENABLE_WARMUP flag)

**Modal Deployment:**
- **Endpoint:** `https://gr0x01--tattoo-clip-embeddings-model-fastapi-app.modal.run`
- **Configuration:** `scaledown_window=600` (10 minutes)
- **Parameter Update:** Migrated from deprecated `container_idle_timeout` to `scaledown_window` (Modal 1.0+)
- **Deployment Time:** ~4 seconds (no warnings)

**Setup Instructions:**
```bash
# 1. Add to .env.local
NEXT_PUBLIC_ENABLE_WARMUP=true
MODAL_FUNCTION_URL=https://gr0x01--tattoo-clip-embeddings-model-fastapi-app.modal.run

# 2. Restart dev server
npm run dev

# 3. Test flow
# - Open homepage → Check console for "🔥 Triggering Modal warmup..."
# - Wait 30s for warmup
# - Run search → Should be fast (2-5s)
```

**When to Disable Warmup:**
- 50+ searches/day (containers stay naturally warm from organic traffic)
- Want to save ~$3/month warmup cost
- Running analytics and don't want warmup noise

**Next Steps:**
- Monitor warmup effectiveness via server logs
- Consider localStorage deduplication (avoid duplicate warmups on navigation)
- Evaluate reducing scaledown_window to 5min if search patterns support it

## Context Notes
- ✅ Market validation complete - strong demand across all cities
- ✅ Austin selected for growth potential + low competition
- ✅ LA selected for market size + artist density
- ✅ Visual search gap validates our image-based approach
- ✅ Phase 0 completed in ~5 hours (market analysis)
- ✅ Phase 1 completed in ~8 hours (infrastructure + security hardening)
- **Phase 1 is production-ready** - all critical security and performance issues resolved
- ✅ **Style seeds complete** - Ready for Phase 7 style landing pages
- Next: Phase 7 (Style Landing Pages & SEO) OR Los Angeles discovery