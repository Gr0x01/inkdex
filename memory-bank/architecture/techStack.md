---
Last-Updated: 2026-01-03
Maintainer: RB
Status: Production Ready - 8 Cities + Mining Pipeline + Admin Panel ✅
---

# Technology Stack: Inkdex

## Core Technologies

### Frontend
- **Framework**: Next.js 16+ (App Router with Turbopack)
  - Why: Server Components, ISR, great SEO, Vercel integration, Turbopack stable (faster builds)
  - Version: 16.1.1 (Turbopack default, React 19.2, file system caching)
- **Language**: TypeScript (strict mode)
  - Why: Type safety, better DX, fewer runtime errors
  - Config: Strict mode enabled, path aliases configured
- **Styling**: Tailwind CSS v3
  - Why: Fast development, consistent design system, small bundle
  - Approach: Component-first, responsive utilities
- **State Management**:
  - MVP: URL-based state + React Server Components
  - Post-MVP: Zustand for client-side user state (saved artists, auth)
  - Why: Minimal complexity for MVP, easy to add Zustand later
- **Deployment**: Vercel
  - Why: Best Next.js DX, edge functions, automatic ISR
  - Tier: Hobby (free) for MVP → Pro ($20/mo) for post-MVP

### Backend & Data
- **Database**: Supabase (PostgreSQL + managed hosting)
  - Why: Postgres + pgvector, auth built-in, generous free tier
  - Tier: Free tier for MVP → Pro ($25/mo) for post-MVP
  - Extensions: pgvector for CLIP embeddings
- **Vector Search**: pgvector with **IVFFlat indexing**
  - Why: Better for 10k-100k+ vectors, good recall/speed tradeoff
  - Index Config: `lists = 100` for MVP (10k images), scale to `lists = 316` for 100k
  - Alternative Considered: HNSW (better for <10k, more memory)
- **Redis**: Railway (distributed caching + rate limiting)
  - Why: Serverless-safe rate limiting, analytics caching, fail-open resilience
  - Client: ioredis v5.8.2 with singleton pattern
  - Deployment: Railway (512MB, $5/month)
  - Use Cases:
    - **Rate limiting** (sliding window algorithm with sorted sets)
    - **Analytics caching** (30-min TTL for consistent dashboard data)
    - **Admin dashboard caching** (5-min TTL for stats)
    - **Metrics tracking** (cache hit rates, performance timing)
  - Architecture:
    - Fail-open design (system works if Redis unavailable)
    - Fire-and-forget writes (non-blocking cache sets)
    - Pattern-based cache invalidation (SCAN, not KEYS)
    - Type-safe cache key generation
  - Security:
    - Input sanitization (colon replacement prevents key injection)
    - Whitelist validation on admin endpoints
    - Race condition prevention (check-before-add, isFlushing flags)
    - Atomic operations via Redis pipelines
- **Image Embeddings**: OpenCLIP ViT-L-14 (768 dimensions) - **Hybrid Architecture** (Jan 1, 2026)
  - Why: CLIP is multimodal (text + image share same vector space!)
  - Model: `ViT-L-14` with `laion2b_s32b_b82k` weights (768-dim L2 normalized vectors)
  - Text Search: Same model encodes text queries → same vector space
  - **Hybrid Architecture:**
    - **Primary:** Local GPU (A2000 12GB) at 10.2.20.20 on Proxmox
      - Endpoint: `https://clip.inkdex.io`
      - Authentication: `CLIP_API_KEY` via Bearer token
      - Performance: <2s latency (no cold starts)
      - Cost: $0 per request (~$6/month electricity)
    - **Fallback:** Modal.com serverless GPU (automatic failover)
      - GPU: A10G (~$0.60/hour, pay-per-second)
      - Timeout: 5s on local, then automatic failover to Modal
      - Expected: 95%+ requests handled by local GPU
      - Cost: <$1/month (only used when local GPU fails)
  - **Failover Logic:**
    - Try local GPU first with 5s timeout
    - Automatic failover to Modal on timeout/error
    - Health check caching (1-minute TTL)
    - Structured logging for observability (local vs Modal usage tracking)
  - **Security:**
    - API key authentication on local GPU
    - SSRF protection (domain whitelist for health checks)
    - Browser context protection (prevents client-side execution)
    - Input validation (embedding dimension, finite number checks)
    - Timeout handling (Modal: 30s, Local: 5s)
  - **Cost Analysis:**
    - Before: ~$6/month (Modal warmup) + usage
    - After: ~$6/month (local electricity) + <$1/month (Modal fallback)
    - Savings: 90% reduction in Modal costs
- **Image Storage**: Supabase Storage
  - Why: Integrated with Supabase, built-in CDN, PostgreSQL RLS policies
  - Structure: `portfolio-images/{artist_id}/{image_id}.webp`
  - Sizes: 320w, 640w, 1280w (small, medium, large)
  - Format: WebP 85% quality (JPEG fallback)
  - Cost: Included in Supabase plan (100GB free tier)
- **Authentication**: Supabase Auth with Instagram OAuth provider
  - Why: Built into Supabase, handles OAuth flow, RLS integration
  - MVP Status: Configured but not exposed in UI
  - Post-MVP: Login, saved artists, artist claiming
- **APIs & Services**:
  - **DataForSEO**: City selection + keyword research (Phase 0 - DONE)
  - **Google Places API**: Artist/shop discovery via Maps
  - **Apify**: Managed Instagram scraping (legal, managed IPs)
    - `apify/instagram-hashtag-scraper` - Hashtag post mining ($2.60/1K posts)
    - `apify/instagram-scraper` - Follower mining ($0.10/1K followers)
  - **Modal.com**: Serverless GPU for CLIP embeddings
  - **Instagram Graph API**: OAuth verification (post-MVP)
  - **OpenAI**: GPT-5-mini for image classification (~$0.02/profile)

### Architecture Pattern
- **Server Components**: Default for data fetching (faster, less JS)
- **Client Components**: Only for interactivity (search input, image upload, Modal warmup)
- **API Routes**: `/api/search` (image/text → embedding → searchId), `/api/warmup` (container pre-warming)
- **Static Generation**: City/artist/style pages (ISR with 24h revalidation)
- **URL-Based State**: Search results via `?id={searchId}` (no client state needed)
- **Container Warmup**: Fire-and-forget warmup on homepage load (reduces first search latency)
- **Future Auth Context**: AuthProvider wrapper (ready but unused in MVP)

### Admin Panel Architecture (Jan 3, 2026)
- **Route Structure**: `app/admin/` with `(authenticated)` route group
  - `/admin/login` - Public (outside route group)
  - `/admin/mining` - Protected (inside route group)
  - `/admin/artists` - Protected (inside route group)
- **Authentication**: Magic link via Supabase Auth
  - Email whitelist in `lib/admin/whitelist.ts`
  - Middleware protection in `lib/supabase/middleware.ts`
  - Double-check in `(authenticated)/layout.tsx`
- **API Endpoints**:
  - `POST /api/admin/auth/login` - Generate magic link
  - `POST /api/admin/auth/logout` - Sign out
  - `GET /api/admin/mining/stats` - Job counts, totals
  - `GET /api/admin/mining/runs` - Recent mining runs
  - `GET /api/admin/mining/costs/live` - Apify/OpenAI billing
  - `GET /api/admin/mining/cities` - Artist count by city
  - `GET /api/admin/artists` - Paginated artist list
  - `PATCH /api/admin/artists/[id]/featured` - Toggle featured
  - `POST /api/admin/artists/bulk-featured` - Bulk update
  - `GET /api/admin/redis/stats` - Cache metrics and Redis health
- **Security**:
  - SQL injection prevention (PostgREST escaping)
  - CSRF protection (SameSite=strict for admin cookies)
  - Rate limiting (Redis-based, serverless-safe)
  - Audit logging (admin_audit_log table)
  - Input validation (Zod schemas, whitelist checking)

---

## Development Tools

### Code Quality
- **Linting**: ESLint 9.39.2 (Flat config format - required for Next.js 16+)
  - Config: `eslint.config.mjs` with TypeScript ESLint + Next.js plugin
  - Run: `eslint .` (via `npm run lint`)
  - Note: Next.js 16 removed `next lint` command - must use ESLint CLI directly
  - Ignores: `.next/`, `node_modules/`, build artifacts
- **Formatting**: Prettier (integrated with ESLint)
  - Config: 2-space indent, single quotes, trailing commas
  - Run: Auto-format on save (VSCode) or `npm run format`
- **Type Checking**: TypeScript strict mode
  - Run: `npm run type-check` (CI/CD gate)
  - Generated types: `types/database.ts` from Supabase schema
- **Testing**:
  - MVP: Manual testing (8-week timeline, prioritize shipping)
  - Post-MVP: Jest + React Testing Library for critical flows
  - E2E: Playwright for search flow (post-MVP)

### Development Environment
- **Package Manager**: npm (default with Node.js)
  - Why: Stable, good lockfile, works with all tools
  - Alternative: pnpm (faster, but adds complexity)
- **Version Control**: Git + GitHub
  - Branch Strategy: `main` (production) + feature branches
  - Commit Convention: Conventional Commits (feat, fix, docs, etc.)
- **CI/CD**: GitHub Actions (optional for MVP)
  - MVP: Manual deployments to Vercel
  - Post-MVP: Auto-deploy on merge to main, run type-check + lint
- **Containerization**: Not needed (Vercel handles deployment)
  - Modal.com handles Python GPU containers for embeddings
- **Component Development**: Storybook 10.1.11
  - Why: Isolated component testing, mock auth states, viewport testing
  - Framework: @storybook/nextjs-vite (supports Next.js 16 + React 19)
  - Addons: essentials, a11y, docs, interactions
  - Dev Server: http://localhost:6006
  - Integration: Complete with Tailwind CSS + editorial fonts

### Specialized Tools
- **Image Processing**: Sharp (Node.js)
  - Why: Fast, good quality, supports WebP
  - Use: Resize + format conversion before Supabase Storage upload
- **Web Scraping**:
  - Cheerio (static HTML parsing)
  - Puppeteer (dynamic sites, artist roster pages)
- **Instagram Scraping**: Apify managed service
  - Why: Legal grey area → use managed service with rotating IPs
  - Cost: ~$20-40 per city
- **GPU Inference**: Modal.com (Python serverless functions)
  - Why: Pay-per-second A10G GPU, no infra management
  - Use: Generate CLIP embeddings for images + text queries

---

## Architecture Decisions

### Database Design

**Schema Overview:**
```sql
-- Core tables (MVP)
artists                 # Artist profiles (400-600 rows)
portfolio_images        # Instagram images with embeddings (8k-12k rows)
searches                # Search session storage (temporary)
scraping_jobs           # Track Instagram scraping progress
style_seeds             # Seed images for SEO landing pages (10 rows)

-- Future tables (post-MVP, created now for RLS setup)
users                   # Supabase Auth users
saved_artists           # User bookmarks (many-to-many)
```

**Key Decisions:**
1. **IVFFlat over HNSW**: Better for 10k+ vectors, faster build, good recall with tuning
2. **Deferred Index Creation**: Create vector index AFTER data load with optimal parameters (not on empty table)
3. **Normalized Schema**: Artists separate from portfolio images (many-to-one)
4. **Future-Proof Columns**: `claimed_by_user_id`, `verification_status`, `bio_override` in `artists` table (ready for post-MVP)
5. **Instagram ID Tracking**: Store `instagram_id` (user ID) during discovery for OAuth matching
6. **Complete RLS Policies**: 15 policies across 5 tables (public read + service role writes for artists/portfolio_images)
7. **Database Validation**: CHECK constraints for enums, URLs, email format, non-negative counts
8. **Type Safety**: Generated TypeScript types + Zod validation for multi-layer safety
9. **Automatic Triggers**: updated_at triggers eliminate manual timestamp management

**Vector Index Configuration:**
```sql
-- ✅ DEFERRED until after data load (see supabase/migrations/20251229_008_defer_ivfflat_index.sql)

-- For MVP (<1000 images) - Use HNSW:
CREATE INDEX CONCURRENTLY idx_portfolio_embeddings ON portfolio_images
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- For Production (1000-100k images) - Use IVFFlat:
CREATE INDEX CONCURRENTLY idx_portfolio_embeddings ON portfolio_images
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = GREATEST(FLOOR(SQRT(COUNT(*))), 10));

-- Rule: lists = sqrt(total_rows)
-- For 10k images: lists = 100
-- For 100k images: lists = 316
```

**Search Function:**
- `search_artists_by_embedding()`: ✅ Optimized Postgres function (see migration 007)
- Returns: Top 20 artists with top 3 matching images each
- Filters: City, similarity threshold (0.15)
- **Similarity Score Display:** Raw CLIP scores (0.15-0.40) rescaled to 60-95% for UI
  - See: `/memory-bank/architecture/decision-similarity-scoring.md`
  - Ranking uses raw scores, display uses rescaled percentages
- Performance Optimizations:
  - Early city filtering (reduces dataset before vector ops)
  - CTE-based query planning
  - Efficient limiting and pagination
  - Partitioned by artist_id, ranked by similarity

### API Design

**Endpoints:**
```
POST /api/search
  - Accepts: { type: 'image' | 'text' | 'hybrid', image?: File, query?: string, city?: string }
  - Generates CLIP embedding (image or text)
  - Stores in `searches` table
  - Returns: { searchId: string }

GET /api/search/[searchId]
  - Fetches embedding from `searches` table
  - Runs vector similarity search
  - Returns: { artists: [...], query_type: string }

POST /api/saved-artists (POST-MVP)
  - Requires auth
  - Body: { artistId: string }
  - Inserts to `saved_artists` table (RLS enforced)

DELETE /api/saved-artists/[id] (POST-MVP)
  - Requires auth
  - Deletes from `saved_artists` table

POST /api/claim-profile (POST-MVP)
  - Requires auth (Instagram OAuth)
  - Matches user's Instagram ID to artist.instagram_id
  - Sets verification_status = 'pending'
```

**Design Principles:**
- Server-side rendering for SEO pages (artists, cities, styles)
- Client-side fetching only for search results (dynamic)
- Streaming responses for large result sets (future optimization)
- Rate limiting: Vercel edge functions (post-MVP)

### Security Considerations

**Authentication & Authorization:**
- MVP: No auth required for public pages (fully public)
- ✅ RLS Policies: 15 policies across 5 tables (production-ready)
  - Public read access for artists/portfolio_images
  - Service role-only writes (scraping scripts)
  - User-scoped access for saved_artists/searches (post-MVP)
  - Claimed artists can manage own profiles
- Post-MVP: Supabase Auth with Instagram OAuth
  - JWT tokens in httpOnly cookies
  - Server-side auth checks via `@supabase/ssr`

**Data Security:**
- ✅ Environment variables for all secrets (`.env.local`, Vercel env vars)
  - Zod validation catches missing/invalid env vars at startup
- ✅ Supabase RLS policies (complete, production-ready)
- ✅ Database validation constraints (CHECK, NOT NULL, FK)
- ✅ TypeScript type safety (generated from database schema)
- Instagram OAuth: Only request `user_profile` and `user_media` scopes (post-MVP)
- No PII collection in MVP (no user accounts)

**API Security:**
- CORS: Restrict to own domain in production
- Rate limiting: Vercel edge functions (post-MVP)
- Input validation: Zod schemas for all API inputs
- Image upload: File size limit (10MB), format validation (jpg, png, webp)

**Legal/Compliance:**
- Fair use: Transformative search indexing (not redistribution)
- Attribution: Instagram URLs preserved in database
- DMCA: Artist claiming enables takedown control
- Privacy: No tracking cookies in MVP (GA4 post-MVP with consent)

### Performance Considerations

**Database Optimization:**
- IVFFlat index tuning: `lists` parameter scales with data size
- City filtering: Index on `artists.city` reduces search space
- Connection pooling: Supabase Pooler for serverless functions
- Query optimization: Avoid N+1 with joins, use `jsonb_agg` for images

**Caching Strategy:**
- **Redis Caching** (Jan 3, 2026): Application-level caching for dynamic data
  - **Analytics**: 30-minute TTL (ensures consistent dashboard data during viewing sessions)
  - **Admin Stats**: 5-minute TTL (reduces database load, acceptable staleness)
  - **Pattern-based invalidation**: Smart cache clearing on data updates
  - **Metrics tracking**: Hit/miss rates, performance timing, Redis health monitoring
  - **Admin endpoint**: `GET /api/admin/redis/stats` for observability
- **ISR (Incremental Static Regeneration)**: 24h revalidation for artist/city pages
  - Why: Content changes slowly (daily Instagram scrapes)
  - Fallback: Stale-while-revalidate (serve cached, rebuild in background)
- **Edge Caching**: Vercel CDN for static assets (CSS, JS)
- **Image CDN**: Supabase Storage CDN for portfolio images (global delivery)
- **Database Caching**: Supabase read replicas (post-MVP for scaling)

**Image Optimization:**
- WebP format (85% quality, ~70% smaller than JPEG)
- Three sizes: 320w (mobile), 640w (tablet), 1280w (desktop)
- Next.js Image component: Lazy loading, blur placeholders, responsive `srcset`
- Supabase Storage CDN: Global edge caching (<100ms latency)

**Bundle Optimization:**
- Code splitting: Dynamic imports for heavy components (search, image upload)
- Tree shaking: Import only used utilities (lodash-es, date-fns)
- Target: <200KB first load JS (Next.js default is ~250KB)
- Font optimization: Next.js Font API (self-host Google Fonts)

**Vector Search Optimization:**
- Target: <500ms for vector similarity search
- Strategies:
  1. IVFFlat index (faster than brute force)
  2. City filtering (reduces search space by 50%)
  3. Similarity threshold (default 0.7, filters low matches)
  4. Limit results (20 artists max per query)
  5. Pagination offset (don't re-compute for page 2+)
- Monitoring: Log query times, alert if >1s

**Monitoring & Observability:**
- ✅ **Vercel Analytics** (Installed Jan 3, 2026)
  - Page views and Web Vitals tracking
  - Integrated in root layout (`app/layout.tsx`)
  - No configuration required (auto-enabled on Vercel deployments)
- Post-MVP:
  - Sentry (error tracking)
  - Custom metrics: Search latency, embedding generation time
  - Database: Supabase dashboard (query performance, connection pool)

---

## Dependencies

### Production Dependencies
```json
{
  "@supabase/ssr": "^0.x",                    // ✅ Supabase client for Next.js App Router
  "@vercel/analytics": "^1.x",                // ✅ Vercel Analytics for page views & Web Vitals
  "sharp": "^0.33.x",                         // Image processing - Phase 2
  "openai": "^4.x",                           // CLIP embeddings (or alternative) - Phase 2
  "zod": "^3.x",                              // ✅ Schema validation (env vars)
  "next": "^15.5.x",                          // ✅ Framework (App Router)
  "react": "^19.x",                           // ✅ UI library
  "react-dom": "^19.x",                       // ✅ DOM renderer
  "tailwindcss": "^3.x",                      // ✅ Styling
  "zustand": "^4.x"                           // State management (post-MVP)
}
```

**✅ = Currently installed and configured**

### Development Dependencies
```json
{
  "typescript": "^5.x",                       // Type checking
  "@types/node": "^20.x",                     // Node types
  "@types/react": "^18.x",                    // React types
  "eslint": "^8.x",                           // Linting
  "eslint-config-next": "^14.x",              // Next.js ESLint config
  "eslint-plugin-storybook": "^0.x",          // Storybook linting rules
  "prettier": "^3.x",                         // Code formatting
  "prettier-plugin-tailwindcss": "^0.5.x",    // Tailwind class sorting
  "storybook": "^10.1.11",                    // Component development
  "@storybook/nextjs-vite": "^10.1.11",       // Next.js 16 integration
  "@chromatic-com/storybook": "^3.x",         // Chromatic addon
  "@storybook/addon-a11y": "^10.1.11"         // Accessibility testing
}
```

### External Services (API Keys Required)
- Supabase (free tier with 100GB storage, no card required)
- OpenAI API or alternative (for CLIP embeddings)
- Google Places API ($200/month free credit)
- DataForSEO (pay-per-query, ~$1-2 per city)
- Apify (pay-per-usage, ~$20-40 per city)
- Modal.com (pay-per-second GPU, ~$0.30 per city)
- Vercel (hobby tier free)

---

## Environment Configuration

### Local Development (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# CLIP Embedding - Hybrid Configuration (Jan 1, 2026)
LOCAL_CLIP_URL=https://clip.inkdex.io          # Local A2000 GPU (10.2.20.20 on Proxmox)
CLIP_API_KEY=your-api-key-here                  # API key for local GPU authentication
LOCAL_CLIP_TIMEOUT=5000                         # 5s timeout before Modal fallback
MODAL_FUNCTION_URL=https://xxx.modal.run        # Modal.com fallback endpoint
PREFER_LOCAL_CLIP=true                          # Try local GPU first
ENABLE_MODAL_FALLBACK=true                      # Use Modal if local fails
NEXT_PUBLIC_ENABLE_WARMUP=false                 # Disabled (local GPU has no cold starts)

# OpenAI (for GPT-5-nano image classification only)
OPENAI_API_KEY=sk-...

# Google APIs
GOOGLE_PLACES_API_KEY=AIzaSy...

# DataForSEO (Phase 0 - DONE)
DATAFORSEO_LOGIN=your-email
DATAFORSEO_PASSWORD=your-password

# Supabase Storage (uses same Supabase credentials above)
# No additional environment variables needed

# Instagram OAuth (for post-MVP)
INSTAGRAM_CLIENT_ID=xxx
INSTAGRAM_CLIENT_SECRET=xxx

# Analytics (post-MVP)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Production (Vercel Environment Variables)
- Same as above, but `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- `NODE_ENV=production` (auto-set by Vercel)
- All secrets stored in Vercel dashboard (encrypted)

---

## Deployment Architecture

### Hosting & Infrastructure
```
Frontend (Next.js)
  ├─ Vercel Edge Network (global CDN)
  ├─ ISR: 24h revalidation (artist/city/style pages)
  └─ API Routes: Serverless functions (search endpoint)

Database (Supabase)
  ├─ PostgreSQL + pgvector
  ├─ Connection pooling (Supabase Pooler)
  └─ Auto-backups (daily)

Image Storage (Supabase Storage)
  ├─ Integrated object storage (100GB free tier)
  ├─ Built-in CDN (global edge caching)
  └─ RLS policies for security

Embeddings (Modal.com)
  ├─ Serverless Python functions
  ├─ A10G GPU (on-demand, pay-per-second)
  └─ OpenCLIP ViT-L-14 model
```

### Deployment Flow
1. **Code Push**: Git push to `main` branch
2. **Build**: Vercel auto-builds Next.js (static pages + serverless functions)
3. **Deploy**: Atomic deployment (zero downtime)
4. **Invalidate Cache**: ISR revalidation on next request
5. **Rollback**: Instant rollback via Vercel dashboard (if needed)

### Data Pipeline Deployment
```
Scripts (Node.js + Python)
  ├─ Run locally or on server (not Vercel)
  ├─ Google Maps discovery → Supabase
  ├─ Instagram scraping → Supabase Storage + Database
  ├─ Embedding generation (Modal.com) → Supabase
  └─ Scheduled re-scraping: Cron job (post-MVP)
```

### Monitoring & Alerts
- **Vercel Analytics**: Page views, Web Vitals, errors
- **Supabase Dashboard**: Database performance, connection pool
- **Sentry** (post-MVP): Error tracking, performance monitoring
- **Custom Alerts** (post-MVP): Search latency >1s, embedding errors

---

## Alternative Considerations & Trade-offs

### Why Not X?

**Pinecone/Weaviate/Qdrant (vector databases)?**
- ❌ More expensive ($70+/month for managed)
- ❌ Additional service to manage
- ✅ pgvector: Same database, simpler stack, Supabase handles it

**HNSW indexing instead of IVFFlat?**
- ❌ HNSW: Slower build time, more memory, better for <10k vectors
- ✅ IVFFlat: Faster build, good recall with tuning, scales to 100k+

**Vercel Blob or Cloudflare R2 instead of Supabase Storage?**
- ❌ Vercel Blob: More expensive, separate service
- ❌ Cloudflare R2: Separate service, additional complexity
- ✅ Supabase Storage: Integrated with database, RLS policies, built-in CDN, included in plan

**Firebase instead of Supabase?**
- ❌ Firebase: No pgvector, NoSQL (harder for relational data)
- ✅ Supabase: Postgres, pgvector, auth built-in, better DX

**Replicate.com instead of Modal.com for embeddings?**
- ❌ Replicate: Higher cost per inference, slower cold starts
- ✅ Modal: Pay-per-second, faster, better Python DX

**Self-hosted Instagram scraping instead of Apify?**
- ❌ Self-hosted: Rate limit risk, IP bans, legal grey area
- ✅ Apify: Managed IPs, legal compliance, reliable

---

## Future Architecture Considerations

### Scaling to 10+ Cities (100k+ Images)
1. **Database**: Upgrade Supabase to Pro ($25/mo), increase `lists` to 316 for IVFFlat
2. **Image Storage**: Supabase Storage scales automatically (Pro plan: 100GB included, $0.021/GB beyond)
3. **Embedding Generation**: Modal.com scales to millions of images (pay-per-second)
4. **Caching**: Add Redis for search result caching (hot queries)
5. **CDN**: Supabase Storage CDN already global, no changes needed

### Post-MVP Features (Weeks 9-12)
1. **User Authentication**: Enable Supabase Auth UI, Instagram OAuth flow
2. **Saved Artists**: Expose `saved_artists` table, RLS enforced
3. **Artist Dashboard**: Protected routes (`/dashboard`), server-side auth checks
4. **Hybrid Search**: Combine image + text embeddings (weighted average)

### Future Optimizations (Months 3-6)
1. **Batch Embeddings**: Pre-compute embeddings for common text queries ("fine line", "traditional")
2. **Search Result Caching**: Redis cache for hot searches (TTL 1h)
3. **Read Replicas**: Supabase read replicas for scaling (separate read/write)
4. **Edge Functions**: Move search API to Vercel Edge (lower latency)

---

## References & Documentation

### Official Docs
- [Next.js 14 App Router](https://nextjs.org/docs)
- [Supabase PostgreSQL + pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [OpenCLIP Models](https://github.com/mlfoundations/open_clip)
- [Modal.com Python Functions](https://modal.com/docs)

### Internal Docs
- [Implementation Plan](../projects/tattoo-discovery-implementation-plan.md)
- [Database Schema](../projects/tattoo-discovery-implementation-plan.md#database-schema-updated-for-future-proofing)
- [Search UX Strategy](../projects/search-ux-strategy.md)
- [Architecture Patterns](./patterns.md) - **Inherited from DDD project**
- [City Analysis Results](../development/activeContext.md#launch-city-selection-results)
- [Architecture Decision: Modal Container Warmup](./decision-modal-warmup.md) - **Dec 31, 2025**
- [Architecture Decision: Image Filtering](./decision-image-filtering.md) - **Dec 29, 2025**

### Tutorials & Guides
- [pgvector + Supabase Tutorial](https://supabase.com/blog/openai-embeddings-postgres-vector)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [CLIP Embeddings Explained](https://openai.com/research/clip)
- [IVFFlat vs HNSW Comparison](https://github.com/pgvector/pgvector#indexing)

---

**Last Review:** 2026-01-03 (Admin panel complete)
**Next Review:** After Phase 9 (Stripe subscription integration)
