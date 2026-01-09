# ✅ Cron Job Logging System

**Status:** **LIVE** 🎉  
**Created:** January 9, 2026

---

## What Is This?

A centralized logging system that tracks **every cron job execution** in your application.

**Before:** No visibility into cron job health → hard to debug failures  
**After:** Real-time monitoring of all 15 cron jobs → instant failure detection

---

## What Was Created

### 📊 Two Tables

1. **`cron_job_logs`** - Detailed log of every execution
   - Job name, status (success/failed), duration
   - Error messages and stack traces
   - Custom metadata (e.g., "emailsSent: 150")

2. **`cron_job_summary`** - Auto-updated statistics
   - Total executions, success rate, average duration
   - Last run time, last status, last error
   - Updates automatically via database trigger

### 📈 Two Views

1. **`cron_job_health_dashboard`** - Quick health overview
   - Shows all jobs with health status (✅⚠️❌)
   - Sorted by urgency (failures first)
   - Perfect for admin dashboard

2. **`cron_job_recent_failures`** - Last 24 hours of failures
   - What failed, when, and why
   - Helps identify patterns

### ⚙️ Automatic Features

- **Auto-updating summary** (database trigger)
- **Health status calculation** (✅ >95%, ⚠️ 80-95%, ❌ <80%)
- **Stale job detection** (not run in >2 hours)

---

## How to Use It

### For Admin Dashboard

**Quick health check:**
```sql
SELECT * FROM cron_job_health_dashboard;
```

**Output example:**
| job_name | total_executions | success_rate | last_status | health_status | status_text |
|----------|------------------|--------------|-------------|---------------|-------------|
| welcome-sequence | 145 | 99.31% | success | ✅ | Healthy |
| send-scheduled-campaigns | 1,440 | 98.47% | success | ✅ | Healthy |
| blueprint-email-sequence | 52 | 78.85% | failed | 🔴 | Unhealthy |

**Recent failures:**
```sql
SELECT * FROM cron_job_recent_failures;
```

---

### For Developers (Using the Logger)

Your existing `createCronLogger` function already works with this system!

**Example (already in your cron jobs):**
```typescript
import { createCronLogger } from '@/lib/cron-logger'

export async function GET(request: Request) {
  const logger = createCronLogger('welcome-sequence')
  await logger.start() // Logs to cron_job_logs
  
  try {
    // ... your cron job logic ...
    
    const emailsSent = 150
    const emailsFailed = 2
    
    await logger.success({
      emailsSent,
      emailsFailed
    })
  } catch (error) {
    await logger.error(error, {
      context: 'Failed at step 3'
    })
  }
}
```

**What gets logged:**
- Start time
- End time
- Duration (ms)
- Status (success/failed)
- Error message (if failed)
- Custom metadata (emailsSent, etc.)

---

## Monitoring Queries

### All Jobs Health

```sql
SELECT 
  job_name,
  success_rate,
  last_run_at,
  health_status,
  status_text
FROM cron_job_health_dashboard
ORDER BY 
  CASE 
    WHEN last_status = 'failed' THEN 1
    WHEN success_rate < 80 THEN 2
    ELSE 3
  END;
```

### Jobs That Haven't Run Recently

```sql
SELECT 
  job_name,
  last_run_at,
  EXTRACT(EPOCH FROM (NOW() - last_run_at))/3600 as hours_since_last_run
FROM cron_job_summary
WHERE last_run_at < NOW() - INTERVAL '2 hours'
  OR last_run_at IS NULL
ORDER BY last_run_at ASC NULLS FIRST;
```

### Performance Stats

```sql
SELECT 
  job_name,
  average_duration_ms,
  last_duration_ms,
  CASE 
    WHEN last_duration_ms > average_duration_ms * 2 THEN 'Slower than usual'
    WHEN last_duration_ms < average_duration_ms * 0.5 THEN 'Faster than usual'
    ELSE 'Normal'
  END as performance_status
FROM cron_job_summary
ORDER BY average_duration_ms DESC;
```

### Failure Patterns

```sql
SELECT 
  job_name,
  COUNT(*) as failure_count,
  MIN(started_at) as first_failure,
  MAX(started_at) as last_failure,
  STRING_AGG(DISTINCT error_message, '; ') as error_messages
FROM cron_job_logs
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '7 days'
GROUP BY job_name
ORDER BY failure_count DESC;
```

---

## Schema Reference

### cron_job_logs

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| job_name | VARCHAR(255) | Name of the cron job |
| status | VARCHAR(50) | 'started', 'success', 'failed', 'timeout' |
| started_at | TIMESTAMPTZ | When the job started |
| completed_at | TIMESTAMPTZ | When the job finished |
| duration_ms | INTEGER | Execution time in milliseconds |
| error_message | TEXT | Error message if failed |
| error_stack | TEXT | Full stack trace if failed |
| metadata | JSONB | Custom data (e.g., {emailsSent: 150}) |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

### cron_job_summary

| Column | Type | Description |
|--------|------|-------------|
| job_name | VARCHAR(255) | Primary key |
| total_executions | INTEGER | Total times run |
| total_successes | INTEGER | Number of successful runs |
| total_failures | INTEGER | Number of failed runs |
| last_run_at | TIMESTAMPTZ | Last execution time |
| last_status | VARCHAR(50) | Status of last run |
| last_duration_ms | INTEGER | Duration of last run |
| last_error | TEXT | Last error message |
| average_duration_ms | INTEGER | Average execution time |
| success_rate | NUMERIC(5,2) | Success percentage (0-100) |
| is_enabled | BOOLEAN | Whether job is enabled |
| next_expected_run | TIMESTAMPTZ | When job should run next |
| created_at | TIMESTAMPTZ | First log time |
| updated_at | TIMESTAMPTZ | Last update time |

---

## Migration Info

**Migration file:** `migrations/create-cron-job-logs-table.sql`  
**Status:** ✅ Applied to production  
**Date:** January 9, 2026

**What was created:**
- 2 tables: `cron_job_logs`, `cron_job_summary`
- 6 indexes (for fast queries)
- 1 trigger function (auto-updates summary)
- 1 trigger (runs after each log insert)
- 2 views (dashboard, recent failures)

---

## Integration Status

### ✅ Already Integrated (No Code Changes Needed)

Your existing `createCronLogger` function (`lib/cron-logger.ts`) will automatically:
- Log to `cron_job_logs` table
- Trigger summary updates
- Track all metrics

**All 15 cron jobs** are already using this logger, so they'll start populating the tables automatically on their next run.

### 📊 Next Steps (Optional)

1. **Create admin dashboard page** to display `cron_job_health_dashboard`
   - Location: `app/admin/cron-health/page.tsx`
   - Show job health, recent failures, performance graphs

2. **Add email alerts** for critical failures
   - Alert if job fails 3+ times in a row
   - Alert if success rate drops below 80%

3. **Add Slack/Discord notifications** (optional)
   - Real-time alerts for failures
   - Daily summary of cron job health

---

## Monitoring Recommendations

### Alert Thresholds

🚨 **Critical (Alert Immediately)**
- Success rate < 80%
- Job failed 3+ times in a row
- Job hasn't run in 3+ hours (for frequent jobs)

⚠️ **Warning (Check Within 1 Hour)**
- Success rate 80-95%
- Job slower than usual (2x average duration)
- Job failed once

✅ **Healthy**
- Success rate > 95%
- Running on schedule
- Performance normal

---

## Example Admin Dashboard Query

Here's a ready-to-use query for your admin dashboard:

```typescript
// app/api/admin/cron-health/route.ts
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const health = await sql`
    SELECT * FROM cron_job_health_dashboard
  `
  
  const recentFailures = await sql`
    SELECT * FROM cron_job_recent_failures
    LIMIT 10
  `
  
  const criticalJobs = health.filter((job: any) => 
    job.last_status === 'failed' || 
    job.success_rate < 80
  )
  
  return Response.json({
    totalJobs: health.length,
    healthyJobs: health.filter((j: any) => j.health_status === '✅').length,
    criticalJobs: criticalJobs.length,
    jobs: health,
    recentFailures
  })
}
```

---

## Maintenance

### Data Retention

Current setup: **Keep all logs forever**

**Recommended:** Set up automatic cleanup to keep last 30 days:

```sql
-- Run this monthly
DELETE FROM cron_job_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Summary table stays (no cleanup needed)
```

### Backup

The summary table is small and contains valuable historical data.

**Backup query:**
```sql
-- Export summary to CSV
COPY (SELECT * FROM cron_job_summary) 
TO '/path/to/cron_job_summary_backup.csv' 
WITH CSV HEADER;
```

---

## Troubleshooting

### No data showing up?

**Check if logger is being called:**
```typescript
// In your cron job
console.log('[YourJob] Logger started')
await logger.start()
console.log('[YourJob] Logger waiting for completion')
await logger.success({ ... })
console.log('[YourJob] Logger completed')
```

### Summary not updating?

**Verify trigger is working:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'update_cron_summary';

-- Manually test trigger
INSERT INTO cron_job_logs (
  job_name, status, started_at, completed_at, duration_ms
) VALUES (
  'test-job', 'success', NOW(), NOW(), 1000
);

SELECT * FROM cron_job_summary WHERE job_name = 'test-job';
```

---

## Success Metrics

**Week 1 Goal:**
- All 15 cron jobs logging successfully
- Zero "unknown error" failures
- <1 hour to identify root cause of any failure

**Month 1 Goal:**
- Admin dashboard showing real-time health
- Automated alerts for critical failures
- 95%+ success rate across all jobs

---

**System Status:** ✅ **OPERATIONAL**  
**Next Action:** None required - system is auto-logging  
**Optional:** Build admin dashboard UI
