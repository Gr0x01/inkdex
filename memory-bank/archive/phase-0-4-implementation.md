---
Last-Updated: 2026-01-01
Maintainer: RB
Status: Archived - Historical Reference
---

# Phase 0-4 Implementation History (Dec 29-31, 2025)

This document archives the detailed implementation history for Phases 0-4 of the Inkdex project. This content has been moved from `progress.md` to keep living documentation lean.

## Phase 0: Market Analysis (Dec 29, 2025)

### Completed
- Created CLAUDE.md with AI assistant rules and subagent workflow
- Set up memory bank directory structure (core, development, architecture, projects)
- Created comprehensive implementation plan (tattoo-discovery-implementation-plan.md)
- **Market Analysis:**
  - Built DataForSEO integration script for keyword research
  - Analyzed 8 candidate cities (LA, NYC, Austin, Miami, Portland, Chicago, Seattle, Denver)
  - All cities scored HIGH (74-81/100 opportunity scores)
  - Selected **Austin, TX + Los Angeles, CA** as launch cities
  - Identified inkzup.com as main competitor (booking platform, not discovery)
  - Found visual search opportunity gap (low competition on "inspiration" queries)
- **Architecture Decision:** Multi-modal search approach
  - Image upload (primary)
  - Natural language text search (secondary) using CLIP's text encoder
  - Visual style picker (optional)
  - Hybrid search (post-MVP)
  - Key insight: Users don't know taxonomy, speak in "vibes" → we translate
- **SEO Strategy:** Hybrid categorization approach
  - No manual artist tags for search (pure embeddings)
  - Auto-generated style landing pages using seed image embeddings
  - 10 initial style seeds (fine line, traditional, geometric, etc.)
  - 20+ SEO pages per city (style pages + city pages)
  - Internal linking structure designed for SEO authority

### Key Findings
- **Market Demand:** 254k-269k monthly searches per city (massive demand)
- **Competition:** 46-67% competition, but 0/100 keyword difficulty (easy to rank)
- **Growth:** 9-16 keywords trending up per city (growing markets)
- **Opportunity:** No strong visual search platform exists → our differentiator
- **Technical:** CLIP is multimodal → text and image search use same vector space

---

## Phase 1: Infrastructure Setup (Dec 29, 2025)

### Database & Backend (Production-Ready)
- Supabase project created (ID: aerereukzoflvybygolb)
- pgvector extension enabled
- Complete database schema (7 tables):
  - `users` - Future auth (RLS enabled)
  - `artists` - Artist profiles with claiming fields (RLS enabled)
  - `portfolio_images` - Instagram images with 768-dim embeddings (RLS enabled)
  - `searches` - Search session storage (RLS enabled)
  - `saved_artists` - User bookmarks (RLS enabled)
  - `scraping_jobs` - Track scraping progress
  - `style_seeds` - SEO landing page seed images
- **Complete RLS policies** (15 policies across 5 tables)
  - Public read access + service role writes for artists/portfolio_images
  - User-scoped access for saved_artists/searches
- **Database validation constraints**
  - Email format, URL format, status enums
  - Non-negative counts (followers, likes, images)
- **NOT NULL constraints** (prevents orphaned records)
- **Automatic updated_at triggers** (3 tables)
- Optimized `search_artists_by_embedding()` function with CTE performance
- **Deferred IVFFlat index** (to be created after data load with optimal parameters)
- **8 migration files** in `supabase/migrations/` (version controlled)

### Next.js Application (Production-Ready)
- Next.js 16.1.1 project with App Router + Turbopack (default bundler)
- TypeScript strict mode + Tailwind CSS configured
- **Generated TypeScript types** from Supabase schema (`types/database.types.ts`)
- Supabase client libraries (@supabase/ssr) with **validated environment variables**
- **Optimized middleware** (skips auth on 95% of routes for performance)
- Query utilities for vector search
- Build succeeds with zero errors ✓

### Security Hardening (Code Review Fixes)

**🔴 Critical Issues (All Fixed):**
1. Missing RLS on public tables (artists, portfolio_images) - Added policies
2. Missing database validation constraints - Added email, URL, status, non-negative validations
3. No TypeScript database types - Generated complete types
4. Missing NOT NULL constraints - Added to prevent orphaned records

**⚠️ Warnings (All Fixed):**
1. Premature IVFFlat index - Removed, added guide for post-data-load creation
2. Vector search performance - Rewrote with CTE and early city filtering
3. Middleware overhead - Skip auth on 95% of public routes
4. Missing updated_at automation - Added triggers
5. Environment variable validation - Zod schema with clear errors

---

## Phase 2: Artist Discovery (Dec 29-31, 2025)

### Discovery Approach Evolution
- Initial test: Tavily vs Google Places vs shop scraping
- **Key Finding:** Solo practitioners dominate Austin market (validated hypothesis)
- **Decision:** Instagram-first Tavily approach + shop scraping supplement
- **Architecture:** Query caching prevents duplicate API calls & tracks costs

### Austin Discovery (✅ COMPLETE: 204 artists)

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

### Atlanta Discovery (✅ COMPLETE: 193 artists - Dec 31, 2025)
- 66 Tavily queries (same proven query set as Austin)
- 8 Atlanta neighborhoods (Midtown, Virginia-Highland, Little Five Points, etc.)
- Cost: ~$3.30 estimated

### Los Angeles Discovery (✅ COMPLETE: 193 artists - Dec 31, 2025)
- 66 Tavily queries (same proven query set as Austin)
- 10 LA neighborhoods (Arts District, Venice, Silver Lake, etc.)
- Cost: ~$3.30 estimated

### Tools & Scripts Built
1. `tavily-artist-discovery-v2.ts` - Multi-query Instagram discovery with caching
2. `query-generator.ts` - Generates 66 diverse queries
3. `google-places-discovery.ts` - Finds tattoo shops via Google Places API
4. `shop-website-scraper.ts` - Puppeteer-based roster scraping
5. `cleanup-false-positives.ts` - Filters technical terms from scraped handles (54 removed)
6. `check-results.ts` - Quick database stats utility

---

## Phase 3: Instagram Scraping & Image Processing (Dec 29-31, 2025)

### Austin Production Run (✅ COMPLETE - Dec 29, 2025)
- **188 artists scraped** (16 bad handles deleted from 204 original)
- **1,692 raw images** downloaded from Instagram
- **1,282 tattoo images** kept after GPT-5-nano classification (75.8% pass rate)
- **1,106 images uploaded** to Supabase Storage (100 concurrent uploads)
- **Total pipeline time:** ~90 minutes (scraping + classification + upload)

### Atlanta + LA Scraping (✅ COMPLETE - Dec 31, 2025)
- **Total Attempted:** 386 artists (193 Atlanta + 193 LA)
- **Successfully Scraped:** 357 artists (92.5% success rate)
  - Atlanta: 171/193 (88.6%) - 1,376 images
  - Los Angeles: 186/193 (96.4%) - 1,574 images
- **Failed:** 29 artists (7.5% - private accounts, rate limits, invalid handles)
- **Total Images Downloaded:** 2,950 images to `/tmp/instagram`
- **Processing Time:** ~2.5 hours with 8 parallel Apify calls

### GPT-5-nano Classification (Atlanta + LA - Dec 31, 2025)
- **Total Images Classified:** 2,950
- **Tattoo Images Kept:** 2,378 (80.6% pass rate - better than Austin's 75.8%)
- **Non-Tattoo Deleted:** 572 (19.4%)
- **Processing Time:** ~15 minutes (6 batches of 500 images)
- **Cost:** ~$0.92 (Standard tier, 500 images/batch)

### Image Processing & Upload (Atlanta + LA - Dec 31, 2025)
- **Total Images Processed:** 2,376 (from 2,378 classified)
- **All 386 Artists:** 100% processed
- **Processing Errors:** 31 minor errors (upload/processing failures)
- **Thumbnails Generated:** 3 sizes per image (320w, 640w, 1280w WebP)
- **Upload Method:** 100 concurrent uploads to Supabase Storage
- **Processing Time:** ~8-10 minutes

### Major Decisions
1. **Switched from Instaloader to Apify:**
   - Speed: 30-60 minutes vs 3-5 hours (10x faster)
   - Reliability: Managed IPs, automatic retries, rate limit handling
   - Cost: $20-40 for 204 artists (worth it for reliability)
2. **Supabase Storage over Cloudflare R2:**
   - Simpler integration (already using Supabase)
   - Pro tier: 100GB storage + 200GB bandwidth
3. **GPT-5-nano image filtering:**
   - $0.01 per 2,500 images with 95%+ accuracy
   - Better than manual curation ($70-140) or caption filtering (60% accuracy)

### Performance Optimizations
- **Parallel Scraping:** 8 concurrent Apify calls (balanced for rate limits)
- **Batch Classification:** All images classified in GPT-5-nano batches
- **Parallel Uploads:** 100 concurrent uploads (leveraging 1 Gbps bandwidth)

### Security Fixes Applied (9 total)
1. Path traversal prevention (UUID/shortcode validation)
2. Input validation (Instagram handles, artist IDs)
3. Storage rollback on DB failures (prevents orphaned files)
4. Database unique constraint (prevents race conditions)
5. Upload retry logic (3 attempts, linear backoff)
6. File cleanup on all paths (prevents disk exhaustion)
7. Environment variable validation (clear error messages)
8. Connection leak fix (Python finally block)
9. Apify timeout (5 minutes per artist)

---

## Phase 4: CLIP Embedding Generation & Vector Index (Dec 30, 2025)

### Austin Embeddings (✅ COMPLETE - Dec 30, 2025)
- **Total Images:** 1,257/1,257 (100% success rate)
- **Model:** OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - 768 dimensions
- **GPU:** Modal.com A10G (~$0.60/hour, billed per second)
- **Processing Time:** ~2-3 hours total
- **Cost:** ~$1.50-2.00 for full run
- **Status Workflow:** `pending` → `active` after embedding generated

### Vector Index Creation (Dec 30, 2025)
- **Index Type:** IVFFlat with lists=35 (sqrt(1,257))
- **Build Time:** ~10 seconds
- **Search Performance:** 190ms average (5x faster than sequential scan)
- **Distance Metric:** `vector_cosine_ops` (cosine similarity)

### Key Learnings

**1. Modal timeout architecture is complex:**
- Container lifetime timeout (7200s) ≠ remote method timeout (300s)
- Remote method timeout is HARD LIMIT, cannot be overridden
- Cumulative timeout: Multiple `.remote()` calls accumulate
- Solution: Process in smaller chunks (2 batches × 50 images = ~200-250s)

**2. Optimal batch sizing:**
- GPU can handle 100+ images easily
- Network I/O: ~30-60s per 50 images
- CLIP inference: ~60-90s per 50 images
- Database writes: ~10-20s per 50 images
- Total: ~2-3 min per 50-image batch (safe margin under 5-min timeout)

**3. Resume capability is critical:**
- Query `WHERE embedding IS NULL AND status='pending'`
- Can Ctrl+C and restart without losing progress
- Processed 1,257 images across ~26 runs without issues

**4. Status workflow prevents incomplete data:**
- Upload with `status='pending'` (not searchable yet)
- Generate embedding → set `status='active'` (now searchable)
- Supports incremental updates (only new images need embeddings)

**5. Infrastructure code requires iteration:**
- Initial: Wrong column name (`image_url` vs `storage_original_path`)
- Second: Wrong bucket name (`portfolio` vs `portfolio-images`)
- Third: Hit timeout with 100 images per batch
- Fourth: Success with 50 images, 2 batches per run

### End-to-End Search Performance

The complete user search flow stages:

1. **Image upload to API:** ~500ms (network transfer)
2. **Modal.com CLIP embedding generation:** ~2-5s ⚠️ PRIMARY BOTTLENECK
   - Serverless GPU cold start overhead
   - Warm containers: ~1-2 seconds
   - Cold containers: ~3-5 seconds
3. **Store embedding in Supabase:** ~100ms
4. **Vector similarity search (IVFFlat):** ~190ms ✓ OPTIMIZED
5. **Return results to client:** ~200ms

**Total End-to-End Latency:** ~3-6 seconds (warm: ~2-3s, cold: ~4-6s)

**What the Vector Index Fixed:**
- Database search: 500-1000ms → 190ms (5x speedup)

**What's Still Slow (Expected):**
- Modal.com GPU inference: 2-5 seconds (serverless cold start)
- Trade-off: Pay-per-query (slow start) vs always-on ($15-30/month for instant response)

---

## Lessons Learned Summary

### Market Analysis
1. DataForSEO delivers - all 8 cities showed strong opportunity (74-81/100)
2. Visual search gap is real - validates our CLIP approach
3. No dominant player - inkzup focuses on booking, not discovery
4. Austin over NYC - lower competition (46% vs 67%) + growth trajectory
5. LA is massive - 261k searches/month + highest artist density

### Infrastructure & Security
1. Code reviews find critical gaps - RLS was incomplete initially
2. Defense in depth works - DB constraints + TypeScript + RLS catch different errors
3. Premature optimization hurts - creating IVFFlat on empty table wastes resources
4. Environment validation saves time - Zod catches missing env vars early
5. Performance matters for SEO - skipping auth on public routes reduces latency
6. Migration files = documentation - version-controlled SQL is reproducible
7. Generated types prevent bugs - Supabase types catch column name typos
8. Automatic triggers reduce errors - updated_at eliminates manual management

### Instagram Scraping
1. **Parallelization is not one-size-fits-all:**
   - Apify: 20 concurrent hit memory limits → tuned to 8
   - GPT-5-nano: Best as single large batch with Flex tier
   - Supabase uploads: 100 concurrent worked perfectly
2. **Batch processing wins:**
   - Download all → Batch classify → Upload filtered
   - 90+ minutes → 2-3 minutes (30x faster)
3. **Database cleanup is hygiene:**
   - Bad data accumulates during discovery
   - Delete immediately rather than carry forward
   - 16 artists deleted (8% of original 204)
4. **User bandwidth matters:**
   - 1 Gbps enabled 100 concurrent uploads
   - With slower connection, need to tune concurrency
5. **API rate limits vary:**
   - Apify: 8GB memory limit at 20 concurrent
   - Supabase Storage: No apparent limit up to 100
   - GPT-5-nano Flex: 30k RPM works fine

### CLIP Embeddings
1. Modal timeout architecture requires understanding both container (7200s) and method (300s) limits
2. Optimal batch sizing balances GPU, network, and DB constraints
3. Resume capability enables fault tolerance for long-running jobs
4. Status workflow (`pending` → `active`) prevents incomplete data in search
5. Infrastructure code requires iteration and testing
6. Modal.com is cost-effective but has learning curve
7. IVFFlat is optimal for 1k-10k dataset size
8. Index dramatically improves performance (5x faster)
9. Understanding full performance picture: DB is fast, Modal GPU is bottleneck

---

**Archived:** 2026-01-01
**Original Location:** `memory-bank/development/progress.md`
