# Cron Job Setup Guide

## CRON_SECRET Configuration

### What is CRON_SECRET?

`CRON_SECRET` is an environment variable that secures your cron endpoint. Vercel automatically includes it in the `Authorization` header when calling your cron job.

### Where to Set CRON_SECRET

#### 1. **Vercel Dashboard (Production)**

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Name**: `CRON_SECRET`
   - **Value**: Generate a random secret (see below)
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**

#### 2. **Local Development (.env.local)**

For local testing, create or edit `.env.local` in your project root:

```bash
CRON_SECRET=your-local-test-secret-here
```

### Generate a Secure Secret

**Option 1: Using OpenSSL (Mac/Linux)**
```bash
openssl rand -hex 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3: Online Generator**
- Use any secure random string generator
- Minimum 32 characters recommended

### How Vercel Cron Works

1. Vercel reads `vercel.json` to find cron jobs
2. When the scheduled time arrives, Vercel calls your endpoint
3. Vercel automatically adds: `Authorization: Bearer ${CRON_SECRET}`
4. Your code checks this header matches your `CRON_SECRET` env variable

### Testing the Cron Endpoint

#### Local Testing (No Secret Required)
```bash
# Works without CRON_SECRET in local dev
curl -X GET "http://localhost:3000/api/cron/sync-audience-segments"
```

#### Production Testing (With Secret)
```bash
# Replace YOUR_SECRET with your actual CRON_SECRET
curl -X GET "https://your-domain.com/api/cron/sync-audience-segments" \
  -H "Authorization: Bearer YOUR_SECRET"
```

#### Using the Admin Test Button
1. Go to: `http://localhost:3000/admin/test-audience-sync`
2. Click **"Test Cron (5 contacts)"** button
3. This tests the cron logic without requiring the secret

### Current Cron Schedule

The cron job is configured in `vercel.json` to run:
- **Schedule**: Daily at 2:00 AM UTC (`"0 2 * * *"`)

To change the schedule, edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-audience-segments",
      "schedule": "0 2 * * *"  // Change this
    }
  ]
}
```

### Cron Schedule Examples

- `"0 2 * * *"` - Daily at 2:00 AM UTC
- `"0 */6 * * *"` - Every 6 hours
- `"0 0 * * 0"` - Weekly on Sunday at midnight
- `"0 0 1 * *"` - Monthly on the 1st at midnight

### Verification Steps

1. ✅ Set `CRON_SECRET` in Vercel environment variables
2. ✅ Deploy to Vercel (cron jobs are activated on deploy)
3. ✅ Check Vercel dashboard → **Cron Jobs** tab to see scheduled jobs
4. ✅ Monitor first execution in Vercel logs
5. ✅ Verify segments are updated in Resend dashboard

### Troubleshooting

**Issue: Cron job not running**
- Check Vercel dashboard → Cron Jobs tab
- Verify `vercel.json` is in project root
- Check deployment logs for errors

**Issue: 401 Unauthorized**
- Verify `CRON_SECRET` is set in Vercel
- Check that the value matches exactly (no extra spaces)
- For local testing, the endpoint works without secret

**Issue: Rate limit errors**
- The cron job processes in batches with delays
- For 111 contacts, expect ~5-10 minutes total runtime
- Rate limits are built into the code (500ms between segment additions)

### Security Notes

- ✅ Never commit `CRON_SECRET` to git
- ✅ Use different secrets for different environments
- ✅ Rotate secrets periodically
- ✅ The endpoint only requires secret in production

