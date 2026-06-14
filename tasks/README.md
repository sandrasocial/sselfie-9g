# Current Task Board

Last cleaned: 2026-06-14

This folder now contains only current work. Old completed, stale, superseded, and planning specs
were moved to `tasks/archive/2026-06-14-spec-cleanup/` so the active surface is readable.

## Rule

Before starting work, read this file first. If a request references an archived spec, verify the
current code before reviving it. Do not execute archived specs as-is.

## Current State

Production is live on `main`; Vercel deploys automatically from `main`.

The previous active board was stale. Code inspection and recent verification showed:

- CI is locally green-able: lint has 0 errors, focused tests pass, full test/build passed during
  the 2026-06-14 cleanup cycle.
- Stripe webhook extraction is no longer a monolith: `app/api/webhooks/stripe/route.ts` is a small
  dispatcher and payment handlers live in `lib/payments/handlers/` and `lib/payments/lifecycle/`.
- Prompt Vault funnel emails are built and wired.
- The free AI prompts page already shows "Shot 1 of N" locked Vault previews and has tests for
  locked-prompt safety.
- IG inbox manual send policy is live. Native IG replies can send manually, automated sends remain
  gated, and ManyChat replies now have the production API key.

## Active Work

| Priority | Spec | Owner | Why it remains |
|---:|---|---|---|
| 1 | `DM-LAUNCH-01-live-qa.md` | Sandra + Codex if bug found | The DM bridge is built, but needs one real end-to-end ManyChat inbound -> admin reply -> Instagram received test. |
| 2 | `SHOOT-STUDIO-02-live-drop-qa.md` | Sandra + Codex if bug found | Shoot Studio is built, but needs live drop QA with real queued/published shoots and email preview/send validation. |
| 3 | `MAYA-ADMIN-02-live-content-qa.md` | Sandra + Codex if bug found | Maya Admin content tooling is code-complete, but Sandra should test the approve/publish/drop-email handoff and content quality. |
| 4 | `SCALE-READY-01-loose-threads.md` | Codex | Current loose threads to tie before the repo feels clean and scalable. |

## Completed Work Snapshot

See `COMPLETED-2026-06-14.md`.

## Archived Specs

Archived specs are retained for context only:

- Completed product specs
- Superseded plans
- Stale queue items
- Old loop/process protocol
- Old loop status state
- Gated future plans

Do not re-open an archived spec directly. If a real gap remains, write a fresh current spec in the
root of `tasks/`.
