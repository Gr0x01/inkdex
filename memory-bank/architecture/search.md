---
Last-Updated: 2026-01-08 (ML Style Classifier Deployed)
Maintainer: RB
Status: Production
---

# Search Architecture

## Overview

Inkdex uses CLIP embeddings for semantic tattoo artist discovery. Users can search by image upload, text description, or Instagram URL. The system returns artists ranked by visual similarity with boosts for style matching, color preference, and Pro/Featured status.

## Core Components

### Embedding Model
- **Model**: OpenCLIP ViT-L-14 (768 dimensions)
- **Weights**: `laion2b_s32b_b82k`
- **Infrastructure**: Modal.com GPU (A10G)
- **Used for**: Both image and text embeddings (same vector space)

### Vector Index
- **Type**: IVFFlat (Inverted File Flat)
- **Operator**: `vector_cosine_ops` (cosine distance `<=>`)
- **Lists**: ~300 (sqrt of image count)
- **Performance**: <200ms per search (vs 2-5s without index)
- **Scale**: Optimal for 10K-100K images

**Why IVFFlat instead of HNSW (Jan 2026 decision):**
We tried HNSW but reverted due to Supabase/PgBouncer limitations:
- HNSW requires `SET hnsw.ef_search = N` to control recall (default ~40 results)
- Supabase uses PgBouncer transaction pooling which doesn't persist `SET` commands
- Even `SET LOCAL` within transactions didn't work reliably
- Result: HNSW only returned ~40 candidates instead of 500+ needed for good results
- IVFFlat doesn't have this issue - returns full results by default

### Similarity Calculation
```
similarity = 1 - (query_embedding <=> image_embedding)
```
- Range: 0 to 1 (normalized vectors)
- Higher = more similar

## Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/search/vector_search.sql` | Main search SQL functions |
| `lib/supabase/queries.ts` | `searchArtists()` TypeScript wrapper |
| `lib/search/style-classifier.ts` | Query style classification |
| `lib/search/color-analyzer.ts` | Query-time color analysis |
| `app/api/search/route.ts` | Search creation endpoint |
| `app/api/search/[searchId]/route.ts` | Results endpoint |
| `scripts/embeddings/modal_clip_embeddings.py` | Embedding generation (Modal GPU) |
| `scripts/styles/tag-images.ts` | Batch image style tagging |
| `scripts/styles/compute-artist-profiles.ts` | Artist style aggregation |
| `scripts/colors/analyze-image-colors.ts` | Batch image color analysis |

## Search Pipeline

### 1. Query Processing (`POST /api/search`)

| Input Type | Processing |
|------------|------------|
| Text | Add "tattoo" if missing → text embedding |
| Image upload | Generate embedding + analyze color + classify styles |
| Instagram post | Fetch image → embedding + color + styles |
| Instagram profile | Check DB first (optimization) → aggregate 6 images |
| Similar artist | Use artist's existing portfolio embeddings |

### 2. Vector Search (`search_artists()` SQL function)

```
ranked_images          → Vector search (uses IVFFlat index)
    ↓
threshold_images       → Filter by similarity threshold
    ↓
filtered_artists       → Apply GDPR/location/deletion filters
    ↓
artist_style_boost     → Calculate style match boost
    ↓
artist_color_boost     → Calculate color match boost
    ↓
boosted_artists        → Apply Pro/Featured boosts
    ↓
Final results          → Order by boosted_score, paginate
```

### 3. Ranking Formula

```
boosted_score = base_similarity + style_boost + color_boost + pro_boost + featured_boost
```

## Thresholds & Constants

### Style Classification
| Constant | Value | Notes |
|----------|-------|-------|
| Min confidence | **0.35** | Raised from 0.25 (Jan 2026) to reduce false positives |
| Max styles | 3 | Top N styles returned per query |
| Style weight | 0.15 | 15% impact on final score |

**History**: Japanese style was over-tagging (30% of artists) at 0.25 threshold. Raised to 0.35 to require stronger CLIP similarity match.

### Color Analysis
| Constant | Value | Notes |
|----------|-------|-------|
| Saturation threshold | 0.15 | HSL saturation to distinguish color from B&G |
| Color weight | 0.10 | 10% impact on final score |
| Color majority | >60% | Profile considered "color" |
| B&G majority | <40% | Profile considered "B&G" |
| Mixed | 40-60% | No color preference (null) |

### Ranking Boosts
| Boost | Value |
|-------|-------|
| Pro artist | +0.05 |
| Featured artist | +0.02 |
| Style match | Up to +0.15 (weighted by confidence × percentage) |
| Color match | Up to +0.05 per matching image |

### Search Defaults
| Parameter | Default | Max |
|-----------|---------|-----|
| Threshold | 0.5 | 1.0 |
| Limit | 20 | 100 |
| Offset | 0 | 10,000 |
| Candidate pool | 2,000 | - |

## Color System

The color system distinguishes between colorful tattoos and black-and-gray (B&G) work to improve search relevance.

### How Color Analysis Works

**Algorithm**: HSL saturation analysis (not RGB)
- Resize image to 100x100 (10K pixels) for speed
- Convert each pixel from RGB to HSL
- Calculate saturation: `s = (max - min) / (max + min)` (adjusted for lightness)
- Average saturation across all pixels
- **If avgSaturation > 0.15 → COLOR, else → B&G**

**Why HSL saturation?**
- More robust to lighting variations than RGB
- True B&G images have saturation ≈ 0 regardless of brightness
- Works well with varied tattoo photo backgrounds

### Data Storage

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `portfolio_images` | `is_color` | boolean | Per-image color classification |
| `searches` | `is_color` | boolean/null | Query color preference |

### Color Analysis Pipeline

**Batch processing (existing images):**
```bash
npx tsx scripts/colors/analyze-image-colors.ts
npx tsx scripts/colors/analyze-image-colors.ts --threshold 0.15 --concurrency 20
```

**Real-time (search queries):**
- `lib/search/color-analyzer.ts` - Same algorithm, runs at query time

### Query Color Detection

| Query Type | Color Detection Method |
|------------|----------------------|
| Image upload | Analyze uploaded image directly |
| Instagram post | Fetch image → analyze |
| Instagram profile (in DB) | Query existing `is_color` from portfolio, majority vote |
| Instagram profile (not in DB) | Scrape 6 images → analyze each → majority vote |
| Similar artist | Query artist's portfolio `is_color` → majority vote |

**Majority Vote Logic:**
```typescript
colorPercentage = colorImages / totalImages
isColorQuery = colorPercentage > 0.6 ? true :    // >60% = COLOR
               colorPercentage < 0.4 ? false :   // <40% = B&G
               null                               // 40-60% = MIXED (no preference)
```

### Search Boost Application

**Image-level boost** (in `search_artists()` SQL):
```sql
CASE
  WHEN is_color_query IS NULL THEN 0.0          -- No preference, no boost
  WHEN is_color_query = pi.is_color THEN 0.05   -- Match: +0.05
  ELSE 0.0                                       -- Mismatch: no penalty
END
```

**Artist-level aggregation:**
- Average the per-image color boosts across artist's matching images
- Final `color_boost` is 0.0 to ~0.05 depending on portfolio match

### Key Files

| File | Purpose |
|------|---------|
| `lib/search/color-analyzer.ts` | Query-time color analysis |
| `scripts/colors/analyze-image-colors.ts` | Batch color analysis |
| `scripts/colors/check-status.ts` | Check color analysis coverage |

### Thresholds

| Constant | Value | Location |
|----------|-------|----------|
| Saturation threshold | 0.15 | `color-analyzer.ts`, `analyze-image-colors.ts` |
| Color majority | >60% | `app/api/search/route.ts` |
| B&G majority | <40% | `app/api/search/route.ts` |
| Color boost weight | 0.10 × 0.5 = 0.05 | `vector_search.sql` |

## Style System

### Two-Tier Taxonomy (Updated Jan 8, 2026)

**Display Styles (11)** - shown on artist profile badges:
- traditional, neo-traditional, realism, black-and-gray
- blackwork, new-school, watercolor, ornamental, fine-line
- **japanese, anime** (added Jan 8, 2026 - ML classifier now accurate enough)

**Search-Only Styles (7)** - kept for relevance, hidden from profiles:
- tribal, trash-polka, biomechanical, sketch, geometric, dotwork, surrealism

### ML Classifier (Deployed Jan 8, 2026) ✅

Zero-shot CLIP seed comparison was replaced with trained ML classifier.

**Why ML is better:**
- CLIP embeddings capture visual features (768-dim)
- Logistic regression learns what "fine-line" means in tattoo context
- Trained on ~15k GPT-4.1-mini labeled images

**Results:**
| Metric | CLIP Seeds | ML Classifier |
|--------|------------|---------------|
| Surrealism | 28% | 12.4% |
| Anime | ~30% | 5.4% |
| Japanese | ~30% | 7.4% |

**Training Pipeline:**
1. GPT-4.1-mini vision labeled ~15k images (~$1.50/10k images)
2. Exported embeddings + labels to JSON
3. Trained sklearn LogisticRegression with balanced class weights
4. Best F1: black-and-gray (0.86), fine-line (0.77), realism (0.75)

**Key Files:**
| File | Purpose |
|------|---------|
| `scripts/styles/batch-label-gpt.ts` | GPT-4.1-mini batch labeling |
| `scripts/styles/export-training-data.ts` | Export embeddings + labels for Python |
| `scripts/styles/train-classifier.py` | sklearn logistic regression training |
| `scripts/styles/tag-images-ml.ts` | ML-based image tagging |
| `models/style-classifier.json` | Trained classifier weights (768 coef + intercept per style) |
| `app/admin/(authenticated)/styles/label/page.tsx` | Manual labeling UI (backup) |

### Style Tagging Pipeline
```bash
# Option 1: ML Classifier (recommended)
npx tsx scripts/styles/tag-images-ml.ts --clear --concurrency 200

# Option 2: CLIP seed comparison (legacy)
npx tsx scripts/styles/tag-images.ts --clear

# After tagging, regenerate artist profiles
npx tsx scripts/styles/compute-artist-profiles.ts --clear

# To retrain classifier (if more labels added):
npx tsx scripts/styles/export-training-data.ts
python3 scripts/styles/train-classifier.py
```

### Style Profile Display
- Artist pages show top 3 styles from DISPLAY_STYLES only
- Minimum 25% of portfolio required to display (`MIN_STYLE_PERCENTAGE`)
- Controlled by `lib/constants/styles.ts`
- Filter applied in `components/artist/ArtistInfoColumn.tsx`

## Design Decisions

### Vector Search First
Search uses IVFFlat index first (fast), then filters. This is 25x faster than filtering first.

### Image-Level Color Boost
Color boost applied per image, then averaged per artist. More granular than artist-level.

### Null for Mixed Color
If 40-60% of portfolio is color, `is_color = null` → no boost either way. Prevents penalizing mixed-style artists.

### Instagram Profile Optimization
Check DB first - if artist exists with 3+ images, reuse embeddings (instant). Only scrape via Apify if not in DB.

### Style Weight Formula
```sql
SUM(query_confidence × artist_percentage × 0.15)
```
- Query: "How confident is this query in traditional style?"
- Artist: "What % of this artist's work is traditional?"
- Multiply both for weighted boost

## Lessons Learned & Evolution

### Why Style Tagging Exists

**Problem**: CLIP embeddings match visual similarity, but users search by style names ("traditional", "Japanese", "realism"). An image of a dragon could match other dragons regardless of whether it's Japanese irezumi or American traditional.

**Solution**: Pre-tag images with style labels using seed images for each style. At search time, detect query styles and boost artists who specialize in those styles.

**How it works**:
1. Curate 5-22 seed images per style (authentic examples)
2. Generate CLIP embeddings for seeds, average them → style seed embedding
3. Compare every portfolio image to all style seeds
4. Tag images with styles above confidence threshold
5. Aggregate into artist profiles (% of portfolio per style)
6. At search time: classify query → boost matching artists

### Japanese/Anime Over-Tagging Incident (Jan 2026)

**Symptom**: 30% of artists tagged as "Japanese" or "Anime" - way too high for specific styles.

**Root cause**: Zero-shot CLIP seed comparison matched visual features (clean lines, detailed linework) rather than actual style intent.

**Fix (Jan 8, 2026)**: Replaced CLIP seeds with ML classifier trained on GPT-4.1-mini labeled data.

| Style | Before (CLIP) | After (ML) |
|-------|---------------|------------|
| Surrealism | 28% | 12.4% |
| Anime | ~30% | 5.4% |
| Japanese | ~30% | 7.4% |

**Result**: Japanese and anime now accurate enough to display as badges on artist profiles.

**Lesson**: CLIP matches visual features, not cultural/artistic intent. ML trained on labeled examples understands tattoo conventions better.

### Why Color Analysis Exists

**Problem**: A user searching with a black-and-gray image was getting colorful results (and vice versa). CLIP doesn't inherently distinguish color vs B&G - it focuses on content/composition.

**Example**: Search with a B&G portrait → results included colorful portraits because CLIP matched "portrait" not "B&G portrait".

**Solution**: Separate color analysis system using HSL saturation:
1. Analyze each portfolio image → store `is_color` boolean
2. At search time, detect query color preference
3. Boost artists whose work matches the color preference

**Why HSL saturation?**
- RGB variance didn't work well (lighting variations)
- HSL saturation is ~0 for true B&G regardless of brightness
- Simple threshold (0.15) works reliably

**Why majority vote for profiles?**
- Many artists do both color and B&G work
- 60%/40% thresholds prevent over-penalizing mixed artists
- `null` (40-60%) means "this artist does both" → no boost either way

### Search Ranking Philosophy

**Base similarity** comes from CLIP - how visually similar is this artist's work to the query?

**Style boost** rewards specialization - if you search with a traditional-looking image and an artist does 80% traditional work, they get boosted over a generalist.

**Color boost** ensures color preference is respected - not a hard filter (you might still want to see a great B&G artist even if you searched color), but a soft preference.

**Pro/Featured boosts** are business logic - paying artists get slight visibility boost, featured artists (editorial picks) get smaller boost.

**No penalties, only boosts**: We never penalize for mismatch - a B&G artist isn't pushed down for a color query, they just don't get the color boost. This prevents hiding great work.

### Threshold Tuning Guidelines

| If you see... | Try... |
|---------------|--------|
| Style X on too many artists | Raise threshold (0.35 → 0.40) or review seeds |
| Style X on too few artists | Lower threshold or add more diverse seeds |
| Wrong color classifications | Check saturation threshold (0.15) |
| Mixed artists penalized | Check majority vote thresholds (60/40) |
| Great artists buried | Check boost weights aren't too aggressive |

## Troubleshooting

### Style Over-Tagging
If a style appears on too many artists:
1. Check threshold in `tag-images.ts` (currently 0.35)
2. Review seed images for that style
3. Re-run tagging: `npx tsx scripts/styles/tag-images.ts --clear`
4. Re-compute profiles: `npx tsx scripts/styles/compute-artist-profiles.ts --clear`

### Slow Searches
1. Check IVFFlat index exists: `\d portfolio_images` in psql
2. Verify lists parameter matches sqrt(image_count)
3. Check `EXPLAIN ANALYZE` on search query

### Missing Results
1. Check `match_threshold` (default 0.5, try 0.3)
2. Verify artist has images with embeddings
3. Check GDPR filter isn't excluding artist

## Future Considerations

### Scale
- Current: ~92K images, IVFFlat optimal
- Lists parameter: Adjust with sqrt(new_count) as dataset grows
- At 500K+: May need to revisit HNSW if Supabase adds `ef_search` config support

### Search Tier (Prepared)
- `portfolio_images.search_tier` column exists
- Values: 'active' (default), 'archive'
- At 1M+ images: Could use tiered approach (recent/active images indexed separately)
- Note: HNSW migration blocked by PgBouncer `SET` limitations (see Vector Index section)
