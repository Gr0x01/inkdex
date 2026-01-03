---
Last-Updated: 2026-01-03 (Session 6 - 13-City Expansion Planned)
Maintainer: RB
Status: Production Ready - 8 Cities Live + 13 Cities Planned
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

## Planned Expansion (Next 13 Cities)
**DataForSEO Analysis Complete (Jan 3, 2026)** - All scored 77-84/100 (HIGH priority)

**Tier 1 - Lowest Competition (11-14%):**
1. **Asheville, NC** - 250k searches/month, 11% competition, Score: 84/100
2. **Richmond, VA** - 254k searches/month, 13% competition, Score: 84/100
3. **Charlotte, NC** - 256k searches/month, 14% competition, Score: 84/100

**Tier 2 - Strong Mid-Market (22-42%):**
4. **Columbus, OH** - 252k searches/month, 25% competition, Score: 81/100
5. **Salt Lake City, UT** - 251k searches/month, 22% competition, Score: 81/100
6. **Philadelphia, PA** - 255k searches/month, 27% competition, Score: 82/100
7. **Nashville, TN** - 266k searches/month, 38% competition, Score: 80/100
8. **San Francisco, CA** - 254k searches/month, 42% competition, Score: 80/100

**Tier 3 - High Volume Markets (317k+ searches):**
9. **Phoenix, AZ** - 317k searches/month, 45% competition, Score: 79/100
10. **Las Vegas, NV** - 297k searches/month, 42% competition, Score: 80/100
11. **San Diego, CA** - 266k searches/month, 55% competition, Score: 77/100
12. **San Antonio, TX** - 259k searches/month, 36% competition, Score: 79/100
13. **Tampa, FL** - 258k searches/month, 41% competition, Score: 78/100

**Key Insights:**
- All cities: 250k-317k monthly searches, 0 keyword difficulty
- Visual search gap exists in all markets (low competition on inspiration/portfolio queries)
- Recommended rollout: Start with Tier 1 (easiest wins), then Tier 2 (volume + ease), then Tier 3 (scale)

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
