# Cron Auth and Runtime Test Method

**Created:** 2026-02-25  
**Purpose:** Document how to validate cron endpoints (auth and runtime) without editing critical files. Use this to verify O-03 (reconcile-credits 400 in prod) and any future cron changes.

## Current behavior

- **Middleware:** `middleware.ts` skips auth for paths starting with `/api/cron/` (returns `NextResponse.next()`). No CRON_SECRET check in middleware.
- **Route auth:** Each cron route (e.g. `app/api/cron/reconcile-credits/route.ts`) checks `Authorization: Bearer <CRON_SECRET>` and returns 401 if missing/invalid, 500 if `CRON_SECRET` env is unset.
- **Vercel:** `vercel.json` defines cron schedules; Vercel invokes the routes and sends `x-vercel-cron` (and should send the configured secret if set in project env).

## Stable test method (local or CI)

1. **Set CRON_SECRET** in `.env.local` (or test env).
2. **Start app:** `npm run dev` (or use deployed URL for prod check).
3. **Call cron with secret:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/reconcile-credits"
   ```
   Expected: `200` (or `500` if DB/env issue). If `401`, secret is wrong or missing.
4. **Call without secret:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/cron/reconcile-credits"
   ```
   Expected: `401`.

## Production 400 note

If production returns **400** (not 401) with the correct `CRON_SECRET`, the request may not be reaching the route handler (e.g. platform/WAF/body size). EXECUTION_STATUS Phase AO-4D-3 documents this; fix may require platform-level inspection or verifying how Vercel sends the cron secret. Do not change `middleware.ts` or cron route logic without approval (critical-file policy).

## Verification checklist

- [ ] Local: GET with `Authorization: Bearer <CRON_SECRET>` returns 200 or 500 (not 400/401).
- [ ] Local: GET without header returns 401.
- [ ] Prod: Same as local if 400 persists, escalate per EXECUTION_STATUS.

## References

- `middleware.ts` — cron path skip.
- `app/api/cron/reconcile-credits/route.ts` — GET handler and CRON_SECRET check.
- `vercel.json` — cron schedule and paths.
- `docs/_CANONICAL/EXECUTION_STATUS.md` — Phase AO-4D, AO-4D-2, AO-4D-3.
