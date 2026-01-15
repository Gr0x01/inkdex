---
Last-Updated: 2026-01-15
Maintainer: RB
Status: Launched - International Expansion
---

# Quickstart: Inkdex

## ⚠️ CRITICAL: Canonical URL is `https://inkdex.io` (non-www)
- **Vercel:** `inkdex.io` is PRIMARY domain
- **DO NOT** add redirects to next.config.js without checking Vercel domain config first
- See `operations.md` for incident history (site went down twice from redirect loops)

## Current Status
- **Phase**: Launched - All 15 phases complete + International
- **Version**: 1.1.0 (International Launch)
- **Environment**: Production
- **Scale**: 126 cities (116 US + 10 International), 17,250 artists, 99,258 images with embeddings
- **Countries**: 42 (US, Canada, India, Pakistan, Australia, Mexico, Brazil, Argentina, Japan, + 33 more)

## Project Summary
Inkdex - tattoo artist discovery platform where users search in *their language* (images, vibes, plain descriptions). Visual search platform that solves "I have Pinterest screenshots but don't know tattoo terminology" problem.

## Live Cities (116 Total Across All 50 States + DC)

**Initial Launch (Dec 29-31, 2025):** Austin, Atlanta, Los Angeles (8 cities total after Jan 1 expansion)

**Batches 1-4 (Jan 4, 2026):** 88 cities, 9,640 artists via Tavily API

**Batch 5 - Final 9 States (Jan 4, 2026):**
- **Delaware:** Wilmington
- **Mississippi:** Jackson, Biloxi
- **Montana:** Missoula, Bozeman, Billings
- **New Hampshire:** Portsmouth, Manchester
- **New Jersey:** Jersey City, Hoboken, Asbury Park, Atlantic City
- **North Dakota:** Fargo, Bismarck
- **South Dakota:** Sioux Falls, Rapid City
- **West Virginia:** Charleston, Morgantown
- **Wyoming:** Jackson, Cheyenne
- Discovery: 1,319 artists via Tavily API
- All cities scored 82-84/100 opportunity score

**International Expansion (Jan 14, 2026):**
- **India (IN):** Mumbai, Delhi, Bangalore, Kolkata, Hyderabad, Chennai (694 artists)
- **Pakistan (PK):** Karachi, Lahore, Islamabad, Rawalpindi (232 artists)
- URL format: `/in/mh/mumbai`, `/pk/sd/karachi`

**Total Platform Scale:**
- **Cities**: 126 (116 US + 6 India + 4 Pakistan)
- **Artists**: 17,250
- **Countries**: 42
- **States/Regions**: 51 US + 6 India + 3 Pakistan
- **SEO Content**: 116 US cities with full editorial content
- **Discovery Cost**: ~$328 (Tavily API)
- **SEO Generation Cost**: ~$2.14 (GPT-4.1)

## Key Commands
```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run storybook        # Start Storybook dev server

# Unit Testing (Vitest - 47 tests)
npm run test             # Vitest watch mode
npm run test:run         # Single run (CI uses this)
npm run test:coverage    # With coverage report

# E2E Testing (Playwright - 17 tests)
npm run test:e2e         # Run all E2E tests (~4 min)
npm run test:e2e:ui      # Playwright UI (interactive)
npm run test:e2e:headed  # Run in visible browser

# Data Pipeline
npm run analyze-cities   # DataForSEO city analysis
npm run discover-artists # Google Maps artist discovery (legacy)
npx tsx scripts/discovery/tavily-artist-discovery-v2.ts  # Tavily web discovery (new)
npx tsx scripts/seo/generate-city-content.ts              # GPT-4.1 SEO content generation
npm run scrape-instagram # ScrapingDog Instagram portfolio scraping
npm run generate-embeddings # Modal.com CLIP embedding generation

# Bio Location Extraction (GPT-4.1-nano)
npx tsx scripts/maintenance/extract-bio-locations.ts          # Extract missing locations
npx tsx scripts/maintenance/extract-bio-locations.ts --all    # Re-extract ALL (~$0.09)
npx tsx scripts/maintenance/extract-bio-locations.ts --dry-run --limit 50  # Test first

# Database
npx supabase db push     # Push schema migrations
npx supabase db reset    # Reset local database
npx supabase gen types typescript --local > types/database.ts
```

## Active Focus
All 15 implementation phases complete:
- ✅ Phase 1-4: Database, OAuth, Claim Flow, Add Artist
- ✅ Phase 5-8: Onboarding, Portfolio, Profile, Legal Pages
- ✅ Phase 9: Stripe Integration (live in production)
- ✅ Phase 10-12: Email, Auto-Sync, Search Ranking
- ✅ Phase 13-15: Analytics, Admin Panel, Multi-Location

## URL Structure (IMPORTANT)
- **City pages**: `/us/{state-code}/{city-slug}` (e.g., `/us/nd/fargo`, `/us/tx/austin`)
- **State pages**: `/us/{state-code}` (e.g., `/us/nd`, `/us/tx`)
- **Artist pages**: `/artist/{artist-slug}`
- **Style pages**: `/us/{state-code}/{city-slug}/{style}` (e.g., `/us/tx/austin/traditional`)

**State codes are lowercase 2-letter codes (nd, tx, ca) - NOT full names (north-dakota).**

## Critical Architecture Points
- **Search**: Multi-modal (image + text) using CLIP embeddings
- **Database**: Supabase PostgreSQL + pgvector with IVFFlat indexing
- **Images**: Supabase Storage (WebP thumbnails)
- **Embeddings**: Modal.com serverless GPU (OpenCLIP ViT-L-14, 768-dim)
- **Frontend**: Next.js 14+ App Router, TypeScript, Tailwind CSS
- **Auth**: Supabase Auth with Instagram OAuth (post-MVP)

## Quick Links
- [Implementation Plan](../projects/tattoo-discovery-implementation-plan.md)
- [Search UX Strategy](../projects/search-ux-strategy.md)
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)
- [Architecture Patterns](../architecture/patterns.md) - **Inherited from DDD project**
- [Active Context](../development/activeContext.md)
- [Progress Log](../development/progress.md)

## Environment Variables Required
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (for CLIP embeddings)
OPENAI_API_KEY=

# Google APIs
GOOGLE_PLACES_API_KEY=

# DataForSEO (Phase 0 - DONE)
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Supabase Storage (uses same Supabase credentials above)
# No additional environment variables needed

# Instagram OAuth (for post-MVP)
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

# ScrapingDog (Instagram scraping - primary)
SCRAPINGDOG_API_KEY=

# Apify (Instagram scraping - fallback only)
APIFY_API_TOKEN=

# Analytics
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_APP_URL=
```

## MVP Scope ✅ COMPLETE
- ✅ Image upload search (primary)
- ✅ Natural language text search (secondary)
- ✅ 1,474 artists across 8 cities
- ✅ Artist profile pages + city browse pages
- ✅ SEO-optimized style landing pages
- ✅ Smart unified input (auto-detects images, text, Instagram links)
- ✅ No authentication (fully public for MVP)

## Post-MVP Features (Architecture Ready)
- User authentication (Supabase Auth + Instagram OAuth)
- Saved/bookmarked artists
- Artist claiming & verification via Instagram OAuth
- Artist dashboard for claimed profiles
- Hybrid search (image + text modifiers)

## Success Metrics - ACHIEVED ✅
- ✅ 1,474 artists indexed (247% of target)
- ✅ 11,167 portfolio images (93% of target)
- ✅ 100% embeddings generated (all searchable)
- ✅ Vector index optimized (lists=105 for 11,167 images)
- ✅ Build: 1,105 static pages generated
- ✅ Incremental pipeline (process while scraping continues)

## Estimated Costs
- **One-time per city (Tavily method)**: ~$3 discovery + $0.02 SEO content
- **One-time per city (legacy Google Maps)**: $30-55 (discovery + scraping)
- **Monthly (96 cities)**: ~$12-20 (storage + re-scraping + Redis)

## Next Immediate Steps
1. Monitor production for issues
2. Continue marketing/artist outreach
3. International expansion via ScrapingDog API
