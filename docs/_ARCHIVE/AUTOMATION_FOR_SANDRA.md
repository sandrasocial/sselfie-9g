# Automation — No Code Required (Sandra)

**You don’t need to run any code or commands.** This page explains what runs by itself and the one-time setup.

---

## What runs automatically

1. **Daily evidence (GitHub Actions)**  
   Every day at **6:00 AM UTC**, the repo runs:
   - Revenue and subscription audits  
   - Funnel and support digests  
   - Triage report  
   - Archiving of old reports (7 days for triage, 30 days for the rest)  

   Updated files are committed to the repo under `output/automation/`. You’ll see commits like:  
   **"chore(automation): daily evidence update"**.

2. **Weekly KPI gate**  
   Use the **Weekly KPI gate review** section in `docs/AI_PROGRESS_TRACKER.md` each week. It points to the same `output/automation/` files so you can check Paid-flow, Reliability, UX, and Rollback.

3. **Vercel crons (already configured)**  
   Credits reconciliation, payments, feed/generation sync, and other jobs run on Vercel’s schedule. No action needed from you.

---

## One-time setup for daily evidence

For the daily automation to run in GitHub, the repo needs access to the database:

1. Open your repo on GitHub.  
2. Go to **Settings → Secrets and variables → Actions**.  
3. Click **New repository secret**.  
4. Name: **`DATABASE_URL`**  
5. Value: the same connection string you use for the app (from Vercel env or your `.env.local`; **do not** commit this value into the repo).  
6. Save.

After that, the **Automation daily** workflow will run on schedule and keep `output/automation/` up to date. You don’t need to run anything yourself.

---

## If you want to run it manually (optional)

Only if you or someone with dev access wants to run the same automation from a machine that has the repo and env:

- **One command for everything:**  
  `npm run automation:daily`  
  (Requires `DATABASE_URL` in `.env.local` or in the environment.)

Individual steps are also available:

- `npm run automation:triage`
- `npm run automation:funnel`
- `npm run automation:support`
- `npm run automation:archive`
- `npm run audit-revenue`
- `npm run audit-subscriptions`

---

## Where to look for evidence

| What you need        | Where to look                                      |
|----------------------|----------------------------------------------------|
| Revenue / billing    | `output/automation/revenue-audit-*.md`, `subscription-audit-*.md` |
| Funnel / activation  | `output/automation/funnel-digest-*.md`             |
| Support / issues     | `output/automation/support-digest-*.md`            |
| Cron / reliability   | `output/automation/triage-*.md`                    |
| Weekly gate checklist | `docs/AI_PROGRESS_TRACKER.md` → “Weekly KPI gate review” |

---

**Summary:** Add **`DATABASE_URL`** once in GitHub Actions secrets. After that, daily evidence runs and commits by itself; you only use the Weekly KPI gate and the links above to review.
