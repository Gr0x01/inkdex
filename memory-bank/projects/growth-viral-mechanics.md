---
Last-Updated: 2026-01-18
Maintainer: RB
Status: Planning
---

# Growth Strategy: Viral Mechanics

**Goal:** Build viral loops and referral tracking to leverage existing 20K artists and organic users.

---

## Context & Why Now

### Current Traffic Performance (Jan 9-16, 2026)

| Channel | Cost | Users | Profile Views | Conversion |
|---------|------|-------|---------------|------------|
| Google Organic | $0 | 54 | 30 | **55%** |
| BetaList | $0 | 29 | 5 | 17% |
| Google Ads | $58.82 | 12 | 3 | 25% (93% click loss) |
| Reddit Ads | $39.63 | 24 | 0 | 0% |

**Key insight:** Free/organic traffic converts 2-10x better than paid. The 93% click loss on Google Ads suggests bot clicks from Display Network.

**User insight:** "It's hard to be in the moment between looking for tattoos vs looking for artists. I think people don't wait till they have a full idea before finding an artist."

This suggests users are in "inspiration browsing" mode, not "ready to book" mode. Viral mechanics can work with this - people share inspiration.

### What's Already Built

- `ShareButton.tsx` - Web Share API + clipboard fallback (no tracking)
- `ReferralTracker.tsx` - Captures `?ref=` and UTM params in PostHog
- `events.ts` - 27 PostHog events defined, but no share events
- Dynamic OG images for search results (`app/search/opengraph-image.tsx`)
- Ambassador page (`/for-artists/ambassadors`) - 3 months Pro for mentions

### Current Gaps

| Gap | Impact | Notes |
|-----|--------|-------|
| No share tracking | Can't measure virality | Shares happen but we don't know how many |
| No share prompts | Users don't think to share | Button exists but no nudge |
| No artist referral links | Artists can't promote their profiles | Miss opportunity to tap 300M follower reach |
| No referral stats | No feedback loop for sharers | No psychological reward |
| No shareable search URLs in UI | Can't share specific searches | `/search?q=` works but not exposed |

---

## Proposed Viral Loop

```
User searches → Finds results → Prompted to share → Friend clicks → Repeats
         ↑                                              |
         +---------- Artist shares their profile -------+
```

**Two loops:**
1. **User loop:** Search → Share results → Friend searches
2. **Artist loop:** Claim profile → Share referral link → Fans visit → Some search

---

## Implementation Options

### Phase 1: Share Tracking (~2 hours)
Add visibility into sharing behavior before adding prompts.

**New event:**
```typescript
SHARE_CLICKED: 'Share Clicked'

interface ShareClickedProperties {
  share_type: 'search_results' | 'artist_profile' | 'style_page'
  share_method: 'web_share_api' | 'clipboard'
  artist_id?: string
  artist_slug?: string
  search_id?: string
  url: string
}
```

**Why first:** Measure baseline before changing behavior.

### Phase 2: Share Prompts (~3 hours)
Encourage sharing at key moments.

**Options:**
- A. Subtle banner below search results header
- B. Toast notification after 5+ results viewed
- C. Exit-intent overlay (more aggressive)

**Copy ideas:**
- "Found what you're looking for? Share these results"
- "Know someone who'd love this style?"
- "Planning a tattoo together? Share this search"

### Phase 3: Artist Referral Links (~3 hours)
Let claimed artists promote their profiles with tracking.

**How it works:**
- Every artist profile gets `?ref=[artist-id]` capability
- Claimed artists see "Copy your referral link" button
- ReferralTracker already captures `ref` param
- New dashboard section shows referral stats

**Potential copy:**
- "Share your Inkdex profile with fans"
- "X people found Inkdex through your link this month"

### Phase 4: Stats Display (~4 hours)
Show artists their reach in the dashboard.

**Metrics to show:**
- Profile views (already tracked)
- Shares of their profile (needs Phase 1)
- Referral link clicks (needs Phase 3)
- Searches from their referrals

**Design:** "Your Reach" card in artist dashboard.

### Phase 5: Shareable Search URLs (~2 hours)
Make it easy to share specific searches.

**Current:** `/search?q=fine+line` works
**Enhancement:** Add "Copy link" button to search results header

---

## Alternative Approaches Considered

### Referral Rewards (Not Recommended Now)
- Pro credits for referrals that convert
- Complexity: credit tracking, redemption, abuse prevention
- **Why defer:** Prove basic sharing works first, then add rewards

### Gamification Leaderboards
- "Top referring artists this month"
- Creates competition but also comparison anxiety
- **Why defer:** Start with private stats, add public later if working

### Share-Gated Content
- "Share to see more results"
- Aggressive, may feel spammy
- **Why skip:** Inkdex brand is editorial/premium, not growth-hacky

---

## Open Questions

1. **Where should share prompts appear?**
   - After search results (most natural)
   - After viewing artist profile
   - Both?

2. **Should artist referral links be public or claimed-only?**
   - Public: Any profile can be shared with ref link
   - Claimed-only: Incentivizes claiming

3. **What's the right aggressiveness level?**
   - Subtle: Passive banner, easy to ignore
   - Medium: Toast after engagement
   - Aggressive: Overlay/modal

4. **How do we avoid spammy feeling?**
   - Match Inkdex editorial aesthetic
   - Never block content
   - Limit frequency (once per session?)

---

## Success Metrics

| Metric | Current | Target | How Measured |
|--------|---------|--------|--------------|
| Share rate | Unknown | 5% of searches | PostHog `Share Clicked` / `Search Completed` |
| Referral traffic | <5% | 15% | `Referral Landed` events / total visits |
| Ref-to-search rate | Unknown | 30% | Searches by users with referral attribution |
| Artist link copies | 0 | 50/week | PostHog event on copy |

---

## Dependencies & Risks

**Dependencies:**
- PostHog working correctly (fixed race condition Jan 17)
- Dynamic OG images working for shares (already built)

**Risks:**
- Share prompts feel annoying → keep subtle, easy to dismiss
- Artists don't use referral links → need to communicate value
- Can't measure actual shares (only button clicks)

---

## Related Docs

- `/memory-bank/development/activeContext.md` - ReferralTracker fix details
- `/memory-bank/marketing/reel-ideas.md` - Existing marketing content
- `/app/for-artists/ambassadors/` - Ambassador program (uncommitted)

---

## Next Steps

1. Discuss priorities and scope
2. Decide on prompt aggressiveness level
3. Plan implementation phases
4. Build incrementally, measure each phase
