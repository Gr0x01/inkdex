# Inkdex - Implementation Plan

**Last Updated:** 2025-12-31
**Status:** Planning Phase
**Project Name:** Inkdex

---

## Project Overview

**Vision:** Inkdex is an AI-powered tattoo artist discovery platform where users search in *their language* (images, vibes, plain descriptions) and we translate that into finding the right artist.

**Core Problem We're Solving:**
Users DON'T know:
- Style taxonomy ("neo-traditional" vs "new school" vs "illustrative")
- That "blackwork" and "black and grey" are different
- What to even search for

Users DO have:
- Screenshots from Pinterest/Instagram
- Photos they saved
- Vague vibes: "kind of floral but dark and sketchy"

**Our Solution:** Let users speak user language, not artist language.

**MVP Scope:**
- **Primary:** Image upload search (reference image → visually similar artists)
- **Secondary:** Natural language search ("dark floral sketchy" → relevant artists)
- **Optional:** Visual style picker (click vibe images instead of dropdowns)
- 2 metro areas (Austin + Los Angeles, 200-300 artists per city)
- Artist profile pages with Instagram portfolio integration
- City browse pages
- No authentication (fully public) **for MVP**
- SEO-optimized for artist and city pages

**Post-MVP Critical Features** (Architecture must support):
- Hybrid search (image + text modifiers: "like this but more colorful")
- User authentication (login, saved artists)
- Artist claiming pages (Instagram OAuth verification)
- Bookmarking/favoriting artists
- Artist dashboard for claimed profiles

---

## Search Philosophy: User Language, Not Artist Language

**📖 Detailed Strategy:** See [`search-ux-strategy.md`](./search-ux-strategy.md) for complete UX rationale, user journeys, and implementation details.

**The Unlock:** Everyone else asks users to speak artist language. We let users speak user language.

### How We Handle Categorization (Hybrid Approach)

**For Search:** No manual tags, pure CLIP embeddings
- Upload image or describe vibe → find similar work
- Artists can't game it by checking all boxes
- Visual similarity > label matching

**For SEO:** Auto-generated style pages from embeddings
- Example: `/austin/fine-line-tattoo`, `/los-angeles/geometric-tattoo`
- Each page = pre-computed CLIP search for that style
- No manual artist tagging required
- Updated automatically as we add artists

**How it works:**
1. Create "seed images" for common styles (fine line, traditional, geometric, etc.)
2. Generate CLIP embeddings for seed images
3. SEO page = run that embedding as a search query
4. Artists appear based on portfolio similarity, not manual tags
5. Pages rank for "fine line tattoo [city]" searches

### Search Modes (All Use Same CLIP Vector Space)

**1. Image Upload (Primary)**
- "Upload your inspo" → we figure out the rest
- No taxonomy, no dropdowns, just visual matching
- Supports: screenshots, saved photos, Pinterest pins, Instagram posts
- CLIP image encoder → 768-dim vector → similarity search

**2. Natural Language Search (Secondary)**
- "dark floral sketchy" → we interpret that into visual concepts
- "geometric but organic" → returns visually similar artists
- **Key:** CLIP is multimodal! Text and images share the same embedding space
- CLIP text encoder → 768-dim vector → same similarity search as images

**3. Visual Style Picker (Optional Onboarding)**
- Instead of "Old School (traditional)" dropdown
- Show grid of example tattoo images: "Which vibe matches what you want?"
- User clicks 2-3 images → combine their embeddings → seed the search
- No jargon, just vibes

**4. Hybrid Search (Post-MVP)**
- Image + text modifiers: "like this but more colorful"
- "this style but smaller and on my wrist"
- Combine image embedding + text modifiers for refined results

### UX Copy Principles
- ❌ "Select a style: Neo-traditional, New School, Illustrative..."
- ✅ "Show us what vibe you're going for"
- ❌ "Filter by technique"
- ✅ "Upload a photo of something you like"
- ❌ "Artist specialties"
- ✅ "Artists whose work looks like this"

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v3
- **State Management:** URL-based + React Server Components (future: Zustand for user state)
- **Deployment:** Vercel

### Backend & Data
- **Database:** Supabase (PostgreSQL + pgvector)
- **Vector Search:** pgvector with **IVFFlat indexing** (better for 10k+ vectors, good recall/speed tradeoff)
- **Image Embeddings:** OpenCLIP ViT-L-14 (768 dimensions) via Modal.com serverless GPU
  - **Key:** CLIP is multimodal - same model encodes both images AND text into same vector space
  - Text search uses same similarity search as images
- **Image Storage:** Cloudflare R2 + CDN
- **Authentication (Future):** Supabase Auth with Instagram OAuth provider
- **APIs:** DataForSEO (city selection), Google Places (artist discovery), Apify (Instagram scraping)

### Architecture Pattern
- Server Components for data fetching
- API Routes for search/upload (handles both image AND text queries)
- Static generation for artist/city pages (ISR)
- URL-based state (MVP), with future auth context
- CLIP embeddings for both image and text search (unified vector space)

---

## Future-Proof Architecture Considerations

### 1. User Authentication & Saved Artists (Post-MVP)

**Database Schema Extensions:**
```sql
-- Users table (for future auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  instagram_id TEXT UNIQUE,  -- For Instagram OAuth
  instagram_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved artists (bookmarks)
CREATE TABLE saved_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

CREATE INDEX idx_saved_artists_user ON saved_artists(user_id);
CREATE INDEX idx_saved_artists_artist ON saved_artists(artist_id);
```

**Implementation Notes:**
- Supabase Auth supports Instagram OAuth provider
- Use Row Level Security (RLS) for `saved_artists` table
- Client-side: Add auth context provider wrapping app
- UI: Login modal, saved artists page (`/saved`)

### 2. Artist Claiming & Verification

**Database Schema Extensions:**
```sql
-- Add to artists table
ALTER TABLE artists
ADD COLUMN claimed_by_user_id UUID REFERENCES users(id),
ADD COLUMN claimed_at TIMESTAMPTZ,
ADD COLUMN verification_status TEXT DEFAULT 'unclaimed', -- 'unclaimed', 'pending', 'verified'
ADD COLUMN verification_token TEXT,
ADD COLUMN bio_override TEXT,  -- Claimed artists can customize bio
ADD COLUMN contact_email TEXT,
ADD COLUMN booking_url TEXT;

CREATE INDEX idx_artists_claimed_by ON artists(claimed_by_user_id);
```

**Verification Flow:**
1. Artist logs in with Instagram OAuth
2. System matches their `instagram_id` to existing `artists.instagram_handle`
3. Artist claims profile → status = 'pending'
4. Verification: Instagram DM or post confirmation
5. After verification → status = 'verified', unlock dashboard

**Implementation Notes:**
- Use Supabase Auth's Instagram provider
- Match `auth.users.user_metadata.provider_id` (Instagram user ID) to `artists.instagram_handle`
- Send verification DM via Instagram API (or manual verification initially)
- Artist dashboard: edit bio, add booking link, manage portfolio highlights

### 3. Instagram OAuth Integration

**Setup Requirements:**
- Instagram Basic Display API (read profile, media)
- Instagram Graph API (for verification DMs - optional)
- Supabase Auth Instagram provider configuration

**OAuth Flow:**
```typescript
// lib/auth/instagram-oauth.ts
import { createClient } from '@supabase/supabase-js';

export async function signInWithInstagram() {
  const supabase = createClient(/* ... */);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'instagram',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'user_profile,user_media', // Instagram Basic Display scopes
    },
  });

  return { data, error };
}

// After OAuth callback, match to artist profile
export async function linkArtistProfile(userId: string, instagramId: string) {
  // Find artist by Instagram ID
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('instagram_handle', instagramId)
    .single();

  if (artist) {
    // Claim the profile
    await supabase
      .from('artists')
      .update({
        claimed_by_user_id: userId,
        verification_status: 'pending',
        claimed_at: new Date(),
      })
      .eq('id', artist.id);
  }
}
```

**Future Dashboard Routes:**
- `/dashboard` - Artist dashboard (authenticated)
- `/dashboard/profile` - Edit profile info
- `/dashboard/portfolio` - Manage portfolio highlights
- `/dashboard/analytics` - View profile views, clicks (future)

---

## Database Schema (Updated for Future-Proofing)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (for future auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  instagram_id TEXT UNIQUE,
  instagram_username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artists table
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  instagram_handle TEXT UNIQUE NOT NULL,
  instagram_id TEXT,  -- Instagram user ID for OAuth matching
  shop_name TEXT,
  city TEXT NOT NULL,
  state TEXT,
  profile_image_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  bio TEXT,
  google_place_id TEXT,

  -- Discovery metadata
  discovery_source TEXT,
  verification_status TEXT DEFAULT 'unclaimed',  -- 'unclaimed', 'pending', 'verified'
  instagram_private BOOLEAN DEFAULT false,
  follower_count INTEGER,

  -- Artist claiming (future)
  claimed_by_user_id UUID REFERENCES users(id),
  claimed_at TIMESTAMPTZ,
  verification_token TEXT,
  bio_override TEXT,  -- Claimed artists can customize
  contact_email TEXT,
  booking_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ
);

-- Portfolio images
CREATE TABLE portfolio_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  instagram_post_id TEXT UNIQUE NOT NULL,
  instagram_url TEXT NOT NULL,
  r2_original_path TEXT,
  r2_thumbnail_small TEXT,
  r2_thumbnail_medium TEXT,
  r2_thumbnail_large TEXT,
  post_caption TEXT,
  post_timestamp TIMESTAMPTZ,
  likes_count INTEGER,
  embedding vector(768),
  status TEXT DEFAULT 'active',  -- 'active', 'hidden', 'deleted'
  featured BOOLEAN DEFAULT false,  -- For claimed artists to highlight work
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Searches (temporary storage for search sessions)
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding vector(768),
  query_type TEXT NOT NULL,  -- 'image', 'text', 'hybrid'
  query_text TEXT,  -- For text searches, store the original query
  image_url TEXT,  -- For image searches, store the uploaded image URL (if applicable)
  user_id UUID REFERENCES users(id),  -- NULL for anonymous, track for logged in
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_searches_query_type ON searches(query_type);
CREATE INDEX idx_searches_created_at ON searches(created_at DESC);

-- Saved artists (future - bookmarks)
CREATE TABLE saved_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

-- Scraping jobs
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id),
  status TEXT DEFAULT 'pending',
  images_scraped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Style seeds (for SEO landing pages)
CREATE TABLE style_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_name TEXT UNIQUE NOT NULL,  -- 'fine-line', 'traditional', 'geometric'
  display_name TEXT NOT NULL,  -- 'Fine Line', 'Traditional', 'Geometric'
  seed_image_url TEXT NOT NULL,  -- Example image representing this style
  embedding vector(768) NOT NULL,  -- CLIP embedding of seed image
  description TEXT,  -- For SEO meta description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_style_seeds_name ON style_seeds(style_name);

-- Indexes
CREATE INDEX idx_artists_city ON artists(city);
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_instagram_id ON artists(instagram_id);
CREATE INDEX idx_artists_claimed_by ON artists(claimed_by_user_id);
CREATE INDEX idx_portfolio_artist ON portfolio_images(artist_id);
CREATE INDEX idx_portfolio_status ON portfolio_images(status);
CREATE INDEX idx_portfolio_featured ON portfolio_images(featured) WHERE featured = true;
CREATE INDEX idx_saved_artists_user ON saved_artists(user_id);
CREATE INDEX idx_saved_artists_artist ON saved_artists(artist_id);

-- Vector index (IVFFlat - better for larger datasets)
-- Use IVFFlat instead of HNSW for better performance with 10k+ vectors
CREATE INDEX idx_portfolio_embeddings ON portfolio_images
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
-- Note: lists = sqrt(total_rows) is a good heuristic
-- For 10k images: lists = 100, for 100k: lists = 316

-- Vector search function
CREATE OR REPLACE FUNCTION search_artists_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  offset int DEFAULT 0
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
  profile_image_url text,
  instagram_url text,
  is_verified boolean,
  matching_images jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id,
      pi.r2_thumbnail_medium as image_url,
      pi.instagram_url,
      1 - (pi.embedding <=> query_embedding) as similarity,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY (pi.embedding <=> query_embedding)
      ) as rank
    FROM portfolio_images pi
    WHERE
      pi.status = 'active'
      AND 1 - (pi.embedding <=> query_embedding) > match_threshold
  ),
  artist_matches AS (
    SELECT
      ri.artist_id,
      jsonb_agg(
        jsonb_build_object(
          'url', ri.image_url,
          'instagramUrl', ri.instagram_url,
          'similarity', ri.similarity
        )
        ORDER BY ri.similarity DESC
      ) FILTER (WHERE ri.rank <= 4) as images,
      MAX(ri.similarity) as max_similarity
    FROM ranked_images ri
    GROUP BY ri.artist_id
  )
  SELECT
    a.id,
    a.name,
    a.slug,
    a.city,
    a.profile_image_url,
    a.instagram_url,
    (a.verification_status = 'verified') as is_verified,
    am.images,
    am.max_similarity
  FROM artist_matches am
  JOIN artists a ON a.id = am.artist_id
  WHERE
    (city_filter IS NULL OR a.city = city_filter)
  ORDER BY am.max_similarity DESC
  LIMIT match_count
  OFFSET offset;
END;
$$;

-- Row Level Security (RLS) for future auth
ALTER TABLE saved_artists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own saved artists
CREATE POLICY "Users can view own saved artists"
  ON saved_artists FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own saved artists
CREATE POLICY "Users can save artists"
  ON saved_artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own saved artists
CREATE POLICY "Users can unsave artists"
  ON saved_artists FOR DELETE
  USING (auth.uid() = user_id);
```

**Why IVFFlat vs HNSW:**
- **IVFFlat:** Better for 10k-1M vectors, faster build time, good recall with proper tuning
- **HNSW:** Better for <10k vectors or when recall is critical (slower build, more memory)
- For this project: Start with ~10k-20k images, scale to 100k+ → IVFFlat is optimal
- Tuning: `lists = 100` for 10k images, increase to `lists = 316` for 100k images

---

## Implementation Phases

### Phase 0: Market Analysis (Week 1)
**Goal:** Select optimal 2-3 cities to launch

**Tasks:**
1. Create DataForSEO integration script
2. Analyze search volume + competition for 6 candidate cities (LA, NYC, Austin, Miami, Portland, Chicago)
3. Scoring formula: `(searchVolume / competition) * 0.4 + totalVolume * 0.3 + trendingScore * 0.2`
4. Select top 2 cities based on composite score + Instagram artist density

**Deliverable:** City selection report → Update memory bank with chosen cities

**Critical Files:**
- `/scripts/city-analysis/analyze-markets.ts`
- `/memory-bank/development/activeContext.md` (update with city selections)

---

### Phase 1: Database & Infrastructure Setup (Week 1-2)

**Goal:** Core data infrastructure ready for ingestion

**Tasks:**

1. **Database Schema**
   - Enable pgvector extension in Supabase
   - Create all tables (including future auth tables)
   - Create IVFFlat index on embeddings
   - Create vector search function
   - Set up RLS policies for future auth

2. **Cloudflare R2 Setup**
   - Create bucket: `tattoo-portfolio`
   - Structure: `original/{artist_id}/{post_id}.jpg`, `thumbnails/{size}/{artist_id}/{post_id}_${width}w.webp`
   - Configure CORS for web access
   - Set up custom domain for CDN

3. **Next.js Project Init**
   - `npx create-next-app@latest --typescript --tailwind --app`
   - Install dependencies: `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `@aws-sdk/client-s3`, `sharp`, `cheerio`, `puppeteer`, `axios`, `zod`
   - Configure path aliases (`@/components`, `@/lib`, `@/app`, `@/types`)
   - Set up environment variables
   - **Important:** Configure Supabase Auth with Instagram provider (even if not used in MVP)

**Critical Files:**
- `/supabase/migrations/001_initial_schema.sql`
- `/supabase/migrations/002_auth_extensions.sql` (future auth setup)
- `/lib/supabase/client.ts` (browser client)
- `/lib/supabase/server.ts` (server client)
- `/lib/auth/instagram-oauth.ts` (stub for future)
- `/next.config.js`
- `/tailwind.config.ts`

**Architecture Note:**
Even though MVP doesn't use auth, set up Supabase Auth configuration now so it's ready for post-MVP features. This includes:
- Instagram OAuth app configuration
- Auth callback routes
- Auth context provider (can be unused initially)

---

### Phase 2: Data Pipeline - Artist Discovery (Week 2-3)

**Goal:** Collect 200-300 verified artists per city

**Tasks:**

1. **Google Maps Discovery**
   - Script: `/scripts/discovery/google-maps-discovery.ts`
   - Query Google Places API for "tattoo shop" in each city
   - Extract: name, address, website, phone, place_id, rating
   - Store in `artists` table with `discovery_source = 'google_maps'`
   - **Important:** Also extract Instagram IDs if possible for future matching
   - Budget: ~$5-10 per city

2. **Website Scraping for Artists**
   - Script: `/scripts/discovery/website-scraper.ts`
   - Scrape shop websites for artist rosters (Cheerio + Puppeteer)
   - Look for `/artists`, `/team`, `/about` pages
   - Extract: artist names, Instagram handles, Instagram user IDs
   - Success rate: ~40-60% of shops

3. **Instagram Handle Validation**
   - Verify Instagram handles exist and are public
   - Extract profile image, follower count, bio
   - **Important:** Extract Instagram user ID for future OAuth matching
   - Mark private accounts: `instagram_private = true`

4. **Manual Curation Dashboard** (Simple Next.js admin page)
   - Review/approve/reject discovered artists
   - Add missing prominent artists manually
   - Goal: 200-300 verified artists per city

**Critical Files:**
- `/scripts/discovery/google-maps-discovery.ts`
- `/scripts/discovery/website-scraper.ts`
- `/scripts/discovery/instagram-validator.ts` (extract user IDs)
- `/app/admin/artists/page.tsx` (simple review UI)

**Future-Proofing Note:**
Ensure `artists.instagram_id` is populated during discovery. This will enable automatic profile claiming when artists log in with Instagram OAuth.

---

### Phase 3: Data Pipeline - Instagram Scraping (Week 3-4)

**Goal:** Collect ~12 portfolio images per artist (Instagram public API limit)

**Tasks:**

1. **Apify Instagram Scraper Integration**
   - Script: `/scripts/scraping/instagram-scraper.ts`
   - Use Apify's managed Instagram scraper (legal, managed IPs)
   - Batch processing: 10 artists per hour to respect rate limits
   - Extract: post images, captions, likes, timestamps
   - Cost: ~$20-40 per city for 200 artists

2. **Image Download & Processing**
   - Script: `/scripts/images/process-and-upload.ts`
   - Download images from Instagram CDN
   - Generate 3 thumbnail sizes (320w, 640w, 1280w) using Sharp
   - Convert to WebP format (85% quality)
   - Upload to Cloudflare R2 (original + 3 thumbnails)
   - Store paths in `portfolio_images` table

3. **Error Handling & Resumability**
   - Track scraping progress in `scraping_jobs` table
   - Handle deleted posts, private accounts gracefully
   - Implement exponential backoff for rate limits
   - Checkpoint system to resume from failures

**Critical Files:**
- `/scripts/scraping/instagram-scraper.ts`
- `/scripts/images/process-and-upload.ts`
- `/lib/utils/image.ts` (Sharp processing utilities)

---

### Phase 4: Data Pipeline - Embedding Generation (Week 4-5)

**Goal:** Generate CLIP embeddings for all portfolio images

**Tasks:**

1. **Modal.com Serverless GPU Setup**
   - Script: `/scripts/embeddings/generate_embeddings.py`
   - Use OpenCLIP ViT-L-14 model (768 dimensions)
   - Serverless A10G GPU (~$1.10/hour, pay-per-second)
   - Batch processing: 100 images per batch
   - Processing time: ~15 minutes per city (6,000 images)
   - Cost: ~$0.30 per city

2. **Batch Processing Implementation**
   - Fetch unprocessed images from Supabase
   - Download image, generate embedding
   - Update `portfolio_images.embedding` column
   - Track progress and errors

3. **Vector Index Optimization**
   - Create IVFFlat index with `lists = 100` (for ~10k images)
   - Test similarity search performance (<500ms target)
   - Tune index parameters for recall vs speed
   - **Note:** As data grows to 100k+ images, increase `lists` to ~316

**Critical Files:**
- `/scripts/embeddings/generate_embeddings.py` (Modal Python function)
- `/scripts/embeddings/batch-process.ts` (Node.js orchestration)

**Index Tuning:**
```sql
-- For 10k images (MVP)
CREATE INDEX idx_portfolio_embeddings ON portfolio_images
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- For 100k images (scaled)
-- DROP INDEX idx_portfolio_embeddings;
-- CREATE INDEX idx_portfolio_embeddings ON portfolio_images
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 316);
```

---

### Phase 5: Application - Core Search Flow (Week 5-6)

**Goal:** Image upload → CLIP embedding → vector search → results

**Tasks:**

1. **Landing Page with Multi-Modal Search**
   - `app/page.tsx`: Hero section with search component
   - `components/search/SearchInput.tsx`:
     - **Tab 1:** Image upload (drag-drop, file, URL) - Primary
     - **Tab 2:** Text search ("dark floral sketchy") - Secondary
     - **Tab 3:** Visual style picker (grid of example images) - Optional
   - Copy: "Show us what vibe you're going for"
   - Image preview before search
   - Client-side validation (format, size <10MB)

2. **Search API Endpoint (Handles Both Image & Text)**
   - `app/api/search/route.ts`: POST endpoint
   - **Accept:**
     - Image upload (File or URL) OR
     - Text query (string) OR
     - Both (hybrid search - future)
   - **Processing:**
     - If image: Generate CLIP image embedding
     - If text: Generate CLIP text embedding (same 768-dim space!)
     - If both: Combine embeddings (weighted average)
   - Generate embedding via Modal.com (OpenCLIP ViT-L-14)
   - Store in `searches` table with `query_type` ('image', 'text', 'hybrid')
   - Return `searchId`

3. **Search Results Page**
   - `app/search/page.tsx`: Display results from searchId
   - `components/search/SearchResults.tsx`: Artist cards grid
   - `components/search/CityFilter.tsx`: Filter by city dropdown
   - Show top 3-4 matching portfolio images per artist
   - Display query type indicator ("Searched with image" vs "Searched for: dark floral")
   - Pagination (20 results per page)
   - **Future:** "Save Artist" button (hidden for MVP, ready for post-MVP)

4. **Vector Search Query**
   - `lib/supabase/queries.ts`: `searchArtistsByEmbedding()`
   - Call `search_artists_by_embedding()` RPC function
   - Apply city filter
   - Return ranked results with similarity scores + verification badge

**Critical Files:**
- `app/page.tsx`
- `components/search/ImageUpload.tsx`
- `app/api/search/route.ts`
- `app/search/page.tsx`
- `components/search/SearchResults.tsx`
- `lib/supabase/queries.ts`

**Future-Proofing:**
- Add `user_id` column to `searches` table (optional for MVP)
- Include verification badge in artist cards (shows if `verification_status = 'verified'`)
- Stub "Save Artist" button (hidden for MVP, ready to enable post-MVP)

---

### Phase 6: Application - Browse & Profile Pages (Week 6-7)

**Goal:** City browse pages + artist profile pages (SEO-optimized)

**Tasks:**

1. **City Browse Pages**
   - `app/[city]/page.tsx`: Dynamic city pages
   - `generateStaticParams()` for each supported city
   - Artist grid for all artists in city
   - SEO metadata: title, description, OG images
   - Internal linking to artist profiles
   - Show verification badges for claimed artists

2. **Style Landing Pages (SEO-Critical)**
   - `app/[city]/[style]/page.tsx`: Dynamic style pages
   - `generateStaticParams()` for each city × style combination
   - Fetch style seed embedding from `style_seeds` table
   - Run vector search using seed embedding (same as user image search)
   - Display artists whose portfolio is similar to style seed
   - SEO metadata targeting "[style] tattoo [city]" keywords
   - Breadcrumbs: Home > City > Style
   - Hero: Show the seed image as example
   - Internal links to other styles in same city

3. **Artist Profile Pages**
   - `app/artist/[slug]/page.tsx`: Dynamic artist pages
   - `generateStaticParams()` for all artists
   - Artist header: name, location, shop, Instagram link
   - **Show verification badge** if `verification_status = 'verified'`
   - **Show custom bio** if `bio_override` exists (from claimed profile)
   - **Show booking link** if `booking_url` exists (from claimed profile)
   - Portfolio grid: images link to Instagram posts
   - SEO metadata + JSON-LD structured data (Person, LocalBusiness)
   - Related artists section (same city)
   - **Future:** "Claim This Profile" button (hidden for MVP)

4. **Slug Generation**
   - `lib/utils/url.ts`: `generateArtistSlug(name, id)`
   - Format: `mike-rubendall-{short-uuid}`
   - Ensures uniqueness + readability

**Critical Files:**
- `app/[city]/page.tsx`
- `app/artist/[slug]/page.tsx`
- `components/artist/ArtistProfile.tsx`
- `components/artist/PortfolioGrid.tsx`
- `components/artist/VerificationBadge.tsx` (shows if verified)
- `lib/utils/url.ts`
- `lib/constants/cities.ts`

**Future-Proofing:**
- Artist profile page should render differently for claimed vs unclaimed artists
- Claimed artists get: custom bio, booking link, verification badge
- Stub "Claim This Profile" button (hidden for MVP, shows only if `verification_status = 'unclaimed'`)

---

### Phase 7: SEO & Performance Optimization (Week 7-8)

**Goal:** Lighthouse 90+ scores, Google indexing, sub-2s page loads

**Tasks:**

1. **SEO Implementation**
   - Dynamic metadata for all pages (title, description, OG images)
   - `app/sitemap.ts`: Dynamic sitemap generation
   - `app/robots.ts`: robots.txt configuration
   - JSON-LD structured data for artist pages
   - Internal linking strategy (cities ↔ artists ↔ style pages)
   - Verification badges in meta descriptions for claimed artists

   **Style Landing Pages (SEO-Critical):**
   - Create seed images for 8-10 common styles (fine line, traditional, geometric, realism, etc.)
   - Generate CLIP embeddings for each seed image
   - Store in `style_seeds` table
   - Build dynamic routes: `app/[city]/[style]/page.tsx`
   - Each page runs pre-computed search using style embedding
   - Target keywords: "[style] tattoo [city]" (e.g., "fine line tattoo austin")
   - Include example images, artist grid, breadcrumbs
   - Auto-update as we add artists (ISR revalidation)

2. **Image Optimization**
   - Next.js Image component for all images
   - WebP format with JPEG fallback
   - Lazy loading (first 6-8 images eager, rest lazy)
   - Blur placeholders
   - Responsive sizes attribute

3. **Performance Optimization**
   - ISR with 24h revalidation for artist pages
   - Code splitting for heavy components
   - Bundle size analysis (<200KB first load)
   - Edge caching via Vercel
   - Database query optimization (connection pooling)
   - Tune IVFFlat index parameters for optimal query speed

4. **Analytics Setup**
   - Google Analytics 4 integration
   - Track: image uploads, searches, artist clicks, Instagram link clicks
   - **Future:** Track save/unsave events (when auth is live)
   - Implement `trackEvent()` utility

**Critical Files:**
- `app/layout.tsx` (root metadata + analytics)
- `app/sitemap.ts`
- `app/robots.ts`
- `lib/analytics.ts`
- `app/[city]/[style]/page.tsx` (SEO landing pages)
- `scripts/seed-styles.ts` (populate style_seeds table)

**SEO Landing Page Structure:**
```
URL: /austin/fine-line-tattoo
Title: Fine Line Tattoo Artists in Austin, TX | [Brand]
H1: Fine Line Tattoo Artists in Austin
Meta: Discover Austin's best fine line tattoo artists. Browse portfolios and find artists whose work matches your style.

Content:
- Breadcrumbs: Home > Austin > Fine Line
- Hero: Example fine line tattoo image (the seed)
- Artist Grid: Artists whose work is similar to seed image
- Internal links: Other styles in Austin
- FAQ: "What is fine line tattoo?" (optional)
```

**Target Keywords by Page Type:**
```
City pages: "tattoo artist [city]", "tattoo [city]"
Style pages: "[style] tattoo [city]", "[style] tattoo artist [city]"
Artist pages: "[artist name] tattoo", "[artist name] [city]"
```

**Initial Style Seeds (8-10 to start):**
1. Fine Line - delicate, single-needle work
2. Traditional - bold lines, classic imagery
3. Geometric - shapes, patterns, sacred geometry
4. Realism - photorealistic portraits/imagery
5. Black & Grey - no color, shading focus
6. Japanese - irezumi, traditional Japanese
7. Watercolor - paint-like, soft edges
8. Minimalist - simple, small, clean designs
9. Blackwork - solid black, bold coverage
10. Dotwork - stippling, dot shading

**SEO Page Count (MVP):**
```
2 cities × 10 styles = 20 style landing pages
2 cities = 2 city pages
400-600 artists = 400-600 artist pages
Total: ~425-625 indexed pages for MVP
```

**Internal Linking Structure:**
```
Homepage
├── Austin (/austin)
│   ├── Fine Line (/austin/fine-line-tattoo)
│   │   └── Artist profiles (linked from grid)
│   ├── Traditional (/austin/traditional-tattoo)
│   └── ... (8 more styles)
└── Los Angeles (/los-angeles)
    ├── Fine Line (/los-angeles/fine-line-tattoo)
    └── ... (10 styles)
```

**SEO Advantage:**
- Competitors tag artists manually (10+ tags each, every artist everywhere)
- We generate style pages from embeddings (artists appear based on actual visual similarity)
- Result: More relevant results = better engagement = better rankings

---

### Phase 8: Testing & Launch (Week 8)

**Goal:** Production-ready deployment with monitoring

**Tasks:**

1. **Testing**
   - Manual testing of all user flows
   - Mobile responsive testing
   - Cross-browser testing (Chrome, Safari, Firefox)
   - Performance testing (Lighthouse audits)
   - SEO validation (Google Search Console)
   - Test Instagram OAuth flow (even if hidden for MVP)

2. **Deployment**
   - Deploy to Vercel (production environment)
   - Configure custom domain
   - Set up production environment variables
   - **Configure Instagram OAuth** in Supabase dashboard (ready for post-MVP)
   - Enable Vercel Analytics
   - Configure CDN caching headers

3. **Launch Checklist**
   - Submit sitemap to Google Search Console
   - Set up error monitoring (Sentry)
   - Monitor database performance
   - Track initial user behavior
   - Gather feedback

4. **Documentation Updates**
   - Update memory bank with final architecture
   - Document API endpoints
   - Update progress.md with launch milestone
   - Document Instagram OAuth setup for post-MVP

**Critical Files:**
- `vercel.json` (deployment config)
- `memory-bank/architecture/techStack.md` (update with final stack)
- `memory-bank/development/progress.md` (document launch)
- `memory-bank/projects/post-mvp-roadmap.md` (create for next steps)

---

## Post-MVP Implementation Roadmap

### Phase 9: User Authentication & Saved Artists (Week 9-10)

**Goal:** Users can create accounts and save favorite artists

**Tasks:**

1. **Enable Supabase Auth**
   - Activate Instagram OAuth provider in Supabase dashboard
   - Configure redirect URLs
   - Set up auth callback route: `app/auth/callback/route.ts`

2. **Auth UI Components**
   - Login modal: `components/auth/LoginModal.tsx`
   - User menu dropdown: `components/auth/UserMenu.tsx`
   - Auth context provider: `lib/auth/AuthProvider.tsx`

3. **Saved Artists Feature**
   - "Save Artist" button on artist cards and profile pages
   - Saved artists page: `app/saved/page.tsx`
   - API endpoints: `app/api/saved-artists/route.ts`
   - Use RLS policies already defined in schema

4. **User Experience**
   - Persist searches for logged-in users
   - Show login prompt when trying to save (if not logged in)
   - "Your Saved Artists" page with grid view

**Critical Files:**
- `app/auth/callback/route.ts`
- `components/auth/LoginModal.tsx`
- `lib/auth/AuthProvider.tsx`
- `app/saved/page.tsx`
- `components/artist/SaveButton.tsx`

---

### Phase 10: Artist Claiming & Verification (Week 11-12)

**Goal:** Artists can claim their profiles via Instagram OAuth

**Tasks:**

1. **Claim Flow**
   - "Claim This Profile" button on unclaimed artist pages
   - Login with Instagram OAuth
   - Automatic matching via `instagram_id`
   - Set `verification_status = 'pending'`
   - Send verification notification (email or DM)

2. **Verification System**
   - Admin verification dashboard: `app/admin/verifications/page.tsx`
   - Verify Instagram account ownership (DM or post confirmation)
   - Manual approval → set `verification_status = 'verified'`

3. **Artist Dashboard**
   - Dashboard route: `app/dashboard/page.tsx`
   - Edit profile: customize bio, add booking link, contact email
   - Manage portfolio: mark images as featured
   - View analytics: profile views, clicks (future)

4. **UI Updates**
   - Show verification badge on claimed profiles
   - Use custom bio/booking link if provided
   - "Edit Profile" button for claimed artists (when logged in)

**Critical Files:**
- `components/artist/ClaimProfileButton.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/profile/page.tsx`
- `app/admin/verifications/page.tsx`
- `lib/auth/claim-profile.ts`

---

## Next.js Project Structure (Complete)

```
/tattoo
├── app/
│   ├── layout.tsx                    # Root layout (metadata, analytics, auth provider)
│   ├── page.tsx                      # Landing page with image search
│   ├── search/page.tsx               # Search results page
│   ├── saved/page.tsx                # Saved artists (post-MVP auth)
│   ├── [city]/
│   │   ├── page.tsx                  # City browse pages (/austin)
│   │   └── [style]/page.tsx          # Style landing pages (/austin/fine-line-tattoo)
│   ├── artist/[slug]/page.tsx        # Artist profile pages
│   ├── dashboard/                    # Artist dashboard (post-MVP)
│   │   ├── page.tsx
│   │   ├── profile/page.tsx
│   │   └── portfolio/page.tsx
│   ├── admin/                        # Admin pages
│   │   ├── artists/page.tsx          # Artist curation
│   │   └── verifications/page.tsx    # Artist verification
│   ├── auth/
│   │   └── callback/route.ts         # OAuth callback
│   ├── api/
│   │   ├── search/route.ts           # POST /api/search (image upload)
│   │   ├── saved-artists/route.ts    # GET/POST/DELETE saved artists
│   │   └── claim-profile/route.ts    # POST /api/claim-profile
│   ├── sitemap.ts                    # Dynamic sitemap
│   └── robots.ts                     # robots.txt
│
├── components/
│   ├── search/
│   │   ├── ImageUpload.tsx
│   │   ├── SearchResults.tsx
│   │   └── CityFilter.tsx
│   ├── artist/
│   │   ├── ArtistCard.tsx
│   │   ├── ArtistProfile.tsx
│   │   ├── PortfolioGrid.tsx
│   │   ├── VerificationBadge.tsx
│   │   ├── SaveButton.tsx            # Save/unsave artist
│   │   └── ClaimProfileButton.tsx    # Claim profile
│   ├── auth/
│   │   ├── LoginModal.tsx
│   │   └── UserMenu.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── queries.ts                # Database queries
│   ├── auth/
│   │   ├── AuthProvider.tsx          # Auth context provider
│   │   ├── instagram-oauth.ts        # Instagram OAuth helpers
│   │   └── claim-profile.ts          # Profile claiming logic
│   ├── openai/
│   │   └── embeddings.ts             # CLIP embedding generation
│   ├── utils/
│   │   ├── image.ts                  # Image processing
│   │   ├── url.ts                    # Slug generation
│   │   └── seo.ts                    # SEO helpers
│   └── constants/
│       └── cities.ts                 # Supported cities config
│
├── scripts/
│   ├── city-analysis/
│   │   └── analyze-markets.ts        # DataForSEO city selection
│   ├── discovery/
│   │   ├── google-maps-discovery.ts
│   │   ├── website-scraper.ts
│   │   └── instagram-validator.ts    # Extract Instagram user IDs
│   ├── scraping/
│   │   └── instagram-scraper.ts      # Apify integration
│   ├── images/
│   │   └── process-and-upload.ts     # Sharp + R2 upload
│   ├── embeddings/
│   │   └── generate_embeddings.py    # Modal.com GPU function
│   └── seo/
│       └── seed-styles.ts            # Populate style_seeds table with example images
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_auth_extensions.sql   # Auth tables and RLS
│
├── types/
│   ├── artist.ts
│   ├── search.ts
│   ├── user.ts
│   └── database.ts                   # Supabase generated types
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Key User Flows

### 1. Multi-Modal Search Flow (MVP)

**Option A: Image Search (Primary)**
1. User lands on homepage → sees search component with tabs
2. User selects "Upload Image" tab
3. User uploads reference image (drag-drop / file / URL) → preview shown
4. User adds optional city filter → clicks "Find Artists"
5. Client validates image → POST to `/api/search` with `type: 'image'`
6. Server generates CLIP **image** embedding → stores in `searches` table
7. Returns `searchId` → redirect to `/search?id={searchId}`
8. Server fetches embedding → runs IVFFlat vector similarity search
9. Returns 20 artists ranked by similarity with top 4 matching images each
10. User filters by city, clicks artist card → `/artist/{slug}`

**Option B: Text Search (Secondary)**
1. User lands on homepage → sees search component with tabs
2. User selects "Describe Your Vibe" tab
3. User types: "dark floral sketchy" or "geometric but organic"
4. User adds optional city filter → clicks "Find Artists"
5. Client sends → POST to `/api/search` with `type: 'text', query: 'dark floral sketchy'`
6. Server generates CLIP **text** embedding (same 768-dim space as images!)
7. Returns `searchId` → redirect to `/search?id={searchId}`
8. Same vector similarity search as image search
9. Results show: "Searched for: dark floral sketchy"

**Option C: Visual Style Picker (Optional)**
1. User selects "Pick a Vibe" tab
2. Grid of 9-12 example tattoo images with different vibes
3. User clicks 2-3 images that match what they want
4. Client combines embeddings of selected images (average)
5. Same search flow as Option A

**Option D: Hybrid Search (Post-MVP)**
1. User uploads image AND adds text modifier
2. "like this but more colorful" or "this style but smaller"
3. Server combines image embedding + text embedding (weighted)
4. More refined results

### 2. City Browse Flow (MVP)
1. User clicks city link → `/los-angeles`
2. Static page shows all artists in city (200-300)
3. Artist grid with profile images, names, verification badges
4. User clicks artist → `/artist/{slug}`

### 2a. Style Landing Page Flow (SEO)
1. User arrives from Google search "fine line tattoo austin"
2. Lands on `/austin/fine-line-tattoo`
3. Page loads pre-computed style search:
   - Fetch "fine-line" style seed embedding from database
   - Run vector similarity search using that embedding
   - Display artists whose portfolio matches fine line style
4. User sees grid of Austin artists with fine line work
5. User clicks artist → `/artist/{slug}`
6. **No manual tagging** - artists appear based on portfolio similarity to seed image

### 3. Artist Profile Flow (MVP)
1. User lands on `/artist/mike-rubendall-{uuid}`
2. See artist header (name, city, shop, Instagram link)
3. Verification badge if `verification_status = 'verified'`
4. Custom bio if `bio_override` exists (from claimed profile)
5. Booking link if `booking_url` exists
6. Portfolio grid shows ~12 images (Instagram public API limit)
7. User clicks portfolio image → opens Instagram post (external link)
8. User clicks "Follow on Instagram" → opens Instagram profile

### 4. Save Artist Flow (Post-MVP)
1. User sees "Save Artist" button on artist card/profile
2. If not logged in → show login modal
3. User logs in with Instagram OAuth
4. User clicks "Save Artist" → POST to `/api/saved-artists`
5. Button changes to "Saved" (with unsave option)
6. User navigates to `/saved` → sees grid of saved artists

### 5. Artist Claiming Flow (Post-MVP)
1. Artist visits their profile page (unclaimed)
2. Sees "Claim This Profile" button
3. Clicks button → Instagram OAuth login
4. System matches `instagram_id` to `artists.instagram_id`
5. Profile claimed → status = 'pending'
6. Admin verifies ownership → status = 'verified'
7. Artist can now edit profile, add booking link, feature images
8. Artist dashboard accessible at `/dashboard`

---

## Success Metrics

### Launch Goals (Month 1)
- **Artists Indexed:** 400-600 (200-300 per city × 2 cities)
- **Portfolio Images:** 8,000-12,000
- **Search Quality:** 70%+ relevant matches (qualitative testing)
- **Performance:** Lighthouse score 90+ (all categories)
- **SEO:** 100+ artist pages indexed in Google
- **Engagement:** 3+ pages per session average
- **Conversion:** 20%+ click-through to Instagram

### Technical Benchmarks
- **Search Latency:** <500ms IVFFlat vector search
- **Page Load:** <2s LCP (Largest Contentful Paint)
- **Image Load:** <1s for thumbnails
- **Uptime:** 99.9%

### Post-MVP Goals (Month 2-3)
- **User Signups:** 1,000+ registered users
- **Saved Artists:** 5,000+ saves (avg 5 per user)
- **Claimed Profiles:** 50+ verified artists
- **Artist Engagement:** 30% of artists claiming profiles within 3 months

---

## Cost Breakdown

### One-Time Costs (Per City)
- DataForSEO city analysis: $1-2
- Google Maps API: $5-10
- Instagram scraping (Apify): $20-40
- Image processing (Modal GPU): $0.30
- **Total per city: ~$30-55**

### Monthly Recurring (2 Cities, 12K Images)
- Supabase (free tier): $0
- Cloudflare R2 (35GB): $0.53
- Re-scraping (monthly): $5-10
- Embedding new images: $0.10
- Vercel (hobby): $0
- **Total: ~$6-11/month**

### Scaling (10 Cities, 60K Images, Post-MVP Auth)
- Supabase Pro: $25/month
- R2 storage (175GB): $2.63/month
- Re-scraping: $50/month
- Vercel Pro: $20/month
- **Total: ~$98/month**

---

## Risk Mitigation

### Technical Risks
- **Vector search slow at scale:** Use IVFFlat indexing (better for 10k+ vectors), city filtering, result caching, tune `lists` parameter as data grows
- **Instagram rate limiting:** Use Apify managed service, slow scraping (1 req/2s), exponential backoff
- **Poor embedding quality:** Use latest CLIP model (ViT-L-14), filter low similarity (<0.7), manual curation
- **Auth integration complexity:** Set up Supabase Auth early (even if unused in MVP), test Instagram OAuth before launch

### Legal/Ethical Risks
- **Instagram TOS:** Only scrape public data, use Apify (managed), implement artist opt-out, allow profile claiming
- **Copyright concerns:** Fair use for search indexing, attribution in DB, opt-out mechanism, artist claiming gives control

### Data Quality Risks
- **Duplicate artists:** Unique constraint on Instagram handle, manual review
- **Non-tattoo images:** Manual curation phase 1, future: CLIP filtering
- **Stale data:** Monthly re-scraping, track `last_scraped_at`
- **Instagram ID matching:** Store Instagram user IDs during discovery for reliable OAuth matching

---

## Critical Implementation Dependencies

### Immediate Setup Required
1. Supabase project creation (if not done)
   - Enable pgvector extension
   - Configure Instagram OAuth provider (for post-MVP)
2. Cloudflare R2 account and bucket
3. DataForSEO API access
4. Google Places API key (already in `.env.local`)
5. Apify account for Instagram scraping
6. Modal.com account for GPU embeddings
7. OpenAI API for CLIP embeddings (or alternative)
8. Instagram Developer App (for OAuth)
   - Create app at developers.facebook.com
   - Configure Basic Display API
   - Add redirect URIs for Supabase Auth

### Domain & Deployment
1. Choose domain name (TBD with user)
2. Vercel account setup
3. Production environment variables
4. Google Search Console setup

---

## Environment Variables (Updated)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# OpenAI (for CLIP embeddings)
OPENAI_API_KEY=sk-xxx

# Google APIs
GOOGLE_PLACES_API_KEY=xxx
GOOGLE_SEARCH_API_KEY=xxx

# DataForSEO
DATAFORSEO_LOGIN=xxx
DATAFORSEO_PASSWORD=xxx

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.yourdomain.com

# Instagram OAuth (for post-MVP)
INSTAGRAM_CLIENT_ID=xxx
INSTAGRAM_CLIENT_SECRET=xxx

# Analytics
NEXT_PUBLIC_GA_ID=G-xxx

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=development
```

---

## Next Steps After Approval

1. **Finalize project name/domain**
2. **Run Phase 0** (City Analysis) to select 2 launch cities
3. **Create Instagram Developer App** (for future OAuth)
4. **Initialize Next.js project** with TypeScript + Tailwind
5. **Create database schema** in Supabase (including future auth tables)
6. **Set up Cloudflare R2** bucket
7. **Configure Supabase Auth** with Instagram provider (even if unused in MVP)
8. **Begin artist discovery pipeline** for selected cities

**Estimated Total Time:** 8 weeks to MVP launch, 4 additional weeks to post-MVP auth/claiming features

**Recommended Launch Cities (DataForSEO Analysis Complete - Dec 29, 2025):**

### Primary Recommendation: **Austin + Los Angeles**

**Austin, TX** - Opportunity Score: 78/100
- 262,100 monthly searches
- 46% avg competition (LOWEST among top cities)
- **12 keywords trending up** (strong growth trajectory)
- ✅ Visual search opportunity identified ("ideas", "inspiration", "portfolio" queries)
- Strong tattoo culture + tech-savvy population
- WHY: Best growth potential, lowest competition, visual search gap

**Los Angeles, CA** - Opportunity Score: 77/100
- **261,920 monthly searches** (2nd highest volume)
- 52% avg competition
- 10 keywords trending up
- ✅ Visual search opportunity identified
- Massive artist density (200-300+ artists available)
- WHY: Largest market, high search intent, strong SEO volume

### Alternative Launch: **Chicago + New York**

**Chicago, IL** - Opportunity Score: 81/100 (HIGHEST SCORE)
- 269,350 monthly searches (highest volume)
- 52% avg competition
- **16 keywords trending up** (best growth)
- WHY: Best overall metrics, midwest presence

**New York, NY** - Opportunity Score: 80/100
- 266,530 monthly searches
- 67% avg competition (highest competition)
- 10 keywords trending up
- WHY: Largest artist market, East Coast anchor

### Market Analysis Insights (All 8 Cities Analyzed)

**Overall Findings:**
- ✅ All 8 cities scored HIGH (74-81/100) - strong market everywhere
- ✅ 254k-269k monthly searches per city (massive demand)
- ✅ 0/100 keyword difficulty across all cities (easy to rank)
- ✅ 9-16 keywords trending up per city (growing markets)

**Competition Landscape:**
- **Main Competitor:** inkzup.com (appears in all 8 cities, position #1)
  - Focus: Booking platform (not discovery/search)
  - Weakness: No visual search, poor artist discovery UX
- Individual shop websites (weak SEO, opportunity for aggregation)
- Pinterest (inspiration but not artist-specific)
- **NO strong visual search platform exists** ← Our opportunity

**Key Opportunity Gap:**
- Visual/inspiration search queries ("tattoo ideas [city]", "tattoo portfolio [city]") have **LOW competition**
- Austin, Miami, Portland, Seattle, Denver all show this gap
- This validates our image-based search approach as a differentiator

**Decision Rationale:**
Choose Austin + LA for:
1. Austin's growth trajectory + lowest competition
2. LA's market size + artist density
3. Geographic diversity (Texas + California)
4. Both have visual search opportunity gaps we can exploit
5. Tech-savvy populations (early adopter potential)

---

## Architecture Validation Checklist

✅ **IVFFlat indexing** for vector search (optimal for 10k-100k+ vectors)
✅ **Database schema includes future auth tables** (users, saved_artists)
✅ **Instagram ID tracking** during artist discovery for OAuth matching
✅ **Artist claiming fields** in artists table (claimed_by_user_id, verification_status, bio_override, booking_url)
✅ **Supabase Auth configured** with Instagram provider from day 1
✅ **RLS policies defined** for future multi-tenant features
✅ **UI components stubbed** for post-MVP features (SaveButton, ClaimProfileButton)
✅ **Verification badge system** in place for claimed artists

This architecture ensures we can ship MVP quickly while having a solid foundation for user auth, saved artists, and artist claiming features immediately after launch.
