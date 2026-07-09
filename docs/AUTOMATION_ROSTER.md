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
| `membership / prompt-vault / starter-kit / selfie-to-brand-shoot checkout-recovery` | hourly (staggered) | Abandoned checkout recovery |
| `send-scheduled-newsletters` | */30 min | Sends Sandra-approved broadcasts only |

### Sandra-facing intelligence (LIVE)
| Cron | Schedule | Job |
|---|---|---|
| `daily-sandra-briefing` | 06:15 | THE daily email: money, members, needs-me, content move |
| `content-brief-weekly` (3 phases) + `content-brief-jobs` | Mon 06:00–07:00 + */5 min | Weekly content brief (research → build → stories) |
| `ig-insights-sync` | 05:50 | Nightly IG post snapshots |
| `weekly-content-trends` | Mon 05:00 | Trend digest pre-warm |
| `feed-plan-monthly-draft` | 1st, 06:00 | Maya drafts member feed calendars |
| `cron-health-check` | hourly | Watchdog: stale crons, failures, AI-credit canary → alerts |

### Built but NOT scheduled (dormant; see EMPLOYEE-01)
`product-qa-daily` (bug reporter — being scheduled + piped into briefing), `reindex-codebase`,
`refresh-segments`, `sync-audience-segments`, `backfill-resend-audience`,
`referral-bonus-notifications`, `maya-instagram-trends-weekly`. Admin diagnostics APIs
(`cron-status`, `errors`) exist but unwired until EMPLOYEE-01's Team panel.

### Broken wiring (known, visible, owned)
- **ManyChat inbound bridge** (`/api/webhooks/manychat-inbound`): code live, ManyChat side never
  configured — zero messages captured all-time. Fix = Sandra-attended ManyChat UI task; until
  then the `manychat-agent-watch` Claude task covers the inbox every morning.
- **Resend bounce webhook**: logs only, no alerting (EMPLOYEE-01 adds it).

## Layer 2 — Claude Cowork (Sandra's Mac, `~/.claude/scheduled-tasks`) — drafts & watching only

| Task | Schedule | Status | Job |
|---|---|---|---|
| `daily-email-draft` | 06:34 daily | ✅ ACTIVE (re-grounded 2026-07-08) | Drafts ONE story-first broadcast + preview to Sandra. NEVER sends. |
| `manychat-agent-watch` | 09:03 daily | ✅ ACTIVE (upgraded 2026-07-09) | Checks ManyChat AI replies + config; hunts WORK leads first; now also watches the direct Instagram Graph DM channel (`npm run ig:graph-test`, token expiry, messaging_status) and judges replies against a customer-service facts block. Needs her Chrome logged in. |
| `funnel-health-daily` | — | ❌ RETIRED 2026-07-08 | Superseded by repo `cron-health-check` + `payment-reconciliation`. |
| `claude-codex-loop` | — | ❌ RETIRED 2026-07-08 | Old 15-min loop protocol; superseded by direct Cowork sessions. |
| `weekly-content-trends` (Claude copy) | — | ❌ RETIRED 2026-07-08 | Duplicate of the repo cron of the same name. |

Also in this layer: Cowork skills (`sselfie-brand`, `prompt-my-selfie`, `sselfie-stories`,
`sselfie-tracker`, `sselfie-optimizer`, email/DM/community skills) — attended routines Sandra
invokes by name, not schedulers. Repo-committed skills live in `.agents/skills/` (34, incl.
`vault-prompt-writer`).

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

## Layer 4 — External SaaS

| System | What lives there | Notes |
|---|---|---|
| ManyChat (fb877156) | Keyword automations (PROMPT, KIT, coming: WORK → `work-lead` tag id 91411765), conservative AI Replies, Live Chat inbox | Default Reply NOT wired to repo bridge (see Layer 1). Several stale flows (archived selfie flow, Rebecca Adehill imports, "Private 1:1 May") — candidates for ManyChat-side cleanup. |
| Resend | Broadcast delivery, audiences/segments, ~60 mechanical "Sequence:" audiences | Sends only what repo crons or Sandra trigger. |
| Stripe | Payments, subscriptions, webhooks → repo | Money truth source per Admin Data Contract. |
| Vercel | Deploys from `main`, runs all Layer-1 crons, holds prod env flags | Env booleans being hardened in EMPLOYEE-01. |
| Sentry (`sselfie/javascript-nextjs`) | Production error monitoring | Connected to Claude via MCP 2026-07-08. |
