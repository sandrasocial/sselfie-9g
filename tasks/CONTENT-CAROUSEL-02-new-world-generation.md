# CONTENT-CAROUSEL-02 - New-World Generation for Tutorial Carousels (Phase 1.5)

OWNER: Codex (Sandra approves merge)

Status: spec ready (Sandra approved 2026-06-15). Builds on CONTENT-CAROUSEL-01 (commit b5243528,
live). Adds the "same method, new fantasy" engine that Phase 1 deferred.

## Goal
Tutorial carousels should be able to recreate a proven tutorial in NEW worlds — different location,
outfit, lighting — generated from Sandra's face selfie (identity-locked), instead of only reusing
existing reel frames. And, per Sandra's instruction, the generated cover/result slides should have
their SHORT headline rendered by gpt-image-2 (baked in), because a composited overlay "won't match"
on those scene slides.

## HARD INVARIANT — do not regress the screenshot-safe path
CONTENT-CAROUSEL-01's safety property MUST hold: **real iPhone-settings screenshots are kept
pixel-exact and composited with callouts; they are NEVER sent to gpt-image-2.** New generation in
this spec applies ONLY to the cover and result/transformation (scene) slides. The settings-screenshot
slides and composited step-text slides stay exactly as they are. Add a test that asserts no
`content_reel_references` screenshot URL is ever passed into a gpt-image-2 / `images.edit` call.

## Slide → renderer map (Phase 1.5)
- **Cover slide:** gpt-image-2 generates a new-world scene from Sandra's selfie, short hero line
  baked in. (NEW)
- **Result / before-after "after" slide:** gpt-image-2 generates the new-world result, optional
  short baked label. (NEW)
- **before-after "before" slide:** the plainer/original look (an existing reference frame or a
  plain selfie). Not a new-world generation.
- **iPhone-settings screenshot slides:** real screenshot, composited burgundy callouts. UNCHANGED.
- **step-text slides:** composited serif text. UNCHANGED.

## Reuse (do not build a new generator)
- `lib/content-kit/shoot-generator.ts` — `generateShotImage` / `extendShoot` already call
  gpt-image-2 `images.edit` with the selfie as identity anchor + structural identity guards
  (face can't drift). Reuse this for new-world cover/result images. Do NOT add a second
  gpt-image-2 path.
- Identity input: Sandra's admin selfies via `listAdminSelfies()` (`lib/content-kit/demo-generator.ts`).
- Optional pose/composition reference: the matching scene frame from `content_reel_references`
  (so the new-world shot keeps the original tutorial's framing). Multi-reference: face selfie
  first (high-fidelity identity), pose frame second. Keep total inputs ≤5.
- Grounding: identity-lock + no-fake + the vault/shoot prompt anatomy already used by the shoot
  engine; voice from `lib/content/grounding.ts`.

## Build items
1. **New-world cover/result generation.** In the tutorial path (`generateTutorialCarousels` in
   `lib/content-kit/carousel-generator.ts`), generate the cover and result/after images via the
   shoot engine from (selfie + optional pose-ref + a world prompt), identity-locked. Apply the
   `AVOID_LIST`/realism + no-fake guards already in the shoot engine (no plastic skin, keep face).
2. **Baked short text on generated scenes** (Sandra's instruction). For the cover hero line (and
   any short result label), have gpt-image-2 render the text in-image: quote the exact words,
   `quality: "high"`, `input_fidelity: "high"`, state placement. Keep ≤6 words for the hero.
   - Tradeoff to record in code comment: baked text approximates the brand serif (not exact
     Cormorant) and can't be edited post-gen. If a generated headline fails (garbled/misspelled),
     fall back to the existing composited `PhotoFrame` headline path. Make baked-vs-composited a
     per-slide flag so it's tunable.
3. **Tutorial "worlds" presets.** Offer Sandra a tap-first set of worlds (from her own playbook):
   hotel mirror · café · marble bathroom · full-body at-home mirror · window light · street style.
   Plus a free-text custom world. Each preset = a short scene/outfit/lighting prompt fragment.
4. **Maya tool update.** `create_admin_tutorial_carousel` gains an optional `world` / variation
   arg (preset or custom). Maya proposes worlds, generates the new-world cover/result, composites
   screenshots/steps as before, returns downloadable slides. No auto-post.

## Also fix while here (CONTENT-CAROUSEL-01 review nits, P2)
- `app/api/admin/content-kit/render/[id]/[slide]/route.tsx` ~before-after BEFORE image uses
  `objectFit: "cover"` — if a real screenshot is ever routed as the before image it gets cropped
  (not redrawn, but edges/values can clip). Use `contain` when the before asset is a screenshot.
- `lib/content-kit/carousel-generator.ts` `applyTutorialMedia` overlay index `screenshotAssets[(index - 1) % len]`
  can yield `-1` (→ undefined) on an early step slide. Use `((index - 1) % len + len) % len`.
- Add one behavioral test that runs `generateTutorialCarousels` (mocked LLM) and asserts:
  screenshots land in `overlayAssets` (composited) and never in a generate-call argument; cover/
  result slides carry a generated `imageUrl`.

## Acceptance
- A tutorial carousel can be generated in a chosen new world: cover + result show Sandra in the
  new location/outfit/lighting, recognizably her (identity-locked), with the short hero line baked
  in (or composited fallback).
- Screenshot-safe invariant proven by test: no real screenshot URL reaches gpt-image-2.
- before/after, burgundy callouts, grounding voice, admin gating, no auto-post — all still hold.
- "elevate/elevated" never appears. Existing carousel tests stay green; new tests added.
- `npx vitest run`, `npx tsc --noEmit --project tsconfig.ci.json`, `npm run build`, and
  `node scripts/verify-repo-invariants.mjs` pass.

## Out of scope (Phase 2)
- fal.ai batch lane (A/B on Sandra's face first; gate on skin texture per no-fake).
- Scheduled auto-batch + proactive "winner due for remix" suggestions.
