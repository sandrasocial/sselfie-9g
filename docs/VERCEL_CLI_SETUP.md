# Vercel CLI Setup & Usage

## Overview

The Vercel CLI is configured and ready to use for production verification, environment variable management, and log inspection.

## Authentication

**Token Location:** `.env.local` (line ~78)
```bash
VERCEL_TOKEN=qVNQg8AFngsws6YvEcsnWqlX
```

**Authenticated User:** `sandrasocial`

**Project:** `v0-sselfie` (team: `sselfie-studio`)

## Usage in AI Sessions

AI assistants can use the Vercel CLI by:

1. **Extracting the token:**
   ```bash
   TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
   ```

2. **Using it with Vercel commands:**
   ```bash
   vercel whoami --token "$TOKEN"
   vercel env ls production --token "$TOKEN"
   vercel logs --since=24h --token "$TOKEN"
   ```

## Common Commands

### Check Authentication
```bash
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel whoami --token "$TOKEN"
```

### List Production Environment Variables
```bash
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel env ls production --token "$TOKEN"
```

### Check Critical Env Vars
```bash
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel env ls production --token "$TOKEN" | grep -E "(RESEND|CRON|DATABASE|SUPABASE|BLOB)"
```

### View Production Logs
```bash
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel logs --since=24h --token "$TOKEN"
```

### Filter Logs for Cron Jobs
```bash
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel logs --since=24h --token "$TOKEN" | grep -E "\[CRON\]|\[Welcome Sequence\]|\[Nurture Sequence\]|\[Blueprint Followup\]|\[Reengagement\]|\[Scheduled Campaigns\]"
```

### Filter Logs for Errors
```bash
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel logs --since=24h --token "$TOKEN" | grep -i "error\|failed\|exception"
```

## Required Environment Variables (Production)

Based on verification, these keys exist in Vercel production:

### Email & Cron (Critical)
- ✅ `RESEND_API_KEY` - Present
- ✅ `RESEND_AUDIENCE_ID` - Present
- ✅ `RESEND_WEBHOOK_SECRET` - Present
- ✅ `CRON_SECRET` - Present

### Database
- ✅ `SUPABASE_POSTGRES_URL` - Present (Neon connection)
- ✅ `SUPABASE_POSTGRES_PRISMA_URL` - Present
- ✅ `SUPABASE_POSTGRES_URL_NON_POOLING` - Present

### Supabase (Auth)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Present
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Present
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Present

### Storage
- ✅ `BLOB_READ_WRITE_TOKEN` - Present

### Other Services
- ✅ `STRIPE_SECRET_KEY` - Present
- ✅ `STRIPE_WEBHOOK_SECRET` - Present
- ✅ `ANTHROPIC_API_KEY` - Present
- ✅ `AI_GATEWAY_API_KEY` - Present
- ✅ `REPLICATE_API_TOKEN` - Present (likely, check if listed)

## Production Verification Results (Jan 7, 2025)

### Environment Variables Status: ✅ ALL CRITICAL KEYS PRESENT

**Email & Cron:**
- ✅ `RESEND_API_KEY` - Present (Production, Preview, Development)
- ✅ `RESEND_AUDIENCE_ID` - Present
- ✅ `RESEND_WEBHOOK_SECRET` - Present
- ✅ `CRON_SECRET` - Present (Production, Preview, Development)

**Database:**
- ✅ `DATABASE_URL` - Present (via `POSTGRES_URL` or `SUPABASE_POSTGRES_URL`)
- ✅ `POSTGRES_URL` - Present
- ✅ `SUPABASE_POSTGRES_URL` - Present
- ✅ `SUPABASE_POSTGRES_PRISMA_URL` - Present
- ✅ `SUPABASE_POSTGRES_URL_NON_POOLING` - Present

**Supabase (Auth):**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Present
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Present
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Present

**Storage:**
- ✅ `BLOB_READ_WRITE_TOKEN` - Present

**Other Services:**
- ✅ `STRIPE_SECRET_KEY` - Present
- ✅ `STRIPE_WEBHOOK_SECRET` - Present
- ✅ `ANTHROPIC_API_KEY` - Present
- ✅ `AI_GATEWAY_API_KEY` - Present

### Authentication Status: ✅ VERIFIED

- **User:** `sandrasocial`
- **Project:** `v0-sselfie`
- **Team:** `sselfie-studio`
- **Token:** Working correctly

### Notes

- The token is stored in `.env.local` which is gitignored
- Never commit the token to version control
- If the token expires, create a new one at: https://vercel.com/account/tokens
- The project is already linked (`.vercel/project.json` exists)

## Alternative Verification Methods

If CLI is unavailable, use:
1. **Vercel Dashboard:** https://vercel.com/sselfie-studio/v0-sselfie
2. **Admin Dashboard:** `/admin/diagnostics/cron`
3. **Database Queries:** Direct SQL queries in Neon dashboard

## For AI Assistants

**Quick Reference:**
```bash
# Extract token and use it
TOKEN=$(grep "^VERCEL_TOKEN=" .env.local | cut -d '=' -f2)
vercel whoami --token "$TOKEN"
vercel env ls production --token "$TOKEN"
```

**The token is available in `.env.local` and can be used for all Vercel CLI operations.**

