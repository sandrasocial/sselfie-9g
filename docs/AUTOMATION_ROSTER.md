# SSELFIE Automation Roster — the ONE map of every automation, in every layer

Created: 2026-07-08 (from the full cross-layer audit that day)
Owner: Sandra + Claude (Cowork). Update this file the same day any automation is added, retired, or moved.

## Why this exists

Automations were scattered across four layers (repo/Vercel, Claude Cowork on Sandra's Mac,
the Codex app, and external SaaS) with no single map. Result: three funnel-health checkers in
three apps, duplicate email operators, agents paused out of distrust, and systems dying
silently (the DM bridge captured zero messages for a month and nothing noticed).

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
| `ai-photoshoot-nurture` | 09:30 | AI-prompts + Vault buyer nurture |
| `nurture-sequence` | 10:00 | Legacy multi-product nurture (mostly double-gated off) |
| `membership / prompt-vault / starter-kit / selfie-to-brand-shoot checkout-recovery` | hourly (staggered) | Abandoned checkout recovery. Membership recovery returns identified abandoners directly to a prefilled paid checkout; it does not grant a trial. |
| `send-scheduled-newsletters` | */30 min | Sends Sandra-approved broadcasts only |

### Sandra-facing intelligence (LIVE)
| Cron | Schedule | Job |
|---|---|---|
| `daily-sandra-briefing` | 06:15 | Trimmed to a ~15-second read 2026-07-09: money, growth/revenue truth, one compact "today's move" line (reuses already-computed working/leaking signal), customer threads only if any. Since 2026-07-10 it also carries the one founder approval queue: up to five flagged DM drafts and recent `Story ·` Resend drafts. Each link opens a review page and never sends on GET; Sandra must confirm the POST action. No separate approval-alert email is sent. Retired its daily `lib/admin/daily-briefing-intelligence.ts` LLM call (same Anthropic-billing root cause as the weekly brief; degraded to generic filler on every failure). That file stays for now (its own tests still exercise it directly) until the Phase 2 Codex cleanup removes it. |
| ~~`content-brief-weekly` (3 phases) + `content-brief-jobs`~~ | — | RETIRED FROM SERVICE 2026-07-09 (had been failing since 2026-07-02 on an Anthropic credit-balance error) — replaced by the `weekly-content-brief-draft` Cowork task below. Disabled via `CONTENT_BRIEF_ENABLED=false` in Vercel prod (flip back to re-enable) to avoid colliding with the new task on the same stored report row. Actual code/cron-entry deletion is scoped into the Phase 2 Codex cleanup (`tasks/README.md`). |
| `ig-insights-sync` | 05:50 | Nightly IG post snapshots |
| `weekly-content-trends` | Mon 05:00 | Trend digest pre-warm |
| `feed-plan-monthly-draft` | 1st, 06:00 | Maya drafts member feed calendars |
| `cron-health-check` | hourly | Watchdog: stale crons, failures, AI-credit canary → alerts |
| `product-qa-daily` | 05:55 | Bug/reliability reporter (deterministic, no LLM) → feeds briefing "System health" |
| Instagram webhook → IG inbox | event-driven | Stores every real conversation; exact ManyChat automation keywords (`PROMPT`, `SELFIE`, `KIT`, `SUITE`, `VAULT`, `PRESET`, `ANDROID`) are marked `auto_handled` without an AI draft. `WORK` and real questions remain visible. Per-conversation alert emails are OFF by default (`IG_AGENT_EMAIL_ALERTS_ENABLED=false` unless explicitly enabled); Sandra uses the admin/community-manager queue and daily briefing instead. |

### Founder approval queue (LIVE 2026-07-10)

- Durable state lives in `admin_action_queue`; signed links expire after seven days.
- `ADMIN_ACTION_SECRET` signs approval links and must remain server-only.
- Supported final actions are `send_ig_reply` and `send_resend_broadcast`.
- A review-page GET is read-only. Send/dismiss is POST-only, and the database atomically claims
  each action before execution so retries and double taps cannot send twice.
- Sandra may edit a DM on the review page. The approved edit is saved as a voice-learning note.
- Failed actions stay visible with their error for review; they do not silently retry a customer send.
- Payment, support, and system-health items remain direct admin links rather than executable email
  actions. GitHub PR approval is intentionally excluded: Sandra's standing direction is direct-to-main,
  no-PR delivery for this repo.

### Built but NOT scheduled (dormant)
`reindex-codebase`, `refresh-segments`, `sync-audience-segments`, `backfill-resend-audience`,
`referral-bonus-notifications`, `maya-instagram-trends-weekly`. Admin diagnostics APIs
(`cron-status`, `errors`) are now wired into the /admin home Team panel (EMPLOYEE-01, shipped
2026-07-08, commit fcf207ef).

### Broken wiring (known, visible, owned)
- **ManyChat inbound bridge** (`/api/webhooks/manychat-inbound`): code live, ManyChat side never
  configured — zero messages captured all-time. Fix = Sandra-attended ManyChat UI task; until
  then the `manychat-agent-watch` Claude task covers the inbox every morning.
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
| `manychat-agent-watch` | 09:03 daily | ✅ ACTIVE (upgraded 2026-07-09) | Checks ManyChat AI replies + config; hunts WORK leads first; now also watches the direct Instagram Graph DM channel (`npm run ig:graph-test`, token expiry, messaging_status) and judges replies against a customer-service facts block. Needs her Chrome logged in. |
| `weekly-content-brief-draft` | Mon 06:05 | ✅ ACTIVE (new 2026-07-09, scope narrowed 2026-07-11) | Replaces the retired `content-brief-weekly` repo cron. Real data via `scripts/weekly-brief-prep.ts` (server-only modules can't be imported into a CLI script, so this queries the same tables directly) + live research + live writing, stores into `analytics_reports` (same shape/table so nothing downstream needs to change) and emails Sandra a preview. NEVER posts. Its `dailyStories` output is now a per-weekday THEME only (day/theme/conversationType/offerMention) — `daily-story-sequence-draft` writes the actual daily slide text each morning; this task stopped writing full frames the same day to avoid duplicating that work. |
| `ig-dm-drafter` | 10:08 + 16:xx daily | ✅ ACTIVE (new 2026-07-09) | The deliberate second pass on flagged DMs/comments via `scripts/ig-dm-draft-prep.ts` — repo's own instant first-pass draft (`lib/ig-agent/responder.ts`) still fires immediately per message; this reviews/improves flagged ones with real context twice a day. NEVER sends — writes to `draft_response` only, same as the repo path. |
| `funnel-health-daily` | — | ❌ RETIRED 2026-07-08 | Superseded by repo `cron-health-check` + `payment-reconciliation`. |
| `claude-codex-loop` | — | ❌ RETIRED 2026-07-08 | Old 15-min loop protocol; superseded by direct Cowork sessions. |
| `weekly-content-trends` (Claude copy) | — | ❌ RETIRED 2026-07-08 | Duplicate of the repo cron of the same name. |

**`sselfie-community-manager` skill** (new 2026-07-09, on-demand, no schedule) — replaces `/admin/ig-inbox`
as Sandra's actual review surface; she never uses that web UI. Invoked by name in chat ("check my
inbox", "what needs a reply") — pulls both ManyChat (browser/MCP) and the native pipeline
(`scripts/ig-community-manager.ts triage`), tells her what's auto-handled by keyword automations
vs what needs her, and can send an approved native reply (`scripts/ig-community-manager.ts send`,
human-approved path only, never auto). Companion repo fix same day: `lib/ig-agent/triage.ts` now
recognizes bare "Kit"/"Suite" keyword comments (previously unmatched, flooded `/admin/ig-inbox`
as false-positive flags) and the webhook now drops Sandra's own account replying to comments
(was looping back in as a fake customer message). Supersedes the broken `sselfie-email`/
`sselfie-dm`/`sselfie-community` symlinks referenced in earlier docs (`.claude/skills/*` pointed
at `.agents/skills/*` paths that were never actually created — dead, removed).

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
| ManyChat (fb877156) | Keyword automations (PROMPT, SELFIE, KIT, SUITE, VAULT, PRESET, ANDROID; coming: WORK → `work-lead` tag id 91411765), conservative AI Replies, Live Chat inbox | Default Reply is wired to the repo bridge. Its missing `Last Text Input` field was repaired and published 2026-07-11. Production now uses the API key issued by account `877156`; human-approved outbound is enabled while automated agent sends remain off. The repo also rejects a token whose account prefix does not match `MANYCHAT_ACCOUNT_ID`. Several stale flows (archived selfie flow, Rebecca Adehill imports, "Private 1:1 May") remain ManyChat-side cleanup candidates. |
| Resend | Broadcast delivery, audiences/segments, ~60 mechanical "Sequence:" audiences | Sends only what repo crons or Sandra trigger. |
| Stripe | Payments, subscriptions, webhooks → repo | Money truth source per Admin Data Contract. |
| Vercel | Deploys from `main`, runs all Layer-1 crons, holds prod env flags | Env booleans being hardened in EMPLOYEE-01. |
| Sentry (`sselfie/javascript-nextjs`) | Production error monitoring | Connected to Claude via MCP 2026-07-08. |
