# Cron Status Report
**Generated:** 2026-02-28T23:17:12.068Z

## Executive Summary
| Status | Count |
|--------|-------|
| Well-defined crons | 9 |
| Missing implementation | 0 |
| Orphaned (no vercel.json) | 28 |
| **Total crons** | **37** |

**Health:** ⚠️ Configuration issues detected

---

## ✅ Well-Defined & Active Crons


### `/api/cron/resolve-pending-payments`
- **Schedule:** `*/5 * * * *` (Every 5 minutes)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-09


### `/api/cron/reconcile-credits`
- **Schedule:** `0 5 * * *` (Daily at 05:00 UTC)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-27


### `/api/cron/cron-health-check`
- **Schedule:** `0 * * * *` (Hourly)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-09


### `/api/cron/reconcile-feed-posts`
- **Schedule:** `*/15 * * * *` (Every 15 minutes)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-10


### `/api/cron/reconcile-ai-images`
- **Schedule:** `*/15 * * * *` (Every 15 minutes)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** No
- **Last modified:** 2026-02-10


### `/api/cron/reconcile-pro-photoshoot-grids`
- **Schedule:** `*/15 * * * *` (Every 15 minutes)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** No
- **Last modified:** 2026-02-10


### `/api/cron/reconcile-generations`
- **Schedule:** `*/30 * * * *` (Every 30 minutes)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-11


### `/api/cron/reconcile-subscriptions`
- **Schedule:** `*/30 * * * *` (Every 30 minutes)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-27


### `/api/cron/win-back-sequence`
- **Schedule:** `0 10 * * *` (Daily at 10:00 UTC)
- **Error handling:** ✅
- **Logging:** ✅
- **DB operations:** Yes
- **Last modified:** 2026-02-26


---

## ❌ Missing Implementation
✅ None


---

## ⚠️ Orphaned Implementations (Not in vercel.json)


### `/api/cron/admin-alerts`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/arpu-churn-weekly`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/backfill-resend-audience`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/blueprint-discovery-funnel`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/blueprint-email-sequence`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/brand-engine-launch-digest`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/cohort-delivery-load-weekly`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/cohort-report-weekly`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/cold-reeducation-sequence`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/funnel-report-daily`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/milestone-bonuses`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/monthly-usage-recap`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/nurture-sequence`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/onboarding-sequence`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/product-qa-daily`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/reactivation-campaigns`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/reengagement-campaigns`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/referral-rewards`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/refresh-segments`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/reindex-codebase`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/send-blueprint-followups`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/send-scheduled-campaigns`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/send-scheduled-newsletters`
- **Schedule (from code):** *\/15 * * * *
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/subscription-ending-soon`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/sync-audience-segments`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/upsell-campaigns`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/welcome-back-sequence`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


### `/api/cron/welcome-sequence`
- **Schedule (from code):** unknown
- **Status:** ⚠️ NOT IN VERCEL.JSON
- **Action required:** Either:
  1. Add to `vercel.json` if intentional
  2. Move to `.removed-endpoints/` if deprecated


---

## 📋 Cron Implementation Checklist
- [ ] All crons in `vercel.json` have matching implementations
- [ ] No orphaned cron routes
- [ ] All active crons have error handling
- [ ] All active crons have logging
- [ ] Cron schedules are optimized (avoid overlaps)
- [ ] Database operations have transaction handling

## Cron Performance Notes
- Fast crons (data reconciliation): 7
- Heavy crons (may need throttling): Review schedules to avoid resource spikes

---

**Next steps:**
1. Implement any missing crons (0)
2. Archive orphaned crons (28)
3. Add error handling to critical paths
4. Monitor execution logs in Vercel dashboard

**Vercel crons docs:** https://vercel.com/docs/crons
