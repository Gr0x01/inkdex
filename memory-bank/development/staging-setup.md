---
Last-Updated: 2026-01-11
Maintainer: RB
Status: Active
---

# Staging Environment Setup

## Overview

The `staging` branch deploys to a Vercel preview URL for testing changes before production.

**Key difference from production:** Uses Stripe TEST MODE keys so you can test payments without real charges.

---

## Vercel Configuration

### Step 1: Preview Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

Add these variables with **Preview** environment selected (not Production):

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://inkdex-staging.vercel.app` | Or your actual preview URL |
| `STRIPE_SECRET_KEY` | `sk_test_...` | From Stripe Dashboard (Test mode) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | From Stripe Dashboard (Test mode) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe (see Step 2) |
| `STRIPE_PRICE_MONTHLY` | `price_test_...` | Test mode price ID |
| `STRIPE_PRICE_YEARLY` | `price_test_...` | Test mode price ID |

**Keep the same as Production:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCRAPINGDOG_API_KEY`
- `RESEND_API_KEY`
- `REDIS_URL`
- All other env vars

> **Warning:** Staging shares the production database. Any data modifications
> (create/update/delete) will affect real users. Test carefully and avoid
> destructive operations. Scraping API calls also count against production quota.

### Step 2: Get Your Preview URL

After pushing to `staging`, Vercel will deploy and give you a preview URL like:
- `https://inkdex-git-staging-username.vercel.app`

Or you can set up a custom domain alias in Vercel for consistency:
- `https://staging.inkdex.io`

---

## Stripe Test Mode Setup

### Step 1: Switch to Test Mode

In Stripe Dashboard, toggle **Test mode** (top right corner).

### Step 2: Create Test Prices

If you don't have test prices already:
1. Go to Products → Add Product
2. Create "Pro Monthly" with price `$15/month`
3. Create "Pro Yearly" with price `$150/year`
4. Copy the `price_test_...` IDs

### Step 3: Create Test Webhook

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-STAGING-URL/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the signing secret (`whsec_...`)

### Step 4: Test Cards

Use these test card numbers in staging:
| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Insufficient funds |

Any future date, any CVC.

---

## Workflow

### Testing New Features

1. Create feature branch from `main`
2. Develop and test locally
3. Push to `staging` branch
4. Test on staging URL with Stripe test mode
5. If good, merge to `main` for production

### Commands

```bash
# Switch to staging
git checkout staging

# Merge feature into staging for testing
git merge feature/my-feature

# Push to deploy preview
git push

# After testing, merge to main
git checkout main
git merge staging
git push
```

---

## Verification Checklist

- [ ] Staging branch exists on GitHub
- [ ] Vercel deploys preview on push to staging
- [ ] Preview env vars configured (Stripe test keys)
- [ ] Stripe test webhook created
- [ ] Can complete test checkout on staging URL
