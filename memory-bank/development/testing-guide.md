---
Last-Updated: 2026-01-05
Maintainer: RB
Status: Phase 5 Testing Infrastructure Complete
---

# Development Testing Guide

Complete guide to testing artist onboarding and account features using dev-only tools and seeded test users.

---

## Quick Start

### 1. Access Dev Login
```bash
# Start dev server
npm run dev

# Navigate to dev login (development only)
http://localhost:3000/dev/login
```

### 2. Select Test User
Three pre-seeded test users available:
- **Unclaimed Artist (Jamie Chen)** - Test claim flow
- **Free Tier Artist (Alex Rivera)** - Test free dashboard features
- **Pro Tier Artist (Morgan Black)** - Test pro features

### 3. Login Flow
1. Select user from dropdown
2. Click "Login as [User]"
3. Browser will verify OTP and set session cookies
4. Redirects to dashboard (or artist profile if unclaimed)

---

## Test User Accounts

### Overview
Three test users created with realistic portfolios using cloned images from production artists. All users use existing storage paths and embeddings (no file duplication).

### Test User Details

#### 1. Jamie Chen (@test_unclaimed_artist)
**Account Type:** Fan account with unclaimed artist profile
**Purpose:** Test artist claim flow

**Profile:**
- Location: Austin, TX
- Instagram: @test_unclaimed_artist
- Portfolio: 12 cloned images
- Status: `verification_status='unclaimed'`
- No Supabase Auth user initially (artist exists but unclaimed)

**Test Scenarios:**
- View unclaimed artist profile
- Click "Claim This Page" button
- Complete Instagram OAuth verification
- Complete 5-step onboarding flow
- Transform from unclaimed → claimed

**Access:**
```
Profile URL: /texas/austin/artists/jamie-chen
Dev Login: Select "Unclaimed Artist (Jamie Chen)"
```

---

#### 2. Alex Rivera (@test_free_artist)
**Account Type:** Artist account, free tier
**Purpose:** Test free tier dashboard and features

**Profile:**
- User ID: `7cde2a51-2ab5-42a5-b0d3-9541f0e31c21`
- Artist ID: `9ee81644-6619-438e-a83f-928accb8c317`
- Location: Los Angeles, CA
- Instagram: @test_free_artist
- Portfolio: 18 cloned images
- Status: `verification_status='claimed'`
- Tier: Free (no subscription)

**Test Scenarios:**
- Artist dashboard access
- Portfolio management (view, reorder)
- Profile editing (bio, pricing, availability)
- Analytics viewing (profile views, clicks)
- Booking link management
- Free tier limitations

**Access:**
```
Profile URL: /california/los-angeles/artists/alex-rivera
Dev Login: Select "Free Tier Artist (Alex Rivera)"
Email: test-free@inkdex.dev
```

---

#### 3. Morgan Black (@test_pro_artist)
**Account Type:** Artist account, pro tier
**Purpose:** Test pro features and subscription management

**Profile:**
- User ID: `34f20c4e-03b3-4806-a9d4-5e60acd02ddd`
- Artist ID: `da482c81-5ea6-4451-acc4-c2da7c290366`
- Location: New York, NY
- Instagram: @test_pro_artist
- Portfolio: 20 cloned images
- Status: `verification_status='claimed'`
- Tier: Pro ($15/month subscription active)
- Featured: No (can be toggled)

**Subscription Details:**
- Stripe Customer ID: `cus_test_morgan_black`
- Stripe Subscription ID: `sub_test_morgan_black`
- Status: `active`
- Current Period: 2026-01-01 to 2026-02-01

**Test Scenarios:**
- Pro dashboard features
- Advanced analytics
- Portfolio management (up to 50 images)
- Priority placement in search
- Subscription management
- Billing portal access
- Pro badge display
- Featured artist toggle

**Access:**
```
Profile URL: /new-york/new-york/artists/morgan-black
Dev Login: Select "Pro Tier Artist (Morgan Black)"
Email: test-pro@inkdex.dev
```

---

## Seeding Script

### Overview
Idempotent script that creates all 3 test users with cloned portfolios. Safe to run multiple times.

### Running the Seeder

```bash
# Full path execution
npx tsx scripts/seed/create-test-users.ts

# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=https://aerereukzoflvybygolb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### What It Does

**Phase 1: Create Auth Users**
1. Checks if auth users already exist (idempotent)
2. Creates Supabase Auth users with synthetic emails
3. Generates stable UUIDs for test users

**Phase 2: Create User Records**
1. Inserts rows into `users` table
2. Sets Instagram handles and synthetic IDs
3. Links to auth user IDs

**Phase 3: Create Artist Profiles**
1. Creates artist records with proper slugs
2. Sets verification status (unclaimed/claimed)
3. Links artists to user accounts (except unclaimed)
4. Sets location data (city, state)

**Phase 4: Clone Portfolio Images**
1. Finds real artists with good portfolios
2. Clones `portfolio_images` rows (reuses storage paths)
3. Keeps embeddings intact (search works immediately)
4. Marks with `import_source='manual_import'`
5. Respects target counts (12, 18, 20 images)

**Phase 5: Create Pro Subscription**
1. Only for Morgan Black
2. Creates active subscription record
3. Sets current period (30 days)
4. Uses test Stripe IDs

### Output Example

```
🌱 Starting test user seeding...

📧 Creating Supabase Auth users...
   ✅ Unclaimed Artist: test-unclaimed@inkdex.dev
   ✅ Free Tier Artist: test-free@inkdex.dev (7cde2a51-2ab5-42a5-b0d3-9541f0e31c21)
   ✅ Pro Tier Artist: test-pro@inkdex.dev (34f20c4e-03b3-4806-a9d4-5e60acd02ddd)

👤 Creating user records...
   ✅ Unclaimed user record
   ✅ Free tier user: @test_free_artist
   ✅ Pro tier user: @test_pro_artist

🎨 Creating artist profiles...
   ✅ Jamie Chen (unclaimed) - /texas/austin/artists/jamie-chen
   ✅ Alex Rivera (free) - /california/los-angeles/artists/alex-rivera
   ✅ Morgan Black (pro) - /new-york/new-york/artists/morgan-black

🖼️  Cloning portfolio images...
   ✅ Jamie Chen: 12 images cloned
   ✅ Alex Rivera: 18 images cloned
   ✅ Morgan Black: 20 images cloned

💳 Creating pro subscription...
   ✅ Morgan Black: Active subscription created

✅ Test user seeding complete!
```

### Cleanup (If Needed)

```sql
-- Delete test artists and cascading data
DELETE FROM artists WHERE instagram_handle LIKE 'test_%';

-- Delete test auth users (via Supabase dashboard or admin API)
-- Navigate to: https://supabase.com/dashboard/project/[id]/auth/users
-- Search for: test-unclaimed@inkdex.dev, test-free@inkdex.dev, test-pro@inkdex.dev
```

### Troubleshooting

**Error: "A user with this email address has already been registered"**
- Test users already exist (script is idempotent, this is expected)
- Script will reuse existing auth users and continue

**Error: "Missing required environment variables"**
- Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Copy from `.env.local` file

**Error: "Could not find the 'booking_link' column"**
- Should be `booking_url` (was fixed in v2)
- Re-pull latest code or update column name manually

**Error: "Database constraint check failed"**
- Verify `verification_status` constraint includes 'claimed'
- Run migration: `20260105_002_fix_verification_status_constraint.sql`

---

## Dev Login System

### Architecture

**Security Model:**
- Only works when `NODE_ENV=development`
- Middleware blocks `/dev/*` routes in production (returns 404)
- Client-side components check `NODE_ENV` and return `notFound()`
- Uses service role credentials for admin operations

**Authentication Flow:**
1. **User selects test user** on `/dev/login` page
2. **Client sends POST** to `/api/dev/login` with `userId`
3. **Server validates** userId is a known test user
4. **Server generates** magic link token using `admin.generateLink()`
5. **Server returns** `token_hash` to client
6. **Client calls** `supabase.auth.verifyOtp()` with token_hash
7. **Browser session** cookies set by verifyOtp()
8. **Client redirects** to dashboard or artist profile

### Why Two-Step Auth?

**Problem:** Server-side `verifyOtp()` creates session on server, not in browser.

**Solution:** Server generates token, client verifies it to set cookies properly.

### Files Involved

```
app/dev/login/page.tsx              # UI for test user selection
app/api/dev/login/route.ts          # Token generation endpoint
lib/dev/test-users.ts               # Hardcoded test user constants
lib/supabase/middleware.ts          # Blocks /dev in production
```

### Usage Examples

**Typical Dev Workflow:**
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to dev login
open http://localhost:3000/dev/login

# 3. Select "Free Tier Artist (Alex Rivera)"
# 4. Click "Login as Free"
# 5. Redirected to /dashboard
```

**Testing Claim Flow:**
```bash
# 1. Login as unclaimed user
http://localhost:3000/dev/login → Select "Unclaimed Artist"

# 2. Navigate to profile
http://localhost:3000/texas/austin/artists/jamie-chen

# 3. Click "Claim This Page" button
# 4. Would normally trigger Instagram OAuth (skip in dev)
# 5. Complete onboarding flow
```

**Production Behavior:**
```bash
# Navigate to /dev/login in production
curl https://inkdex.io/dev/login
# Returns: 404 Not Found (blocked by middleware)
```

### Debugging Tips

**Check if logged in:**
```javascript
// In browser console
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
console.log(user); // Should show test user
```

**Verify session cookies:**
```bash
# In browser DevTools → Application → Cookies
# Look for: sb-aerereukzoflvybygolb-auth-token
```

**Check server logs:**
```bash
# Terminal running npm run dev
[Dev] Logging in as test user: test-free@inkdex.dev
[Dev] Generated auth token for: test-free@inkdex.dev
```

---

## Onboarding Flow Testing

### 5-Step Flow Overview

1. **Fetch** - Auto-fetches 50 Instagram images, classifies with GPT-4o-mini
2. **Preview** - Edit profile (name, city, state, bio)
3. **Portfolio** - Select up to 20 best images
4. **Booking** - Optional booking URL
5. **Complete** - Atomic finalization + success page

### Entry Points

**Via Claim Flow:**
```
1. Visit unclaimed artist profile
2. Click "Claim This Page"
3. Complete OAuth (or use dev login)
4. Redirects to: /onboarding/fetch?artist_id={id}&claimed=true
```

**Via Self-Add Flow:**
```
1. Visit /add-artist
2. Click "Connect with Instagram"
3. Complete OAuth + classifier gate
4. Redirects to: /onboarding/fetch?artist_id={id}&new=true
```

### Testing Each Step

#### Step 1: Fetch
**URL:** `/onboarding/fetch?artist_id={id}`

**What It Does:**
- Auto-fetches on mount via `useEffect`
- Calls `/api/onboarding/fetch-instagram` (POST)
- Fetches 50 images from Apify scraper
- Classifies in batches of 6 with GPT-4o-mini
- Creates onboarding session in database
- Auto-redirects to preview on success

**Testing:**
```bash
# Manual API test (requires auth)
curl -X POST http://localhost:3000/api/onboarding/fetch-instagram \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-aerereukzoflvybygolb-auth-token=..." \
  -d '{}'

# Expected response:
{
  "sessionId": "uuid-here",
  "classifiedCount": 42,
  "totalImages": 50
}
```

**Loading States:**
1. "Connecting to Instagram..." (0-5s)
2. "Pulling 50 posts..." (5-30s)
3. "Analyzing images..." (30-60s)
4. "Found 42 tattoo images" (success)
5. Auto-redirect to preview (after 1.5s)

**Error Scenarios:**
- Private account → 403 error
- Rate limited → 429 error (3/hour limit)
- OpenAI failure → Marks images as non-tattoo
- No Instagram username → Error page

---

#### Step 2: Preview
**URL:** `/onboarding/preview?session_id={id}`

**What It Does:**
- Fetches session data on mount
- Validates session belongs to current user
- Pre-populates form with Instagram bio/username
- Two-column layout (edit + preview)
- Saves to `profile_updates` JSONB field

**Testing:**
```javascript
// In browser console after reaching preview page
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();

// Check session data
const { data } = await supabase
  .from('onboarding_sessions')
  .select('*')
  .eq('id', 'session-id-from-url')
  .single();

console.log(data.profile_data);    // Instagram bio, username
console.log(data.profile_updates);  // User edits
```

**Form Validation:**
- Name: 2-100 characters (required)
- City: Required
- State: Required
- Bio: Max 500 characters (optional)

**Error Scenarios:**
- No session ID → Redirects to /add-artist
- Session not found → Error + redirect
- Session expired (>24h) → Error + redirect
- Session belongs to different user → Error + redirect

---

#### Step 3: Portfolio
**URL:** `/onboarding/portfolio?session_id={id}`

**What It Does:**
- Fetches `fetched_images` from session
- Displays only classified=true images
- Allows selecting up to 20 images
- Saves selections to `selected_image_ids` array

**Testing:**
```javascript
// Check fetched images
const { data } = await supabase
  .from('onboarding_sessions')
  .select('fetched_images')
  .eq('id', 'session-id')
  .single();

console.log(data.fetched_images);
// [
//   { url: "...", instagram_post_id: "onboard_...", classified: true },
//   ...
// ]
```

**UI States:**
- Loading: Spinner while fetching session
- Error: No images found → "Go back and fetch first"
- Success: Grid of classified images

**Selection Logic:**
- Click image → Toggle selection
- Max 20 selected (disables adding more)
- Min 1 required to continue
- Continue button disabled if 0 selected

**Error Scenarios:**
- Session has no images → Error state
- Session not found → Error + redirect
- Images failed to load → Error message

---

#### Step 4: Booking
**URL:** `/onboarding/booking?session_id={id}`

**What It Does:**
- Optional booking URL input
- Validates URL format (http/https)
- Allows skipping entirely
- Saves to `booking_link` field

**URL Validation:**
```javascript
// Valid URLs
https://instagram.com/yourhandle
https://calendly.com/yourname
https://your-website.com/book
http://localhost:3000/booking

// Invalid URLs
javascript:alert('xss')
data:text/html,<script>...
just-a-string
```

**Testing:**
```bash
# Test validation
# Enter: "instagram.com/test" (missing protocol)
# Expected: Error - "Please enter a valid URL"

# Enter: "https://instagram.com/test"
# Expected: Saves successfully
```

**Skip Flow:**
- Click "Skip for now" button
- Proceeds to complete step
- booking_link remains null in session

---

#### Step 5: Complete
**URL:** `/onboarding/complete?session_id={id}`

**What It Does:**
- Auto-calls `/api/onboarding/finalize` on mount
- Atomic transaction:
  1. Update artist record (name, city, state, bio, booking_url)
  2. Insert portfolio_images (selected images)
  3. Delete onboarding_session
- Shows success UI with profile link
- Triggers background embedding generation (future)

**Testing:**
```bash
# Monitor finalize call
# Browser DevTools → Network → Filter: finalize

POST /api/onboarding/finalize
{
  "sessionId": "uuid-here"
}

# Response:
{
  "artistSlug": "alex-rivera",
  "message": "Onboarding complete!"
}
```

**Transaction Atomicity:**
```sql
-- Check what happens if finalize is called twice
-- Second call should fail gracefully (session deleted)

-- Verify artist created
SELECT * FROM artists WHERE slug = 'new-artist-slug';

-- Verify portfolio inserted
SELECT COUNT(*) FROM portfolio_images WHERE artist_id = 'new-artist-id';
-- Should match selected_image_ids.length

-- Verify session deleted
SELECT * FROM onboarding_sessions WHERE id = 'session-id';
-- Should return no rows
```

**Success States:**
1. "Finalizing..." (loading)
2. "You're Live on Inkdex! 🎉" (success)
3. Buttons: "View Profile" + "Go to Dashboard"

**Error Scenarios:**
- Session not found (already finalized) → Error
- Database error → 500 error
- Image insert fails → Rollback artist creation

---

## Rate Limiting

### Onboarding Endpoints

**Limit:** 3 onboarding sessions per hour per user

**Protected Routes:**
- `/api/onboarding/fetch-instagram` - 3/hour
- `/api/onboarding/update-session` - 3/hour
- `/api/onboarding/finalize` - 3/hour

**Implementation:**
```typescript
// lib/rate-limiter.ts
export function checkOnboardingRateLimit(identifier: string) {
  return globalRateLimiter.check(
    `onboarding:${identifier}`,
    3,              // 3 sessions
    60 * 60 * 1000  // per hour
  );
}
```

**Response Headers (on 429):**
```
X-RateLimit-Reset: 2026-01-05T15:30:00.000Z
```

**Testing:**
```bash
# Test rate limiting
# Call fetch-instagram 4 times rapidly

# Attempts 1-3: Success (200)
# Attempt 4: Rate limited (429)
{
  "error": "Too many onboarding attempts. Please try again later."
}
```

**Bypass in Tests:**
```typescript
// Temporarily increase limit for testing
// lib/rate-limiter.ts
return globalRateLimiter.check(
  `onboarding:${identifier}`,
  100,  // Effectively unlimited for testing
  60 * 60 * 1000
);
```

---

## Session Management

### Session Lifecycle

**Creation:**
- Created in `/api/onboarding/fetch-instagram`
- Expires in 24 hours (`NOW() + INTERVAL '24 hours'`)

**Updates:**
- Step 2 (preview): Updates `profile_updates`
- Step 3 (portfolio): Updates `selected_image_ids`
- Step 4 (booking): Updates `booking_link`

**Deletion:**
- Automatic expiry after 24 hours
- Manual deletion in `/api/onboarding/finalize` (success)

### Session Schema

```typescript
interface OnboardingSession {
  id: UUID;
  user_id: UUID;
  artist_id: UUID | null;

  // Fetched from Instagram
  fetched_images: {
    url: string;
    instagram_post_id: string;
    caption: string | null;
    classified: boolean;
  }[];

  profile_data: {
    bio: string;
    follower_count: number;
    username: string;
  };

  // User selections
  selected_image_ids: string[];
  profile_updates: {
    name: string;
    city: string;
    state: string;
    bio: string;
  };
  booking_link: string | null;

  current_step: number;
  created_at: timestamp;
  expires_at: timestamp;
}
```

### Checking Session Status

```sql
-- Active sessions
SELECT
  id,
  user_id,
  current_step,
  created_at,
  expires_at,
  expires_at - NOW() as time_remaining
FROM onboarding_sessions
WHERE expires_at > NOW();

-- Expired sessions (should be cleaned up)
SELECT COUNT(*)
FROM onboarding_sessions
WHERE expires_at < NOW();

-- User's sessions
SELECT *
FROM onboarding_sessions
WHERE user_id = '7cde2a51-2ab5-42a5-b0d3-9541f0e31c21';
```

### Manual Session Cleanup

```sql
-- Delete expired sessions
DELETE FROM onboarding_sessions
WHERE expires_at < NOW();

-- Delete all sessions for a user
DELETE FROM onboarding_sessions
WHERE user_id = 'user-id-here';

-- Delete a specific session
DELETE FROM onboarding_sessions
WHERE id = 'session-id-here';
```

---

## Common Testing Scenarios

### Scenario 1: Complete Happy Path
```
1. npm run dev
2. http://localhost:3000/dev/login
3. Select "Free Tier Artist (Alex Rivera)"
4. Click "Login as Free"
5. Navigate to /add-artist (or trigger claim flow)
6. Complete onboarding steps 1-5
7. Verify artist profile created
8. Check portfolio_images inserted
9. Confirm session deleted
```

### Scenario 2: Session Expiry
```sql
-- Manually expire a session
UPDATE onboarding_sessions
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE id = 'your-session-id';

-- Then try to continue onboarding
-- Expected: "Session has expired" error
```

### Scenario 3: Rate Limiting
```javascript
// In browser console, call fetch-instagram 4 times
for (let i = 0; i < 4; i++) {
  await fetch('/api/onboarding/fetch-instagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then(r => console.log(r.status));
}

// Expected: 200, 200, 200, 429
```

### Scenario 4: Concurrent Sessions
```
1. Login as Alex Rivera
2. Start onboarding → Get session A
3. Open new tab, start onboarding again → Get session B
4. Complete session A → Success
5. Try to complete session B → Should fail (one per user)

Note: Current implementation allows multiple sessions
Consider adding UNIQUE constraint on (user_id, artist_id)
```

### Scenario 5: Image Cloning Verification
```sql
-- Verify test users have cloned images
SELECT
  a.name,
  a.instagram_handle,
  COUNT(pi.id) as image_count,
  pi.import_source
FROM artists a
LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
WHERE a.instagram_handle LIKE 'test_%'
GROUP BY a.id, a.name, a.instagram_handle, pi.import_source;

-- Expected:
-- Jamie Chen  | test_unclaimed_artist | 12 | manual_import
-- Alex Rivera | test_free_artist      | 18 | manual_import
-- Morgan Black| test_pro_artist       | 20 | manual_import
```

---

## Troubleshooting Guide

### Issue: Dev login doesn't work
**Symptoms:** Clicking login button does nothing or shows error

**Checks:**
1. Verify NODE_ENV=development
   ```bash
   echo $NODE_ENV
   # Should be empty or "development" (defaults to development)
   ```

2. Check test users exist
   ```sql
   SELECT email FROM auth.users WHERE email LIKE 'test-%@inkdex.dev';
   ```

3. Check browser console for errors
   ```javascript
   // Should see token_hash in response
   console.log(data.token_hash); // "..."
   ```

**Fix:** Re-run seeding script if users missing

---

### Issue: Portfolio images don't load
**Symptoms:** "No images found" error on portfolio step

**Checks:**
1. Verify session has fetched_images
   ```sql
   SELECT fetched_images
   FROM onboarding_sessions
   WHERE id = 'session-id';
   ```

2. Check classification results
   ```sql
   SELECT
     jsonb_array_length(fetched_images) as total,
     (SELECT COUNT(*)
      FROM jsonb_array_elements(fetched_images)
      WHERE (value->>'classified')::boolean = true) as classified
   FROM onboarding_sessions
   WHERE id = 'session-id';
   ```

3. Verify OpenAI API key set
   ```bash
   echo $OPENAI_API_KEY
   ```

**Fix:** Ensure classification ran successfully in step 1

---

### Issue: Session expired unexpectedly
**Symptoms:** Error after <24 hours

**Checks:**
1. Check session expiry time
   ```sql
   SELECT
     id,
     created_at,
     expires_at,
     AGE(expires_at, NOW()) as time_remaining
   FROM onboarding_sessions
   WHERE id = 'session-id';
   ```

2. Verify system time is correct
   ```bash
   date
   ```

**Fix:** Extend expiry if needed for testing
```sql
UPDATE onboarding_sessions
SET expires_at = NOW() + INTERVAL '48 hours'
WHERE id = 'session-id';
```

---

### Issue: Rate limit too restrictive
**Symptoms:** Can't test because hitting 3/hour limit

**Temporary Fix:**
```typescript
// lib/rate-limiter.ts (for testing only)
export function checkOnboardingRateLimit(identifier: string) {
  return globalRateLimiter.check(
    `onboarding:${identifier}`,
    100,  // Increase to 100 for testing
    60 * 60 * 1000
  );
}
```

**Reset Rate Limit:**
```javascript
// In-memory limiter clears on server restart
// Just restart dev server: Ctrl+C, then npm run dev
```

---

### Issue: Middleware blocking /dev in development
**Symptoms:** 404 on /dev/login in development

**Checks:**
```typescript
// lib/supabase/middleware.ts
if (
  process.env.NODE_ENV === 'production' &&  // Should be 'production'
  pathname.startsWith('/dev')
) {
  return NextResponse.rewrite(new URL('/404', request.url));
}
```

**Verify:**
```bash
# In terminal
node -e "console.log(process.env.NODE_ENV)"
# Should be empty or "development"
```

---

## Best Practices

### For Development
1. **Use dev login for all testing** - Avoid real OAuth in development
2. **Clear sessions between tests** - Prevent stale data issues
3. **Monitor rate limits** - Restart server if hitting limits
4. **Check logs** - Server console shows detailed flow info
5. **Use browser DevTools** - Network tab shows API calls

### For Testing
1. **Test all 3 user types** - Unclaimed, free, pro have different flows
2. **Test error scenarios** - Not just happy path
3. **Verify database state** - Check tables after operations
4. **Test session expiry** - Manually expire sessions
5. **Test concurrent access** - Multiple tabs/browsers

### For Seeding
1. **Run seeder before testing** - Ensure test users exist
2. **Don't modify test user IDs** - Hardcoded in multiple places
3. **Clean up after experiments** - Delete test sessions
4. **Keep seeder idempotent** - Safe to run multiple times
5. **Document any schema changes** - Update seeder if columns change

---

## Reference Commands

### Development Server
```bash
npm run dev                      # Start dev server
npm run type-check               # Verify TypeScript
npm run build                    # Test production build
```

### Seeding
```bash
npx tsx scripts/seed/create-test-users.ts    # Run seeder
```

### Database Queries
```sql
-- Check test users
SELECT * FROM users WHERE email LIKE 'test-%';

-- Check test artists
SELECT * FROM artists WHERE instagram_handle LIKE 'test_%';

-- Check active sessions
SELECT * FROM onboarding_sessions WHERE expires_at > NOW();

-- Check portfolio counts
SELECT a.name, COUNT(pi.id)
FROM artists a
LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
WHERE a.instagram_handle LIKE 'test_%'
GROUP BY a.name;
```

### Cleanup
```sql
-- Delete test sessions
DELETE FROM onboarding_sessions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%');

-- Delete test artists (cascades to images)
DELETE FROM artists WHERE instagram_handle LIKE 'test_%';
```

---

## Next Steps

### Planned Improvements
1. **Session cleanup job** - Automated cron to delete expired sessions
2. **Cost monitoring** - Track OpenAI API usage per session
3. **Better error recovery** - Retry failed classifications
4. **Session resumption** - Allow resuming from any step
5. **Preview email** - Send welcome email after onboarding

### Future Testing Needs
1. **E2E tests with Playwright** - Automated flow testing
2. **Load testing** - Concurrent onboarding sessions
3. **Mobile testing** - Responsive design verification
4. **OAuth integration tests** - Real Instagram flow
5. **Subscription webhooks** - Stripe event handling

---

**Last Updated:** January 5, 2026
**Maintainer:** RB
**Status:** Complete - All Phase 5 testing infrastructure operational
