# SSELFIE Automation Core

Updated: 2026-03-10

## Goal

Turn Codex from a collection of loose reporting jobs into a small set of autonomous engines that:

- detect real problems
- attempt low-risk fixes automatically
- verify the result
- only notify Sandra when blocked, risky, or decision-bound

## Operating model

- Skills are components, not the product.
- Engines own outcomes.
- Reports are inputs to action, not final outputs.
- Sandra only sees plain-language health, fixes, risks, and growth opportunities.

## Skill inventory

### Repo-local SSELFIE skills

| Skill | Purpose | Works with current codebase | Action or report | Class | Used by |
| --- | --- | --- | --- | --- | --- |
| `sselfie-maya-os` | Canonical Maya-first user journey and route rules | Yes | Guidance for action | CORE | User Journey Engine, Maya Quality Engine, Growth Intelligence Engine |
| `funnel-integrity-audit` | Detect checkout, CTA, auth-wall, and delivery leaks | Yes | Diagnostic that drives fixes | CORE | User Journey Engine, Revenue Intelligence Engine |
| `integration-health-check` | Validate Stripe, Neon, Resend, Redis, Blob, Supabase wiring | Yes, validated 2026-03-10 | Diagnostic that drives fixes | CORE | Product Health Engine, User Journey Engine |
| `user-journey-scanner` | Scan the live paid-only route ladder | Yes, updated 2026-03-10 | Diagnostic that drives fixes | CORE | User Journey Engine |
| `dead-code-hunter` | Find likely dead code and stale exports | Yes, validated 2026-03-10 | Report input for cleanup | SUPPORTING | Code Stability Engine |
| `prompt-authority-inspector` | Detect prompt drift and shadow prompt paths | Yes, validated 2026-03-10 | Report input for cleanup | SUPPORTING | Code Stability Engine, Maya Quality Engine |
| `repo-cartographer` | Map the current backend/frontend/integration surface | Yes, validated 2026-03-10 | Report input for cleanup | SUPPORTING | Code Stability Engine |
| `architecture-simplifier` | Surface high-risk dense areas and duplication hotspots | Yes, validated 2026-03-10 | Report input for cleanup | SUPPORTING | Code Stability Engine monthly pass |
| `gravity-scanner` | Identify high-gravity files and dependency hubs | Yes, validated 2026-03-10 | Report input for cleanup | SUPPORTING | Code Stability Engine monthly pass |
| `markdown-repo-curator` | Curate markdown docs with explicit manifests | Yes, not needed in active core | Manual action helper | SUPPORTING | Manual only |
| `upgrade-readiness-check` | Assess upgrade risk before dependency work | Yes, validated 2026-03-10 | Report input for planning | SUPPORTING | Manual only |

### Global Codex utility skills

| Skill | Purpose | Works with current codebase | Action or report | Class | Used by |
| --- | --- | --- | --- | --- | --- |
| `playwright` | Browser automation for live flow validation and targeted UI debugging | Yes. The User Journey Engine now uses a repo-owned headless smoke script first and reserves the skill for targeted diagnosis | Real action | CORE | User Journey Engine |
| `sentry` | Read-only production error inspection | Token-dependent, not exercised in this audit | Diagnostic | SUPPORTING | Product Health Engine fallback |
| `vercel-deploy` | Preview or production deploy helper | Not used in automation core | Real action | SUPPORTING | Manual only |
| `gh-fix-ci` | Investigate failing GitHub Actions checks | Not used in automation core | Real action after approval | SUPPORTING | Manual only |
| `gh-address-comments` | Address PR comments with `gh` | Not used in automation core | Real action after selection | SUPPORTING | Manual only |
| `openai-docs` | Official OpenAI docs retrieval | Not tied to SSELFIE automation core | Research support | SUPPORTING | Manual only |
| `doc` | DOCX creation and editing | Not tied to SSELFIE automation core | Real action | SUPPORTING | Manual only |
| `pdf` | PDF review and creation | Not tied to SSELFIE automation core | Real action | SUPPORTING | Manual only |
| `spreadsheet` | Spreadsheet editing and analysis | Not tied to SSELFIE automation core | Real action | SUPPORTING | Manual only |
| `jupyter-notebook` | Notebook scaffolding and editing | Not tied to SSELFIE automation core | Real action | SUPPORTING | Manual only |
| `screenshot` | OS-level screenshot capture | Not tied to automation core | Real action | SUPPORTING | Manual only |
| `skill-creator` | Create new Codex skills | Not tied to active core | Manual meta-tooling | SUPPORTING | Manual only |
| `skill-installer` | Install Codex skills | Not tied to active core | Manual meta-tooling | SUPPORTING | Manual only |
| `build-things` | Codex merch redemption flow | Unrelated to SSELFIE | Real action, not platform-relevant | OBSOLETE | None |

### Removed / archived skills

| Skill | Reason | Status |
| --- | --- | --- |
| `sselfie-user-journey-ops` | Duplicate of repo-local `sselfie-maya-os`; removed to reduce SSELFIE journey-skill drift | Archived to `~/.codex/skill-archive/2026-03-10/` |
| `earth-stone-glassmorphic` | Conflicted with the current SSELFIE brand and design rules | Removed from repo on 2026-03-10 |

## Automation inventory

### Active engines

| Automation ID | Engine name | Purpose | Works | Action or report | Status |
| --- | --- | --- | --- | --- | --- |
| `hourly-ops-triage` | Product Health Engine | Detect and repair runtime failures, cron failures, webhook/admin issues, and obvious env drift | Yes, validated 2026-03-10 | Action-first | ACTIVE |
| `daily-funnel-health` | User Journey Engine | Validate public paid flows, route integrity, and delivery paths | Yes. Repo-owned headless smoke validated locally on 2026-03-10; targeted browser diagnosis remains available | Action-first | ACTIVE |
| `nightly-maya-quality` | Maya Quality Engine | Detect Maya prompt drift, inline tool regressions, and character consistency issues | Yes. Initial audit shipped 2026-03-10 and immediately surfaced a prompt-authority bypass candidate | Action-first | ACTIVE |
| `nightly-brand-consistency` | Brand Consistency Engine | Detect visual, typography, and copy drift across public paid surfaces and live templates | Yes. Initial audit shipped 2026-03-10 and surfaced live email/font drift | Action-first | ACTIVE |
| `weekly-cohort-report` | Growth Intelligence Engine | Detect funnel trend changes, Maya activation issues, and growth opportunities | Yes, validated 2026-03-10 | Action-first | ACTIVE |
| `weekly-cleanup-radar` | Code Stability Engine | Detect code drift, dead code, prompt drift, and monthly architecture risk | Yes, validated 2026-03-10 | Action-first | ACTIVE |
| `daily-billing-audit` | Revenue Intelligence Engine | Detect revenue leaks, subscription linkage issues, and pricing or entitlement drift | Yes, validated 2026-03-10 | Action-first | ACTIVE |

### Archived automations

| Automation ID | Former purpose | Why archived | Status |
| --- | --- | --- | --- |
| `brand-engine-launch-digest` | Brand Engine reporting digest | Report-only and not part of the live SSELFIE maintenance core | ARCHIVED |
| `daily-email-performance` | Email performance report | Report-only | ARCHIVED |
| `daily-friction-digest` | Friction report | Report-only | ARCHIVED |
| `daily-funnel-digest` | Funnel digest | Report-only | ARCHIVED |
| `daily-funnel-report` | Duplicate funnel digest | Duplicate | ARCHIVED |
| `daily-support-digest` | Support issue digest | Report-only | ARCHIVED |
| `daily-support-digest-2` | Duplicate support digest | Duplicate | ARCHIVED |
| `hourly-ops-triage-2` | Duplicate hourly triage | Duplicate | ARCHIVED |
| `morning-executive-brief` | Summary brief over other reports | Meta-report on top of reports | ARCHIVED |
| `nightly-db-inventory` | Schema inventory | Report-only and not tied to active maintenance outcomes | ARCHIVED |
| `nightly-health-report` | Nightly report | Folded into engines | ARCHIVED |
| `nightly-health-report-2` | Duplicate nightly report | Duplicate | ARCHIVED |
| `nightly-ops-snapshot` | Ops snapshot | Report-only | ARCHIVED |
| `weekly-cleanup-radar-2` | Duplicate cleanup radar | Duplicate | ARCHIVED |

## Engine map

### 1. Product Health Engine

- Automation: `hourly-ops-triage`
- Schedule: hourly
- Inputs: `triage-hourly.mjs`, `check-production-status.mjs`, `audit:integration-health` when needed
- Outcome: fix localized runtime failures automatically when safe

### 2. User Journey Engine

- Automation: `daily-funnel-health`
- Schedule: nightly at 01:30, every day
- Inputs: `automation:journey-smoke`, `audit:journey`, `audit:integration-health`, `playwright`, `funnel-integrity-audit`, `sselfie-maya-os`
- Outcome: keep the public paid ladder healthy from landing to checkout to delivery

### 3. Growth Intelligence Engine

- Automation: `weekly-cohort-report`
- Schedule: Monday 06:15
- Inputs: `funnel-digest.mjs`, `support-digest.mjs`, `cohort-report-weekly.mjs`, `sselfie-maya-os`
- Outcome: detect funnel movement, Maya-stage friction, and the biggest growth opportunity

### 4. Maya Quality Engine

- Automation: `nightly-maya-quality`
- Schedule: nightly at 02:05, every day
- Inputs: `audit:maya-quality`, `check:prompt-authority`, targeted Maya vitest suites, `sselfie-maya-os`, `prompt-authority-inspector`
- Outcome: keep Maya in character, keep prompt authority centralized, and keep inline tools reliable

### 5. Brand Consistency Engine

- Automation: `nightly-brand-consistency`
- Schedule: nightly at 03:10, every day
- Inputs: `audit:brand-consistency`, `docs/brand/VOICE_BIBLE.md`, `docs/brand/DO_DONT.md`, `app/globals.css`
- Outcome: keep the paid funnel and live templates consistent in voice, typography, and visual language

### 6. Code Stability Engine

- Automation: `weekly-cleanup-radar`
- Schedule: Sunday 04:00
- Inputs: `audit:dead-code`, `audit:prompt-authority`, `audit:repo-map`
- Monthly deep pass: if run occurs on day 1 through 7, also run `audit:architecture-simplifier` and `audit:gravity`
- Outcome: make only low-risk cleanup and drift fixes automatically

### 7. Revenue Intelligence Engine

- Automation: `daily-billing-audit`
- Schedule: Monday 06:45
- Inputs: `audit-subscription-data.mjs`, `audit-revenue-sources.mjs`, plus funnel diagnostics when needed
- Monthly deep pass: if run occurs on day 1 through 7, add a revenue opportunity estimate
- Outcome: protect pricing, subscription, and entitlement integrity while surfacing the best upside

## Schedule model

The Codex automation UI supports hourly and weekly schedules only.

To support the requested monthly loop without unsupported RRULEs:

- weekly engines run on fixed weekly schedules
- monthly deep checks are executed inside the weekly engine prompt when the run lands on day 1 through 7 of the month

This keeps the schedule valid while still delivering:

- nightly bug detection and user journey validation
- nightly Maya quality and brand consistency checks
- weekly codebase, funnel, and revenue analysis
- monthly architecture and growth opportunity passes

## Founder reporting standard

Every engine must report to Sandra in plain language only when needed:

- Is the platform healthy?
- What issue happened?
- Was it fixed?
- Is the funnel improving or declining?
- What is the biggest growth opportunity?

Avoid technical detail unless a decision or risk requires it.
