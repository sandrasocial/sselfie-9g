# Admin — Feature doc

**Purpose:** Single source of truth for how the Admin feature works end-to-end. For agents, North, and product. Admin is operator-only (Sandra); not a member-facing feature.

---

## 1. Overview

- **Feature name:** Admin (operator dashboard)
- **One-line:** Internal dashboard for ops: metrics, errors, cron status, conversions, Brand Engine applications, Academy content, feedback, credits, newsletter, agents, mission control, Maya Studio, login-as-user; all gated by admin email.
- **Entry points:**
  - `/admin` — main dashboard; layout enforces admin (redirect to 404 if not admin email).
  - `/admin/*` — all admin sub-routes under same layout.
- **Who can access:** Only user with email `ssa@ssasocial.com` (hardcoded in `app/admin/layout.tsx` and `app/admin/page.tsx`). Enforced via `getAuthenticatedUser` and email check; non-admin redirected to 404 or home.

---

## 2. User journey (start to finish)

| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Go to `/admin` | Auth check; if not admin email → redirect 404. Else load `AdminDashboard`. |
| 2 | Dashboard | Metrics (users, subscriptions, MRR, revenue, conversion); admin errors; cron jobs (last run, status); conversion ops; links to sub-pages. |
| 3 | Sub-pages | Nav to: Analytics, Brand Engine applications, Academy (content mgmt), Academy products, Testimonials, Newsletter review, Mission control, Maya Studio, Login as user, Feedback, Credits, Agents. |
| 4 | Analytics | Funnel, cohorts, ARPU/churn, brand engine launch, cohort delivery load. |
| 5 | Brand Engine | Applications list, quick-add, update, send offer, Calendly. |
| 6 | Academy | Courses, lessons, templates, monthly drops, flatlay images; CRUD; grant access. |
| 7 | Newsletter review | Pending/recent/rejected; approve, reject, test send. |
| 8 | Feedback | Feedback list; reply, AI assist. |
| 9 | Credits | Grant credits, user lookup. |
| 10 | Mission control / Maya Studio / Agents | Operational tools and prompts. |
| 11 | Login as user | Impersonate user (sets cookie); exit from studio banner. |

---

## 3. Frontend

- **Routes (pages):**
  - `app/admin/layout.tsx` — server; admin check; redirect non-admin.
  - `app/admin/page.tsx` — server; neon user + admin check; renders `AdminDashboard`.
  - `app/admin/analytics/page.tsx`, `app/admin/brand-engine-applications/page.tsx`, `app/admin/academy/page.tsx`, `app/admin/academy/products/page.tsx`, `app/admin/testimonials/page.tsx`, `app/admin/newsletter-review/page.tsx` (and client), `app/admin/mission-control/page.tsx`, `app/admin/maya-studio/page.tsx`, `app/admin/login-as-user/page.tsx`, `app/admin/feedback/page.tsx`, `app/admin/credits/page.tsx`, `app/admin/agents/page.tsx`
- **Main component(s):**
  - `components/admin/admin-dashboard.tsx` — main dashboard: stats, errors, cron list, conversion ops, nav.
  - `components/admin/admin-nav.tsx`, shared cards, and feature-specific clients (e.g. `applications-client.tsx`, `newsletter-review-client.tsx`).
- **Key UI state:** Per-page (applications, courses, feedback, etc.); dashboard state for stats and cron.
- **Navigation:** Admin nav links to each sub-route.
- **Code paths:** `components/admin/*.tsx`, `app/admin/**/*.tsx`

---

## 4. Backend

- **API routes (admin):**
  - Dashboard / stats: `app/api/admin/analytics/*`, `app/api/admin/diagnostics/*` (cron-status, errors, schema-health, create-missing-tables)
  - Brand Engine: `app/api/admin/brand-engine-applications/update/route.ts`, `app/api/admin/brand-engine-applications/quick-add/route.ts`, `app/api/admin/brand-engine-applications/send-offer/route.ts`, `app/api/admin/brand-engine-calendly/route.ts`
  - Academy: `app/api/admin/academy/courses`, `lessons`, `templates`, `monthly-drops`, `flatlay-images`, `grant-access`
  - Newsletter / email: `app/api/admin/email/preview`, campaign/approve/reject flows
  - Feedback: `app/api/admin/feedback/route.ts`, `app/api/feedback/route.ts`, `app/api/feedback/ai-response/route.ts`
  - Credits: admin credits grant (route under admin)
  - Other: `app/api/admin/agent/*`, `app/api/admin/tasks`, `app/api/admin/run-migration`, `app/api/admin/training/*`, `app/api/admin/scene-prompts-v2/*`, `app/api/admin/feed-styles-v2/*`, `app/api/admin/notifications`, `app/api/admin/growth-forecast`, etc.
- **Cron / webhooks:** Many crons (see `vercel.json` and `app/api/cron/*`); admin dashboard reads `admin_cron_runs`, `admin_email_errors`; cron health check endpoint.
- **Code paths:** `app/api/admin/**/*.ts`, `lib/admin/*.ts`, `lib/auth-helper.ts` (getAuthenticatedUser)

---

## 5. Logic (credits, entitlements, access)

- **Credits:** Admin can grant credits (credits page); no deduction on admin UI.
- **Entitlements / access:** Admin = single email `ssa@ssasocial.com` in layout and page; no role table in this path. Impersonation: cookie set on login-as-user; studio shows banner; exit clears.
- **Data flow:** Reads/writes users, subscriptions, applications, academy content, feedback, cron runs, error log; Stripe and DB.

---

## 6. Code map (for agents)

- **Pages:** `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/analytics/page.tsx`, `app/admin/brand-engine-applications/page.tsx`, `app/admin/academy/page.tsx`, `app/admin/academy/products/page.tsx`, `app/admin/testimonials/page.tsx`, `app/admin/newsletter-review/page.tsx`, `app/admin/mission-control/page.tsx`, `app/admin/maya-studio/page.tsx`, `app/admin/login-as-user/page.tsx`, `app/admin/feedback/page.tsx`, `app/admin/credits/page.tsx`, `app/admin/agents/page.tsx`
- **Components:** `components/admin/admin-dashboard.tsx`, `components/admin/admin-nav.tsx`, `components/admin/*.tsx`
- **API routes:** `app/api/admin/**/*.ts`
- **Lib / shared:** `lib/admin/*.ts`, `lib/auth-helper.ts`

---

## 7. Current value / pain (research)

- **Current value:** Single place for ops (Sandra’s dashboard): metrics (users, subscriptions, MRR), cron health (all jobs running clean—no errors or failures), Brand Engine applications (active pipeline for high-ticket), Academy content management, feedback review with AI assist, credits grant, newsletter approve/reject workflow.
- **Pain / friction:**
  - No activation alerts: 14 new users in last 24h, but 0/14 (0.0%) have generated content. Sandra has no early alert when a new user signs up but never activates (no generation within 24h).
  - No churn early-warning: 24 canceled memberships exist; 1 past_due subscription. Sandra manually scans subscriptions but has no dashboard-level alerts for members approaching cancellation.
  - No automated win-back triggers: Canceled users visible but no admin-side prompts to trigger re-engagement emails or win-back flows.
  - Credit purchase linkage backlog: 80 active-unresolved credit_transactions missing stripe_payment_id (historical backlog, >30 days old). Blocks revenue reconciliation; requires manual investigation.
  - No "today’s priority" panel: Sandra must hunt across multiple sub-pages to surface the highest-priority action (e.g. past_due sub, pending newsletters, feedback awaiting reply).
- **Audience evidence:** Operator-only (Sandra). Pain = workflow efficiency and visibility into top-of-day actions.

---

## 8. Opportunities (for rebuild / AI)

- **Activation alerts (high impact):** Flag new users who have not generated content within 24h of signup. Trigger auto-email ("Ready to create?") or dashboard alert for Sandra to follow up. Bridge gap between acquisition and first activation.
- **Churn early-warning dashboard:** Surface subscriptions approaching cancellation (e.g. multiple support tickets, low usage in past 7 days, approaching renewal). Rank by risk level. Enable proactive retention.
- **Win-back automation:** Canceled memberships → trigger automated win-back email series (discount offer, highlight new Academy content). Admin can toggle on/off and track win-back conversion.
- **Credit purchase linkage cleanup:** Batch job to reconcile 80 historical unresolved credit_transactions with Stripe (lookup by user_id + created_at window). Auto-link or flag for manual review. Restore revenue audit accuracy.
- **Sandra's to-do panel:** Dashboard widget showing today's highest-priority actions: (1) past_due subscriptions, (2) pending newsletters awaiting approval, (3) feedback replies in progress, (4) activated users (count/trend). One-click nav to each.
- **AI-assist for feedback replies:** Already in Feedback feature (app/api/feedback/ai-response); ensure visible / accessible from Admin feedback page. Reduce manual reply load.
- **Constraints:** Admin email (`ssa@ssasocial.com`) must remain hardcoded and enforced; no exposure of admin APIs to non-admin users; all alerts/actions scoped to operator workflow only.

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-02-25 | Research pass: §7 and §8 filled from funnel/support/friction digests. |
| 2026-02-25 | Initial doc from codebase audit (North). |
