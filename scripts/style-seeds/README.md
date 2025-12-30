# Style Seeds Pipeline

Automated pipeline for downloading, processing, and embedding tattoo style seed images from Tattoodo.

## Overview

This pipeline creates the foundation for style-based search and SEO landing pages by:
1. Downloading curated tattoo style images from authoritative sources
2. Generating CLIP embeddings for each style
3. Populating the database for style-based artist matching

## Source

**Article:** [A Beginner's Guide to Popular Tattoo Styles](https://www.tattoodo.com/articles/a-beginners-guide-popular-tattoo-styles-briefly-explained-6969)

**Date Accessed:** December 30, 2025

## Styles Covered

1. **Traditional** - Bold lines, bright colors, roses and anchors
2. **Realism** - Photo-realistic portraits and nature
3. **Watercolor** - Soft, flowing, brush-dabbled pastels
4. **Tribal** - Bold geometric patterns, black ink
5. **New School** - Cartoonish, vibrant, 90s aesthetic
6. **Neo Traditional** - Modern evolution with vibrant colors
7. **Japanese** - Dragons, phoenixes, folklore (Irezumi)
8. **Blackwork** - Solely black ink, sacred geometry
9. **Illustrative** - Etching, engraving, fine line
10. **Chicano** - Fine line, Mexican culture, LA style

## Quick Start

### Run Complete Pipeline

```bash
npm run seeds:all
```

This executes all steps in sequence:
1. Download images from Tattoodo
2. Upload to Supabase Storage
3. Prepare images for embedding generation
4. Generate CLIP embeddings via Modal.com
5. Populate database

### Run Individual Steps

```bash
# 1. Download and upload images
npm run seeds:download

# 2. Prepare images for embedding generation
npm run seeds:prepare-embeddings

# 3. Generate CLIP embeddings (requires Modal.com)
npm run seeds:generate-embeddings

# 4. Populate database
npm run seeds:populate
```

## Architecture

### Pipeline Flow

```
Tattoodo URLs
    ↓
Download Images (HTTPS)
    ↓
Upload to Supabase Storage (portfolio-images/style-seeds/)
    ↓
Download to Local Temp (tmp/seed-embeddings/)
    ↓
Generate CLIP Embeddings (Modal.com GPU)
    ↓
Insert to Database (style_seeds table)
```

### Files

- **`style-seeds-data.ts`** - Style definitions and Tattoodo URLs
- **`download-and-upload-seeds.ts`** - Download from Tattoodo → Upload to Storage
- **`generate-seed-embeddings.ts`** - Download from Storage → Prepare for GPU
- **`generate-seed-embeddings-simple.py`** - Modal.com GPU batch processing
- **`populate-style-seeds.ts`** - Insert embeddings into database
- **`verify-seeds.ts`** - Verification and testing utility

### Storage Structure

```
Supabase Storage: portfolio-images/
  └── style-seeds/
      ├── traditional-1.jpg
      ├── traditional-2.jpg
      ├── realism-1.jpg
      ├── watercolor-1.jpg
      └── ...
```

### Database Schema

```sql
CREATE TABLE style_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_name TEXT UNIQUE NOT NULL,      -- 'traditional', 'realism'
  display_name TEXT NOT NULL,           -- 'Traditional', 'Realism'
  seed_image_url TEXT NOT NULL,         -- Supabase Storage public URL
  embedding vector(768) NOT NULL,       -- CLIP embedding
  description TEXT,                     -- SEO meta description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Technical Details

### CLIP Embeddings

- **Model:** OpenCLIP ViT-L-14 (laion2b_s32b_b82k)
- **Dimensions:** 768
- **Normalization:** L2 normalized for cosine similarity
- **Processing:** Modal.com A10G GPU (~2 minutes for 57 images)

### Selection Strategy

- **Images per Style:** 5-6 representative examples
- **Representative Seed:** First image (seed-1) used in database
- **Total Seeds:** 57 images downloaded, 10 inserted to database

### Cost

- **Storage:** ~12MB (57 images)
- **Compute:** ~$0.05 (Modal.com GPU time)
- **Total:** ~$0.05 one-time cost

## Usage

### Verify Seeds

```bash
npx tsx scripts/style-seeds/verify-seeds.ts
```

Output:
```
✅ Found 10 style seeds:

📌 Traditional
   Style: traditional
   Image: https://...supabase.co/storage/.../traditional-1.jpg
   Description: Bold lines, bright colors...
```

### Query Seeds in Database

```sql
SELECT style_name, display_name, description
FROM style_seeds
ORDER BY style_name;
```

### Search by Style

Use seed embeddings to find artists with similar styles:

```sql
-- Find artists similar to "traditional" style
SELECT * FROM search_artists_by_embedding(
  (SELECT embedding FROM style_seeds WHERE style_name = 'traditional'),
  'Austin',
  20
);
```

## Next Steps

1. **Create Style Landing Pages:** `/texas/austin/traditional`
2. **Build Style Browse UI:** Homepage component with style cards
3. **Implement Style Search:** Click style → Find matching artists
4. **Add Style Filters:** Filter search results by style
5. **SEO Optimization:** Generate metadata for style pages

## Troubleshooting

### Missing Environment Variables

Ensure `.env.local` contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Modal.com Authentication

Install and authenticate Modal CLI:
```bash
pip3 install modal
modal token new
```

### Duplicate Key Errors

If seeds already exist, they won't be re-inserted (unique constraint on `style_name`). To re-populate:

```sql
DELETE FROM style_seeds;
```

Then run:
```bash
npm run seeds:populate
```

## License & Attribution

- **Images:** Sourced from Tattoodo article under fair use for search indexing
- **Descriptions:** Paraphrased from Tattoodo article
- **Usage:** Representative examples for style classification and SEO

## Maintainer

RB - December 30, 2025
