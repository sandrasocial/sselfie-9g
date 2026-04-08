# URGENT: Fix Vercel Deploy Blocker
**Created:** 2026-03-02
**Priority:** P1 — site is serving stale code

---

## Situation
6 consecutive Vercel deployments have failed since ~14:00 CET today.
The build PASSES locally and on Vercel (compiled in 18.8s ✓).
The failure happens in Vercel's post-build deployment phase.

**First failing commit:** `8672e04d` — "feat(cron): add nurture-sequence to vercel.json daily 10am"
**Last working deploy:** `982f3932` — running live now on sselfie.ai

## What Is NOT the Problem
- vercel.json syntax — it's valid JSON, correct cron format
- Build compilation — passes every time
- TypeScript / vitest — clean

## What to Investigate

### 1. Check the new cron route files Stella wrote
These two routes were added as part of the email reboot and are new to Vercel:
- `app/api/cron/nurture-sequence/route.ts`
- `app/api/cron/onboarding-sequence/route.ts`

Check for:
- Any imports that could cause bundling issues (dynamic imports, edge runtime mismatches)
- Missing `export const runtime = 'nodejs'` or incorrect runtime declaration
- Any top-level `await` or module-level side effects
- File size — if the template strings are very large they can hit limits
- Any imports from packages not available in Vercel's Node.js runtime

### 2. Compare with win-back-sequence (which deploys fine)
`app/api/cron/win-back-sequence/route.ts` is in vercel.json and deploys successfully.
Diff the structure of the new routes against win-back-sequence to find the difference.

### 3. Check next.config.js
Look for any configuration that might conflict with the new routes.

## Fix Instructions
1. Identify the root cause
2. Fix minimally — do not refactor unrelated code
3. Commit as: `fix(cron): unblock vercel deploy — [description of fix]`
4. Verify deploy succeeds before reporting done
5. Report the fix commit SHA back to Sandra

## Context
- All email automation code (N1-N5 templates, nurture rewrite, onboarding-sequence) is committed but NOT live until this is fixed
- The freebie funnel smoke test is also blocked
- Do not touch vercel.json cron entries — those stay as-is
