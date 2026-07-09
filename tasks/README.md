# Current Task Board

Last cleaned: 2026-07-09

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
- ManyChat PROMPT is not a numbered-keyword system. The current live/default model is
  `PROMPT` -> `/ai-prompts`, which shows the latest five SSELFIE shoot previews. The old
  `MANYCHAT-FUNNEL-01-numbered-prompts.md` file is superseded history, not an active build spec.
- IG inbox manual send policy is live. Native IG replies can send manually, automated sends remain
  gated, and ManyChat replies now have the production API key.

## Stabilization truth pass — 2026-07-09

- Phase 2 dead-admin cleanup and the current-model refresh are shipped on `main` and archived under
  `tasks/archive/2026-07-09-stabilization/`.
- MAYA-FIX-01 and MAYA-FIX-02 are already implemented with active regression coverage. Their old
  June specs are archived; the later all-real-image carousel direction supersedes the old two-face
  slide cap.
- The June Vault/founding launch specs are complete and archived. The last missing safety contract,
  per-campaign Resend audience override, was restored so a one-person delivery test cannot silently
  fall back to the global Main Audience.
- The Phase 2B content-engine deletion remains held until the replacement Cowork tasks complete
  their first real runs. Disabled code is safer than deleting the fallback early.

## Active build order — content/Maya thread (Sandra approved 2026-06-15, run in THIS order)

Codex: execute these in sequence (they share `prompt-compiler.ts` + `shoot-generator.ts`, so serial
avoids collisions):
1. `CONTENT-CAROUSEL-04-unify-customer-maya.md` + `CONTENT-CAROUSEL-03-FIX-people-free-slides.md`
   (finish the user-facing carousel/story redesign + remove faceless slides)
2. `SHOOT-TAXONOMY-01-shot-roles-and-variety.md` (shot roles + variety + 1-2 detail shots)
3. `CUSTOMER-PHOTOSHOOT-01-photoshoot-chip.md` (Photoshoot chip, built on #2)

**✅ COMPLETE, LIVE & VERIFIED 2026-06-17.** All shipped to main (533b6d81 + hero-anchor 5badffae),
deploy READY, tests 18/18 green. Verified output: customer carousel/reel-cover/story on-point
(CAROUSEL-04), faceless slides removed (03-FIX), and a real 6-shot photoshoot set is cohesive with
identity preserved (SHOOT-TAXONOMY-01 + CUSTOMER-PHOTOSHOOT-01/02 hero-anchor). No open items in
this thread. (Separate lane: presets product also went live in the same merge — pre-sale gates in
the presets memory: confirm prod Stripe price env + publish collection files + test purchase.)

Older MAYA-FIX/GROUNDING rows below are prior-thread items (mostly shipped); the table is the backlog.

| Priority | Spec | Owner | Why it remains |
|---:|---|---|---|
| ✅ shipped | `VOICE-LOOP-01-apprentice-loop.md` | Codex | SHIPPED 2026-07-08 (merge cdb30714, impl fcf207ef; test fix 178b6555 after Claude caught a stale test in full-suite verification). Apprentice loop + editorial memory injection live. |
| ✅ shipped | `EMPLOYEE-01-roster-and-dormant-crons.md` | Codex | SHIPPED 2026-07-08, same merge as above. product-qa-daily scheduled + piped into briefing, Team panel live on /admin home, envFlag hardening in place. |
| ❌ obsolete | `MAYA-ADMIN-02-live-content-qa.md` | — | OBSOLETE 2026-07-09 — asks Sandra to QA the Admin-Maya-chat content surface, which was already retired from the live UI on 2026-06-18 (Shoot Studio replaced it). Do not run this QA. Full deletion of the dead admin-Maya branch is scoped into the Phase 2 Codex cleanup below. |
| ✅ verified + archived | `archive/2026-07-09-stabilization/CODEX-BROADCAST-SEND-PIPELINE-2026-06-22.md` and the three related launch specs | Codex | Verified 2026-07-09: explicit Resend send, scheduled cron, price/cap fallback, first-run path, and regression tests are present. Restored the missing per-campaign audience override before archiving. |
| 3 | `NEEDS-ME-01-waiting-on-sandra-queue.md` | Codex | 2026-07-08: approval items (broadcast drafts, flagged DMs, webhook review, codex PRs, concierge list) pile up invisibly with no notifications — one aggregated "Waiting on you" queue in /admin home + daily briefing + alert-only for new today-urgency items. |
| ✅ shipped + archived | `archive/2026-07-09-stabilization/PHASE2-CLEANUP-01-dead-admin-maya-and-nav.md` | Codex | Shipped 2026-07-09 (`30b0bd12`): dead Admin Maya and Post Now removed; admin nav reduced to Home/Inbox/Content/Support/Tools. |
| ✅ shipped + archived | `archive/2026-07-09-stabilization/PHASE2-MODEL-REFRESH-01-current-models.md` | Codex | Shipped 2026-07-09 (`f98cd1c3`): live-verified Sonnet 5/OpenRouter routing, safe direct fallback, real provider smoke, and full local suite. |
| HELD | `PHASE2B` (not yet written) | Codex | Retires `content-brief-weekly`/`content-brief-jobs` crons + `lib/content-engine/brief-generator.ts` + `lib/admin/daily-briefing-intelligence.ts`. Explicitly held until the weekly-content-brief-draft Cowork task has completed at least one real Monday run (next: 2026-07-13) and ig-dm-drafter has run at least once — deleting the old pipeline before confirming the replacement works would leave no working weekly brief if something's wrong with the new one. The old cron is already harmlessly disabled (`CONTENT_BRIEF_ENABLED=false` in Vercel prod), so there's no cost to waiting. |
| ✅ shipped + archived | `archive/2026-07-09-stabilization/MAYA-FIX-01-quick-wins.md` | Codex | Verified 2026-07-09: ask-sized concept sets, count-agnostic tap copy, all-real-image carousel guidance, and banned-word guard are covered by `tests/maya-fix-01-quick-wins.test.ts`. The old two-face cap is superseded. |
| ❌ superseded | `MAYA-FIX-03-overlay-text-layer.md` | — | SHIPPED then SUPERSEDED 2026-06-15. Sandra: remove the text-overlay generator once and for all (incl. customer Maya + text previews). The editable text layer is the wrong approach — replaced by image-to-image redesign (CAROUSEL-03). To be REMOVED, not maintained. |
| ✅ shipped + archived | `archive/2026-07-09-stabilization/MAYA-FIX-02-edit-likeness-tapfirst-voice.md` | Codex | Verified 2026-07-09: identity-selfie edit anchoring, vanity/quality guards, tap-first graphics, caption voice enforcement, slim v3 brain, and dead-module cleanup all have active tests. |
| ❌ removed from active root | Content grounding reset | — | Removed from the active task root on 2026-07-01 because it pointed to stale voice guidance. Future generator grounding work needs a fresh task based on `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md` and `docs/brand/source/2026-06-27/`. |
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
