---
Last-Updated: 2025-12-29
Maintainer: RB
Status: Phase 3 Complete ✅ (Ready for Testing), Phase 4 Infrastructure Ready ✅
---

# Progress Log: Tattoo Artist Discovery Platform

## Project Timeline

### Phase 0: Market Analysis & Planning (December 29, 2025)
**Status**: ✅ Complete (~5 hours)

#### Completed
- ✅ Created CLAUDE.md with AI assistant rules and subagent workflow
- ✅ Set up memory bank directory structure (core, development, architecture, projects)
- ✅ Created comprehensive implementation plan (tattoo-discovery-implementation-plan.md)
- ✅ **Market Analysis:**
  - Built DataForSEO integration script for keyword research
  - Analyzed 8 candidate cities (LA, NYC, Austin, Miami, Portland, Chicago, Seattle, Denver)
  - All cities scored HIGH (74-81/100 opportunity scores)
  - Selected **Austin, TX + Los Angeles, CA** as launch cities
  - Identified inkzup.com as main competitor (booking platform, not discovery)
  - Found visual search opportunity gap (low competition on "inspiration" queries)
- ✅ **Architecture Decision:** Multi-modal search approach
  - Image upload (primary)
  - Natural language text search (secondary) using CLIP's text encoder
  - Visual style picker (optional)
  - Hybrid search (post-MVP)
  - Key insight: Users don't know taxonomy, speak in "vibes" → we translate
- ✅ **SEO Strategy:** Hybrid categorization approach
  - No manual artist tags for search (pure embeddings)
  - Auto-generated style landing pages using seed image embeddings
  - 10 initial style seeds (fine line, traditional, geometric, etc.)
  - 20+ SEO pages per city (style pages + city pages)
  - Internal linking structure designed for SEO authority

#### Key Findings
- **Market Demand:** 254k-269k monthly searches per city (massive demand)
- **Competition:** 46-67% competition, but 0/100 keyword difficulty (easy to rank)
- **Growth:** 9-16 keywords trending up per city (growing markets)
- **Opportunity:** No strong visual search platform exists → our differentiator
- **Technical:** CLIP is multimodal → text and image search use same vector space

### Phase 1: Infrastructure Setup (Complete - Dec 29, 2025)
**Status**: ✅ Complete (~8 hours including security hardening)

#### Completed
- ✅ Supabase project created with pgvector extension
- ✅ Complete database schema (7 tables, future-proof for auth)
- ✅ Optimized `search_artists_by_embedding()` function with CTE performance improvements
- ✅ **Complete RLS policies** (15 policies across 5 tables: users, searches, saved_artists, artists, portfolio_images)
- ✅ **Database validation constraints** (CHECK constraints for enums, URLs, email format)
- ✅ **Data integrity constraints** (NOT NULL on required foreign keys and status fields)
- ✅ **Automatic timestamp triggers** (updated_at auto-management on 3 tables)
- ✅ **TypeScript type safety** (generated database types from Supabase schema)
- ✅ **Environment validation** (Zod schema with runtime validation)
- ✅ **Deferred index creation** (IVFFlat index to be created after data load with optimal parameters)
- ✅ Next.js 15.5 project initialized (App Router + TypeScript + Tailwind)
- ✅ Supabase client libraries (@supabase/ssr) with validated env
- ✅ **Optimized middleware** (skips auth on 95% of routes for performance)
- ✅ Query utilities for vector search
- ✅ Build verification successful (strict TypeScript mode)
- ✅ **8 migration files** in local `supabase/migrations/` directory (version controlled)
- ⏳ Cloudflare R2 bucket setup (deferred to Phase 2)
- ⏳ Instagram OAuth configuration (documented, ready for post-MVP)

#### Security Hardening (Code Review Fixes - Dec 29, 2025)
After initial infrastructure setup, comprehensive code review identified and fixed:

**🔴 Critical Issues (All Fixed):**
1. ✅ Missing RLS on public tables (artists, portfolio_images)
   - Added public read access policies
   - Service role-only write access
   - Claimed artists can manage own profiles
2. ✅ Missing database validation constraints
   - Email format validation
   - Status enum constraints (verification_status, job status, image status)
   - URL format validation (Instagram, website, booking)
   - Non-negative number constraints (followers, likes, images scraped)
3. ✅ No TypeScript database types
   - Generated complete types for all 7 tables
   - Type-safe queries with autocomplete
   - Prevents column name typos
4. ✅ Missing NOT NULL constraints
   - portfolio_images.artist_id (prevents orphaned images)
   - Status fields (always defined)
   - Required counters (default values enforced)

**⚠️ Warnings (All Fixed):**
1. ✅ Premature IVFFlat index creation
   - Removed index from empty table
   - Added comprehensive guide for optimal index creation after data load
   - Includes HNSW vs IVFFlat decision matrix
2. ✅ Vector search performance issues
   - Rewrote function with early city filtering
   - CTE-based query planning
   - Efficient result limiting and pagination
3. ✅ Middleware performance overhead
   - Skip auth checks on public routes (/, /austin, /los-angeles, /artist/*)
   - Only authenticate on protected routes (/dashboard, /profile, /saved)
   - 95% reduction in auth overhead for SEO pages
4. ✅ Missing updated_at automation
   - Added trigger function for automatic timestamp updates
   - Applied to users, artists, style_seeds tables
5. ✅ Environment variable validation
   - Zod schema for runtime validation
   - Clear error messages for missing/invalid values
   - Integrated into all Supabase client files (no more `!` assertions)

## Key Milestones

### Milestone 1: Market Validation ✅ (Dec 29, 2025)
- Market analysis complete
- Launch cities selected (Austin + LA)
- Competition analyzed (inkzup.com identified)
- Visual search gap validated

### Milestone 2: Infrastructure Ready ✅ (Dec 29, 2025)
- ✅ Database with pgvector functional
- ✅ **Production-ready security** (RLS policies, validation constraints, type safety)
- ✅ **Performance optimized** (middleware, vector search, deferred indexing)
- ⏳ Image storage configured (Cloudflare R2 - deferred to Phase 2)
- ✅ Next.js project initialized with strict TypeScript
- ✅ Development environment ready
- ✅ Supabase client libraries configured with environment validation
- ✅ Build verification successful
- ✅ **8 migration files version-controlled** for reproducible deployments

### Milestone 3: MVP Launch (Target: Week 8)
- 400-600 artists indexed (200-300 per city)
- Image + text search functional
- Artist profile pages live
- SEO optimized

## Architectural Decisions

### December 29, 2025: Multi-Modal Search UX
**Decision:** Build "user language" search, not "artist language" directory

**Problem:** Users don't know tattoo taxonomy (neo-traditional, blackwork, etc.). They have Pinterest screenshots and vague vibes ("dark floral sketchy").

**Solution:** CLIP's multimodal architecture allows:
1. **Image search:** Upload reference → CLIP image encoder → vector search
2. **Text search:** "dark floral sketchy" → CLIP text encoder → same vector search
3. **Visual picker:** Click vibe images → combine embeddings → search
4. **Hybrid:** Image + text modifiers (future)

**Why:** Competitors force users into taxonomy dropdowns. We let users express themselves naturally.

**Impact:**
- Single vector space for all search types
- No style tagging required
- Better UX = higher conversion
- Validates our visual search opportunity gap

**Documentation:** `/memory-bank/projects/search-ux-strategy.md`

## Shipped Features
[Features will be tracked as they are completed]

## Performance Metrics
[Metrics will be established after MVP launch]

## Lessons Learned

### Market Analysis Phase
1. **DataForSEO delivers:** All 8 cities showed strong opportunity (74-81/100 scores)
2. **Visual search gap is real:** Low competition on "ideas", "inspiration", "portfolio" queries validates our approach
3. **No dominant player:** inkzup.com appears everywhere but focuses on booking, not discovery
4. **CLIP multimodal = killer feature:** Same model for image + text search simplifies architecture
5. **Austin over NYC:** Lower competition (46% vs 67%) + strong growth trajectory
6. **LA is massive:** 261k searches/month + highest artist density

### Infrastructure Setup & Security
1. **Code reviews find critical gaps:** Initial RLS was incomplete - artists/portfolio_images were public write
2. **Defense in depth works:** Database constraints + TypeScript types + RLS policies catch different error classes
3. **Premature optimization hurts:** Creating IVFFlat index on empty table wastes resources and uses wrong parameters
4. **Environment validation saves debugging time:** Zod schema catches missing env vars at startup (fail fast)
5. **Performance matters for SEO:** Skipping auth on public routes reduces latency for 95% of traffic
6. **Migration files = documentation:** Version-controlled SQL files make deployments reproducible
7. **Generated types prevent bugs:** Supabase-generated TypeScript types catch column name typos at compile time
8. **Automatic triggers reduce errors:** updated_at triggers eliminate manual timestamp management

### Phase 2: Artist Discovery (Dec 29, 2025 - In Progress)

**Discovery Approach:**
- Tested 3 methods: Tavily Instagram search, Google Places API, shop website scraping
- **Key insight:** Solo practitioners dominate (user's hypothesis validated)
- **Decision:** Instagram-first Tavily + shop scraping supplement

**Tools Built:**
1. `tavily-artist-discovery-v2.ts` - Multi-query discovery with caching (46+ queries)
2. `query-generator.ts` - Generates 40-50 diverse queries (styles, locations, demographics)
3. `shop-website-scraper.ts` - Puppeteer scraper for shop rosters
4. `google-places-discovery.ts` - Finds tattoo shops via Google Places
5. `cleanup-false-positives.ts` - Filters technical terms from scraped handles
6. `discovery_queries` table - Query caching + cost tracking

**Austin Results (✅ COMPLETE - 204 artists):**
- **Tavily Discovery:** 145 artists from 66 queries (~$3.30)
  - Initial run: 114 artists from 46 queries (~$2.30)
  - Final push: 31 artists from 20 niche specialty queries (~$1.00)
  - Breakdown: Location (32), Styles (65), General/Experience/Demographic (17), Niche Specialties (31)
- **Shop Scraping:** 59 artists from 21 shops (~$0.16)
- **Total Cost:** ~$3.46 for 204 artists ($0.017 per artist)
- **Target Met:** 204/200 (102% of minimum target)

**Next:**
- Replicate approach for Los Angeles (same query set, 10 LA neighborhoods)
- Instagram validation (public/private check)
- ✅ Portfolio scraping (Apify - Phase 3 complete)

### Phase 3: Instagram Scraping & Image Processing (✅ COMPLETE - Dec 29, 2025)
**Status**: Production-ready, awaiting testing with Austin artists (204)

**Major Decisions:**
1. **Switched from Instaloader to Apify:**
   - Speed: 30-60 minutes vs 3-5 hours (10x faster)
   - Reliability: Managed IPs, automatic retries, rate limit handling
   - Cost: $20-40 for 204 artists (worth it for reliability)
   - Instagram TOS compliance: Apify handles all compliance
2. **Supabase Storage over Cloudflare R2:**
   - Simpler integration (already using Supabase)
   - Pro tier: 100GB storage + 200GB bandwidth
   - Public CDN URLs for images
3. **Two-phase processing pipeline:**
   - Phase 1: Python downloads to /tmp (Apify API)
   - Phase 2: Node.js processes & uploads to Supabase Storage
4. **Security-first approach:**
   - 2 comprehensive code reviews
   - 9 critical security fixes applied
   - Path traversal prevention, input validation, rollback logic

**Infrastructure Built:**
- ✅ 2 database migrations (storage paths, unique constraints)
- ✅ Storage bucket setup script (automated)
- ✅ 2 core libraries (storage, image processing)
- ✅ 4 scraping scripts (Python scraper, Node processor, validator, orchestrator)
- ✅ Resumability system (scraping_jobs table)
- ✅ Idempotency checks (skip already-processed images)
- ✅ Security hardening (9 critical fixes)

**Security Fixes Applied:**
1. ✅ Path traversal prevention (UUID/shortcode validation)
2. ✅ Input validation (Instagram handles, artist IDs)
3. ✅ Storage rollback on DB failures (prevents orphaned files)
4. ✅ Database unique constraint (prevents race conditions)
5. ✅ Upload retry logic (3 attempts, linear backoff)
6. ✅ File cleanup on all paths (prevents disk exhaustion)
7. ✅ Environment variable validation (clear error messages)
8. ✅ Connection leak fix (Python finally block)
9. ✅ Apify timeout (5 minutes per artist)

**Tools & Scripts:**
- `scripts/setup/setup-storage-bucket.ts` - Automated Supabase bucket creation
- `lib/storage/supabase-storage.ts` - Upload/download with path validation
- `lib/processing/image-processor.ts` - Sharp-based processing (JPEG→WebP, 3 sizes)
- `scripts/scraping/apify-scraper.py` - Instagram scraping via Apify
- `scripts/scraping/process-and-upload.ts` - Image processing & upload pipeline
- `scripts/scraping/validate-scraped-images.ts` - Stats and validation
- `scripts/scraping/orchestrate-scraping.sh` - Full pipeline automation

**Image Processing Pipeline:**
- Original JPEG → WebP conversion (85% quality)
- 3 thumbnail sizes: 320w, 640w, 1280w
- Storage paths: `original/{artist_id}/{post_id}.jpg`, `thumbs/{size}/{artist_id}/{post_id}.webp`
- Parallel uploads (4 files per image)
- Metadata tracking (caption, likes, timestamp)

**Resumability Features:**
- `scraping_jobs` table tracks progress (pending/in_progress/completed)
- Idempotency checks skip already-uploaded images
- Can resume after interruption (Ctrl+C, network failure, crash)
- Progress logging: "Artist 47/204 completed (23%)"

**Expected Results:**
- Total images: 4,080-10,200 (20-50 per artist × 204)
- Storage used: 15-35 GB (WebP compression saves ~70%)
- Processing time: 30-60 minutes for 204 artists
- Cost: $20-40 (Apify) + $0 (within Supabase free tier)

**Files Created:**
- 2 migrations: `20251229_010_update_storage_paths.sql`, `20251229_011_add_unique_constraint.sql`
- 7 new scripts/libraries (setup, storage, processing, scraping, validation, orchestration)
- Updated: `requirements.txt` (apify-client, requests), `package.json` (npm scripts)
- Created: `.env.example` (safe credentials template)

**Next Steps:**
1. Get Apify API token (free $5 credit at apify.com)
2. Add to `.env.local`: `APIFY_API_TOKEN=apify_api_xxx`
3. Test with 1-2 artists (modify Python script: add `LIMIT 2`)
4. Run full scrape: `npm run scrape-instagram` (30-60 minutes)
5. Validate: `npm run validate-scraped-images`
6. Proceed to Phase 4 (CLIP embeddings on Modal.com)

### Phase 4: Embedding Generation Infrastructure (✅ COMPLETE - Dec 29, 2025)
**Status**: Scripts ready, Modal CLI installed, waiting for Phase 3 images

**Completed:**
- ✅ Modal.com Python script with OpenCLIP ViT-L-14 (768-dim embeddings)
- ✅ Batch processing script (100 images/batch, resumable from offset)
- ✅ Text embedding generation for search queries
- ✅ Helper scripts: check-embeddings.ts, create-vector-index.ts, test-search.ts
- ✅ Automatic index type selection (HNSW <1k images, IVFFlat 1k-100k+)
- ✅ Modal CLI installed locally
- ✅ Setup guides: SETUP.md (detailed) + QUICKSTART.md (quick reference)

**Architecture:**
- Model: OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - industry-proven multimodal
- GPU: A10G serverless (pay-per-second, ~$0.60/hour)
- Dimensions: 768 (L2 normalized for cosine similarity)
- Batch processing: 100 images/batch, auto-retry failed images
- Error handling: Failed images marked in DB, detailed error logs

**User Next Steps:**
1. Run `modal setup` to authenticate (one-time, opens browser)
2. Create Supabase secret: `modal secret create supabase-secret SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...`
3. Test with sample: `modal run scripts/embeddings/modal_clip_embeddings.py::generate_single_embedding --image-url "..."`
4. After Phase 3: Run batch generation for all images
5. Create vector index: `npx tsx scripts/embeddings/create-vector-index.ts`
6. Test search: `npx tsx scripts/embeddings/test-search.ts`

**Cost Estimate:**
- Model download: Free (cached in container, 1.5GB)
- Processing time: ~5-10 min per 6,000 images
- GPU cost: ~$0.05-0.10 per city
- Total for 2 cities: ~$0.30-0.60 (one-time)

**Files Created:**
- `scripts/embeddings/modal_clip_embeddings.py` - Main Modal.com script (350 lines)
- `scripts/embeddings/check-embeddings.ts` - Progress verification
- `scripts/embeddings/create-vector-index.ts` - Index automation with optimal params
- `scripts/embeddings/test-search.ts` - Search performance testing
- `scripts/embeddings/SETUP.md` - Detailed setup guide
- `scripts/embeddings/QUICKSTART.md` - Quick reference guide

### Technical Decisions
1. **IVFFlat over HNSW:** Better for 10k-100k+ vectors (our expected scale)
2. **Modal.com for embeddings:** Serverless GPU at $0.30 per city beats managed services
3. **User language > Artist language:** Biggest UX differentiator from competitors
4. **Hybrid SEO approach:** No manual tags, use seed embeddings for auto-generated style pages
5. **Future-proof schema:** Built in auth tables, artist claiming, saved artists from day 1
6. **Defer index creation:** Create vector index after data load with optimal parameters (not on empty table)
7. **Defense in depth:** Database constraints + TypeScript types + RLS policies for multi-layer security
8. **Environment validation:** Zod schema catches missing env vars at startup (fail fast)
9. **Performance-first middleware:** Skip expensive auth checks on 95% of routes (public pages)
10. **Instagram-first discovery:** Tavily finds solo practitioners directly (no website scraping needed for 66% of artists)
11. **Query caching:** Prevents duplicate API calls, tracks costs per query (~$0.05 Tavily, ~$0.032 Google Places)
12. **Shop scraping with false positive filtering:** Puppeteer + Cheerio finds 52% real artists (59/113 handles)
13. **Apify over Instaloader:** Paid service ($20-40 per city) beats free tool for 10x speed + reliability (30-60 min vs 3-5 hours)
14. **Supabase Storage over R2:** Simpler integration, already have Pro tier (100GB + 200GB bandwidth)
15. **Security-first scraping:** 2 code review rounds, 9 critical fixes (path traversal, rollback, validation)