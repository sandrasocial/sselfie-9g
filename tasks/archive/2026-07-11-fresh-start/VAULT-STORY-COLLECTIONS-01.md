# VAULT-STORY-COLLECTIONS-01 — Story collections (per-shot inspiration + vibe presets)

**Owner:** Claude (spec) → me or Codex (build)
**Status:** Ready to build. Approved direction (Sandra, 2026-06-24): one inspo per shot · presets + free-form override · spec first.
**Scope:** Admin Shoot Studio + Vault publish + admin UI. Suite Maya untouched.

## Goal
Add variety + storytelling to the Vault. Beyond today's single cohesive photoshoot, let Sandra build **Story collections**: each shot has its **own** vibe/outfit/location, driven by **one uploaded inspiration image per shot** (photodump energy), in a chosen **vibe** (e.g. "iPhone mirror selfie"). Each shot recreates its own inspo while keeping Sandra's identity.

## What exists today (audit — do not break it)
`lib/content-kit/shoot-generator.ts` makes ONE cohesive shoot:
- `createShoot` caps inspiration at 3 (`.slice(0, 3)`); a vision planner (`buildCreatePrompt` → `buildVaultAnatomy`) reads all inspo **together** and writes 6 shots in ONE world.
- `renderShotIndicesWithContinuity` renders shot 1, then anchors shots 2-6 to it (the **continuity anchor**) to keep them consistent.
- `generateShotImage` gives every shot ALL inspo + the continuity anchor.
- `buildShotRenderPrompt` already does **close-recreation for shot 1** (`SSELFIE_INSPIRATION_CLOSE_RECREATE`) and set-variation for the rest. **This is the key reusable piece.**

Story mode is the inverse: per-shot inspo, **no** continuity, **close-recreate every shot**, in a selectable vibe.

## Build

### 1. Data + input
- `content_shoots`: add `collection_type text default 'cohesive'` ('cohesive' | 'story') and `vibe text` (preset id or free-form). Additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` like the existing `selfie_urls` migration.
- For **story** mode, `inspiration_urls` becomes the **ordered per-shot list** (inspo[i] = shot i). Shot count = number of inspo (cap ~9). Raise the `.slice(0, 3)` caps to `.slice(0, 9)` for story mode (keep 3 for cohesive, or just raise both to 9 — 9 is safe).
- `createShoot` input: add `collectionType: "cohesive" | "story"`, `vibe?: string`, `vibeOverride?: string`.

### 2. Vibe presets (registry + free-form override)
New `lib/content-kit/shoot-vibes.ts`:
```
export const SHOOT_VIBES = {
  "editorial-photoshoot": { label: "Editorial photoshoot", anatomy: buildVaultAnatomy(...) },   // current
  "mirror-selfie": { label: "iPhone mirror selfie", anatomy: MIRROR_SELFIE_ANATOMY },
  "photodump": { label: "Photodump / camera-roll", anatomy: PHOTODUMP_ANATOMY },
}
```
- `MIRROR_SELFIE_ANATOMY` = Sandra's pasted recipe, generalized for any woman + the no-fake doctrine: ultra-realistic iPhone mirror selfie, real mirror physics/reflection, natural phone-camera quality, realistic skin/hands, casual everyday framing, NOT studio, NOT AI-smooth. Sections: Scene/mirror placement, Outfit, Hair, Makeup (natural glam), Accessories (minimal), Pose, Crop (close/half/full/floor/car/bathroom), Lighting, Mood (camera-roll energy), Avoid (distorted hands, fake reflection, AI smoothness, logos, extra people).
- `vibeOverride` (free-form text) is appended to / can replace the preset anatomy's style direction for that collection.
- The chosen vibe's anatomy **replaces `buildVaultAnatomy`** inside `buildCreatePrompt` for that shoot.

### 3. Planner (`buildCreatePrompt`)
- Cohesive: unchanged.
- **Story**: instruct the planner to write **one prompt per inspiration image, in order** — "prompt N is a CLOSE RECREATION of inspiration image N, its own scene/outfit/location; do NOT make them match each other." Use the vibe anatomy. The planner receives the inspo images in order (they already pass as `imageUrls` to `callContentKitVision`); tell it image 1 → shot 1, etc. Number of shots = number of inspo.

### 4. Rendering (the reusable part)
- `createShoot` story path: render each shot independently. Shot i uses `inspirationUrls: [inspirationUrls[i]]` (ONLY its own inspo) + selfies, `continuityUrls: []` (no anchor).
- `buildShotRenderPrompt`: add a `closeRecreateAll` (or derive from collection_type) so **every** story shot uses `SSELFIE_INSPIRATION_CLOSE_RECREATE` + the "match the inspiration crop/pose/framing" role line (today only shot 1 does). Keep the styling-brief forwarding.
- Do NOT run `renderShotIndicesWithContinuity` for story mode (it injects the continuity anchor). Add a `renderStoryShots` that renders all shots in parallel, each with its own inspo, no anchor.

### 5. Publish (Vault)
- Story collections publish through the existing `shoot-publisher` flow (vault_collections + vault_prompts) unchanged — the output is just a varied collection. Title/slug reflect the story theme (e.g. "Mirror Selfie Vault").

### 6. UI (`components/admin/shoot-studio-client.tsx`)
- A **Collection type** toggle: *Cohesive shoot* (default) vs *Story collection*.
- A **Vibe** dropdown (presets) + a **free-form override** textarea (the "presets + override" choice).
- Story mode: the inspiration uploader becomes **ordered, one-per-shot** (reuse the story-background drag/reorder pattern from `content-story-client.tsx`), and the shot count follows the inspo count. Show "Shot 1", "Shot 2"… labels on the inspo tiles.

### 7. Tests
- Story mode: each shot's render payload uses ONLY its own inspo + selfies, no continuity URL, and the close-recreate contract; the planner is told one-prompt-per-inspo; the vibe anatomy (e.g. mirror-selfie language) appears in the prompt.
- Cohesive mode: unchanged (existing `shoot-studio-reference-payload` / `shoot-studio-publish-pipeline` tests still pass).

## Acceptance
- Sandra picks **Story collection** + **iPhone mirror selfie** vibe, uploads 6 ordered mirror-selfie inspos + her selfies → gets 6 varied mirror-selfie prompts/renders, each recreating its own inspo, all clearly her, published as a Vault collection.
- Cohesive photoshoots are completely unchanged.
- Free-form vibe override works on top of a preset.

## Notes
- Identity stays locked (selfies = strict identity ref) in every vibe; the no-fake doctrine and "still you" wording apply to all anatomies.
- The close-recreate engine + per-shot render already exist — this is mostly a mode flag, per-shot inspo mapping, turning off continuity, and the vibe registry + UI.
