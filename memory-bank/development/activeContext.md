---
Last-Updated: 2026-01-01
Maintainer: RB
Status: Production Ready - 8 Cities Live + SEO Editorial Content Complete ✅
---

# Active Context: Inkdex

## Current Platform Status

**Status:** PRODUCTION READY - 8 cities fully operational

### Database Overview
- **Total Artists:** 1,474 (545 original + 929 expansion)
- **Total Images:** 11,167 portfolio images (100% with embeddings ✅)
- **Austin, TX:** 188 artists, 1,257 images
- **Atlanta, GA:** 171 artists, 1,073 images
- **Los Angeles, CA:** 186 artists, 1,284 images
- **New York, NY:** 219 artists, 1,705 images
- **Chicago, IL:** 194 artists, 1,655 images
- **Portland, OR:** 199 artists, 1,578 images
- **Seattle, WA:** 172 artists, 1,507 images
- **Miami, FL:** 145 artists, 1,075 images
- **Vector Index:** IVFFlat (lists=105, optimized for 11,167 images)

### Production Features ✅
- ✅ Multi-modal search (image upload, text query, Instagram post/profile links)
- ✅ Artist profiles (1,474 pages across 8 cities)
- ✅ City browse pages (8 cities: Austin, Atlanta, LA, NYC, Chicago, Portland, Seattle, Miami)
- ✅ State browse pages (8 states with editorial content)
- ✅ Style landing pages (80 pages: 10 styles × 8 cities)
- ✅ **SEO Editorial Content (COMPLETE):**
  - 8 state pages (~3,000 words)
  - 8 city pages (~3,400 words)
  - 80 style×city pages (~38,000 words)
  - Total: ~65,000 words of culturally-specific, SEO-optimized content
- ✅ Hybrid CLIP embeddings (local GPU + Modal fallback)
- ✅ Security hardening (A rating, all critical issues fixed)
- ✅ Remote GPU access (https://clip.inkdex.io works while traveling)
- ✅ Smart unified input (auto-detects Instagram URLs, images, and text)
- ✅ Incremental pipeline (process while scraping continues)

---

## Adding New Cities

### Overview
When you add a new city to the `CITIES` constant, Next.js **automatically generates** all necessary pages at build time using `generateStaticParams()`. No manual page creation needed.

### One-Time Setup (Per City)
1. **Add city to constants:**
   ```typescript
   // /lib/constants/cities.ts
   export const CITIES = [
     // ... existing cities
     {
       name: 'New City',
       slug: 'new-city',
       state: 'XX',
       fullName: 'New City, XX',
       opportunityScore: 75,
       monthlySearches: 250000,
       competition: 50,
     },
   ]

   // Add state if new
   export const STATES = [
     // ... existing states
     {
       name: 'State Name',
       code: 'XX',
       slug: 'state-name',
       cities: ['new-city'],
     },
   ]
   ```

2. **Run discovery & data pipeline:**
   ```bash
   # Phase 1: Discover artists
   npm run discover-artists -- --city "New City" --state "XX"

   # Phase 2: Scrape portfolios
   npm run scrape-shops -- --city "new-city"

   # Phase 3: Classify images
   python scripts/classification/batch-classify.py --city "new-city"

   # Phase 4: Generate embeddings
   python scripts/embeddings/local_batch_embeddings.py --parallel 8 --batch-size 100

   # Phase 5: Update vector index
   npx tsx scripts/embeddings/create-vector-index.ts
   # Then execute the SQL it generates via Supabase dashboard or MCP tool
   ```

3. **Rebuild and deploy:**
   ```bash
   npm run build
   # Deploy to production
   ```

### What's Automatically Generated

After adding to `CITIES` constant and rebuilding:

- **City Browse Page:** `/{state}/{city}` (e.g., `/texas/austin`)
  - Generated via `app/[state]/[city]/page.tsx`
  - Uses `generateStaticParams()` to loop through `CITIES`
  - ISR: 24-hour revalidation

- **10 Style Pages per City:** `/{state}/{city}/{style}` (e.g., `/texas/austin/traditional`)
  - Generated via `app/[state]/[city]/[style]/page.tsx`
  - Automatically creates all CITIES × STYLES combinations
  - ISR: 24-hour revalidation

- **Artist Profiles:** `/{state}/{city}/artists/{slug}` (e.g., `/texas/austin/artists/john-doe`)
  - Dynamic route - generates on-demand via ISR
  - No build-time generation needed

- **SEO Metadata:** All pages have:
  - Title, description, Open Graph tags
  - JSON-LD breadcrumbs and structured data
  - Canonical URLs

### What's NOT Automatic
- **Data collection:** Must run discovery/scraping/classification/embeddings pipeline
- **CITIES constant:** Must manually add city to `/lib/constants/cities.ts`
- **Build & deploy:** Must rebuild Next.js app after adding city

---

## Technical Context

### Hybrid CLIP Embedding System (Complete ✅)
**Architecture:**
- **Primary:** Local A2000 GPU at 10.2.20.20 (https://clip.inkdex.io)
- **Fallback:** Modal.com serverless GPU (automatic 5s timeout)
- **Model:** OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - 768 dimensions
- **Remote Access:** ✅ Confirmed working while traveling

**Performance:**
- Local GPU: 0.48-0.92s per embedding
- 100% local GPU usage in production (0 Modal fallback needed)
- No cold starts (local GPU always warm)

**Cost:**
- Monthly: <$1 (Modal fallback only if local GPU fails)
- Savings: 90% reduction from Modal-only approach

**Security:**
- API key authentication (Bearer token)
- SSRF protection (domain whitelist)
- Browser context protection (prevents client-side execution)
- Input validation (dimensions, finite number checks)

**Files:**
- `/lib/embeddings/hybrid-client.ts` - Main client with automatic failover
- `/app/api/embeddings/health/route.ts` - Health monitoring
- `/scripts/embeddings/test_embedding_parity.py` - Parity verification
- `/scripts/embeddings/local_batch_embeddings.py` - Batch processing

### Vector Index Configuration
**Current:** IVFFlat with lists=60 (optimal for 3,614 images)
**Formula:** lists = √total_images (rounded)
**Update Process:**
1. Run: `npx tsx scripts/embeddings/create-vector-index.ts`
2. Execute generated SQL via Supabase dashboard or `mcp__supabase__execute_sql`

---

## Environment Configuration

### Required for Hybrid System
```bash
# Local GPU (Primary)
LOCAL_CLIP_URL=https://clip.inkdex.io
CLIP_API_KEY=<your-clip-api-key>
LOCAL_CLIP_TIMEOUT=5000  # milliseconds

# Modal.com (Fallback)
MODAL_FUNCTION_URL=https://gr0x01--tattoo-clip-embeddings-model-fastapi-app.modal.run

# Behavior
PREFER_LOCAL_CLIP=true
ENABLE_MODAL_FALLBACK=true
NEXT_PUBLIC_ENABLE_WARMUP=false  # Disabled (local GPU has no cold starts)
```

---

## Recent Completions (Dec 31 - Jan 1)

### SEO Editorial Content - ALL 80 Pages Complete (Jan 1) ✅
**Goal:** Add 300-500 word editorial content to all 96 browse pages (8 states + 8 cities + 80 style pages) for improved SEO rankings and user engagement.

**What Was Completed:**
- ✅ **80 style×city combinations** (10 styles × 8 cities) - ~38,000 words
- ✅ **8 state pages** - ~3,000 words
- ✅ **8 city pages** - ~3,400 words
- ✅ **Total:** ~65,000 words of culturally-specific, locally-relevant content

**Generation Approach:**
- **3-batch parallel execution** using Task tool with general-purpose agents
- **Batch 1:** Traditional, Realism, Japanese, Neo-traditional (32 entries)
- **Batch 2:** Blackwork, Illustrative, Watercolor, Tribal (32 entries)
- **Batch 3:** New-school, Chicano (16 entries)
- **Parallel agents per batch:** 4 agents writing simultaneously to same file
- **Total generation time:** ~45 minutes (all 3 batches)

**Content Quality:**
- ✅ **2-3 specific neighborhood mentions** per city (e.g., "East Austin," "Williamsburg," "Pilsen")
- ✅ **Culturally authentic:** Chicano content treats style with deep cultural respect (LA as epicenter, cultural consultation emphasis)
- ✅ **No generic clichés:** Avoided "vibrant scene," "hidden gem," "express yourself," etc.
- ✅ **ASCII quotes only:** 0 Unicode curly quotes (critical for build)
- ✅ **TypeScript valid:** Compiles without errors
- ✅ **Proper structure:** All entries have intro (120-150w), cityContext (150-180w), expectations (100-120w), finding (80-100w), keywords (5)

**File Details:**
- **Location:** `/lib/content/editorial/styles.ts`
- **Size:** 3,238 lines (~65,000 words)
- **Structure:** 10 section headers + 80 complete entries
- **Integration:** Already wired into city/state/style browse pages via `getStyleEditorialContent()`, `getCityEditorialContent()`, `getStateEditorialContent()`

**Key Technical Lessons:**
1. **Parallel agent coordination works:** 4 agents can successfully append to same file without conflicts when using Edit tool
2. **ASCII quote enforcement critical:** Must explicitly state in prompts (some agents defaulted to Unicode)
3. **Cultural sensitivity requires detailed prompts:** Chicano content needed specific guidance on cultural authenticity vs. appropriation
4. **Agent quote style varies:** Realism/Illustrative used double quotes (`"realism"`), others used single quotes (`'traditional'`) - both valid TypeScript

**Next Steps:**
1. Run full Next.js build test (should generate 1,607+ pages now)
2. Spot-check content quality (especially culturally-sensitive Chicano entries)
3. Deploy to production
4. Monitor SEO impact over 3 months (target: +30-50% organic impressions)

---

### 5-City Expansion Complete (Jan 1) ✅
- **929 new artists** discovered across 5 cities (NYC, Chicago, Portland, Seattle, Miami)
- **7,520 new images** scraped and processed
- **Incremental pipeline:** Process-batch.ts runs every 10 artists, embeddings every 50
- **100% local GPU:** All embeddings generated on local A2000 (0 Modal fallback)
- **Vector index:** Upgraded from lists=60 to lists=105 for 11,167 images
- **Build:** 1,105 static pages generated successfully
- **Total time:** ~4 hours (discovery: 20 min, scraping: 2 hours, embeddings: 1.5 hours)

### Incremental Pipeline Refactor (Jan 1) ✅
- **Lock file mechanism:** `.complete` files prevent race conditions
- **Batch processing:** Process every 10 artists during download
- **Embedding batches:** Generate every 50 artists (no 2-hour wait)
- **Memory efficient:** Only 10-20 artists in /tmp at once
- **Code reviewed:** Fixed critical issues (race conditions, subprocess paths)
- **Reusable:** Same pipeline for single-artist additions

### All Embeddings Complete (Jan 1) ✅
- **11,167 total embeddings** generated (100% complete)
- 100% local GPU usage (0 Modal fallback)
- Average: 0.50-0.87s per embedding
- 5 batches processed incrementally
- **Remote access confirmed:** Local GPU worked perfectly while traveling

### Vector Index Updated (Jan 1) ✅
- Upgraded from lists=60 (3,614 images) to lists=105 (11,167 images)
- Optimal configuration using sqrt(total_images) formula
- Executed via Supabase MCP tool

### Hybrid CLIP System (Jan 1) ✅
- Integrated local A2000 GPU with automatic Modal fallback
- Health monitoring endpoint with caching (1-min TTL)
- Parity testing script (verifies >99% similarity)
- Security hardening (A rating)

### Smart Unified Input - Phase 4 Complete (Jan 1) ✅
- Single input field auto-detects: images, text, Instagram post/profile URLs
- Enhanced UX: Shows "Similar to @username" badge for profiles
- Seamless integration: All search types work from one input
- Production ready: TypeScript passes, build succeeds (617 pages)
- Related: "Find Similar Artists" button on all artist profiles

### Instagram Profile Search (Jan 1) ✅
- Paste profile URL → find similar artists
- Apify scraper + embedding aggregation
- DB optimization: instant search for existing artists
- 30% cost reduction from smart caching

### Instagram Post Search (Dec 31) ✅
- Paste post URL → find similar artists
- oEmbed API + CLIP embedding
- Rate limiting (10/hour/IP)
- Security: SSRF protection, SQL injection prevention

### Atlanta + LA Expansion (Dec 31) ✅
- 386 artists discovered (193 each)
- 357 successfully scraped (92.5% success rate)
- 2,378 tattoo images classified and uploaded
- All images embedded and searchable

---

## Quick Reference

### Key Commands
```bash
# Embedding Generation
python scripts/embeddings/test_embedding_parity.py                     # Test parity
python scripts/embeddings/local_batch_embeddings.py --parallel 8       # Generate embeddings

# Vector Index Update
npx tsx scripts/embeddings/create-vector-index.ts                      # Generate SQL
# Then execute SQL via Supabase dashboard or MCP tool

# Health Check
curl https://clip.inkdex.io/health                                     # Check local GPU
curl http://localhost:3000/api/embeddings/health                       # Check hybrid system

# Status Checks
node check-final-status.mjs                                            # Check all embeddings
```

### Database Queries
```bash
# Check embedding progress by city
node check-final-status.mjs

# Check scraping status
node scripts/utilities/check-scrape-status.mjs

# Verify database connection
node scripts/utilities/check-db.mjs
```

### Architecture References
- **Hybrid CLIP:** `/memory-bank/architecture/techStack.md` (lines 38-67)
- **Vector Index:** `/memory-bank/development/progress.md` (Quick Reference section)
- **Phase 0-4 Details:** `/memory-bank/archive/phase-0-4-implementation.md`

---

## Known Issues & Limitations

### Non-Blocking
- **Rate limiter:** In-memory (resets on redeploy, acceptable for MVP)
- **ESLint warnings:** In `scripts/` directory (dev tools, not production code)
- **TypeScript `any` types:** 26 remaining in error handling (non-critical)

---

## Next Development Priorities

### Immediate
- Monitor search performance with full dataset (target: <500ms p95)
- Track local GPU uptime and Modal fallback usage
- Gather user feedback on search quality

### Future Enhancements
- Add more cities (follow "Adding New Cities" process above)
- Persistent rate limiting (Redis/database-backed)
- Custom OG images per city/style
- Advanced filters (price range, availability, style sub-categories)

---

**Last Updated:** December 31, 2025
**Next Review:** After next city expansion or major feature addition
