---
Last-Updated: 2025-12-31
Maintainer: RB
Status: Phase 4 Complete ✅ - Platform Fully Operational
---

# Active Context: Inkdex

## Current Platform Status

**Status:** PRODUCTION READY - All 3 cities fully operational

### Database Overview
- **Total Artists:** 545 (188 Austin + 171 Atlanta + 186 LA)
- **Total Images:** 3,614 portfolio images (100% with embeddings ✅)
- **Austin:** 1,257 images (100% searchable)
- **Atlanta:** 1,073 images (100% searchable)
- **Los Angeles:** 1,284 images (100% searchable)
- **Vector Index:** IVFFlat (lists=60, optimized for 3,614 images)

### Production Features ✅
- ✅ Multi-modal search (image upload, text query, Instagram post/profile links)
- ✅ Artist profiles (545 pages across 3 cities)
- ✅ City browse pages (3 cities: Austin, Atlanta, LA)
- ✅ Style landing pages (30 pages: 10 styles × 3 cities)
- ✅ Hybrid CLIP embeddings (local GPU + Modal fallback)
- ✅ Security hardening (A rating, all critical issues fixed)
- ✅ Remote GPU access (https://clip.inkdex.io works while traveling)
- ✅ Smart unified input (auto-detects Instagram URLs, images, and text)

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

### All Embeddings Complete (Dec 31) ✅
- **3,614 total embeddings** generated (Austin + Atlanta + LA)
- 100% local GPU usage (0 Modal fallback)
- Average: 0.48-0.92s per embedding
- 1 minor connection reset (auto-recovered)
- **Remote access confirmed:** Local GPU worked perfectly while traveling

### Vector Index Updated (Dec 31) ✅
- Upgraded from lists=35 (Austin only) to lists=60 (all cities)
- Optimal configuration for 3,614 images
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
