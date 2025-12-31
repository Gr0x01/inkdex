---
Last-Updated: 2026-01-01
Maintainer: RB
Status: Production Ready - 8 Cities Live
---

# Quickstart: Inkdex

## Current Status
- **Phase**: Production - Platform Fully Operational
- **Version**: 0.1.0 (MVP Complete)
- **Environment**: Production Ready
- **Scale**: 8 cities, 1,474 artists, 11,167 portfolio images

## Project Summary
Inkdex - AI-powered tattoo artist discovery platform where users search in *their language* (images, vibes, plain descriptions) using multi-modal CLIP embeddings. Visual search platform that solves "I have Pinterest screenshots but don't know tattoo terminology" problem.

## Live Cities (8 Total)
**Initial Launch (Dec 29-31, 2025):**
1. **Austin, TX** - 188 artists, 1,257 images
2. **Atlanta, GA** - 171 artists, 1,073 images
3. **Los Angeles, CA** - 186 artists, 1,284 images

**5-City Expansion (Jan 1, 2026):**
4. **New York, NY** - 219 artists, 1,705 images
5. **Chicago, IL** - 194 artists, 1,655 images
6. **Portland, OR** - 199 artists, 1,578 images
7. **Seattle, WA** - 172 artists, 1,507 images
8. **Miami, FL** - 145 artists, 1,075 images

## Key Commands
```bash
# Development
npm run dev              # Start Next.js dev server (once initialized)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Data Pipeline (once scripts are built)
npm run analyze-cities   # DataForSEO city analysis (Phase 0 - DONE)
npm run discover-artists # Google Maps artist discovery
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
- **One-time per city**: $30-55 (discovery + scraping)
- **Monthly (2 cities)**: $6-11 (storage + re-scraping)
- **Scaling (10 cities)**: ~$98/month

## Next Immediate Steps
1. Create Supabase project with pgvector extension
2. Run database schema migrations
3. Set up Supabase Storage buckets
4. Initialize Next.js project
5. Configure Instagram OAuth in Supabase
6. Begin artist discovery for Austin + LA
