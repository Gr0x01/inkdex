# Email System Documentation

## Overview

Transactional email system using **Resend** + **React Email** for professional HTML emails.

## Quick Start

### 1. Environment Setup
```bash
# Add to .env.local (never commit this file!)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Get from https://resend.com/api-keys
```

### 2. Send Test Emails
```bash
# Start dev server
npm run dev

# In another terminal, send all test emails
npm run test-emails your-email@example.com
```

### 3. Test Specific Email
```bash
curl -X POST http://localhost:3000/api/dev/test-email \
  -H "Content-Type: application/json" \
  -d '{"type": "welcome", "to": "your-email@example.com"}'
```

## Available Email Types

| Type | Trigger | Template |
|------|---------|----------|
| `welcome` | After onboarding (Free) | `templates/welcome.tsx` |
| `welcome_pro` | After onboarding (Pro) | `templates/welcome.tsx` |
| `sync_failed` | 2+ sync failures | `templates/sync-failed.tsx` |
| `sync_failed_reauth` | 3+ failures (re-auth) | `templates/sync-failed.tsx` |
| `subscription_created` | Pro activated (monthly) | `templates/subscription-created.tsx` |
| `subscription_created_annual` | Pro activated (annual) | `templates/subscription-created.tsx` |
| `downgrade_warning` | 7 days before cancellation | `templates/downgrade-warning.tsx` |

## Email Templates

### Welcome Email
**File:** `templates/welcome.tsx`
**Props:**
```typescript
{
  artistName: string;        // Artist's display name
  profileUrl: string;        // Full profile URL (e.g., https://inkdex.io/alex-rivera)
  instagramHandle: string;   // Instagram username (without @)
  isPro?: boolean;           // Pro tier flag
}
```

**Variants:**
- **Free tier:** Includes upgrade prompt, manual update tips
- **Pro tier:** Auto-sync benefits, unlimited portfolio features

### Sync Failed Email
**File:** `templates/sync-failed.tsx`
**Props:**
```typescript
{
  artistName: string;
  failureReason: string;     // User-friendly error message
  failureCount: number;      // Consecutive failures (2 or 3+)
  dashboardUrl: string;      // Dashboard link
  instagramHandle: string;
  needsReauth?: boolean;     // True if token/auth issue
}
```

**Variants:**
- **Warning (2 failures):** "We'll retry automatically..."
- **Critical (3+ failures):** "Auto-sync disabled, reconnect Instagram..."

### Subscription Created Email
**File:** `templates/subscription-created.tsx`
**Props:**
```typescript
{
  artistName: string;
  plan: 'monthly' | 'yearly';
  amount: number;            // Price (15 or 150)
  dashboardUrl: string;
  billingPortalUrl: string;  // Stripe Customer Portal
}
```

### Downgrade Warning Email
**File:** `templates/downgrade-warning.tsx`
**Props:**
```typescript
{
  artistName: string;
  endDate: string;           // Formatted date (e.g., "January 10, 2026")
  portfolioImageCount: number; // Current image count
  billingPortalUrl: string;
  dashboardUrl: string;
}
```

## API Functions

### Import
```typescript
import {
  sendWelcomeEmail,
  sendSyncFailedEmail,
  sendSubscriptionCreatedEmail,
  sendDowngradeWarningEmail,
} from '@/lib/email';
```

### Usage Examples

#### Welcome Email (Onboarding)
```typescript
const result = await sendWelcomeEmail({
  to: user.email,
  artistName: 'Alex Rivera',
  profileUrl: 'https://inkdex.io/alex-rivera',
  instagramHandle: 'alex.rivera.tattoo',
  isPro: false,
});

if (result.success) {
  console.log('Welcome email sent:', result.id);
}
```

#### Sync Failure Email
```typescript
await sendSyncFailedEmail({
  to: artist.email,
  artistName: 'Morgan Black',
  failureReason: 'Instagram authentication failed. You may need to reconnect your Instagram account.',
  failureCount: 3,
  dashboardUrl: 'https://inkdex.io/dashboard',
  instagramHandle: 'morgan.black.ink',
  needsReauth: true,
});
```

#### Non-Blocking Pattern (Recommended)
```typescript
// Send email without blocking parent operation
sendWelcomeEmail({...}).catch((error) => {
  console.error('[Operation] Failed to send email:', error);
  // Don't fail the parent operation if email fails
});
```

## Template Styling

All templates use consistent styling:

```typescript
// Colors
const colors = {
  black: '#1a1a1a',
  gray: '#404040',
  lightGray: '#8898aa',
  border: '#e5e5e5',
  background: '#ffffff',
  backgroundLight: '#f5f5f5',
  error: '#fef2f2',
  success: '#f0fdf4',
  warning: '#fffbeb',
};

// Typography
const fonts = {
  family: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  h1: '32px bold',
  h2: '20px bold',
  body: '16px regular',
  small: '14px regular',
};

// Spacing
const spacing = {
  container: '580px max-width',
  padding: '20px',
  margin: '16px',
};
```

## Testing

### Local Preview (React Email Dev)
```bash
# Install React Email CLI
npm install -g react-email

# Start preview server
npx react-email dev

# Opens http://localhost:3000 with all templates
```

### Test Endpoint
**Route:** `POST /api/dev/test-email`
**Security:** Development only (blocked in production)

**Request:**
```json
{
  "type": "welcome",
  "to": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent to test@example.com",
  "emailId": "abc123...",
  "type": "welcome"
}
```

### Test Script
```bash
# Send all email types
npm run test-emails your-email@example.com

# Output:
# 📧 Sending test emails to: your-email@example.com
# ✅ Welcome Email (Free): Sent (ID: abc123...)
# ✅ Welcome Email (Pro): Sent (ID: def456...)
# ✅ Sync Failed (Warning): Sent (ID: ghi789...)
# ✅ Sync Failed (Re-auth Required): Sent (ID: jkl012...)
# ✅ Subscription Created (Monthly): Sent (ID: mno345...)
# ✅ Subscription Created (Annual): Sent (ID: pqr678...)
# ✅ Downgrade Warning: Sent (ID: stu901...)
# ✨ Done! Check your inbox at your-email@example.com
```

## Error Handling

### Common Issues

**1. Missing API Key**
```
Error: RESEND_API_KEY environment variable is not set
```
**Fix:** Add `RESEND_API_KEY` to `.env.local`

**2. Invalid Email Address**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": { "email": "Invalid email format" }
}
```
**Fix:** Use valid email address with `@` symbol

**3. Resend API Error**
```
Failed to send email: 429 Too Many Requests
```
**Fix:** Wait 1 second between test emails (rate limit: 100/day free tier)

### Debugging

**Enable verbose logging:**
```typescript
// In lib/email/resend.ts
console.log('[EMAIL] Sending:', { to, subject, type });
console.log('[EMAIL] Result:', result);
```

**Check Resend dashboard:**
https://resend.com/emails

## Production Deployment

### Pre-Launch Checklist
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Verify inkdex.io domain in Resend dashboard
- [ ] Add SPF DNS record: `v=spf1 include:_spf.resend.com ~all`
- [ ] Add DKIM DNS record (provided by Resend)
- [ ] Test email delivery in staging
- [ ] Remove/block `/api/dev/test-email` in production

### Domain Verification
1. Log in to Resend: https://resend.com/domains
2. Add domain: `inkdex.io`
3. Copy DNS records
4. Add to domain registrar (Vercel, Cloudflare, etc.)
5. Verify in Resend dashboard

### Monitoring
- **Dashboard:** https://resend.com/emails
- **Metrics:** Delivery rate, bounce rate, spam rate
- **Logs:** View sent emails, delivery status, errors

## Cost & Limits

### Resend Free Tier
- **Emails:** 3,000/month (100/day)
- **Rate limit:** ~1 email/second
- **Features:** Full API, webhooks, analytics

### Expected Usage (MVP)
- **Welcome:** ~50/month (new artists)
- **Sync failures:** ~10/month (5% failure rate)
- **Subscriptions:** ~10/month (upgrades)
- **Total:** ~70/month (well within free tier)

### Upgrade Path
- **Pay as you go:** $0.00001 per email after 3,000
- **Pro plan:** $20/month (50,000 emails)

## Support

- **Resend docs:** https://resend.com/docs
- **React Email docs:** https://react.email/docs
- **Support email:** support@inkdex.io
- **Internal issues:** File in GitHub repo

---

**Last Updated:** January 3, 2026
**Status:** Production Ready ✅
