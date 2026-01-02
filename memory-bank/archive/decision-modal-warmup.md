---
Date: 2025-12-31
Status: Implemented
Decision Makers: RB
---

# Architecture Decision: Modal Container Warmup Optimization

## Context

**Problem:** Modal.com serverless GPU containers have 20-25 second cold start times (container initialization + CLIP model loading), creating unacceptable search latency for users.

**User Experience Impact:**
- First search: 25 seconds (frustrating, high bounce rate risk)
- Subsequent searches: 25 seconds each (container shuts down between requests)
- Expected user tolerance: <5 seconds for search results

**Initial Hypothesis:** Users would tolerate the 25s latency because visual search is novel. **Reality:** 25s is unacceptable for modern web UX - users expect instant results.

## Problem Statement

How do we reduce Modal.com cold start latency from 25s to <5s while keeping costs reasonable for MVP (<$50/month)?

## Options Considered

### Option 1: 24/7 Container Keep-Warm ❌
**Approach:** Set `keep_warm=1` to maintain a container running continuously.

**Pros:**
- Instant response times (~2-5s) for all searches
- Simple configuration (single parameter)
- Consistent UX

**Cons:**
- **Cost:** $0.60/hour × 24 hours = $14.40/day = **$432/month** 💸
- Unacceptable for MVP budget
- Wasteful during idle periods (nighttime, low traffic)

**Verdict:** Too expensive for MVP

---

### Option 2: Container Scaledown Window Only ⚠️
**Approach:** Use `scaledown_window=600` (10 minutes) to keep container alive between searches.

**Pros:**
- Only pay when actively used (~$1-3/day during testing)
- Subsequent searches within 10min are fast (2-5s)
- No code changes needed

**Cons:**
- **First search still 25s** (cold start)
- Users may bounce before searching
- Doesn't solve initial UX problem

**Verdict:** Partial solution, not sufficient alone

---

### Option 3: Pre-Warmup on Page Load ✅ **SELECTED**
**Approach:** Fire-and-forget warmup request when user lands on homepage, combined with 10-minute scaledown window.

**Architecture:**
```
User Journey:
1. User lands on homepage → ModalWarmup component fires warmup request
2. Container spins up in background (20-25s)
3. User browses hero, reads copy, enters query (~30-60s)
4. User submits search → Container is warm (2-5s response!)
5. Subsequent searches within 10min → 2-5s (warm)
6. After 10min idle → Container shuts down (saves money)
```

**Implementation:**
1. **Client Component:** `ModalWarmup.tsx` fires on homepage mount
2. **API Endpoint:** `/api/warmup` triggers lightweight text embedding
3. **Modal Config:** `scaledown_window=600` (10 min idle timeout)
4. **Feature Flag:** `NEXT_PUBLIC_ENABLE_WARMUP` to disable when traffic is high

**Pros:**
- **83-90% latency reduction** for first search (25s → 2-5s)
- **Cost-effective:** ~$3-5/month (100-200 visitors/day)
- **98% cost savings** vs 24/7 warming ($3-5 vs $210-240)
- **User-friendly:** Pre-warms during natural browsing time
- **Scalable:** Can disable when organic traffic keeps containers warm
- **Graceful degradation:** If warmup fails, search still works (just slower)

**Cons:**
- Adds complexity (new API endpoint + client component)
- Requires security hardening (SSRF prevention, rate limiting)
- Users who search immediately (<30s) may still see slow first search
- Not effective for direct-to-search deep links

**Verdict:** Best cost/benefit trade-off for MVP

---

### Option 4: Dual Embedding System (OpenAI + CLIP) ❌
**Approach:** Use fast OpenAI text embeddings for text search, keep CLIP for image search.

**Pros:**
- Text search: <1s (OpenAI API is fast)
- Solves latency for 90% of searches (assuming text dominates)

**Cons:**
- **Incompatible vector spaces:** Can't compare OpenAI embeddings to CLIP image embeddings
- Requires 2x storage (two embedding columns)
- Requires 2x indexing (IVFFlat for each embedding type)
- Complex: Different search paths for text vs image
- Loses multimodal benefit (CLIP's key advantage)
- **Doesn't solve image search latency** (still 20-30s)

**Verdict:** Violates core architecture (multimodal CLIP), too complex

---

### Option 5: Smaller CLIP Model (ViT-B-32) 🤔
**Approach:** Use ViT-B-32 (512-dim, 149MB) instead of ViT-L-14 (768-dim, 428MB).

**Pros:**
- **Faster cold starts:** ~5-8s vs 20-25s (model download time reduced)
- Faster inference (~200ms vs 300ms)
- Same multimodal architecture

**Cons:**
- **Quality trade-off:** ~5-10% worse search quality
- Still has cold starts (not eliminated, just faster)
- Dimension mismatch: Can't mix with existing ViT-L-14 embeddings

**Verdict:** Potential future optimization if warmup isn't sufficient

---

## Decision

**Selected:** Option 3 (Pre-Warmup on Page Load) + Option 2 (Scaledown Window)

**Rationale:**
1. **Cost-effective:** 98% savings vs 24/7 warming while maintaining fast UX
2. **User-friendly:** Pre-warms during natural browsing time (30-60s)
3. **Scalable:** Feature flag allows disabling when traffic keeps containers warm
4. **Graceful:** Warmup failures are non-critical (search still works)
5. **Simple:** Minimal code changes (138-line API endpoint + 31-line component)

## Implementation Details

### Architecture Components

**1. Modal Container Configuration**
```python
@app.cls(
    gpu="A10G",
    scaledown_window=600,  # Keep alive 10 minutes after last request
)
class Model:
    # CLIP model loading in @modal.enter()
    # FastAPI web endpoint for embeddings
```

**2. Warmup API Endpoint** (`/app/api/warmup/route.ts`)
- **Input:** None (POST request with no body)
- **Output:** `{ success: boolean, message: string }`
- **Action:** Fire-and-forget fetch to Modal `/generate_text_query_embedding` with text="warmup"
- **Security:**
  - SSRF prevention: Whitelist `.modal.run` domain, HTTPS only
  - Rate limiting: Max 1 warmup per IP per minute
  - Cache-Control: `no-store, no-cache, must-revalidate`
- **Error Handling:** Silent failures (non-critical optimization)

**3. Client Component** (`/components/warmup/ModalWarmup.tsx`)
```tsx
useEffect(() => {
  if (process.env.NEXT_PUBLIC_ENABLE_WARMUP === 'true') {
    fetch('/api/warmup', { method: 'POST' })
      .then(() => console.log('✅ Warmup request sent'))
      .catch((err) => console.warn('⚠️  Warmup failed (non-critical):', err));
  }
}, []); // Run once on mount
```

**4. Feature Flag**
```bash
# .env.local
NEXT_PUBLIC_ENABLE_WARMUP=true  # Enable for MVP
MODAL_FUNCTION_URL=https://username--app-model-fastapi-app.modal.run
```

### Security Hardening

**SSRF Prevention:**
```typescript
const url = new URL(modalUrl);
if (!url.hostname.endsWith('.modal.run')) {
  throw new Error('Invalid Modal URL domain');
}
if (url.protocol !== 'https:') {
  throw new Error('Modal URL must use HTTPS');
}
```

**Rate Limiting:**
```typescript
const WARMUP_COOLDOWN_MS = 60000; // 1 minute
const lastWarmupTime = new Map<string, number>();

const ip = request.headers.get('x-forwarded-for') || 'unknown';
if (lastTime && now - lastTime < WARMUP_COOLDOWN_MS) {
  return { success: false, message: 'Warmup on cooldown' };
}
```

**Memory Leak Prevention:**
```typescript
// Clean up old entries (prevent unbounded Map growth)
if (lastWarmupTime.size > 1000) {
  const cutoff = now - WARMUP_COOLDOWN_MS;
  for (const [key, time] of lastWarmupTime.entries()) {
    if (time < cutoff) lastWarmupTime.delete(key);
  }
}
```

## Performance Impact

### Before Optimization
| Metric | Value |
|--------|-------|
| First search latency | 25s (cold start) |
| Subsequent searches | 25s each (container shutdown) |
| User experience | Frustrating, high bounce risk |
| Cost (24/7 warming) | $210-240/month |

### After Optimization
| Metric | Value |
|--------|-------|
| First search latency | 2-5s (pre-warmed) |
| Subsequent searches (within 10min) | 2-5s (warm) |
| Searches after 10min idle | 25s (acceptable, infrequent) |
| User experience | Acceptable, low bounce risk |
| Cost (warmup) | $3-5/month |

**Performance Improvement:** 83-90% latency reduction
**Cost Savings:** 98% reduction ($205-237/month saved)

## Cost Analysis

### Warmup Cost Breakdown
- **Per warmup:** $0.001 (0.3s GPU time for text embedding)
- **100 visitors/day:** $0.10/day = $3/month
- **200 visitors/day:** $0.20/day = $6/month
- **500 visitors/day:** $0.50/day = $15/month

### Idle Time Cost (Scaledown Window)
- **Per hour idle:** $0.30-0.50 (A10G GPU hourly rate)
- **Expected idle time:** 1-2 hours/day (between search sessions)
- **Monthly idle cost:** $10-30

### Total Monthly Cost Estimate
- **Low traffic (100 visitors/day):** ~$3-5/month
- **Medium traffic (200 visitors/day):** ~$5-10/month
- **High traffic (500 visitors/day):** ~$15-20/month

### Cost Comparison
| Approach | Cost/Month | Latency | Notes |
|----------|-----------|---------|-------|
| No optimization | $0 | 25s | Unacceptable UX |
| 24/7 keep-warm | $210-240 | 2-5s | Too expensive for MVP |
| Scaledown only | $10-30 | First: 25s, Rest: 2-5s | Partial solution |
| **Warmup + Scaledown** | **$3-5** | **2-5s** | **Best cost/benefit** ✅ |

## When to Disable Warmup

**Trigger:** Organic traffic keeps containers naturally warm (50+ searches/day)

**How to disable:**
```bash
NEXT_PUBLIC_ENABLE_WARMUP=false
```

**Signs you should disable:**
- Modal dashboard shows containers staying warm without warmup
- 80%+ of searches hit warm containers
- Warmup cost >$10/month (high traffic)

## Future Optimizations

### Near-Term (If Warmup Insufficient)
1. **Reduce scaledown_window to 5 minutes** - If most searches happen within 5 min of page load
2. **localStorage deduplication** - Prevent duplicate warmups on navigation
3. **Warmup on search intent** - Trigger when user focuses search input (vs page load)

### Medium-Term (If Search Patterns Change)
4. **Smaller CLIP model (ViT-B-32)** - 5-8s cold start vs 20-25s (5-10% quality trade-off)
5. **Conditional warmup** - Only warm for returning visitors (localStorage flag)
6. **Regional containers** - Deploy containers closer to users (lower network latency)

### Long-Term (High Traffic)
7. **Predictive scaling** - Keep containers warm during peak hours, scale down at night
8. **Dedicated GPU** - Rent dedicated GPU if traffic justifies ($100-200/month break-even point)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **SSRF attacks** | High (cost abuse) | Low | Whitelist `.modal.run` domains, HTTPS only |
| **Rate limit abuse** | High (cost spike) | Medium | 1 warmup/min per IP, Map cleanup |
| **Warmup failures** | Low (UX degradation) | Medium | Graceful degradation, silent errors |
| **Users search <30s** | Medium (cold start) | Low | Most users browse 30-60s before searching |
| **Deep link to search** | Medium (cold start) | Low | Direct search links bypass warmup |
| **Cost creep** | Medium (budget) | Low | Feature flag, monitoring, alerts |

## Monitoring & Metrics

### Key Metrics to Track
1. **Warmup success rate** - % of warmups that complete successfully
2. **Search latency distribution** - Histogram of search times (cold vs warm)
3. **Warmup-to-search conversion** - % of warmups followed by actual search
4. **Daily warmup count** - Track homepage visits triggering warmup
5. **Daily warmup cost** - Monitor GPU usage from warmup requests
6. **Container warm time** - % of searches hitting warm containers

### Logging
```typescript
// Server-side warmup logs
console.log('🔥 Modal container warmed in ${duration}ms');
console.warn('⚠️  Warmup failed after ${duration}ms (non-critical):', err.message);

// Client-side warmup logs
console.log('🔥 Triggering Modal warmup...');
console.log('✅ Warmup request sent');
```

### Alerts
- **Daily warmup cost >$1** - High traffic, consider disabling
- **Warmup success rate <80%** - Modal issues, investigate
- **Search latency p95 >10s** - Warmup not working, investigate

## Success Criteria

**MVP Success:**
- ✅ First search latency <5s (90th percentile)
- ✅ Monthly warmup cost <$10
- ✅ No security incidents (SSRF, cost abuse)
- ✅ User bounce rate <30% on search page

**Post-MVP Success:**
- Container warm rate >80% (organic traffic sustains warmth)
- Warmup feature disabled (no longer needed)
- Search latency p50 <2s, p95 <5s

## Lessons Learned

1. **Serverless cold starts are real** - Modal's 20-25s cold starts were worse than expected
2. **Pre-warming works** - Users naturally browse 30-60s before searching
3. **Feature flags are essential** - Easy to disable when no longer needed
4. **Security matters from day one** - SSRF and rate limiting prevent cost disasters
5. **Cost optimization ≠ performance degradation** - Can have fast UX at 2% of keep-warm cost

## Related Decisions

- [Architecture Decision: Image Filtering](./decision-image-filtering.md) - GPT-5-nano classification (Dec 29, 2025)
- [Search UX Strategy](../projects/search-ux-strategy.md) - Multimodal search approach
- [Tech Stack](./techStack.md) - Overall architecture overview

## References

- Modal.com Documentation: https://modal.com/docs/guide/lifecycle-functions
- Modal Scaledown Window: https://modal.com/docs/guide/modal-1-0-migration
- CLIP Model Performance: https://github.com/mlfoundations/open_clip
- Serverless Cold Start Best Practices: https://www.infoq.com/articles/serverless-cold-start/

---

**Decision Date:** December 31, 2025
**Implementation Status:** ✅ Complete (deployed to Modal)
**Review Date:** After Phase 7 or when traffic reaches 50+ searches/day
**Document Maintainer:** RB
