---
Last-Updated: 2026-01-05
Maintainer: RB
Status: Production Ready
---

# Progress Log: Inkdex

## Platform Metrics

| Metric | Value |
|--------|-------|
| Cities | 116 |
| States | 51 (50 states + DC) |
| Artists | 15,626 |
| Images | 68,440 (with embeddings) |
| Styles | 20 |
| Static Pages | ~3,500+ |
| SEO Content | ~155,000 words |

## Recent Completions

### Jan 5, 2026 (Session 13)
- **Style System Expansion** - Added 3 new styles, total now 20
  - **New Styles Added:**
    - `anime` - Japanese animation characters (Naruto, Dragon Ball, etc.) - 7 seed images
    - `horror` - Dark/macabre imagery, horror movie icons - 11 seed images
    - `stick-and-poke` - Hand-poked DIY aesthetic - 6 seed images
  - **Style Removed:**
    - `ignorant` - Removed due to 45% overlap with stick-and-poke (too similar in CLIP embedding space)
  - **Averaged Embeddings:**
    - Each style now uses averaged CLIP embedding from multiple seed images
    - Better represents style diversity vs single seed image
    - L2-normalized centroid for cosine similarity
  - **Tagging Results (68,440 images):**
    - blackwork: 28,006 (40.9%)
    - stick-and-poke: 18,139 (26.5%)
    - illustrative: 17,871 (26.1%)
    - horror: 12,976 (19.0%)
    - anime: 5,222 (7.6%)
  - **Artist Profiles:** 75,153 style profiles for 7,845 artists
  - **Files Modified:**
    - `scripts/styles/generate-averaged-seeds.ts` - Added new style definitions
    - `scripts/styles/upload-seed-images.ts` - Added new style definitions
    - `scripts/style-seeds/style-seeds-data.ts` - Added new style entries

### Jan 4, 2026 (Session 12)
- **Phase 9 Complete** - Stripe subscription integration
  - **Packages:** stripe, @stripe/stripe-js (v20.1.0)
  - **API Endpoints:**
    - `POST /api/stripe/create-checkout` - Creates Stripe Checkout session with user/artist metadata
    - `POST /api/stripe/webhook` - Handles subscription lifecycle events
    - `POST /api/stripe/portal` - Redirects to Stripe Customer Portal for billing management
  - **Webhook Events Handled:**
    - `checkout.session.completed` → Sets `is_pro=true`, creates subscription record
    - `customer.subscription.updated` → Syncs status changes
    - `customer.subscription.deleted` → Downgrades artist (hides images >20, removes pins)
    - `invoice.payment_failed` → Sets status to `past_due`
  - **UI Components:**
    - `/dashboard/subscription` page with plan selection (Monthly $15, Yearly $150)
    - `SubscriptionManager` component (upgrade flow for free, billing management for Pro)
    - `CompactUpgradeOverlay` updated to link to subscription page
  - **Files Created:**
    - `lib/stripe/server.ts` - Server-side Stripe client + price IDs
    - `lib/stripe/client.ts` - Client-side Stripe loader
    - `app/api/stripe/create-checkout/route.ts`
    - `app/api/stripe/webhook/route.ts`
    - `app/api/stripe/portal/route.ts`
    - `app/dashboard/subscription/page.tsx`
    - `components/dashboard/SubscriptionManager.tsx`
  - **Testing:** Stripe CLI for local webhook forwarding (`stripe listen`)
  - **Production Setup Required:**
    - Add env vars to Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
    - Create webhook in Stripe Dashboard → `https://inkdex.io/api/stripe/webhook`
    - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Jan 4, 2026 (Session 11)
- **Search Performance Overhaul** - Fixed critical performance issues
  - **GDPR Column Optimization:**
    - Added `is_gdpr_blocked` column to `artists` table
    - Replaced expensive `NOT EXISTS` subquery (checked every artist against EU locations) with simple column check
    - Created `supabase/functions/gdpr_setup.sql` for one-time column setup + backfill
    - Indexes: `idx_artists_gdpr_blocked`, `idx_artists_not_gdpr_blocked`
  - **Query Reordering (2900ms → ~200ms):**
    - **Before:** Filter 15k artists → join to 50k images → vector search (couldn't use index)
    - **After:** Vector search first (top 500 images, uses IVFFlat index) → get ~100 candidate artists → filter those
    - Both `search_artists_by_embedding` and `search_artists_with_count` rewritten
  - **Consolidated Search Functions:**
    - Created `supabase/functions/search_functions.sql` as single source of truth
    - Contains all 7 search functions with consistent patterns
    - **Rule:** Never create migrations that rewrite search functions - edit this file instead
    - Previous migrations kept overwriting each other and breaking search
  - **Code Review Fixes:**
    - Added `location_count` to `find_related_artists`
    - Fixed CTE aliasing (fa_, ri_, aa_, ba_ prefixes)
    - Added input validation to `get_state_cities_with_counts`
  - **Files created:**
    - `/supabase/functions/search_functions.sql` - consolidated search functions
    - `/supabase/functions/gdpr_setup.sql` - one-time GDPR column setup
  - **Documentation:**
    - Updated CLAUDE.md with search function rule
    - Updated operations.md with "Search Functions - SINGLE SOURCE OF TRUTH" section

### Jan 4, 2026 (Session 10)
- **50-State Coverage Complete** - Final 9-state expansion (Batch 5)
  - **States Added:** Delaware, Mississippi, Montana, New Hampshire, New Jersey, North Dakota, South Dakota, West Virginia, Wyoming
  - **Cities Added (20):**
    - DE: Wilmington
    - MS: Jackson, Biloxi
    - MT: Missoula, Bozeman, Billings
    - NH: Portsmouth, Manchester
    - NJ: Jersey City, Hoboken, Asbury Park, Atlantic City
    - ND: Fargo, Bismarck
    - SD: Sioux Falls, Rapid City
    - WV: Charleston, Morgantown
    - WY: Jackson, Cheyenne
  - **DataForSEO Analysis:**
    - All 27 candidate cities scored 82-84/100 (HIGH priority)
    - 246k-258k monthly searches per city
    - 0/100 keyword difficulty (extremely easy to rank)
    - 3-15% competition (very low)
  - **Artist Discovery (Tavily):**
    - 1,319 new artists discovered
    - NJ led with 284 artists, NH with 230
    - Platform total: 14,307 → 15,626 artists
    - Estimated cost: ~$59 (20 cities × $2.95/city)
  - **SEO Editorial Content:**
    - 20 new city pages with GPT-4.1 generated content
    - ~20,000 words added to editorial content
    - Platform total: 96 → 116 cities with editorial content
    - Cost: ~$0.40 (20 cities × $0.02/city)
  - **Files Updated:**
    - `/lib/constants/cities.ts` - Added 20 cities + 9 states
    - `/lib/content/editorial/cities.ts` - 20 new city editorial entries
    - Fixed 3 syntax errors (stray commas) in editorial content
  - **Result:** Platform now covers all 50 US states + DC

### Jan 4, 2026 (Session 9)
- **96-City Expansion Complete** - Scaled from 8 to 96 cities (12x growth)
  - **Batch 1 (13 cities):**
    - Cities: Richmond, Asheville, Charlotte, Philadelphia, Columbus, Salt Lake City, Nashville, San Francisco, Phoenix, Las Vegas, San Diego, San Antonio, Tampa
    - Discovery: 1,941 artists via Tavily API (~59 queries/city)
    - Opportunity scores: 77-84/100
    - Cost: ~$38.35
  - **Batch 2 (25 cities):**
    - Cities: Kansas City, New Orleans, Detroit, Providence, Charleston, Albuquerque, El Paso, Baltimore, Buffalo, Minneapolis, Tucson, Savannah, Pittsburgh, Boulder, Cincinnati, Cambridge, Raleigh, St. Louis, Cleveland, Milwaukee, Eugene, Memphis, Louisville, Madison, Ann Arbor
    - Discovery: 2,800 artists via Tavily API
    - Opportunity scores: 79-85/100
    - Cost: ~$73.75
  - **Batch 3 (25 cities):**
    - Cities: Athens, Chapel Hill, Fayetteville, Spokane, Tacoma, Durham, Rochester, Omaha, Santa Fe, Jacksonville, Indianapolis, Oklahoma City, Sacramento, Honolulu, Fresno, Mesa, Oakland, Wichita, Knoxville, Boise, Fort Collins, Des Moines, Syracuse, Greenville, Olympia
    - Discovery: 2,556 artists via Tavily API
    - Opportunity scores: 74-84/100
    - Cost: ~$73.75
  - **Batch 4 (25 cities):**
    - Cities: Virginia Beach, Tulsa, Reno, Springfield, Iowa City, Bloomington, New Haven, Baton Rouge, Columbia, Bend, Ithaca, Lexington, Lincoln, Anchorage, Burlington, Charlottesville, Birmingham, Washington DC, Wilmington, Boston, Fort Worth, Houston, Colorado Springs, Dallas, Portland ME
    - Discovery: 2,343 artists via Tavily API
    - Opportunity scores: 77-84/100
    - Cost: ~$73.75
    - Added 6 new states: Vermont, Connecticut, Alabama, Maine, Alaska, DC
  - **Total Results:**
    - 88 new cities, 9,640 new artists discovered
    - Total discovery cost: ~$238.50
    - Platform grew from 3,553 → 14,307 artists (4x growth)
- **SEO Editorial Content Generation** - GPT-4.1 city guides
  - **Implementation:**
    - Created `/scripts/seo/generate-city-content.ts` - automated SEO generation
    - Uses GPT-4.1 Turbo (`gpt-4-turbo-2024-04-09`) with JSON output mode
    - Parallel batch processing: 50 cities at once (Tier 5 OpenAI rate limits)
    - Query caching to prevent duplicate API calls
  - **Content Generated:**
    - 88 cities × 800-1000 words each = ~70,000+ words
    - Hero paragraphs (local scene overview)
    - Scene descriptions (neighborhoods, geography, culture)
    - Community insights (artist dynamics, pricing, booking)
    - Popular styles (city-specific trends)
    - SEO keywords for each city
  - **Quality:**
    - City-specific neighborhoods (e.g., Boston: Allston, South Boston, Cambridge)
    - Cultural context (e.g., Dallas: Deep Ellum, Bishop Arts, economic boom)
    - Realistic artist insights (pricing tiers, booking windows)
  - **Performance:**
    - First attempt: 5-10 minutes (5 cities/batch) → wasted ~$3
    - Fixed approach: <2 minutes (50 cities/batch)
    - Error handling: Promise.allSettled for graceful failures
    - File write regex bug fixed after 2 failed runs
  - **Cost:** ~$1.74 (87 cities × $0.02/city, 1 test city already done)
  - **Result:** 97 cities now have full editorial content (8 original + 89 generated including Richmond test)
  - **Files:**
    - `/scripts/seo/generate-city-content.ts` - 292 lines
    - `/lib/content/editorial/cities.ts` - expanded from 330 → 3,676 lines
- **Commits:**
  - `92d7e94` - feat(seo): generate editorial content for 88 cities using GPT-4.1
  - `9d2d19c` - feat: expand platform to 96 cities across 44 states (Batches 1-4)

### Jan 4, 2026 (Session 8)
- **Pro artist boosting display fix** - Transparency improvement for ranking boosts
  - **Problem:** Pro artists ranked higher but displayed lower percentages than regular artists
    - SQL ranked by `boosted_score` (raw + boosts) but returned `best_similarity` (unboosted)
    - Example: Pro at 0.28 raw (+0.05 boost = 0.33 ranking) showed 72%, regular at 0.29 showed 74%
  - **Solution:** Return `boosted_score` for display, adjust UI rescaling to [0.15, 0.47] range
  - **Files modified:**
    - `/supabase/migrations/20260111_005_return_boosted_score_for_display.sql` - 2 line changes in search functions
    - `/components/search/ArtistCard.tsx` - MAX_CLIP: 0.40 → 0.47
  - **Impact:** Displayed percentages now match ranking order (Pro at 76% ranks above regular at 73%)
  - **Documented in:** `/memory-bank/architecture/techStack.md` (Search Function section)

### Jan 3, 2026 (Session 7)
- **Redis caching infrastructure** - Production-ready distributed caching
  - **Core utilities:**
    - `/lib/redis/types.ts` - TypeScript interfaces for type safety
    - `/lib/redis/cache.ts` - Core caching layer with fail-open design
    - `/lib/redis/metrics.ts` - Observability layer (hit/miss tracking, health checks)
    - `/lib/redis/invalidation.ts` - Smart cache clearing helpers
  - **Rate limiting migration:**
    - Admin login: Migrated from in-memory Map to Redis sliding window (5/minute)
    - Bulk featured operations: Migrated to Redis (5/minute per admin)
    - Sliding window algorithm using Redis sorted sets (accurate across serverless instances)
  - **Analytics caching:**
    - 30-minute TTL for summary/topImages/timeSeries queries
    - Ensures consistent dashboard data during Pro user viewing sessions
    - Separate cache keys for partial cache hits (summary vs top images vs time series)
  - **Admin dashboard caching:**
    - 5-minute TTL for dashboard statistics
    - Reduces database load from 7 parallel COUNT queries
  - **Security hardening:**
    - Fixed rate limiter race condition (check-then-add pattern)
    - Cache key injection prevention (colon sanitization)
    - Admin endpoint input validation (pattern whitelist)
    - Metrics flush race condition prevention (isFlushing flag)
  - **Admin metrics endpoint:** `GET /api/admin/redis/stats`
    - Returns: health (latency, memory, uptime), metricsByPattern, totalMetrics
    - Admin-only access with whitelist validation
  - **Architecture:**
    - Fail-open design (system works if Redis unavailable)
    - Fire-and-forget cache writes (non-blocking)
    - Pattern-based invalidation using SCAN (production-safe)
    - In-memory metrics aggregation with 10-second batch flush
    - Generic getCached<T>() for type-safe caching
  - **Files created:** 4 core utilities + 1 admin API endpoint
  - **Files modified:** 4 API routes migrated to Redis
  - **Commit:** `8da7635` - Security fixes and caching infrastructure

### Jan 3, 2026 (Session 6)
- **13-City Expansion Research** - DataForSEO market analysis complete
  - **Cities Analyzed:** 13 mid-tier markets (artsy, growing metros, tourism cities)
  - **All High Priority:** Every city scored 77-84/100 (exceptional opportunity)
  - **Tier 1 (Lowest Competition 11-14%):**
    - Richmond, VA: 84/100, 254k searches, 13% competition
    - Asheville, NC: 84/100, 250k searches, 11% competition (best ratio)
    - Charlotte, NC: 84/100, 256k searches, 14% competition
  - **Tier 2 (Strong Mid-Market 22-42%):**
    - Philadelphia, PA: 82/100, 255k searches, 27% competition
    - Columbus, OH: 81/100, 252k searches, 25% competition
    - Salt Lake City, UT: 81/100, 251k searches, 22% competition
    - Nashville, TN: 80/100, 266k searches, 38% competition
    - San Francisco, CA: 80/100, 254k searches, 42% competition
  - **Tier 3 (High Volume 297k-317k searches):**
    - Phoenix, AZ: 79/100, 317k searches (highest demand), 45% competition
    - Las Vegas, NV: 80/100, 297k searches, 42% competition
    - San Diego, CA: 77/100, 266k searches, 55% competition
    - San Antonio, TX: 79/100, 259k searches, 36% competition
    - Tampa, FL: 78/100, 258k searches, 41% competition
  - **Key Findings:**
    - All cities: 0 keyword difficulty (easy to rank)
    - Visual search gap exists in all markets
    - 250k-317k monthly searches per city
    - Local shop competition only (no strong directories)
  - **Cost:** ~$2-3 in DataForSEO API credits
  - **Report:** Saved to `data/city-analysis-report.json`
  - **Memory Bank:** Updated quickstart.md and activeContext.md with expansion plan

### Jan 3, 2026 (Session 5)
- **Admin Pipeline Control complete** - Full UI for managing content pipeline
  - **Pipeline Dashboard** (`/admin/pipeline`):
    - Stats overview: total artists, need scraping, total images, failed jobs
    - 3-column stage cards: Need Images, Need Embeddings, Searchable
    - Trigger buttons for each pipeline stage (Scrape, Generate Embeddings, Rebuild Index)
    - Scraping jobs summary with retry failed button
    - Recent pipeline runs table with expandable details
  - **Security hardening:**
    - Zod validation schemas for all API endpoints
    - CSRF protection via origin header checking
    - Rate limiting: 10 triggers/hour, 5 retries/hour per admin
    - Audit logging for pipeline.trigger and pipeline.retry actions
    - Environment variable filtering for child processes
    - Process timeout (2 hour max with SIGTERM→SIGKILL)
  - **Race condition prevention:**
    - Partial unique index on `(job_type) WHERE status IN ('pending', 'running')`
    - Atomic `create_pipeline_run` RPC function
    - Proper error handling for duplicate job attempts
  - **UX improvements:**
    - Confirmation dialogs before expensive operations (ConfirmDialog component)
    - Progress tracking in pipeline_runs table
    - Embedding coverage bar on main dashboard
    - "Manage" link from dashboard to pipeline page
  - **Database:** `pipeline_runs` table + unique constraint migration
  - **Files created:** 6 API routes, 3 components, 2 lib files, 2 migrations
  - **Design aligned:** Matches MiningDashboard patterns (icons, spacing, tables)

### Jan 3, 2026 (Session 4)
- **Phase 10 improvements complete** - Email system hardening + compliance
  - **Email rate limiting:** Database-backed per-recipient limits (prevents abuse, respects Resend free tier)
    - welcome: 5/hour, 10/day | sync_failed: 3/hour, 10/day | subscription_created: 5/hour, 20/day
    - Fail-open design: Allows send if rate limit check fails (prevents blocking on DB issues)
  - **Email delivery logging:** Comprehensive audit trail in `email_log` table
    - Tracks: recipient, user_id, artist_id, email_type, subject, success/failure, resend_id
    - Context resolution: Auto-lookup user_id/artist_id from email address
    - GDPR compliant: 90-day retention via `cleanup_old_email_logs()` function
  - **Unsubscribe mechanism:** CAN-SPAM, GDPR, CASL compliant
    - Public page: `/unsubscribe?email=user@example.com`
    - Database tracking: `email_preferences` table with per-type toggles
    - Preference checks: `can_receive_email()` function before each send
    - One-click unsubscribe (no login required)
  - **Input validation:** Zod schemas replace weak `.includes('@')` validation
    - Test endpoint: Email format, type enum validation
    - All email functions: Input sanitization, XSS prevention
  - **Unsubscribe links:** Added to all 4 email template footers
    - Templates updated: welcome, sync-failed, subscription-created, downgrade-warning
    - Dynamic URL generation: `EMAIL_CONFIG.unsubscribeUrl(to)`
  - **Security fixes:**
    - Removed exposed API key from README
    - Added RESEND_API_KEY to .env.example
    - Service role isolation (no public access to email functions)
  - **Files created:** 8 new files (migration, rate limiter, logger, unsubscribe page/form/API)
  - **Files modified:** 7 files (resend.ts, test endpoint, 4 templates, index.ts)
  - **Documentation:** Comprehensive guide in `phase-10-suggested-improvements.md`
  - **Production ready:** TypeScript passing, migration applied, all compliance features working

### Jan 3, 2026 (Session 3)
- **Phase 8 complete** - Legal pages (terms, privacy, about, contact)
  - **4 pages created:** /about, /contact, /legal/terms, /legal/privacy
  - **LegalPageLayout component:** Reusable layout with sections
  - **Comprehensive content:**
    - Terms of Service: 1,700+ words, no-refund policy, subscription terms, DMCA
    - Privacy Policy: 1,500+ words, GDPR/CCPA compliant, user rights
    - About: Platform overview, mission, how it works
    - Contact: Support email, response times
  - **Footer updated:** Company section with legal links
  - **Stripe-ready:** All required legal pages for checkout compliance
- **Phase 10 initial implementation** - Email notifications via Resend
  - **Resend integration:** API configured, React Email templates
  - **4 email types:** welcome, sync_failed, subscription_created, downgrade_warning
  - **Welcome email:** Sent after onboarding completion
  - **Sync failure emails:** Sent after 2+ consecutive failures, automatic re-auth detection
  - **Test infrastructure:** /api/dev/test-email endpoint + npm run test-emails script
  - **Pending:** Downgrade warning (7 days before), subscription created (Stripe webhook integration)
- **Documentation update:** User-artist-account-implementation.md reorganized
  - Clear status summary: 12/14 phases complete (86%)
  - Phase completion details added for Phase 8 and Phase 10
  - Only 2 phases remaining: Stripe (Phase 9) and Analytics (Phase 13)

### Jan 3, 2026 (Session 2)
- **Phase 14 complete** - Admin panel with magic link auth
  - **Authentication:**
    - Magic link auth via Supabase `generateLink()` API
    - Email whitelist: rbaten@gmail.com, gr0x01@pm.me
    - Route group architecture: `(authenticated)` separates login from protected routes
    - URL hash token parsing with `setSession()` for auth callback
  - **Mining Dashboard** (`/admin/mining`):
    - Stats cards: running/completed/failed jobs, total artists/images
    - Conversion funnel visualization (scraped → passed bio → classified → inserted)
    - City distribution bar chart
    - Live Apify/OpenAI billing (5-minute cache)
    - Mining runs table with status badges, errors expansion
  - **Featured Artists** (`/admin/artists`):
    - Search by name/handle with SQL injection protection
    - Filters: city dropdown, is_pro toggle, is_featured toggle
    - Individual toggle switch per artist
    - Bulk feature/unfeature with checkbox selection
    - Pagination controls
  - **Security hardening:**
    - SQL injection: PostgREST escaping (`%`, `_`, `\`, `,`, `()'"`)
    - CSRF protection: SameSite=strict for admin auth cookies
    - Rate limiting: 5 login attempts/minute, 10 bulk ops/minute
    - Memory leak prevention: cleanup intervals with `unref()`
    - Audit logging utility (created table + lib/admin/audit-log.ts)
    - Content-Type validation, Cache-Control headers
    - Request timeouts for external APIs (Apify 10s, OpenAI 15s)

### Jan 3, 2026
- **Batch classification script** - `npm run mine:classify`
  - Processes pending mining candidates (bio filter failed, images not classified)
  - Downloads images as base64 (OpenAI can't fetch Instagram CDN URLs)
  - GPT-5-mini with flex tier pricing (~$0.00012/profile)
  - Auto-inserts passing artists with `discovery_source: hashtag_mining_classified`

### Jan 7, 2026
- **Phase 15 complete** - Multi-location support for artists
  - New `artist_locations` table with international support (195+ countries)
  - Free tier: 1 location (US: city OR state, International: city + country)
  - Pro tier: Up to 20 locations worldwide
  - LocationPicker component for onboarding
  - LocationManager component for dashboard
  - Search functions updated for multi-location filtering
  - Atomic location updates via RPC (prevents race conditions)
  - Input sanitization and country code whitelist validation

### Jan 5, 2026
- **Storybook setup** - Component dev with mock auth (5 user states)
- **Phase 6 complete** - Pro tier features (crown badges, pinning, unlimited portfolio)
- **Phase 7 complete** - Profile editor with multi-step delete

### Jan 4, 2026
- **Phase 4 complete** - Add-artist page (self-add + recommendations)

### Jan 3, 2026
- **Vercel Analytics** - Page views + Web Vitals tracking
- **Phase 3 complete** - Claim flow with atomic transactions

### Jan 2, 2026
- **Phase 11 complete** - Instagram auto-sync for Pro (daily cron)
- **Phase 12 complete** - Search ranking boosts + badges
- **Instagram Mining Pipeline** - Ready for 10k+ artist discovery
- **Phase 1-2 complete** - Database schema + OAuth infrastructure

### Jan 1, 2026
- **5-city expansion** - NYC, Chicago, Portland, Seattle, Miami
- **SEO editorial content** - 80 style pages + 8 city + 8 state pages
- **Image cleanup** - Removed 1,364 non-portfolio images
- **Smart unified input** - Auto-detects images, text, Instagram URLs

### Dec 31, 2025
- **Atlanta + LA expansion** - 386 artists, 2,378 images
- **Instagram post/profile search** - Paste URL to find similar
- **Hybrid CLIP system** - Local GPU + Modal fallback

### Dec 29-30, 2025
- **Austin launch** - 188 artists, 1,257 images
- **Core search** - Image upload + text query
- **Featured artist system** - Based on engagement metrics

## Cost Summary

| Item | Cost |
|------|------|
| Discovery (8 cities) | ~$26 |
| Scraping (Apify) | ~$160-200 |
| Classification | ~$4 |
| Embeddings | ~$2 |
| **Total one-time** | ~$200 |
| **Monthly** | ~$12 ($7 infrastructure + $5 Redis) |

## Architecture Decisions

1. **IVFFlat** over HNSW - Better for our 10k vector scale
2. **Apify** over Instaloader - 10x faster scraping
3. **GPT-5-mini flex** for classification - ~$0.00012/profile (6 images)
4. **Hybrid CLIP** - 90% cost reduction vs Modal-only
5. **Handle matching** for claims - All artists have handles, none have IDs
6. **Redis caching** - Serverless-safe rate limiting + analytics consistency (Jan 3, 2026)

## Known Issues

- ESLint warnings in `/scripts` (dev tools, non-blocking)
- Pre-existing syntax error in `components/dashboard/DashboardHome.tsx:143-144` (TypeScript compilation blocked)

## Next Priorities

1. Run mining pipeline for 10k+ artists (infrastructure ready)
2. SEO optimization and content expansion
3. Performance monitoring and optimization
4. Deploy Stripe to production (set up webhook in Stripe Dashboard)
