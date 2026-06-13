# Task Spec Index

Last audited: 2026-06-13

This folder contains active build specs, completed historical specs, superseded plans, and gated strategy docs. Use this index before choosing the next Codex task.

## Active Build Queue

| Priority | Spec | Current truth | Next action |
|---:|---|---|---|
| 1 | `MAYA-ADMIN-01-admin-maya.md` | Mostly built. Weekly brief context and admin content tools are live. | Add admin-specific approval/rejection memory, then QA handoff polish. |
| 2 | `APP-CUTOVER-01-members-to-new-app.md` | Core member gate exists and App v3 is live. | Treat remaining work as cutover QA, env verification, member comms, and monitoring. |
| 3 | `WEBHOOK-01-split-stripe-monolith.md` | Extraction started but the Stripe webhook route is still too large. | Finish the zero-behavior-change split carefully, one handler at a time. |
| 4 | `IG-AGENT-01-foundation.md` + `DM-RELIEF-01-dm-triage-system.md` | Partly built and overlapping. | Consolidate into one current DM launch checklist, then live-QA permissions and send flow. |

## Complete Or Stale

| Spec | Status | Notes |
|---|---|---|
| `BRIDGE-01-suite-bridge.md` | Complete | All phases A-E are marked built. |
| `CONTENT-01-content-engine.md` | Complete enough | Weekly content brief cron, admin page, API, generator, and report type exist. Do quality QA only if needed. |
| `MEMBER-CHECKOUT-01-email-capture.md` | Complete/stale | Email capture, recovery cron, analytics event, and tests exist. Payment name/currency fixes were also completed. |
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
