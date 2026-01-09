# Google Ads Bulk Upload Files

Generated: January 9, 2026
Budget: $250 total ($18/day)
Strategy: Maximize Clicks

## Files (Import in Order)

| File | Contents |
|------|----------|
| `campaign.csv` | 1 Search campaign with geo-targeting |
| `ad_groups.csv` | 14 ad groups with Max CPC bids |
| `keywords.csv` | 63 keywords (Exact + Phrase match) |
| `responsive_search_ads.csv` | 14 RSAs (15 headlines + 4 descriptions each) |

## Import Instructions

1. Open [Google Ads Editor](https://ads.google.com/home/tools/ads-editor/)
2. Sign into your account
3. Go to **Account > Import > From file**
4. Import files in order:
   - `campaign.csv`
   - `ad_groups.csv`
   - `keywords.csv`
   - `responsive_search_ads.csv`
5. Review changes
6. Click **Post** to upload

## Campaign Structure

```
Inkdex - Tattoo Search ($18/day, Maximize Clicks)
├── Fargo ND (Max CPC: $0.90)
│   ├── tattoo shop fargo (Exact)
│   ├── tattoo artist fargo (Exact)
│   ├── tattoo parlor fargo (Exact)
│   ├── tattoo shop fargo (Phrase)
│   └── fargo tattoo artists (Phrase)
├── Greenville SC ($0.95)
├── Richmond VA ($1.35)
├── Sioux Falls SD ($1.55)
├── Nashville TN ($1.85)
├── Lubbock TX ($1.50)
├── Amarillo TX ($1.25)
├── Fort Collins CO ($1.95)
├── Syracuse NY ($0.85)
├── Albany NY ($0.95)
├── Duluth MN ($1.10)
├── Huntsville AL ($1.40)
├── Lawrence KS ($0.75)
└── Norman OK ($1.45)
```

## URL Structure

Landing pages: `https://inkdex.io/us/{state}/{city}`

| City | URL |
|------|-----|
| Fargo, ND | `https://inkdex.io/us/nd/fargo` |
| Nashville, TN | `https://inkdex.io/us/tn/nashville` |
| Sioux Falls, SD | `https://inkdex.io/us/sd/sioux-falls` |
| Fort Collins, CO | `https://inkdex.io/us/co/fort-collins` |

## Budget Allocation

| City | Avg CPC | Max CPC |
|------|---------|---------|
| Fargo, ND | $0.77 | $0.90 |
| Greenville, SC | $0.82 | $0.95 |
| Syracuse, NY | $0.68 | $0.85 |
| Albany, NY | $0.82 | $0.95 |
| Duluth, MN | $0.94 | $1.10 |
| Amarillo, TX | $1.10 | $1.25 |
| Richmond, VA | $1.19 | $1.35 |
| Huntsville, AL | $1.23 | $1.40 |
| Norman, OK | $1.31 | $1.45 |
| Lubbock, TX | $1.36 | $1.50 |
| Sioux Falls, SD | $1.42 | $1.55 |
| Nashville, TN | $1.70 | $1.85 |
| Fort Collins, CO | $1.81 | $1.95 |
| Lawrence, KS | $0.58 | $0.75 |

## Post-Launch Checklist

- [ ] Verify conversion tracking (profile views, Instagram clicks)
- [ ] Check search terms report after 48 hours
- [ ] Add negative keywords if needed
- [ ] Pause keywords with CTR < 1% after 1 week
- [ ] Increase bids on high-performing keywords

## Expected Results

| Metric | Target | Stretch |
|--------|--------|---------|
| Monthly Clicks | 400 | 500 |
| Avg CPC | $1.25 | $1.00 |
| CTR | 2% | 4% |
| Profile Views | 40% of clicks | 60% |
