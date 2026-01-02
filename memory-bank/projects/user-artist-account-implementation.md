---
Last-Updated: 2026-01-02
Maintainer: RB
Status: Phase 2 Complete - OAuth Infrastructure Ready
---

# User & Artist Account Implementation Spec

*Agent Guide — January 2026*

---

## Core Philosophy

1. **Instagram is the identity layer** — All authentication via Instagram OAuth (Supabase Auth)
2. **Artists are professionals** — $15/month Pro tier, no compromises
3. **Fans don't need accounts for v1** — Browse, search, click through to Instagram
4. **Two paths to artist pages** — Scraped (unclaimed) or self-created (claimed)

---

## User Types & Features

### Fan / Collector (No Login - v1)
Browse and discover without accounts. Search by style/location/visual similarity, click through to Instagram.

**Future v2:** Save/collection features requiring login

### Unclaimed Artist (Scraped)
Artist pages from scraped Instagram data. No artist control. Pages refresh via re-scraping every 3-12 months.

### Claimed Basic Artist (Free)
Artists who verified ownership via Instagram OAuth.

**Features:**
- Import last 20 Instagram posts
- Auto-categorized by style/placement
- Manual curation (reorder, hide)
- Basic profile (name, location, 1 booking link)
- Verified badge
- Delete page option

**Limitation:** Manual updates only. New posts don't sync.

### Claimed Pro Artist ($15/month or $150/year)
Full-featured accounts for professionals.

**Features (everything in Free plus):**
- **Unlimited portfolio import**
- **Auto-sync tattoo shots** — new posts automatically added (classifier filtered)
- **Unlimited pinning** — manually order best work at top
- Full profile (bio, pricing, availability badge)
- **Search ranking boost** — appear higher in results
- Pro badge
- Analytics (views, saves)

---

## Feature Comparison

| Feature | Unclaimed | Free (Claimed) | Pro ($15/mo) |
|---------|-----------|----------------|--------------|
| Portfolio images | 12 (auto) | 20 (manual) | Unlimited (auto-sync) |
| Instagram sync | — | One-time | Auto-sync new posts |
| Curation | — | ✓ | ✓ |
| Auto-categorization | AI | ✓ | ✓ |
| Profile | Scraped | Basic | Full |
| Badges | — | Verified | Verified + Pro |
| Analytics | — | — | ✓ |
| Delete page | — | ✓ | ✓ |

---

## Pricing Strategy

**Value Prop:** "Your Instagram is a mess. Inkdex turns it into a portfolio."

**Upgrade Triggers:**
1. "You have 47 more posts we couldn't import"
2. "You posted 3 new tattoos this week—upgrade to sync automatically"
3. "Your last sync was 30 days ago—want to keep it fresh?"

**Promo Codes:** X months free or % off for beta testers, influencers, partnerships

**Not Doing:** Referral program, free trials, lead fees

---

## Onboarding Flow

Both claim and self-add paths converge into same flow after Instagram OAuth.

### Entry Points

**Claim existing page:** Artist finds scraped page → "Claim This Page" → OAuth → Delete scraped data, import fresh → Onboarding

**Add yourself:** `/add-artist` → Enter handle → **Classifier gate** → OAuth → Onboarding

#### Classifier Gate (Self-Add Only)
When artist enters Instagram handle:
1. Fetch public profile + recent posts (no auth)
2. Check if tattoo artist:
   - Bio contains "tattoo", "tattooist", "tattoo artist"? OR
   - 5+ of last 20 posts classified as tattoo images?
3. Pass → Proceed to OAuth
4. Fail → Error: "We couldn't verify you're a tattoo artist. Contact support@inkdex.io"

**Cost:** ~$0.02 per attempt (20 images × $0.001 classifier)

### Onboarding Steps

**Step 1: "Pulling your work..."**
Loading state while fetching from Instagram API. Pull 50-100 most recent posts.

**Step 2: "Looking good?"**
Preview page with editable fields: Name, Location, Bio

**Step 3: "Pick your best work"**
Portfolio curation screen. Default: 20 most recent images pre-selected. Grid shows all pulled images with checkboxes. At 20/20, must deselect before adding more.

**Step 4: "Where can clients book you?"**
Single input for booking link (optional). Examples: Instagram DM, email, Booksy, personal site.

**Step 5: "You're live!"**
Confirmation with link to page, share button, "Edit anytime in dashboard"

**Skip Behavior:** Steps 3-4 can be skipped. Defaults: 20 most recent images, no booking link.

---

## Technical Implementation

### Phase 1: Database Schema Updates ✅ COMPLETE

**New Tables:**
- `users` - Instagram OAuth tokens, account type (fan/artist_free/artist_pro)
- `artist_subscriptions` - Stripe subscription tracking (free/pro, status, billing periods)
- `promo_codes` - Discount codes with usage limits and expiration
- `artist_analytics` - Daily aggregation (profile views, clicks, search appearances)
- `instagram_sync_log` - Sync operation logs (manual/auto/onboarding)

**Updated Tables:**
- `artists` - Add claimed_by_user_id, verification_status, is_pro, is_featured, bio_override, booking_link, pricing_info, availability_status, auto_sync_enabled, deleted_at, exclude_from_scraping
- `portfolio_images` - Add is_pinned, pinned_position, hidden, auto_synced, manually_added, import_source

**Key Concepts:**
- **is_featured** - Editorial curation (admin-controlled, any artist can be featured)
- **is_pro** - Subscription-based paid tier (search boost, auto-sync, premium features)
- **Independent flags** - Artist can be Featured without Pro, or Pro without Featured, or both
- **Portfolio display order** - Pinned first (by pinned_position), then non-pinned (reverse chronological)
- **Soft delete** - deleted_at timestamp prevents re-scraping

### Phase 2: Instagram OAuth Integration

**Supabase Auth Configuration:**
- Verify Instagram OAuth provider enabled
- Client ID/Secret in environment variables
- Redirect URI: `https://inkdex.io/auth/callback`

**OAuth Scopes:**
- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_messages`

**Note:** Requires Business or Creator account. Handle gracefully for personal accounts.

**Auth API Routes:**
- `POST /api/auth/instagram/callback` - OAuth callback handler
- `POST /api/auth/instagram/refresh` - Token refresh
- `GET /api/auth/session` - Session status
- `POST /api/auth/logout` - Destroy session

**Client Components:**
- `<InstagramLoginButton />` - Trigger OAuth
- `<AuthProvider />` - Session context wrapper
- `useAuth()` hook - Access session/user data

### Phase 3: Instagram API Integration

**Instagram Graph API Endpoints:**
- `GET /{user-id}/media` - Get user's media
- `GET /{media-id}` - Media details
- `GET /{media-id}/children` - Carousel children

**Rate Limits:** 200 calls/hour/user (implement smart pagination and caching)

**API Routes:**
- `POST /api/instagram/fetch-media` - Fetch user's posts
- `POST /api/instagram/import-images` - Import selected images
- `GET /api/instagram/sync-status` - Check sync progress

**Background Jobs (Future):**
- Daily auto-sync for Pro accounts
- Token refresh
- Analytics aggregation

### Phase 4: Artist Dashboard

**Dashboard Routes:**
- `/dashboard` - Overview (analytics, activity)
- `/dashboard/portfolio` - Manage portfolio
- `/dashboard/profile` - Edit profile
- `/dashboard/subscription` - Billing, upgrade, cancel
- `/dashboard/analytics` - Pro only (views, clicks, trends)

**Dashboard Components:**
- `<PortfolioCurator />` - Drag-drop reordering, show/hide
- `<ProfileEditor />` - Bio, location, booking link form
- `<AnalyticsCharts />` - Pro only (views over time, top images)
- `<SubscriptionManager />` - Upgrade, billing, cancel
- `<SyncStatus />` - Last sync, manual sync button

### Phase 5: Onboarding Flow

**Onboarding Routes:**
- `/onboarding/start` - Entry after OAuth
- `/onboarding/classifier` - Self-add gate
- `/onboarding/preview` - Preview profile
- `/onboarding/portfolio` - Pick best work
- `/onboarding/booking` - Booking link
- `/onboarding/complete` - Success

**Onboarding Components:**
- `<InstagramFetcher />` - Loading state
- `<ProfilePreview />` - Editable preview
- `<PortfolioPicker />` - Grid with selection controls
- `<BookingLinkInput />` - Booking form
- `<OnboardingComplete />` - Success with share button

**State Management:** Use Zustand store for onboarding state (step, posts, selected images, profile data, booking link, loading, errors)

### Phase 6: Claim Flow

**Claim Routes:**
- `/claim/[artistSlug]` - Claim page entry
- `/claim/verify` - OAuth verification
- `/claim/success` - Redirect to onboarding

**Claim Process:**
1. User clicks "Claim This Page" on unclaimed artist profile
2. Check if already claimed (error if yes)
3. Redirect to Instagram OAuth
4. On callback, verify `instagram_id` matches `artists.instagram_id`
5. If match:
   - Update claimed_by_user_id, set verification_status = 'claimed'
   - **Delete all scraped portfolio images** (OAuth is source of truth)
   - Fetch fresh data from Instagram API
   - Redirect to onboarding
6. If no match: Error "This Instagram account doesn't match this artist page"

**Why delete scraped data:** OAuth source is fresher with more images available, prevents confusion, clean slate for artist curation

**Edge Cases:**
- Instagram ID not stored → Fetch during claim, update DB
- Username changed → Match on Instagram ID, not username
- Account deleted → OAuth fails, show error

### Phase 7: Legal Pages & Compliance

**Required Pages:**
- `/about` - What we do, how it works, who it's for
- `/terms` - TOS including **no refunds, cancel anytime**, content ownership, DMCA process
- `/privacy` - Data collection, OAuth tokens, third-party services, user rights, GDPR/CCPA
- `/refunds` - Can be included in TOS (keep simple: "No refunds. Cancel anytime. $15.")

**Footer Links:** About, Terms, Privacy, Contact (support@inkdex.io)

**Stripe Requirements:** TOS and Privacy URLs must be in checkout flow

**Implementation:** Use markdown/static HTML, keep language clear, use template generators, lawyer review before Pro launch

### Phase 8: Payment Integration (Stripe)

**Stripe Products:**
- "Inkdex Pro Monthly" - $15/month
- "Inkdex Pro Yearly" - $150/year

**Webhooks:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Handle upgrades/downgrades
- `customer.subscription.deleted` - Handle cancellations
- `invoice.payment_failed` - Failed payments

**Checkout Configuration:**
- Include TOS, Privacy, Refunds links
- Require customer acceptance
- Auto email receipts
- Enable Customer Portal for self-service

**Payment Routes:**
- `POST /api/stripe/create-checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle webhooks
- `POST /api/stripe/portal` - Redirect to Customer Portal

**Payment Flow:**
1. User clicks "Upgrade to Pro"
2. Create Stripe Checkout with promo code (optional)
3. Redirect to Stripe
4. On webhook success: Update subscriptions table, set is_pro/auto_sync_enabled
5. Redirect to `/dashboard?upgraded=true`

**Promo Code Flow:**
1. Validate code via `POST /api/promo-codes/validate`
2. Apply to Stripe Checkout
3. Increment usage count on checkout
4. Store in subscription record

### Phase 9: Auto-Sync (Pro Feature)

**Sync Strategy:** Daily cron job at 2am UTC

**Process:**
1. Query all Pro artists with auto_sync_enabled
2. For each artist:
   - Fetch latest 20 posts from Instagram API
   - Compare with existing portfolio by instagram_media_id
   - If new post found:
     - Run classifier: "Is this a tattoo image?" (unless "sync all posts" enabled)
     - If yes or "sync all" mode:
       - Download, generate embedding, upload to storage
       - Insert into portfolio_images with auto_synced=TRUE, is_pinned=FALSE
     - Log in instagram_sync_log
3. Handle rate limits (200 calls/hour/user) with batching

**Cost per sync:** ~$0.001/image classifier. For 4 new tattoos/month: ~$0.004/month (negligible)

**Manual Portfolio Management:**

**Free Tier:**
- No auto-sync (static until manually updated)
- "Import from Instagram" button in dashboard
- Pulls 50-100 latest posts, select up to 20
- Can re-curate anytime (unlimited, just manual)
- At 21st image: Upgrade prompt

**Pro Tier:**
- Auto-sync tattoo shots by default (classifier filtered)
- Can manually import non-tattoo posts
- Unlimited pinning (drag-drop order)
- Bulk pin/unpin actions
- Promote auto-synced to pinned
- Hide auto-synced images without disabling sync
- Auto-sync settings: Toggle on/off, tattoo-only vs all posts

### Phase 10: Search Ranking Logic

**Current:** Pure similarity score ranking

**Updated with Pro/Featured Boosts:**
Calculate final_score = similarity_score + (is_pro ? 0.05 : 0) + (is_featured ? 0.02 : 0)

**Rationale:**
- Pro boost (+0.05) is ~5-10% of typical scores (0.15-0.40)
- Featured boost (+0.02) is smaller (quality signal, not pay-to-win)
- Both flags: +0.07 total
- Natural high-quality matches can still outrank Pro

**Alternative:** Top 3-5 results Pro-only (if matches exist), then ranked by similarity

**UI Badges:**
- Pro: Purple crown icon (Lucide `Crown` component)
- Featured: Gold "FEATURED" text badge
- Can have both badges

**Admin Tools (Future):**
- `/admin/featured` - Manage featured artists
- `/admin/featured/[city]` - City-specific curation
- `/admin/featured/[style]` - Style-specific curation

**Featured Selection Criteria:** Portfolio quality, image count, active Instagram, auto-suggested then admin approved

### Phase 11: Analytics (Pro Feature)

**Analytics Collection:**
Implement tracking functions for:
- Profile views (on page load)
- Instagram link clicks
- Booking link clicks
- Search appearances (batch tracking in search results)

**Analytics Dashboard (Pro Only):**
- Total views/clicks (7/30/90 days)
- Search appearances
- Top performing images (most viewed)
- Traffic sources (if UTM tracking added)

**Charts:**
- Line: Views over time
- Bar: Top 10 images by views
- Pie: Click distribution

**Retention:** Store daily analytics for 365 days

### Phase 12: RLS Policies

Implement Row-Level Security policies:

**users:** Users can read/update only their own data

**artists:** Public read all, artists update own profiles (if claimed)

**portfolio_images:** Public read visible images (hidden=FALSE), artists manage own images

**artist_subscriptions:** Users read only their own subscriptions

**artist_analytics:** Artists read only their own analytics

---

## Security Issues (Resolved ✅)

### ✅ RESOLVED: OAuth Token Encryption (Phase 2)

**Problem:** Instagram OAuth tokens stored as plaintext in database. If compromised, attackers gain Instagram account access.

**Impact:** Post as user, access private data, revoke access

**Solution Implemented:** Supabase Vault (Option 1 - recommended)

**What Was Done (Jan 2, 2026):**
1. ✅ **Migration 1:** Added `instagram_token_vault_id` column to users table
2. ✅ **Migration 2:** Removed plaintext columns (`instagram_access_token`, `instagram_refresh_token`, `instagram_token_expires_at`)
3. ✅ **Created Vault utilities:** `lib/supabase/vault.ts` with encrypted CRUD operations
4. ✅ **Updated OAuth callback:** All tokens stored via Vault only
5. ✅ **Regenerated types:** Plaintext columns removed from TypeScript types

**Security Features:**
- Authenticated encryption via Supabase Vault
- Decryption key managed separately by Supabase
- RPC-based access through `SECURITY DEFINER` functions
- No plaintext token storage possible (columns removed from schema)

**Status:** Fully resolved - all OAuth tokens now encrypted at rest

---

## Implementation Phases

### Phase 1: Foundation (Week 1) ✅ COMPLETE
- Database schema migrations applied
- RLS policies created/updated
- Environment setup (Stripe, OAuth) - DEFERRED to Phases 2 & 8

### Phase 2: Auth & Basic Flows ✅ COMPLETE (Jan 2, 2026)
- ✅ Instagram OAuth initiation endpoint (`/api/auth/instagram`)
- ✅ Instagram OAuth callback handler (`/auth/callback`)
- ✅ Token refresh logic (auto-refresh at 7 days, non-blocking)
- ✅ Token refresh deduplication (in-memory lock prevents race conditions)
- ✅ Auth middleware for protected routes (with token refresh check)
- ✅ Basic dashboard shell (`/dashboard`)
- ✅ Login page (`/login`)
- ✅ Logout flow (`/api/auth/logout`)
- ✅ Supabase Vault integration (encrypted token storage)
- ✅ Security: CSRF protection, CLIENT_SECRET protection, encrypted tokens
- ✅ Facebook App configured with Instagram Graph API permissions
- ✅ OAuth flow tested successfully (token exchange working)
- ⚠️ Full end-to-end testing pending (requires Instagram Business account connected to Facebook Page)

### Phase 3: Claim Flow (Week 3)
- "Claim This Page" button (bottom of left sidebar on unclaimed profiles)
- Only show on verification_status='unclaimed'
- Claim verification logic
- Error handling (already claimed, wrong account)
- Redirect to onboarding after success
- Delete scraped portfolio after claim

### Phase 4: Add Artist Page (Week 3)
- `/add-artist` route with two paths:
  - "I'm an artist" → OAuth button
  - "Recommend an artist" → Handle input
- Recommend flow: Fetch profile, classifier gate, duplicate check, trigger scraping
- Rate limiting: 5 submissions/IP/hour
- Progressive captcha: After 3 submissions
- "Join as Artist" link in top nav

### Phase 5: Onboarding (Week 4)
- Instagram media fetching
- Profile preview editor
- Portfolio picker (selection, reordering)
- Booking link input
- Success screen with share
- Skip flow handling

### Phase 6: Dashboard - Portfolio (Week 5)
- Free: Manual import UI (max 20)
- Free: Re-curate anytime
- Pro: Pinning UI (drag-drop)
- Pro: Bulk pin/unpin
- Pro: Promote auto-synced to pinned
- Pro: Hide button
- Pro: Auto-sync settings toggle
- Display sync status

### Phase 7: Dashboard - Profile (Week 5)
- Profile editor (bio, location, booking)
- Preview changes
- Save/cancel
- Pro-only fields
- Delete page button (multi-step confirmation: warning → confirm → hard delete → exclusion list)

### Phase 8: Legal Pages (Week 6)
- `/about` page
- `/terms` page (include no-refund policy)
- `/privacy` page
- Update footer with legal links
- Review content (template or lawyer)

### Phase 9: Subscription & Payments (Week 6)
- Stripe integration
- Upgrade modal with promo code
- Free → Pro: Auto-pin existing 20 images on upgrade
- Checkout flow
- Webhook handlers
- Subscription status display
- Downgrade/cancel flows with warnings
- Pro → Free logic: Keep first 20 (pinned priority), unpin all, disable auto-sync
- Customer portal redirect

### Phase 10: Email Notifications (Week 6)
- Resend account and API keys
- Email templates (welcome, subscription expiring, auto-sync failed, downgrade warning)
- Transactional infrastructure
- Downgrade warning: 7 days before end

### Phase 11: Auto-Sync (Week 7)
- Cron job setup
- Instagram API sync logic
- Rate limit handling
- OAuth revocation detection (disable sync, email artist)
- Username change detection (auto-update)
- Sync log UI

### Phase 12: Search Ranking & Badges (Week 7)
- Update search function with Pro/Featured boosts
- Implement Pro crown icon (purple, Lucide Crown)
- Design Featured text badge (gold/editorial)
- Add badges to: search results, profiles, browse pages
- Test ranking logic
- Test badge display (Pro only, Featured only, both)

### Phase 13: Analytics (Week 7)
- Analytics tracking functions
- Dashboard (Pro only)
- Charts and metrics
- Export (CSV)

### Phase 14: Admin Panel (Week 8)
- Admin authentication
- Featured artist management UI
- Promo code creation/management
- Subscription overview
- Manual is_featured toggle

### Phase 15: Polish & Testing (Week 8)
- Error states and loading states
- Mobile responsiveness
- Cross-browser testing
- Code review (code-reviewer subagent)
- Security audit
- Performance testing
- Documentation updates

---

## Critical Decisions & Clarifications

### Confirmed Decisions

✅ **Payment:** Stripe
✅ **Pricing:** $15/month or $150/year
✅ **Featured vs Pro:** Separate, independent flags
✅ **Free tier:** Manual import anytime, max 20, no auto-sync
✅ **Pro tier:** Auto-sync tattoo shots (classifier filtered), unlimited pinning
✅ **Portfolio display:** Pinned first (manual order), then auto-synced (reverse chronological)
✅ **Classifier gate:** Bio contains "tattoo" OR 5+ tattoo images in last 20 posts
✅ **Scraped data:** Delete immediately when claimed (OAuth is source of truth)
✅ **Free → Pro upgrade:** Auto-pin existing 20 images
✅ **Pro → Free downgrade:** Keep first 20 (pinned priority), email warning 7 days before
✅ **Delete page:** Hard delete, add to scraping exclusion list
✅ **OAuth revoked:** Disable auto-sync, email to re-authenticate
✅ **Username change:** Auto-update in database
✅ **Verification status:** Only 'unclaimed' or 'claimed' (no separate "verified")
✅ **Emails:** Use Resend
✅ **Crowdsourced discovery:** `/add-artist` for recommendations (immediate scraping)
✅ **Rate limiting:** 5 submissions/IP/hour
✅ **Captcha:** Progressive (after 3 submissions)

### Common Misconceptions

**Instagram OAuth:**
- ✅ Works with ANY account (private, public, personal, business, creator)
- ✅ Can fetch user's own posts regardless of account type
- ❌ Don't confuse with public scraping

**Concurrent Claims:**
- ❌ Two people claiming same artist is impossible
- ✅ OAuth verifies ownership - only real owner succeeds

**Pro Status:**
- ✅ Remains Pro until end of billing cycle
- ✅ Stripe webhooks handle timing

**Portfolio Limits:**
- ✅ Free: Hard 20 limit
- ✅ Pro: Truly unlimited
- Cost: ~$0.30/year storage + $0.001 embedding one-time per image

**Delete vs Cancel:**
- ✅ Cancel subscription: Keep account, downgrade to Free at period end
- ✅ Delete page: Hard delete everything, exclusion list

### Open Questions

**Technical:**
1. Instagram API access: Public API initially or apply for Business API?
2. Token encryption: Which method? (Supabase Vault recommended)
3. Cron jobs: Vercel Cron (1/day free) or external service?

**Product:**
1. Analytics retention: How long? (Recommend: 365 days)
2. Promo codes: Work for annual plans? (Recommend: Both)
3. Email limits: Resend free = 100/day, 3,000/month. Enough? (Yes for v1)

**Design:**
1. Dashboard theme: Dark editorial or lighter admin?
2. Mobile dashboard: Full support or desktop-only for v1?
3. Onboarding skip: Allow all skips or force minimal setup?

---

## UI/Badge Specifications

### Claim Button
**Location:** Bottom of left sidebar on unclaimed artist profiles
**Display:** Only on verification_status='unclaimed', visible to all visitors
**Design:** Button below Instagram link in sidebar

### Pro Badge
**Visual:** Lucide crown icon only (no text)
**Color:** Purple/premium
**Size:** 16px-20px
**Placement:** Next to artist name (search results, profile, browse pages)

### Featured Badge
**Visual:** "FEATURED" text badge
**Color:** Gold/bronze/editorial (distinct from Pro purple)
**Placement:** Below artist name or card corner

**Both badges:** Crown next to name, Featured text below/adjacent

### Add Artist Page
**Route:** `/add-artist`
**Layout:** Two sections - "Are you an artist?" (OAuth button) and "Know a great artist?" (handle input)
**Top Nav:** "Join as Artist" or "Add Artist" link
**Recommend flow:** Validate → Fetch profile → Duplicate check → Classifier → Queue scraping → Success message

### Delete Page Flow
**Step 1:** Warning modal ("This is permanent, cannot be undone")
**Step 2:** Type "DELETE" to confirm
**Step 3:** Hard delete (images, subscriptions, user record), set deleted_at, exclude_from_scraping, redirect

### Free → Pro Upgrade
Show Stripe Checkout → On webhook: Set is_pro/auto_sync_enabled, auto-pin all existing images → Redirect with success

### Pro → Free Downgrade
**7 days before:** Email warning about portfolio limit
**On end:** Set is_pro=FALSE, auto_sync=FALSE, hide images 21+, unpin all, send email

### OAuth Issues
**Revoked:** Disable sync, email to reconnect, dashboard banner
**Username changed:** Auto-update instagram_username
**Account deleted:** Disable sync, keep page live, artist must cancel subscription manually

---

## Success Metrics

### Launch Goals (Month 1)
- 50+ artists claim pages
- 10+ Pro subscriptions ($150 MRR)
- 80%+ onboarding completion
- 95%+ auto-sync success

### Growth Goals (Months 2-3)
- 200+ total claimed artists
- 50+ Pro subscriptions ($750 MRR)
- <10% monthly churn
- 60%+ Pro users check analytics weekly

---

## Phase Completion Status

### Phase 1: Database Foundation ✅ (Jan 2, 2026)
- **3 migrations applied:** Schema, security functions, critical fixes
- **4 tables added:** artist_subscriptions, promo_codes, artist_analytics, instagram_sync_log
- **3 tables updated:** users, artists, portfolio_images
- **15+ RLS policies:** User data protection, subscription access control
- **8 helper functions:** Analytics tracking, portfolio display, account management
- **Security:** Timing attack prevention, race condition protection, batch optimization

### Phase 2: Instagram OAuth Infrastructure ✅ (Jan 2, 2026)
- **Supabase Vault integration:** Encrypted token storage (no plaintext)
- **OAuth endpoints:** Initiation (/api/auth/instagram), callback (/auth/callback), logout
- **Token management:** Auto-refresh at 7 days remaining, deduplication locks
- **Session system:** Middleware integration with token refresh
- **Security:** CSRF protection, redirect_uri validation, no plaintext tokens
- **Testing:** End-to-end OAuth flow tested and working

### Phase 3: Claim Flow ✅ (Jan 3, 2026)
- **6 files created:** 2 migrations, claim button, claim verification, onboarding, deletion utility
- **1 file modified:** Artist sidebar with claim button
- **Atomic transaction:** claim_artist_profile() RPC prevents race conditions
- **Handle-based matching:** Instagram @username verification (all 1,501 artists have handles)
- **Audit trail:** claim_attempts table logs all attempts with outcome tracking
- **Hard deletion:** Scraped portfolio removed from database + Supabase Storage
- **Error handling:** Handle mismatch, already claimed, missing data scenarios
- **Security:** Input validation (regex), SQL injection prevention, transaction wrapping
- **Code review:** All 5 critical security issues resolved
- **Build test:** TypeScript + production build passing (1,614 static pages)

**Key Implementation Details:**
- `claim_artist_profile()` SECURITY DEFINER function with transaction wrapping
- Race condition protection via UPDATE WHERE verification_status='unclaimed'
- Instagram handle format validation: `^[a-z0-9._]{1,30}$`
- Non-blocking storage cleanup (errors logged but don't block claim)
- Comprehensive error codes: handle_mismatch, already_claimed, artist_not_found, etc.

**Files:**
- `supabase/migrations/20260103_002_phase3_claim_flow.sql` - Handle-based matching
- `supabase/migrations/20260103_003_claim_transaction.sql` - Atomic RPC + audit trail
- `components/artist/ClaimProfileButton.tsx` - Client component
- `lib/artist/claim.ts` - Hard deletion utility
- `app/claim/verify/page.tsx` - Server-side verification
- `app/onboarding/page.tsx` - Basic welcome page

### Phase 4: Add Artist Page ✅ (Jan 4, 2026)
- **1 migration applied:** artist_recommendations table with audit trail
- **6 files created:** Main page, 2 API routes, verify page, classifier, supporting components
- **2 files modified:** Sitemap, Navbar (desktop + mobile nav links)
- **Two-path design:** Self-add (OAuth) + Recommend (public submission)
- **Classifier gate:** Bio keywords OR image classification (GPT-5-mini, 3/6 tattoo images required)
- **Rate limiting:** 5 submissions/hour/IP with in-memory limiter
- **Progressive captcha:** Cloudflare Turnstile after 2nd submission
- **Duplicate detection:** Checks existing artists via get_artist_by_handle RPC
- **Auto-scraping:** Creates scraping_jobs record for approved artists
- **Audit logging:** All submissions logged in artist_recommendations table

**Key Implementation Details:**
- **Self-add flow:** OAuth → Verify page → Classifier → Create artist → Onboarding
- **Recommend flow:** Handle input → Captcha (if needed) → Classifier → Create artist → Queue scraping
- **Classifier:** Two-stage (bio keywords first, then image classification as fallback)
- **Security:** Input validation, rate limiting, Turnstile integration, audit trail
- **Navigation:** "Join as Artist" link in desktop nav + mobile menu

**Files Created:**
- `app/add-artist/page.tsx` - Main landing page with two sections
- `app/add-artist/verify/page.tsx` - Self-add OAuth verification + classifier
- `app/api/add-artist/recommend/route.ts` - Public recommendation API
- `app/api/add-artist/self-add/route.ts` - OAuth redirect endpoint
- `lib/instagram/classifier.ts` - Two-stage tattoo artist classifier
- `lib/instagram/profile-fetcher.ts` - Apify profile scraper
- `components/artist/RecommendSection.tsx` - Recommendation form component
- `components/artist/TurnstileWidget.tsx` - Cloudflare Turnstile widget

**Files Modified:**
- `app/sitemap.ts` - Added /add-artist route
- `components/layout/Navbar.tsx` - Added "Join as Artist" link (desktop + mobile)
- `lib/rate-limiter.ts` - Added checkAddArtistRateLimit function

**Database:**
- `supabase/migrations/20260104_001_add_artist_recommendations.sql` - Audit table

**Build Test:** TypeScript + production build passing (1,622 static pages)

---

**Last Updated:** 2026-01-04
**Status:** Phase 4 complete - Add-Artist page production-ready. Next: Phase 5 (Onboarding/Portfolio Import)
