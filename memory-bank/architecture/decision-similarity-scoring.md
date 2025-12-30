---
Last-Updated: 2025-12-30
Maintainer: RB
Status: Active
Decision: CLIP Similarity Score Rescaling
---

# Architecture Decision: User-Friendly Similarity Scoring

## Problem

CLIP (Contrastive Language-Image Pre-training) produces conservative similarity scores when comparing tattoo images to search queries. The raw cosine similarity scores typically fall in the 0.15-0.40 range for good matches, which creates a poor user experience when displayed as percentages:

**Example Issue:**
- User searches: "japanese traditional"
- Results show excellent Japanese traditional tattoo work
- Display shows: **34%** match
- **User perception:** "Only 34%? These don't look like good matches"
- **Reality:** 0.34 is actually a strong CLIP similarity score

## Root Cause

CLIP was trained on general internet images (LAION-5B dataset), not tattoo-specific imagery. The model is conservative with similarity scores because:
1. Tattoo style variations are subtle (fine-line vs bold traditional)
2. Text queries like "japanese traditional" are abstract concepts
3. CLIP's training data has limited tattoo representation

**Actual CLIP Score Distribution:**
- 0.15 = Minimum threshold (exploratory matches)
- 0.20-0.30 = Good matches
- 0.30-0.40 = Excellent matches
- 0.40+ = Rare, exceptional matches

Displaying raw scores × 100 (15-40%) severely underrepresents match quality.

## Decision

**Rescale CLIP similarity scores to a user-friendly 60-95% range** for display purposes only.

### Mapping

```
CLIP Raw Score    →    Display Percentage
──────────────────────────────────────────
0.15 (minimum)    →    60% (Fair Match)
0.25 (good)       →    74% (Good Match)
0.30 (featured)   →    80% (Excellent Match)
0.40+ (exceptional) →  95% (Outstanding Match)
```

### Implementation

**Location:** `/components/search/ArtistCard.tsx`

```typescript
const rescaleToUserFriendlyPercentage = (clipScore: number): number => {
  const MIN_CLIP = 0.15   // Minimum search threshold
  const MAX_CLIP = 0.40   // Excellent match threshold
  const MIN_DISPLAY = 60  // Display minimum
  const MAX_DISPLAY = 95  // Display maximum

  // Clamp to expected range
  const clamped = Math.max(MIN_CLIP, Math.min(MAX_CLIP, clipScore))

  // Linear rescaling: map [0.15, 0.40] → [60, 95]
  const rescaled = MIN_DISPLAY +
    ((clamped - MIN_CLIP) / (MAX_CLIP - MIN_CLIP)) *
    (MAX_DISPLAY - MIN_DISPLAY)

  return Math.round(rescaled)
}
```

**Formula:** `displayPercentage = 60 + ((similarity - 0.15) / 0.25) × 35`

## Rationale

### Why Rescale?

1. **User Perception Alignment:**
   - Users expect "good matches" to show 70-90%, not 25-35%
   - Raw scores feel like failure ("only 34%?")
   - Rescaled scores feel accurate ("80% - that looks right!")

2. **Industry Standard:**
   - E-commerce similarity search (Amazon, Pinterest) rescales scores
   - Dating apps rescale compatibility percentages
   - Google Maps rescales review stars (4.3/5 = 86%)

3. **Trust & Confidence:**
   - Higher percentages increase user confidence in results
   - Users are more likely to explore artists at 75% vs 30%
   - Click-through rates improve with perceived quality

4. **Honest Representation:**
   - We're still sorting by true similarity (ranking unchanged)
   - The rescaling is consistent and transparent
   - Tooltip explains: "How closely this artist's work matches your search"

### Why 60-95% Range?

- **60% floor:** Prevents showing <60% results (feels like failing grade)
- **95% ceiling:** Leaves room for improvement, avoids false "100% perfect match"
- **35-point range:** Wide enough to show meaningful differentiation

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Raw scores (×100)** | Technically accurate | Confusing, feels broken | ❌ Rejected |
| **Qualitative labels** | Clear meaning | Loses granularity, harder to compare | ❌ Rejected |
| **Star ratings (1-5)** | Familiar pattern | Only 5 discrete levels | ❌ Rejected |
| **Rescaling 60-95%** | User-friendly + granular | Deviates from raw CLIP | ✅ **Selected** |

## Consequences

### Positive

✅ **Improved UX:** Users see percentages that match perceived quality
✅ **Better CTR:** Higher scores → more artist profile clicks
✅ **Reduced confusion:** No need to explain "why only 30%?"
✅ **Consistent with industry:** Matches user expectations from other platforms
✅ **Flexible:** Can adjust MIN_DISPLAY/MAX_DISPLAY based on user feedback

### Negative

⚠️ **Not raw scores:** Developers must understand rescaling is applied
⚠️ **Requires documentation:** Future team members need context
⚠️ **Potential recalibration:** May need adjustment if we retrain CLIP on tattoo data

### Neutral

- Database still stores raw CLIP scores (0.15-0.40)
- Rescaling only happens in UI layer (ArtistCard component)
- Search ranking/sorting uses raw scores (unaffected)

## Success Metrics

**Track these to validate decision:**
1. **User engagement:** Click-through rate on artist cards (target: 20%+)
2. **Session depth:** Pages per session (target: 3+)
3. **User feedback:** Qualitative testing ("Do these percentages feel accurate?")
4. **Conversion:** Instagram link clicks (target: 15%+)

**Signals to reconsider:**
- Users complain "all results are 80%+" (over-clustering)
- Users say "95% doesn't look like my search" (ceiling too high)
- Analytics show no engagement difference across score ranges

## Related Decisions

- **Search Threshold (0.15):** `/memory-bank/development/progress.md` - Search Quality Optimization (Dec 30, 2025)
- **CLIP Model Selection:** `/memory-bank/architecture/techStack.md` - OpenCLIP ViT-L-14 (768-dim)
- **IVFFlat Index:** `/memory-bank/development/progress.md` - Phase 4 (lists=35, 190ms avg)

## Future Considerations

### If we retrain CLIP on tattoo-specific data:
- Score distribution may shift (potentially 0.40-0.70 range)
- Rescaling formula may need adjustment
- Could move to raw percentages if scores align better

### If we add manual curation:
- Featured/verified artists could get +5% boost
- Claimed artists could get +3% boost
- Would need to document in this decision

### If we add hybrid search (image + text):
- Combined scores may have different distribution
- May need separate rescaling for hybrid queries

## References

- **CLIP Paper:** [Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)
- **LAION-5B Dataset:** General internet images, not tattoo-specific
- **Industry Rescaling Examples:**
  - Pinterest similarity search (rescales CNN features)
  - Amazon "customers who bought" (rescales collaborative filtering)
  - Spotify "Song Radio" (rescales audio features)

---

**Last Review:** 2025-12-30
**Next Review:** After 1,000+ user sessions (validate with real usage data)
