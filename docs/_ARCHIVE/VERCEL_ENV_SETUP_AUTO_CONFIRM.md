# Vercel Environment Variables Setup - Auto-Confirm Endpoint

## Overview

The `/api/auth/auto-confirm` endpoint requires two environment variables for security:
- `AUTO_CONFIRM_SECRET` - Server-side secret (private)
- `NEXT_PUBLIC_AUTO_CONFIRM_SECRET` - Client-side secret (public, same value)

## Local Development (.env.local)

The environment variables have been automatically added to your `.env.local` file. If you need to add them manually:

```bash
# Generate a secure random secret (32 characters)
AUTO_CONFIRM_SECRET=your_generated_secret_here
NEXT_PUBLIC_AUTO_CONFIRM_SECRET=your_generated_secret_here
```

**Important:** Both variables must have the **same value**.

## Vercel Setup Instructions

### Step 1: Access Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Or use direct URL: `https://vercel.com/[your-team]/[your-project]/settings/environment-variables`

### Step 2: Add Environment Variables

Add the following two variables:

#### Variable 1: AUTO_CONFIRM_SECRET
- **Name:** `AUTO_CONFIRM_SECRET`
- **Value:** (Use the same secret from your `.env.local` file)
- **Environment:** 
  - ✅ Production
  - ✅ Preview
  - ✅ Development

#### Variable 2: NEXT_PUBLIC_AUTO_CONFIRM_SECRET
- **Name:** `NEXT_PUBLIC_AUTO_CONFIRM_SECRET`
- **Value:** (Same value as `AUTO_CONFIRM_SECRET`)
- **Environment:**
  - ✅ Production
  - ✅ Preview
  - ✅ Development

### Step 3: Generate Secret (if needed)

If you need to generate a new secret, you can use:

```bash
# Using OpenSSL (recommended)
openssl rand -hex 16

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Step 4: Verify Setup

After adding the variables:

1. **Redeploy your application** (Vercel will automatically redeploy if you have auto-deploy enabled)
2. **Test the endpoint** by attempting a signup
3. **Check logs** for any authentication errors

## Security Notes

- **Both variables must have the same value** - The client-side code needs to pass the secret to the server
- **Keep the secret secure** - While `NEXT_PUBLIC_*` variables are exposed in client code, the secret is still required for the endpoint to work
- **Additional security measures:**
  - The endpoint also verifies authenticated sessions
  - When using secret key, it verifies userId matches email
  - It checks that accounts were created recently (within 5 minutes)

## Troubleshooting

### Error: "Auto-confirm endpoint not configured"
- **Cause:** `AUTO_CONFIRM_SECRET` is not set in Vercel
- **Fix:** Add `AUTO_CONFIRM_SECRET` to Vercel environment variables

### Error: "Unauthorized - invalid secret"
- **Cause:** `NEXT_PUBLIC_AUTO_CONFIRM_SECRET` doesn't match `AUTO_CONFIRM_SECRET`
- **Fix:** Ensure both variables have the exact same value

### Error: "Account must be created within last 5 minutes"
- **Cause:** Trying to auto-confirm an old account
- **Fix:** This is expected behavior - only newly created accounts (within 5 minutes) can be auto-confirmed with the secret key

## Quick Setup Script

You can also use the provided script to add variables locally:

```bash
./scripts/add-auto-confirm-env.sh
```

Then copy the generated values to Vercel.
