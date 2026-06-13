# Task Spec Index

Last audited: 2026-06-13

This folder contains active build specs, completed historical specs, superseded plans, and gated strategy docs. Use this index before choosing the next Codex task.

## Active Build Queue

Each active spec carries an `OWNER:` line (specs-vs-code lane rule, 2026-06-13): Claude owns `tasks/*.md`; Codex owns code on `codex/` branches. Flip the line on handoff so "who's touching what" is never ambiguous.

| Priority | Spec | Current truth | Next action |
|---:|---|---|---|
| 1 | `CI-GREEN-01-make-ci-green.md` | **Keystone.** CI is red on `main` (full lint = 4 errors, full test = ~81 stale failures), so "CI green" — the loop's auto-merge gate — is currently impossible. Nothing auto-merges until this lands. | Codex: fix the 4 lint errors, triage/quarantine stale tests (NEVER quarantine payment/auth/entitlement suites). Claude reviews (Tier 0). |
| 2 | `WEBHOOK-01-split-stripe-monolith.md` | In progress. Membership-checkout handler extracted → **PR #52, reviewed + approved by Claude (clean behavior-preserving extraction), Sandra merging manually** (held off a red required check). Split continues one handler per commit. Includes the 8 leftover legacy `current_period_*` reads (NULL-period fix from ENTITLE-01). | Codex: next handler after PR #52 merges. |
| 3 | `FUNNEL-EMAIL-01-ai-prompts-vault-sequence.md` | Copy + proof approved by Sandra 2026-06-13. Reworks the AI-prompts→$27 Vault nurture: concrete day-7, new day-9 proof (real testimonial, text-only) + day-11 why-now, SUITE trial moved 10→14. Fully unblocked. | Codex: after WEBHOOK-01. Implement templates + sequence wiring (no `/app` collision). |
| 4 | `FUNNEL-FREEPAGE-01-shot-1-of-9-gap.md` | Spec drafted 2026-06-13. The free `/ai-prompts` page gives a complete-feeling shot, killing the urge to buy. Reframe each as "Shot 1 of 9" with the rest of the collection shown locked/teased. Highest-leverage structural conversion fix (Move 1 of the offer brief). | Codex: after FUNNEL-EMAIL-01. |
| 5 | `IG-AGENT-01-foundation.md` + `DM-RELIEF-01-dm-triage-system.md` | Partly built and overlapping. | Consolidate into one current DM launch checklist, then live-QA permissions and send flow. |

Separately, `fix/shoot-studio-multi-selfie` (PR #53, Claude-authored, Tier 0) adds Shoot Studio selfie upload + multi-select — awaiting Sandra's preview test + merge.

## Complete Or Stale

| Spec | Status | Notes |
|---|---|---|
| `ENTITLE-01-access-gate-audit.md` | Done / live 2026-06-13 | Test-mode access leak closed; stale rows neutralized. Confirmed live by Codex. |
| `BRIDGE-01-suite-bridge.md` | Complete | All phases A-E are marked built. |
| `CONTENT-01-content-engine.md` | Complete enough | Weekly content brief cron, admin page, API, generator, and report type exist. Do quality QA only if needed. |
| `MEMBER-CHECKOUT-01-email-capture.md` | Complete/stale | Email capture, recovery cron, analytics event, and tests exist. Payment name/currency fixes were also completed. |
| `MAYA-ADMIN-01-admin-maya.md` | Code-complete | All 4 slices built incl. Slice 4 weekly-brief injection (`maya/chat/route.ts:277`). No Codex task queued. Remaining: Sandra's live-QA checklist (in spec) + optional reel-cover/caption tools. Brief-row removal declined by design. |
| `APP-CUTOVER-01-members-to-new-app.md` | Code complete / operational | App v3 is live, env presence verified, lifecycle links point members to `/app`, and payment recovery opens `/app?view=account`. Remaining work is Sandra-approved member comms and week-one monitoring. |
| `SHOOT-STUDIO-01-admin-shoot-studio.md` | Mostly complete | Phase B and C are built. Remaining issue is operational inventory: need enough queued shoots for live drop QA. |
| `SUITE-UX-02-maya-flow-home-mobile.md` | Complete/stale | Product thumbnails, image-first library, and admin Academy product image controls are built and deployed. |
| `MAYA-REBUILD-02-engine-cutover.md` | Superseded/complete | App v3 generate/edit routes and prompt compiler exist. Do not run as a fresh spec. |
| `MAYA-REBUILD-05-port-legacy-ui.md` | Superseded | Many listed UI pieces now exist. Rewrite as a current polish checklist before assigning. |
| `SELFIE-TO-BRAND-SHOOT-01-ASSET-CONSOLIDATION.md` | Complete | Required asset map doc exists. |
| `SELFIE-TO-BRAND-SHOOT-02-PRODUCT-OUTLINE-AND-BUILD-SPEC.md` | Complete | Required product outline doc exists. |
| `UX-03-maya-classic-training-retention.md` | Complete | Studio Member Health report and `/admin` card built 2026-06-13. |

## Planning Or Gated

| Spec | Status | Notes |
|---|---|---|
| `CONTENT-VISUALS-01-content-kit.md` | Superseded except video research | Shoot Studio replaced the topic-first workflow. Only Phase 3 video/motion research may be useful later. |
| `VAULT-CLUB-E2E-PLAN.md` | Gated planning doc | Do not build Phase 3 until the validation gates in Phase 1 pass. |

## Operating Rule

If a spec and this index disagree, verify against code first, then update this index and the spec banner in the same commit.
