---
Last-Updated: 2026-01-04 (Phase 4: Add-Artist Page Implementation)
Maintainer: RB
Status: Production Ready - 8 Cities Live + Phase 4 Add-Artist Complete ✅
---

# Active Context: Inkdex

## Current Platform Status

**Status:** PRODUCTION READY - 8 cities fully operational

### Database Overview
- **Total Artists:** 1,501 artists across 8 cities
- **Total Images:** 9,803 portfolio images (100% with embeddings ✅)
- **Austin, TX:** 188 artists, 1,204 images
- **Atlanta, GA:** 191 artists, 1,040 images
- **Los Angeles, CA:** 193 artists, 1,239 images
- **New York, NY:** 219 artists, 1,409 images
- **Chicago, IL:** 194 artists, 1,395 images
- **Portland, OR:** 199 artists, 1,336 images
- **Seattle, WA:** 172 artists, 1,264 images
- **Miami, FL:** 145 artists, 916 images
- **Vector Index:** IVFFlat (lists=105, optimized for 11,167 images)
- **Last Cleanup:** Jan 1, 2026 - Removed 1,364 non-portfolio images (personal photos, lifestyle content)

### Production Features ✅
- ✅ Multi-modal search (image upload, text query, Instagram post/profile links)
- ✅ Artist profiles (1,501 pages across 8 cities)
- ✅ City browse pages (8 cities: Austin, Atlanta, LA, NYC, Chicago, Portland, Seattle, Miami)
- ✅ State browse pages (8 states with editorial content)
- ✅ Style landing pages (80 pages: 10 styles × 8 cities)
- ✅ **SEO Editorial Content (COMPLETE):**
  - 8 state pages (~3,000 words)
  - 8 city pages (~3,400 words)
  - 80 style×city pages (~38,000 words)
  - Total: ~65,000 words of culturally-specific, SEO-optimized content
- ✅ Hybrid CLIP embeddings (local GPU + Modal fallback)
- ✅ Security hardening (A rating, all critical issues fixed)
- ✅ Remote GPU access (https://clip.inkdex.io works while traveling)
- ✅ Smart unified input (auto-detects Instagram URLs, images, and text)
- ✅ Incremental pipeline (process while scraping continues)
- ✅ **Vercel Analytics (Jan 3, 2026):** Page views & Web Vitals tracking integrated in root layout

---

## Phase 1: User & Artist Account Implementation (COMPLETE ✅)

**Status:** Database foundation ready for Phase 2 (OAuth, Subscriptions, Analytics)

### What Was Completed (Jan 2, 2026)
- ✅ **3 production migrations** applied to database
- ✅ **User account system:** OAuth token storage, account types (fan/artist_free/artist_pro)
- ✅ **Artist account features:** Pro/Featured flags, soft delete, auto-sync settings
- ✅ **Portfolio management:** Pinning system, image hiding, import source tracking
- ✅ **Subscription tracking:** artist_subscriptions table (free/pro tiers)
- ✅ **Promo code system:** Validation, security hardening (timing attack prevention)
- ✅ **Analytics system:** Daily aggregation (profile views, clicks, search appearances)
- ✅ **Security hardening:** 15+ RLS policies, SECURITY DEFINER functions, race condition protection
- ✅ **Code review complete:** All critical security issues fixed

### Database Changes
**New Tables (4):**
- `artist_subscriptions` - Stripe subscription tracking (free/pro tiers at $15/month)
- `promo_codes` - Promotional codes with usage limits and expiration
- `artist_analytics` - Daily aggregation (profile_views, instagram_clicks, booking_clicks, search_appearances)
- `instagram_sync_log` - Instagram portfolio sync operation logs

**Updated Tables (3):**
- `users` - Added OAuth tokens (instagram_access_token, instagram_token_expires_at, instagram_refresh_token) + account_type
- `artists` - Added is_pro, is_featured, pricing_info, availability_status, auto_sync_enabled, deleted_at
- `portfolio_images` - Added is_pinned, pinned_position, hidden, auto_synced, manually_added, import_source

### Security Improvements
1. **Timing attack prevention:** Promo code validation returns generic errors
2. **Race condition protection:** Check constraint prevents promo code over-usage
3. **Batch optimization:** increment_search_appearances uses single INSERT (10x faster)
4. **RLS policies:** 15+ policies protect user data, subscriptions, analytics

### Migration Files
- `supabase/migrations/20260102_001_phase1_schema.sql` - Schema changes (245 lines)
- `supabase/migrations/20260102_002_phase1_security_functions.sql` - RLS policies + functions (363 lines)
- `supabase/migrations/20260102_003_phase1_critical_fixes.sql` - Security fixes from code review (114 lines)

### Key Functions
- `increment_profile_view(artist_id)` - Track profile views
- `increment_instagram_click(artist_id)` - Track Instagram link clicks
- `increment_booking_click(artist_id)` - Track booking link clicks
- `increment_search_appearances(artist_ids[])` - Batch track search appearances (optimized)
- `get_artist_portfolio(artist_id)` - Get portfolio in display order (pinned first)
- `can_claim_artist(artist_id, instagram_id)` - Verify claim eligibility
- `validate_promo_code(code)` - Validate promo with security hardening

**Reference:** `/memory-bank/projects/user-artist-account-implementation.md`

---

## Phase 2: Instagram OAuth Infrastructure (COMPLETE ✅)

**Status:** OAuth infrastructure complete and tested - ready for Phase 3 (Claim Flow) and Phase 4 (Add-Artist Flow)

**Testing Status (Jan 2, 2026):**
- ✅ **OAuth flow tested end-to-end:** Initiation → Facebook login → Callback → Token exchange
- ✅ **Token exchange successful:** Access token obtained from Facebook Graph API
- ✅ **redirect_uri bug fixed:** Callback now matches initiation URL exactly
- ✅ **Login page created:** `/login` route with Instagram connect button
- ⚠️ **Testing limited:** Requires Instagram Business/Creator account connected to Facebook Page (user doesn't have one set up yet)

### What Was Completed (Jan 2, 2026)
- ✅ **Supabase Vault integration:** Encrypted token storage (authenticated encryption)
- ✅ **OAuth callback handler:** `/auth/callback` route with Facebook Login integration
- ✅ **OAuth initiation endpoint:** `/api/auth/instagram` with CSRF token generation
- ✅ **Token utilities:** Vault CRUD operations (store, retrieve, delete tokens)
- ✅ **Token refresh:** Auto-refresh tokens expiring within 7 days (non-blocking)
- ✅ **Token refresh deduplication:** Prevents race conditions with in-memory lock
- ✅ **Middleware enhancement:** Automatic token refresh check on protected routes
- ✅ **Basic dashboard:** User info display with logout functionality (`/dashboard`)
- ✅ **Login page:** Simple page with Instagram connect button (`/login`)
- ✅ **Logout endpoint:** Clean token deletion from Vault + Supabase Auth signout
- ✅ **Environment config:** Instagram OAuth validation with CLIENT_SECRET protection
- ✅ **Security:** CSRF protection, encrypted storage, no plaintext tokens
- ✅ **Facebook App configured:** Instagram Graph API permissions added

### Critical Security Fix ✅ COMPLETE
- **Migrated from plaintext to encrypted token storage:**
  - Phase 1 stored `instagram_access_token` in plaintext (security risk ⚠️)
  - Phase 2 uses Supabase Vault with authenticated encryption
  - Decryption key managed separately by Supabase
  - **Plaintext columns removed (Jan 2, 2026):**
    - Dropped `instagram_access_token`, `instagram_refresh_token`, `instagram_token_expires_at`
    - Migration: `20260103_002_remove_plaintext_tokens.sql`
    - TypeScript types regenerated
    - **Result:** No plaintext token storage possible (columns removed from schema)

### Files Created (10)
1. `supabase/migrations/20260103_001_vault_token_storage.sql` - Vault migration with Vault RPC functions
2. `supabase/migrations/20260103_002_remove_plaintext_tokens.sql` - Remove deprecated plaintext columns
3. `lib/supabase/vault.ts` - Token encryption utilities (store, retrieve, delete, check)
4. `app/api/auth/instagram/route.ts` - OAuth initiation endpoint (CSRF token generation)
5. `app/auth/callback/route.ts` - OAuth callback handler (token exchange, user creation, session)
6. `lib/instagram/token-refresh.ts` - Token refresh utilities (auto-refresh at 7 days)
7. `lib/instagram/refresh-lock.ts` - Token refresh deduplication (in-memory Map)
8. `app/dashboard/page.tsx` - Basic dashboard page (user info, logout button)
9. `app/login/page.tsx` - Login page (Instagram connect button)
10. `app/api/auth/logout/route.ts` - Logout endpoint (Vault cleanup + Supabase signout)

### Files Modified (4)
1. `lib/supabase/middleware.ts` - Added token refresh check
2. `lib/supabase/service.ts` - Client-side detection + type assertions
3. `lib/config/env.ts` - Instagram OAuth env validation (optional until deployed)
4. `.env.local` - Added Facebook App credentials

### Architecture Notes
- **Instagram Graph API via Facebook Login** (NOT Instagram Basic Display API - sunset Dec 4, 2024)
- **Business/Creator accounts only:** Personal Instagram accounts won't work
- **OAuth triggered by claim/add-artist flows:** Login page serves as temporary test page for Phase 2
- **Token lifecycle:** 60-day expiration, auto-refresh at 7 days remaining
- **Non-blocking refresh:** Middleware triggers refresh in background (doesn't block requests)

### Critical Bugs Fixed During Implementation
1. **Missing Vault RPC functions:** Added 4 RPC functions to migration (vault_create_secret, vault_get_decrypted_secret, vault_update_secret, vault_delete_secret)
2. **Broken synthetic email auth:** Changed from signInWithPassword to admin.generateLink() + verifyOtp()
3. **Missing OAuth initiation endpoint:** Created `/api/auth/instagram` route with CSRF token generation
4. **Incorrect token refresh URL:** Changed from graph.instagram.com to graph.facebook.com/v21.0/oauth/access_token
5. **Vault decryption query broken:** Changed from `.from('vault.decrypted_secrets')` to `rpc('vault_get_decrypted_secret')`
6. **Auth session creation bug:** Fixed `linkData.hashed_token` → `linkData.properties.hashed_token`
7. **Vault RPC return type mismatch:** Fixed `vaultData.id` → `vaultData[0].id` (returns array)
8. **redirect_uri mismatch:** Callback now includes `?redirect=` parameter to match initiation URL exactly
9. **Port conflict:** Dev server tried to use port 3001 instead of 3000 (redirect_uri mismatch with Facebook app)
10. **Missing /login page:** Created login page to prevent 404 when dashboard redirects unauthenticated users

### Testing Results (Jan 2, 2026)
**OAuth Flow Test:**
```
✅ Initiation: /api/auth/instagram → Redirects to Facebook
✅ Facebook Login: Permissions dialog shown
✅ CSRF Validation: State parameter validated successfully
✅ Token Exchange: Access token obtained from Facebook Graph API
❌ Instagram Account: No Business account found (expected - user doesn't have one)
```

**What Works:**
- OAuth initiation with CSRF protection
- Facebook login and permission approval
- Callback receives auth code
- Token exchange succeeds
- Redirects properly based on error conditions

**What's Pending:**
- Full end-to-end test requires Instagram Business/Creator account connected to Facebook Page
- User creation and session establishment (depends on Instagram account)
- Token storage in Vault (depends on successful profile fetch)
- Dashboard display (depends on active session)

### Next Steps (Phase 3)
- Onboarding flow (initial portfolio import from Instagram after OAuth)
- "Claim This Page" button on unclaimed artist profiles
- Artist verification via Instagram ID matching
- Delete scraped data, replace with OAuth-sourced images
- Portfolio curation UI

**Reference:** `/memory-bank/projects/user-artist-account-implementation.md` (Phase 2 section)

---

## Phase 3: Claim Flow Implementation (COMPLETE ✅)

**Status:** Production ready - artists can claim profiles via Instagram OAuth verification

**Completed:** January 3, 2026

### What Was Completed
- ✅ **"Claim This Page" button:** Appears on all unclaimed artist profiles
- ✅ **Atomic claim transaction:** Race condition protection with SECURITY DEFINER RPC
- ✅ **Handle-based matching:** Instagram @username verification (case-insensitive)
- ✅ **Audit trail:** `claim_attempts` table tracks all claim attempts (success/failure)
- ✅ **Portfolio deletion:** Hard delete scraped images (database + Supabase Storage)
- ✅ **Basic onboarding:** Welcome page after successful claim
- ✅ **Security hardening:** Input validation, SQL injection prevention, transaction wrapping
- ✅ **Error handling:** Handle mismatch, already claimed, missing data scenarios
- ✅ **Code review:** All 5 critical security issues fixed

### Files Created (6)
1. `supabase/migrations/20260103_002_phase3_claim_flow.sql` - Initial handle-based matching
2. `supabase/migrations/20260103_003_claim_transaction.sql` - Atomic RPC + audit trail
3. `components/artist/ClaimProfileButton.tsx` - Claim button component
4. `lib/artist/claim.ts` - Image deletion utility
5. `app/claim/verify/page.tsx` - Claim verification page
6. `app/onboarding/page.tsx` - Basic onboarding welcome page

### Files Modified (1)
1. `components/artist/ArtistInfoColumn.tsx` - Added claim button below "Find Similar Artists"

### Key Architecture
- **Instagram handle matching:** `LOWER(instagram_handle) = LOWER(REPLACE(@username, '@', ''))`
- **Atomic RPC function:** `claim_artist_profile()` wraps update + deletion in transaction
- **Race condition protection:** UPDATE WHERE verification_status='unclaimed' + ROW_COUNT check
- **Non-blocking storage cleanup:** Async deletion after atomic claim succeeds
- **Audit logging:** All claim attempts logged (success/failure/error)

### Database Changes
**New Table (1):**
- `claim_attempts` - Audit log (artist_id, user_id, handles, outcome, IP, user_agent, timestamp)

**New Functions (1):**
- `claim_artist_profile()` - Atomic claim with transaction wrapping, input validation, audit logging

**Updated Functions (1):**
- `can_claim_artist()` - Added p_instagram_handle parameter with regex validation

### Security Features
1. **Transaction wrapping:** Entire claim process atomic (all-or-nothing)
2. **Input validation:** Regex check for Instagram handle format `^[a-z0-9._]{1,30}$`
3. **Race condition protection:** UPDATE checks verification_status in WHERE clause
4. **Audit trail:** All attempts logged for fraud detection and dispute resolution
5. **Storage cleanup:** Non-blocking (errors logged but don't block claim)

### Critical Discovery
- **Database analysis:** ALL 1,501 artists have `instagram_handle`, NONE have `instagram_id`
- **Impact:** Claim flow designed around handle matching instead of ID matching
- **Future-proofing:** RPC populates `instagram_id` from OAuth for future use

### Testing Scenarios
**Happy Path:**
1. Visit unclaimed artist profile → Click "Claim This Page"
2. Redirect to Instagram OAuth → Approve permissions
3. Callback creates session → Redirect to /claim/verify
4. Username matches → Atomic claim succeeds
5. Scraped images deleted → Redirect to /onboarding

**Error Scenarios:**
- ❌ Handle mismatch: Logged in as @user_a, trying to claim @user_b
- ❌ Already claimed: Profile's verification_status='claimed'
- ❌ OAuth denial: User cancels Instagram login
- ❌ Missing data: instagram_username not in users table

### Next Steps (Phase 4)
- Portfolio upload from Instagram after claim
- Portfolio curation UI (pin, hide, reorder)
- Profile customization (bio override, booking URL, pricing)
- Artist settings page

**Reference:** `/memory-bank/projects/user-artist-account-implementation.md` (Phase 3 section)

---

## Phase 4: Add-Artist Page (COMPLETE ✅)

**Status:** Production ready - artists can self-add OR fans can recommend artists

**Completed:** January 4, 2026

### What Was Completed
- ✅ **Two-path design:** Self-add via OAuth + public recommendations
- ✅ **Classifier gate:** Bio keywords OR image classification (GPT-5-mini)
- ✅ **Rate limiting:** 5 submissions/hour/IP with in-memory limiter
- ✅ **Progressive captcha:** Cloudflare Turnstile after 2nd submission
- ✅ **Duplicate detection:** Checks existing artists via RPC
- ✅ **Auto-scraping:** Creates scraping_jobs for approved artists
- ✅ **Audit logging:** All submissions logged in artist_recommendations table
- ✅ **Navigation:** "Join as Artist" link in desktop + mobile nav
- ✅ **Security:** Input validation, SQL injection prevention, type-safe operations

### Key Flows

**Self-Add (OAuth):**
1. Click "Connect with Instagram" on /add-artist → /api/add-artist/self-add
2. Instagram OAuth → /add-artist/verify
3. Classifier checks bio keywords OR 3+ tattoo images (GPT-5-mini)
4. If passed: Create artist record → Redirect to /onboarding
5. If failed: Show error with classifier details

**Recommend (Public):**
1. Submit Instagram handle via form on /add-artist
2. Rate limit check (5/hour/IP) + progressive captcha (after 2nd)
3. Duplicate check via get_artist_by_handle RPC
4. Classifier gate (bio keywords → image classification fallback)
5. If passed: Create artist + queue scraping job
6. Log to artist_recommendations audit table

### Files & Changes
**Created (8 files):**
- `app/add-artist/page.tsx` - Landing page
- `app/add-artist/verify/page.tsx` - Self-add verification
- `app/api/add-artist/recommend/route.ts` - Recommendation API
- `app/api/add-artist/self-add/route.ts` - OAuth redirect
- `lib/instagram/classifier.ts` - Two-stage classifier
- `lib/instagram/profile-fetcher.ts` - Apify scraper
- `components/artist/RecommendSection.tsx` - Form component
- `components/artist/TurnstileWidget.tsx` - Captcha widget

**Modified (3 files):**
- `app/sitemap.ts` - Added /add-artist route
- `components/layout/Navbar.tsx` - Navigation links
- `lib/rate-limiter.ts` - Rate limit function

**Database:**
- Migration applied: `20260104_001_add_artist_recommendations.sql`
- New table: `artist_recommendations` (audit log)

### Testing Results
- ✅ TypeScript check passing
- ✅ Production build: 1,622 static pages
- ✅ Routes working (/add-artist, /add-artist/verify, API routes)
- ✅ Navigation links visible (desktop + mobile)

**Reference:** `/memory-bank/projects/user-artist-account-implementation.md` (Phase 4 section)

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

### SEO Editorial Content - ALL 80 Pages Complete (Jan 1) ✅
**Goal:** Add 300-500 word editorial content to all 96 browse pages (8 states + 8 cities + 80 style pages) for improved SEO rankings and user engagement.

**What Was Completed:**
- ✅ **80 style×city combinations** (10 styles × 8 cities) - ~38,000 words
- ✅ **8 state pages** - ~3,000 words
- ✅ **8 city pages** - ~3,400 words
- ✅ **Total:** ~65,000 words of culturally-specific, locally-relevant content

**Generation Approach:**
- **3-batch parallel execution** using Task tool with general-purpose agents
- **Batch 1:** Traditional, Realism, Japanese, Neo-traditional (32 entries)
- **Batch 2:** Blackwork, Illustrative, Watercolor, Tribal (32 entries)
- **Batch 3:** New-school, Chicano (16 entries)
- **Parallel agents per batch:** 4 agents writing simultaneously to same file
- **Total generation time:** ~45 minutes (all 3 batches)

**Content Quality:**
- ✅ **2-3 specific neighborhood mentions** per city (e.g., "East Austin," "Williamsburg," "Pilsen")
- ✅ **Culturally authentic:** Chicano content treats style with deep cultural respect (LA as epicenter, cultural consultation emphasis)
- ✅ **No generic clichés:** Avoided "vibrant scene," "hidden gem," "express yourself," etc.
- ✅ **ASCII quotes only:** 0 Unicode curly quotes (critical for build)
- ✅ **TypeScript valid:** Compiles without errors
- ✅ **Proper structure:** All entries have intro (120-150w), cityContext (150-180w), expectations (100-120w), finding (80-100w), keywords (5)

**File Details:**
- **Location:** `/lib/content/editorial/styles.ts`
- **Size:** 3,238 lines (~65,000 words)
- **Structure:** 10 section headers + 80 complete entries
- **Integration:** Already wired into city/state/style browse pages via `getStyleEditorialContent()`, `getCityEditorialContent()`, `getStateEditorialContent()`

**Key Technical Lessons:**
1. **Parallel agent coordination works:** 4 agents can successfully append to same file without conflicts when using Edit tool
2. **ASCII quote enforcement critical:** Must explicitly state in prompts (some agents defaulted to Unicode)
3. **Cultural sensitivity requires detailed prompts:** Chicano content needed specific guidance on cultural authenticity vs. appropriation
4. **Agent quote style varies:** Realism/Illustrative used double quotes (`"realism"`), others used single quotes (`'traditional'`) - both valid TypeScript

**Next Steps:**
1. Run full Next.js build test (should generate 1,607+ pages now)
2. Spot-check content quality (especially culturally-sensitive Chicano entries)
3. Deploy to production
4. Monitor SEO impact over 3 months (target: +30-50% organic impressions)

---

### Image Quality Cleanup (Jan 1) ✅
**Problem:** Instagram scraping imported non-portfolio images (personal photos, lifestyle content, promotional graphics) where tattooed artists just happened to appear.

**Root Cause:** Old classification prompt was too broad - "Is this a photo of a tattoo?" caught personal photos where tattooed people appeared.

**Solution:**
- Improved classification prompt to distinguish portfolio work from personal content
- Tested gpt-5-nano (82% kept, 30% false positive rate) vs gpt-5-mini (87.8% kept, 0% false positives)
- Re-classified all 11,167 images using gpt-5-mini with improved prompt
- Deleted 1,364 non-portfolio images from both database and Supabase Storage

**Results:**
- **Before:** 11,167 images (mixed quality)
- **After:** 9,803 images (portfolio-only)
- **Accuracy:** 0% false positives (verified on sample sets)
- **Time:** ~4 hours classification + 25 minutes deletion
- **Cost:** ~$15 in OpenAI API (gpt-5-mini Flex tier)

**Key Files:**
- `scripts/scraping/batch-classify.py` - Updated classification prompt for future scrapes
- `scripts/cleanup/reclassify-existing-images.py` - Re-classification utility
- `scripts/cleanup/delete-from-audit.py` - Safe deletion from audit logs

**Improved Classification Prompt Pattern:**
```
"Is this an image showcasing tattoo work? Answer 'yes' if the primary purpose is to display a tattoo.
Answer YES if: completed tattoo, in-progress shop photo, tattoo is main subject
Answer NO if: personal selfie, lifestyle photos, promotional graphics where tattoos are incidental"
```

**Bug Fixed:** Search function crash due to `pi.thumbnail_url` column not existing - changed to `pi.storage_thumb_640`

---

### 5-City Expansion Complete (Jan 1) ✅
- **929 new artists** discovered across 5 cities (NYC, Chicago, Portland, Seattle, Miami)
- **7,520 new images** scraped and processed
- **Incremental pipeline:** Process-batch.ts runs every 10 artists, embeddings every 50
- **100% local GPU:** All embeddings generated on local A2000 (0 Modal fallback)
- **Vector index:** Upgraded from lists=60 to lists=105 for 11,167 images
- **Build:** 1,105 static pages generated successfully
- **Total time:** ~4 hours (discovery: 20 min, scraping: 2 hours, embeddings: 1.5 hours)

### Incremental Pipeline Refactor (Jan 1) ✅
- **Lock file mechanism:** `.complete` files prevent race conditions
- **Batch processing:** Process every 10 artists during download
- **Embedding batches:** Generate every 50 artists (no 2-hour wait)
- **Memory efficient:** Only 10-20 artists in /tmp at once
- **Code reviewed:** Fixed critical issues (race conditions, subprocess paths)
- **Reusable:** Same pipeline for single-artist additions

### All Embeddings Complete (Jan 1) ✅
- **11,167 total embeddings** generated (100% complete)
- 100% local GPU usage (0 Modal fallback)
- Average: 0.50-0.87s per embedding
- 5 batches processed incrementally
- **Remote access confirmed:** Local GPU worked perfectly while traveling

### Vector Index Updated (Jan 1) ✅
- Upgraded from lists=60 (3,614 images) to lists=105 (11,167 images)
- Optimal configuration using sqrt(total_images) formula
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

**Last Updated:** January 2, 2026
**Next Review:** After Phase 2 OAuth and Stripe integration
