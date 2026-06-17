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

## Active build order — content/Maya thread (Sandra approved 2026-06-15, run in THIS order)

Codex: execute these in sequence (they share `prompt-compiler.ts` + `shoot-generator.ts`, so serial
avoids collisions):
1. `CONTENT-CAROUSEL-04-unify-customer-maya.md` + `CONTENT-CAROUSEL-03-FIX-people-free-slides.md`
   (finish the user-facing carousel/story redesign + remove faceless slides)
2. `SHOOT-TAXONOMY-01-shot-roles-and-variety.md` (shot roles + variety + 1-2 detail shots)
3. `CUSTOMER-PHOTOSHOOT-01-photoshoot-chip.md` (Photoshoot chip, built on #2)

**Status 2026-06-15:** all three implemented on branch `codex/content-maya-quality-sequence`
(533b6d81). QA done: tests 17/17, review PASS-WITH-NITS, customer carousel/reel-cover/story output
verified on-point. **MERGE HELD** for one item Sandra wants before going live:
`CUSTOMER-PHOTOSHOOT-02-hero-anchor-cohesion.md` (photoshoot sets currently cohere by prompt text
only; add hero-first shared-anchor so a set shares one outfit/look). Codex implements on the SAME
branch → Claude re-verifies a real photoshoot set → then fast-forward main for deploy.

Older MAYA-FIX/GROUNDING rows below are prior-thread items (mostly shipped); the table is the backlog.

| Priority | Spec | Owner | Why it remains |
|---:|---|---|---|
| 1 | `MAYA-FIX-01-quick-wins.md` | Codex | P0 quick wins from Maya deep audit 2026-06-15: kill EXACTLY-3 contradiction (full shoots return 6-9), face-first carousels + 2-slide cap, remove banned word in persona. Prompt/logic only, ~1 day, no UI rebuild. |
| ❌ superseded | `MAYA-FIX-03-overlay-text-layer.md` | — | SHIPPED then SUPERSEDED 2026-06-15. Sandra: remove the text-overlay generator once and for all (incl. customer Maya + text previews). The editable text layer is the wrong approach — replaced by image-to-image redesign (CAROUSEL-03). To be REMOVED, not maintained. |
| 3 | `MAYA-FIX-02-edit-likeness-tapfirst-voice.md` | Codex | P1 from Maya audit: Edit Mode likeness drift, tap-first for carousel/reel/story, caption banned-word guard, slim the shared brain, delete dead font modules. |
| 4 | `CONTENT-GROUNDING-01-wire-voice-audience-proof.md` | Codex | One canonical Voice/Audience/Proof module (`lib/content/grounding.ts`) wired into the weekly brief, shoot, carousel, story generators. Fixes "doesn't sound like me / doesn't know my audience / no proof." Source doc `docs/brand/SSELFIE_CONTENT_GROUNDING.md` is APPROVED (2026-06-15) — ready to build. |
| ✅ shipped | `CONTENT-CAROUSEL-01-tutorial-carousel-mode.md` | Codex | SHIPPED 2026-06-15 (commit b5243528, deploy READY). Tutorial carousel mode, before/after slide, burgundy callouts, screenshot-safe compositing, Maya tool reading `content_reel_references`. Verified: tests 5/5, screenshots never redrawn by AI. Phase-1 slice = assembles from existing reel references (no gpt-image-2 generation yet → CAROUSEL-02). |
| ✅ shipped | `CONTENT-CAROUSEL-02-new-world-generation.md` | Codex | SHIPPED 2026-06-15 (commit 4e85f111, deploy READY). Phase 1.5: gpt-image-2 new-world cover/result generation (identity-locked from selfies), 6 world presets + custom, baked-headline flag + composited fallback, nit fixes. Verified: tests 6/6, settings-screenshot safety preserved (scene screenshots composited, never generated). |
| ❌ obsolete | `CONTENT-CAROUSEL-02-FIX-generation-inputs.md` | — | CANCELLED 2026-06-15. It would block screenshots from reaching gpt-image-2; Sandra's corrected direction (CAROUSEL-03) deliberately sends screenshots INTO the model as the visual base. Do NOT build. |
| 2 (READY) | `SHOOT-TAXONOMY-01-shot-roles-and-variety.md` | Codex | Codex-diagnosed + Claude-verified 2026-06-15: full-shoots repeat scene/outfit/pose (no shot taxonomy; `compilePhotoPrompt` generic; no `shotType`; sanitizer mutates outfit at render). Add shotRole taxonomy (varied framings of HER) + pre-gen variety validation + move outfit safety upstream. REFINEMENT: faceless "true-detail" shots are OPTIONAL not required (her content is all-her). Touches prompt-compiler + shoot-generator — sequence after CAROUSEL-04/FIX to avoid collisions. |
| 3 (READY) | `CUSTOMER-PHOTOSHOOT-01-photoshoot-chip.md` | Codex | Sandra 2026-06-15: add a "Photoshoot" chip to customer Maya. Picks → cohesive SET (one outfit/vibe), NO concept cards, shot-role variety + 1-2 faceless detail shots. Reuse the admin Shoot Studio engine. Cohesion = selfies (every shot) + the hero shot as shared anchor (refines "last image" to avoid identity drift). Depends on SHOOT-TAXONOMY-01; sequence last. |
| 1 (READY) | `CONTENT-CAROUSEL-04-unify-customer-maya.md` | Codex | Verified gap 2026-06-15: the redesign engine + style anchors produce on-point output on ALL surfaces (admin tutorial, user carousel/reel-cover/story, incl. a non-tutorial brand topic) — but the LIVE customer Maya does NOT use it (generates from selfie + text prompt, no anchor). Route customer carousel/reel-cover/story through the redesign engine + category anchors (reference = member selfie). Makes the user-facing suite match approved quality. Pairs with the FIX below. |
| 1 (FIX ready) | `CONTENT-CAROUSEL-03-FIX-people-free-slides.md` | Codex | Post-review fix: REMOVE the faceless slide concept. There are no object-only / text-only slides — every slide is a real image of her (photoshoot/identity) or a real screenshot (tutorial) redesigned in the editorial style. Delete `detail`/`text-only` slide types + `NO_PEOPLE` (leftovers from the rejected text-card approach), incl. the selfie-on-NO_PEOPLE contradiction. Update tests. |
| ✅ shipped | `CONTENT-CAROUSEL-03-image-model-as-designer.md` | Codex | SHIPPED 2026-06-15 (commit 80c48b9e, deploy READY). Image-to-image redesign is now the only content-slide workflow; text-overlay generator REMOVED end-to-end (8 files deleted, customer + admin), white cards not a default for new content, per-type references + categorized anchors, café-cover path deleted. Verified: tests 9/9, no dangling refs. One follow-up = the FIX above. AUTHORITATIVE content-slide spec. ONE workflow everywhere: reference frame in → image model redesigns → finished styled slide out. Covers tutorial carousels, photoshoot carousels, story sequences, AND customer-facing Maya. Reference by type: tutorial = real reel frame (preserve); photoshoot = selfie (new looks OK); story = editorial photo. REMOVES the text-overlay generator everywhere (FIX-03 layer, overlay composer, text previews, white-card renderer). Style anchors: `content_style_references` (65, categorized). Proven prompts in `scripts/prototype-*.ts`. |
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
