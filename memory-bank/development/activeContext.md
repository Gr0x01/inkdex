---
Last-Updated: 2026-01-01
Maintainer: RB
Status: Phase 4 Complete ✅, Awaiting Local GPU Setup
---

# Active Context: Inkdex

## Current Sprint Focus

**Sprint:** Embedding Generation for Atlanta + LA
**Status:** PAUSED - Awaiting local GPU configuration
**Priority:** Complete multi-city platform for production launch

### Primary Objective
Generate CLIP embeddings for 2,376 images (Atlanta + LA) using hybrid local GPU + Modal.com system.

**Blockers:**
- Local GPU service at https://clip.inkdex.io needs configuration (user responsibility)

**Next Actions:**
1. User configures local GPU with Modal-compatible API endpoints
2. Test embedding parity (must achieve >99% similarity with Modal)
3. Run batch embedding generation: `python scripts/embeddings/local_batch_embeddings.py --parallel 4`
4. Update IVFFlat vector index with optimal lists parameter (≈ 60 for 3,633 images)

---

## Current Platform State

### Database Overview
- **Total Artists:** 545 (188 Austin + 171 Atlanta + 186 LA)
- **Total Images:** ~3,633 portfolio images
- **Austin:** 1,257 images with embeddings ✅ (fully searchable)
- **Atlanta + LA:** 2,376 images uploaded, awaiting embeddings
- **Vector Index:** IVFFlat (lists=35, optimized for Austin's 1,257 images)

### Production-Ready Features
- ✅ Search flow (image, text, Instagram post/profile links)
- ✅ Artist profiles (188 Austin pages)
- ✅ City browse (3 cities: Austin, Atlanta, LA)
- ✅ Style landing pages (30 pages: 10 styles × 3 cities)
- ✅ Hybrid CLIP embeddings (local GPU + Modal fallback)
- ✅ Security hardening (A rating, all critical issues fixed)

### Pending Work
- ⏳ Atlanta + LA embeddings (2,376 images)
- ⏳ Vector index update (lists parameter adjustment)
- ⏳ Atlanta + LA style pages population (auto-updates via ISR after embeddings)

---

## Technical Context

### Hybrid CLIP Embedding System (Complete ✅)
**Architecture:**
- **Primary:** Local A2000 GPU at 10.2.20.20 (https://clip.inkdex.io)
- **Fallback:** Modal.com serverless GPU (automatic 5s timeout)
- **Model:** OpenCLIP ViT-L-14 (laion2b_s32b_b82k) - 768 dimensions

**Performance:**
- Local GPU: <2s latency (no cold starts)
- Modal fallback: 2-5s (warm) or 20-25s (cold)
- Expected: 95%+ requests handled by local GPU

**Cost Savings:**
- Before: ~$6/month (Modal warmup)
- After: <$1/month (Modal fallback only when local fails)
- Savings: 90% reduction

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

### Local GPU Requirements
**User must implement on their local GPU server (10.2.20.20):**

1. **Endpoint:** `https://clip.inkdex.io`
2. **API Routes:**
   - `POST /generate_single_embedding` - Single image embedding
   - `POST /generate_text_query_embedding` - Text query embedding
3. **Model:** OpenCLIP ViT-L-14 with laion2b_s32b_b82k weights (same as Modal)
4. **Authentication:** Bearer token via `CLIP_API_KEY` environment variable
5. **Output Format:** JSON with `embedding` array (768-dim, L2 normalized)

**Testing:**
- Run `python scripts/embeddings/test_embedding_parity.py`
- Must achieve >99% cosine similarity between local and Modal embeddings

---

## Environment Configuration

### Required for Hybrid System
```bash
# Local GPU (Primary)
LOCAL_CLIP_URL=https://clip.inkdex.io
CLIP_API_KEY=your-api-key-here
LOCAL_CLIP_TIMEOUT=5000  # milliseconds

# Modal.com (Fallback)
MODAL_FUNCTION_URL=https://gr0x01--tattoo-clip-embeddings-model-fastapi-app.modal.run

# Behavior
PREFER_LOCAL_CLIP=true
ENABLE_MODAL_FALLBACK=true
NEXT_PUBLIC_ENABLE_WARMUP=false  # Disabled (local GPU has no cold starts)
```

---

## Recent Completions (Past 48 Hours)

### Hybrid CLIP System (Jan 1) ✅
- Integrated local A2000 GPU with automatic Modal fallback
- Health monitoring endpoint with caching (1-min TTL)
- Parity testing script (verifies >99% similarity)
- Security hardening (A rating)

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
- All images ready for embedding generation

---

## Quick Reference

### Key Commands
```bash
# Embedding Generation (after local GPU setup)
python scripts/embeddings/test_embedding_parity.py           # Test parity first
python scripts/embeddings/local_batch_embeddings.py --parallel 4  # Generate embeddings

# Vector Index Update
npx tsx scripts/embeddings/create-vector-index.ts            # Recreate with optimal lists

# Health Check
curl http://localhost:3000/api/embeddings/health             # Check system status
```

### Database Queries
```bash
# Check embedding progress
node scripts/utilities/check-embedding-progress.mjs

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

### Current
- **Atlanta/LA style pages:** Show empty state until embeddings generated (expected)
- **Rate limiter:** In-memory (resets on redeploy, acceptable for MVP)
- **Local GPU:** Not yet configured (user responsibility)

### Non-Blocking
- ESLint warnings in `scripts/` directory (dev tools, not production code)
- Some TypeScript `any` types in error handling (26 remaining, non-critical)

---

## Success Criteria for Current Sprint

1. ✅ Local GPU service configured at https://clip.inkdex.io
2. ✅ Embedding parity test passes (>99% similarity)
3. ✅ All 2,376 Atlanta/LA images have embeddings
4. ✅ IVFFlat index updated with optimal parameters (lists ≈ 60)
5. ✅ All 3 cities fully searchable
6. ✅ Atlanta/LA style pages auto-populate via ISR

**Timeline:** Dependent on local GPU configuration completion
**Estimated:** 2-4 hours after GPU service is ready

---

**Last Updated:** January 1, 2026
**Next Update:** After local GPU configuration and embedding generation complete
