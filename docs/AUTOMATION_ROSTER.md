# SSELFIE Automation Roster — the ONE map of every automation, in every layer

Created: 2026-07-08 (from the full cross-layer audit that day)
Owner: Sandra + Claude (Cowork). Update this file the same day any automation is added, retired, or moved.
Last verified: 2026-07-16

## Why this exists

Automations were scattered across four layers (repo/Vercel, Claude Cowork on Sandra's Mac,
the Codex app, and external SaaS) with no single map. Result: three funnel-health checkers in
three apps, duplicate email operators, agents paused out of distrust, and systems dying
silently (a now-retired DM bridge once captured zero messages for a month and nothing noticed).

## Lane rules (where new automations are ALLOWED to live)

1. **Touches customers or money → the repo. No exceptions.** Deployed via Vercel cron/webhook,
   versioned on GitHub, watched by `cron-health-check`, visible in the admin Team panel
   (EMPLOYEE-01). Emails to the list, checkout recovery, fulfillment, member lifecycle: repo.
2. **Drafts for Sandra, or needs her logged-in browser → Claude Cowork scheduled task.**
   These never send anything. Registered here the day they're created.
3. **Codex hosts NO business automations.** Codex is the code implementer. The only automation
   allowed in the Codex app is code-hygiene that touches nothing but code (e.g. the lint
   ratchet). Everything else in `~/.codex/automations` is retired.
4. **External tools (ManyChat, Resend) hold delivery mechanics only, never brains.** Copy and
   logic decisions live in the repo or with Sandra; the external tool just fires.
5. **One in, one out.** No new automation in any layer without adding it here and saying what
   it replaces (mirror of Admin Data Contract rule 5).

Session rule for all agents: read this file before creating, enabling, or debugging ANY
automation.

Brand rule for every layer: read `docs/brand/SSELFIE_BRAND_CONSTITUTION.md` first. Scheduled tasks and external delivery tools may not carry a private or conflicting version of the brand.

---

## Layer 1 — The repo (Vercel, deployed from `main`) — THE business layer

### Money & fulfillment (all LIVE)
| Cron / hook | Schedule | Job |
|---|---|---|
| Stripe webhook → `lib/payments/handlers/*` | event-driven | All fulfillment + subscription lifecycle. `selfie_visibility_bundle` grants its five lifetime assets, one fixed 30-day/200-credit pass, and one delivery email idempotently. Held for post-event release: paid `campaign_outcome` sessions create one private guest order and intake email, without accounts, credits, entitlements, or subscriptions. `invoice.payment_failed` keeps its one deduplicated email, but its button opens a signed exact-subscription recovery route that creates a fresh Stripe-hosted card-update session at click time; successful retries appear on Admin from paid `stripe_payments` rows. No new cron. |
| `resolve-pending-payments` | */5 min | Grant pending credits, alert stuck webhook reviews |
| `reconcile-credits` | 05:00 | Welcome/monthly credits truth |
| `reconcile-subscriptions` / `reconcile-generations` / `reconcile-generation-assets` | 30m / 30m / 5m | Stripe↔DB↔provider truth |
| `payment-reconciliation` | 05:45 | Tripwire: Stripe payments missing from DB → email alert |

### Customer email lifecycle (all LIVE; env-gated flags verified ON 2026-07-08)
| Cron | Schedule | Job |
|---|---|---|
| `onboarding-sequence` | 10:05 | New member onboarding. Day 7 now reuses the approved reset email only for active members who generated on one calendar day and did not return on another day; it deep-links to Create. It is no longer an unconditional calendar send. The held Campaign outcome reuses this cron for one Day-7 publish/repeat check after delivery; test orders are excluded. |
| `suite-habit-emails` | 09:00 | Member habit/activation |
| `suite-trial-expiry` | 08:45 | Trial lifecycle + expiry. It also closes fixed One Selfie passes without renewal and deducts only their remaining pass credits under one database lock. |
| `win-back-sequence` | 10:00 | Cancelled + dormant-member win-back |
| `subscriber-winback` | 09:40 | Dormant email-subscriber win-back |
| `ai-photoshoot-nurture` | 09:30 | AI-prompts + Vault buyer nurture. Narrowed 2026-07-12: free AI Prompts leads stop after the paid Vault/Kit offer sequence and no longer receive the failed no-card SUITE trial. At payment, known Prompt Vault, Starter Kit, and AI Photos Kit buyers now start their one-ever included trial automatically; guests keep the claim-token email fallback. |
| `nurture-sequence` | 10:00 | Legacy multi-product nurture (mostly double-gated off) |
| `membership / prompt-vault / starter-kit checkout-recovery` | hourly (staggered) | Abandoned checkout recovery for the three active revenue paths. Membership recovery returns identified abandoners directly to a prefilled paid checkout; it does not grant a trial. Sandra approved the fixed July 13–15 One Selfie recovery copy on July 13 and `ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_ENABLED=true` is live in Production. The shared Starter Kit job sends at most one deduplicated reminder about three hours after an identified bundle checkout starts and only while the offer is open; it rechecks Stripe immediately before sending and suppresses paid/completed buyers and active SUITE members. There is no discount, second follow-up, or new schedule. Bundle hydration and sending are each capped at four rows per run and share a 38-second / 16-operation budget so the 60-second job retains safe headroom. |
| `campaign-checkout-recovery`                                | hourly at :10      | HELD with Your Next Campaign. Three draft touches at 1h, +24h, and +72h. Every stage has a hard `stripe_payments` buyer guard, and the job remains disabled unless both campaign and recovery flags are explicitly opened after copy approval. No discount and no live-event dependency.                                                                                                                                                                                                                                                                                                                                                         |

### Sandra-facing intelligence (LIVE)
| Cron | Schedule | Job |
|---|---|---|
| `daily-sandra-briefing` | 06:15 | Trimmed to a ~15-second read: money, growth/revenue truth, one compact "today's move" line, customer threads only if any, and recent `Story ·` Resend drafts awaiting approval. The repo DM inbox and DM approvals were removed 2026-07-12. |
| ~~`content-brief-weekly` (3 phases) + `content-brief-jobs`~~ | — | REMOVED 2026-07-13 after the replacement completed its real Monday run and live readers were migrated to the shared contract. All four Vercel registrations, route handlers, generator, support modules, local worker, runners, and engine-only tests are deleted. Historical report/job rows remain. |
| `ig-insights-sync` | 05:50 | Nightly IG post snapshots |
| `weekly-content-trends` | Mon 05:00 | Trend digest pre-warm |
| `feed-plan-monthly-draft` | 06:00 daily | Sandra-only delivered-calendar preview is live with `CALENDAR_DELIVERED_MONTH_ENABLED=true` and `CALENDAR_DELIVERED_MONTH_ADMIN_ONLY=true`. The job keeps the next seven days ready only for admin accounts; member/pass rollout still requires an explicit `CALENDAR_DELIVERED_MONTH_ADMIN_ONLY=false` decision. Pre-generation never charges member credits; weekly cap defaults to 10. The Production `CRON_SECRET` was rotated on 2026-07-15 and remains an encrypted, server-only Vercel value. |
| `cron-health-check` | hourly | Watchdog: stale crons, failures, AI-credit canary → alerts |

### Retired schedule code removed (2026-07-13)

The dependency-audited deletion pass removed the route and route-only logic for the old content
engine, legacy scheduled-newsletter poller, duplicate Product QA report, and retired Selfie To Brand
Shoot checkout recovery. Historical report, campaign, checkout, purchase, and entitlement data stay
in place and remain readable.

- Sandra-approved broadcasts continue through the durable `admin_action_queue`.
- `cron-health-check`, payment reconciliation, Sentry, and the Daily Sandra Briefing remain the
  operational truth loop.
- Prompt Vault, Starter Kit, and membership checkout recovery remain scheduled.
- Existing Selfie To Brand Shoot buyers retain access and webhook fulfillment.

### Funnel integrity incident gate (LOCKED 2026-07-16)

The existing Stripe webhook, reconciliation jobs, `cron-health-check`, Sentry, and Daily Sandra
Briefing are the background funnel sentinel. Low sales, weak engagement, or a small conversion
denominator is commercial evidence, not proof of a technical defect, and must not open an
autonomous redesign or code task.

A technical repair may start only when one of these evidence gates is met:

- **P0:** one verified paid customer is missing access or fulfillment; a customer was charged the
  wrong amount; a duplicate charge/send occurred; or a recovery message was sent after payment.
- **P1:** a route or checkout failure is deterministically reproducible, or a cross-system mismatch
  affects at least 5% of at least 20 eligible events in two consecutive checks.

Investigation is read-only until the defect is reproduced. Stripe and Resend reads, database
`SELECT`, logs, and source inspection are allowed. Production writes, real checkout creation,
customer contact, pricing/copy changes, flags, environment changes, deploys, and autonomous rollback
are not. One incident branch may be active at a time. The builder writes a failing regression first,
makes one bounded fix, and requires an independent verification pass before the normal release gate.

### Founder approval queue (LIVE 2026-07-10)

- Durable state lives in `admin_action_queue`; signed links expire after seven days.
- `ADMIN_ACTION_SECRET` signs approval links and must remain server-only.
- The only supported final action is `send_resend_broadcast`.
- A review-page GET is read-only. Send/dismiss is POST-only, and the database atomically claims
  each action before execution so retries and double taps cannot send twice.
- Failed email actions stay visible with their error for review; they do not silently retry.
- Payment, support, and system-health items remain direct admin links rather than executable email
  actions. GitHub PR approval is intentionally excluded: Sandra's standing direction is direct-to-main,
  no-PR delivery for this repo.
- The July 13–15 One Selfie event has three attended Resend drafts in this queue: Open, Inside, and
  Last call. They never send on a timer; Sandra approves each at the runbook time. Follow-ups tell
  existing buyers not to purchase again.

### Built but NOT scheduled (dormant)
`reindex-codebase`, `refresh-segments`, `sync-audience-segments`, `backfill-resend-audience`,
`referral-bonus-notifications`, and `maya-instagram-trends-weekly`. Admin diagnostics APIs
(`cron-status`, `errors`) are now wired into the /admin home Team panel (EMPLOYEE-01, shipped
2026-07-08, commit fcf207ef).

### Wiring status (known, visible, owned)
- **Instagram/ManyChat reply bridge**: ❌ RETIRED 2026-07-12. The ManyChat Default Reply flow was
  stopped and moved to trash, ManyChat AI Replies are deactivated, and the repo webhook, drafting,
  approval, inbox, and send paths were removed. Marketing keyword flows remain live.
- **Resend bounce webhook**: ✅ alerting LIVE (`maybeSendDeliverabilityAlert` in
  `app/api/webhooks/resend/route.ts`) — fires when bounces+complaints in `email_logs` cross
  `EMAIL_BOUNCE_ALERT_THRESHOLD` (default 10) in a rolling 24h, once/day. 2026-07-09: root-caused
  a live alert to 237 chronically-bouncing contacts (typo domains, dead inboxes) that Resend
  wasn't auto-suppressing — kept getting re-mailed on every daily Founding-sequence send since
  2026-06-25 (~200 bounces/send). Unsubscribed all 237 in Resend directly. Also deleted 5 dead
  drafts + tried to delete 20 failed "Untitled" broadcasts from a retired Feb–Mar 2026 mechanical
  automation, but Resend's API only allows deleting draft/scheduled broadcasts — failed ones are
  permanently stuck as clutter in the dashboard, ignore them.

## Layer 2 — Claude Cowork (Sandra's Mac, `~/.claude/scheduled-tasks`) — drafts & watching only

| Task | Schedule | Status | Job |
|---|---|---|---|
| `daily-email-draft` | 06:34 daily | ✅ ACTIVE (Constitution-first 2026-07-13) | Drafts ONE story-first broadcast + preview to Sandra. NEVER sends. Loads `docs/brand/SSELFIE_BRAND_CONSTITUTION.md` first, honors attended-campaign precedence, and points at the live email code (`lib/email/templates/stone-email.ts` + `scripts/daily-email-prep.ts`) instead of the removed `sselfie-email` skill. |
| `daily-story-sequence-draft` | 07:01 daily | ✅ ACTIVE (Constitution-first 2026-07-13) | Reads that morning's already-drafted broadcast via `scripts/daily-story-sequence-prep.ts` and repurposes it into a 7-slide Instagram Story sequence (hook → emotional recognition → belief shift → personal mirror → stuck point → offer bridge → CTA), TEXT ONLY, ready to copy. Also pulls that weekday's planned theme from the latest `weekly-content-brief-draft` row (if any) as a continuity steer — the two tasks were briefly duplicating "today's Story" (2026-07-11 content-system audit finding); reconciled by making this the sole owner of daily slide text while the weekly brief owns only the week-level theme. Now reads the full voice-doc set (was thinner than its siblings at launch). Stores to `analytics_reports` (`report_type='story_sequence_daily'`) and emails Sandra the slides. NEVER posts. Does not replace `sselfie-stories` (the on-demand skill for full photo-based sequences with background/overlay rendering) — this is the lightweight daily companion. |
| `weekly-content-brief-draft` | Mon 06:05 | ✅ ACTIVE (real Monday run verified 2026-07-13; Constitution-first same day) | Replaces the deleted repo content engine. Real data via `scripts/weekly-brief-prep.ts` + live research + live writing, stores into `analytics_reports`, and emails Sandra a preview. NEVER posts. A shared canonical contract rejects incomplete demand maps, incompatible trend keys, unsafe buyer-facing vibe presets, fewer than five complete pieces, or anything other than seven weekday themes before any database write or email. This week's stored row was repaired and now has two usable Shoot Studio trend presets. `daily-story-sequence-draft` remains the sole owner of daily slide text. |

Retired task directories were physically removed on 2026-07-12. This includes
`claude-codex-loop`, `daily-photo-export`, `funnel-health-daily`, and the duplicate
`weekly-content-trends`. Only the three active draft tasks above remain on disk.

**`sselfie-community-manager` skill** — on demand and attended only. It opens the signed-in
ManyChat inbox in the browser, reads the real customer message and history, and can suggest a
reply. It has no repo database, queue, API token, background schedule, or automated sender. A live
browser send requires Sandra's approval of the exact recipient and text in the same conversation.

Also in this layer: Cowork skills (`sselfie-brand`, `what-to-post`, `prompt-my-selfie`,
`sselfie-stories`, `sselfie-tracker`, `sselfie-optimizer`, `sselfie-community-manager`) — attended
routines Sandra invokes by name, not schedulers. `what-to-post` (added 2026-07-13) is the on-demand
daily content director: answers "what should I post today" from live pulls only (her real IG data,
named current trends, campaign state), one decisive post + repost + repurpose; it reads the weekly
plan and serves it rather than competing with it; drafts only, never posts. Repo-committed skills live in `.agents/skills/` (37, incl.
`vault-prompt-writer` and `sselfie-brand-guardian`).

The repo-backed `sselfie-brand-guardian` skill is the preflight for copy, UX language, offers, and
campaigns. The local `.claude/agents/revenue-campaign-director.md` agent is a research-first,
read-only campaign auditor. It prepares P0/P1/P2 findings and approval-ready copy but never sends,
publishes, charges, deploys, or schedules. Neither is an automation. The one-time Claude Desktop
alignment work specified in
`docs/operations/CLAUDE_DESKTOP_BRAND_ALIGNMENT_SPEC_2026-07-13.md` was COMPLETED 2026-07-13: all
three scheduled tasks load the Constitution first with attended-campaign precedence, `sselfie-brand`
is a live pointer skill (no stored facts), the five content skills preflight the Constitution, three
stale brand-authority memories were demoted to historical, and the scheduled-task count remains
exactly three.

**`sselfie-content-engine` plugin — RETIRED 2026-07-11 (content-system audit).** Lived outside
this repo at `~/Desktop/SSELFIE Work/Business & Admin/SSELFIE/SSELFIE-Content-Engine/` (inside
the retired NORTH/OpenClaw workspace), last genuinely used 2026-05-08. Every skill/command in it
duplicated a stronger custom skill above, and two commands (`daily-post`, `weekly-batch`) pushed
"Comment KIT → Starter Kit" CTAs and a nonexistent "$17 Transform" product — directly against the
locked 2026-06-30 funnel doctrine. All 9 skill/command files were overwritten with retirement
stubs that refuse to generate content and redirect to the correct current skill. The plugin's
registration itself (a `.claude-plugin/plugin.json` manifest in that folder) could not be found in
any active Claude Code registry checked (`~/.claude/plugins/*`, `~/.claude.json`). There is no active
runtime or scheduling path, so this is closed and requires no founder action. If it ever reappears in
Cowork, delete that visible registration instead of reviving its files.

The retired local OpenClaw gateway launch agent was still running despite having zero jobs. It was
stopped and disabled on 2026-07-13; its local data was preserved. The repo's final North/OpenClaw
payment notifier, Telegram webhook shell, and hardcoded legacy gateway token were removed. Nothing
customer-facing or payment-critical depends on that runtime.

## Layer 3 — Codex app (`~/.codex/automations`) — EMPTY by design

All SSELFIE Codex automations are removed as of 2026-07-12. The final paused lint-cleanup task was
deleted because its commands no longer matched the repo and it did not serve customer, money, or
active implementation work. Codex remains attended implementation only; it hosts no business
automation.

## Layer 4 — External SaaS

| System | What lives there | Notes |
|---|---|---|
| ManyChat (fb877156) | Keyword automations (PROMPT, SELFIE, KIT, SUITE, VAULT, PRESET, ANDROID, WORK) and Live Chat inbox | Keyword marketing flows remain live. The `Instagram Default Reply` bridge was stopped and moved to trash on 2026-07-12, and ManyChat AI is deactivated. The verified WORK path remains `WORK — Sprint Application`. `BUNDLE` is an attended July 13–15 event flow Sandra must configure from the exact runbook; do not claim it is live until she confirms it. `CAMPAIGN` is also not live until Sandra configures its exact held-release URL from `docs/business/CAMPAIGN_OUTCOME_RUNBOOK_2026-07-15.md`. Inbox review is attended and on demand only. |
| Resend | Broadcast delivery, audiences/segments, ~60 mechanical "Sequence:" audiences | Sends only what repo crons or Sandra trigger. The three `Launch · One Selfie` broadcasts are drafts tied to founder approvals; no schedule or automatic send was added. |
| Stripe | Payments, subscriptions, webhooks → repo | Money truth source per Admin Data Contract. |
| Vercel | Deploys from `main`, runs all Layer-1 crons, holds prod env flags | Env booleans being hardened in EMPLOYEE-01. |
| Sentry (`sselfie/javascript-nextjs`) | Production error monitoring | Connected to Claude via MCP 2026-07-08. |

Security note (2026-07-12): the production Stripe webhook signing secret was rotated after an old
value was found in public Git history. The replacement endpoint is enabled and the exposed endpoint
is disabled. Neon live and legacy-source credentials were also rotated. Do not restore credentials
from Git history, archived docs, or old scripts.

Security follow-up (2026-07-13): the secret regression scan now also blocks hardcoded OpenClaw
gateway tokens. The local gateway is disabled and no North/OpenClaw/Telegram runtime remains in the
repo.
