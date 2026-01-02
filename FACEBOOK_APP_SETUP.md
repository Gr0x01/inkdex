# Facebook App Setup for Instagram OAuth

## Current Issue

The app is rejecting Instagram-specific permissions (`instagram_basic`, `instagram_content_publish`) because they require either:
1. App Review approval, OR
2. Special configuration for development testing

## Solution Options

### Option 1: Add Instagram Graph API Product (Recommended)

1. **Go to Facebook App Dashboard:**
   - Visit: https://developers.facebook.com/apps/855872227048362/

2. **Add Instagram Graph API:**
   - In left sidebar, click "+ Add Product"
   - Find "Instagram Graph API" (NOT "Instagram Basic Display")
   - Click "Set Up"

3. **Enable Development Mode Permissions:**
   - Go to "App Settings" → "Basic"
   - Ensure app is in "Development" mode
   - Add yourself as an Admin/Developer in "Roles" → "Roles"

4. **Add Test Users (for development):**
   - Go to "Roles" → "Test Users"
   - Add the Instagram Business account you want to test with
   - Test users can use permissions without App Review

5. **Request Permissions (for production later):**
   - Go to "App Review" → "Permissions and Features"
   - Request these permissions:
     - `instagram_basic`
     - `instagram_content_publish`
     - `pages_show_list`
   - Submit for review when ready to go live

---

### Option 2: Use Facebook Login Only (for initial testing)

**Current Setup:**
The OAuth flow now uses basic Facebook permissions:
- `public_profile` - Get user's name, profile picture
- `email` - Get user's email address
- `pages_show_list` - List Facebook Pages the user manages

**Test this first:**
1. Visit: `http://localhost:3000/api/auth/instagram?redirect=/dashboard`
2. Approve the Facebook login
3. Verify the basic flow works

**Limitations:**
- Can't access Instagram Business account data yet
- Can't get Instagram username/profile
- Will need to upgrade to Instagram Graph API for full functionality

---

## Instagram Graph API Requirements

**Important:** Instagram Graph API only works with:
- ✅ **Instagram Business accounts** (connected to a Facebook Page)
- ✅ **Instagram Creator accounts** (connected to a Facebook Page)
- ❌ **Personal Instagram accounts** (NOT supported)

**To convert to Business/Creator:**
1. Open Instagram app
2. Go to Settings → Account → Switch to Professional Account
3. Choose Business or Creator
4. Connect to a Facebook Page (create one if needed)

---

## Testing Workflow

### Phase 1: Test Basic Facebook OAuth
```bash
# Visit this URL in browser
http://localhost:3000/api/auth/instagram?redirect=/dashboard

# Expected result:
# - Facebook login dialog
# - Permissions: public_profile, email, pages_show_list
# - Success → Redirects to /dashboard
```

### Phase 2: Add Instagram Permissions
After adding Instagram Graph API product:

1. Update scopes in `/app/api/auth/instagram/route.ts`:
   ```typescript
   scope: 'public_profile,email,pages_show_list,instagram_basic,instagram_content_publish'
   ```

2. Test again - should now access Instagram Business account

### Phase 3: Verify in Database
```sql
-- Check user was created with Instagram data
SELECT
  id,
  instagram_id,
  instagram_username,
  account_type,
  instagram_token_vault_id,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 1;

-- Check token is encrypted in Vault
SELECT
  id,
  name,
  description,
  created_at
FROM vault.secrets
WHERE name LIKE 'instagram_tokens_%'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Next Steps

1. **Choose an option above** (Option 1 recommended for full Instagram access)
2. **Test with basic Facebook login** first to verify OAuth flow works
3. **Add Instagram Graph API product** when ready to access Instagram data
4. **Submit for App Review** when ready to go live (required for non-test users)

---

## Troubleshooting

**"Invalid Scopes" Error:**
- App doesn't have Instagram Graph API product added
- Permissions not enabled in App Dashboard
- User is not an Admin/Developer/Test User of the app

**"No Instagram Business Account" Error:**
- User's Instagram account is not Business/Creator type
- Instagram account not connected to a Facebook Page
- User hasn't granted `pages_show_list` permission

**"Token Exchange Failed" Error:**
- `client_id` or `client_secret` mismatch in .env.local
- Redirect URI not configured in Facebook App settings
