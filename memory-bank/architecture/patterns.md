---
Last-Updated: 2026-01-04
Maintainer: Claude
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

### 7. Location Data Architecture (Database + HTTP Caching)

**Purpose:** Provide searchable, scalable location data (cities, states, countries) with efficient caching for static public data.

**Context:** Migrated from TypeScript constants (254 cities → 528KB bundle) to database-driven approach (6,595 cities, zero bundle impact).

**Architecture Decision: HTTP Caching vs Redis Caching**

| Data Type | Caching Strategy | Why |
|-----------|-----------------|-----|
| **Location data** (cities, states) | HTTP caching (CDN/Edge) | Static, public, same for all users |
| **User-specific data** (analytics, profiles) | Redis caching | Dynamic, varies per user |
| **Search results** (embeddings) | Redis caching | Complex queries, cross-server state |
| **Admin dashboards** | Redis caching | Aggregated data, expensive queries |

**Pattern:**

```typescript
// supabase/migrations/20260103_007_create_locations_table.sql
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  city_ascii text NOT NULL,        -- For case-insensitive search
  state_code text,                  -- US: "FL", "TX", etc.
  state_name text,                  -- "Florida", "Texas"
  country_code char(2) NOT NULL,    -- ISO-2: "US", "CA", "GB"
  country_name text NOT NULL,
  population integer,               -- For sorting (popular cities first)
  lat decimal(10, 7),
  lng decimal(10, 7),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Composite index for fast city search
CREATE INDEX idx_locations_city_country
ON locations(city_ascii, country_code);

-- Country filter index
CREATE INDEX idx_locations_country
ON locations(country_code);

-- RLS: Public read-only
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY locations_public_read ON locations
FOR SELECT USING (true);
```

**API Endpoint with HTTP Caching:**

```typescript
// app/api/locations/cities/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const countryCode = searchParams.get('country') || 'US';
  const searchQuery = searchParams.get('search') || '';

  // Validate and cap limit (prevent API abuse)
  const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
  const limit = Math.min(Math.max(rawLimit, 1), 500); // Max 500 cities

  const supabase = await createClient();

  let query = supabase
    .from('locations')
    .select('city, city_ascii, state_code, state_name')
    .eq('country_code', countryCode)
    .order('population', { ascending: false }) // Popular cities first
    .limit(limit);

  // Prefix search on city_ascii
  if (searchQuery) {
    query = query.ilike('city_ascii', `${searchQuery}%`);
  }

  const { data, error } = await query;

  // Handle duplicate city names (e.g., Springfield, IL vs Springfield, MA)
  const cities = formatCitiesWithDuplicateHandling(data);

  const response = NextResponse.json({ cities });

  // HTTP caching: 1 hour cache, serve stale for 24h while revalidating
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  );

  return response;
}
```

**CitySelect Component Pattern:**

```typescript
// components/ui/CitySelect.tsx
export default function CitySelect({
  value,
  onChange,
  onStateAutoFill,      // Callback to auto-fill state field
  countryCode,
  placeholder = 'Select city...'
}: CitySelectProps) {
  const [cities, setCities] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const cityMapRef = useRef<Map<string, string>>(new Map());

  // Fetch cities from API on mount/country change
  useEffect(() => {
    if (countryCode !== 'US') {
      setCities([]);
      return;
    }

    let cancelled = false;

    async function fetchCities() {
      setLoading(true);
      const response = await fetch(
        `/api/locations/cities?country=${countryCode}&limit=200`
      );
      const data = await response.json();

      if (!cancelled && data.cities) {
        setCities(data.cities);

        // Build city → state map for auto-fill
        const newMap = new Map<string, string>();
        data.cities.forEach((city: CityResult) => {
          if (city.state) {
            newMap.set(city.city.toLowerCase(), city.state);
          }
        });
        cityMapRef.current = newMap;
      }
      setLoading(false);
    }

    fetchCities();
    return () => { cancelled = true; };
  }, [countryCode]);

  // Auto-fill state on city selection
  const handleCityChange = (selectedCity: string | null) => {
    onChange(selectedCity || '');

    if (selectedCity && onStateAutoFill) {
      const stateCode = cityMapRef.current.get(selectedCity.toLowerCase());
      if (stateCode) {
        onStateAutoFill(stateCode);
      }
    }
  };

  // US: Use Select dropdown with API data
  if (countryCode === 'US') {
    return (
      <Select
        value={value}
        onChange={handleCityChange}
        options={cities.map(c => ({ value: c.city, label: c.label }))}
        placeholder={loading ? 'Loading cities...' : placeholder}
        searchable
      />
    );
  }

  // International: Plain text input
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      placeholder={placeholder}
    />
  );
}
```

**Data Import Strategy:**

```typescript
// scripts/import-locations-to-db.ts
const MIN_POPULATION = 5000;  // Filter: Only cities > 5K population
const BATCH_SIZE = 500;       // Batch inserts for performance

async function importLocations() {
  const supabase = createClient(url, serviceRoleKey);

  // Parse CSV (SimpleMaps data)
  const locations = parseCSV(CSV_PATH)
    .filter(city => city.population >= MIN_POPULATION)
    .map(city => ({
      city: city.city,
      city_ascii: city.city_ascii || city.city,
      state_code: city.state_id,
      state_name: city.state_name,
      country_code: 'US',
      country_name: 'United States',
      population: city.population,
      lat: parseFloat(city.lat),
      lng: parseFloat(city.lng)
    }));

  // Clear existing data (idempotent)
  await supabase.from('locations').delete().eq('country_code', 'US');

  // Batch insert (500 rows per batch)
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    await supabase.from('locations').insert(batch);
    console.log(`Inserted ${i + batch.length}/${locations.length}`);
  }
}

// Result: 6,595 US cities imported (filtered from 31,254)
```

**Key Design Decisions:**

1. **HTTP Caching Over Redis:**
   - Location data is static and public (same response for all users)
   - CDN/edge caching serves data closer to users geographically
   - Browser caching eliminates requests entirely after first load
   - No Redis round-trip needed
   - Result: <100ms response time with 95%+ cache hit rate

2. **Database Over TypeScript Constants:**
   - Zero bundle size impact (was 528KB for just US cities)
   - Scalable to any country without code changes
   - Server-side search and filtering
   - Easy to update data without deployments
   - Supports future features (geocoding, radius search)

3. **Auto-Fill UX Pattern:**
   - Selecting "Miami" auto-fills state to "FL"
   - Reduces user friction (one less field to fill)
   - Uses in-memory Map for O(1) lookups
   - Only auto-fills for known cities (doesn't break manual entry)

4. **Duplicate City Handling:**
   - Groups cities by name during API formatting
   - Unique cities: "Miami" (clean label)
   - Duplicates: "Springfield, IL" vs "Springfield, MA" (disambiguated)
   - Sorted alphabetically for better UX

5. **Input Validation:**
   - Limit parameter capped at 500 (prevents API abuse)
   - Prefix search only (`ILIKE 'query%'`) for index efficiency
   - Country code defaults to 'US' if missing

**Performance Characteristics:**

| Metric | Value |
|--------|-------|
| API Response Time (uncached) | ~50-100ms |
| API Response Time (cached) | <10ms (edge cache) |
| Response Size (200 cities) | ~15KB |
| Cache Hit Rate | 95%+ (after warmup) |
| Cache Duration | 1 hour (fresh) + 24 hours (stale) |
| Bundle Impact | 0 bytes |
| Database Records | 6,595 US cities |

**Data Attribution:**

SimpleMaps US Cities Database (free tier with attribution):
- Source: https://simplemaps.com/data/us-cities
- Attribution required in About page or Terms of Service
- Updates: Download new CSV and re-run import script

**When to Use This Pattern:**

- ✅ Static reference data (countries, cities, states, timezones)
- ✅ Public data (same for all users)
- ✅ Infrequent updates (weekly/monthly)
- ✅ Large datasets that would bloat bundle size
- ❌ User-specific data → Use Redis caching
- ❌ Real-time data → Use Redis or no caching
- ❌ Frequently changing data → Use shorter TTLs or Redis

---

### 8. GDPR/Privacy Compliance Filtering

**Purpose:** Filter artists from EU/EEA/UK/Switzerland regions to comply with GDPR requirements when scraping public data without consent.

**Context:** GDPR applies to EU residents' data regardless of where the processor is based. Scraping public Instagram profiles of EU artists without consent creates legal risk.

**Architecture: Two-Layer Defense**

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Discovery Pipeline Prevention                    │
│  - Bio location extractor detects EU cities/countries      │
│  - Artists filtered BEFORE database insertion              │
│  - Logged for audit purposes                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Database Search Filtering                        │
│  - SQL functions exclude artists with EU country_code      │
│  - Browse pages exclude GDPR countries entirely            │
│  - Safety net for any artists that slip through            │
└─────────────────────────────────────────────────────────────┘
```

**GDPR Countries (32 total):**
- **EU 27:** AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE
- **EEA 3:** IS, LI, NO
- **UK GDPR:** GB
- **Swiss DPA:** CH

**Implementation Files:**

1. **Constants (`/lib/constants/countries.ts`):**
```typescript
export const GDPR_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'GB', 'CH'
]);

export function isGDPRCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return GDPR_COUNTRY_CODES.has(code.toUpperCase());
}
```

2. **Bio Location Extractor (`/lib/instagram/bio-location-extractor.ts`):**
```typescript
// Major EU cities mapped to country codes
const GDPR_CITY_TO_COUNTRY: Record<string, string> = {
  'london': 'GB',
  'berlin': 'DE',
  'paris': 'FR',
  'amsterdam': 'NL',
  // ... 100+ cities
};

// Country names and abbreviations
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united kingdom': 'GB',
  'uk': 'GB',
  'germany': 'DE',
  // ... all GDPR countries
};

// Returns { isGDPR: boolean, countryCode: string | null }
export function checkBioForGDPR(bio: string): { isGDPR: boolean; countryCode: string | null }
```

3. **Discovery Scripts (hashtag-mining.ts, follower-mining.ts):**
```typescript
const location = extractLocationFromBio(bio);

// GDPR compliance: Skip EU artists
if (location?.isGDPR) {
  stats.skippedGDPR++;
  console.log(`[Mining] 🇪🇺 Skipped EU artist: @${username} (${location.countryCode})`);
  return;
}

// Continue with artist insertion...
```

4. **SQL Functions (search, browse, related artists):**
```sql
-- Added to WHERE clause in all search functions
AND NOT EXISTS (
  SELECT 1 FROM artist_locations al_gdpr
  WHERE al_gdpr.artist_id = a.id
    AND al_gdpr.country_code IN (
      'AT', 'BE', 'BG', ... , 'GB', 'CH'
    )
)
```

**Edge Cases Handled:**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| Unknown location (no bio/location data) | NOT filtered | Can't determine if EU |
| US artist with EU secondary location | Filtered | Conservative approach |
| Artist relocates from EU to US | Still filtered until old location removed | Manual cleanup needed |
| Claimed Pro artist sets EU location | Filtered | Consent given by claiming, but still filtered for safety |

**Performance Optimization:**

```sql
-- Partial index for GDPR filtering
CREATE INDEX idx_artist_locations_country_code_gdpr
ON artist_locations(country_code)
WHERE country_code IN ('AT', 'BE', ...);
```

**Monitoring:**

- Discovery scripts log `EU/GDPR skipped: X` in summary
- Mining candidates table stores skipped artists for audit
- Console logs show real-time: `🇪🇺 Skipped EU artist: @handle (DE)`

**When to Use This Pattern:**

- ✅ Scraping public social media profiles
- ✅ Processing personal data without explicit consent
- ✅ Any data collection from EU residents
- ❌ User-initiated data (they provided consent by signing up)
- ❌ B2B data (different rules apply)

**Future Improvements:**

1. Add `is_gdpr_region` boolean flag to artists table (denormalized for performance)
2. Centralize GDPR country list in database table (easier updates)
3. Add non-English bio patterns (German: "Basierend in", French: "Situé à")
4. Track `gdpr_filtered_at` timestamp for audit compliance

---

## Key Takeaway

The DDD project has proven these patterns in production. **Don't reinvent the wheel—copy, adapt, and ship.**

For complete pattern details and additional examples, see the full implementation in `/coding_projects/ddd/`.
