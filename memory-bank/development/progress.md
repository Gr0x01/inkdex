---
Last-Updated: 2026-01-11
Maintainer: RB
Status: Launched - All 15 Phases Complete + ML Style Classifier
---

# Progress Log: Inkdex

## Platform Metrics

| Metric | Value |
|--------|-------|
| Cities | 116 |
| States | 51 (50 states + DC) |
| Artists | 16,324 |
| Images | 99,258 (with embeddings) |
| Color Profiles | 10,704 artists |
| Display Styles | 11 (added japanese + anime) |
| Static Pages | ~3,500+ |

## Launch Milestone

**Inkdex v1.0.0 - Full US Coverage** (Jan 5, 2026)

All 15 implementation phases complete:
- Multi-modal search (image, text, Instagram links)
- Artist claiming via Instagram OAuth
- Pro tier ($15/mo) with Stripe integration
- Admin panel with pipeline control
- Multi-location support (international)
- GDPR compliance (EU artist filtering)
- 20 styles with averaged seed embeddings

---

## Implementation Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Database schema (subscriptions, analytics) | Complete |
| 2 | Instagram OAuth + Vault encryption | Complete |
| 3 | Claim flow with handle matching | Complete |
| 4 | Add-artist page (self-add + recommendations) | Complete |
| 5 | 5-step onboarding + test users | Complete |
| 6 | Portfolio management (pinning, limits) | Complete |
| 7 | Profile editor + delete flow | Complete |
| 8 | Legal pages (terms, privacy, about) | Complete |
| 9 | Stripe subscriptions | Complete |
| 10 | Email notifications (Resend) | Complete |
| 11 | Instagram auto-sync for Pro | Complete |
| 12 | Search ranking boosts + badges | Complete |
| 13 | Analytics dashboard | Complete |
| 14 | Admin panel (mining, featured artists) | Complete |
| 15 | Multi-location support | Complete |

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vector index | IVFFlat | Better for 10k-100k scale |
| Scraping | ScrapingDog + Apify fallback | 5x cheaper than Apify alone |
| Classification | GPT-5-mini flex | ~$0.00012/profile |
| Embeddings | Hybrid CLIP | Local GPU + Modal fallback (90% cost reduction) |
| Artist matching | Handle-based | All artists have handles, reliable |
| Caching | Redis | Serverless-safe rate limiting |
| Search queries | RPC functions | Performance + single source of truth |

---

## Development Timeline

### Week 2 (Jan 11, 2026)
- **ScrapingDog Migration** ✅
  - Replaced Instaloader VPS with ScrapingDog API (5x cheaper than Apify)
  - ScrapingDog as primary, Apify as fallback
  - Removed admin orchestrator page and VultrMinerStatus component
  - Archived VPS scripts (`scripts/_archive/orchestrator/`, `scripts/_archive/instaloader/`)
- **Schema Drift Reconciliation** ✅
  - Fixed 29 SECURITY DEFINER functions with empty `search_path` bug
  - Consolidated 3 pending migrations into single reconciliation migration
  - Added pgcrypto token encryption infrastructure (table + 3 functions)
  - Created `npm run db:audit` tooling for drift detection
- **Database Audit (Jan 9)** ✅
  - Comprehensive post-consolidation audit using MCP tools
  - Fixed 2 remaining SECURITY DEFINER functions (`create_pipeline_run`, `get_all_cities_with_min_artists`)
  - Enabled RLS on `airtable_sync_log` + added service role policy
  - Added policies to `email_log` and `indexnow_submissions`
  - All checks pass: 0 functions with missing search_path, 0 tables without RLS
- **Key Files Created/Modified**
  - `supabase/migrations/20260111_001_reconcile_schema.sql` - Consolidated fix (978 lines)
  - `scripts/migrations/audit-schema.ts` - Auto-extracts expected schema from baseline
  - Updated `operations.md` with Schema Drift Detection workflow
- **Root Cause Analysis**
  - pg_dump serializes `SET search_path = ''` instead of `'public'`
  - Migrations archived before being applied to production
  - No automated check to verify production matches baseline

### Week 2 (Jan 8, 2026)
- **ML Style Classifier Deployed** ✅
  - Replaced CLIP seed comparison with trained ML classifier
  - GPT-4.1-mini labeled ~15k images for training (~$1.50/10k)
  - sklearn LogisticRegression with balanced class weights
  - Best F1 scores: black-and-gray (0.86), fine-line (0.77), realism (0.75)
  - Tagged all 99k images in ~11 minutes
- **Major Accuracy Improvements**
  - Surrealism: 28% → 12.4% (fixed over-tagging)
  - Anime: ~30% → 5.4%
  - Japanese: ~30% → 7.4%
- **Japanese + Anime Now Display Styles**
  - Added to `DISPLAY_STYLES` set (11 total)
  - ML accuracy now good enough for artist profile badges
- **Key Files Created**
  - `scripts/styles/batch-label-gpt.ts` - GPT vision labeling
  - `scripts/styles/export-training-data.ts` - Export for Python
  - `scripts/styles/train-classifier.py` - sklearn training
  - `scripts/styles/tag-images-ml.ts` - ML-based tagging
  - `models/style-classifier.json` - Trained weights

### Week 2 (Jan 7, 2026)
- **Style System Overhaul** ✅
  - Fixed broken tagging model (forced ONE technique per image was causing wrong tags)
  - Added fine-line style (16 seed images, 27.7% of images now tagged)
  - Changed to allow 0-3 styles per image (no forced assignment)
  - Raised anime/japanese thresholds to 0.40 (reduced false positives)
  - Example fix: @lilsilhouett went from 85% anime → 3% anime, now correctly shows 24% fine-line
- **ML Labeling System Built**
  - Admin UI at `/admin/styles/label` with keyboard shortcuts
  - Database: `style_training_labels` table for training data
  - 17 styles for labeling (9 core + 6 niche + anime + japanese)
- **Re-tagged all 92k images**
  - 98.4% have at least 1 tag (vs 100% forced before)
  - 1.6% correctly have 0 tags (didn't match any style well)
  - 270,640 total tags generated

### Week 2 (Jan 6, 2026)
- **Color-Weighted Search** ✅
  - Analyzed 92,033 images for color vs B&G classification
  - Generated color profiles for 10,704 artists
  - Distribution: 71.4% color-heavy, 6.1% B&G-heavy, 22.5% mixed
  - Search boosts artists matching query color profile (+0.10 max)
- **SQL Refactor for 100k Scale**
  - Split 1,365-line `search_functions.sql` into domain folders
  - Extracted `is_gdpr_country()` + `matches_location_filter()` helpers
  - Created `artist_sync_state` table (extracted from artists)
  - Created `artist_pipeline_state` table (extracted from artists)
  - Added `search_tier` column for HNSW prep at 1M+ images
  - Reduced code duplication: 11 GDPR lists → 1 function, 4 location filters → 1 function
- **Apify Cost Optimization**
  - Dual-account strategy (free tier for ongoing ops)
  - Reduces monthly costs from ~$40 to ~$0 after initial scraping

### Week 2 (Jan 4-5, 2026)
- 50-state expansion complete (116 cities)
- Stripe integration (Phase 9)
- Search performance overhaul (2900ms → 200ms)
- Style system expansion (20 styles)
- GDPR compliance implementation

### Week 1 (Dec 29 - Jan 3, 2026)
- Austin MVP launch (188 artists)
- Core infrastructure (Phases 1-8, 10-14)
- 8-city initial expansion
- Admin panel with pipeline control
- Redis caching infrastructure

---

## Cost Summary

| Category | Cost |
|----------|------|
| Discovery (116 cities) | ~$300 |
| Scraping (Apify) | ~$200 |
| Classification (GPT) | ~$5 |
| Embeddings (Modal) | ~$3 |
| SEO Content (GPT-4.1) | ~$3 |
| **Total one-time** | ~$510 |
| **Monthly infrastructure** | ~$50 (Supabase Pro + Vercel + Redis) |

---

## Detailed Session History

For detailed session-by-session implementation notes, see:
- `memory-bank/archive/phase-0-4-implementation.md` - Initial development (Dec 29-31)
- Git commit history for specific changes
