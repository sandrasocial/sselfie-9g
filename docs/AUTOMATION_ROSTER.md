# SSELFIE Automation Roster — the ONE map of every automation, in every layer

Created: 2026-07-08 (from the full cross-layer audit that day)
Owner: Sandra + Claude (Cowork). Update this file the same day any automation is added, retired, or moved.

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

---

## Layer 1 — The repo (Vercel, deployed from `main`) — THE business layer

### Money & fulfillment (all LIVE)
| Cron / hook | Schedule | Job |
|---|---|---|
| Stripe webhook → `lib/payments/handlers/*` | event-driven | All fulfillment + subscription lifecycle |
| `resolve-pending-payments` | */5 min | Grant pending credits, alert stuck webhook reviews |
| `reconcile-credits` | 05:00 | Welcome/monthly credits truth |
| `reconcile-subscriptions` / `reconcile-generations` / `reconcile-generation-assets` | 30m / 30m / 5m | Stripe↔DB↔provider truth |
| `payment-reconciliation` | 05:45 | Tripwire: Stripe payments missing from DB → email alert |

### Customer email lifecycle (all LIVE; env-gated flags verified ON 2026-07-08)
| Cron | Schedule | Job |
|---|---|---|
| `onboarding-sequence` | 10:05 | New member onboarding |
| `suite-habit-emails` | 09:00 | Member habit/activation |
| `suite-trial-expiry` | 08:45 | Trial lifecycle + expiry |
| `win-back-sequence` | 10:00 | Cancelled + dormant-member win-back |
| `subscriber-winback` | 09:40 | Dormant email-subscriber win-back |
| `ai-photoshoot-nurture` | 09:30 | AI-prompts + Vault buyer nurture. Narrowed 2026-07-12: free AI Prompts leads stop after the paid Vault/Kit offer sequence and no longer receive the failed no-card SUITE trial. Paid product handlers still own the included buyer-trial unlock. |
| `nurture-sequence` | 10:00 | Legacy multi-product nurture (mostly double-gated off) |
| `membership / prompt-vault / starter-kit checkout-recovery` | hourly (staggered) | Abandoned checkout recovery for the three active revenue paths. Membership recovery returns identified abandoners directly to a prefilled paid checkout; it does not grant a trial. |

### Sandra-facing intelligence (LIVE)
| Cron | Schedule | Job |
|---|---|---|
| `daily-sandra-briefing` | 06:15 | Trimmed to a ~15-second read: money, growth/revenue truth, one compact "today's move" line, customer threads only if any, and recent `Story ·` Resend drafts awaiting approval. The repo DM inbox and DM approvals were removed 2026-07-12. |
| ~~`content-brief-weekly` (3 phases) + `content-brief-jobs`~~ | — | UNSCHEDULED 2026-07-12. Replaced by the `weekly-content-brief-draft` Cowork task below. All four Vercel registrations are removed, so the retired repo engine cannot collide with its replacement or create five-minute no-op traffic. Routes and the local worker remain temporarily for a dependency-audited code-deletion pass; `CONTENT_BRIEF_ENABLED=false` remains defense in depth. |
| `ig-insights-sync` | 05:50 | Nightly IG post snapshots |
| `weekly-content-trends` | Mon 05:00 | Trend digest pre-warm |
| `feed-plan-monthly-draft` | 1st, 06:00 | Maya drafts member feed calendars |
| `cron-health-check` | hourly | Watchdog: stale crons, failures, AI-credit canary → alerts |

### Retired schedules with route code temporarily held (UNSCHEDULED 2026-07-12)

These jobs are not in `vercel.json` and therefore do not run automatically. Their route files are
kept temporarily so removal can happen in a separate dependency-audited pass without risking live
customer access, fulfillment, or the active approval queue.

| Route | Why the schedule is off | Replacement / safe state |
|---|---|---|
| `content-brief-weekly` (3 phases) + `content-brief-jobs` | Retired content engine duplicated the replacement Cowork workflow and generated five-minute no-op traffic while disabled. | `weekly-content-brief-draft` owns the weekly draft; `CONTENT_BRIEF_ENABLED=false` remains defense in depth. |
| `send-scheduled-newsletters` | Legacy scheduled-broadcast poller is not part of the founder approval queue. | Sandra-approved Resend actions use the durable `admin_action_queue`; the legacy route is manual-only until deleted. |
| `product-qa-daily` | Duplicate deterministic reporter added another report and “employee” instead of one operational truth loop. | `cron-health-check`, payment reconciliation, Sentry, and the Daily Sandra Briefing remain live. Existing stored QA reports remain readable. |
| `selfie-to-brand-shoot-checkout-recovery` | Selfie To Brand Shoot is no longer an active sales path and its recovery lane had no completed sales. | Prompt Vault, Starter Kit, and membership recovery remain scheduled. Existing Brand Shoot buyer access and fulfillment are unchanged. |

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

### Built but NOT scheduled (dormant)
`reindex-codebase`, `refresh-segments`, `sync-audience-segments`, `backfill-resend-audience`,
`referral-bonus-notifications`, `maya-instagram-trends-weekly`, plus the explicitly retired/held
routes listed above. Admin diagnostics APIs
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
| `daily-email-draft` | 06:34 daily | ✅ ACTIVE (re-grounded 2026-07-08) | Drafts ONE story-first broadcast + preview to Sandra. NEVER sends. |
| `daily-story-sequence-draft` | 07:01 daily | ✅ ACTIVE (new 2026-07-10, reconciled 2026-07-11) | Reads that morning's already-drafted broadcast via `scripts/daily-story-sequence-prep.ts` and repurposes it into a 7-slide Instagram Story sequence (hook → emotional recognition → belief shift → personal mirror → stuck point → offer bridge → CTA), TEXT ONLY, ready to copy. Also pulls that weekday's planned theme from the latest `weekly-content-brief-draft` row (if any) as a continuity steer — the two tasks were briefly duplicating "today's Story" (2026-07-11 content-system audit finding); reconciled by making this the sole owner of daily slide text while the weekly brief owns only the week-level theme. Now reads the full voice-doc set (was thinner than its siblings at launch). Stores to `analytics_reports` (`report_type='story_sequence_daily'`) and emails Sandra the slides. NEVER posts. Does not replace `sselfie-stories` (the on-demand skill for full photo-based sequences with background/overlay rendering) — this is the lightweight daily companion. |
| `manychat-agent-watch` | — | ❌ RETIRED 2026-07-12 | Removed with the reply agent. No unattended inbox monitor remains. |
| `weekly-content-brief-draft` | Mon 06:05 | ✅ ACTIVE (new 2026-07-09, scope narrowed 2026-07-11) | Replaces the retired `content-brief-weekly` repo cron. Real data via `scripts/weekly-brief-prep.ts` (server-only modules can't be imported into a CLI script, so this queries the same tables directly) + live research + live writing, stores into `analytics_reports` (same shape/table so nothing downstream needs to change) and emails Sandra a preview. NEVER posts. Its `dailyStories` output is now a per-weekday THEME only (day/theme/conversationType/offerMention) — `daily-story-sequence-draft` writes the actual daily slide text each morning; this task stopped writing full frames the same day to avoid duplicating that work. |
| `ig-dm-drafter` | — | ❌ RETIRED 2026-07-12 | Scheduled task and repo drafting script removed. |
| `funnel-health-daily` | — | ❌ RETIRED 2026-07-08 | Superseded by repo `cron-health-check` + `payment-reconciliation`. |
| `claude-codex-loop` | — | ❌ RETIRED 2026-07-08 | Old 15-min loop protocol; superseded by direct Cowork sessions. |
| `weekly-content-trends` (Claude copy) | — | ❌ RETIRED 2026-07-08 | Duplicate of the repo cron of the same name. |

**`sselfie-community-manager` skill** — on demand and attended only. It opens the signed-in
ManyChat inbox in the browser, reads the real customer message and history, and can suggest a
reply. It has no repo database, queue, API token, background schedule, or automated sender. A live
browser send requires Sandra's approval of the exact recipient and text in the same conversation.

Also in this layer: Cowork skills (`sselfie-brand`, `prompt-my-selfie`, `sselfie-stories`,
`sselfie-tracker`, `sselfie-optimizer`, `sselfie-community-manager`) — attended routines Sandra
invokes by name, not schedulers. Repo-committed skills live in `.agents/skills/` (34, incl.
`vault-prompt-writer`).

**`sselfie-content-engine` plugin — RETIRED 2026-07-11 (content-system audit).** Lived outside
this repo at `~/Desktop/SSELFIE Work/Business & Admin/SSELFIE/SSELFIE-Content-Engine/` (inside
the retired NORTH/OpenClaw workspace), last genuinely used 2026-05-08. Every skill/command in it
duplicated a stronger custom skill above, and two commands (`daily-post`, `weekly-batch`) pushed
"Comment KIT → Starter Kit" CTAs and a nonexistent "$17 Transform" product — directly against the
locked 2026-06-30 funnel doctrine. All 9 skill/command files were overwritten with retirement
stubs that refuse to generate content and redirect to the correct current skill. The plugin's
registration itself (a `.claude-plugin/plugin.json` manifest in that folder) could not be found in
any of the standard Claude Code registries checked (`~/.claude/plugins/*`, `~/.claude.json`) — full
removal from wherever Cowork actually discovered it needs Sandra's action via the app's own
plugin settings UI, which this session can't reach.

## Layer 3 — Codex app (`~/.codex/automations`) — being emptied per lane rule 3

12 automations found 2026-07-08. 10 already PAUSED, several pointing at the OLD repo path
(`/Users/MD760HA/sselfie-9g`) and the RETIRED Voice Bible doc — do not re-enable any of them.

| Automation | Status 2026-07-08 | Verdict |
|---|---|---|
| `sselfie-lint-warning-cleanup` | ACTIVE | Allowed to stay (code-hygiene only, worktree-isolated) |
| `weekly-cohort-report` ("Growth Intelligence Engine") | ACTIVE | RETIRE — duplicates repo growth intelligence + daily briefing |
| `daily-billing-audit`, `daily-funnel-health`, `hourly-ops-triage` | PAUSED | RETIRE — repo watchdogs own this |
| `email-marketing-specialist`, `email-revenue-operator`, `monitor-launch-email-analytics` | PAUSED | RETIRE — daily briefing + daily-email-draft own this |
| `nightly-brand-consistency`, `nightly-maya-quality`, `weekly-cleanup-radar` | PAUSED | RETIRE — stale paths/docs; re-spec fresh in repo if ever needed |
| `process-queued-weekly-brief-jobs` | PAUSED | RETIRE — repo `content-brief-jobs` cron owns this |

Sandra archives these in the Codex app UI (or asks Claude to do it in an attended session).

**Re-verified 2026-07-11 (content-system audit):** all 11 RETIRE-verdict items above are confirmed
gone — `~/.codex/automations/` now contains only `sselfie-lint-warning-cleanup`, no archive folder
exists (archiving via the Codex UI deletes the directory outright). That one survivor's live status
is `PAUSED` (ran once 2026-07-09, then paused), not the `ACTIVE` shown in the 2026-07-08 snapshot
above — a stale label, not a content risk since it's code-hygiene only.

## Layer 4 — External SaaS

| System | What lives there | Notes |
|---|---|---|
| ManyChat (fb877156) | Keyword automations (PROMPT, SELFIE, KIT, SUITE, VAULT, PRESET, ANDROID, WORK) and Live Chat inbox | Keyword marketing flows remain live. The `Instagram Default Reply` bridge was stopped and moved to trash on 2026-07-12, and ManyChat AI is deactivated. The verified WORK path remains `WORK — Sprint Application`. Inbox review is attended and on demand only. |
| Resend | Broadcast delivery, audiences/segments, ~60 mechanical "Sequence:" audiences | Sends only what repo crons or Sandra trigger. |
| Stripe | Payments, subscriptions, webhooks → repo | Money truth source per Admin Data Contract. |
| Vercel | Deploys from `main`, runs all Layer-1 crons, holds prod env flags | Env booleans being hardened in EMPLOYEE-01. |
| Sentry (`sselfie/javascript-nextjs`) | Production error monitoring | Connected to Claude via MCP 2026-07-08. |
