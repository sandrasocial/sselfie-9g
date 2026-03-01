# Dead-Route Audit Report
**Generated:** 2026-02-28T23:17:11.997Z
**Analysis Date:** Last 30 days (file-based)

## Summary
| Metric | Count |
|--------|-------|
| Total API routes | 450 |
| Cron routes (protected) | 9 |
| Active routes | 438 |
| Potentially dead routes | 3 |
| Removed/archived endpoints | 0 |

---

## ⚠️ Potentially Dead Routes (Candidates for Removal)

Found 3 route(s) with warning signs:



### `/api/feed/[feedId]/generate-images`
- **File:** `app/api/feed/[feedId]/generate-images/route.ts`
- **Code size:** 12 lines
- **Has TODO/FIXME/DEAD:** ⚠️ Yes
- **Has logging:** ❌
- **Last modified:** 2026-02-09


### `/api/feed/add-more`
- **File:** `app/api/feed/add-more/route.ts`
- **Code size:** 37 lines
- **Has TODO/FIXME/DEAD:** ⚠️ Yes
- **Has logging:** ✅
- **Last modified:** 2026-02-09


### `/api/feed/refresh-concepts`
- **File:** `app/api/feed/refresh-concepts/route.ts`
- **Code size:** 37 lines
- **Has TODO/FIXME/DEAD:** ⚠️ Yes
- **Has logging:** ✅
- **Last modified:** 2026-02-09


---

## ✅ Active Routes (Sample - Top 15)
- `/api/academy/certificates` (97 LOC)
- `/api/academy/checkout` (71 LOC)
- `/api/academy/courses/[courseId]` (86 LOC)
- `/api/academy/courses` (77 LOC)
- `/api/academy/enroll` (48 LOC)
- `/api/academy/exercises/submit` (50 LOC)
- `/api/academy/flatlay-images/[flatlayId]/download` (53 LOC)
- `/api/academy/flatlay-images` (67 LOC)
- `/api/academy/images` (143 LOC)
- `/api/academy/lessons/[lessonId]` (75 LOC)
- `/api/academy/monthly-drops/[dropId]/download` (55 LOC)
- `/api/academy/monthly-drops` (73 LOC)
- `/api/academy/my-courses` (40 LOC)
- `/api/academy/my-products` (101 LOC)
- `/api/academy/progress` (93 LOC)
- ... and 423 more routes


---

## 🔄 Cron Routes (Always Active)
- `/api/cron/cron-health-check` (undefined LOC)
- `/api/cron/reconcile-ai-images` (undefined LOC)
- `/api/cron/reconcile-credits` (undefined LOC)
- `/api/cron/reconcile-feed-posts` (undefined LOC)
- `/api/cron/reconcile-generations` (undefined LOC)
- `/api/cron/reconcile-pro-photoshoot-grids` (undefined LOC)
- `/api/cron/reconcile-subscriptions` (undefined LOC)
- `/api/cron/resolve-pending-payments` (undefined LOC)
- `/api/cron/win-back-sequence` (undefined LOC)

---

## 📦 Removed/Archived Endpoints
None

---

## 📋 Recommendations
1. **Review TODOs:** Routes marked with TODO/FIXME may be incomplete or scheduled for removal
2. **Size check:** Routes <50 LOC are typically stubs—verify they're still needed
3. **Consolidation:** Check for duplicate functionality in similar endpoint names
4. **Client-side refs:** Use `grep` to verify no client code calls these routes before removal
5. **Gradual deprecation:** Add deprecation headers before full removal

## Action Items
- [ ] Review `/api/feed/[feedId]/generate-images, /api/feed/add-more, /api/feed/refresh-concepts` with team
- [ ] Check for client references: `grep -r "route-path" app/`
- [ ] Archive unused routes to `.removed-endpoints/` folder
- [ ] Document deprecation timeline in API changelog

---
**Note:** This analysis is based on file structure and code inspection. For call counts, integrate with Vercel Analytics API (requires VERCEL_TOKEN).
