# BRAND-AUDIT-QUARTERLY-01 — quarterly Constitution sweep of every customer-facing word

Status: READY for Codex. Spec written 2026-07-13 at Sandra's direction.

Owner: Sandra approves the report's fixes; Codex builds the auditor; Claude Desktop (attended) or Sandra runs it quarterly.

## Why

Sandra's rule: no AI agent creates or changes anything before loading
`docs/brand/SSELFIE_BRAND_CONSTITUTION.md`. That protects NEW copy. Nothing yet protects the
thousands of EXISTING customer-facing strings from drifting as the brand law evolves. This task
builds the quarterly sweep that catches old messaging before customers do.

Build on what exists — do not duplicate it:

- `scripts/audit/sselfie-context-drift-scanner.ts` (context drift)
- `scripts/check-voice-rules.mjs` / `pnpm check:voice` (banned words, em-dashes)
- `tests/brand-constitution-agent-alignment.test.ts` (agent wiring)

## What to build

One committed script, `scripts/audit/brand-quarterly-audit.ts`, exposed as
`pnpm audit:brand-quarterly`. Read-only against the repo and DB; it never edits copy, never sends,
never deploys.

### Surfaces to sweep (every quarter, all of them)

1. Every public page under `app/` that renders customer-facing copy (landing, checkout, access,
   join, one-selfie and successor event pages, work-with-me, academy).
2. Every email template and email-producing module (`lib/email/`, `lib/payments/handlers/*` email
   strings, nurture/recovery cron copy).
3. Every AI system prompt and persona (`lib/app-v3/` Maya persona + prompt compiler, admin
   generator prompts, `lib/content/grounding.ts` consumers).
4. Product descriptions, button labels, CTAs, popup/banner strings in `components/`.
5. Prompt Vault / freebie / preset copy (`lib/launch/`, vault data modules).
6. Exported ManyChat flow copy where mirrored in the repo (docs or data files); flag in the report
   that live ManyChat flows need a manual attended check by Sandra.
7. The docs that market (README-level pages, `docs/brand/` claims about counts and prices).

### Rules to check against (in this order)

1. `docs/brand/SSELFIE_BRAND_CONSTITUTION.md` — North Star framing, message order, guardrails
   (no income guarantees, no fake urgency, no invented proof), the Sandra Test, the Creative Bar.
2. Banned/retired language: every pattern in `scripts/check-voice-rules.mjs` (the canonical list —
   do not re-quote banned phrases in this spec, reports, or prompts; quoting them is how they leak
   back into copy), em-dashes, and retired products presented as current (Starter-Kit-first funnel,
   Brand Strategy Pack standalone, founding €697 scarcity, numbered-prompt funnel).
3. Stale facts: prices vs `lib/launch/cash-launch-pricing.ts` and Stripe price IDs in CLAUDE.md;
   follower/member counts hardcoded anywhere (any hardcoded count is automatically ⚠).
4. Offer-temperature routing per `docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md`
   (cold pages leading with warm-only language, or freedom-as-headline on cold surfaces).

### Report

Write `docs/audits/BRAND_AUDIT_<YYYY-QQ>.md`:

- Per surface: ✅ matches brand · ⚠ needs updating · ❌ old messaging found, with file:line and the
  offending string quoted.
- A P0/P1/P2 fix list (P0 = false claims, money/price errors, guardrail violations; P1 = retired
  messaging still live; P2 = tone drift).
- A one-paragraph summary Sandra can read in a minute.
- The report is a DRAFT of findings. No fixes are applied by the auditor. Sandra approves fixes;
  they ship as normal Codex tasks.

### Cadence and lanes

- Run in the first week of January, April, July, October. Attended: Sandra (or Claude Desktop in an
  attended session) runs `pnpm audit:brand-quarterly` and reads the report. Do NOT create a new
  scheduled automation for this — the Claude Cowork layer stays at exactly three scheduled tasks,
  and the repo hosts no new cron (Automation Roster lane rules apply).
- Update `docs/AUTOMATION_ROSTER.md` (attended-tools section) the same day this ships.

### Acceptance

- `pnpm audit:brand-quarterly` runs clean on a fresh checkout with `.env.local`, produces the
  report file, exits non-zero when any ❌ exists (so it can gate releases later if Sandra wants).
- Zero false positives on functional image-prompt likeness locks and on historical docs under
  `docs/audits/`, `docs/CLAUDE_ARCHIVE*`, and `tasks/` (audit customer-facing surfaces, not
  archives).
- A dry run against the current repo is included in the PR description with its P0/P1/P2 counts.
