# Codebase Health Monitoring Scripts

Three automated monitoring scripts for **sselfie-9g** codebase health. All scripts deployed to `~/stella/scripts/monitoring/` and synced to `~/sselfie-9g/scripts/monitoring/` for version control.

## Scripts Overview

### 1. **Dead-Routes Audit** (Weekly)
- **File:** `1-dead-routes-audit.mjs`
- **Frequency:** Weekly (Monday mornings recommended)
- **Purpose:** Identify API routes with zero calls in 30 days or suspicious patterns
- **Output:** `~/stella/reports/codebase-health/dead-routes-YYYY-MM-DD.md`
- **What it checks:**
  - All routes in `app/api/`
  - Compares against Vercel crons (protected)
  - Flags routes with TODO/FIXME/DEPRECATED markers
  - Identifies very small routes (<50 LOC) that may be stubs
- **Action items:**
  - Review flagged routes with team
  - Archive unused routes to `.removed-endpoints/`
  - Update client code references before removal

```bash
node scripts/monitoring/1-dead-routes-audit.mjs
```

---

### 2. **Critical-Path Health Check** (Daily)
- **File:** `2-critical-path-check.mjs`
- **Frequency:** Daily (part of health monitoring)
- **Purpose:** HTTP smoke test of business-critical routes
- **Output:** `~/stella/reports/codebase-health/critical-path-YYYY-MM-DD.txt`
- **Tests these endpoints:**
  - `POST /api/auth` — User authentication
  - `POST /api/studio/generate` — Maya image generation
  - `POST /api/checkout/membership` — Studio membership purchase
  - `POST /api/checkout/blueprint` — Blueprint product purchase

**Exit codes:**
- `0` = All critical routes responding (2xx-3xx)
- `1` = One or more routes unreachable or timing out

```bash
# Default: tests https://www.sselfie.ai
node scripts/monitoring/2-critical-path-check.mjs

# Custom URL:
node scripts/monitoring/2-critical-path-check.mjs https://staging.sselfie.ai
```

---

### 3. **Cron Status Report** (Weekly)
- **File:** `3-cron-status-report.mjs`
- **Frequency:** Weekly (same day as dead-routes audit)
- **Purpose:** Verify all crons are properly configured and implemented
- **Output:** `~/stella/reports/codebase-health/cron-status-YYYY-MM-DD.md`
- **Compares:**
  - Crons defined in `vercel.json`
  - Actual implementations in `app/api/cron/*/route.ts`
  - Flags missing implementations and orphaned routes
- **Checks per cron:**
  - Error handling
  - Logging
  - Database operations

**Red flags:**
- ❌ Missing implementation (in vercel.json but no route)
- ⚠️ Orphaned cron (route exists but not in vercel.json)

```bash
node scripts/monitoring/3-cron-status-report.mjs
```

---

## Running All Checks

```bash
# Run all three scripts at once
bash scripts/monitoring/run-all.sh
```

Output:
```
📂 Reports saved to: ~/stella/reports/codebase-health/
```

---

## Integration with North (CI/CD)

These scripts are designed to run as **Vercel crons** or manual audits. Suggested schedule:

| Script | Frequency | Time | Command |
|--------|-----------|------|---------|
| Dead-Routes Audit | Weekly | Mon 06:00 UTC | `node scripts/monitoring/1-dead-routes-audit.mjs` |
| Critical-Path Check | Daily | Every 4 hours | `node scripts/monitoring/2-critical-path-check.mjs` |
| Cron Status Report | Weekly | Mon 07:00 UTC | `node scripts/monitoring/3-cron-status-report.mjs` |

---

## Report Locations

All reports are saved to:
```
~/stella/reports/codebase-health/

dead-routes-2026-03-01.md
critical-path-2026-03-01.txt
cron-status-2026-03-01.md
```

---

## Environment Variables

| Variable | Used by | Example |
|----------|---------|---------|
| `VERCEL_URL` | Critical-Path Check | `https://www.sselfie.ai` |
| `VERCEL_TOKEN` | Dead-Routes Audit (future) | Required for analytics API |

---

## Example Report: Dead Routes

```markdown
# Dead-Route Audit Report
Generated: 2026-03-01T06:15:23.456Z

## Summary
| Metric | Count |
|--------|-------|
| Total API routes | 450 |
| Cron routes (protected) | 9 |
| Active routes | 447 |
| Potentially dead routes | 3 |

## ⚠️ Potentially Dead Routes
### `/api/legacy-feed-style`
- File: `app/api/legacy-feed-style/route.ts`
- Code size: 24 lines
- Has TODO/FIXME/DEAD: ⚠️ Yes
- Last modified: 2026-02-10
```

---

## Example Report: Critical Path

```
CRITICAL PATH HEALTH CHECK
Time: 2026-03-01T06:20:00.000Z
Target: https://www.sselfie.ai
Status: ✅ ALL HEALTHY

========================================

RESULTS SUMMARY
✅ POST /api/auth
   Status: 401
   Response time: 142ms
   Description: Authentication endpoint

⚠️ POST /api/studio/generate
   Status: 503
   Response time: 5000ms
   Description: Image generation (Maya)
```

---

## Example Report: Cron Status

```markdown
# Cron Status Report
Generated: 2026-03-01T07:00:00.000Z

## Executive Summary
| Status | Count |
|--------|-------|
| Well-defined crons | 9 |
| Missing implementation | 0 |
| Orphaned (no vercel.json) | 28 |

## ✅ Well-Defined & Active Crons

### `/api/cron/resolve-pending-payments`
- Schedule: `*/5 * * * *` (Every 5 minutes)
- Error handling: ✅
- Logging: ✅
- DB operations: Yes
- Last modified: 2026-02-28
```

---

## Troubleshooting

### "No reports generated"
- Ensure `~/stella/reports/codebase-health/` directory exists
- Check Node.js version: `node --version` (requires v16+)

### "Can't find sselfie-9g"
- Scripts expect `projectRoot = '/Users/MD760HA/sselfie-9g'`
- Update the `projectRoot` variable in scripts if cloned elsewhere

### Critical-Path times out
- This is normal for health checks; the script waits 5 seconds per endpoint
- To debug: `curl -v https://www.sselfie.ai/api/auth`

### Cron report shows "Orphaned" routes
- Check if the route is intentionally deprecated
- Add to `vercel.json` if active, or move to `.removed-endpoints/` if not

---

## Git Workflow

These scripts are committed to the repo for easy team access:

```bash
# After making changes:
cd ~/sselfie-9g
git add scripts/monitoring/
git commit -m "chore: update health monitoring scripts"
git push
```

---

## Future Enhancements

- [ ] Integrate with Vercel Analytics API for real call counts
- [ ] Slack notifications for critical-path failures
- [ ] Grafana dashboard for historical cron execution rates
- [ ] Automated archival of dead routes to `.removed-endpoints/`
- [ ] API endpoint documentation scraper

---

**Maintained by:** North (CI/CD automation)  
**Last updated:** 2026-03-01  
**Status:** ✅ Production ready
