---
Last-Updated: 2026-01-04
Maintainer: RB
Status: Active
---

# Inkdex Marketing Strategy

## Overview

Multi-format Instagram marketing strategy to grow artist adoption through:
1. **Solo Features** - Individual artist spotlights with Pro offer
2. **Design Twins** - Pair posts showcasing style-similar artists
3. **Style Spotlights** - Weekly deep-dives featuring 6 artists per style

All campaigns target mid-tier tattoo artists (10k-50k followers), offering 3 months free Pro when they claim their profile.

## Why This Approach

- **Mid-tier artists (10k-50k)** are established enough to have influence but not so big they ignore DMs
- **3-month Pro offer** gives enough time to demonstrate value without being permanent
- **Feature-first approach** leads with value (exposure) before asking for anything
- **Multiple formats** keep content fresh and test what resonates

---

# Campaign Type 1: Solo Features

Individual artist spotlight posts - the foundation of outreach.

## Selection Criteria

| Criteria | Value | Rationale |
|----------|-------|-----------|
| Followers | 10,000 - 50,000 | Sweet spot for engagement |
| Location | Top 50 cities | Focus on markets with coverage |
| Status | Unclaimed | Only reach out to non-members |
| Portfolio | 4+ images with embeddings | Need content for post |
| Style | Diverse | Avoid clustering |

## Post Format

- **Images:** Top 4 portfolio images (by likes)
- **Caption:** Professional, minimal, no emojis
- **Template:** `Discover @{handle}'s work on Inkdex. {City} based, specializing in {style}.`

## DM Template

```
Hey! We featured your work on Inkdex today. Check it out: {profile_url}

We'd love to have you claim your profile - you'll get 3 months of Pro free (auto-sync, analytics, unlimited portfolio).

Let me know if you have any questions!
```

## Workflow

1. Select candidates via admin or script
2. Generate post content
3. Queue to Buffer (manual or via Zapier webhook)
4. Post to Instagram
5. Send DM within 1-2 hours
6. Track claim/conversion

---

# Campaign Type 2: Design Twins

Pair posts featuring two artists with visually similar styles. Leverages Inkdex's AI similarity matching.

## Why Twins Work

- Doubles outreach opportunity per post
- Creates natural conversation starter
- Showcases platform's AI capabilities
- Encourages cross-pollination of audiences

## Selection Criteria

| Criteria | Value | Rationale |
|----------|-------|-----------|
| Similarity Score | > 0.85 | Must be visually obvious |
| Different Cities | Required | Avoid local competition tension |
| Follower Parity | Within 2x | Neither artist overshadowed |
| Both Unclaimed | Preferred | Double conversion opportunity |

## How to Find Twins

Use average portfolio embeddings per artist, then compute cosine similarity between artist pairs. Filter for different cities and similar follower counts.

## Post Format

**Carousel (4-6 slides):**
1. Split image: Best work from each artist
2. Artist A highlight (2 images)
3. Artist B highlight (2 images)
4. CTA: "Find your style twin on Inkdex"

**Caption:** `Style twins: @{handle_a} ({city_a}) meets @{handle_b} ({city_b}). Both specialize in {shared_style}. Discover more artists like them on Inkdex.`

## DM Template (send to both)

```
Hey! We featured you alongside @{other_handle} as "Design Twins" - artists with similar visual styles.

Check it out: {post_url}

Your Inkdex profile: {profile_url}
Claim it for 3 months free Pro (auto-sync, analytics, unlimited portfolio).
```

---

# Campaign Type 3: Style Spotlights

Weekly deep-dive posts featuring 4-6 artists who excel in a specific style. Educational content that positions Inkdex as a style authority.

## Style Categories

- Fine Line
- Blackwork
- Traditional American
- Neo-Traditional
- Japanese/Irezumi
- Realism/Portrait
- Watercolor
- Geometric/Dotwork
- Illustrative
- Ornamental/Mandala
- Tribal/Polynesian
- Micro/Single Needle

## Post Format

**Carousel (8-10 slides):**
1. Style name + definition
2-7. Artist features (1 image + handle + city each)
8. CTA: "Explore {style} artists on Inkdex"

**Caption:**
```
{Style} Spotlight: 6 artists mastering the art of {style description}.

Featured:
@{handle_1} - {city_1}
@{handle_2} - {city_2}
...

Discover {style} artists near you: inkdex.io/search?style={style_slug}
```

## Style Detection

Detect via:
- Bio keywords (e.g., "fine line", "blackwork")
- Image classification tags (if available)
- Manual curation for accuracy

---

# Content Calendar

## Weekly Schedule

| Day | Post Type | Notes |
|-----|-----------|-------|
| Mon-Fri | Solo Feature | 5 posts/week |
| Saturday | Design Twins | Higher weekend engagement |
| Sunday | Style Spotlight | Educational content |

**Weekly Total:** 7 posts, reaching 10-12 artists

## Monthly Targets

| Metric | Target |
|--------|--------|
| Posts | 28-30 |
| Artists Contacted | 40-50 |
| Profile Claims | 10-15 (25-30% rate) |
| Pro Conversions | 8-12 |

## Style Spotlight Rotation

| Month | Week 1 | Week 2 | Week 3 | Week 4 |
|-------|--------|--------|--------|--------|
| Jan | Fine Line | Blackwork | Traditional | Realism |
| Feb | Neo-Trad | Japanese | Watercolor | Geometric |
| Mar | Illustrative | Ornamental | Tribal | Micro |

Repeat quarterly, adjusting based on engagement.

---

# Pro Offer Details

## What They Get (3 Months Free)

- Auto-sync from Instagram (daily updates)
- Analytics dashboard (profile views, search appearances)
- Unlimited portfolio images (vs 20 for free)
- Up to 20 locations (vs 1 for free)
- Priority in search results (+5% boost)
- Pro badge on profile

## After 3 Months

- Stripe subscription required to continue
- Or gracefully downgrade to free tier
- Keep all content, lose Pro features

## Auto-Grant Logic

When an artist with a pending outreach record claims their profile:
1. System detects the outreach record
2. Auto-grants Pro subscription (3 months)
3. Creates subscription record with promo code `OUTREACH_3MO_FREE`
4. Updates outreach record with claim/grant timestamps

---

# Admin Dashboard

## URL

`/admin/marketing`

## Funnel Metrics

Track conversion through stages:
```
Pending → Generated → Posted → DM Sent → Claimed → Converted
```

## Action Queues

- **Ready to Post:** Generated posts awaiting Instagram posting
- **Pending DMs:** Posted but not yet DM'd
- **Recent Claims:** Artists who claimed with Pro grant status

## Tools

- Select New Candidates (batch)
- Generate Posts (batch)
- Mark as Posted / Mark DM Sent
- View/find Design Twins
- Generate Style Spotlights

---

# Buffer/Zapier Integration

## Flow

1. Generate post in admin
2. Webhook fires to Zapier (if configured)
3. Zapier catches → adds to Buffer queue
4. Buffer posts at scheduled time
5. Admin marks as posted, sends DM

## Manual Fallback

Export directory contains:
- `caption.txt`
- `images.txt` (URLs)
- `dm_template.txt`
- `metadata.json`

Copy/paste to Buffer or post directly.

---

# Success Metrics

## Primary KPIs

| Metric | Target |
|--------|--------|
| Claim Rate | 20-30% of DM'd artists |
| Response Rate | 30-40% of DM'd artists |
| Pro Retention | TBD (after 3 months) |

## Twins-Specific

| Metric | Target |
|--------|--------|
| Dual Claim Rate | 10% (both claim) |
| Single Claim Rate | 35% (at least one) |

## Engagement Tactics

**After posting:**
1. Like recent posts from featured artists
2. Save post to relevant collections
3. Share to stories
4. Respond to comments within 2 hours

**DM timing:**
- Solo: Within 1 hour of posting
- Twins: Both artists within 30 min of each other
- Spotlight: Batch DMs within 2 hours

---

# Database

## Table: `marketing_outreach`

Tracks individual artist outreach records.

**Key columns:**
- `artist_id` - Reference to artists table
- `campaign_name` - Campaign identifier
- `status` - Workflow stage (pending/generated/posted/dm_sent/claimed/converted)
- `post_text`, `post_images` - Generated content
- `dm_sent_at`, `claimed_at`, `pro_granted_at` - Timestamps
- `paired_artist_id` - For twins posts
- `similarity_score` - For twins posts

**Status flow:**
`pending` → `generated` → `posted` → `dm_sent` → `claimed` → `converted`

---

# Implementation Status

## Phase 1: Solo Features (Current)
- [x] Database schema (`marketing_outreach` table)
- [x] Selection script (`select-outreach-candidates.ts`)
- [x] Post generation script (`generate-outreach-post.ts`)
- [x] Auto-Pro grant on claim (in onboarding finalize)
- [ ] Admin dashboard
- [ ] Zapier webhook integration

## Phase 2: Design Twins (Next)
- [ ] Twins finding algorithm
- [ ] Twins generation script
- [ ] Admin UI for twins
- [ ] Paired outreach tracking

## Phase 3: Style Spotlights (Future)
- [ ] Style detection improvements
- [ ] Spotlight generation script
- [ ] Multi-artist DM batching

---

# Troubleshooting

## No candidates found
- Check follower range (10k-50k)
- Verify city coverage in database
- Ensure artists have 4+ embedded images

## Webhook not firing
- Check `ZAPIER_BUFFER_WEBHOOK_URL` env var
- Verify Zap is enabled in Zapier
- Check Zapier task history for errors

## Artist didn't get Pro
- Verify outreach record exists for artist_id
- Check `claimed_at` was NULL before claim
- Review onboarding finalize logs

---

# Related Files

- `scripts/marketing/select-outreach-candidates.ts`
- `scripts/marketing/generate-outreach-post.ts`
- `supabase/migrations/20260104_002_marketing_outreach.sql`
- `supabase/migrations/20260104_003_marketing_workflow.sql`
- `app/api/onboarding/finalize/route.ts` (auto-Pro grant)
- `app/admin/(authenticated)/marketing/page.tsx` (planned)
- `lib/marketing/zapier-webhook.ts` (planned)
