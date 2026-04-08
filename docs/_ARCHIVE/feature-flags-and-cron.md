# Feature Flags & Cron Jobs

**Purpose:** Reference for understanding experimental features, staging systems, and automated jobs to prevent duplicate suggestions.

---

## Feature Flags

### Table Definition: `admin_feature_flags`

Stores feature flags for controlling system behavior (kill switches, test modes, experimental features).

**Schema:**
```sql
CREATE TABLE admin_feature_flags (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);
```

**Indexes:**
- `idx_admin_feature_flags_key` on `key`

**Usage Pattern:**
- Flags are checked via `lib/admin-feature-flags.ts` and `lib/email/email-control.ts`
- Values stored as JSONB (can be boolean, string, or object)
- Default behavior: flags default to `false` if not found (fail-safe)

---

### Active Feature Flags

#### 1. `email_sending_enabled`
- **Type:** Boolean
- **Default:** `false`
- **Purpose:** Global kill switch for all email sending
- **Location:** `lib/email/email-control.ts`
- **Usage:** Checked before sending any email
- **Status:** ⚠️ **Default OFF** - Must be enabled to send emails

#### 2. `email_test_mode`
- **Type:** Boolean
- **Default:** `false`
- **Purpose:** Test mode - emails only send to whitelisted recipients
- **Location:** `lib/email/email-control.ts`
- **Whitelist:** Set via `EMAIL_TEST_WHITELIST` env var (comma-separated)
- **Admin Override:** Admin email (`ssa@ssasocial.com`) always allowed
- **Status:** ⚠️ **Default OFF** - When enabled, restricts emails to whitelist

#### 3. `pro_photoshoot_admin_only`
- **Type:** Boolean
- **Default:** `false`
- **Purpose:** Enable Pro Photoshoot feature (admin-only feature)
- **Location:** `lib/admin-feature-flags.ts`
- **Env Override:** `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY` (env var takes precedence)
- **Status:** 🔒 **Admin Only** - Feature restricted to admin users
- **Used By:** 
  - `/api/maya/pro/photoshoot/start-session`
  - `/api/maya/pro/photoshoot/generate-grid`

---

### Feature Flag Functions

#### `isEmailSendingEnabled()`
- **Returns:** `boolean`
- **Purpose:** Check if email sending is globally enabled
- **Fail-safe:** Returns `false` if flag missing or error

#### `isEmailTestMode()`
- **Returns:** `boolean`
- **Purpose:** Check if email test mode is active
- **Fail-safe:** Returns `false` if flag missing or error

#### `isEmailAllowedInTestMode(email: string)`
- **Returns:** `boolean`
- **Purpose:** Check if email address is allowed in test mode
- **Always allows:** Admin email (`ssa@ssasocial.com`)
- **Whitelist:** Checks `EMAIL_TEST_WHITELIST` env var

#### `isProPhotoshootEnabled()`
- **Returns:** `boolean`
- **Purpose:** Check if Pro Photoshoot feature is enabled
- **Priority:** Env var `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY` > DB flag
- **Fail-safe:** Returns `false` if not enabled

#### `setEmailSendingEnabled(enabled: boolean, updatedBy?: string)`
- **Purpose:** Update email sending enabled flag
- **Usage:** Admin panel or system updates

#### `setEmailTestMode(enabled: boolean, updatedBy?: string)`
- **Purpose:** Update email test mode flag
- **Usage:** Admin panel or system updates

---

## Cron Jobs

### Table Definition: `admin_cron_runs`

Tracks execution history of all cron jobs for monitoring and debugging.

**Schema:**
```sql
CREATE TABLE admin_cron_runs (
  id SERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  summary JSONB DEFAULT '{}',
  error_id INTEGER REFERENCES admin_email_errors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_admin_cron_runs_job_name` on `job_name`
- `idx_admin_cron_runs_started_at` on `started_at DESC`
- `idx_admin_cron_runs_status` on `status`
- `idx_admin_cron_runs_error_id` on `error_id`

**Usage:**
- All cron jobs use `createCronLogger()` from `lib/cron-logger.ts`
- Logs start time, end time, duration, and status
- Errors are linked to `admin_email_errors` table

---

### Active Cron Jobs

All cron jobs are scheduled in `vercel.json` and run on Vercel Cron.

#### 1. **Sync Audience Segments**
- **Path:** `/api/cron/sync-audience-segments`
- **Schedule:** `0 2 * * *` (Daily at 2:00 AM UTC)
- **Purpose:** Sync audience segments with email provider (Resend/Flodesk)
- **Frequency:** Daily
- **Status:** ✅ **Active**

#### 2. **Refresh Segments**
- **Path:** `/api/cron/refresh-segments`
- **Schedule:** `0 3 * * *` (Daily at 3:00 AM UTC)
- **Purpose:** Refresh segment data and update contact lists
- **Frequency:** Daily
- **Status:** ✅ **Active**

#### 3. **Send Blueprint Followups**
- **Path:** `/api/cron/send-blueprint-followups`
- **Schedule:** `0 10 * * *` (Daily at 10:00 AM UTC)
- **Purpose:** Send followup emails to blueprint subscribers
- **Frequency:** Daily
- **Status:** ✅ **Active**

#### 4. **Nurture Sequence**
- **Path:** `/api/cron/nurture-sequence`
- **Schedule:** `0 11 * * *` (Daily at 11:00 AM UTC)
- **Purpose:** Send nurture emails to freebie subscribers (Day 1, Day 5, Day 10)
- **Frequency:** Daily
- **Email Types:**
  - `nurture-day-1` - Sent 1 day after signup
  - `nurture-day-5` - Sent 5 days after signup
  - `nurture-day-10` - Sent 10 days after signup
- **Status:** ✅ **Active**

#### 5. **Reengagement Campaigns**
- **Path:** `/api/cron/reengagement-campaigns`
- **Schedule:** `0 12 * * *` (Daily at 12:00 PM UTC)
- **Purpose:** Send reengagement emails to inactive users
- **Frequency:** Daily
- **Status:** ✅ **Active**

#### 6. **Send Scheduled Campaigns**
- **Path:** `/api/cron/send-scheduled-campaigns`
- **Schedule:** `*/15 * * * *` (Every 15 minutes)
- **Purpose:** Process scheduled email campaigns from `admin_email_campaigns` table
- **Frequency:** Every 15 minutes
- **Function:** `runScheduledCampaigns()` from `lib/email/run-scheduled-campaigns.ts`
- **Status:** ✅ **Active**

#### 7. **Welcome Sequence**
- **Path:** `/api/cron/welcome-sequence`
- **Schedule:** `0 10 * * *` (Daily at 10:00 AM UTC)
- **Purpose:** Send welcome emails to new paid members (Day 0, Day 3, Day 7)
- **Frequency:** Daily
- **Email Types:**
  - `welcome-day-0` - Sent immediately after signup (within 2 hours)
  - `welcome-day-3` - Sent 3 days after signup
  - `welcome-day-7` - Sent 7 days after signup
- **Target:** Users with active subscriptions
- **Status:** ✅ **Active**

#### 8. **Welcome Back Sequence**
- **Path:** `/api/cron/welcome-back-sequence`
- **Schedule:** Not in `vercel.json` (may be manual or disabled)
- **Purpose:** Send welcome back emails to returning users
- **Status:** ⚠️ **Not Scheduled** (exists but not in cron config)

#### 9. **Blueprint Email Sequence**
- **Path:** `/api/cron/blueprint-email-sequence`
- **Schedule:** Not in `vercel.json` (may be manual or disabled)
- **Purpose:** Send blueprint email sequence to subscribers
- **Status:** ⚠️ **Not Scheduled** (exists but not in cron config)

#### 10. **E2E Health Check**
- **Path:** `/api/health/e2e`
- **Schedule:** `0 6 * * *` (Daily at 6:00 AM UTC)
- **Purpose:** End-to-end health check to verify system is operational
- **Frequency:** Daily
- **Status:** ✅ **Active**

#### 11. **Re-index Codebase**
- **Path:** `/api/cron/reindex-codebase`
- **Schedule:** `0 3 * * 0` (Sunday at 3:00 AM UTC)
- **Purpose:** Weekly re-indexing of codebase for semantic search (Vector Memory)
- **Frequency:** Weekly
- **Requirements:** `UPSTASH_SEARCH_REST_URL`, `UPSTASH_SEARCH_REST_TOKEN`, `OPENAI_API_KEY`
- **Status:** ✅ **Active** (requires env vars to be configured)

---

### Cron Job Security

All cron jobs verify `CRON_SECRET` environment variable in production:

```typescript
const authHeader = request.headers.get("authorization")
const cronSecret = process.env.CRON_SECRET

if (isProduction && cronSecret) {
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
```

**Required Env Var:**
- `CRON_SECRET` - Bearer token for authenticating cron requests

---

### Cron Job Logging

All cron jobs use `createCronLogger()` which:
1. Logs start time to `admin_cron_runs` table
2. Tracks execution duration
3. Records success/failure status
4. Stores summary JSONB with job-specific metrics
5. Links errors to `admin_email_errors` table if applicable

**Example Logger Usage:**
```typescript
const cronLogger = createCronLogger("welcome-sequence")
await cronLogger.start()

try {
  // ... job logic ...
  await cronLogger.success({ emailsSent: 5, emailsFailed: 0 })
} catch (error) {
  await cronLogger.error(error, { reason: "Database error" })
}
```

---

## Feature Status Summary

### ✅ Production-Ready Features
- All scheduled cron jobs (8 active)
- Email control system
- Cron job logging and monitoring

### ⚠️ Experimental/Staging Features
- **Pro Photoshoot** - Admin-only, feature-flagged
- **Welcome Back Sequence** - Code exists but not scheduled
- **Blueprint Email Sequence** - Code exists but not scheduled

### 🔒 Admin-Only Features
- Pro Photoshoot (`pro_photoshoot_admin_only` flag)
- Feature flag management (admin panel)
- Cron job monitoring (admin panel)

### 🚫 Disabled by Default
- Email sending (`email_sending_enabled` = false)
- Email test mode (`email_test_mode` = false)

---

## Important Notes for AI Assistants

### ⚠️ Do NOT Suggest:
1. **Email sending systems** - Already implemented with kill switches
2. **Cron job scheduling** - 8 jobs already active, check `vercel.json` first
3. **Feature flag systems** - Already implemented in `admin_feature_flags` table
4. **Welcome/nurture sequences** - Already implemented and scheduled
5. **Audience segmentation** - Already syncing daily via cron

### ✅ Safe to Suggest:
1. **New feature flags** - Can add to existing `admin_feature_flags` table
2. **New cron jobs** - Can add to `vercel.json` and create route
3. **Feature flag values** - Can modify existing flags
4. **Cron job modifications** - Can update schedules or logic

### 🔍 Always Check:
1. **Feature flags** - Check `admin_feature_flags` table before suggesting email/feature systems
2. **Cron schedule** - Check `vercel.json` before suggesting automated jobs
3. **Existing routes** - Check `/api/cron/*` before creating new cron endpoints

---

**Last Updated:** Auto-generated from codebase  
**Source Files:**
- `scripts/admin-migrations/20250106_create_admin_feature_flags.sql`
- `scripts/admin-migrations/20250106_create_admin_cron_runs.sql`
- `lib/admin-feature-flags.ts`
- `lib/email/email-control.ts`
- `vercel.json`
- `app/api/cron/*/route.ts`
