# Search UX Strategy: User Language, Not Artist Language

**Last Updated:** 2025-12-29
**Status:** Architectural Decision Approved

---

## The Core Insight

**Problem:** Users don't know tattoo taxonomy. They have Pinterest screenshots and vague vibes like "dark floral sketchy."

**Every other platform:** Forces users to navigate dropdowns of artist terminology (neo-traditional, new school, illustrative, blackwork vs black-and-grey...)

**Our approach:** Users search in THEIR language → We translate to artist matches.

---

## How CLIP Makes This Possible

**CLIP is Multimodal:** The same model encodes BOTH images AND text into the same 768-dimensional vector space.

This means:
- Image search: Reference photo → CLIP image encoder → 768-dim vector → similarity search
- Text search: "dark floral sketchy" → CLIP text encoder → 768-dim vector → **SAME** similarity search
- Results are ranked by visual similarity regardless of input type

**Technical Win:** We don't need separate search systems. One vector space, one similarity search, multiple input methods.

---

## Search Modes (MVP)

### 1. Image Upload (Primary)
**Copy:** "Upload your inspo"
- Drag-drop, file upload, URL paste
- No taxonomy, no jargon
- Pinterest screenshots, Instagram saves, photos
- → CLIP image encoder → find visually similar artists

### 2. Natural Language Search (Secondary)
**Copy:** "Describe your vibe"
- Text input: "dark floral sketchy", "geometric but organic", "minimalist line art"
- → CLIP text encoder → find visually matching artists
- **No LLM needed** - CLIP already understands visual concepts from text

### 3. Visual Style Picker (Optional/Future)
**Copy:** "Pick a vibe"
- Grid of 9-12 example tattoo images
- User clicks 2-3 that match their desired vibe
- Combine embeddings (average vectors)
- → Seeded search with visual preferences

### 4. Hybrid Search (Post-MVP)
**Copy:** "Upload + refine"
- Image + text modifier: "like this but more colorful"
- Weighted combination of image embedding + text embedding
- More refined results

---

## UX Copy Principles

### ❌ Don't Do (Artist Language)
- "Select a style: Neo-traditional, New School, Illustrative, Trash Polka..."
- "Filter by technique: Dotwork, Blackwork, Fine Line, Watercolor..."
- "Artist specialties"
- "Browse by medium"

### ✅ Do Instead (User Language)
- "Show us what vibe you're going for"
- "Upload a photo of something you like"
- "Describe your vibe" / "Tell us what you're looking for"
- "Artists whose work looks like this"
- "Find your match"

---

## Implementation Architecture

### Database Changes
```sql
-- Searches table now tracks query type
CREATE TABLE searches (
  id UUID PRIMARY KEY,
  embedding vector(768),  -- SAME for image and text!
  query_type TEXT NOT NULL,  -- 'image', 'text', 'hybrid'
  query_text TEXT,  -- Store original text query
  image_url TEXT,  -- Store uploaded image reference
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Design
```typescript
// POST /api/search
interface SearchRequest {
  type: 'image' | 'text' | 'hybrid';

  // For image search
  image?: File | string;  // File upload or URL

  // For text search
  query?: string;  // "dark floral sketchy"

  // For hybrid (future)
  imageWeight?: number;  // 0.7 = 70% image, 30% text

  // Optional filters
  city?: string;
}

interface SearchResponse {
  searchId: string;  // UUID for results page
}
```

### Modal.com Embedding Service
```python
# /scripts/embeddings/generate_embeddings.py
import open_clip

# Same model, different encoders
model, _, preprocess = open_clip.create_model_and_transforms('ViT-L-14')

# For image search
def encode_image(image_bytes):
    img = preprocess(Image.open(image_bytes))
    return model.encode_image(img).cpu().numpy()

# For text search
def encode_text(text_query):
    text = open_clip.tokenize([text_query])
    return model.encode_text(text).cpu().numpy()

# Both return 768-dim vectors that can be compared!
```

### Vector Search (Same for Both)
```sql
-- Works for image OR text embeddings
SELECT
  artist_id,
  artist_name,
  1 - (embedding <=> $1::vector) AS similarity
FROM portfolio_images
WHERE 1 - (embedding <=> $1::vector) > 0.7
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

---

## UI Component Structure

```
SearchInput.tsx (tabbed interface)
├── Tab: "Upload Image" (Primary)
│   ├── DragDropZone
│   ├── FileInput
│   └── URLInput
│
├── Tab: "Describe Vibe" (Secondary)
│   ├── TextArea ("dark floral sketchy")
│   └── ExamplePrompts
│
└── Tab: "Pick a Vibe" (Optional)
    └── ImageGrid (9-12 example styles)
```

---

## Why This Works Better Than Competitors

### Inkzup (Main Competitor)
- Booking-focused, not discovery
- Artist directory with search by name/location only
- No visual search
- Users need to know what they're looking for

### Our Advantage
- **Visual-first:** Screenshot → matches
- **Natural language:** "dark floral" works as well as taxonomy
- **No knowledge required:** User doesn't need to know "neo-traditional" means
- **Serendipity:** Discover artists by vibe, not just name

---

## Success Metrics

### User Engagement
- **Primary:** % of searches using image upload (target: 60%+)
- **Secondary:** % using text search (target: 30%+)
- **Tertiary:** % using visual picker (target: 10%+)

### Search Quality
- Click-through rate on search results (target: 40%+)
- Time to artist click from search (target: <30 seconds)
- Refinement rate (user searches again) (target: <20%)

### Qualitative
- User testing: "I found what I wanted" (target: 80%+)
- Support tickets about "how to search" (target: <5%)

---

## Example User Journeys

### User 1: "I have a Pinterest board"
1. Opens site → sees "Upload your inspo"
2. Uploads screenshot from Pinterest (dark floral design)
3. Sees 20 artists with similar dark floral work
4. Clicks artist → sees full portfolio
5. Follows Instagram link → DMs artist

**No taxonomy needed. No confusion. Instant value.**

### User 2: "I don't know what it's called but..."
1. Opens site → sees "Describe your vibe"
2. Types: "minimalist but with some nature elements"
3. CLIP interprets → finds artists with minimalist nature work
4. Sees results → "oh yeah, that's exactly what I meant!"

**Natural language works. User stays in their mental model.**

### User 3: "I'm just browsing"
1. Opens site → sees "Pick a vibe"
2. Clicks 3 example images that appeal to them
3. Gets curated results based on visual preferences
4. Discovers artists they wouldn't have found by name

**Discovery mode. Removes decision paralysis.**

---

## Technical Benefits

1. **One Search Engine:** Image and text use same vector space
2. **No Taxonomy Maintenance:** Don't need to tag artists by style
3. **Scalable:** Adding text search doesn't add infrastructure
4. **Future-Proof:** Easy to add hybrid search later
5. **Cost-Efficient:** Same CLIP model, same pgvector index

---

## Implementation Priority

**MVP (Must Have):**
- ✅ Image upload search
- ✅ Text search (CLIP text encoder)
- ✅ City filter

**Nice to Have (MVP):**
- Visual style picker (if time permits)
- Example search prompts
- Search history

**Post-MVP:**
- Hybrid search (image + text modifiers)
- Multi-image search (upload 2-3 references)
- Saved searches (requires auth)
- "More like this" on artist profiles

---

## Key Takeaway

**The unlock:** CLIP's multimodal architecture lets us accept user input in ANY form (image, text, or both) and search the SAME vector space. This means we can build the most user-friendly tattoo search without needing complex NLP, style tagging systems, or separate search engines.

**Users speak their language. We translate. They find their artist.**
