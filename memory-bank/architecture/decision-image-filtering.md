---
Last-Updated: 2025-12-29
Maintainer: RB + Claude
Status: Decided - Ready for Implementation
---

# Architecture Decision: Instagram Image Filtering Strategy

## Context

**Date:** December 29, 2025
**Phase:** Phase 3 - Instagram Scraping & Image Processing
**Issue Discovered:** Not all Instagram images from artist profiles are tattoo work

### The Problem

Testing with 2 artists (22 images) revealed that Instagram profiles contain a mix of:
- ✅ **Tattoo portfolio work** (what we want)
- ❌ **Personal photos** (artist selfies, pets, travel, food)
- ❌ **Promotional content** (merch, flash sheets, shop photos, announcements)
- ❌ **Non-tattoo art** (drawings, paintings, sketches)
- ❌ **Random posts** (reposts, memes, stories)

**Estimated ratio:** ~60-70% tattoo work, ~30-40% other content

**Impact if unfiltered:**
- Wasted storage on irrelevant images (~30-40% waste)
- Degraded search quality (non-tattoo images in results)
- Confusion for users seeing non-tattoo content
- Higher costs (processing, storage, embedding generation)

---

## Options Evaluated

### Option 1: Accept Mixed Content
**Approach:** Scrape everything, no filtering

**Pros:**
- Zero additional development time
- CLIP embeddings naturally cluster similar content
- Can clean up later if needed

**Cons:**
- 30-40% storage waste
- Search results may include irrelevant images
- Poor user experience

**Cost:** $0
**Accuracy:** N/A
**Development Time:** 0 hours

---

### Option 2: Caption/Hashtag Filtering
**Approach:** Skip posts without tattoo-related keywords

**Pros:**
- Automated at scraping time
- Zero API cost
- Reduces storage waste

**Cons:**
- Many tattoo posts have no captions/hashtags
- Could filter out good content (false negatives)
- Hashtags can be misleading (false positives)
- Won't catch personal photos with tattoo hashtags

**Cost:** $0
**Accuracy:** ~60-70% (low)
**Development Time:** 1 hour

---

### Option 3: Manual Curation
**Approach:** Human review of all images post-scrape

**Pros:**
- 100% accuracy
- Full quality control

**Cons:**
- **Extremely time-consuming** (2,500 images × 5 sec = 3.5 hours)
- Doesn't scale to LA or more cities
- Boring, tedious work

**Cost:** Human time (~$70-140 at $20-40/hr)
**Accuracy:** 100%
**Development Time:** 0.5 hours (build review UI)

---

### Option 4: CLIP-based Classification
**Approach:** Use CLIP embeddings to classify tattoo vs non-tattoo

**Pros:**
- Automated and scalable
- We're already using CLIP for search

**Cons:**
- Requires running CLIP twice (classification + embeddings)
- Doubles GPU cost
- If we're running CLIP anyway, why not just accept mixed content?

**Cost:** ~$0.60 (doubles Phase 4 GPU cost)
**Accuracy:** ~85-90%
**Development Time:** 2 hours

---

### Option 5: Vision Model Classification (GPT-5-nano)
**Approach:** Call OpenAI Vision API to classify each image

**Pros:**
- **Extremely cheap** (~$0.01-0.02 for 2,500 images)
- High accuracy with proper prompting
- Automated and scalable
- Fast (parallel API calls)
- Clean dataset from the start

**Cons:**
- Adds API dependency
- Requires OpenAI API key
- Small latency increase (~1-2 seconds per image)

**Cost:** ~$0.01-0.02 (using Batch API)
**Accuracy:** ~95-98% (vision models excel at this)
**Development Time:** 0.5 hours

---

## Decision: GPT-5-nano Vision Classification ✅

**Selected Approach:** Option 5 - Vision Model Classification with GPT-5-nano

### Rationale

1. **Cost is negligible** - $0.01-0.02 is essentially free
2. **High accuracy** - Vision models are excellent at "is this a tattoo?" binary classification
3. **Scalable** - Works for 2,500 or 250,000 images
4. **Clean data from start** - Never upload non-tattoo images to Supabase
5. **Fast to implement** - 30-minute development time
6. **Saves downstream costs** - Don't process/store/embed irrelevant images

### Cost Breakdown

**Per-Image Cost:**
- Input tokens: ~255 tokens (low-detail image + prompt)
- Output tokens: ~5 tokens ("Yes" or "No")
- **Cost per image:** $0.000007 (less than 1/100th of a cent)

**For 2,500 images:**
- Input: 0.638M tokens × $0.025/1M = $0.016
- Output: 0.0125M tokens × $0.20/1M = $0.0025
- **Total: $0.019** (rounded to **$0.02**)

**Using Batch API (50% discount):**
- **Total: $0.01**

**Comparison:**
- Manual curation: $70-140 (human time)
- Storage waste (no filtering): ~$0 (within free tier, but wasted)
- CLIP classification: ~$0.60 (GPU time)
- Caption filtering: $0 (but poor accuracy)
- **GPT-5-nano: $0.01** ✅

---

## Implementation Plan

### 1. Add OpenAI API Integration

**File:** `scripts/scraping/apify-scraper.py`

Add function to classify images:
```python
def is_tattoo_image(image_path: str) -> bool:
    """Use GPT-5-nano vision to check if image is a tattoo"""
    import base64
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode()

    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Is this a photo of a tattoo (ink on someone's body)? Answer only 'yes' or 'no'."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}",
                        "detail": "low"  # Saves tokens, sufficient for classification
                    }
                }
            ]
        }],
        max_tokens=5
    )

    return response.choices[0].message.content.strip().lower() == "yes"
```

### 2. Integration Point

Filter **after download, before saving to disk**:
```python
# In scrape_artist_profile function, after downloading:
response = requests.get(image_url, timeout=30)
if response.status_code == 200:
    # Save temporary
    temp_path = artist_dir / f"{post_id}_temp.jpg"
    with open(temp_path, 'wb') as f:
        f.write(response.content)

    # Classify
    if is_tattoo_image(str(temp_path)):
        # Rename to final path
        final_path = artist_dir / f"{post_id}.jpg"
        temp_path.rename(final_path)
        # Continue with metadata...
    else:
        # Delete non-tattoo
        temp_path.unlink()
        print(f"      ⏭️  Skipped non-tattoo image: {post_id}")
        continue
```

### 3. Configuration

Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

Add to `.env.example`:
```bash
# OpenAI API (for image filtering - Phase 3)
OPENAI_API_KEY=sk-proj-your-key-here
```

Update `requirements.txt`:
```txt
openai>=1.0.0
```

### 4. Error Handling

- **Rate limits:** Implement exponential backoff (OpenAI SDK handles this)
- **API failures:** Skip image on persistent errors, log for manual review
- **Invalid images:** Catch exceptions, log, and skip

### 5. Monitoring

Add counters to scraper output:
```
   📸 Processing 12 posts...
   ✅ Tattoos: 8
   ⏭️  Skipped: 4 (non-tattoo)
   ✅ Downloaded 8 posts
```

---

## Success Metrics

**Target accuracy:** 95%+ (vision models typically achieve this)

**Expected filtering rate:**
- Before: 2,500 images (100%)
- After: ~1,600-1,800 images (64-72%)
- Filtered out: ~700-900 images (28-36%)

**Storage savings:**
- Per image: ~2.6 MB (original + 3 thumbnails)
- Filtered: ~700 images × 2.6 MB = ~1.8 GB saved
- Cost savings: $0 (within free tier, but cleaner dataset)

**Search quality improvement:**
- Reduced noise in search results
- Better CLIP embedding clusters
- Improved user experience

---

## Risks & Mitigations

### Risk 1: False Negatives (Tattoos Filtered Out)
**Likelihood:** Low (~2-5%)
**Impact:** Lost portfolio content
**Mitigation:**
- Use clear prompt: "ink on someone's body"
- Manual review of filtered images (batch download from temp folder)
- Adjust prompt if accuracy is poor

### Risk 2: False Positives (Non-Tattoos Passed)
**Likelihood:** Low (~2-5%)
**Impact:** Some irrelevant images in dataset
**Mitigation:**
- Acceptable - CLIP will still cluster correctly
- Can be manually removed later if needed

### Risk 3: API Costs Higher Than Expected
**Likelihood:** Very Low
**Impact:** Extra $0.10-0.20
**Mitigation:**
- Cost is negligible even if 10x higher
- Set API budget limit in OpenAI dashboard

### Risk 4: Rate Limiting
**Likelihood:** Low (Tier 1 has high limits)
**Impact:** Slower scraping
**Mitigation:**
- OpenAI SDK auto-retries with backoff
- Batch API option for non-urgent filtering

---

## Alternatives Considered & Rejected

### Why not CLIP for classification?
- CLIP is designed for retrieval, not binary classification
- Would need to run CLIP twice (once for filtering, once for embeddings)
- Doubles GPU cost (~$0.60 vs $0.01 for GPT-5-nano)

### Why not caption filtering?
- Only ~40-60% of tattoo posts have relevant captions
- High false negative rate (miss good content)
- Low accuracy overall

### Why not accept mixed content?
- While CLIP would handle it, why process/store/embed irrelevant images?
- For $0.01, we get a clean dataset from the start
- Better user experience and search quality

---

## Timeline

**Implementation:** 30 minutes
**Testing:** 15 minutes (test with 2-3 artists)
**Deployment:** Immediate (add to existing scraper)

**Total:** ~1 hour to production-ready

---

## Approval & Next Steps

**Status:** ✅ **APPROVED**
**Decision Date:** December 29, 2025
**Decision Maker:** RB

**Next Steps:**
1. Implement GPT-5-nano classification in `apify-scraper.py`
2. Add OpenAI API key to `.env.local`
3. Test with 2-3 artists (expect ~60-70% filter rate)
4. Validate accuracy (manual spot check of 20-30 filtered images)
5. Run full production scrape (202 artists)

**Expected Results:**
- ~1,600-1,800 tattoo images (vs 2,500 unfiltered)
- ~$0.01 filtering cost
- ~95%+ accuracy
- Clean dataset ready for CLIP embeddings

---

## Post-Implementation Review

**To be completed after full production run:**

- Actual filtering rate: _TBD_
- Actual API cost: _TBD_
- Accuracy (spot check): _TBD_
- False negatives found: _TBD_
- False positives found: _TBD_
- Adjustments needed: _TBD_

---

## Related Documents

- `/memory-bank/development/activeContext.md` - Phase 3 status
- `/memory-bank/development/progress.md` - Implementation timeline
- `/memory-bank/architecture/techStack.md` - Technology choices
- `scripts/scraping/apify-scraper.py` - Implementation file
