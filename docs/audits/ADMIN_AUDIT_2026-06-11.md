# Admin System Audit — 2026-06-11

> Historical snapshot. The Instagram inbox/reply agent described below was retired and removed on
> 2026-07-12. Current admin navigation is Home · Content · Support · Tools. Do not use the old
> `/admin/ig-inbox` recommendations as a build plan.

*Read-only audit of `/admin`, `/api/admin`, admin emails, and every place admin numbers are computed. Includes live Neon queries run 2026-06-11 to prove where numbers disagree.*

---

## 0. Executive Summary (plain language)

Sandra, your admin is overwhelming because it grew by addition, never by subtraction. Right now you have:

- **14 admin pages** (11 in the nav), built across 5 different eras of the business. At least 5 of them try to answer the same question ("how is the business doing?") with **different math**, so they show different numbers for the same thing.
- **47 admin API routes**, of which **12 have no page that calls them** and **3 more are called by buttons that 404** because the route was deleted but the button wasn't.
- **6+ different robot emails**, written by different systems, some doing math that is simply wrong (the "Margin Alert" email literally invents a $15-per-user AI cost and compares all-time revenue to made-up costs).
- The biggest problem: **two of your dashboards count money from analytics events, which get dropped.** In the last 30 days the analytics funnel counted **0 purchases** while Stripe actually collected **44 payments worth $1,498.99**. Another widget on the same page would show **$4,164** for the same period because it forgets to exclude test payments and backfilled history. Three numbers, one truth.

The fix is not more dashboards. It is: **one home page that answers four questions from Stripe truth, one daily email, alert emails only for real emergencies, and everything else demoted to "tools you open when you need them."** Section 7 is the full proposal.

---

## 1. Page Inventory (14 pages)

| # | Route | What it shows | Reads from | Who uses it | Last commit | Lines |
|---|-------|---------------|-----------|-------------|------------|-------|
| 1 | `/admin` (root) — `app/admin/page.tsx` + `components/admin/admin-dashboard.tsx` | "Business Health": MRR, subscriptions, total revenue, canceled 30d, **Conversion Ops 90d (Brand Engine — dead, always zeros)**, cron status, admin errors, quick links, Instagram connect button | `/api/admin/dashboard/stats`, `/api/admin/diagnostics/errors`, `/api/admin/diagnostics/cron-status` | Sandra (entry point) | 2026-05-28 | 79 + 481 |
| 2 | `/admin/analytics` | 20+ metric cards across 6 eras: funnel daily, cohorts, **Brand Engine launch (dead)**, ARPU/churn, activation KPI, selfie guide, "2026 funnel", revenue engine | 9 API routes under `/api/admin/analytics/*` → `lib/analytics/reports.ts` | Nobody can read it; mixes correct Stripe numbers with wrong analytics-event numbers | 2026-05-13 | 1,269 |
| 3 | `/admin/growth-intelligence` | Prompt Vault funnel, IG signals, support threads, prompt copy signals, attribution, "fix first" priorities | `lib/admin/growth-intelligence.ts` (server-side, no API) | Sandra; same lib feeds the daily briefing email | 2026-05-30 | 427 |
| 4 | `/admin/daily-briefing` | Web version of the daily email + content calendar planner + Codex task memory board | `lib/admin/growth-intelligence.ts`, `lib/admin/daily-sandra-briefing.ts`, `lib/admin/content-planner.ts`, `lib/admin/codex-task-memory.ts`, `/api/admin/content-planner*`, `/api/admin/codex-task-memory` | Duplicate of email + growth-intelligence page | 2026-05-31 | 740 |
| 5 | `/admin/prompt-vault` | Prompt Vault launch monitor: visits → checkout → purchases → access → copies | Direct SQL: `analytics_events` (behavior) + `stripe_payments` (money ✓) + `checkout_attribution` + `email_logs` | Sandra during launch | 2026-06-03 | 625 |
| 6 | `/admin/selfie-to-brand-shoot` | Same launch-monitor pattern for the Selfie→Brand-Shoot product | Direct SQL: `analytics_events` + `stripe_payments` (✓) + `email_logs` | Sandra during launch | 2026-06-05 | 314 |
| 7 | `/admin/customer-support` | Customer lookup: entitlements, payments, email history, feedback threads, reply | `/api/admin/customer-support` (users, user_entitlements, stripe_payments, email_logs, feedback, freebie_subscribers) | Sandra when a customer writes | 2026-05-31 | 524 |
| 8 | `/admin/webhook-review` | Unresolved Stripe webhook fulfillment failures, resolve with notes | `/api/admin/webhook-review` (`webhook_events_needs_review`) | Sandra when the alert email fires | 2026-05-13 | 271 |
| 9 | `/admin/ig-inbox` **(NEW — model for new admin)** | IG DM/comment inbox with agent drafts, approve/edit/send | `/api/admin/ig-inbox`, `/api/admin/ig-inbox/[id]/reply` | Sandra daily | 2026-05-28 | 18 (+client) |
| 10 | `/admin/content-brief` **(NEW — model for new admin)** | Weekly content brief reports (8 latest), generate on demand | `/api/admin/content-brief` → `lib/content-engine/brief-generator.ts` | Sandra weekly | 2026-06-11 | 30 (+client) |
| 11 | `/admin/academy` | Course/lesson/template/drop/flatlay CMS + grant access | 11 routes under `/api/admin/academy/*` | Sandra/Codex when editing course content | 2026-05-14 | 2,235 |
| 12 | `/admin/credits` ("USERS" in nav) | Search a user, add credits | `/api/admin/users/search`, `/api/admin/credits/add` | Sandra when fixing a customer | 2026-01-14 | 70 (+287) |
| 13 | `/admin/testimonials` | Approve/manage testimonials | `/api/admin/testimonials` | Rare | 2026-01-04 | 748 |
| 14 | `/admin/preview/selfie-to-brand-shoot` | Renders the customer course shell as Sandra, for QA | none (component preview) | Sandra/Codex QA | 2026-06-02 | 23 |

**Nav reality:** `components/admin/admin-nav.tsx` lists 11 items. `content-brief` and `selfie-to-brand-shoot` are NOT in the nav (you can only reach them by URL), while dead-weight pages like `analytics` are front and center.

---

## 2. API Inventory (47 routes under `app/api/admin/`)

### Called by a page (35 routes)

| Route group | Routes | Called by |
|---|---|---|
| `academy/*` | 11 (courses ×2, lessons ×2, templates ×2, monthly-drops ×2, flatlay-images ×2, grant-access) | `/admin/academy` |
| `analytics/*` | 9 (funnel-daily, funnel-2026, cohorts-weekly, brand-engine-launch, arpu-churn-weekly, cohort-delivery-load, activation-kpi-7d, selfie-guide, revenue-engine) | `/admin/analytics` |
| `content-planner/*` | 3 (board, refresh-instagram, upload) | `/admin/daily-briefing` (visual planner) |
| `ig-inbox` + `ig-inbox/[id]/reply` | 2 | `/admin/ig-inbox` |
| `diagnostics/errors`, `diagnostics/cron-status` | 2 | `/admin` root |
| `dashboard/stats` | 1 | `/admin` root |
| `codex-task-memory` | 1 | `/admin/daily-briefing` |
| `content-brief` | 1 | `/admin/content-brief` |
| `credits/add`, `users/search` | 2 | `/admin/credits` |
| `customer-support` | 1 | `/admin/customer-support` |
| `testimonials` | 1 | `/admin/testimonials` |
| `webhook-review` | 1 | `/admin/webhook-review` |

### Orphans — no caller anywhere in the repo (12 routes)

| Route | Verdict |
|---|---|
| `dashboard/revenue` | True orphan. Old revenue dashboard endpoint; computes its own MRR from list prices (a 4th MRR formula). Delete. |
| `dashboard/email-metrics` | True orphan. Delete. |
| `dashboard/webhook-health` | True orphan (webhook-review page uses its own route). Delete. |
| `email-preview/prompt-vault-launch` | One-off launch preview. Delete after launch. |
| `users/v2-flag` | True orphan (per-user v2 flag toggle). Delete or keep as curl tool. |
| `verify-anthropic-key` | Curl diagnostic. Keep undocumented or delete. |
| `verify-stripe-config` | Curl diagnostic. Keep. |
| `stripe/payment-drift` | Intentional ops endpoint (documented in `docs/business/TRACKING_01_STRIPE_PAYMENT_SYNC_FIX_REPORT_2026-06-05.md`). Keep. |
| `stripe/backfill-customer-ids` | One-off backfill tool. Delete after confirming run. |
| `stripe/sync-products` | Ops tool. Keep. |
| `growth-intelligence` | JSON mirror of the lib for Cowork/cron access (accepts CRON_SECRET). Keep. |
| `daily-sandra-briefing` (admin, not cron) | Preview endpoint for the briefing email. Keep while the email exists. |

### Broken callers — buttons that 404 (routes deleted, fetches remain)

| Missing route | Still fetched from |
|---|---|
| `/api/admin/prompt-guide/approve-item` | `components/sselfie/maya-chat-screen.tsx:3024` |
| `/api/admin/prompt-guides/list` | `components/sselfie/maya/maya-header.tsx:144`, `components/sselfie/pro-mode/ProModeHeader.tsx:101` |
| `/api/admin/prompt-guides/create` | `components/sselfie/maya/maya-header.tsx:168`, `components/sselfie/pro-mode/ProModeHeader.tsx:125` |

These are admin-only affordances inside Maya's UI. Every click fails silently. Either delete the UI or restore the routes.

---

## 3. Number Conflicts (the core problem)

### Live evidence (read-only Neon queries, 2026-06-11, 30-day window)

| Query | Result |
|---|---|
| `analytics_events` where `event_name='purchase'` | **0 purchases** |
| `stripe_payments` (payment_date 30d, status succeeded/paid, no test) | **44 payments, $1,498.99** |
| `stripe_payments` (created_at 30d, NO status/test filter — what funnel-daily uses) | **95 rows, $4,164.25** (51 rows are backfilled history) |
| `analytics_events` `prompt_vault_checkout_success` | **10** |
| `stripe_payments` prompt_vault purchases (truth) | **20, $540** — analytics undercounts by half |
| Active studio memberships with a real Stripe subscription id | **8** |
| "Active subscriptions" without the stripe-id filter | **45** (includes 14 blueprint, 13 starter kit, 7 selfie guide, 3 strategy pack one-time rows stored as "subscriptions") |
| `brand_engine_applications` (root dashboard "Conversion Ops 90d" + analytics "90D Applications/Cash") | **0 rows ever** |

### Conflict table

| Metric | Computation | Source | Verdict |
|---|---|---|---|
| **Revenue (totals)** | `lib/revenue/db-revenue-metrics.ts` | `stripe_payments`, status paid+succeeded, no test | ✅ TRUTH (DB) |
| | `lib/revenue/single-source.ts` | Stripe API + db-revenue-metrics, 5-min cache | ✅ TRUTH (live) |
| | `lib/analytics/reports.ts:175-181` `generateFunnelDailyReport` → analytics "Revenue (24h)" card | `stripe_payments` **without** status or `is_test_mode` filter, on `created_at` | ❌ BUG — counts failed/test/backfilled rows; 30d equivalent shows $4,164 vs $1,499 true |
| | `lib/analytics/reports.ts` `generateRevenueEngineWeeklyReport` → analytics "Email Revenue", "Revenue Sessions" | `checkout_attribution.purchase_value_cents` | ❌ DATA CORRECTNESS BUG — money from attribution rows, not Stripe; only valid as a ratio, shown as revenue |
| | `lib/admin/metrics.ts` `calculateTotalRevenue` → margin-alert email | `stripe_payments` but **status='succeeded' only** | ⚠️ Undercounts: 26 of the last 95 rows have status `'paid'` ($1,435.63 missed in 30d) |
| **Purchases** | `generateFunnelDailyReport` / `generateFunnel2026Snapshot` (`lib/analytics/reports.ts:137-141, 242-262`) → analytics "Purchases", "2026 Purchases" cards | `analytics_events` `purchase` / `*_checkout_success` events | ❌ DATA CORRECTNESS BUG — 0 events vs 44 real payments; the flagship funnel page says nobody is buying while ~$1.5K came in |
| | `lib/admin/growth-intelligence.ts:62-71` | `stripe_payments` filtered | ✅ TRUTH (note: line 280 falls back to `eventCounts.checkoutSuccesses` when payments=0 — acceptable but should be labeled) |
| | `/admin/prompt-vault`, `/admin/selfie-to-brand-shoot` pages | `stripe_payments` | ✅ TRUTH |
| **MRR** | `/api/admin/dashboard/stats` | Stripe API primary, DB list-price fallback | ✅ acceptable (labels source) |
| | `/api/admin/dashboard/revenue` (orphan) | `subscriptions` count × list price | ❌ wrong for beta pricing (€47/79/99 members) — delete with the route |
| | `lib/admin/metrics.ts` `calculateMRR` → margin-alert email | `subscriptions` count × list price | ❌ same flaw, feeds an email |
| | `generateArpuChurnWeeklyReport` | Stripe API | ✅ TRUTH |
| **Member count** | `dashboard/stats` recurring filter (stripe_subscription_id required) | `subscriptions` | ✅ 8 — matches reality |
| | Any "active subscriptions" without the stripe-id filter (metrics.ts MRR query, cohort reports `paid_active`) | `subscriptions` | ⚠️ 45 — silently includes one-time products stored as subscription rows |
| **Costs/Margin** | `lib/admin/metrics.ts` + `lib/admin/alerts.ts` | Hardcoded `$0.15/credit`, `$11.25/referral`, **`$15/user` "estimated Claude cost"** vs all-time revenue | ❌ Fiction. The entire margin-alert email is built on invented numbers |
| **Funnel conversion** | growth-intelligence (checkout_attribution for starts, stripe_payments for purchases) | mixed, money side correct | ✅ best current pattern |
| | analytics funnel-2026 `purchaseFromCheckoutStartPct` | analytics_events both sides | ❌ rates from dropped events |

### The three worst findings

1. **`/admin/analytics` reports purchases from `analytics_events`.** `generateFunnelDailyReport` and `generateFunnel2026Snapshot` in `lib/analytics/reports.ts` count `purchase` / `*_checkout_success` events. Live DB: **0 purchase events in 30 days vs 44 real Stripe payments ($1,498.99)**. Sandra's main analytics page tells her nothing is selling when it is.
2. **The analytics "Revenue" card has no status/test filter and uses `created_at`.** `lib/analytics/reports.ts:175-181` sums every `stripe_payments` row created in the window. Backfill jobs insert old payments with fresh `created_at`, so the same 30-day window reads **$4,164 vs the true $1,499** — a 2.8× overstatement sitting one card away from the undercount in finding 1.
3. **The "Margin Alert" email is fabricated.** `lib/admin/metrics.ts` + `lib/admin/alerts.ts` + `app/api/cron/admin-alerts/route.ts`: all-time revenue (missing all `status='paid'` rows), MRR from list prices, and a hardcoded $15/user "Claude cost" multiplied by 30-day active users. Any email it sends is noise; it also links to `/admin/analytics`, the page with findings 1–2.

Bonus: **`cron-health-check` emails link to `/admin/cron-health`, a page that does not exist** (`app/api/cron/cron-health-check/route.ts:34`). Every cron alert Sandra clicks lands on a 404.

---

## 4. Email Audit — everything the robots send Sandra

Actual sends to ssa@ssasocial.com in the last 21 days (from `email_logs`): cron-alert ×6, webhook-review-alert ×5, ig_morning_briefing ×1, ig_flag_notification ×1, work_with_me_inquiry_admin ×2, plus her own broadcast/test copies. The daily briefing and margin alert sent **zero**.

| Email | Trigger / schedule | Env gate | Contents | Overlap | Verdict |
|---|---|---|---|---|---|
| **Daily Sandra Briefing** (`app/api/cron/daily-sandra-briefing`, `lib/admin/daily-sandra-briefing.ts`) | Cron daily 06:15 UTC | `DAILY_SANDRA_BRIEFING_ENABLED=true` — currently NOT sending | What's working / leaking, support threads, what to post, Codex next, Sandra next. Money from `stripe_payments` ✓ | Duplicates `/admin/daily-briefing` page, growth-intelligence page, and overlaps ig-morning-briefing + content brief | **KEEP as the ONE daily email** — make it absorb the others, enable it, kill the rest |
| **IG Morning Briefing** (`app/api/cron/ig-morning-briefing`) | Cron daily 06:00 UTC | none (sends if cron runs); started 2026-06-10 | Flagged IG conversations, handled count, top tags | 15 minutes before the Sandra briefing, which already includes IG counts and flags | **MERGE** into Daily Sandra Briefing (one "Inbox: 3 flagged DMs" section) |
| **Margin Alert** (`app/api/cron/admin-alerts`) | Cron daily 07:00 UTC | none; cooldown 24h | "Gross margin below 45%" built from invented costs (see finding 3); sent to ssa@ + hello@ | None — it's noise | **KILL** (delete cron entry + `lib/admin/alerts.ts` + the metrics it leans on) |
| **Cron health alerts** (`app/api/cron/cron-health-check`) | Hourly | `ADMIN_ALERT_EMAILS` / `ADMIN_EMAIL`; 6h cooldown | "CRON STALE / CRON ERRORS / CRON ANOMALY" with job names; links to nonexistent `/admin/cron-health` | None | **KEEP as alert-only** but fix the 404 link (point at `/admin`), and raise thresholds — 6 robot emails in 3 weeks about plumbing is too chatty for a solo founder |
| **Webhook review alert** (`app/api/cron/resolve-pending-payments`) | Every 5 min, cooldown | `ADMIN_EMAIL` | "Payment/webhook issue needs review" with masked customer + link to `/admin/webhook-review` | None — this is real money | **KEEP** — this is the model alert: rare, actionable, links to the page that fixes it |
| **Weekly Content Brief** (`app/api/cron/content-brief-weekly`) | Mondays 06:30 UTC | `CONTENT_BRIEF_ENABLED=true` (new this week) | "Your weekly content brief is ready" → `/admin/content-brief` | Complements, not duplicates, the daily | **KEEP** (weekly) |
| **IG flag notification** (`lib/ig-agent/processor.ts`) | Event-driven, per flagged DM | `IG_AGENT_ADMIN_EMAIL` | One email per flagged conversation | Same content appears next morning in IG briefing | **KEEP** but only for `human_request`/urgent flags; routine flags wait for the daily |
| **Work-with-me inquiry** (`work_with_me_inquiry_admin`) | Event-driven | — | A human wants to pay you | None | **KEEP** |
| **Checkout-recovery copies / vault drop tests** | Sandra-as-test-recipient | — | Test sends | — | Fine, not a system |

**Net result: 6 robot email systems → 1 daily + 1 weekly + 2 real alerts.**

---

## 5. Dead and Stale Surfaces

| Surface | Problem |
|---|---|
| **Brand Engine blocks** — root dashboard "Conversion Ops (90D)", analytics "90D Applications / Closed Won / 90D Cash" cards, `/api/admin/analytics/brand-engine-launch`, `generateBrandEngineLaunchDailyReport` in `lib/analytics/reports.ts` | `brand_engine_applications` has **0 rows ever**. Brand Engine is retired per CLAUDE.md. Permanent zeros on Sandra's home screen. Remove. |
| `/admin/analytics` "2026 funnel" + selfie-guide sections | Built for the superseded Starter Kit/Masterclass ladder; counts purchases from analytics events (wrong) for products that are now secondary. |
| Root dashboard "SSELFIE STUDIO" header + "Studio opens" metrics | Old naming; harmless but stale. |
| `lib/admin/` dead modules (no importers): `email-intelligence.ts`, `get-complete-context.ts`, `get-personal-context.ts`, `get-product-knowledge.ts`, `alex-system-prompt.ts` (+`get-sandra-voice.ts`, only imported by it), `alex-backup-manager.ts`, `email-brand-guidelines.ts`, `email-campaign-helpers.tsx`, `parse-content-calendar.ts`, `universal-prompts-loader.ts`, `prompt-guide-utils.ts` | "Alex" admin-agent era leftovers, ~2,800 lines. Delete. |
| `lib/admin/forecast.ts`, `metrics.ts`, `alerts.ts` | Only used by the fictional margin-alert cron and two test scripts. Delete with it. |
| Maya admin prompt-guide buttons | 404 fetches (Section 2). |
| Unscheduled cron routes (exist in `app/api/cron/` but not in `vercel.json`): `arpu-churn-weekly`, `backfill-resend-audience`, `blueprint-followup-sequence`, `cohort-delivery-load-weekly`, `cohort-report-weekly`, `funnel-report-daily`, `maya-instagram-trends-weekly`, `product-qa-daily`, `referral-bonus-notifications`, `refresh-segments`, `reindex-codebase`, `revenue-engine-weekly`, `send-scheduled-newsletters`, `sync-audience-segments` | 14 routes that never run unless curled. Several only exist to feed `/admin/analytics` report buttons. Prune with the analytics page. |
| 36 archived `zz_archived_20260610_*` tables in Neon | Already archived — good. No admin code reads them (verified by grep). Drop whenever convenient. |
| `/admin/preview/selfie-to-brand-shoot` | Not stale — legitimate QA preview, just unlisted. Keep. |
| Old freebie funnel | `/freebie/*` page code flagged dead in CLAUDE.md; no admin page reads it, no action needed here. |

---

## 6. Overwhelm Map — "does Sandra need this weekly?" (1 = never, 5 = daily/weekly)

| Page | Score | Why |
|---|---|---|
| `/admin` (root) | 5 | Should be the only daily page — but today half its widgets are dead (Brand Engine) or duplicated. |
| `/admin/ig-inbox` | 5 | Real daily work: answer DMs, approve drafts. |
| `/admin/content-brief` | 5 | Weekly content decisions; the new model. |
| `/admin/customer-support` | 4 | Whenever a customer writes; clear and useful. |
| `/admin/growth-intelligence` | 3 | Good data, but it's the daily email in page form — shouldn't be a separate destination. |
| `/admin/webhook-review` | 3 | Only when the alert email fires; must exist, needn't be in daily rotation. |
| `/admin/prompt-vault` | 3 | Useful during launch; should become a product card on home, not its own page. |
| `/admin/selfie-to-brand-shoot` | 2 | Same pattern, smaller product. |
| `/admin/daily-briefing` | 2 | Literally a webpage copy of an email she also gets, plus a planner she doesn't use. |
| `/admin/academy` | 2 | Only when editing courses; a tool, not a dashboard. |
| `/admin/credits` | 2 | Only when fixing a customer; a tool. |
| `/admin/analytics` | 1 | 1,269 lines of conflicting numbers across five dead eras. Causes the "numbers contradict each other" feeling more than any other page. |
| `/admin/testimonials` | 1 | A few times a year. |
| `/admin/preview/*` | 1 | QA only. |

---

## 7. PROPOSAL — The Radically Simpler Admin

### 7.1 One admin home (`/admin`, rebuilt)

One page, four questions, in this order, every number labeled with its source:

1. **"How much money?"** — This week and this month: payments count + dollar total + tiny per-product breakdown. **Source: `stripe_payments` only** (the exact query growth-intelligence already uses: `payment_date` window, `status IN ('succeeded','paid')`, no test mode). A small "live from Stripe" MRR figure from `lib/revenue/single-source.ts`.
2. **"How many paying members right now?"** — Active recurring members (subscriptions with a real `stripe_subscription_id`, verified against Stripe) shown separately from one-time product owners. Today that's **8 members**, not 45.
3. **"What needs my decision today?"** — Three live counters with links: flagged IG conversations (`ig_conversations.status='flagged'` → `/admin/ig-inbox`), unresolved webhook reviews (`webhook_events_needs_review` → `/admin/webhook-review`), new support threads (`feedback.status='new'` → `/admin/customer-support`). If all are zero: "Nothing needs you. Go make content."
4. **"What's my next content move?"** — The latest weekly brief headline + top prompt-copy signal, linking to `/admin/content-brief`.

Below the fold, optional: small launch cards per active product (the prompt-vault/selfie-to-brand-shoot monitors compressed to one row each: visits → checkouts → purchases → revenue, money from `stripe_payments`).

Almost all of this code already exists in `lib/admin/growth-intelligence.ts` — the rebuild is mostly deletion plus one new page.

### 7.2 Keep / Merge / Kill (14 pages)

| Page | Decision | Migration note |
|---|---|---|
| `/admin` | **KEEP (rebuild)** | Replace `admin-dashboard.tsx`; delete Brand Engine "Conversion Ops" block and `dashboard/stats`'s `brand_engine_applications` queries. |
| `/admin/ig-inbox` | **KEEP** | Unchanged. |
| `/admin/content-brief` | **KEEP** | Add to nav. |
| `/admin/customer-support` | **KEEP** | Unchanged. |
| `/admin/webhook-review` | **KEEP** | Off main nav; reached from home counter + alert email. |
| `/admin/credits` | **KEEP (tools)** | Move under a "Tools" menu. |
| `/admin/academy` | **KEEP (tools)** | Tools menu. |
| `/admin/testimonials` | **KEEP (tools)** | Tools menu. |
| `/admin/preview/*` | **KEEP** | Unlisted, QA only. |
| `/admin/growth-intelligence` | **MERGE → home** | Its lib becomes the home page's data layer; page then deleted. |
| `/admin/daily-briefing` | **MERGE → home + daily email** | Content planner board either moves to `/admin/content-brief` or is dropped (Sandra hasn't used it). Codex task memory board → Tools if still wanted. |
| `/admin/prompt-vault` | **MERGE → home product card** | Keep the page until the new home ships, then delete. |
| `/admin/selfie-to-brand-shoot` | **MERGE → home product card** | Same. |
| `/admin/analytics` | **KILL** | Delete page + the 9 `/api/admin/analytics/*` routes + the unscheduled report crons that feed them (`funnel-report-daily`, `cohort-report-weekly`, `revenue-engine-weekly`, `arpu-churn-weekly`, `cohort-delivery-load-weekly`) + the event-based purchase/revenue functions in `lib/analytics/reports.ts`. Keep `getLatestAnalyticsReports` (content-brief uses it). The only thing worth saving is the Stripe-based ARPU/churn function — fold a single churn number into the home page. |

**Totals: 9 keep, 4 merge, 1 kill.** Nav goes from 11 items to 5: **Home · Inbox · Content · Support · Tools**.

Also delete: the 6 true-orphan API routes, the 3 broken Maya prompt-guide fetch buttons, and the ~12 dead `lib/admin/*` modules (Section 5).

### 7.3 One daily email + alert-only exceptions

**The one daily email: "Today's SSELFIE briefing" (06:15).** The existing Daily Sandra Briefing, enabled, with two additions and one rule:
- Absorbs the **IG morning briefing** (flagged DM list + handled count) — then delete that cron.
- Adds a one-line **money header from `stripe_payments`**: "Yesterday: 3 payments, $81. This month: $1,499."
- Rule: every number in it comes from the same `getGrowthIntelligenceReport` call that powers the home page — the email and the dashboard can never disagree.

**Weekly:** Content brief email (Mondays) — already correct.

**Alert-only (the only other robot emails allowed):**
- Webhook/payment review alert (keep as is — it's the gold standard).
- Cron failure alert (keep, fix the `/admin/cron-health` 404 → link to `/admin`, raise the anomaly thresholds so it's rare).
- Work-with-me inquiry + urgent IG flags (a human wants attention now).

**Killed:** Margin Alert cron, IG morning briefing cron (merged), and the temptation to ever add a second daily.

### 7.4 The Data Contract (rule for every agent touching admin)

Add to CLAUDE.md:

> **Admin data contract (locked):**
> 1. Every metric on an admin page or in an admin email must display its source: `Stripe`, `stripe_payments`, `subscriptions`, `analytics_events`, or `checkout_attribution`.
> 2. **Money (revenue, purchases, refunds, MRR) may ONLY come from `stripe_payments` (with `status IN ('succeeded','paid')`, `is_test_mode` excluded, windowed on `payment_date`) or the live Stripe API.** Code that derives money from `analytics_events` or `checkout_attribution` is a data-correctness bug — fix or delete on sight.
> 3. **Member counts** may only come from `subscriptions` rows with a non-empty `stripe_subscription_id` (or Stripe directly). One-time products stored in `subscriptions` are "owners", never "members".
> 4. `analytics_events` is for **behavior only** (views, clicks, copies, opens). `checkout_attribution` is for **where buyers came from**, never how much they paid.
> 5. No new admin page, metric card, or admin email without removing or merging an existing one.

### 7.5 Suggested build order (3 Codex tasks)

1. **ADMIN-01 — Stop the wrong numbers** (smallest, highest value): fix/remove the analytics-event purchase metrics and the unfiltered revenue sum in `lib/analytics/reports.ts`; delete the margin-alert cron; fix the cron-health 404 link; remove Brand Engine blocks from `dashboard/stats` + root dashboard.
2. **ADMIN-02 — New home**: rebuild `/admin` on `getGrowthIntelligenceReport` + `single-source.ts` per 7.1; new 5-item nav; demote tools.
3. **ADMIN-03 — One email**: merge IG briefing into Daily Sandra Briefing, add the Stripe money header, enable `DAILY_SANDRA_BRIEFING_ENABLED`, delete merged/killed crons and pages, delete dead `lib/admin` modules and orphan routes.

---

*Audit by Claude (read-only). All DB queries were SELECT/COUNT only. No app code was modified.*
