---
Last-Updated: 2026-01-04
Maintainer: RB
Status: Active - Marketing Curation System
---

# Style Tagging & Ranking System

## Marketing Curation (Priority Focus)

### Purpose
Surface top 25 artists per style for marketing curation:
- Homepage featured sections
- Social media promotion
- Artist outreach campaigns

### Style Taxonomy (20 Styles)

**Core 10:**
| Slug | Display Name | Description |
|------|--------------|-------------|
| `traditional` | Traditional | Bold outlines, limited palette, iconic American imagery |
| `neo-traditional` | Neo-Traditional | Evolved traditional with expanded colors and detail |
| `fine-line` | Fine Line | Delicate thin lines, often single-needle work |
| `blackwork` | Blackwork | Pure black ink, geometric patterns to heavy coverage |
| `geometric` | Geometric | Mathematical precision, sacred geometry patterns |
| `realism` | Realism | Photorealistic in black & grey or color |
| `japanese` | Japanese | Traditional Irezumi: koi, dragons, waves |
| `watercolor` | Watercolor | Splashes, drips, color bleeds, no outlines |
| `dotwork` | Dotwork | Images from dots, often mandalas |
| `tribal` | Tribal | Bold black patterns, Polynesian/Maori inspired |

**Expanded 10:**
| Slug | Display Name | Description |
|------|--------------|-------------|
| `illustrative` | Illustrative | Storybook/comic style artwork |
| `surrealism` | Surrealism | Dreamlike, impossible imagery |
| `minimalist` | Minimalist | Simple, understated, clean lines |
| `lettering` | Lettering/Script | Typography from elegant to graffiti |
| `new-school` | New School | Cartoonish, bright, 90s-influenced |
| `trash-polka` | Trash Polka | Chaotic collage, red and black |
| `chicano` | Chicano | Religious imagery, lowriders, black & grey |
| `biomechanical` | Biomechanical | Organic meets mechanical |
| `ornamental` | Ornamental | Decorative jewelry/lace patterns |
| `sketch` | Sketch/Line Art | Intentionally raw, visible sketch lines |

### Ranking: Pure Embedding Similarity

```sql
similarity_score = 1 - (portfolio_embedding <=> style_seed_embedding)
artist_score = MAX(similarity_score) across portfolio
```

**Why pure similarity:**
- Objective (no popularity bias)
- Surfaces quality work from small accounts
- Simple to understand and debug

### Admin UI: `/admin/styles`

**Features:**
- Style dropdown (20 styles)
- Top 25 artists per style
- Artist cards with: image, name, handle, city, similarity %
- "Mark Featured" toggle
- "Copy Handle" button

### Files Created

| File | Purpose |
|------|---------|
| `/supabase/functions/search_functions.sql` | `get_top_artists_by_style()` |
| `/app/api/admin/styles/leaderboard/route.ts` | API endpoint |
| `/app/admin/(authenticated)/styles/page.tsx` | Admin page |
| `/components/admin/StyleLeaderboard.tsx` | UI component |
| `/scripts/styles/upload-seed-images.ts` | Seed upload |

### Seed Image Requirements

Good seeds should:
1. Exemplify the style (iconic, not edge cases)
2. High quality (sharp, well-lit)
3. Single focus (one tattoo)
4. Healed or fresh (no distortion)
5. Neutral background

**Naming:** `{style-slug}.jpg` (e.g., `traditional.jpg`)

---

# Style Tagging & Ranking Analysis (Full Reference)

## What We Already Have ✅

### 1. Style Seeds with Embeddings
**Database:** `style_seeds` table
- Pre-defined styles: traditional, neo-traditional, realism, watercolor, japanese, etc.
- Each style has 1-6 seed images with CLIP embeddings
- Seed embeddings stored in database (768-dim vectors)

**Styles Currently Defined:**
- Traditional (American traditional)
- Neo-Traditional
- Realism
- Watercolor
- Japanese
- Blackwork
- Fine-Line
- Geometric
- Tribal
- (More can be added via `scripts/style-seeds/`)

### 2. Style Landing Pages ✅
**Route:** `/[country]/[region]/[city]/[style]`
**Functionality:**
- Shows artists ranked by similarity to style seed embedding
- Uses existing `search_artists_by_embedding()` function
- Returns top 20 artists per style per city
- **This IS style ranking** - artists are ranked by how well their portfolio matches the style

**SEO Impact:**
- ~80 static pages generated (10 styles × 8 cities)
- Each page targets "[style] tattoo [city]" keywords
- Editorial content with style descriptions

**Example URLs:**
- `/us/tx/austin/traditional` - Traditional tattoo artists in Austin
- `/us/ca/los-angeles/fine-line` - Fine-line artists in LA
- `/us/ny/new-york/realism` - Realism artists in NYC

### 3. How It Works Today
```
1. User visits /us/tx/austin/traditional
2. Backend fetches style seed embedding for "traditional"
3. Vector search: Find artists whose portfolios best match this embedding
4. Results: Artists ranked by similarity score (0.15-1.0 threshold)
5. Display: Top 20 artists with their matching images
```

**Current Limitations:**
- One style per page (no multi-style filtering)
- Pre-defined styles only (can't discover emerging styles)
- No style tags visible to users
- No style breakdown per artist ("60% traditional, 40% neo-traditional")
- No style confidence scores shown

---

## What We Could Add 🚀

### Option 1: Auto-Tagging Individual Images
**Concept:** Tag each portfolio image with style labels + confidence scores

**How It Would Work:**
```
For each portfolio_images row:
1. Compare image embedding to all style seed embeddings
2. Calculate similarity to each style
3. Store top 3 styles with confidence scores

Example:
- Image #1234:
  - Traditional: 0.85 (85% match)
  - Neo-Traditional: 0.72 (72% match)
  - Blackwork: 0.45 (45% match)
```

**Database Schema:**
```sql
-- New table
CREATE TABLE image_style_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES portfolio_images(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id, style_name)
);

CREATE INDEX idx_image_style_tags_style ON image_style_tags(style_name);
CREATE INDEX idx_image_style_tags_confidence ON image_style_tags(confidence DESC);
```

**User Value:**
- Browse artist portfolios by style ("Show me only their traditional work")
- Filter search results by style
- Understand artist's range at a glance

**Implementation Effort:** Medium (6-8 hours)
- Script to compute similarities for all 9,803 images
- Database schema + migration
- UI to display style tags on images
- Filter controls

**Cost:** $0 (uses existing embeddings, pure cosine similarity math)

**Technical Note - No GPU Required:**
- Style tagging is pure vector math on existing embeddings (CPU-based)
- We already have all portfolio image embeddings in `portfolio_images.embedding`
- We already have all style seed embeddings in `style_seeds.embedding`
- Just calculate cosine similarity: `1 - (embedding_a <=> embedding_b)`
- 9,803 images × 10 styles = 98,030 calculations (~2-3 minutes on CPU)
- A2000/4080 GPUs are only needed for CLIP inference (image → embedding), not for comparing embeddings

**Unique?** ✅ YES - Auto-generated, no manual tagging

---

### Option 2: Artist Style Profiles
**Concept:** Aggregate image tags into artist-level style breakdown

**How It Would Work:**
```
For each artist:
1. Get all their portfolio images' style tags
2. Calculate percentage distribution
3. Store artist-level style profile

Example: Jamie Chen
- Traditional: 60% (12 of 20 images)
- Neo-Traditional: 30% (6 of 20 images)
- Blackwork: 10% (2 of 20 images)
```

**Database Schema:**
```sql
-- New table
CREATE TABLE artist_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  percentage FLOAT NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  image_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, style_name)
);

CREATE INDEX idx_artist_style_profiles_artist ON artist_style_profiles(artist_id);
```

**User Value:**
- Quick assessment of artist's style range
- "This artist is 80% traditional, so they're a specialist"
- "This artist does 5 styles - very versatile!"
- SEO: Rich snippets for artist profiles

**UI Mockup:**
```
Artist Profile: Jamie Chen
┌──────────────────────────────────┐
│ Style Specialties                │
├──────────────────────────────────┤
│ ████████████░░░░ Traditional 60% │
│ ██████░░░░░░░░░░ Neo-Trad   30%  │
│ ██░░░░░░░░░░░░░░ Blackwork  10%  │
└──────────────────────────────────┘
```

**Implementation Effort:** Medium (4-6 hours)
- Depends on Option 1 (image tags)
- Aggregation script
- Database schema
- UI visualization (donut chart or bars)

**Unique?** ✅ YES - Data-driven style analysis

---

### Option 3: Style Confidence in Search Results
**Concept:** Show WHY an artist matched a style search

**How It Would Work:**
```
User searches for "traditional tattoo austin"
Results show:
- Jamie Chen - 85% Traditional (12 matching images)
- Alex Rivera - 78% Traditional (8 matching images)
- Morgan Black - 72% Traditional (15 matching images)
```

**Current State:**
- We already have similarity scores (0.15-1.0)
- These are portfolio-level matches (not style-specific)

**Enhancement:**
- Calculate style-specific confidence
- Show style match percentage in results
- Highlight matching images with style tags

**Implementation Effort:** Low (2-3 hours)
- Modify search results component
- Display confidence scores
- Style badge on matching images

**Unique?** Somewhat - Makes the ranking transparent

---

### Option 4: Multi-Style Filtering
**Concept:** Filter search results by multiple styles

**UI:**
```
Search: [floral tattoo]
Filters:
☑ Traditional
☑ Neo-Traditional
☐ Realism
☐ Watercolor

Results: Artists who do floral in traditional OR neo-traditional style
```

**How It Would Work:**
- Requires Option 1 (image tagging)
- Filter WHERE image_style_tags.style_name IN ('traditional', 'neo-traditional')
- Only show artists with images matching selected styles

**Implementation Effort:** Medium (5-7 hours)
- Depends on Option 1
- UI for style filter checkboxes
- Backend query modification
- URL state management (?styles=traditional,neo-traditional)

**User Value:**
- Precision filtering without knowing tattoo terminology
- "I want floral, but only in these styles"

**Unique?** ✅ YES - Combines CLIP search with style filtering

---

### Option 5: "Best At" Rankings per City
**Concept:** Rank artists by style expertise within each city

**How It Would Work:**
```
For each (city, style) pair:
1. Get all artists in that city
2. Calculate style match score for each
3. Rank by confidence × image count
4. Generate "Top 10 [Style] Artists in [City]" page
```

**Example:**
- `/us/tx/austin/traditional/top-artists` - Top 10 traditional in Austin
- Shows artists sorted by:
  - Style confidence (how well they match)
  - Volume (how many images in that style)
  - Engagement (follower count, likes)

**Database:**
```sql
-- Materialized view for performance
CREATE MATERIALIZED VIEW city_style_rankings AS
SELECT
  a.city,
  asp.style_name,
  a.id as artist_id,
  asp.percentage as style_confidence,
  asp.image_count,
  a.follower_count,
  ROW_NUMBER() OVER (
    PARTITION BY a.city, asp.style_name
    ORDER BY asp.percentage DESC, asp.image_count DESC, a.follower_count DESC
  ) as rank
FROM artists a
INNER JOIN artist_style_profiles asp ON a.id = asp.artist_id
WHERE asp.percentage >= 30;  -- Only include if >30% of portfolio

REFRESH MATERIALIZED VIEW city_style_rankings;  -- Weekly cron
```

**SEO Value:**
- New indexable pages: "Top Traditional Tattoo Artists in Austin"
- Targets "best [style] tattoo artist [city]" queries
- Editorial content opportunity

**Implementation Effort:** Medium-High (8-10 hours)
- Depends on Option 2 (artist profiles)
- Materialized view or cached query
- New page template
- Ranking algorithm design

**Unique?** ✅ YES - Algorithmic rankings, not manual

---

### Option 6: Emerging Style Discovery
**Concept:** Cluster all images to discover styles we haven't named

**How It Would Work:**
```
1. Run unsupervised clustering on all 9,803 image embeddings
2. Use K-means or HDBSCAN to identify 15-20 distinct clusters
3. For each cluster:
   - Extract representative images
   - Use GPT-4 to name the cluster ("dark floral", "micro-realism", etc.)
   - Create style seed from cluster centroid
4. Add new styles to style_seeds table
```

**Example Discovered Styles:**
- "Dark Floral" - Cluster of gothic floral tattoos
- "Micro-Realism" - Tiny realistic portraits
- "Minimalist Line Work" - Single-line abstract designs
- "Cyberpunk" - Tech-inspired futuristic tattoos

**User Value:**
- Discover niche styles not in traditional taxonomy
- "I didn't know this style existed!"
- More precise matching than broad categories

**SEO Value:**
- New landing pages for emerging styles
- First-mover advantage on niche keywords
- "Micro-realism tattoo austin" (no competition)

**Implementation Effort:** High (15-20 hours)
- Python clustering pipeline (scikit-learn)
- GPT-4 integration for naming
- Validation/curation step (manual review)
- Integration into style_seeds table
- Quarterly recalculation as data grows

**Cost:** ~$5-10 (GPT-4 API calls for cluster naming)

**Unique?** ✅ YES - Data-driven style discovery

---

## Comparison: Manual vs. CLIP-Based Style Tagging

### Traditional Approach (Competitors)
- Artists self-tag their portfolio ("I do traditional, realism, japanese")
- Manual dropdown selection during profile creation
- Static, requires artist input
- Often incomplete or inaccurate (artist says "realism" but shows geometric)

**Problems:**
- Reliant on artist participation
- Inconsistent taxonomy (everyone defines styles differently)
- No confidence levels (binary yes/no)
- Stale (artists evolve but don't update tags)

### Our CLIP-Based Approach
- Automatic tagging from portfolio images
- Uses actual visual similarity (not self-reported)
- Updates automatically when portfolio changes
- Confidence scores (85% traditional vs. 30% traditional)

**Advantages:**
- Works for all 3,553 artists immediately (no artist action needed)
- Objective (based on visual analysis, not self-assessment)
- Granular (percentage breakdowns, not binary tags)
- Fresh (recalculates when images added/removed)

---

## Prioritization

### Highest ROI (Recommended First)
**Option 1 + 2: Image Tagging → Artist Profiles**
- Effort: ~10-14 hours total
- Unlocks: Style filtering, artist specialization analysis, SEO content
- User Value: High (understand artist range at a glance)
- Unique: ✅ YES

**Why Start Here:**
- Foundation for all other style features
- Immediate user value (portfolio browsing by style)
- SEO benefit (style-specific artist pages)
- Relatively simple (pure math, no ML training)

### Medium Priority
**Option 4: Multi-Style Filtering**
- Effort: ~5-7 hours (depends on 1+2)
- User Value: High (precision search)
- Unique: ✅ YES

**Option 5: "Best At" Rankings**
- Effort: ~8-10 hours (depends on 1+2)
- SEO Value: High (new indexable pages)
- User Value: Medium (discovery mechanism)

### Lower Priority (Experimental)
**Option 3: Style Confidence in Search**
- Effort: ~2-3 hours
- User Value: Low-Medium (transparency)
- Not critical, but nice-to-have

**Option 6: Emerging Style Discovery**
- Effort: ~15-20 hours
- User Value: High (novel discovery)
- Risk: High (clustering quality unknown)
- Better suited for post-MVP experimentation

---

## Recommended Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Tag all images with styles

1. **Image Style Tagging Script** (4 hours)
   - For each image, compute similarity to all style seeds
   - Store top 3 styles with confidence scores
   - Batch process all 9,803 images
   - **Implementation Options:**
     - **Option A (PostgreSQL):** Single SQL query with CROSS JOIN (~30 seconds)
     - **Option B (TypeScript):** Node script with batch inserts (~2-3 minutes, recommended for flexibility)
     - **Option C (Python/Numpy):** Vectorized matrix multiplication (~1 second, overkill)
   - **Recommended:** TypeScript script (easy to add validation/logging, can add to admin panel later)

2. **Database Schema** (1 hour)
   - Create `image_style_tags` table
   - Indexes for performance
   - Migration script

3. **Validation** (1 hour)
   - Spot-check accuracy (sample 50 images, manual review)
   - Adjust threshold if needed (e.g., require >0.5 confidence)

**Deliverable:** All images tagged with style labels

---

### Phase 2: Artist Profiles (Week 2)
**Goal:** Aggregate image tags into artist-level insights

4. **Artist Profile Aggregation** (3 hours)
   - Script to compute percentage distribution per artist
   - Store in `artist_style_profiles` table

5. **Profile Page UI** (3 hours)
   - "Style Specialties" section on artist profiles
   - Donut chart or bar chart visualization
   - Click style → filter portfolio to that style only

**Deliverable:** Artist profiles show style breakdown

---

### Phase 3: Search Integration (Week 3)
**Goal:** Let users filter search by style

6. **Multi-Style Filtering** (5-7 hours)
   - Style filter checkboxes on search page
   - Backend query modification
   - URL state management

7. **Style Badges** (2 hours)
   - Show style tags on image thumbnails
   - "Traditional" badge on matching images

**Deliverable:** Users can search + filter by style

---

### Phase 4: SEO & Rankings (Week 4+)
**Goal:** Generate style-specific ranking pages

8. **"Best At" Rankings** (8-10 hours)
   - Materialized view for rankings
   - New page template: `/[city]/[style]/top-artists`
   - Editorial content generation

9. **Style Confidence in Results** (2-3 hours)
   - Show "85% Traditional" in search results
   - Transparent ranking explanation

**Deliverable:** SEO-optimized ranking pages

---

## Success Metrics

### Image Tagging Accuracy
- Manual validation: 90%+ images correctly tagged
- Inter-rater reliability: 2+ reviewers agree on top style

### User Engagement
- % of users who use style filters (target: 20%)
- Avg styles selected per search (target: 1.5)
- Click-through rate on style badges

### SEO Impact
- "Top [style] artists in [city]" pages indexed
- Keyword rankings for "[style] tattoo [city]"
- Organic traffic from style-specific queries

### Artist Profile Engagement
- % of profiles viewed include style section (target: 80%)
- Click-through on style breakdown (filter portfolio)

---

## Open Questions

1. **Threshold for Tagging:**
   - What minimum confidence to tag an image? (0.5? 0.6?)
   - How many styles per image? (Top 1? Top 3?)

2. **Artist Profile:**
   - Show all styles or only top 3?
   - What minimum percentage to include? (>10%? >20%?)

3. **Style Filtering:**
   - AND logic (must match ALL selected styles) or OR (match ANY)?
   - How to handle "no strong style match" images?

4. **Ranking Algorithm:**
   - Weight confidence vs. volume vs. engagement?
   - How to handle ties?

5. **Update Frequency:**
   - Recalculate on every image add/remove (trigger)?
   - Or nightly batch job (acceptable staleness)?

6. **UI Placement:**
   - Where to show style filters? (Sidebar? Top bar? Popup?)
   - Mobile UX for style selection?

---

## Technical Considerations

### Performance
- **Image Tagging:** One-time batch job, ~2-3 minutes for 9,803 images (TypeScript)
  - 9,803 images × 10 style seeds = 98,030 similarity calculations
  - Pure cosine similarity (CPU-based, no GPU needed)
  - No API calls, negligible cost
  - Could be ~30 seconds with pure SQL, or ~1 second with Python/Numpy
  - **Not resource-intensive** - can run on laptop or in Vercel serverless function

- **Artist Profile Aggregation:** Fast SQL GROUP BY query
  - Run on-demand or nightly batch

- **Style Filtering:** Add WHERE clause to existing search
  - Requires index on `image_style_tags(style_name)`
  - Minimal performance impact

### Maintenance
- **Low Maintenance:** Image/artist tagging
  - Automatic recalculation via trigger
  - Or nightly batch job (5 min/day)

- **Medium Maintenance:** Rankings materialized view
  - Weekly REFRESH (10 min/week)

- **High Maintenance:** Emerging style discovery
  - Quarterly manual review + curation
  - GPT-4 naming step (human oversight)

---

## Comparison to Competitors

| Feature | Inkdex (CLIP-Based) | Competitors (Manual Tags) |
|---------|---------------------|---------------------------|
| **Coverage** | 100% of artists (automatic) | 20-40% (requires artist input) |
| **Accuracy** | Visual analysis (objective) | Self-reported (subjective) |
| **Granularity** | Confidence scores (60% traditional) | Binary (yes/no) |
| **Freshness** | Auto-updates with portfolio | Stale (manual updates) |
| **Effort** | Zero (automatic) | High (artist onboarding) |
| **Consistency** | Standardized taxonomy | Inconsistent (artist interpretation) |

**Competitive Advantage:** ✅ We can tag all artists immediately without relying on self-reporting

---

## Next Steps

1. **Review & Prioritize:**
   - Which options align with product vision?
   - Phase 1+2 (image tags + artist profiles) recommended first

2. **Validation:**
   - Spot-check 50 images manually
   - Validate that style tagging accuracy is acceptable

3. **UI/UX Design:**
   - Mockup style breakdown on artist profiles
   - Design style filter controls
   - Mobile-responsive layout

4. **Implementation:**
   - Phase 1: Image tagging script + database
   - Phase 2: Artist profiles + UI
   - Phase 3: Search integration
   - Phase 4: Rankings + SEO

---

**Status:** Awaiting direction and prioritization
