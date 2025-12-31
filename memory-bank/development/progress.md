---
Last-Updated: 2025-12-31
Maintainer: RB
Status: Atlanta + LA Discovery Complete ✅, 2,950 Images Scraped ✅, Ready for Classification ✅
---

# Progress Log: Inkdex

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

### Phase 3 Production: Instagram Scraping Lessons Learned (Dec 29, 2025)

1. **Parallelization is not one-size-fits-all:**
   - Apify scraping: 20 concurrent hit memory limits (8GB Apify cap) → tuned to 8 concurrent
   - GPT-5-nano: Best as single large batch (1,692 images) with Flex tier managing parallelization
   - Supabase uploads: 100 concurrent worked perfectly with 1 Gbps bandwidth (no memory issues)

2. **Batch processing architecture wins:**
   - Initial mistake: Inline GPT-5-nano during download (5+ min per artist)
   - Fixed: Download all → Batch classify → Upload filtered (2-3 min total for classification)
   - Time savings: 90+ minutes → 2-3 minutes (30x faster)

3. **Database cleanup is operational hygiene:**
   - Bad data accumulates during discovery (invalid handles, typos, generic names)
   - Delete immediately during production rather than carrying forward
   - 16 artists deleted (8% of original 204) - all invalid handles or private accounts

4. **User bandwidth matters for parallelization:**
   - 1 Gbps upload enabled 100 concurrent uploads (limited only by processing, not network)
   - With slower connection, would need to tune concurrency based on bandwidth tests

5. **API rate limits vary by service:**
   - Apify: Hit 8GB memory limit at 20 concurrent (service-side constraint)
   - Supabase Storage: No apparent limit up to 100 concurrent uploads
   - GPT-5-nano Flex: 30k RPM (5,000 image batches work fine)

6. **Monitoring catches setup mistakes early:**
   - First run used inline classification (user caught it immediately)
   - Active monitoring during first ~10 artists prevents wasting 90+ minutes

### Phase 4 Production: CLIP Embedding Generation & Vector Index (Dec 30, 2025)

**Status:** ✅ FULLY COMPLETE - All 1,257 images have embeddings + IVFFlat vector index

**Production Results:**
- Total images processed: 1,257/1,257 (100%)
- Model: OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - 768 dimensions
- GPU: Modal.com A10G (~$0.60/hour, billed per second)
- Processing time: ~2-3 hours total
- Success rate: 100% (0 errors)
- Cost: ~$1.50-2.00 for full run
- **Vector Index:** IVFFlat with lists=35 (10 seconds build time)
- **Search Performance:** 190ms average (5x faster than sequential scan)

**Lessons Learned:**

1. **Modal timeout architecture is complex:**
   - Container lifetime timeout (7200s) ≠ remote method timeout (300s)
   - Remote method timeout is HARD LIMIT, cannot be overridden with decorators
   - Cumulative timeout: Multiple `.remote()` calls add up toward 300s limit
   - Solution: Process in smaller chunks (2 batches × 50 images = ~200-250s)

2. **Optimal batch sizing requires understanding all constraints:**
   - GPU can handle 100+ images easily
   - Network I/O takes ~30-60s per 50 images
   - CLIP inference takes ~60-90s per 50 images
   - Database writes take ~10-20s per 50 images
   - Total: ~2-3 min per 50-image batch (safe margin under 5-min timeout)

3. **Resume capability is critical for long-running jobs:**
   - Query `WHERE embedding IS NULL AND status='pending'` enables automatic resume
   - Can Ctrl+C and restart without losing progress
   - Idempotent by design (skips already-processed images)
   - Processed 1,257 images across ~26 separate runs without issues

4. **Status workflow prevents incomplete data in production:**
   - Upload with `status='pending'` (not searchable yet)
   - Generate embedding → set `status='active'` (now searchable)
   - Prevents race conditions where users search before embeddings exist
   - Supports incremental updates (only new images need embeddings)

5. **Infrastructure code requires iteration:**
   - Initial attempt: Used wrong column name (`image_url` vs `storage_original_path`)
   - Second attempt: Used wrong bucket name (`portfolio` vs `portfolio-images`)
   - Third attempt: Hit timeout with 100 images per batch
   - Fourth attempt: Success with 50 images, 2 batches per run
   - Importance of testing with small batches before full production run

6. **Modal.com is cost-effective but has learning curve:**
   - A10G GPU is fast and cheap (~$0.60/hour, billed per second)
   - Timeout constraints require architectural understanding
   - Container caching makes subsequent runs faster (~85s build time cached)
   - Secret management works well (Supabase credentials never exposed)

**Schema Changes:**
- Migration `20251230_001_add_pending_status.sql` - Added 'pending' to status enum
- Updated `process-and-upload.ts` to insert with `status='pending'`
- Updated `modal_clip_embeddings.py` to set `status='active'` after success

**Vector Index Creation (Dec 30, 2025):**
- ✅ IVFFlat index created with optimal parameters (lists=35)
- ✅ Build time: 10 seconds for 1,257 vectors
- ✅ Distance metric: `vector_cosine_ops` (cosine similarity)
- ✅ Performance tested: 184-211ms query times (avg 190ms)
- ✅ 5x faster than sequential scan
- ✅ Threshold testing: Optimal range 0.5-0.7 for balanced precision/recall

**Key Learnings - Vector Index:**
1. **IVFFlat is optimal for this dataset size:**
   - 1,257 images falls perfectly in the 1k-10k sweet spot for IVFFlat
   - Build time was only 10 seconds (much faster than expected 2-5 minutes)
   - Lists parameter (35 = sqrt(1,257)) provides excellent speed/recall balance

2. **Index dramatically improves performance:**
   - Without index: ~500-1000ms (sequential scan)
   - With index: ~190ms average (5x faster)
   - Well under 500ms target for production readiness

3. **Cosine similarity works perfectly with L2-normalized embeddings:**
   - CLIP embeddings are L2-normalized (norm = 1.0)
   - Pgvector `<=>` operator efficiently computes cosine distance
   - Standard approach for semantic similarity search

4. **Understanding the full performance picture:**
   - Vector index optimization: Database portion now 190ms (was 500-1000ms)
   - But end-to-end latency still 2-6 seconds due to Modal.com GPU inference
   - Modal cold start: 3-5 seconds, warm: 1-2 seconds
   - Bottleneck is CLIP embedding generation, not database search
   - Trade-off: Pay-per-query (slow) vs warm containers ($15-30/month for instant)

**End-to-End Performance Breakdown:**
```
1. Image upload → API:              ~500ms
2. Modal.com CLIP embedding:        ~2-5s (PRIMARY BOTTLENECK)
3. Store embedding in DB:           ~100ms
4. Vector search (with index):      ~190ms ✓ (was 500-1000ms)
5. Return results:                  ~200ms
──────────────────────────────────────────
   TOTAL:                           ~3-6s
```

**Performance Impact of Vector Index:**
- Saved 500-800ms from database portion (5x faster)
- Total end-to-end improvement: ~15-25% faster overall
- Database is no longer the bottleneck (Modal.com GPU is)

**Phase 4 Complete - Ready for Production Search**

### Search Quality Optimization (Dec 30, 2025)

**Issue Discovered:**
- Niche text queries (e.g., "new school", "stick and poke") returned zero results
- Generic queries (e.g., "black and gray", "Japanese traditional") worked fine
- Root cause: Similarity threshold too restrictive (0.25) + CLIP lacking tattoo context

**Solutions Implemented:**
1. **Lowered similarity threshold:** 0.25 → 0.15
   - CLIP cosine similarity range for niche queries: 0.15-0.25
   - Generic queries still rank higher (0.3-0.4+)
   - More results shown, still ranked by relevance

2. **Enhanced text query context:**
   - Automatically append "tattoo" to queries that don't contain it
   - Example: "new school" → "new school tattoo"
   - Helps CLIP understand domain-specific terminology
   - Preserves original query text for display

**Files Modified:**
- `app/api/search/[searchId]/route.ts` - Threshold change (line 147)
- `app/api/search/route.ts` - Query enhancement (lines 98-105)

**Results:**
- ✅ Niche queries now return relevant results
- ✅ Similarity scores range: 0.15-0.4 (wider but still meaningful)
- ✅ User-tested and confirmed working ("new school" now returns results)

**Key Learning:**
- CLIP is trained on general internet data, not tattoo-specific corpus
- Adding domain context ("tattoo") improves semantic understanding
- Lower thresholds (0.15) acceptable when results are ranked by similarity
- Balance between precision (high threshold) and recall (low threshold)

### Featured Artist System (Dec 30, 2025)
**Status:** ✅ Complete

**Feature Overview:**
- Artists with high Instagram engagement (posts with >10,000 likes) receive "Featured" badge
- Highlights high-performing artists for users across all interfaces
- Fully automated based on existing likes_count data from Instagram scrapes

**Implementation:**
1. **Database Migration** (`20251230_003_add_likes_to_search_function.sql`):
   - Updated `search_artists_by_embedding()` RPC function to return `max_likes` field
   - Aggregates highest like count across all portfolio images per artist
   - No new database columns needed - uses existing `portfolio_images.likes_count`

2. **Helper Utilities** (`lib/utils/featured.ts`):
   - `isArtistFeatured()` - Checks if any portfolio image has ≥10,000 likes
   - `getMaxLikes()` - Returns highest like count from portfolio
   - `FEATURED_LIKES_THRESHOLD` constant (10,000)

3. **Type Definitions Updated**:
   - `SearchResult` interface: Added `max_likes?: number`
   - `MatchingImage` interface: Added `likes_count?: number | null`
   - `FeaturedArtist` interface: Added `likes_count` to portfolio images

4. **UI Components Enhanced**:
   - **ArtistCard** (search results): Featured badge in top-left corner with accent background
   - **ArtistPreviewCard** (city browse): Featured badge overlay on portfolio grid
   - **ArtistInfoColumn** (profile pages): Featured badge below artist name
   - Consistent design: Accent color, uppercase "FEATURED" text, tracking spacing

5. **Query Updates**:
   - `getCityArtists()` - Now includes `likes_count` in portfolio images
   - Search page mapping updated to include `max_likes` from RPC results

**Current Status:**
- **1 featured artist** out of 188 Austin artists (0.5%)
  - **Austin** (@michaelvillalobostattoo) - 23,011 likes
- Badge displays automatically across all interfaces
- Zero manual curation required

**Files Modified:**
- `supabase/migrations/20251230_003_add_likes_to_search_function.sql` (new)
- `lib/utils/featured.ts` (new)
- `lib/supabase/queries.ts`
- `app/search/page.tsx`
- `components/search/ArtistCard.tsx`
- `components/home/ArtistPreviewCard.tsx`
- `components/artist/ArtistInfoColumn.tsx`
- `app/artist/[slug]/page.tsx`
- `types/search.ts`
- `lib/mock/featured-data.ts`
- `scripts/check-featured-artists.ts` (new - verification script)

**Benefits:**
- Quick-and-dirty MVP feature (minimal implementation)
- Leverages existing data (no additional API calls)
- Scalable threshold (can adjust 10k limit as dataset grows)
- Future-ready for manual curation via `portfolio_images.featured` boolean

**Next Steps (Future Enhancement):**
- Consider lowering threshold to 5k or 7.5k to feature more artists
- Add manual override via `portfolio_images.featured` field
- Track click-through rates on featured artists

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

**Testing Complete (Dec 29, 2025):**
1. ✅ Got Apify API token
2. ✅ Added to `.env.local`
3. ✅ Tested with 2 artists - **SUCCESSFUL**
   - Downloaded 22 actual JPEG images
   - Fixed Apify integration (latestPosts array)
   - Fixed environment loading (dotenv)
   - Fixed database status values
   - All uploads and processing successful
4. ⚠️  **Issue Discovered**: Not all images are tattoo work
   - Mix of portfolio, personal photos, promotional content
   - Need filtering strategy before full production run

**Architecture Decision Made (Dec 29, 2025):**
✅ **Selected: GPT-5-nano vision classification for image filtering**
- Cost: ~$0.01-0.02 for 2,500 images (essentially free)
- Accuracy: ~95-98% expected
- Implementation: Filter during download phase
- Full decision doc: `/memory-bank/architecture/decision-image-filtering.md`

**Filtering Rationale:**
- Manual curation: $70-140 (human time) - rejected
- Caption filtering: $0 but only ~60% accuracy - rejected
- Accept mixed content: $0 but poor UX - rejected
- CLIP classification: ~$0.60 (doubles GPU cost) - rejected
- GPT-5-nano: **$0.01** + 95%+ accuracy - **SELECTED** ✅

**Production Run Complete (Dec 29, 2025):**

**Final Results:**
- ✅ **188 artists scraped** (16 bad handles deleted from 204 original)
- ✅ **1,692 raw images** downloaded from Instagram
- ✅ **1,282 tattoo images** kept after GPT-5-nano classification (75.8% pass rate)
- ✅ **1,106 images uploaded** to Supabase Storage (100 concurrent uploads)
- ✅ **Total pipeline time:** ~90 minutes (scraping + classification + upload)

**Database Cleanup:**
- Deleted 16 failed artist records with invalid Instagram handles:
  - Invalid formats: `@gmail.com`, `@nathanhebert.com`, `@goldengoattattoo.` (trailing period)
  - Generic/reserved: `@widget`, `@wsb`, `@sqs`, `@n05`, `@popular`
  - Private/empty accounts: Various artists with no posts
- Final Austin database: 188 verified artists with portfolio images

**Performance Optimizations:**
1. **Parallel Scraping:** 8 concurrent Apify calls (balanced for rate limits, avoiding memory errors)
2. **Batch Classification:** All 1,692 images classified in single GPT-5-nano Flex tier batch (~2-3 min)
3. **Parallel Uploads:** Upgraded from 20 → 100 concurrent uploads (leveraging 1 Gbps bandwidth)
   - Upload time: ~2-3 minutes (vs 20-30 min sequential)
   - Memory efficient: ~50-200MB for 100 concurrent buffers

**Scripts Enhanced:**
- `apify-scraper.py`: Added CONCURRENT_APIFY_CALLS parameter (originally 20, tuned to 8)
- `batch-classify.py`: GPT-5-nano Flex tier with async parallel processing (5,000 batch size)
- `process-and-upload.ts`: Upgraded to 100 concurrent uploads with Promise.all batching

**Cost Breakdown:**
- Apify scraping: ~$15-25 (188 artists × 50 posts each)
- GPT-5-nano classification: ~$0.65 (1,692 images × $0.000155 Flex tier)
- Supabase Storage: $0 (within 100GB free tier)
- **Total Phase 3 cost:** ~$16-26

**Ready for Phase 4:**
- 1,106 clean tattoo images ready for CLIP embedding generation
- Database optimized with partial index on `portfolio_images.status`
- Modal.com infrastructure tested and ready
- Expected Phase 4 cost: ~$0.30-0.60 for GPU processing

**Next Steps:**
1. Generate CLIP embeddings: `python3 -m modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch --batch-size 100`
2. Create vector index: `npx tsx scripts/embeddings/create-vector-index.ts`
3. Test search performance: `npx tsx scripts/embeddings/test-search.ts`
4. Proceed to Phase 5 (Search UI already complete)

### Phase 4: Embedding Generation Infrastructure (✅ TESTED & WORKING - Dec 29, 2025)
**Status**: Fully tested on Modal.com GPU, embeddings generating correctly, ready for production

**Completed:**
- ✅ Modal.com Python script with OpenCLIP ViT-L-14 (768-dim embeddings)
- ✅ Batch processing script (100 images/batch, resumable from offset)
- ✅ Text embedding generation for search queries
- ✅ Helper scripts: check-embeddings.ts, create-vector-index.ts, test-search.ts
- ✅ Automatic index type selection (HNSW <1k images, IVFFlat 1k-100k+)
- ✅ Modal CLI installed locally
- ✅ **All security fixes applied** (5 Critical, 2 Warnings)
- ✅ **Build verification passed** (TypeScript compilation succeeds)
- ✅ **GPU test successful** - A10G working, embeddings generated
- ✅ **Supabase integration verified** - Client connection working

**Testing Results (Dec 29, 2025):**
- ✅ Modal authentication complete (`modal setup`)
- ✅ Supabase secrets created in Modal dashboard
- ✅ Test embedding generated successfully
- ✅ GPU confirmed working (CUDA device detected)
- ✅ 768-dimensional embeddings with L2 norm = 1.0 (properly normalized)
- ✅ Modal container builds in ~85 seconds (cached after first build)
- ✅ Test output: `[-0.0183, 0.1240, -0.0037, 0.0206, 0.0302, ...]`

**Fixes Applied During Setup:**
1. ✅ **Secret name** - Changed from "supabase-secret" to "supabase" (matches Modal UI convention)
2. ✅ **NumPy version** - Pinned to <2 for torch 2.1.2 compatibility (prevents module errors)
3. ✅ **Supabase library** - Upgraded from 2.3.4 to 2.15.0 (fixes httpx proxy TypeError)

**Architecture:**
- Model: OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - industry-proven multimodal
- GPU: A10G serverless (pay-per-second, ~$0.60/hour)
- Dimensions: 768 (L2 normalized for cosine similarity)
- Batch processing: 100 images/batch, auto-retry failed images
- Error handling: Failed images marked in DB, detailed error logs

**Ready for Production:**
1. Complete Phase 3 (Instagram scraping with GPT-5-nano filtering)
2. Run batch embeddings: `python3 -m modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch --batch-size 100`
3. Create vector index: `npx tsx scripts/embeddings/create-vector-index.ts`
4. Test search: `npx tsx scripts/embeddings/test-search.ts` (target <500ms)

**Cost Estimate:**
- Model download: Free (cached in container, 1.5GB)
- Processing time: ~5-10 min per 6,000 images
- GPU cost: ~$0.05-0.10 per city
- Total for 2 cities: ~$0.30-0.60 (one-time)

**Security Hardening Complete (Dec 29, 2025 - Code Review Round 2):**
1. ✅ **SSRF Protection** - URL validation, DNS resolution, private IP blocking, size limits
2. ✅ **Credential Validation** - Environment variable validation, no exposure in error messages
3. ✅ **SQL Injection Prevention** - Parameter validation before string interpolation in index creation
4. ✅ **Transaction Safety** - Batch processing collects results before DB updates (atomic per record)
5. ✅ **Type Safety** - Removed unsafe 'as any' casts, proper RPC type handling ('as unknown as Type')
6. ✅ **Performance Index** - Added `idx_portfolio_images_status_pending` for batch queries (partial index)
7. ✅ **Environment Loading** - All TypeScript scripts load dotenv properly

**Files Created:**
- `scripts/embeddings/modal_clip_embeddings.py` - Main Modal.com script (security hardened)
- `scripts/embeddings/check-embeddings.ts` - Progress verification (type-safe)
- `scripts/embeddings/create-vector-index.ts` - Index automation (SQL injection protected)
- `scripts/embeddings/test-search.ts` - Search performance testing (type-safe RPC calls)
- `supabase/migrations/20251229_012_add_status_index.sql` - Performance optimization

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
16. **NumPy version pinning:** Pin to <2 for torch 2.1.2 compatibility (prevents "module compiled with NumPy 1.x" errors)
17. **Supabase library upgrade:** Use 2.15.0+ to fix httpx proxy parameter incompatibility in Modal containers
18. **GPT-5-nano image filtering:** $0.01 per 2,500 images with 95%+ accuracy beats manual curation ($70-140) and caption filtering (60% accuracy)
19. **Parallelization strategies:** Different optimal concurrency for different operations:
    - Apify scraping: 8 concurrent (limited by API rate limits, memory constraints)
    - GPT-5-nano classification: Single batch of 1,692 images (Flex tier handles parallelization)
    - Supabase uploads: 100 concurrent (limited only by bandwidth, not memory)
20. **Database cleanup during production:** Delete bad data immediately rather than accumulating failed records (deleted 16 invalid handles)
21. **Batch processing over inline filtering:** Download → Batch classify → Filter saves time vs inline classification (2-3 min vs 90+ min)
22. **Tattoodo as authoritative source:** Professional style guide provides better-curated seed images than manual selection (10 styles, 57 images)
23. **Style seeds for SEO:** Seed embeddings enable auto-generated style landing pages without manual artist tagging
24. **Modal container warmup optimization:** Pre-warm on page load + 10-min scaledown window reduces search latency from 25s → 2-5s while saving $205/month vs 24/7 warming
25. **Security-first warmup:** SSRF prevention (domain whitelist, HTTPS) + rate limiting (1/min per IP) prevents cost abuse
### Phase 7 Prep: Style Seeds from Tattoodo (December 30, 2025)
**Status**: ✅ Complete (~1 hour)

#### Completed
- ✅ **Style Seeds Pipeline:**
  - Downloaded 57 seed images from Tattoodo article (10 styles, 5-6 images each)
  - Uploaded all images to Supabase Storage (`portfolio-images/style-seeds/`)
  - Generated 57 CLIP embeddings via Modal.com (ViT-L-14, 768-dim vectors)
  - Inserted 10 representative style seeds into `style_seeds` table
  - 100% success rate - All embeddings generated without errors

- ✅ **10 Tattoo Styles Seeded:**
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

- ✅ **Tools & Scripts Created:**
  - `scripts/style-seeds/style-seeds-data.ts` - Style definitions with Tattoodo URLs
  - `scripts/style-seeds/download-and-upload-seeds.ts` - Download & upload pipeline
  - `scripts/style-seeds/generate-seed-embeddings.ts` - Prepare images for GPU processing
  - `scripts/style-seeds/generate-seed-embeddings-simple.py` - Modal.com GPU batch processing
  - `scripts/style-seeds/populate-style-seeds.ts` - Database insertion with deduplication
  - `scripts/style-seeds/verify-seeds.ts` - Verification and testing utility

- ✅ **NPM Scripts Added:**
  ```bash
  npm run seeds:download              # Download & upload images from Tattoodo
  npm run seeds:prepare-embeddings    # Prepare images for GPU processing
  npm run seeds:generate-embeddings   # Generate CLIP embeddings (Modal.com)
  npm run seeds:populate              # Insert into database
  npm run seeds:all                   # Run complete pipeline
  ```

#### Key Technical Decisions
- **Source:** Tattoodo article as authoritative style guide (professional curation)
- **Representative Selection:** First seed image per style (typically most iconic)
- **Embedding Strategy:** Same CLIP model as portfolio images for consistency
- **Storage Path:** `style-seeds/{style-name}-{number}.jpg` for organization
- **Database Strategy:** Upsert-safe with unique constraint on `style_name`

#### Metrics
- **Total Seed Images:** 57 images
- **Styles Covered:** 10 major tattoo styles
- **Embedding Success Rate:** 100% (57/57)
- **Storage Used:** ~12MB (seed images)
- **Processing Time:** ~2 minutes (Modal.com GPU)
- **Total Cost:** ~$0.05 (Modal.com compute)

#### Next Steps for Phase 7
1. Create style landing pages (e.g., `/texas/austin/traditional`)
2. Build style browse UI component for homepage
3. Implement style-based artist search using seed embeddings
4. Add style filters to search results
5. Generate SEO metadata for style pages
6. Internal linking between city, state, and style pages

#### Source
- **Article:** https://www.tattoodo.com/articles/a-beginners-guide-popular-tattoo-styles-briefly-explained-6969
- **Date Accessed:** December 30, 2025
- **Images Used:** Representative examples for each style (fair use for search indexing)

### Atlanta + Los Angeles Discovery & Scraping (December 31, 2025)
**Status**: ✅ Complete (~4 hours total - discovery + scraping)

#### Completed
- ✅ **Artist Discovery:**
  - **Atlanta:** 193 artists discovered (66 Tavily queries)
  - **Los Angeles:** 193 artists discovered (66 Tavily queries)
  - **Total:** 386 new artists across 2 cities
  - **Query Approach:** Reused proven Austin query generator
    - 5 general + 27 styles + 8 Atlanta neighborhoods + 10 LA neighborhoods
    - 5 experience + 2 demographic + 20 niche specialties
  - **Cost:** ~$6-8 estimated (Tavily queries, query caching prevented duplicates)

- ✅ **Instagram Scraping:**
  - **Total Attempted:** 386 artists (193 Atlanta + 193 LA)
  - **Successfully Scraped:** 357 artists (92.5% success rate)
    - Atlanta: 171/193 (88.6%) - 1,376 images
    - Los Angeles: 186/193 (96.4%) - 1,574 images
  - **Failed:** 29 artists (7.5% - private accounts, rate limits, invalid handles)
  - **Total Images Downloaded:** 2,950 images to `/tmp/instagram`
  - **Processing Time:** ~2.5 hours with 8 parallel Apify calls
  - **Cost:** ~$30-40 estimated (Apify usage)

- ✅ **Database State After Scraping:**
  - **Austin:** 188 artists with 1,257 images (embeddings complete)
  - **Atlanta:** 171 artists with 1,376 images (awaiting classification)
  - **Los Angeles:** 186 artists with 1,574 images (awaiting classification)
  - **Total Platform:** 545 artists across 3 cities (Austin + Atlanta + LA)

#### Key Performance Metrics
- **Parallelization:** 8 concurrent Apify calls (optimal for rate limits + memory)
- **Throughput:** ~2 artists/minute average
- **Bottleneck:** Apify actor startup (30-60s per artist) + Instagram scraping latency
- **Resume Functionality:** ✅ Working perfectly (skips completed jobs via `scraping_jobs` table)
- **Success Rate:** 92.5% (357/386) - within expected range for Instagram scraping

#### Architecture Fixes
1. **Parallelization by Default:**
   - Fixed sequential execution bug in `tavily-artist-discovery-v2.ts`
   - Now batches queries in groups of 50 (Promise.all)
   - Cities process in parallel (Promise.all)
   - Batch size: 50 queries/batch (Tavily supports 1000 RPM)

2. **Resume Capability:**
   - `scraping_jobs` table tracks `status='completed'`
   - Query filters: `WHERE a.id NOT IN (SELECT artist_id FROM scraping_jobs WHERE status = 'completed')`
   - Can restart script after crash without duplicate work

3. **Status Tracking:**
   - Database-backed job tracking prevents duplicate scraping
   - Transaction safety with thread-safe db_lock
   - Automatic retry on network failures

#### Files Modified
- `scripts/discovery/tavily-artist-discovery-v2.ts` - Changed CITIES array to Atlanta + LA
- `scripts/discovery/query-generator.ts` - Added Atlanta (8) and LA (10) neighborhoods
- `lib/constants/cities.ts` - Added Atlanta city + Georgia state configuration

#### Next Steps (In Progress)
1. ✅ Discovery complete (386 artists)
2. ✅ Instagram scraping complete (2,950 images in `/tmp/instagram`)
3. **NEXT:** Batch classify 2,950 images with GPT-5-nano
   - Script: `scripts/scraping/batch-classify.py`
   - Expected pass rate: 60-70% (1,800-2,100 tattoo images)
   - Expected cost: ~$0.46 (~$0.000155 per image with Flex tier)
4. **NEXT:** Process and upload filtered images to Supabase Storage
   - Script: `npm run process-images`
   - 100 concurrent uploads, ~2-3 minutes
5. **NEXT:** Generate CLIP embeddings for new portfolio images
   - Script: Modal.com batch processing (50 images/batch)
   - Expected: ~4-6 runs to complete all images
6. **NEXT:** Update IVFFlat vector index
   - New optimal lists parameter: sqrt(3,057) ≈ 55
   - Current index uses lists=35 (optimized for 1,257 images)

### Phase 7: Style Landing Pages & SEO (December 31, 2025)
**Status**: ✅ Complete (~2 hours)

#### Completed
- ✅ **30 Style Landing Pages Created:**
  - Dynamic route: `/[state]/[city]/[style]/page.tsx`
  - 10 tattoo styles × 3 cities (Austin, Atlanta, Los Angeles)
  - Examples: `/texas/austin/traditional`, `/california/los-angeles/realism`
  - All pages SEO-optimized with JSON-LD, Open Graph, sitemap

- ✅ **Database Query Functions (2 new):**
  - `getStyleSeedBySlug(styleSlug)` - Fetch style seed with embedding
  - `getArtistsByStyle(styleSlug, city, limit, offset)` - Vector similarity search using seed

- ✅ **Page Features Implemented:**
  - Hero section with style description + seed image example
  - Breadcrumb navigation (Home > State > City > Style)
  - Artist grid showing visually similar work
  - Internal links to other styles in same city
  - "All [City] Artists" link back to city browse page
  - Empty state for cities without style matches

- ✅ **SEO Optimization:**
  - Target keywords: `[style] tattoo [city]` (e.g., "traditional tattoo austin")
  - Meta title: `{Style} Tattoo Artists in {City}, {State} | Inkdex`
  - Meta description: Style description + discovery message
  - JSON-LD breadcrumbs for search engines
  - Canonical URLs on all pages
  - Sitemap priority 0.9 (high SEO value, same as city pages)

- ✅ **Internal Linking Strategy:**
  - City pages now have "Browse by Style" section at bottom
  - Links to all 10 style pages for each city
  - Each style page links back to city page
  - Each style page links to other styles in same city
  - Creates strong internal linking mesh for SEO authority

#### Technical Implementation

**How It Works (No Manual Tagging!):**
1. Each style has seed images with CLIP embeddings in `style_seeds` table
2. When user visits `/texas/austin/traditional`:
   - Fetch "traditional" style seed embedding from database
   - Run vector similarity search (threshold 0.15, same as regular search)
   - Display artists whose portfolio images match the traditional style
3. Artists appear based on actual visual similarity, not manual tags
4. Auto-updates as we add artists (ISR with 24h revalidation)

**Architecture Decisions:**
- Uses `styleSeedsData` from TypeScript file for `generateStaticParams()` (can't use async DB queries)
- Runtime queries use database `style_seeds` table for embeddings
- Server Components with ISR (Incremental Static Regeneration)
- "INK & ETHER" dark editorial design system (from Phase 5)
- Vector similarity threshold 0.15 (same as regular search)

**Files Created/Modified:**
1. **New:** `app/[state]/[city]/[style]/page.tsx` (273 lines)
2. **Modified:** `lib/supabase/queries.ts` (added 2 functions, 115 lines)
3. **Modified:** `app/[state]/[city]/page.tsx` (added "Browse by Style" section)
4. **Modified:** `app/sitemap.ts` (added style pages to sitemap)

#### Build Metrics
- **Total Pages:** 617 static pages generated successfully
  - 1 homepage
  - 3 state pages (Texas, California, Georgia)
  - 3 city pages (Austin, LA, Atlanta)
  - **30 style landing pages** (10 styles × 3 cities) ← NEW
  - 188 artist pages
  - 392 additional routes (search, API, etc.)
- **Build Time:** ~8 minutes (includes all style pages)
- **Bundle Size:** Within target (<200 KB)
- **TypeScript Errors:** 0
- **Static Generation:** All pages pre-rendered successfully

#### SEO Page Structure
```
/texas/austin/traditional          → Traditional Tattoo Artists in Austin, TX
/texas/austin/realism              → Realism Tattoo Artists in Austin, TX
/texas/austin/watercolor           → Watercolor Tattoo Artists in Austin, TX
... (7 more styles for Austin)

/california/los-angeles/traditional → Traditional Tattoo Artists in Los Angeles, CA
/california/los-angeles/realism     → Realism Tattoo Artists in Los Angeles, CA
... (8 more styles for LA)

/georgia/atlanta/traditional       → Traditional Tattoo Artists in Atlanta, GA
/georgia/atlanta/realism           → Realism Tattoo Artists in Atlanta, GA
... (8 more styles for Atlanta)
```

#### 10 Styles Implemented
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

#### SEO Advantage
- **Competitors:** Manually tag artists (10+ tags each, labor-intensive, subjective)
- **Inkdex:** Auto-generate from CLIP embeddings (objective visual similarity)
- **Result:** More relevant results = better engagement = better rankings
- **Maintenance:** Zero ongoing work (auto-updates with ISR)

#### Known Limitations
- Currently only works for Austin (has embeddings)
- Atlanta/LA style pages show empty state until Phase 4 complete for those cities
- Will auto-populate once embeddings are generated (ISR revalidation)

#### Performance
- Build time impact: +30 pages adds ~30 seconds to build
- All pages pre-rendered at build time (instant page loads)
- Vector search query efficiently cached per city/style combo
- ISR revalidation every 24 hours keeps data fresh

#### Next Steps
1. Wait for Atlanta + LA embeddings to complete (Phase 4)
2. Style pages will auto-populate with artists from those cities
3. Consider adding style filter to main search UI (Phase 8)
4. Create custom OG images for each style (use seed image + city name)
5. Add FAQ sections to style pages ("What is [style] tattoo?")
