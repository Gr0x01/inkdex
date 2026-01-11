---
Last-Updated: 2026-01-04
Maintainer: RB
Status: Brainstorming
---

# Advanced CLIP-Powered Features

## Overview

This document explores unique features enabled by our CLIP embedding infrastructure that traditional tattoo directories cannot replicate. We have 9,803 tattoo images with 768-dimensional semantic embeddings in a shared multi-modal vector space - what can we build that's genuinely novel?

## Our Unique Advantages

### What Traditional Sites Have
- Manual style tags (requires taxonomy knowledge)
- Keyword search (literal string matching only)
- Portfolio galleries (visual browsing, no semantic understanding)
- Location filters

### What We Have
- **768-dimensional semantic embeddings** for every tattoo image
- **Multi-modal vector space** (text and images share same embedding space)
- **Zero-shot concept understanding** (CLIP knows "cyberpunk" without us tagging it)
- **Vector arithmetic** (add, subtract, interpolate embeddings)
- **Similarity search infrastructure** (IVFFlat index, <500ms queries)
- **Cross-modal capabilities** (search images with text, text with images)

### Technical Capabilities
- Aggregate embeddings (average multiple vectors)
- Subtract embeddings (negative search)
- Cluster embeddings (discover style groupings)
- Dimensionality reduction (visualize embedding space)
- Distance calculations (similarity, uniqueness, diversity metrics)

---

## Feature Ideas

### 🎯 Tier 1: Easy Wins (Existing Infrastructure)

#### 1. Artist Similarity Recommendations ✅ **ALREADY IMPLEMENTED**
**Status:** ✅ Shipped and live

**Current Implementation:**
- **RelatedArtists.tsx** - Shows "Similar Artists in {city}" section on artist profiles (4 artists)
- **FindSimilarArtistsButton.tsx** - Button that creates similarity search with city toggle
- **find_related_artists()** SQL function - Uses first portfolio image embedding as style proxy
- Uses existing vector search infrastructure (no pre-computation needed)

**What We Have:**
- Profile page shows 4 similar artists filtered by city
- "Find Similar Artists" button navigates to full search results
- Users can toggle city filter on/off

**Potential Enhancement (Future):**
- Pre-compute aggregated style_embedding (average all portfolio images)
  - More accurate than single-image proxy
  - Requires migration + trigger for updates
  - Better for artists with diverse portfolios
- For now, current implementation works well and requires no maintenance

---

#### 2. Multi-Reference Search
**Concept:** "Upload 2-3 reference images, find artists who can do ALL these vibes"

**User Value:**
- Solves "I want THIS line work + THAT shading + THIS subject" problem
- More precise than single-image search
- Power user feature for serious tattoo seekers

**Implementation:**
```
1. UI: Search page
   - Multi-file upload (2-5 images max)
   - Show thumbnails of uploaded refs
   - "Find artists who can do all of these" button

2. Backend: Average embeddings
   - Generate embedding for each uploaded image
   - Average the vectors: avg_embedding = sum(embeddings) / count
   - Use existing search_artists_by_embedding() function

3. Results: Same as current search results page
   - Show artists ranked by similarity to averaged embedding
   - Display all reference images in search context area
```

**Effort:** Low (3-4 hours)
- Modify /api/search to accept multiple images
- Update SearchInput component for multi-upload
- Update results page to show multiple reference images

**Data Requirements:** None (uses existing search infrastructure)

**Unique?** ✅ **YES** - Impossible with tag-based search

**Priority:** 🔥 **HIGH** - Clear use case, easy to build, high perceived value

---

#### 3. Negative Search / Style Refinement
**Concept:** "Like this BUT NOT this" - refine results by subtracting unwanted styles

**User Value:**
- Precision search without taxonomy knowledge
- Example: "Floral but NOT traditional roses"
- Example: "Geometric but NOT mandala style"
- Iterative refinement (click to exclude images)

**Implementation:**
```
1. UI: Search results page
   - "Hide results like this" button on each image thumbnail
   - Clicked images get visual "X" overlay (still visible but marked)
   - "Apply filters" button to re-search

2. Backend: Vector subtraction
   - positive_embedding = original_query_embedding
   - negative_embeddings = [clicked_image_embeddings]
   - refined_embedding = positive - (sum(negative) / count(negative)) * 0.3
   - Re-run search with refined_embedding

3. UX: Progressive refinement
   - User can click multiple "NOT like this" images
   - Each click updates the refined query
   - Option to reset filters
```

**Effort:** Medium (4-6 hours)
- New UI state management (track excluded images)
- Backend endpoint for refined search
- UX design for exclusion interaction

**Data Requirements:** None (uses existing embeddings)

**Unique?** ✅ **YES** - Impossible without vector arithmetic

**Priority:** 🔥 **MEDIUM-HIGH** - Power user feature, unique, medium complexity

---

#### 4. Portfolio Deep Dive
**Concept:** Show user's query matched against artist's FULL portfolio, not just top 4

**User Value:**
- On artist profile, see which pieces best match user's search
- "You searched for floral - here are Jamie's best floral pieces"
- Helps user assess artist's range in their desired style

**Implementation:**
```
1. Pass searchId through URL to artist profile
   - /artist/[slug]?searchId=abc123

2. Artist profile fetches:
   - All portfolio images for this artist
   - Original search embedding from searches table
   - Compute similarity for each image
   - Sort by similarity to search query

3. UI: Artist profile page
   - If searchId present:
     - "Based on your search, here are Jamie's most relevant pieces"
     - Show top 8-12 images sorted by similarity
   - If no searchId:
     - Show default portfolio ordering (recent or pinned first)
```

**Effort:** Low (2-3 hours)
- Modify artist profile page to accept searchId
- Query to compute similarity per image
- Conditional rendering in portfolio section

**Data Requirements:** None (uses existing data)

**Unique?** ✅ **SOMEWHAT** - Contextual portfolio filtering based on search intent

**Priority:** 🟡 **MEDIUM** - Nice enhancement, low effort, but not critical

---

#### 5. Style Strength Analysis
**Concept:** Auto-analyze each artist's portfolio to identify style specialties

**User Value:**
- "This artist excels at: Fine-line portraits (60%), Geometric sleeves (30%), Blackwork (10%)"
- Help users assess fit without scrolling entire portfolio
- SEO value: Rich snippets for artist profiles

**Implementation:**
```
1. Clustering: For each artist
   - Fetch all portfolio_images embeddings
   - Run K-means clustering (k=3-5 clusters)
   - Name clusters using GPT-4 (feed representative images)
   - Store in new table: artist_style_breakdown
     - artist_id, style_name, percentage, representative_image_ids

2. Update schedule:
   - Recalculate when portfolio changes (>10% change)
   - Cron job: weekly recalculation for all artists

3. UI: Artist profile page
   - Section: "Style Specialties"
   - Visual breakdown (donut chart or bars)
   - Click style → filter portfolio to that cluster
```

**Effort:** High (8-12 hours)
- Clustering script (Python or TypeScript with ml.js)
- GPT-4 integration for naming clusters
- Database schema for style breakdowns
- UI components for visualization

**Data Requirements:** None (uses existing embeddings)

**Unique?** ✅ **YES** - Auto-generated style analysis, no manual tagging

**Priority:** 🟡 **MEDIUM** - High value, but complex implementation

---

### 🚀 Tier 2: Medium Effort (Need Data Processing)

#### 6. Geographic Style Mapping
**Concept:** "What tattoo styles are popular in each city?"

**User Value:**
- SEO content: "Portland tattoo scene is known for blackwork and traditional"
- User discovery: "What's the vibe in this city?"
- Differentiated city landing pages

**Implementation:**
```
1. Cluster all images by city:
   - For each city: K-means on all portfolio_images embeddings
   - Identify 5-10 dominant style clusters per city
   - Name clusters with GPT-4

2. Compare cities:
   - Compute cluster distributions per city
   - Identify over-represented clusters (vs national avg)
   - Generate insights: "Portland has 3x more blackwork than average"

3. Store: city_style_insights table
   - city, style_name, percentage, relative_to_avg, representative_images

4. UI: City pages
   - "Portland's tattoo scene" section
   - Visual style breakdown
   - "Trending styles in this city" callouts
```

**Effort:** Medium-High (10-15 hours)
- Clustering pipeline for all cities
- Statistical analysis (style distributions)
- GPT-4 integration for insights generation
- UI components for city insights
- Scheduled recalculation (monthly)

**Data Requirements:** None (uses existing embeddings)

**Unique?** ✅ **YES** - Algorithmically-derived geographic insights

**Priority:** 🟡 **MEDIUM** - High SEO value, but complex + requires city scale

---

#### 7. Style Spectrum Explorer
**Concept:** Interactive 2D map of tattoo style space (t-SNE/UMAP projection)

**User Value:**
- Visual exploration instead of taxonomy dropdowns
- "I don't know what style I want, let me browse visually"
- Discover adjacent styles, see relationships between styles

**Implementation:**
```
1. Dimensionality reduction:
   - Sample 2,000-5,000 representative images
   - Run UMAP (better than t-SNE for this) to reduce 768-dim → 2-dim
   - Store: image_id, x, y coordinates

2. UI: Interactive canvas
   - Scatter plot of images (thumbnails at x,y positions)
   - Zoom/pan controls
   - Click image → find similar artists
   - Hover → preview larger image

3. Features:
   - Density-based region labels (GPT-4 names clusters)
   - "You are here" indicator if arriving from search
   - Click region → search artists in that style neighborhood
```

**Effort:** High (15-20 hours)
- UMAP projection pipeline (Python)
- Interactive canvas component (D3.js or Canvas API)
- Image loading/caching optimization (thousands of thumbnails)
- Backend API for region-based search

**Data Requirements:** None (uses existing embeddings)

**Unique?** ✅ **YES** - Novel interaction model, no competitor has this

**Priority:** 🟢 **LOW-MEDIUM** - High "wow factor", but complex + unclear ROI

**Notes:** Could be a standalone "Explore Styles" page, separate from main search flow

---

#### 8. Artist Rankings: Unique / Versatile / Consistent
**Concept:** Auto-generated rankings based on portfolio characteristics

**User Value:**
- **Most Unique:** Artists with distinctive styles nobody else has
- **Most Versatile:** Artists who excel across multiple styles
- **Most Consistent:** Artists who specialize in one tight style

**Implementation:**
```
1. Compute metrics per artist:
   - Uniqueness: Avg distance to all other artists' style_embeddings (higher = more unique)
   - Versatility: Variance of intra-portfolio similarities (higher = more diverse)
   - Consistency: Inverse of versatility (lower variance = more consistent)

2. Store: artist_metrics table
   - artist_id, uniqueness_score, versatility_score, consistency_score
   - Percentile rankings (e.g., "Top 5% most unique")

3. UI: Browse pages
   - New filter options: "Most Unique", "Most Versatile", "Most Consistent"
   - Artist cards show badge if in top 10%
   - SEO pages: /austin/most-unique-artists, /austin/most-versatile-artists
```

**Effort:** Medium (6-8 hours)
- Metrics calculation script (one-time + monthly updates)
- Database schema for metrics
- UI filters and badges
- SEO landing pages

**Data Requirements:** Need style_embedding per artist (from Feature #1)

**Unique?** ✅ **YES** - Objective, data-driven rankings

**Priority:** 🟡 **MEDIUM** - Interesting discovery mechanism, good SEO potential

---

### 🔮 Tier 3: Harder (Need Temporal/Behavioral Data)

#### 9. Trending Styles (Temporal Analysis)
**Concept:** "Micro-realism grew 40% in NYC this quarter"

**Requirements:**
- Timestamped portfolio scrapes (monthly)
- At least 3-6 months of historical data
- Cluster tracking over time

**Status:** ❌ **Not feasible yet** - Need temporal data infrastructure

---

#### 10. Collaborative Filtering Recommendations
**Concept:** "Users who saved Artist A also saved Artists B, C, D"

**Requirements:**
- User save/like behavior data
- Sufficient scale (>1,000 active users)
- Hybrid: Combine with embedding similarity

**Status:** ❌ **Not feasible yet** - Need user behavior data (post-MVP auth)

---

#### 11. Style Evolution Tracking
**Concept:** "Watch how this artist's style evolved over 3 years"

**Requirements:**
- Historical portfolio data with timestamps
- Multi-year data collection
- Animated visualization

**Status:** ❌ **Not feasible yet** - Need long-term temporal data

---

## Prioritization Framework

### Evaluation Criteria
1. **User Value:** Does this solve a real problem or create delight?
2. **Uniqueness:** Can competitors replicate this without embeddings?
3. **Implementation Effort:** How long to build and maintain?
4. **Data Requirements:** Do we have everything we need?
5. **SEO Impact:** Does this create unique indexable content?
6. **Engagement Impact:** Will this increase time on site / saves / conversions?

### Priority Matrix

| Feature | User Value | Unique | Effort | Data Ready | SEO | Engagement | **Priority** |
|---------|-----------|--------|--------|------------|-----|------------|--------------|
| ~~Artist Similarity~~ | ✅ **DONE** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **SHIPPED** |
| Multi-Reference Search | High | ✅ | Low | ✅ | Low | High | 🔥 **HIGH** |
| Negative Search | Med | ✅ | Med | ✅ | Low | Med | 🔥 **MED-HIGH** |
| Portfolio Deep Dive | Med | Partial | Low | ✅ | Low | Med | 🟡 **MEDIUM** |
| Style Strength | Med | ✅ | High | ✅ | High | Med | 🟡 **MEDIUM** |
| Geographic Styles | Med | ✅ | High | ✅ | High | Low | 🟡 **MEDIUM** |
| Style Spectrum | High | ✅ | Very High | ✅ | Med | Med | 🟢 **LOW-MED** |
| Artist Rankings | Med | ✅ | Med | ✅ | High | Low | 🟡 **MEDIUM** |

---

## Recommended Roadmap

### Phase A: Quick Wins (Week 1-2)
**Goal:** Ship 2-3 high-impact features fast

1. ~~**Artist Similarity**~~ ✅ **DONE** (Already shipped)
   - ✅ RelatedArtists component on profile pages
   - ✅ FindSimilarArtistsButton with city toggle
   - ✅ find_related_artists() SQL function

2. **Multi-Reference Search** (3-4 hours)
   - Extend existing search to accept multiple images
   - Average embeddings
   - Clear use case, minimal complexity

3. **Portfolio Deep Dive** (2-3 hours)
   - Pass searchId to artist profiles
   - Sort portfolio by relevance to search
   - Nice enhancement, low effort

**Total Effort:** ~5-7 hours (down from 8-10)
**Impact:** 2 new unique features + 1 already shipped

---

### Phase B: Power User Features (Week 3-4)
**Goal:** Add depth for engaged users

4. **Negative Search** (4-6 hours)
   - "Hide results like this" interaction
   - Vector subtraction refinement
   - Power user feature for precision

5. **Artist Rankings** (6-8 hours)
   - Unique/Versatile/Consistent metrics
   - Compute from existing portfolio embeddings
   - SEO landing pages

**Total Effort:** ~10-14 hours
**Impact:** Advanced discovery mechanisms

---

### Phase C: Content & SEO (Week 5+)
**Goal:** Unique indexable content

6. **Geographic Style Mapping** (10-15 hours)
   - Cluster by city
   - Generate insights
   - Rich city landing pages

7. **Style Strength Analysis** (8-12 hours)
   - Per-artist clustering
   - GPT-4 naming
   - Profile enhancements

**Total Effort:** ~18-27 hours
**Impact:** SEO differentiation, unique content

---

### Phase D: Experimental (Future)
**Goal:** High-risk, high-reward

8. **Style Spectrum Explorer** (15-20 hours)
   - UMAP projection
   - Interactive canvas
   - Novel interaction model

---

## Open Questions

1. **Artist Similarity:**
   - Should we cluster artists into style groups first, then recommend within groups?
   - Or just pure embedding similarity?
   - How do we handle artists with <10 portfolio images (noisy embeddings)?

2. **Multi-Reference Search:**
   - What's the optimal number of reference images? (2-5? 2-10?)
   - Should we weight reference images differently? (primary + secondary refs)
   - How do we explain the averaged embedding to users?

3. **Negative Search:**
   - What's the right subtraction weight? (0.3? 0.5? User-adjustable?)
   - Should we allow multiple iterations (exclude, exclude, exclude)?
   - How do we prevent users from over-filtering to zero results?

4. **Geographic Styles:**
   - Minimum city size for meaningful clustering? (Need 500+ images? 1,000+?)
   - How often to recalculate? (Monthly? Quarterly?)
   - How do we handle cities with <200 artists?

5. **General:**
   - Do any of these warrant Pro-tier gating? (Likely not for Phase A)
   - Which features should be on by default vs opt-in?
   - How do we measure success for each feature?

---

## Technical Considerations

### Database Schema Changes

**New columns:**
```sql
-- Artist style embeddings (for similarity)
ALTER TABLE artists ADD COLUMN style_embedding vector(768);
CREATE INDEX idx_artist_style_embedding ON artists USING ivfflat (style_embedding vector_cosine_ops);

-- Artist metrics (for rankings)
ALTER TABLE artists ADD COLUMN uniqueness_score FLOAT;
ALTER TABLE artists ADD COLUMN versatility_score FLOAT;
ALTER TABLE artists ADD COLUMN consistency_score FLOAT;
```

**New tables:**
```sql
-- Artist style breakdowns (for strength analysis)
CREATE TABLE artist_style_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  percentage FLOAT NOT NULL,
  representative_image_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- City style insights (for geographic mapping)
CREATE TABLE city_style_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  style_name TEXT NOT NULL,
  percentage FLOAT NOT NULL,
  relative_to_avg FLOAT, -- 3.2 = 3.2x more than national average
  representative_image_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UMAP projections (for style spectrum)
CREATE TABLE image_projections (
  image_id UUID PRIMARY KEY REFERENCES portfolio_images(id) ON DELETE CASCADE,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  projection_version INTEGER DEFAULT 1, -- Recalculate when we add more cities
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance Considerations

1. **Style Embeddings Pre-computation:**
   - Trigger: Update style_embedding when portfolio changes
   - Or: Batch job nightly (simpler, acceptable staleness)

2. **Multi-Reference Search:**
   - No performance impact (same search function, just different input embedding)

3. **Negative Search:**
   - Slightly more complex (vector arithmetic), but negligible overhead

4. **Clustering (Geographic, Style Strength):**
   - Run offline (Python scripts)
   - Not user-facing latency

5. **Style Spectrum (UMAP):**
   - Pre-compute projections
   - Serve static coordinates
   - Image loading is the bottleneck (CDN critical)

### Maintenance Burden

**Low Maintenance:**
- Artist Similarity (trigger or nightly job)
- Multi-Reference Search (no new infra)
- Portfolio Deep Dive (no new infra)

**Medium Maintenance:**
- Negative Search (new UI state, new endpoint)
- Artist Rankings (monthly recalculation)

**High Maintenance:**
- Style Strength Analysis (clustering + GPT-4 naming)
- Geographic Style Mapping (multi-city clustering + insights)
- Style Spectrum Explorer (UMAP recalculation as data grows)

---

## Success Metrics

### Feature-Specific Metrics

**Artist Similarity:**
- Click-through rate on "Similar Artists" recommendations
- % of profile visits that include similarity clicks
- Avg additional profiles viewed per session (before vs after)

**Multi-Reference Search:**
- % of searches using multi-image upload
- User retention on multi-ref searches (do they save more artists?)

**Negative Search:**
- % of users who refine their searches
- Avg refinements per search session
- Satisfaction scores (qualitative)

**Portfolio Deep Dive:**
- % of artist profiles accessed via search (with searchId)
- Engagement on sorted-by-relevance portfolios vs default

### Platform-Level Metrics (Pre vs Post)
- Avg session duration
- Avg profiles viewed per session
- Avg artists saved per session
- Search-to-save conversion rate
- Return user rate (7-day, 30-day)

---

## Next Steps

1. **Review & Prioritize:**
   - Discuss which features align with product vision
   - Validate assumptions about user needs
   - Finalize Phase A scope (2-3 features)

2. **Technical Spike:**
   - Test style embedding aggregation quality (does averaging work well?)
   - Prototype multi-reference search with 2-3 test images
   - Validate performance of additional vector searches

3. **UI/UX Design:**
   - Mockup "Similar Artists" section on profile pages
   - Design multi-image upload flow
   - Sketch negative search interaction

4. **Implementation Plan:**
   - Break down Phase A into tasks
   - Estimate effort per task
   - Create subtasks in memory bank or project tracker

---

## References

- **CLIP Paper:** [Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)
- **Vector Arithmetic:** [Analogy Examples (Word2Vec)](https://arxiv.org/abs/1301.3781) - Same principles apply to CLIP
- **UMAP:** [Uniform Manifold Approximation and Projection](https://arxiv.org/abs/1802.03426)
- **Our Tech Stack:** `/memory-bank/architecture/techStack.md`
- **Current Search Implementation:** `/supabase/migrations/20251229_007_optimize_search_function.sql`

---

**Status:** Brainstorming phase - awaiting direction and prioritization
