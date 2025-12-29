---
Last-Updated: 2025-12-29
Maintainer: RB
Status: Design Reference
Source: Inherited from /coding_projects/ddd architecture
---

# Architecture Patterns: Tattoo Artist Discovery Platform

## Overview

Proven architecture patterns inherited from the DDD restaurant map project. These patterns prioritize **clean separation of concerns**, **maintainability**, and **type safety** while keeping implementation simple (KISS + YAGNI).

**Source Reference:** `/Users/rb/Documents/coding_projects/ddd/`

---

## Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  App Layer (Next.js App Router)                │
│  - Server Components (data fetching)           │
│  - Client Components (interactivity)           │
│  - API Routes (search, upload)                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Service Layer (Business Logic)                │
│  - search-service.ts                           │
│  - embedding-service.ts                        │
│  - artist-enrichment-service.ts (Phase 2+)     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Repository Layer (Data Access)                │
│  - artist-repository.ts                        │
│  - portfolio-repository.ts                     │
│  - search-repository.ts                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Database (Supabase PostgreSQL + pgvector)     │
└─────────────────────────────────────────────────┘
```

**Key Principles:**
1. **Repository Pattern**: All database access centralized in repositories
2. **Service Layer**: Single-purpose business logic, orchestrates repositories
3. **Domain Models**: TypeScript interfaces in `lib/types.ts`
4. **Shared Utilities**: Reusable helpers in `lib/utils/`

---

## Directory Structure

### Application Structure (Aligned with DDD Project)

```
/tattoo
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (metadata, analytics)
│   │   ├── page.tsx                  # Landing page with search
│   │   ├── search/
│   │   │   └── page.tsx              # Search results page
│   │   ├── [city]/
│   │   │   ├── page.tsx              # City browse page
│   │   │   └── [style]/page.tsx      # Style landing pages (SEO)
│   │   ├── artist/[slug]/page.tsx    # Artist profile pages
│   │   ├── saved/page.tsx            # Saved artists (post-MVP)
│   │   ├── dashboard/                # Artist dashboard (post-MVP)
│   │   ├── api/
│   │   │   ├── search/route.ts       # POST /api/search (image/text → embedding)
│   │   │   ├── saved-artists/route.ts # GET/POST/DELETE saved artists
│   │   │   └── claim-profile/route.ts # POST /api/claim-profile
│   │   ├── sitemap.ts                # Dynamic sitemap
│   │   └── robots.ts                 # robots.txt
│   │
│   ├── components/
│   │   ├── search/
│   │   │   ├── ImageUpload.tsx       # Image upload component
│   │   │   ├── TextSearch.tsx        # Text search input
│   │   │   ├── SearchResults.tsx     # Artist cards grid
│   │   │   └── CityFilter.tsx        # City filter dropdown
│   │   ├── artist/
│   │   │   ├── ArtistCard.tsx        # Artist card (grid view)
│   │   │   ├── ArtistProfile.tsx     # Artist profile header
│   │   │   ├── PortfolioGrid.tsx     # Portfolio images grid
│   │   │   ├── VerificationBadge.tsx # Verified artist badge
│   │   │   ├── SaveButton.tsx        # Save/unsave artist (post-MVP)
│   │   │   └── ClaimProfileButton.tsx # Claim profile (post-MVP)
│   │   └── ui/
│   │       ├── Header.tsx            # Site header
│   │       ├── Footer.tsx            # Site footer
│   │       ├── Button.tsx            # Reusable button
│   │       ├── Card.tsx              # Card component
│   │       └── Input.tsx             # Form input
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   │   ├── server.ts             # Server Supabase client
│   │   │   └── types.ts              # Database types (generated)
│   │   │
│   │   ├── repositories/             # Data Access Layer (DDD Pattern)
│   │   │   ├── artist-repository.ts  # Artist CRUD operations
│   │   │   ├── portfolio-repository.ts # Portfolio image operations
│   │   │   ├── search-repository.ts  # Search operations
│   │   │   └── style-repository.ts   # Style seed operations
│   │   │
│   │   ├── services/                 # Business Logic Layer (DDD Pattern)
│   │   │   ├── search-service.ts     # Search orchestration (image/text/hybrid)
│   │   │   ├── embedding-service.ts  # CLIP embedding generation (Modal.com)
│   │   │   └── image-processing-service.ts # Image upload, resize, R2 upload
│   │   │
│   │   ├── utils/
│   │   │   ├── image.ts              # Image utilities (Sharp processing)
│   │   │   ├── url.ts                # Slug generation, URL helpers
│   │   │   ├── seo.ts                # SEO helpers (metadata, sitemap)
│   │   │   └── validation.ts         # Zod schemas for input validation
│   │   │
│   │   ├── constants/
│   │   │   ├── cities.ts             # Supported cities config
│   │   │   └── styles.ts             # Style seed definitions
│   │   │
│   │   ├── schema.ts                 # Schema.org structured data (JSON-LD)
│   │   ├── analytics.ts              # PostHog/GA4 tracking utilities
│   │   └── env.ts                    # Environment variable validation
│   │
│   └── types/
│       ├── artist.ts                 # Artist domain model
│       ├── search.ts                 # Search domain model
│       ├── portfolio.ts              # Portfolio image domain model
│       └── database.ts               # Supabase generated types
│
├── scripts/                          # Data Pipeline Scripts
│   ├── city-analysis/
│   │   └── analyze-markets.ts        # DataForSEO city analysis (Phase 0)
│   ├── discovery/
│   │   ├── google-maps-discovery.ts  # Google Maps artist discovery
│   │   ├── website-scraper.ts        # Scrape shop websites for artists
│   │   └── instagram-validator.ts    # Validate Instagram handles + extract user IDs
│   ├── scraping/
│   │   └── instagram-scraper.ts      # Apify Instagram scraper integration
│   ├── images/
│   │   └── process-and-upload.ts     # Download + Sharp processing + R2 upload
│   ├── embeddings/
│   │   ├── generate_embeddings.py    # Modal.com GPU function (OpenCLIP)
│   │   └── batch-process.ts          # Node.js orchestration for batching
│   └── seo/
│       └── seed-styles.ts            # Populate style_seeds table
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Core tables (artists, portfolio_images, searches)
│       └── 002_auth_extensions.sql   # Future auth tables (users, saved_artists)
│
├── memory-bank/                      # Project Documentation
├── .env.local                        # Local environment variables
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
└── tsconfig.json                     # TypeScript configuration
```

---

## Core Patterns (Inherited from DDD)

### 1. Repository Pattern

**Purpose:** Centralize all database access, abstract away Supabase implementation details.

**Pattern from DDD:**
```typescript
// lib/repositories/artist-repository.ts
import { supabase } from '@/lib/supabase/client';
import type { Artist } from '@/types/artist';

export const artistRepository = {
  async findBySlug(slug: string): Promise<Artist | null> {
    const { data, error } = await supabase()
      .from('artists')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  async findByCity(city: string): Promise<Artist[]> {
    const { data, error } = await supabase()
      .from('artists')
      .select('*')
      .eq('city', city)
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getSlugs(): Promise<string[]> {
    const { data, error } = await supabase()
      .from('artists')
      .select('slug')
      .eq('status', 'active');

    if (error) throw error;
    return data?.map(r => r.slug) || [];
  },

  // Add more repository methods as needed
};
```

**Benefits:**
- Single source of truth for database queries
- Easy to mock for testing
- Can swap database implementation without changing business logic
- Type-safe with TypeScript

**Usage in App:**
```typescript
// app/artist/[slug]/page.tsx
import { artistRepository } from '@/lib/repositories/artist-repository';

export default async function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = await artistRepository.findBySlug(params.slug);
  if (!artist) notFound();

  return <ArtistProfile artist={artist} />;
}
```

---

### 2. Service Layer Pattern

**Purpose:** Orchestrate business logic, coordinate multiple repositories, handle complex operations.

**Pattern from DDD:**
```typescript
// lib/services/search-service.ts
import { searchRepository } from '@/lib/repositories/search-repository';
import { embeddingService } from '@/lib/services/embedding-service';
import type { SearchResult, SearchType } from '@/types/search';

export const searchService = {
  /**
   * Perform multi-modal search (image, text, or hybrid)
   */
  async search(params: {
    type: SearchType;
    image?: File;
    query?: string;
    city?: string;
  }): Promise<SearchResult> {
    // 1. Generate embedding based on search type
    let embedding: number[];

    if (params.type === 'image' && params.image) {
      // Image search: CLIP image encoder
      embedding = await embeddingService.generateImageEmbedding(params.image);
    } else if (params.type === 'text' && params.query) {
      // Text search: CLIP text encoder (same vector space!)
      embedding = await embeddingService.generateTextEmbedding(params.query);
    } else if (params.type === 'hybrid' && params.image && params.query) {
      // Hybrid: Combine image + text embeddings (weighted average)
      const [imageEmbed, textEmbed] = await Promise.all([
        embeddingService.generateImageEmbedding(params.image),
        embeddingService.generateTextEmbedding(params.query),
      ]);
      embedding = combineEmbeddings(imageEmbed, textEmbed, 0.6, 0.4); // 60% image, 40% text
    } else {
      throw new Error('Invalid search parameters');
    }

    // 2. Store search in database (for analytics, caching)
    const searchId = await searchRepository.createSearch({
      embedding,
      type: params.type,
      query: params.query,
      city: params.city,
    });

    // 3. Run vector similarity search
    const artists = await searchRepository.searchByEmbedding({
      embedding,
      city: params.city,
      threshold: 0.7,
      limit: 20,
    });

    return {
      searchId,
      artists,
      type: params.type,
    };
  },
};

function combineEmbeddings(
  embed1: number[],
  embed2: number[],
  weight1: number,
  weight2: number
): number[] {
  return embed1.map((val, idx) => val * weight1 + embed2[idx] * weight2);
}
```

**Benefits:**
- Single-purpose services (search-service, embedding-service, etc.)
- Orchestrates multiple repositories
- Reusable across API routes and server components
- Easy to test with mocked repositories

---

### 3. Singleton Supabase Client

**Purpose:** Reuse Supabase client across requests, avoid connection pooling issues.

**Pattern from DDD:**
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false, // No user auth needed for MVP
      },
    });
  }
  return _supabase;
}

// Export getter function, not the result
export { getSupabaseClient as supabase };
```

**Usage:**
```typescript
import { supabase } from '@/lib/supabase/client';

// Always call as function to get client
const { data, error } = await supabase().from('artists').select('*');
```

---

### 4. Type-Safe Domain Models

**Purpose:** Define domain entities with TypeScript interfaces, share across layers.

**Pattern from DDD:**
```typescript
// types/artist.ts
export interface Artist {
  id: string;
  name: string;
  slug: string;
  instagram_handle: string;
  instagram_id: string | null; // For OAuth matching
  shop_name: string | null;
  city: string;
  state: string | null;
  profile_image_url: string | null;
  instagram_url: string;
  website_url: string | null;
  bio: string | null;

  // Artist claiming (post-MVP)
  claimed_by_user_id: string | null;
  verification_status: 'unclaimed' | 'pending' | 'verified';
  bio_override: string | null; // Custom bio for claimed artists
  booking_url: string | null;
  contact_email: string | null;

  // Metadata
  discovery_source: string | null;
  follower_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioImage {
  id: string;
  artist_id: string;
  instagram_post_id: string;
  instagram_url: string;
  r2_thumbnail_medium: string | null; // Cloudflare R2 URL
  post_caption: string | null;
  post_timestamp: string | null;
  likes_count: number | null;
  embedding: number[] | null; // CLIP embedding (768-dim)
  status: 'active' | 'hidden' | 'deleted';
  featured: boolean; // For claimed artists to highlight work
  created_at: string;
}
```

**Benefits:**
- Type safety across entire app
- Autocomplete in IDE
- Catch errors at compile time
- Self-documenting code

---

### 5. React Server Components + ISR

**Purpose:** Server-side rendering with static generation and revalidation.

**Pattern from DDD:**
```typescript
// app/artist/[slug]/page.tsx
import { artistRepository } from '@/lib/repositories/artist-repository';
import { portfolioRepository } from '@/lib/repositories/portfolio-repository';

// Revalidate once per day
export const revalidate = 86400; // 24 hours

// Allow on-demand generation of pages not pre-rendered at build time
export const dynamicParams = true;

// Pre-render all artist pages at build time
export async function generateStaticParams() {
  const slugs = await artistRepository.getSlugs();
  console.log(`✓ Generating ${slugs.length} artist pages`);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const artist = await artistRepository.findBySlug(params.slug);

  if (!artist) {
    return { title: 'Artist Not Found' };
  }

  return {
    title: `${artist.name} - ${artist.city} | Tattoo Artist Discovery`,
    description: artist.bio?.substring(0, 160) || `Tattoo artist ${artist.name} in ${artist.city}`,
    openGraph: {
      title: `${artist.name} | Tattoo Artist`,
      description: artist.bio?.substring(0, 160),
      images: artist.profile_image_url ? [artist.profile_image_url] : undefined,
    },
  };
}

export default async function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = await artistRepository.findBySlug(params.slug);

  if (!artist) {
    notFound();
  }

  // Fetch portfolio images in parallel
  const portfolioImages = await portfolioRepository.findByArtistId(artist.id);

  return (
    <>
      <ArtistProfile artist={artist} />
      <PortfolioGrid images={portfolioImages} />
    </>
  );
}
```

---

### 6. Batch Processing with Modal.com (GPU Workloads)

**Purpose:** Process large batches of data on serverless GPUs with proper timeout handling and resume capability.

**Context:** Used for CLIP embedding generation (1,257 images) - Pattern applicable to any GPU-intensive batch processing.

**Pattern:**
```python
# scripts/embeddings/modal_clip_embeddings.py
import modal

app = modal.App("tattoo-clip-embeddings")

@app.cls(
    gpu="A10G",  # GPU type
    image=image,  # Container image with dependencies
    secrets=[modal.Secret.from_name("supabase")],
    timeout=7200,  # Container lifetime (2 hours)
)
class CLIPEmbedder:
    @modal.enter()
    def enter(self):
        """Initialize model once per container (cached across batches)"""
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(...)
        self.supabase = create_client(...)

    @modal.method()  # Remote method timeout: 300s (HARD LIMIT)
    def process_batch_from_db(
        self,
        batch_size: int = 50,  # Tuned to stay under 300s timeout
        offset: int = 0,
    ) -> dict:
        """
        Process one batch of images.

        Time breakdown (50 images):
        - Image download: ~30-60s
        - GPU inference: ~60-90s
        - DB writes: ~10-20s
        Total: ~2-3 min (safe margin under 5-min timeout)
        """
        # Fetch images WHERE embedding IS NULL AND status='pending'
        query = self.supabase.table("portfolio_images").select(
            "id, storage_original_path, artist_id"
        ).is_("embedding", "null").eq("status", "pending").limit(batch_size).offset(offset)

        images = query.execute().data
        if not images:
            return {"processed": 0, "message": "No images to process"}

        # Process all images in batch
        results = []
        for img_data in images:
            public_url = construct_storage_url(img_data["storage_original_path"])
            embedding = self.generate_embedding.local(public_url)  # GPU inference

            results.append({
                "id": img_data["id"],
                "embedding": embedding,
                "status": "active"  # Mark as searchable after embedding
            })

        # Batch update database
        for result in results:
            self.supabase.table("portfolio_images").update(result).eq("id", result["id"]).execute()

        return {"processed": len(results), "errors": 0}

@app.function(image=image, secrets=[modal.Secret.from_name("supabase")])
def generate_embeddings_batch(
    batch_size: int = 50,
    max_batches: int = 2,  # Process 2 batches per run (stays under 300s cumulative timeout)
):
    """
    Process multiple batches with automatic resume.

    Strategy:
    - Each run processes 2 batches (100 images)
    - Takes ~4-6 minutes total (under 300s cumulative timeout)
    - Can restart to process remaining images
    - Idempotent (skips already-processed images via WHERE clause)
    """
    embedder = CLIPEmbedder()

    for batch_num in range(max_batches):
        offset = batch_num * batch_size
        result = embedder.process_batch_from_db.remote(batch_size=batch_size, offset=offset)

        if result["processed"] == 0:
            print("✅ All images processed!")
            break
```

**Key Learnings:**

1. **Modal Timeout Architecture:**
   - **Container lifetime timeout** (7200s) ≠ **Remote method timeout** (300s)
   - Remote method timeout is HARD LIMIT, cannot be overridden
   - Cumulative timeout: Multiple `.remote()` calls add up toward 300s limit
   - Solution: Limit batches per run (e.g., 2 batches × 50 images = ~200-250s)

2. **Batch Size Optimization:**
   - GPU can handle 100+ images easily
   - Network I/O and DB writes are the bottleneck
   - Test with small batches first to measure timing
   - Leave 20-30% buffer for timeout safety

3. **Resume Capability Pattern:**
   ```sql
   WHERE embedding IS NULL AND status='pending'
   ```
   - Enables automatic resume after interruption
   - Idempotent by design
   - Can Ctrl+C and restart without losing progress

4. **Status Lifecycle for Incremental Updates:**
   - Upload: `status='pending'` (not searchable yet)
   - After embedding: `status='active'` (now searchable)
   - Prevents race conditions where users search before embeddings exist
   - Supports adding new images without re-processing existing ones

5. **Cost Optimization:**
   - Container caching reduces build time (~85s cached vs 3-5 min first build)
   - Pay-per-second GPU billing (A10G: ~$0.60/hour)
   - Batch processing minimizes cold starts
   - Example: 1,257 images processed for ~$1.50-2.00 total

**Usage Example:**
```bash
# Process all images in chunks (automatic resume)
python3 -m modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch --batch-size 50 --max-batches 2

# Run multiple times until complete
# Each run processes 100 images, script exits when no more images found
```

**When to Use This Pattern:**
- GPU-intensive workloads (ML inference, image processing)
- Large batch processing with potential timeouts
- Need for fault tolerance and resume capability
- Cost-sensitive workloads (pay-per-second billing)

**Alternative Approaches:**
- For small batches (<50 items): Direct API calls may be simpler
- For real-time inference: Deploy Modal web endpoints instead
- For non-GPU workloads: Consider serverless functions (Vercel, AWS Lambda)

---

## Key Takeaway

The DDD project has proven these patterns in production. **Don't reinvent the wheel—copy, adapt, and ship.**

For complete pattern details and additional examples, see the full implementation in `/coding_projects/ddd/`.
