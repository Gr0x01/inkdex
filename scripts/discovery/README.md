# Artist Discovery Scripts

Instagram-first discovery approach for finding tattoo artists.

## Overview

**New Approach (After Testing):**
- ✅ Tavily search finds solo practitioners directly (no website scraping)
- ✅ Instagram handles extracted automatically
- ✅ Style-specific searches for better coverage
- ✅ 80% cheaper and faster than original plan

**Original Plan (Deprecated):**
- ❌ Google Maps → Shop websites → Scrape for artist rosters
- ❌ Complex, expensive, misses solo practitioners

## Scripts

### 1. `tavily-artist-discovery.ts`

**Purpose:** Discover artists using Tavily search (Instagram-first)

**What it does:**
1. Searches Tavily for artists by city + style
2. Extracts Instagram handles from results
3. Stores artists in Supabase `artists` table
4. Deduplicates by Instagram handle

**Usage:**
```bash
npm run discover-artists
```

**Configuration:**
- Cities: Edit `CITIES` array in script (default: Austin, Los Angeles)
- Styles: Edit `STYLE_QUERIES` array (default: 10 styles)
- General queries: Edit `GENERAL_QUERIES` (default: 3 queries)

**Expected results:**
- **Target:** 200-300 artists per city
- **Queries:** 13 per city (10 styles + 3 general)
- **Cost:** ~$2-5 per city (Tavily API)
- **Time:** ~10 minutes per city (rate-limited to avoid blocking)

**Output:**
```
✅ DISCOVERY COMPLETE
Total Discovered: 280
Total Inserted: 267
Total Skipped (duplicates): 13
```

---

### 2. `instagram-validator.ts`

**Purpose:** Validate Instagram profiles and extract user IDs

**What it does:**
1. Fetches public Instagram profile data
2. Checks if account is public or private
3. Extracts Instagram user ID (for OAuth matching)
4. Updates artists table with validation results
5. Deletes artists with non-existent profiles

**Usage:**
```bash
npm run validate-instagram
```

**What gets extracted:**
- Instagram user ID (critical for OAuth claiming)
- Profile bio
- Follower count
- Profile image URL
- External URL (if provided)
- Public/private status

**Rate limiting:**
- 2 seconds between requests (gentle on Instagram)
- Processes all unvalidated artists

**Expected results:**
```
✅ VALIDATION COMPLETE
Total processed: 267
Validated: 260
  - Public: 240
  - Private: 20
Deleted (not found): 7
Errors: 0
```

**Next steps:**
- Private accounts: Skip scraping (can't access posts)
- Public accounts: Ready for Instagram scraping (Apify)

---

## Discovery Workflow

### Phase 2: Artist Discovery & Validation

```bash
# Step 1: Discover artists (Tavily)
npm run discover-artists

# Step 2: Validate Instagram profiles
npm run validate-instagram

# Step 3: Review results in Supabase
# - Check artists table for new entries
# - Filter by city, review names
# - Manual curation if needed
```

### After Discovery

**Next phases:**
- **Phase 3:** Instagram scraping (Apify) for public accounts
- **Phase 4:** CLIP embedding generation (Modal.com)
- **Phase 5:** Build search UI

---

## Database Schema

Artists are stored with:

```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  instagram_handle TEXT UNIQUE NOT NULL,
  instagram_id TEXT,  -- For OAuth matching (from validator)
  instagram_url TEXT,
  instagram_private BOOLEAN DEFAULT false,
  city TEXT NOT NULL,
  bio TEXT,
  follower_count INTEGER,
  profile_image_url TEXT,
  website_url TEXT,
  discovery_source TEXT,  -- e.g., 'tavily_style_fine_line'
  verification_status TEXT DEFAULT 'unclaimed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Troubleshooting

### "Request failed with status code 401"
- Check `.env.local` has `TAAVILY_API` key set
- Verify Tavily API key is valid

### "No artists to validate"
- Run `npm run discover-artists` first
- Check Supabase `artists` table has entries

### Instagram validation rate limited
- Script already has 2s delays
- If blocked, increase sleep time in `instagram-validator.ts`
- Instagram may temporarily block aggressive scraping

### Duplicate artists across cities
- Script deduplicates by Instagram handle
- Artists can only exist once in database
- If artist works in multiple cities, we'll handle in Phase 6 (city tags)

---

## Cost Breakdown (Revised)

### Original Plan (Deprecated):
- Google Maps API: $5-10 per city
- Website scraping: Complex, time-consuming
- Success rate: ~40-60% (many shops don't list artists)
- **Total: $30-55 per city**

### New Instagram-First Approach:
- Tavily API: ~13 queries × $0.15 = **$2 per city**
- Instagram validation: Free (public endpoints)
- Success rate: ~90%+ (direct artist discovery)
- **Total: $2-5 per city** (5x cheaper!)

---

## Testing

Test discovery before running full pipeline:

```bash
npm run test-discovery
```

This runs 4 test queries:
1. Solo artists (Instagram-first)
2. Traditional shops
3. Google Places API
4. Niche artists (fine line)

Review results to validate approach.

---

## Next Steps After Discovery

1. **Manual Review** (Optional):
   - Check Supabase artists table
   - Remove any non-artists (shops, hashtag pages)
   - Add prominent artists missed by search

2. **Instagram Scraping** (Phase 3):
   - Use Apify Instagram scraper
   - Scrape 20-50 posts per public artist
   - Download images to R2

3. **Embedding Generation** (Phase 4):
   - Modal.com CLIP embeddings
   - Generate 768-dim vectors for all images

4. **Search UI** (Phase 5):
   - Build image upload search
   - Implement vector similarity search
   - Launch MVP!

---

**Questions?** Check memory bank:
- `/memory-bank/development/activeContext.md`
- `/memory-bank/projects/tattoo-discovery-implementation-plan.md`
