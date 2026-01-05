---
Last-Updated: 2026-01-05
Maintainer: RB
Status: Launched - Full US Coverage
---

# Project Brief: Inkdex

## Project Overview
Inkdex is an AI-powered tattoo artist discovery platform that revolutionizes how people find tattoo artists by letting them search in *their language* (images, vibes, plain descriptions) rather than forcing them to learn tattoo industry terminology.

**Product Name:** Inkdex
**Domain:** inkdex.io

## Launch Status (Jan 2026)

| Metric | Target | Achieved |
|--------|--------|----------|
| Cities | 2 (MVP) | 116 (58x) |
| States | 2 | 51 (50 + DC) |
| Artists | 400-600 | 15,626 (26x) |
| Images | 8,000-12,000 | 68,440 (6x) |
| Styles | 10 | 20 |
| Static Pages | 100+ | ~3,500+ |

**All 15 implementation phases complete.** Platform includes:
- Multi-modal search (image, text, Instagram links)
- Artist claiming via Instagram OAuth
- Pro tier with Stripe subscriptions ($15/mo)
- Admin panel for artist management
- Multi-location support (international)
- GDPR compliance (EU artist filtering)

## Core Purpose

### Problem We're Solving
**The User's Dilemma:**
- Users have Pinterest screenshots, saved Instagram posts, vague vibes ("dark floral sketchy")
- But they DON'T know: what "neo-traditional" means, difference between "blackwork" and "black and grey", or what style taxonomy to use

**Current Solutions Fail:**
- Competitors force users into taxonomy dropdowns ("Select style: Neo-traditional, New School...")
- Google search requires knowing artist names
- Instagram requires knowing hashtags and manual scrolling
- No visual similarity search exists in the tattoo space

**Our Solution:**
Let users express themselves naturally:
- Upload a reference image → find visually similar artists
- Type "dark floral sketchy" → CLIP translates to relevant artists
- Paste Instagram post/profile URL → find similar artists

## Target Users

### Primary Persona: "The Pinterest Collector"
- **Age:** 22-35
- **Behavior:** Has 50+ saved tattoo images but doesn't know what to call them
- **Pain Point:** Searches "flower tattoo austin" and gets overwhelming generic results
- **Goal:** Find an artist whose portfolio actually matches their vibe
- **Success:** Uploads Pinterest screenshot → finds 5 perfect artist matches in <1 minute

### Secondary Persona: "The First-Timer"
- **Age:** 18-28
- **Behavior:** Nervous about getting first tattoo, overwhelmed by options
- **Pain Point:** Doesn't know where to start, afraid of choosing wrong style
- **Goal:** Explore artists visually without feeling stupid for not knowing terms
- **Success:** Browses by vibe, saves 3 artists, feels confident booking consultation

### Tertiary Persona: "The Returning Client"
- **Age:** 25-40
- **Behavior:** Has multiple tattoos, knows what they like
- **Pain Point:** Moving to new city, needs to find artists with specific style
- **Goal:** Quickly find artists who can execute their specific vision
- **Success:** Uploads photo of existing tattoo → finds artists with similar style

## Shipped Features

### Core Search
- **Multi-Modal Search:** Image upload, text query, Instagram URL paste
- **CLIP Embeddings:** 768-dim vectors for semantic similarity
- **Smart Input:** Auto-detects input type, handles all in unified box

### Artist Discovery
- **City Browse:** 116 city pages with editorial content
- **State Browse:** All 50 states + DC
- **Style Browse:** 20 style landing pages with SEO content
- **Artist Profiles:** Portfolio grid, location, Instagram link

### Artist Features (Claimed)
- **Instagram OAuth:** Claim profile via Instagram login
- **Portfolio Management:** Import up to 100 images (Pro)
- **Image Pinning:** Pin up to 6 best works to top
- **Auto-Sync:** Daily Instagram sync (Pro only)
- **Analytics Dashboard:** Views, clicks, search appearances

### Business Features
- **Pro Tier:** $15/month or $150/year via Stripe
- **Search Boosts:** Pro (+0.05) and Featured (+0.02) ranking
- **Admin Panel:** Mining dashboard, featured artist management

### Technical
- **GDPR Compliance:** EU/EEA/UK artists filtered from discovery
- **Multi-Location:** Artists can list up to 20 locations (Pro)
- **Redis Caching:** Rate limiting, analytics caching

## Technical Architecture

### Stack
- **Frontend:** Next.js 16+ (App Router), TypeScript, Tailwind CSS
- **Database:** Supabase PostgreSQL + pgvector (IVFFlat indexing)
- **Storage:** Supabase Storage (WebP thumbnails)
- **Embeddings:** Local GPU (A2000) + Modal.com fallback
- **Auth:** Supabase Auth + Instagram OAuth
- **Payments:** Stripe (checkout, webhooks, customer portal)
- **Email:** Resend (transactional emails)
- **Caching:** Redis (Railway)

### Performance
- Vector search: <200ms (optimized Jan 4, 2026)
- Page load: <2s LCP
- 90+ Lighthouse scores

## Business Model

### Revenue Streams
1. **Pro Subscriptions:** $15/month or $150/year
   - Unlimited portfolio (vs 20 for free)
   - Auto-sync from Instagram
   - Image pinning
   - Analytics dashboard
   - Search ranking boost

### Unit Economics
- **Discovery cost:** ~$3/city (Tavily API)
- **SEO content:** ~$0.02/city (GPT-4.1)
- **Embeddings:** ~$0.001/image
- **Monthly infrastructure:** ~$50 (Supabase Pro + Vercel Pro + Redis)

## Competitive Advantage

### Differentiators
1. **Visual Search:** Only platform offering image-based artist discovery
2. **User Language:** Natural language + images vs forced taxonomy
3. **CLIP Multimodal:** Single vector space for image + text search
4. **Full US Coverage:** 116 cities, all 50 states + DC
5. **SEO Foundation:** 20 style × 116 city landing pages

### Market Position
- **Gap Validated:** No visual search platform exists in tattoo space
- **Keyword Difficulty:** 0/100 across most cities (easy to rank)
- **Search Volume:** 250k+ searches/month per major city

## Next Priorities

### Immediate
1. Deploy Stripe to production (add live keys)
2. Run image scraping pipeline for ~10k pending artists
3. Marketing/outreach to drive artist claims

### Short-term
- Monitor search performance and optimize
- Expand style library based on demand
- Artist outreach campaigns

### Medium-term
- International expansion (Canada, UK, Australia)
- Mobile app consideration
- Style trend analytics

---

**Bottom Line:** Inkdex is the Google Images for tattoo artist discovery. Upload a vibe, find your artist, skip the jargon. Launched January 2026 with full US coverage.
