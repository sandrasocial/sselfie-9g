# How to Read E2E Health Check Logs

**Purpose:** Plain-language guide for understanding automated end-to-end health check results.

**Last Updated:** January 6, 2025

---

## What Are E2E Health Checks?

E2E (End-to-End) health checks are automated tests that validate critical user flows work correctly. They run daily to catch silent failures before users notice.

**Think of it as:** A robot that tries to use your app like a real user and reports if anything breaks.

---

## Status Levels Explained

### 🟢 `ok` (Healthy)
**What it means:** This flow works perfectly.

**Example:**
```json
{
  "status": "ok",
  "message": "Credits readable: 10 credits",
  "duration": 45
}
```

**What to do:** Nothing! This is good.

---

### 🟡 `degraded` (Warning)
**What it means:** This flow works, but something is not ideal. It might work slower, or a non-critical feature is missing.

**Example:**
```json
{
  "status": "degraded",
  "message": "Pro mode config present, blob storage not configured",
  "duration": 120
}
```

**What to do:** 
- Check the message to see what's degraded
- Usually not urgent, but worth investigating
- App still works for users

---

### 🔴 `failed` (Broken)
**What it means:** This flow is broken. Users will experience issues.

**Example:**
```json
{
  "status": "failed",
  "message": "Replicate API token not configured",
  "duration": 10
}
```

**What to do:**
- **URGENT:** Fix this immediately
- Check the error message
- This blocks revenue if it's a payment or generation flow

---

### ⚪ `skipped` (Not Tested)
**What it means:** This flow was not tested (usually because it's unsafe to test automatically).

**Example:**
```json
{
  "status": "skipped",
  "message": "Full image generation skipped to avoid credit consumption",
  "duration": 0
}
```

**What to do:** Nothing - this is expected for some flows.

---

## Overall Status

The overall status combines all 6 flows:

### `healthy`
- All flows are `ok`
- Everything works perfectly
- **Action:** None needed

### `degraded`
- Some flows are `degraded`, but none are `failed`
- App works, but some features may be slower or limited
- **Action:** Review degraded flows when convenient

### `unhealthy`
- At least one flow is `failed`
- Users will experience issues
- **Action:** **URGENT - Fix immediately**

---

## The 6 Flows Explained

### 1. Auth & Routing
**What it tests:** Can users log in and access Maya?

**If it fails:**
- Users can't log in
- **BLOCKS ALL REVENUE** - users can't pay if they can't access the app

**What to check first:**
- Supabase configuration (env vars)
- Database connectivity
- User mapping system

---

### 2. Credits & Mode Toggle
**What it tests:** Can the system read user credits? Can users toggle Classic/Pro mode?

**If it fails:**
- Users can't see their credit balance
- Billing may be broken
- **BLOCKS REVENUE** - users can't purchase or use credits

**What to check first:**
- Database connectivity
- Credits table queries
- User ID mapping

---

### 3. Classic Image Generation
**What it tests:** Is image generation configured and reachable?

**If it fails:**
- Users can't generate images
- **BLOCKS REVENUE** - core feature is broken

**What to check first:**
- Replicate API token (env var)
- Replicate API reachability
- Image generation endpoint

---

### 4. Pro Image Generation
**What it tests:** Is Pro mode image generation configured?

**If it fails:**
- Pro users can't generate images
- **BLOCKS REVENUE** - premium feature broken

**What to check first:**
- Replicate API token
- Blob storage configuration
- Pro mode endpoints

---

### 5. Feed Flow
**What it tests:** Are feed planner endpoints accessible?

**If it fails:**
- Users can't create or save feeds
- **BLOCKS REVENUE** - feed feature broken

**What to check first:**
- Feed planner API endpoints
- Database connectivity
- Feed creation logic

---

### 6. Cron Sanity
**What it tests:** Are background jobs (cron) running?

**If it fails:**
- Email campaigns may not send
- Segment refreshes may not run
- **BLOCKS REVENUE** - automated features broken

**What to check first:**
- Cron secret configuration
- Vercel cron job setup
- Recent cron job logs

---

## How to Read the Logs

### Where to Find Logs

1. **Vercel Dashboard:**
   - Go to your project
   - Click "Logs" tab
   - Filter for `[E2E-HEALTH]` or `e2eRunId`

2. **Structured Log Format:**
   ```json
   {
     "timestamp": "2025-01-06T12:00:00Z",
     "level": "info",
     "message": "E2E health check passed",
     "e2eRunId": "e2e_1704542400000_abc123",
     "overall": "healthy",
     "flows": { ... },
     "duration": 1250
   }
   ```

### Reading a Full Report

**Example healthy report:**
```json
{
  "overall": "healthy",
  "e2eRunId": "e2e_1704542400000_abc123",
  "timestamp": "2025-01-06T12:00:00Z",
  "duration": 1250,
  "flows": {
    "auth": { "status": "ok", "message": "Auth config present", "duration": 45 },
    "credits": { "status": "ok", "message": "Credits readable: 10 credits", "duration": 120 },
    "classic_generation": { "status": "ok", "message": "Replicate config present", "duration": 30 },
    "pro_generation": { "status": "ok", "message": "Pro mode config present", "duration": 35 },
    "feed": { "status": "ok", "message": "Feed planner endpoints accessible", "duration": 25 },
    "cron": { "status": "ok", "message": "Cron infrastructure configured", "duration": 15 }
  }
}
```

**What this tells you:**
- ✅ Everything works
- ✅ All 6 flows passed
- ✅ Total check took 1.25 seconds
- ✅ No action needed

---

**Example unhealthy report:**
```json
{
  "overall": "unhealthy",
  "e2eRunId": "e2e_1704542400000_xyz789",
  "timestamp": "2025-01-06T12:00:00Z",
  "duration": 500,
  "flows": {
    "auth": { "status": "ok", "message": "Auth config present", "duration": 45 },
    "credits": { "status": "failed", "message": "Database connection timeout", "duration": 5000 },
    "classic_generation": { "status": "ok", "message": "Replicate config present", "duration": 30 },
    "pro_generation": { "status": "ok", "message": "Pro mode config present", "duration": 35 },
    "feed": { "status": "degraded", "message": "Feed endpoints slow to respond", "duration": 3000 },
    "cron": { "status": "ok", "message": "Cron infrastructure configured", "duration": 15 }
  }
}
```

**What this tells you:**
- 🔴 **URGENT:** Credits flow failed (database timeout)
- 🟡 Feed flow is slow (degraded)
- ✅ Other flows work
- **Action:** Check database connectivity immediately

---

## Priority Guide

### 🔴 **CRITICAL - Fix Immediately**
- Auth flow failed → Users can't log in
- Credits flow failed → Billing broken
- Classic/Pro generation failed → Core feature broken

### 🟡 **HIGH - Fix Soon**
- Feed flow failed → Feature broken
- Cron sanity failed → Background jobs broken

### 🟢 **MEDIUM - Fix When Convenient**
- Any flow degraded (not failed) → App works but not ideal

---

## What This System Does NOT Cover

**Honest limitations:**

1. **Full Image Generation:** We check config, but don't actually generate images (to avoid credit consumption)

2. **Full Feed Creation:** We check endpoints, but don't create full feeds (to avoid credit consumption)

3. **Real User Flows:** We use a synthetic test user, so we don't catch user-specific issues

4. **Performance:** We check if things work, not if they're fast

5. **UI Issues:** We test APIs, not the actual user interface

6. **Payment Processing:** We don't test Stripe (too risky)

---

## Manual Testing

If E2E checks pass but users report issues:

1. **Test the specific flow manually:**
   - Try to reproduce the user's issue
   - Check browser console for errors
   - Check network tab for failed requests

2. **Check recent deployments:**
   - Did something change recently?
   - Check git history

3. **Check error tracking:**
   - Look at Sentry for errors
   - Check for error spikes

---

## Summary

**E2E health checks are a safety net, not a replacement for:**
- Real user testing
- Manual QA
- Error monitoring (Sentry)
- Performance monitoring

**They catch:** Silent failures in critical revenue flows

**They don't catch:** UI bugs, performance issues, user-specific problems

**When they fail:** Fix immediately - it means a critical flow is broken

**When they pass:** Good sign, but still monitor real user feedback

---

**Questions?** Check the logs, look for the `e2eRunId`, and trace through the flow that failed.

