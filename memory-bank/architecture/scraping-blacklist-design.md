---
Last-Updated: 2026-01-03
Maintainer: RB
Status: Implemented
---

# Scraping Blacklist & Failure Management

## Problem

The scraper was retrying all 572 failed artists every time "Start Scraping" was clicked, wasting resources on accounts that will persistently fail (private, deleted, rate-limited, etc.).

## Solution

**Three-tier failure management:**

1. **Automatic exclusion** - Failed jobs excluded from main scraping
2. **Retry tracking** - Track how many times each artist has failed
3. **Auto-blacklist** - Permanently exclude artists after 3 failures

## Database Schema

### New Fields on `artists` table

```sql
scraping_blacklisted BOOLEAN DEFAULT FALSE
blacklist_reason TEXT
blacklisted_at TIMESTAMPTZ
```

### New Field on `scraping_jobs` table

```sql
retry_count INTEGER DEFAULT 0
```

## Auto-Blacklist Logic

**Trigger:** `check_and_blacklist_artist()`

When a scraping job fails:
1. Count total failures for that artist
2. If failures >= 3, automatically blacklist:
   - Set `scraping_blacklisted = TRUE`
   - Record reason + timestamp
   - Log to database

**Example reasons for blacklist:**
- Private Instagram account
- Account deleted/suspended
- Repeated rate limiting
- Invalid profile data
- Persistent Apify errors

## Scraper Behavior

### Main "Start Scraping" Button

**Includes:**
- Artists never scraped
- Artists with `status = 'pending'`

**Excludes:**
- Completed jobs (`status = 'completed'`)
- Failed jobs (`status = 'failed'`) ← **New**
- Blacklisted artists (`scraping_blacklisted = TRUE`) ← **New**
- Private accounts (`instagram_private = TRUE`)

### "Retry 572 Failed" Button

**Includes:**
- Only artists with `status = 'failed'`
- **Excludes blacklisted** (no point retrying if auto-blacklisted)

**Use case:** Manual retry for transient failures (network issues, temporary API outages)

## Migration Behavior

The migration (`20260103_scraping_blacklist.sql`) auto-blacklists existing artists with 3+ failures:

```sql
UPDATE artists a
SET scraping_blacklisted = TRUE,
    blacklist_reason = 'Exceeded 3 failed scraping attempts (auto-blacklisted during migration)',
    blacklisted_at = NOW()
WHERE a.id IN (
    SELECT artist_id
    FROM scraping_jobs
    WHERE status = 'failed'
    GROUP BY artist_id
    HAVING COUNT(*) >= 3
);
```

**Expected result:** ~572 failed artists analyzed, some blacklisted if they had 3+ failures.

## Admin UI (Future Enhancement)

**Recommended features:**

1. **Blacklist Management Page** (`/admin/blacklist`)
   - View all blacklisted artists
   - See blacklist_reason for each
   - Manually unblacklist (if account becomes public)
   - Manually blacklist (for spam/inappropriate accounts)

2. **Dashboard Stats**
   - Total blacklisted count
   - Blacklist rate (% of total artists)
   - Most common blacklist reasons

3. **Scraping Jobs Table Enhancement**
   - Show retry_count column
   - Warning badge if retry_count >= 2 (approaching blacklist)
   - Link to unblacklist artist

## Query Examples

### Get all blacklisted artists
```sql
SELECT
    id,
    name,
    instagram_handle,
    blacklist_reason,
    blacklisted_at
FROM artists
WHERE scraping_blacklisted = TRUE
ORDER BY blacklisted_at DESC;
```

### Get artists close to blacklist (2 failures)
```sql
SELECT
    a.id,
    a.name,
    a.instagram_handle,
    COUNT(sj.id) as failure_count
FROM artists a
JOIN scraping_jobs sj ON sj.artist_id = a.id
WHERE sj.status = 'failed'
AND (a.scraping_blacklisted IS NULL OR a.scraping_blacklisted = FALSE)
GROUP BY a.id, a.name, a.instagram_handle
HAVING COUNT(sj.id) = 2
ORDER BY a.name;
```

### Manually unblacklist an artist
```sql
UPDATE artists
SET
    scraping_blacklisted = FALSE,
    blacklist_reason = NULL,
    blacklisted_at = NULL
WHERE instagram_handle = 'example_artist';
```

### Manually blacklist an artist
```sql
UPDATE artists
SET
    scraping_blacklisted = TRUE,
    blacklist_reason = 'Manual blacklist: inappropriate content',
    blacklisted_at = NOW()
WHERE instagram_handle = 'spam_account';
```

## Configuration

**Retry limit:** 3 failures (configurable in migration, line 15)

To change:
```sql
max_retries INTEGER := 3; -- Change to 5 for more retries
```

## Benefits

1. **Resource Efficiency:** No longer waste API credits retrying 572 failed artists
2. **Clean Separation:** Main scraping focuses on new artists, retry button for transient failures
3. **Automatic Management:** No manual intervention needed for persistent failures
4. **Transparency:** Blacklist reason logged for debugging
5. **Reversible:** Can manually unblacklist if account becomes public

## Metrics to Monitor

- Blacklist rate: Should stabilize at ~5-10% of total artists
- Retry counts: Most jobs should have retry_count = 0-1
- Failure reasons: Use `blacklist_reason` to identify systemic issues

## Future Enhancements

1. **Configurable retry limits** per failure type (private account = 1 retry, API error = 5 retries)
2. **Automatic unblacklist** if account becomes public (poll Instagram API)
3. **Blacklist categories** (private, deleted, spam, inappropriate)
4. **Notification system** when artist gets blacklisted (email to admin)
5. **Analytics:** Track which failure reasons are most common

---

**Implementation Date:** 2026-01-03
**Migration:** `20260103_scraping_blacklist.sql`
**Files Modified:**
- `scripts/scraping/apify-scraper.py` (updated query to exclude failed + blacklisted)
