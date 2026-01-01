---
Last-Updated: 2026-01-01
Maintainer: RB
Status: Planning
---

# User & Artist Account Implementation Plan

*Version 1.0 — January 2026*

---

## Product Specification Summary

### Core Philosophy

1. **Instagram is the identity layer** — No email accounts, no exceptions. All users authenticate via Instagram OAuth through Supabase.
2. **Artists are professionals** — The $15/month Premium tier pays for itself after one client. If that's too steep, they're not the target customer.
3. **Fans don't need accounts for v1** — They browse, search, and click through to Instagram. No login friction.
4. **Two paths to artist pages** — Scraped (unclaimed) or self-created (claimed from day one).

---

## User Types & Features

### Fan / Collector (No Login Required - v1)
Fans browse and discover artists without creating an account. They search by style, location, or visual similarity and click through to Instagram to contact artists.

**Future v2:** Save/collection features requiring login

### Unclaimed Artist (Scraped)
Artist pages created from scraped Instagram data. The artist has no control over their page. Pages are refreshed via re-scraping every 3-12 months to stay current.

### Claimed Basic Artist (Free)
Artists who have verified ownership of their page via Instagram OAuth. They gain control over their representation on Inkdex without paying.

**Features:**
- Import last 20 Instagram posts
- Auto-categorized by style/placement
- Manual curation (reorder, hide)
- Basic profile (name, location, 1 booking link)
- Verified badge
- Delete page option

**The catch:** Manual updates only. New posts don't sync.

### Claimed Pro Artist ($15/month or $150/year)
Full-featured accounts for professional artists serious about client acquisition.

**Features (everything in Free plus):**
- **Unlimited portfolio import**
- **Auto-sync tattoo shots** — new tattoo posts automatically added (classifier filtered)
- **Unlimited pinning** — manually order your best work at the top
- Full profile (bio, pricing, availability badge)
- **Search ranking boost** — appear higher in search results
- Pro badge
- Analytics (views, saves)

**Annual pricing:** $150/year (2 months free)

---

## Feature Comparison Table

| Feature | Unclaimed | Free (Claimed) | Pro ($15/mo) |
|---------|-----------|----------------|--------------|
| Portfolio images | 12 (auto-selected) | 20 (manual import) | Unlimited (auto-sync) |
| Instagram sync | — | One-time import | Auto-sync new posts |
| Curation (reorder/hide) | — | ✓ | ✓ |
| Auto-categorization | AI-generated | ✓ | ✓ |
| Profile | Scraped | Basic (name, location, 1 booking link) | Full (bio, pricing, availability badge) |
| Verified badge | — | ✓ | ✓ |
| Pro badge | — | — | ✓ |
| Analytics | — | — | ✓ |
| Delete page | — | ✓ | ✓ |

---

## Pricing Strategy

### The Core Value Prop
> "Your Instagram is a mess. Inkdex turns it into a portfolio. We pull your posts, sort them by style, and make it easy for clients to find exactly what they're looking for."

### Upgrade Triggers
Natural friction points that prompt upgrades:
1. "You have 47 more posts we couldn't import"
2. "You posted 3 new tattoos this week—upgrade to sync them automatically"
3. "Your last sync was 30 days ago—want to keep it fresh?"

### Promo Codes (Admin)
For launch flexibility:
- X months free (beta testers, influencers)
- % off (partnerships, cross-promos)
- Expiration dates on codes

### Not Doing (for now)
- **Referral program** — adds complexity, unclear ROI at this price point
- **Free trial for Pro** — "try auto-sync for 7 days" isn't compelling enough
- **Lead fees / transactional pricing** — keeping it simple

---

## Onboarding Flow

Both claim and self-add paths converge into the same onboarding flow after Instagram OAuth.

### Flow Entry Points

**Claim existing page:** Artist finds scraped page → "Claim This Page" → OAuth → Delete scraped data, import from OAuth → Onboarding

**Add yourself:** Artist visits /add-artist → Enter Instagram handle → **Classifier gate** → OAuth → Onboarding

#### Classifier Gate (Self-Add Only)

When artist enters Instagram handle on `/add-artist`:
1. Fetch public Instagram profile + recent posts (no auth needed)
2. Check if tattoo artist:
   - **Bio check:** Does bio contain "tattoo", "tattooist", "tattoo artist"?
   - **Portfolio check:** Of last 20 posts, are 5+ classified as tattoo images?
3. If either condition passes → Proceed to OAuth
4. If both fail → Show error: "We couldn't verify you're a tattoo artist. Contact support@inkdex.io if this is wrong."

**Cost:** ~$0.02 per self-add attempt (20 images × $0.001 classifier)

### Onboarding Steps

#### Step 1: "Pulling your work..."
Loading state while fetching from Instagram API. Pull most recent 50-100 posts. No classification needed — that only runs at the initial "is this a tattoo artist" gate.

#### Step 2: "Looking good?"
Preview their page with fresh data. Editable fields inline:
- Name
- Location
- Bio

#### Step 3: "Pick your best work"
Portfolio curation screen.

**Default state:** Most recent 20 images pre-selected.

**UI:** Single scrollable grid of all pulled images. Selected images show checkmark + number (display order). Counter at top shows "18/20" or similar.

**Interaction:**
- Tap selected image → deselects it
- Tap unselected image → selects it (if under 20)
- At 20/20, must deselect one before adding another

**Background loading:** If artist has large feed, continue pulling older posts in background. Grid updates as more images load. Most artists won't scroll that far during onboarding.

**Note:** No classifier runs here. It's their page — if they add non-tattoo images, those won't surface in visual search anyway.

#### Step 4: "Where can clients book you?"
Single input field for booking link. Optional but encouraged.

Examples shown: Instagram DM, email, Booksy, Vagaro, personal site

#### Step 5: "You're live!"
Confirmation screen with:
- Link to their page
- Share button ("Share on your IG story")
- "Edit anytime in your dashboard"

### Skip Behavior
Steps 3 and 4 can be skipped ("Do this later"). Defaults apply:
- Portfolio: most recent 20
- Booking link: none (just "View on Instagram" button)

Artists can complete setup from their admin panel anytime.

---

## Technical Implementation Plan

### Phase 1: Database Schema Updates

#### New Tables

**`users` table** (already exists, enhance):
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_id TEXT UNIQUE NOT NULL,          -- Instagram user ID (from OAuth)
  instagram_username TEXT NOT NULL,            -- @handle
  instagram_access_token TEXT,                 -- OAuth token (encrypted)
  instagram_token_expires_at TIMESTAMPTZ,      -- Token expiration
  instagram_refresh_token TEXT,                -- Refresh token (encrypted)
  email TEXT,                                  -- From Instagram API (optional)
  account_type TEXT NOT NULL DEFAULT 'fan',    -- 'fan', 'artist_free', 'artist_pro'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_instagram_id ON users(instagram_id);
CREATE INDEX idx_users_account_type ON users(account_type);
```

**`artist_subscriptions` table**:
```sql
CREATE TABLE artist_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,             -- 'free', 'pro'
  stripe_subscription_id TEXT,                 -- Stripe subscription ID
  stripe_customer_id TEXT,                     -- Stripe customer ID
  status TEXT NOT NULL DEFAULT 'active',       -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  promo_code TEXT,                             -- Applied promo code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

CREATE INDEX idx_subscriptions_user ON artist_subscriptions(user_id);
CREATE INDEX idx_subscriptions_artist ON artist_subscriptions(artist_id);
CREATE INDEX idx_subscriptions_stripe ON artist_subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON artist_subscriptions(status);
```

**`promo_codes` table**:
```sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                   -- BETA2026, INFLUENCER50, etc.
  discount_type TEXT NOT NULL,                 -- 'months_free', 'percent_off'
  discount_value INTEGER NOT NULL,             -- 3 (months), 50 (percent)
  max_uses INTEGER,                            -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
```

**`artist_analytics` table**:
```sql
CREATE TABLE artist_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  date DATE NOT NULL,                          -- Daily aggregation
  profile_views INTEGER DEFAULT 0,
  image_views INTEGER DEFAULT 0,
  instagram_clicks INTEGER DEFAULT 0,
  booking_link_clicks INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,        -- How many times appeared in search results
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, date)
);

CREATE INDEX idx_analytics_artist_date ON artist_analytics(artist_id, date);
```

**`instagram_sync_log` table**:
```sql
CREATE TABLE instagram_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,                     -- 'manual', 'auto', 'onboarding'
  images_fetched INTEGER,
  images_added INTEGER,
  images_skipped INTEGER,
  status TEXT NOT NULL,                        -- 'success', 'partial', 'failed'
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_log_artist ON instagram_sync_log(artist_id);
CREATE INDEX idx_sync_log_user ON instagram_sync_log(user_id);
```

#### Update Existing Tables

**`artists` table** (enhance):
```sql
ALTER TABLE artists
  ADD COLUMN claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN verification_status TEXT DEFAULT 'unclaimed',  -- 'unclaimed', 'claimed'
  ADD COLUMN is_pro BOOLEAN DEFAULT FALSE,                  -- Paid Pro tier (subscription-based)
  ADD COLUMN is_featured BOOLEAN DEFAULT FALSE,             -- Editorial curation (admin-controlled)
  ADD COLUMN bio_override TEXT,                             -- Custom bio for Pro
  ADD COLUMN booking_link TEXT,
  ADD COLUMN pricing_info TEXT,                             -- For Pro
  ADD COLUMN availability_status TEXT,                      -- 'available', 'booking_soon', 'waitlist', NULL
  ADD COLUMN last_instagram_sync_at TIMESTAMPTZ,
  ADD COLUMN auto_sync_enabled BOOLEAN DEFAULT FALSE,       -- Pro feature
  ADD COLUMN deleted_at TIMESTAMPTZ,                        -- Soft delete timestamp
  ADD COLUMN exclude_from_scraping BOOLEAN DEFAULT FALSE;   -- Don't re-scrape if artist deleted page

CREATE INDEX idx_artists_claimed_by ON artists(claimed_by_user_id);
CREATE INDEX idx_artists_verification ON artists(verification_status);
CREATE INDEX idx_artists_pro ON artists(is_pro);
CREATE INDEX idx_artists_featured ON artists(is_featured);
CREATE INDEX idx_artists_active ON artists(deleted_at) WHERE deleted_at IS NULL;
```

**Note:** `verification_status` only has two values - 'unclaimed' (scraped) or 'claimed' (OAuth connected). No separate "verified" status needed.

**Note on Featured vs Pro:**
- **`is_featured`** - Editorial curation by admin. Can be applied to any artist (Pro, Free, or Unclaimed) to highlight quality portfolios on browse pages.
- **`is_pro`** - Subscription-based paid tier. Gives search ranking boost, auto-sync, and premium features.
- These are **independent** - an artist can be Featured without being Pro, or Pro without being Featured, or both.

**`portfolio_images` table** (enhance):
```sql
ALTER TABLE portfolio_images
  ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,              -- Pro: Manually pinned to top
  ADD COLUMN pinned_position INTEGER,                      -- Display order for pinned images
  ADD COLUMN hidden BOOLEAN DEFAULT FALSE,                 -- User can hide from portfolio
  ADD COLUMN auto_synced BOOLEAN DEFAULT FALSE,            -- Came from auto-sync (Pro only)
  ADD COLUMN manually_added BOOLEAN DEFAULT FALSE,         -- User manually imported (vs scraped)
  ADD COLUMN import_source TEXT DEFAULT 'scrape';          -- 'scrape', 'oauth_onboarding', 'oauth_sync', 'manual_import'

CREATE INDEX idx_portfolio_pinned ON portfolio_images(artist_id, pinned_position) WHERE is_pinned = TRUE AND hidden = FALSE;
CREATE INDEX idx_portfolio_auto_synced ON portfolio_images(artist_id, created_at DESC) WHERE is_pinned = FALSE AND hidden = FALSE;
```

**Portfolio Display Logic:**
```sql
-- Display order for artist portfolio:
-- 1. Pinned images first (ORDER BY pinned_position ASC)
-- 2. Non-pinned images second (ORDER BY created_at DESC - reverse chronological)

SELECT *
FROM portfolio_images
WHERE artist_id = $1 AND hidden = FALSE
ORDER BY
  is_pinned DESC,                    -- Pinned images first
  pinned_position ASC NULLS LAST,    -- Pinned order
  created_at DESC;                   -- Auto-synced/manual reverse chronological
```

### Phase 2: Instagram OAuth Integration

#### Supabase Auth Configuration

**Already configured** (from memory bank), need to verify:
- Instagram OAuth provider enabled in Supabase dashboard
- Client ID and Secret set in environment variables
- Redirect URI: `https://inkdex.io/auth/callback`

#### OAuth Scopes Required
```
instagram_business_basic
instagram_business_content_publish
instagram_business_manage_messages
```

**Note:** Instagram Graph API requires Business or Creator account. Personal accounts won't work. Need to handle this gracefully.

#### Auth Flow Implementation

**New API Routes:**
- `POST /api/auth/instagram/callback` - Handle OAuth callback
- `POST /api/auth/instagram/refresh` - Refresh expired tokens
- `GET /api/auth/session` - Check current auth status
- `POST /api/auth/logout` - Destroy session

**Client Components:**
- `<InstagramLoginButton />` - Triggers OAuth flow
- `<AuthProvider />` - Wraps app with session context
- `useAuth()` hook - Access session, user data

### Phase 3: Instagram API Integration

#### Endpoints Needed

**Instagram Graph API:**
```
GET /{user-id}/media - Get user's media
GET /{media-id} - Get media details
GET /{media-id}/children - Get carousel children
```

**Rate Limits:**
- 200 calls per hour per user
- Need to implement smart pagination and caching

#### New API Routes
- `POST /api/instagram/fetch-media` - Fetch user's Instagram posts
- `POST /api/instagram/import-images` - Import selected images to portfolio
- `GET /api/instagram/sync-status` - Check sync progress

#### Background Jobs (Future)
- Daily auto-sync for Pro accounts (Vercel Cron or external service)
- Token refresh (Vercel Cron)
- Analytics aggregation (Vercel Cron)

### Phase 4: Artist Dashboard

#### Dashboard Routes
```
/dashboard                    - Overview (analytics, recent activity)
/dashboard/portfolio          - Manage portfolio (reorder, hide, import)
/dashboard/profile            - Edit profile (bio, location, booking link)
/dashboard/subscription       - Billing, upgrade, cancel
/dashboard/analytics          - Pro only (views, clicks, trends)
```

#### Dashboard Components
- `<PortfolioCurator />` - Drag-drop image reordering, show/hide toggles
- `<ProfileEditor />` - Form for bio, location, booking link
- `<AnalyticsCharts />` - Pro only (views over time, top images)
- `<SubscriptionManager />` - Upgrade, billing, cancel flows
- `<SyncStatus />` - Last sync time, manual sync button

### Phase 5: Onboarding Flow

#### Onboarding Routes
```
/onboarding/start             - Entry point after OAuth
/onboarding/classifier        - Self-add gate (check if tattoo artist)
/onboarding/preview           - Step 2: Preview profile
/onboarding/portfolio         - Step 3: Pick best work
/onboarding/booking           - Step 4: Booking link
/onboarding/complete          - Step 5: You're live!
```

#### Onboarding Components
- `<InstagramFetcher />` - Loading state while fetching posts
- `<ProfilePreview />` - Editable preview of artist page
- `<PortfolioPicker />` - Grid with selection controls
- `<BookingLinkInput />` - Booking link form
- `<OnboardingComplete />` - Success screen with share button

#### Onboarding State Management
Use Zustand store for onboarding state:
```typescript
interface OnboardingStore {
  step: 1 | 2 | 3 | 4 | 5;
  instagramPosts: InstagramPost[];
  selectedImages: string[];  // Instagram media IDs
  profileData: {
    name: string;
    location: string;
    bio: string;
  };
  bookingLink: string;
  isLoading: boolean;
  error: string | null;
}
```

### Phase 6: Claim Flow

#### Claim Routes
```
/claim/[artistSlug]           - Claim page entry point
/claim/verify                 - Verify ownership via OAuth
/claim/success                - Claim successful, redirect to onboarding
```

#### Claim Process
1. User clicks "Claim This Page" on artist profile
2. Check if already claimed (error if yes)
3. Redirect to Instagram OAuth
4. On callback, verify `instagram_id` matches `artists.instagram_id`
5. If match:
   - Update `claimed_by_user_id`, set `verification_status = 'claimed'`
   - **Delete all scraped portfolio images** for this artist
   - Fetch fresh data from Instagram API (OAuth source)
   - Redirect to onboarding flow
6. If no match: Error "This Instagram account doesn't match this artist page"

**Why delete scraped data:**
- OAuth source is source of truth (fresher, more images available)
- Prevents confusion between scraped vs OAuth images
- Scraped images were auto-selected; artist should curate themselves
- Clean slate for artist to pick their best work

#### Edge Cases
- Artist page scraped with username, but Instagram ID not stored
  - Solution: Fetch Instagram ID from API during claim, update DB
- Artist changed Instagram username since scraping
  - Solution: Match on Instagram ID (user_id), not username
- Artist deleted Instagram account
  - Solution: OAuth will fail, show error message

### Phase 7: Legal Pages & Compliance

Before launching payments, need legal foundation:

#### Required Pages

**`/about`** - About Inkdex
- What we do (AI-powered tattoo artist discovery)
- How it works (CLIP embeddings, Instagram integration)
- Who it's for (fans finding artists, artists getting discovered)
- Team info (can be minimal for v1)

**`/terms`** - Terms of Service
- User accounts and Instagram OAuth
- Pro subscription terms (**no refunds, cancel anytime**)
- Artist content ownership and licensing
- Prohibited use cases
- Termination rights
- DMCA takedown process for artists

**`/privacy`** - Privacy Policy
- What data we collect (Instagram profile data, analytics)
- How we use it (search indexing, artist profiles)
- OAuth token storage and security
- Third-party services (Stripe, Instagram API, Supabase)
- Cookie usage (analytics)
- User rights (data deletion, opt-out)
- GDPR/CCPA compliance (if applicable)

**`/refunds`** - Refund Policy (or just include in TOS)
- **No refunds** on Pro subscriptions (monthly or annual)
- **Cancel anytime** via Stripe Customer Portal
- Keep Pro access until end of billing period (no pro-rating)
- Simple messaging: "Cancel anytime, no refunds. It's $15."

#### Footer Links
Update site footer to include:
- About
- Terms of Service
- Privacy Policy
- Contact (email or support form)

**Note:** Refund policy can be included in TOS instead of separate page (simpler).

#### Stripe Requirements
Stripe requires these links in checkout flow:
- Terms of Service URL (include refund policy here)
- Privacy Policy URL

#### Implementation Notes
- Use simple markdown pages (convert to static HTML)
- Keep language clear and accessible (avoid legalese where possible)
- Consider using a template like [Terms of Service Generator](https://www.termsofservicegenerator.net/)
- Have a lawyer review before Pro launch (can use template for MVP)

### Phase 8: Payment Integration (Stripe)

#### Stripe Setup

**Products:**
- "Inkdex Pro Monthly" - $15/month
- "Inkdex Pro Yearly" - $150/year

**Webhooks:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Handle upgrades/downgrades
- `customer.subscription.deleted` - Handle cancellations
- `invoice.payment_failed` - Handle failed payments

**Checkout Configuration:**
- Include links to `/terms`, `/privacy`, `/refunds` in checkout
- Require customer acceptance of terms
- Email receipts automatically
- Enable Customer Portal for self-service management

#### Payment Routes
```
POST /api/stripe/create-checkout    - Create Stripe Checkout session
POST /api/stripe/webhook             - Handle Stripe webhooks
POST /api/stripe/portal              - Redirect to Stripe Customer Portal
```

#### Payment Flow
1. User clicks "Upgrade to Pro" in dashboard
2. Create Stripe Checkout session with promo code (if any)
3. Redirect to Stripe Checkout
4. On success webhook: Update `artist_subscriptions` table
5. Set `is_pro = TRUE`, `auto_sync_enabled = TRUE` on `artists` table
6. Redirect to `/dashboard?upgraded=true`

#### Promo Code Flow
1. User enters promo code in upgrade modal
2. Validate via `POST /api/promo-codes/validate`
3. If valid: Apply to Stripe Checkout session
4. On checkout, increment `promo_codes.current_uses`
5. Store in `artist_subscriptions.promo_code`

### Phase 9: Auto-Sync (Pro Feature)

#### Sync Strategy

**Daily cron job** (Vercel Cron or external service):
```
0 2 * * * - Run daily at 2am UTC
```

**Process:**
1. Query all `artists` where `is_pro = TRUE` AND `auto_sync_enabled = TRUE`
2. For each artist:
   - Fetch latest 20 posts from Instagram API
   - Compare with existing `portfolio_images` by `instagram_media_id`
   - If new post found:
     - **Run classifier** (GPT-5-mini): "Is this a tattoo image?"
     - If user has "sync all posts" enabled: Skip classifier
     - If classifier returns "no" and "tattoo only" mode: Skip this post
     - If classifier returns "yes" OR "sync all" mode:
       - Download image
       - Generate CLIP embedding
       - Upload to Supabase Storage
       - Insert into `portfolio_images` with `auto_synced = TRUE`, `is_pinned = FALSE`
     - Log in `instagram_sync_log`
3. Handle rate limits (200 calls/hour/user) with batching

**Cost per auto-sync:**
- Classifier: ~$0.001 per image (GPT-5-mini)
- For artist posting 4 new tattoos/month: ~$0.004/month
- Negligible at scale

#### Manual Portfolio Management

**Free Tier:**
- **No auto-sync** - Portfolio is static until manually updated
- Dashboard → "Import from Instagram" button
- Pulls latest 50-100 posts from Instagram
- Grid with checkboxes - select up to 20 images
- Can re-curate anytime (unlimited, just manual)
- If they try to select 21st image: Upgrade prompt

**Pro Tier:**
- **Auto-sync tattoo shots by default** (classifier runs on new posts)
- Can also manually import non-tattoo posts (shop photos, flash sheets, etc.)
- **Unlimited pinning:**
  - Pin images to top of portfolio (manual drag-drop order)
  - Auto-synced images appear below pinned section (reverse chronological)
  - Can promote auto-synced image to pinned
  - Can hide any auto-synced image without turning off auto-sync
- **Auto-sync settings:**
  - Toggle: Auto-sync on/off
  - Default: Only sync tattoo shots (classifier filtered)
  - Option: Sync all posts (no filter) - available but not default

### Phase 10: Search Ranking Logic

#### Featured vs Pro in Search Results

**Current search function** (`search_artists_by_embedding()`):
```sql
-- Currently returns artists ranked purely by similarity score
SELECT artists.*, similarity_score
FROM artists
ORDER BY similarity_score DESC
```

**Updated search with Pro/Featured boosts:**
```sql
SELECT
  artists.*,
  similarity_score,
  (similarity_score +
   CASE WHEN is_pro THEN 0.05 ELSE 0 END +      -- Pro boost: +0.05
   CASE WHEN is_featured THEN 0.02 ELSE 0 END   -- Featured boost: +0.02
  ) as final_score
FROM artists
ORDER BY final_score DESC
```

**Why these values:**
- Pro boost (+0.05) is ~5-10% of typical similarity scores (0.15-0.40 range)
- Featured boost (+0.02) is smaller - quality signal, not pay-to-win
- An artist with both flags gets +0.07 total boost
- Natural high-quality matches can still outrank Pro artists

**Alternative approach** (if boosts feel too subtle):
- Top 3-5 results: Pro artists only (if any match)
- Results 6+: Ranked by pure similarity
- "Sponsored" or "Pro Artist" label on boosted results

**UI Display:**
- Pro badge: Purple/premium "PRO" badge
- Featured badge: Gold/editorial "FEATURED" badge (different color)
- Artists can have both badges

#### Admin Tools for Featured

**Future admin panel routes:**
```
/admin/featured               - Manage featured artists
/admin/featured/[city]        - City-specific featured curation
/admin/featured/[style]       - Style-specific featured curation
```

**Featured selection criteria:**
- Portfolio quality (diverse, professional shots)
- Image count (full portfolio, not sparse)
- Active Instagram (recently posted)
- Can be auto-suggested based on `featured_score`, then admin approves

**Seeding `is_featured` from existing data:**
```sql
-- Use existing featured_score calculation to seed initial featured artists
-- Featured score = follower_count / 10000 (capped at 1.0)
UPDATE artists
SET is_featured = TRUE
WHERE featured_score >= 0.5  -- Artists with 5,000+ followers
  AND image_count >= 12      -- Full portfolio
  AND verification_status != 'unclaimed'  -- Only claimed artists initially
LIMIT 50;  -- Top 50 per city, adjust as needed
```

**Note:** This is just initial seeding. After launch, `is_featured` is manually controlled via admin panel, independent of follower count.

### Phase 12: Analytics (Pro Feature)

#### Analytics Collection

**Page View Tracking:**
```typescript
// On artist profile page load
await supabase.rpc('increment_profile_view', { artist_id })
```

**Click Tracking:**
```typescript
// On Instagram link click
await supabase.rpc('increment_instagram_click', { artist_id })

// On booking link click
await supabase.rpc('increment_booking_click', { artist_id })
```

**Search Appearance Tracking:**
```typescript
// In search results API
await supabase.rpc('increment_search_appearance', { artist_ids: [...] })
```

#### Analytics Dashboard

**Metrics to Show:**
- Total profile views (last 7/30/90 days)
- Total Instagram clicks
- Total booking link clicks
- Search appearances
- Top performing images (most viewed)
- Traffic sources (if we add UTM tracking)

**Charts:**
- Line chart: Views over time
- Bar chart: Top 10 images by views
- Pie chart: Click distribution (Instagram vs Booking vs Other)

### Phase 14: RLS Policies

#### Row-Level Security Rules

**`users` table:**
```sql
-- Users can only read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

**`artists` table:**
```sql
-- Public can read all artists (for browse/search)
CREATE POLICY "Public can read artists"
  ON artists FOR SELECT
  TO public
  USING (true);

-- Artists can update their own profile (if claimed)
CREATE POLICY "Artists can update own profile"
  ON artists FOR UPDATE
  USING (claimed_by_user_id = auth.uid());
```

**`portfolio_images` table:**
```sql
-- Public can read visible images
CREATE POLICY "Public can read visible images"
  ON portfolio_images FOR SELECT
  TO public
  USING (hidden = FALSE);

-- Artists can manage their own images
CREATE POLICY "Artists can manage own images"
  ON portfolio_images FOR ALL
  USING (
    artist_id IN (
      SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
    )
  );
```

**`artist_subscriptions` table:**
```sql
-- Users can only read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON artist_subscriptions FOR SELECT
  USING (user_id = auth.uid());
```

**`artist_analytics` table:**
```sql
-- Artists can only read their own analytics
CREATE POLICY "Artists can read own analytics"
  ON artist_analytics FOR SELECT
  USING (
    artist_id IN (
      SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
    )
  );
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema migrations
- [ ] Update RLS policies
- [ ] Environment setup (Stripe test keys, Instagram OAuth)
- [ ] Supabase Auth Instagram provider verification

### Phase 2: Auth & Basic Flows (Week 2)
- [ ] Instagram OAuth callback handler
- [ ] Token refresh logic
- [ ] Auth middleware for protected routes
- [ ] Basic dashboard shell
- [ ] Logout flow

### Phase 3: Claim Flow (Week 3)
- [ ] "Claim This Page" button on unclaimed artist profiles (bottom of left sidebar)
- [ ] Only show on `verification_status = 'unclaimed'`
- [ ] Claim verification logic
- [ ] Error handling (already claimed, wrong account, etc.)
- [ ] Redirect to onboarding after successful claim
- [ ] Delete scraped portfolio images after successful claim

### Phase 4: Add Artist Page (Week 3)
- [ ] `/add-artist` route and page
- [ ] **Two paths on one page:**
  - "I'm an artist" → Instagram OAuth button
  - "Recommend an artist" → Instagram handle input
- [ ] **Recommend flow:**
  - Fetch public Instagram profile
  - Run classifier gate (bio OR 5+ tattoo images)
  - Check if artist already exists (show existing profile)
  - If new + passes: Trigger immediate scraping
  - Success message: "Thanks! [Artist] will appear soon."
- [ ] **Rate limiting:**
  - 5 submissions per IP per hour
  - Show rate limit error if exceeded
- [ ] **Captcha (progressive):**
  - First 3 submissions: No captcha
  - Submission 4+: Show captcha (e.g., Turnstile, hCaptcha)
- [ ] Add "Add Artist" or "Join as Artist" link to top nav

### Phase 5: Onboarding (Week 4)
- [ ] Instagram media fetching
- [ ] Profile preview editor
- [ ] Portfolio picker (selection, reordering)
- [ ] Booking link input
- [ ] Success screen with share button
- [ ] Skip flow handling

### Phase 6: Dashboard - Portfolio (Week 5)
- [ ] **Free tier:** Manual import UI (grid with checkboxes, max 20)
- [ ] **Free tier:** Re-curate anytime (import new 50-100 posts, select 20)
- [ ] **Pro tier:** Pinning UI (drag-drop to reorder pinned images)
- [ ] **Pro tier:** Bulk pin/unpin actions (select multiple, pin/unpin all)
- [ ] **Pro tier:** Promote auto-synced to pinned (one-click)
- [ ] **Pro tier:** Hide button for auto-synced images
- [ ] **Pro tier:** Auto-sync settings toggle (on/off, tattoo-only vs all posts)
- [ ] Display sync status (last sync time, sync log)
- [ ] Portfolio preview (shows pinned section + auto-synced section)

### Phase 7: Dashboard - Profile (Week 5)
- [ ] Profile editor (bio, location, booking link)
- [ ] Preview changes
- [ ] Save/cancel controls
- [ ] Pro-only fields (pricing, availability)
- [ ] **Delete page button** (with multi-step confirmation)
- [ ] Delete flow: Warning → Confirm → Hard delete all data → Add to scraping exclusion list

### Phase 8: Legal Pages (Week 6)
- [ ] `/about` page - About Inkdex
- [ ] `/terms` page - Terms of Service (include no-refund policy)
- [ ] `/privacy` page - Privacy Policy
- [ ] Update site footer with legal links
- [ ] Review legal content (template or lawyer)

### Phase 9: Subscription & Payments (Week 6)
- [ ] Stripe integration
- [ ] Upgrade modal with promo code input
- [ ] **Free → Pro upgrade flow:** Auto-pin existing 20 images on upgrade
- [ ] Checkout flow
- [ ] Webhook handlers
- [ ] Subscription status display
- [ ] **Downgrade/cancel flows:** Warning UI showing "first 20 images will be kept"
- [ ] Customer portal redirect
- [ ] **Pro → Free logic:** Keep first 20 images (pinned first, then chronological), unpin rest, disable auto-sync

### Phase 10: Email Notifications (Week 6)
- [ ] Set up Resend account and API keys
- [ ] Email templates (welcome, subscription expiring, auto-sync failed, downgrade warning)
- [ ] Transactional email infrastructure
- [ ] **Downgrade warning email:** 7 days before subscription ends, warn about portfolio changes

### Phase 11: Auto-Sync (Week 7)
- [ ] Cron job setup (Vercel Cron or external)
- [ ] Instagram API sync logic
- [ ] Rate limit handling
- [ ] **OAuth revocation detection:** If sync fails with auth error, disable auto-sync, email artist
- [ ] **Username change detection:** Update `instagram_username` if changed
- [ ] Sync log UI in dashboard

### Phase 12: Search Ranking & Badges (Week 7)
- [ ] Update `search_artists_by_embedding()` function with Pro/Featured boosts
- [ ] **Implement Pro crown icon** (Lucide `Crown` component, purple color)
- [ ] **Design Featured text badge** (gold/editorial color)
- [ ] Add badge components to search results (crown + Featured text)
- [ ] Add badge components to artist profile header
- [ ] Add badge components to browse page cards
- [ ] Test ranking logic (verify Pro artists appear higher)
- [ ] Test badge display (Pro only, Featured only, both)

### Phase 13: Analytics (Week 7)
- [ ] Analytics tracking functions
- [ ] Analytics dashboard (Pro only)
- [ ] Charts and metrics
- [ ] Export functionality (CSV)

### Phase 15: Admin Panel (Week 8)
- [ ] Admin authentication (separate from artist auth)
- [ ] Featured artist management UI
- [ ] Promo code creation/management
- [ ] Subscription overview (all Pro users)
- [ ] Manual `is_featured` toggle per artist

### Phase 16: Polish & Testing (Week 8)
- [ ] Error states and loading states
- [ ] Mobile responsiveness
- [ ] Cross-browser testing
- [ ] Code review (use code-reviewer subagent)
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation updates

---

## Open Questions & Decisions Needed

### Technical Questions
1. **Instagram API Access:** Do we need to apply for Instagram Business API access, or can we use the public API initially?
2. **Token Storage:** Should we encrypt access tokens in the database? (Recommended: YES)
3. **Cron Jobs:** Vercel Cron (free tier: 1 cron/day) or external service like Railway/Render?
4. **Image Storage:** Continue using Supabase Storage, or move Pro user images to separate bucket?

### Remaining Product Questions
1. **Analytics Retention:** How long do we store daily analytics? (Recommend: 365 days)
2. **Promo Codes:** Should promo codes work for annual plans, or just monthly? (Recommend: Both)
3. **Email sending limits:** Resend free tier = 100 emails/day, 3,000/month. Enough for v1?

### Product Decisions Confirmed
✅ **Free tier portfolio:** Manual import anytime, max 20 images, no auto-sync
✅ **Pro tier auto-sync:** Default to tattoo shots only (classifier filtered)
✅ **Pro tier pinning:** Unlimited pinning with drag-drop reordering + bulk actions
✅ **Portfolio display:** Pinned images first (manual order), then auto-synced (reverse chronological)
✅ **Hide functionality:** Pro users can hide any auto-synced image without disabling auto-sync
✅ **Classifier gate:** Check bio for "tattoo" OR 5+ tattoo images in last 20 posts
✅ **Scraped data cleanup:** Delete immediately when claimed (OAuth is source of truth)
✅ **Free → Pro upgrade:** Auto-pin existing 20 images
✅ **Pro → Free downgrade:** Keep first 20 (pinned first, then chronological), email warning 7 days before
✅ **Delete page:** Hard delete all data, add to scraping exclusion list
✅ **OAuth revoked:** Disable auto-sync, email artist to re-authenticate
✅ **Instagram username change:** Auto-update in database
✅ **Instagram account deleted:** Sync fails, artist must cancel subscription manually
✅ **Verification status:** Only 'unclaimed' or 'claimed' (no separate "verified")
✅ **Email notifications:** Use Resend for transactional emails
✅ **This is v1:** Accounts are a major feature, not MVP
✅ **Crowdsourced discovery:** `/add-artist` page for users to recommend artists (immediate scraping)
✅ **Rate limiting:** 5 submissions per IP per hour
✅ **Captcha:** Progressive (shows after 3 submissions)
✅ **No attribution tracking:** Don't track who recommended which artist

### Design Questions
1. **Dashboard Theme:** Match dark editorial style of main site, or lighter admin UI?
2. **Mobile Dashboard:** Full mobile support or desktop-only for v1?
3. **Onboarding Skip:** Allow users to skip all steps and complete later, or force minimal setup?

### Legal/Compliance Questions
1. **Terms of Service:** Need TOS for Pro subscriptions and Instagram data usage
   - **Recommendation:** Use template generator, have lawyer review before launch
   - **Key sections:** Artist content licensing, prohibited use, termination rights, DMCA process
2. **Privacy Policy:** Update to reflect user data collection and Instagram OAuth
   - **Recommendation:** Template + lawyer review
   - **Key sections:** OAuth token storage, Instagram data usage, third-party services (Stripe, Supabase)
3. **Refund Policy:** What's the refund policy for Pro subscriptions?
   - **Decision:** No refunds (it's $15, not worth the hassle)
   - **Cancel anytime:** Keep access until end of billing period via Stripe portal
   - **Include in TOS:** Don't need separate refund page
4. **Stripe Checkout Requirements:** Must link to TOS, Privacy, Refunds in checkout flow
5. **Contact/Support:** Need support email or form for legal/billing issues
   - **Recommendation:** support@inkdex.io or contact form in footer

---

## Success Metrics

### Launch Goals (Month 1)
- **Artists Claimed:** 50+ artists claim their pages
- **Pro Conversions:** 10+ Pro subscriptions ($150 MRR)
- **Onboarding Completion:** 80%+ complete onboarding flow
- **Sync Success Rate:** 95%+ auto-sync success (Pro)

### Growth Goals (Months 2-3)
- **Artists Claimed:** 200+ total claimed artists
- **Pro Conversions:** 50+ Pro subscriptions ($750 MRR)
- **Churn Rate:** <10% monthly churn
- **Analytics Engagement:** 60%+ Pro users check analytics weekly

---

## Next Steps

1. **Review this spec with RB** - Confirm product decisions and open questions
2. **Prioritize phases** - Can we ship in 8 weeks, or do we need to adjust scope?
3. **Technical validation** - Verify Instagram API access and limitations
4. **Legal pages** - Draft About, TOS, Privacy, Refunds using templates
5. **Design mockups** - Create wireframes for onboarding and dashboard
6. **Database migration plan** - Test migrations on staging environment
7. **Stripe setup** - Create account, configure products ($15/mo, $150/yr)
8. **Cost estimation** - Calculate Stripe fees (2.9% + 30¢), Instagram API costs, cron job costs

## Confirmed Decisions

✅ **Payment processor:** Stripe
✅ **Pricing:** $15/month or $150/year (Pro tier)
✅ **Featured vs Pro:** Separate and independent flags
✅ **Pro benefits:** Search boost, auto-sync, unlimited portfolio, analytics
✅ **Featured:** Admin-controlled editorial curation on browse pages
✅ **Legal pages required:** About, TOS, Privacy (no refunds policy)

---

**Last Updated:** 2026-01-02
**Status:** V1 spec complete - Ready for Phase 1 implementation

---

## Common Misconceptions & Clarifications

**Instagram OAuth vs Public Scraping:**
- ✅ OAuth works with **ANY** Instagram account (private, public, personal, business, creator)
- ✅ When user authenticates via OAuth, we can fetch **their own posts** regardless of account type
- ❌ Don't confuse this with public scraping (which requires public account and has limits)
- **Implication:** No need to check account type or require business account

**Concurrent Claim Attempts:**
- ❌ Two people claiming same scraped artist is **impossible**
- ✅ OAuth verifies Instagram account ownership - only the actual account owner can succeed
- **Implication:** No race condition handling needed

**Pro Status Timing:**
- ✅ Pro users remain Pro **until end of billing cycle** (not immediate downgrade)
- ✅ Search boost, auto-sync, unlimited portfolio remain active until `current_period_end`
- ✅ On subscription end (not cancellation), features downgrade
- **Implication:** Stripe webhooks handle timing, not manual checks

**Portfolio Limits:**
- ✅ Free tier: Hard limit of 20 images
- ✅ Pro tier: Truly unlimited (no artificial cap)
- **Cost consideration:** Each image costs storage + embedding (~$0.30 storage/year + $0.001 embedding one-time)
- **Practical limit:** Instagram has ~1,000 post limit per account anyway

**Delete vs Cancel:**
- ✅ **Cancel subscription:** Keep account, downgrade to Free at end of period
- ✅ **Delete page:** Hard delete everything, add to scraping exclusion list
- **Implication:** Two separate flows, clear distinction

---

## UI/Badge Specifications

### Claim Button Placement

**Location:** Bottom of left side details section on unclaimed artist pages

**Display logic:**
- Only show on unclaimed artists (`verification_status = 'unclaimed'`)
- Hidden on claimed artists
- Visible to all visitors (public)

**Design:**
```
[Artist profile left sidebar]
  Name
  Location
  Instagram link
  ---
  [Claim This Page] ← Button here
```

### Badge System

**Pro Badge:**
- **Visual:** Lucide `crown` icon (icon only, no text)
- **Color:** Purple/premium color to indicate paid tier
- **Size:** Small (16px-20px) - should be subtle next to name
- **Implementation:** `<Crown className="h-4 w-4 text-purple-500" />` (from lucide-react)
- **Placement:**
  - Search results: Next to artist name
  - Artist profile: Next to name in header
  - Browse pages: Next to name in artist cards

**Featured Badge:**
- **Visual:** Text badge "FEATURED"
- **Color:** Gold/bronze/editorial color (distinct from Pro purple)
- **Placement:**
  - Search results: Below artist name or in corner of card
  - Artist profile: In header (separate from Pro icon)
  - Browse pages: Prominent on artist cards

**When artist has both Pro + Featured:**
- Crown icon next to name
- Featured text badge below or adjacent
- Example:
  ```
  Artist Name 👑
  [FEATURED]
  ```
- Implementation:
  ```tsx
  <div className="flex items-center gap-2">
    <h1>{artist.name}</h1>
    {artist.is_pro && <Crown className="h-4 w-4 text-purple-500" />}
  </div>
  {artist.is_featured && (
    <span className="badge-featured">FEATURED</span>
  )}
  ```

**Design rationale:**
- Pro icon = No text = Doesn't compete with Featured text badge
- Featured text = Editorial signal, more prominent
- Both can coexist without visual clutter

### Add Artist Page

**Route:** `/add-artist`

**Layout:**
```
┌─────────────────────────────────────────┐
│   Add a Tattoo Artist to Inkdex         │
│                                         │
│   Are you an artist?                    │
│   [Connect Your Instagram] ← OAuth     │
│                                         │
│   ─── OR ───                            │
│                                         │
│   Know a great artist?                  │
│   [@username]                           │
│   [Add Artist] ← Scraping              │
└─────────────────────────────────────────┘
```

**Top Nav:**
- Add "Join as Artist" or "Add Artist" link
- Links to `/add-artist`

**Recommend Artist Flow:**
1. User enters Instagram handle (e.g., `@artistname`)
2. Validate handle format
3. Fetch public Instagram profile (no auth)
4. Check if artist already exists in database
   - If exists: Redirect to existing profile with message "Already on Inkdex!"
5. Run classifier gate (bio contains "tattoo" OR 5+ of last 20 posts are tattoos)
6. If pass:
   - Trigger immediate scraping (same flow as manual discovery)
   - Show success: "Thanks! [Artist Name] will appear on Inkdex soon."
   - (Scraping happens async in background)
7. If fail:
   - Show error: "We couldn't verify this is a tattoo artist. Contact support@inkdex.io if this is wrong."

**Rate Limiting (IP-based):**
- 5 submissions per IP per hour
- Store in Redis or in-memory (Vercel KV)
- After 5th submission: "You've reached the limit. Try again in [X] minutes."

**Captcha (Progressive):**
- Submissions 1-3: No captcha (frictionless)
- Submission 4+: Show captcha (Cloudflare Turnstile or hCaptcha)
- Prevents bot abuse while keeping UX smooth for real users

**Technical Implementation:**
- POST `/api/artists/recommend` endpoint
- Rate limit check → Captcha check → Duplicate check → Classifier → Scraping queue
- Return immediate response (don't wait for scraping to complete)
- Background job processes scraping

---

## Additional Implementation Details

### Delete Page Flow

When artist clicks "Delete My Page" in dashboard:

1. **Step 1:** Warning modal
   - "Are you sure? This will permanently delete your profile and all portfolio images."
   - "This action cannot be undone."
   - [Cancel] [Continue]

2. **Step 2:** Confirmation input
   - "Type DELETE to confirm"
   - Text input (must match "DELETE" exactly)
   - [Cancel] [Delete My Page]

3. **Step 3:** Hard delete
   - Delete all `portfolio_images` for this artist (from DB + Supabase Storage)
   - Delete from `artist_subscriptions` (cancel Stripe subscription if active)
   - Set `artists.deleted_at = NOW()`
   - Set `artists.exclude_from_scraping = TRUE`
   - Delete user from `users` table (CASCADE deletes subscriptions, saved artists, etc.)
   - Redirect to homepage with toast: "Your page has been deleted."

4. **Scraping exclusion:**
   - Store `instagram_id` in exclusion list
   - Future scraping scripts check exclusion list
   - If excluded artist found, skip

### Free → Pro Upgrade Flow

When Free user clicks "Upgrade to Pro":

1. Show Stripe Checkout with promo code input (optional)
2. On successful payment webhook:
   - Set `is_pro = TRUE`, `auto_sync_enabled = TRUE`
   - **Auto-pin all existing 20 images:**
     ```sql
     UPDATE portfolio_images
     SET is_pinned = TRUE,
         pinned_position = ROW_NUMBER() OVER (ORDER BY created_at DESC)
     WHERE artist_id = $1;
     ```
   - Enable unlimited import
3. Redirect to dashboard with success message: "Welcome to Pro! Your 20 images are now pinned. Import more anytime."

### Pro → Free Downgrade Flow

When Pro subscription ends or is canceled:

1. **7 days before end:** Send email warning
   - "Your Pro subscription ends in 7 days"
   - "Your portfolio will be limited to 20 images (pinned first)"
   - Link to re-subscribe

2. **On subscription end:**
   - Set `is_pro = FALSE`, `auto_sync_enabled = FALSE`
   - **Keep only first 20 images:**
     ```sql
     -- Mark images 21+ as hidden
     WITH ranked_images AS (
       SELECT id,
              ROW_NUMBER() OVER (
                ORDER BY is_pinned DESC, pinned_position ASC NULLS LAST, created_at DESC
              ) as rank
       FROM portfolio_images
       WHERE artist_id = $1 AND hidden = FALSE
     )
     UPDATE portfolio_images
     SET hidden = TRUE
     WHERE id IN (SELECT id FROM ranked_images WHERE rank > 20);

     -- Unpin all images (Free tier doesn't have pinning)
     UPDATE portfolio_images
     SET is_pinned = FALSE, pinned_position = NULL
     WHERE artist_id = $1;
     ```
   - Send email: "Your Pro subscription has ended. Portfolio limited to 20 images."

### OAuth Issues Handling

**OAuth Revoked:**
- Daily cron detects auth failure
- Set `auto_sync_enabled = FALSE`
- Send email: "We couldn't sync your Instagram. Please reconnect in your dashboard."
- Dashboard shows banner: "Auto-sync disabled. [Reconnect Instagram]"

**Username Changed:**
- Daily cron detects username mismatch (Instagram ID stays same)
- Update `artists.instagram_username` automatically
- No user notification needed

**Instagram Deleted:**
- Daily cron detects profile not found
- Disable auto-sync
- Keep page live until artist manually deletes or subscription expires
- Artist must cancel subscription manually (Stripe Customer Portal)

**Last Updated:** 2026-01-02
