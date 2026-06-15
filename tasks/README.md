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
| 1 | `MAYA-FIX-01-quick-wins.md` | Codex | P0 quick wins from Maya deep audit 2026-06-15: kill EXACTLY-3 contradiction (full shoots return 6-9), face-first carousels + 2-slide cap, remove banned word in persona. Prompt/logic only, ~1 day, no UI rebuild. |
| ❌ superseded | `MAYA-FIX-03-overlay-text-layer.md` | — | SHIPPED then SUPERSEDED 2026-06-15. Sandra: remove the text-overlay generator once and for all (incl. customer Maya + text previews). The editable text layer is the wrong approach — replaced by image-to-image redesign (CAROUSEL-03). To be REMOVED, not maintained. |
| 3 | `MAYA-FIX-02-edit-likeness-tapfirst-voice.md` | Codex | P1 from Maya audit: Edit Mode likeness drift, tap-first for carousel/reel/story, caption banned-word guard, slim the shared brain, delete dead font modules. |
| 4 | `CONTENT-GROUNDING-01-wire-voice-audience-proof.md` | Codex | One canonical Voice/Audience/Proof module (`lib/content/grounding.ts`) wired into the weekly brief, shoot, carousel, story generators. Fixes "doesn't sound like me / doesn't know my audience / no proof." Source doc `docs/brand/SSELFIE_CONTENT_GROUNDING.md` is APPROVED (2026-06-15) — ready to build. |
| ✅ shipped | `CONTENT-CAROUSEL-01-tutorial-carousel-mode.md` | Codex | SHIPPED 2026-06-15 (commit b5243528, deploy READY). Tutorial carousel mode, before/after slide, burgundy callouts, screenshot-safe compositing, Maya tool reading `content_reel_references`. Verified: tests 5/5, screenshots never redrawn by AI. Phase-1 slice = assembles from existing reel references (no gpt-image-2 generation yet → CAROUSEL-02). |
| ✅ shipped | `CONTENT-CAROUSEL-02-new-world-generation.md` | Codex | SHIPPED 2026-06-15 (commit 4e85f111, deploy READY). Phase 1.5: gpt-image-2 new-world cover/result generation (identity-locked from selfies), 6 world presets + custom, baked-headline flag + composited fallback, nit fixes. Verified: tests 6/6, settings-screenshot safety preserved (scene screenshots composited, never generated). |
| ❌ obsolete | `CONTENT-CAROUSEL-02-FIX-generation-inputs.md` | — | CANCELLED 2026-06-15. It would block screenshots from reaching gpt-image-2; Sandra's corrected direction (CAROUSEL-03) deliberately sends screenshots INTO the model as the visual base. Do NOT build. |
| 5 (pending yes) | `CONTENT-CAROUSEL-03-image-model-as-designer.md` | Codex | AUTHORITATIVE content-slide spec (image-to-image redesign), pending Sandra's yes on the live-app removal. ONE workflow everywhere: reference frame in → image model redesigns → finished styled slide out. Covers tutorial carousels, photoshoot carousels, story sequences, AND customer-facing Maya. Reference by type: tutorial = real reel frame (preserve); photoshoot = selfie (new looks OK); story = editorial photo. REMOVES the text-overlay generator everywhere (FIX-03 layer, overlay composer, text previews, white-card renderer). Style anchors: `content_style_references` (65, categorized). Proven prompts in `scripts/prototype-*.ts`. |
| 6 | `SHOOT-STUDIO-02-live-drop-qa.md` | Sandra + Codex if bug found | Shoot Studio is built, but needs live drop QA with real queued/published shoots and email preview/send validation. |
| 7 | `MAYA-ADMIN-02-live-content-qa.md` | Sandra + Codex if bug found | Maya Admin content tooling is code-complete, but Sandra should test the approve/publish/drop-email handoff and content quality. |
| 8 | `SCALE-READY-01-loose-threads.md` | Codex | Current loose threads to tie before the repo feels clean and scalable. |
| Hold | `DM-LAUNCH-01-live-qa.md` | Sandra | Forward-going bridge is live. Historical backlog import is paused; existing backlog remains in Instagram/ManyChat unless exported/imported later. |

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
