# 🔴 CODEX TASK: CLEANUP-01
**Created:** 2026-02-20 by Claude (AI Director)
**Priority:** CRITICAL — Do before any new feature work
**Estimated time:** 3-4 hours

---

## CONTEXT

Sandra has made 5 confirmed decisions. Your job is to execute them cleanly.
Read STATUS.md before starting. Update STATUS.md when done.

---

## YOUR 5 TASKS IN ORDER

---

### TASK 1 — PAUSE ALL EMAIL CRONS (do this first, takes 5 min)

**Why:** RESEND_AUDIENCE_ID in Vercel production is wrong (E-02). Every cron sending email is potentially hitting the wrong audience. We don't know what's going out. Stop everything until email is rebuilt properly.

**What to do:**
Open `vercel.json`. Find the `crons` array. Comment out every single cron entry EXCEPT:
- `reconcile-credits`
- `reconcile-subscriptions`
- `reconcile-generations`
- `reconcile-ai-images`
- `reconcile-feed-posts`
- `reconcile-pro-photoshoot-grids`
- `resolve-pending-payments`
- `cron-health-check`

Keep those reconcile/payment ones running — they're not email, they're data integrity.

Pause everything else. That means ALL of these:
- sync-audience-segments
- refresh-segments
- send-blueprint-followups
- nurture-sequence
- reactivation-campaigns
- blueprint-discovery-funnel
- reengagement-campaigns
- send-scheduled-campaigns
- send-scheduled-newsletters
- backfill-resend-audience
- welcome-sequence
- monthly-usage-recap
- referral-rewards
- milestone-bonuses
- upsell-campaigns
- admin-alerts
- reindex-codebase
- funnel-report-daily
- cohort-report-weekly
- arpu-churn-weekly
- cohort-delivery-load-weekly
- brand-engine-launch-digest
- blueprint-email-sequence
- cold-reeducation-sequence
- subscription-ending-soon
- win-back-sequence
- welcome-back-sequence
- product-qa-daily

**Do not delete them — just comment them out in vercel.json. We'll rebuild email properly later.**

Deploy to production after this change.

---

### TASK 2 — DELETE PLACEHOLDER ADMIN PAGES (10 min)

Delete these directories completely:
- `app/admin/content-engine/`
- `app/admin/generation/`
- `app/admin/marketing/`
- `app/admin/exit-impersonation/`

Also delete associated API routes:
- `app/api/admin/content-engine/` (entire directory)
- `app/api/admin/marketing/` (entire directory)

Also delete or disable these admin pages Sandra confirmed she doesn't use:
- `app/admin/content-templates/`
- `app/admin/fashion-styles/`
- `app/admin/feed-styles-v2/`
- `app/admin/libraries/`
- `app/admin/journal/`
- `app/admin/project-tracker/`

⚠️ Before deleting the last 6: check if any other page imports from them. If yes, note it in STATUS.md and skip that one. Safety first.

---

### TASK 3 — KILL FLODESK AND LOOPS (15 min)

Sandra's confirmed answer: **Resend only.**

**What to do:**
1. Search entire codebase for any import or use of:
   - `lib/flodesk.ts`
   - `FLODESK_API_KEY`
   - `LOOPS_API_KEY`
   - `loops` (as a library)
   - `flodesk` (as a library)

2. List every file that uses these.

3. For each file:
   - If the ONLY thing the file does is Flodesk/Loops → delete the file
   - If it uses Flodesk/Loops alongside other things → remove just the Flodesk/Loops code, keep the rest

4. Delete `lib/flodesk.ts`

5. In `.env.local`, comment out (don't delete):
   - `LOOPS_API_KEY`
   - `FLODESK_API_KEY`

6. Note in STATUS.md: "Flodesk and Loops removed. Resend is the only email platform."

---

### TASK 4 — VERIFY E-02 (RESEND_AUDIENCE_ID in Vercel production) (10 min)

This is the bug that caused broadcasts to hit 1 person instead of 3,021.

**What to do:**
1. Check the current `RESEND_AUDIENCE_ID` in Vercel production environment variables
2. Check the value in `.env.local`: it's `762d7ab8-7a72-40d1-8f26-9ddfcff52e73`
3. Confirm whether Vercel production has this SAME value or a different one
4. If different → update Vercel production to match `.env.local`
5. Report the finding in STATUS.md clearly:
   - What was the wrong value (if any)
   - What it's been set to now
   - Confirmed fixed: yes/no

---

### TASK 5 — CLEAN UP ROOT MARKDOWN DOCS (20 min)

There are 40 markdown files in the project root. This is doc bloat from 8 months of planning.

**What to do:**
1. Create folder: `docs/archive/root-cleanup-2026-02-20/`
2. Move ALL .md files from root EXCEPT these 4:
   - `README.md` — keep in root
   - `AGENTS.md` — keep in root (Codex reads this)
   - `STATUS.md` — keep in root (new handover file)
   - `DECISIONS.md` — keep in root (active decisions)
3. Move everything else to `docs/archive/root-cleanup-2026-02-20/`
4. Commit with message: `chore: archive root markdown bloat`

---

## DEFINITION OF DONE

Before you mark this complete, confirm all 5 tasks are done and update STATUS.md with:

```
## Last Updated: [timestamp]
## Last Task: CLEANUP-01 complete
## What's Live in Production:
- All email crons paused (except reconcile/payment jobs)
- E-02 status: [fixed/not fixed/finding]
- Flodesk + Loops removed
- [X] placeholder admin pages deleted
- Root docs archived

## What's Broken / Unconfirmed:
[anything you found during cleanup]

## Currently In Progress:
Nothing — awaiting next task from Claude

## Next Task:
CLEANUP-02 will cover Maya component audit (which header is live?)
Feed planner audit
Dead API route removal

## Blocked On Sandra:
Nothing — she has approved all 5 decisions
```

---

## WHAT YOU MUST NOT DO

- Do NOT touch the Maya components — that's CLEANUP-02
- Do NOT touch the feed planner — that's CLEANUP-02  
- Do NOT start A-01 (Academy) until CLEANUP-01 is done
- Do NOT delete the cron files themselves — only pause them in vercel.json
- Do NOT remove Resend code — only Flodesk and Loops
- Do NOT make any UI changes

---

## IF YOU GET STUCK

Write your blocker to STATUS.md under "Blocked On Sandra" and stop.
Do not guess. Do not proceed past a blocker.
