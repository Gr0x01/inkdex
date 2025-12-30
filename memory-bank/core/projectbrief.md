---
Last-Updated: 2025-12-31
Maintainer: RB
Status: Active Development
---

# Project Brief: Inkdex

## Project Overview
Inkdex is an AI-powered tattoo artist discovery platform that revolutionizes how people find tattoo artists by letting them search in *their language* (images, vibes, plain descriptions) rather than forcing them to learn tattoo industry terminology.

**Product Name:** Inkdex
**Domain:** inkdex.io

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
- Click vibe images instead of dropdowns → no jargon required

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

### Tertiary Persona: "The Returning Client" (Post-MVP)
- **Age:** 25-40
- **Behavior:** Has multiple tattoos, knows what they like
- **Pain Point:** Moving to new city, needs to find artists with specific style
- **Goal:** Quickly find artists who can execute their specific vision
- **Success:** Uploads photo of existing tattoo → finds artists with similar style

## Key Features

### MVP (8 Weeks)
1. **Multi-Modal Search**
   - Image upload (primary): drag-drop, file, URL
   - Text search (secondary): "dark floral sketchy" → visual matches
   - Visual style picker (optional): click vibe images instead of dropdowns

2. **Artist Profiles**
   - Name, location, shop, Instagram link
   - 20-50 portfolio images from Instagram
   - Verification badge (for claimed profiles - infrastructure ready)
   - Custom bio/booking link (for claimed artists - infrastructure ready)

3. **City Browse Pages**
   - All artists in Austin, TX
   - All artists in Los Angeles, CA
   - SEO-optimized for "[city] tattoo artist" searches

4. **Style Landing Pages** (SEO-Critical)
   - Auto-generated from CLIP embeddings (no manual tagging)
   - Example: `/austin/fine-line-tattoo` → artists whose work matches fine-line seed image
   - 20 pages (2 cities × 10 styles) targeting "[style] tattoo [city]" keywords

5. **Search Results**
   - 20 ranked artists with top 4 matching images each
   - City filtering
   - Similarity scores
   - Click → artist profile or Instagram

### Post-MVP (Weeks 9-12)
6. **User Authentication**
   - Instagram OAuth login
   - Saved/bookmarked artists
   - Search history for logged-in users

7. **Artist Claiming & Verification**
   - Artists log in with Instagram OAuth
   - Automatic matching via Instagram ID
   - Manual verification process
   - Custom bio, booking link, featured images
   - Artist dashboard

8. **Hybrid Search**
   - Image + text modifiers: "like this but more colorful"
   - Combined embeddings for refined results

## Success Metrics

### Launch Goals (Month 1)
- **Artists Indexed:** 400-600 (200-300 per city)
- **Portfolio Images:** 8,000-12,000
- **Search Quality:** 70%+ relevant matches (qualitative testing)
- **Performance:** Lighthouse score 90+ (all categories)
- **SEO:** 100+ artist pages indexed in Google
- **Engagement:** 3+ pages per session average
- **Conversion:** 20%+ click-through to Instagram profiles

### Growth Goals (Months 2-3)
- **User Signups:** 1,000+ registered users (post-MVP auth)
- **Saved Artists:** 5,000+ saves (avg 5 per user)
- **Claimed Profiles:** 50+ verified artists
- **Artist Engagement:** 30% of artists claiming profiles
- **Search Volume:** 500+ searches/day
- **Repeat Users:** 25% returning visitors

### Technical Benchmarks
- **Search Latency:** <500ms IVFFlat vector search
- **Page Load:** <2s LCP (Largest Contentful Paint)
- **Image Load:** <1s for thumbnails
- **Uptime:** 99.9%
- **Bundle Size:** <200KB first load

## Scope & Boundaries

### In Scope (MVP)
✅ Austin, TX + Los Angeles, CA only
✅ Public search (no login required)
✅ Instagram portfolio integration (scraping)
✅ Image + text search
✅ Artist profiles + city pages
✅ SEO-optimized style landing pages
✅ Future-proof architecture (auth tables ready, OAuth configured)

### Out of Scope (MVP)
❌ User authentication (infrastructure ready, not exposed)
❌ Artist claiming (infrastructure ready, not exposed)
❌ Booking functionality (link to Instagram DMs only)
❌ Reviews/ratings
❌ Additional cities beyond Austin + LA
❌ Artist onboarding (discovery via scraping only)
❌ Paid features/subscriptions

### Explicitly Out of Scope
🚫 Booking/scheduling platform (redirect to Instagram/shop website)
🚫 Payment processing
🚫 Artist portfolio hosting (Instagram only)
🚫 AI-generated tattoo designs
🚫 Medical/aftercare advice

## Timeline & Phases

### Phase 0: Market Analysis ✅ (Week 1 - COMPLETE)
- DataForSEO city analysis
- Competitive research
- City selection (Austin + LA)
- **Status:** Complete (Dec 29, 2025)

### Phase 1: Infrastructure Setup (Weeks 1-2)
- Supabase project + pgvector
- Cloudflare R2 configuration
- Next.js project initialization
- Instagram OAuth configuration (for post-MVP)

### Phase 2: Artist Discovery (Weeks 2-3)
- Google Maps API: 200-300 shops per city
- Website scraping: artist rosters
- Instagram validation: handle + user ID extraction
- Manual curation: 400-600 verified artists

### Phase 3: Instagram Scraping (Weeks 3-4)
- Apify integration: 20-50 images per artist
- Image processing: WebP thumbnails (3 sizes)
- R2 upload: ~8,000-12,000 images
- Error handling + resumability

### Phase 4: Embedding Generation (Weeks 4-5)
- Modal.com GPU setup (OpenCLIP ViT-L-14)
- Batch processing: 100 images/batch
- IVFFlat index creation (lists = 100)
- Performance tuning (<500ms target)

### Phase 5: Search Flow (Weeks 5-6)
- Landing page with multi-modal search
- Search API (image + text embeddings)
- Results page with artist cards
- Vector similarity search integration

### Phase 6: Browse & Profiles (Weeks 6-7)
- City browse pages (Austin, LA)
- Artist profile pages (400-600 pages)
- SEO metadata + JSON-LD
- Style landing pages (20 pages)

### Phase 7: SEO & Performance (Weeks 7-8)
- Sitemap + robots.txt
- Image optimization (WebP, lazy loading)
- ISR with 24h revalidation
- Analytics setup (GA4)

### Phase 8: Launch (Week 8)
- Testing (manual, mobile, cross-browser)
- Vercel production deployment
- Google Search Console submission
- Performance monitoring

### Post-MVP (Weeks 9-12)
- User authentication (Instagram OAuth)
- Saved artists feature
- Artist claiming & verification
- Artist dashboard

## Technical Constraints

### Performance Requirements
- Vector search: <500ms (IVFFlat with city filtering)
- Page load: <2s LCP
- Image thumbnails: <1s load
- First load bundle: <200KB
- Database: <100ms for non-vector queries

### Data Constraints
- Instagram public data only (respect TOS)
- 20-50 images per artist (representative sample)
- Monthly re-scraping for freshness
- Artist opt-out mechanism (post-MVP claiming)

### Infrastructure Constraints
- Supabase free tier (MVP) → Pro ($25/mo) for post-MVP
- Cloudflare R2: ~35GB for 2 cities
- Modal.com GPU: Pay-per-second (~$0.30 per city)
- Vercel hobby (MVP) → Pro ($20/mo) for post-MVP

### Legal Constraints
- Fair use for search indexing (transformative use)
- Attribution in database (Instagram URLs preserved)
- DMCA takedown process (artist claiming enables control)
- Privacy: No personal data collection without auth

## Business Constraints

### Budget
- **MVP Launch:** ~$60-110 one-time + $6-11/month
  - City discovery: $10-20 (Google Maps API)
  - Scraping: $40-80 (Apify for 2 cities)
  - Embeddings: $0.60 (Modal GPU)
  - Monthly: $6-11 (R2 storage + re-scraping)

- **Post-MVP (10 Cities):** ~$98/month recurring
  - Supabase Pro: $25/mo
  - Vercel Pro: $20/mo
  - R2: $2.63/mo
  - Re-scraping: $50/mo

### Resource Limitations
- Solo developer (RB)
- No marketing budget initially (organic SEO only)
- Manual curation for MVP (no artist self-onboarding yet)

### Timeline Constraints
- 8 weeks to MVP launch (target)
- 4 additional weeks to post-MVP auth features
- Must validate market fit before expanding beyond 2 cities

## Risks & Assumptions

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vector search slow at scale | Medium | High | IVFFlat indexing, city filtering, tune `lists` parameter as data grows |
| Instagram rate limiting | Medium | Medium | Use Apify managed service, slow scraping (1 req/2s), exponential backoff |
| Poor embedding quality | Low | High | Use latest CLIP model (ViT-L-14), filter low similarity (<0.7), manual curation |
| Auth integration complexity | Low | Medium | Set up Supabase Auth early (even if unused in MVP), test OAuth before launch |

### Legal/Ethical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Instagram TOS violation | Low | Critical | Only scrape public data, use Apify (managed), implement artist opt-out, allow claiming |
| Copyright concerns | Low | High | Fair use for search indexing, attribution in DB, opt-out mechanism, claiming gives control |
| Artist complaints | Medium | Medium | Artist claiming enables control, clear attribution, removal process |

### Market Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low search quality | Low | Critical | CLIP is proven, manual curation, filter threshold tuning |
| No user demand | Low | High | Market analysis validates (250k+ searches/month/city) |
| Competitor launches similar | Medium | Medium | Speed to market (8 weeks), visual search gap validated |
| Artists refuse to claim | Medium | Low | Profiles exist unclaimed (still valuable for users), manual outreach |

### Key Assumptions
✅ **Validated Assumptions:**
- Market demand exists (254k-269k searches/month per city)
- Visual search gap is real (low competition on inspiration queries)
- CLIP embeddings work for tattoo style matching (industry-proven)
- Instagram is primary portfolio platform for artists

⚠️ **Unvalidated Assumptions:**
- Users prefer image search over taxonomy (hypothesis)
- 70%+ search relevance is achievable (needs testing)
- Artists will claim profiles post-MVP (needs validation)
- SEO strategy will drive organic traffic (standard playbook)

## Competitive Advantage

### Our Differentiators
1. **Visual Search:** No competitor offers image-based artist discovery
2. **User Language:** Natural language + images vs forced taxonomy
3. **CLIP Multimodal:** Single vector space for image + text search
4. **SEO Auto-Generation:** Style pages from embeddings (no manual tagging)
5. **Speed to Market:** 8-week MVP vs traditional development

### Competitor Analysis
| Competitor | Focus | Weakness | Our Advantage |
|------------|-------|----------|---------------|
| inkzup.com | Booking | No discovery, taxonomy dropdowns | Visual search, better UX |
| Individual shops | Own artists only | Fragmented, poor SEO | Aggregation, city-wide discovery |
| Pinterest | Inspiration | Not artist-specific | Direct artist connection |
| Instagram | Portfolio hosting | Manual search, hashtag-dependent | Intelligent similarity search |

### Market Opportunity
- **Gap Identified:** No visual search platform exists (Dec 29, 2025 analysis)
- **Keyword Difficulty:** 0/100 across all cities (easy to rank)
- **Competition Level:** 46-67% (moderate, beatable)
- **Growth Trend:** 9-16 keywords trending up per city (growing market)
- **Search Intent:** Strong commercial intent ("tattoo artist near me", "tattoo [city]")

## Vision & Long-Term Goals

### 6-Month Vision
- 10 cities indexed (Austin, LA, Chicago, NYC, Miami, Portland, Seattle, Denver, Denver, San Diego)
- 2,000+ artists
- 40,000+ portfolio images
- 5,000+ registered users
- 100+ claimed/verified artist profiles
- Hybrid search (image + text modifiers)

### 12-Month Vision
- 25+ cities (top US markets)
- 10,000+ artists
- 50,000+ users
- 500+ claimed artist profiles
- Artist dashboard with analytics
- Mobile app (React Native)
- Monetization: Featured placements, verified badges for artists

### Future Features (Beyond 12 Months)
- International expansion (UK, Canada, Australia)
- Style trend analysis ("geometric is trending in Austin")
- Artist recommendations ("Based on your saves")
- Collaboration matching (artists + clients)
- Virtual consultations integration
- API for third-party integrations

---

**Bottom Line:** We're building the Google Images for tattoo artist discovery. Upload a vibe, find your artist, skip the jargon.
