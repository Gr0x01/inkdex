---
Last-Updated: 2026-01-15
Maintainer: RB
Status: Active
---

# Instagram Reel Ideas

Running list of content ideas based on Inkdex development stories.

## Technical/Builder Stories

### 1. "I replaced 100 lines of regex with one GPT call"
**Status:** Idea
**Hook:** "My code couldn't understand 'ATX' means Austin"
**Story:**
- Regex dictionary only knew 116 US cities
- GPT-4.1-nano understands "NYC", "Based in BK", "@ Seattle", "PDX", "CHI", "NOLA"
- Also handles emoji patterns like "📍Austin"

**Numbers:**
- Cost: $0.09 to re-process 3,179 artists
- Results: 1,526 locations updated, 4 new locations found

**Source:** `activeContext.md` - Bio Location Extraction (Jan 15, 2026)

---

### 2. "My site went down twice from the same bug"
**Status:** Idea
**Hook:** "I added one line of code and my site died"
**Story:**
- Added www → non-www redirect in next.config.js
- Vercel had www.inkdex.io as PRIMARY domain
- Two redirects fighting = infinite loop
- Site down, had to emergency rollback

**Lesson:** Always check BOTH your code AND your hosting config before touching redirects

**Source:** `activeContext.md` - Redirect Loop Incident (Jan 15, 2026)

---

### 3. "I trained an AI on another AI's homework"
**Status:** Idea
**Hook:** "GPT labeled 15,000 tattoo images. Then I trained a model on its answers."
**Story:**
- Needed to classify tattoo styles (traditional, realism, blackwork, etc.)
- GPT-4 is accurate but expensive and slow
- Solution: Have GPT label training data, train sklearn classifier
- Now the "student" model runs instantly for free

**Numbers:**
- 15,000 GPT-labeled images as training data
- sklearn logistic regression classifier
- Per-style confidence thresholds tuned

**Source:** `activeContext.md` - ML Style Classifier (Jan 8, 2026)

---

### 4. "How I cut my API costs by 90%"
**Status:** Idea
**Hook:** "$55 per city vs $3 per city"
**Story:**
- Started with Google Maps API for artist discovery
- $30-55 per city (API calls + scraping)
- Switched to Tavily web search
- ~$3 per city for discovery

**Numbers:**
- 116 cities for ~$328 total (Tavily)
- Would have been ~$5,000+ with Google Maps
- SEO content: $0.02/city with GPT-4.1

**Source:** `quickstart.md` - Estimated Costs

---

### 5. "Scraping Instagram without getting banned"
**Status:** Idea
**Hook:** "I needed 100,000 tattoo photos. Instagram said no."
**Story:**
- Direct scraping = instant ban
- Tried: Instaloader on VPS, Apify, ScrapingDog
- Evolution of the scraping stack
- ScrapingDog: 50 concurrent requests, ~$90/mo for 66k profiles

**Source:** `activeContext.md` - ScrapingDog Migration (Jan 11, 2026)

---

## Product/Discovery Stories

### 6. "The bug that hid every 'Claim' button"
**Status:** Idea
**Hook:** "Users couldn't claim their profiles and I had no idea why"
**Story:**
- Artists added via search got `verification_status='pending'`
- Should have been `'unclaimed'`
- One wrong string = "Claim This Page" button hidden
- 6 artists affected before anyone noticed

**Lesson:** String enums are landmines

**Source:** `activeContext.md` - Verification Status Fix (Jan 9, 2026)

---

### 7. "Why blackwork tattoos kept showing up as 'anime'"
**Status:** Idea
**Hook:** "My AI thought this was anime" [show blackwork image]
**Story:**
- ML classifier confidence too low (0.50 threshold)
- Blackwork/ornamental images tagged as anime at 0.66-0.76 confidence
- Solution: Raised anime threshold to 0.80, japanese to 0.75

**Numbers:**
- Deleted ~3,790 wrong anime tags
- Deleted ~3,837 wrong japanese tags

**Source:** `activeContext.md` - Anime/Japanese Threshold Tuning (Jan 9, 2026)

---

### 8. "I accidentally GDPR'd my own product"
**Status:** Idea
**Hook:** "I had to hide 400+ artists from my own search"
**Story:**
- EU privacy law (GDPR) = can't scrape EU Instagram without consent
- Built location extraction to detect EU artists
- Auto-filter at discovery AND search layers
- 436 artists filtered (32 countries: EU 27 + EEA 3 + UK + Switzerland)

**Lesson:** Privacy laws apply even when you're the little guy

**Source:** `activeContext.md` - GDPR/Privacy Compliance

---

### 9. "The 404 bug that only affected new cities"
**Status:** Idea
**Hook:** "Houston, Dallas, Boston - all returning 404"
**Story:**
- City pages query `artist_locations` table
- New artists only inserted into `artists` table
- Missing database trigger = new cities empty
- Fix: Trigger auto-syncs artists → artist_locations on INSERT

**Source:** `activeContext.md` - Artist Location Auto-Sync (Jan 5, 2026)

---

## Scale/Growth Stories

### 10. "From 2 cities to 126 in 2 weeks"
**Status:** Idea
**Hook:** Show map animation of coverage expanding
**Story:**
- MVP target: 2 cities, 400-600 artists
- Launched with: 116 US cities + 10 international
- 17,250 artists, 99,258 images

**Numbers:**
- Batch 1-4: 88 cities, 9,640 artists (~$240)
- Batch 5: 9 final states, 1,319 artists
- International: India (6 cities), Pakistan (4 cities)

**Source:** `quickstart.md` - Live Cities

---

### 11. "The 4AM dual-GPU grind"
**Status:** Idea
**Hook:** "I networked two graphics cards to process 100k images"
**Story:**
- CLIP embeddings need GPU power
- A2000 alone: 5 hours for 20k images
- Added RTX 4080 on Windows machine over local network
- Dual-GPU: 1.5 hours for 20k images (A2000 40%, 4080 60%)

**Technical:**
- Python script distributes work across both GPUs
- Only works locally (Windows GPU not internet-accessible)

**Source:** `activeContext.md` - Embedding Infrastructure

---

### 12. "I mass-deleted 8 database tables"
**Status:** Idea
**Hook:** "My database had 38 tables. Now it has 30."
**Story:**
- 6 months of incremental development = schema bloat
- Audit logs scattered across 5 tables → unified_audit_log
- Unused tables: mining_candidates, follower_mining_runs, etc.
- 10 functions consolidated

**Numbers:**
- Tables: 38 → 30
- Functions: ~65 → ~55
- Found bug: RPC parameter mismatch breaking style search

**Source:** `activeContext.md` - Database Schema Consolidation (Jan 12, 2026)

---

## SEO/Marketing Stories

### 13. "Google thought I had 4,460 broken pages"
**Status:** Idea
**Hook:** "Google Search Console: 4.46K pages not indexed"
**Story:**
- Sitemap generated wrong URLs
- `/texas/austin` instead of `/us/tx/austin`
- Every city page = 404 in Google's eyes
- Plus: www vs non-www duplicates, conflicting robots.txt

**Fix:** URL format fix, www redirect, deleted duplicate robots.txt

**Source:** `activeContext.md` - Google Search Console SEO Fixes (Jan 11, 2026)

---

### 14. "The $2 SEO hack for 116 cities"
**Status:** Idea
**Hook:** "800-word city guides for $0.02 each"
**Story:**
- Need unique content for each city page (SEO)
- GPT-4.1 generates city-specific editorial content
- Neighborhoods, culture, local tattoo scene
- Total cost: ~$2.14 for all 116 cities

**Source:** `quickstart.md` - SEO Content Generation

---

## Ideas Backlog

Add new ideas here as they come up:

### 15. "I cut 2 clicks from my conversion funnel"
**Status:** Idea
**Hook:** "My ads were sending users to the homepage. That's 2 extra clicks to find what they want."
**Story:**
- Old flow: Ad → Homepage → Type search → See results (3 steps)
- New flow: Ad → Results page (1 step)
- Built deep-linkable search URLs: `inkdex.io/search?q=fine+line+austin`
- User lands directly on "fine line tattoo artists in Austin"

**Visual:** Side-by-side of old vs new user journey, click counter

**Why it matters:**
- Every click is a drop-off point
- Ads cost money - don't waste clicks on navigation
- User intent preserved from ad to results

**Example URLs:**
- `inkdex.io/search?q=realism` - Style search
- `inkdex.io/search?q=fine+line&city=austin` - Style + location
- `inkdex.io/search?q=dragon+tattoo` - Subject search

**Source:** `activeContext.md` - Stateless Search URLs (Jan 15, 2026)

-
-

---

## Production Notes

**Format:** 15-60 second vertical video
**Style:** Screen recordings, code snippets, before/after visuals
**Tone:** Builder sharing real experiences, not polished marketing

**Best performers usually have:**
1. Strong hook (problem or surprising fact)
2. Relatable struggle
3. Concrete numbers
4. Clear lesson/takeaway
