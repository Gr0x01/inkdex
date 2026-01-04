---
Last-Updated: 2026-01-04 (Session 10 - 50-State Coverage Complete)
Maintainer: RB
Status: Production Ready - 116 Cities Live Across All 50 States + DC
---

# Quickstart: Inkdex

## Current Status
- **Phase**: Production - Full US Coverage
- **Version**: 0.3.0 (50-State Coverage Complete)
- **Environment**: Production Ready
- **Scale**: 116 cities, 15,626 artists, ~25,000 portfolio images (est.)

## Project Summary
Inkdex - AI-powered tattoo artist discovery platform where users search in *their language* (images, vibes, plain descriptions) using multi-modal CLIP embeddings. Visual search platform that solves "I have Pinterest screenshots but don't know tattoo terminology" problem.

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

**Total Platform Scale:**
- **Cities**: 116 (full US coverage)
- **Artists**: 15,626
- **States**: 51 (all 50 states + DC)
- **SEO Content**: 116 cities with full editorial content
- **Discovery Cost**: ~$298 (Tavily API)
- **SEO Generation Cost**: ~$2.14 (GPT-4.1)

## Key Commands
```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run storybook        # Start Storybook dev server

# Instagram Mining Pipeline
npm run mine:hashtags              # Mine artists from Instagram hashtags
npm run mine:hashtags -- --hashtag blackworktattoo --posts 100 --skip-images
npm run mine:followers             # Mine from seed account followers
npm run mine:classify              # Batch classify pending candidates (GPT-5-mini)
npm run mine:classify -- --limit 50 --dry-run  # Preview what would be classified
npm run mine:status                # View mining statistics and costs

# Data Pipeline
npm run analyze-cities   # DataForSEO city analysis
npm run discover-artists # Google Maps artist discovery (legacy)
npx tsx scripts/discovery/tavily-artist-discovery-v2.ts  # Tavily web discovery (new)
npx tsx scripts/seo/generate-city-content.ts              # GPT-4.1 SEO content generation
npm run scrape-instagram # Apify Instagram portfolio scraping
npm run generate-embeddings # Modal.com CLIP embedding generation

# Database
npx supabase db push     # Push schema migrations
npx supabase db reset    # Reset local database
npx supabase gen types typescript --local > types/database.ts
```

## Active Focus
- ✅ Market analysis complete (Phase 0)
- ✅ Austin + LA selected as launch cities
- 🔄 Infrastructure setup (Phase 1)
  - Supabase project + pgvector setup
  - Supabase Storage configuration
  - Next.js project initialization
  - Instagram OAuth configuration (for post-MVP)

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

# Apify (Instagram Mining)
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
1. Create Supabase project with pgvector extension
2. Run database schema migrations
3. Set up Supabase Storage buckets
4. Initialize Next.js project
5. Configure Instagram OAuth in Supabase
6. Begin artist discovery for Austin + LA
