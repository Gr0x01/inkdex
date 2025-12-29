---
Last-Updated: 2025-12-29
Maintainer: RB
Status: Phase 0 Complete → Phase 1 Starting
---

# Quickstart: Tattoo Artist Discovery Platform

## Current Status
- **Phase**: Phase 1 - Infrastructure Setup
- **Version**: 0.0.1 (Pre-MVP)
- **Environment**: Development
- **Next Phase**: Database & infrastructure setup, then artist discovery pipeline

## Project Summary
AI-powered tattoo artist discovery platform where users search in *their language* (images, vibes, plain descriptions) using multi-modal CLIP embeddings. Visual search platform that solves "I have Pinterest screenshots but don't know tattoo terminology" problem.

## Launch Cities (Selected Dec 29, 2025)
1. **Austin, TX** - Score: 78/100 (lowest competition, strong growth)
2. **Los Angeles, CA** - Score: 77/100 (largest market, high artist density)

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
  - Cloudflare R2 configuration
  - Next.js project initialization
  - Instagram OAuth configuration (for post-MVP)

## Critical Architecture Points
- **Search**: Multi-modal (image + text) using CLIP embeddings
- **Database**: Supabase PostgreSQL + pgvector with IVFFlat indexing
- **Images**: Cloudflare R2 + CDN (WebP thumbnails)
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

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_PUBLIC_URL=

# Instagram OAuth (for post-MVP)
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

# Analytics
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_APP_URL=
```

## MVP Scope
- Image upload search (primary)
- Natural language text search (secondary)
- 400-600 artists (200-300 per city)
- Artist profile pages + city browse pages
- SEO-optimized style landing pages
- No authentication (fully public for MVP)

## Post-MVP Features (Architecture Ready)
- User authentication (Supabase Auth + Instagram OAuth)
- Saved/bookmarked artists
- Artist claiming & verification via Instagram OAuth
- Artist dashboard for claimed profiles
- Hybrid search (image + text modifiers)

## Success Metrics (Month 1)
- 400-600 artists indexed
- 8,000-12,000 portfolio images
- 70%+ relevant search matches
- Lighthouse 90+ scores
- <500ms vector search latency
- 20%+ Instagram click-through rate

## Estimated Costs
- **One-time per city**: $30-55 (discovery + scraping)
- **Monthly (2 cities)**: $6-11 (storage + re-scraping)
- **Scaling (10 cities)**: ~$98/month

## Next Immediate Steps
1. Create Supabase project with pgvector extension
2. Run database schema migrations
3. Set up Cloudflare R2 bucket
4. Initialize Next.js project
5. Configure Instagram OAuth in Supabase
6. Begin artist discovery for Austin + LA
