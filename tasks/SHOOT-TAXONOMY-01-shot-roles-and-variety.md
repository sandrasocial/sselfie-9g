# SHOOT-TAXONOMY-01 - Shot roles + variety validation (fix repetitive full-shoots)

OWNER: Codex (Sandra approves merge)

Status: ready. Source: Codex audit + Claude code verification 2026-06-15. Quality repair for the
core product (the photoshoot), separate from the carousel redesign thread.

## Problem (verified in code)
Maya full-shoots and Admin Shoot Studio repeat the same scene/outfit/pose with tiny variations,
and "detail" shots drift back to portraits. Root cause = the planning/prompt layer, NOT the model:
- `lib/app-v3/prompt-compiler.ts` `compilePhotoPrompt` (~392) compiles each photo generically from
  `brief.outfit/setting/pose` with NO shot role — nothing enforces a varied set.
- No `shotType`/`shotRole` exists anywhere (grep = NONE). Admin Shoot Studio only requests a varied
  mix in prose (`lib/content-kit/shoot-generator.ts:194`); nothing enforces it.
- `sanitizePromptForImageSafety` (`shoot-generator.ts:59`, applied at 257) rewrites clothing terms
  (halter→sleeveless midi, deep V→modest, mid-thigh→midi) at RENDER time, so the planned outfit can
  silently stop matching the rendered image.
- Model/provider drift ruled out: v3 = gpt-image-2 (OpenAI images.edit); LoRA is the separate
  legacy `/studio` path. Not a model mixup.

## Fix
### 1. Add a shot-role taxonomy (data model + planning)
- Add `shotRole` to the user-facing concept/brief and the Admin Shoot Studio per-shot contract.
- Roles = varied FRAMINGS OF HER (Sandra's approved content is her in every frame):
  `establishing-full-body` · `seated-hero` · `profile` · `movement/lifestyle-action` ·
  `close-portrait` · `cover-safe-hero` (negative space for text).
- **Refinement (Sandra's call):** a faceless `true-detail` (object/hands/fabric, no face) is
  OPTIONAL, not required — her approved shoots are all-her. Do NOT mandate a faceless shot. (This
  also keeps it consistent with CONTENT-CAROUSEL-03-FIX: no faceless filler.)
- The planning layer (persona / emit_concepts for user-facing; the create prompt for admin) must
  ASSIGN a role per shot and produce a varied set, not 6-9 of the same world/pose.
- `compilePhotoPrompt` and the shoot prompt must RECEIVE `shotRole` and express it concretely
  (establishing = full-body wide; profile = true side angle; movement = candid mid-step;
  close-portrait = tighter crop; seated = seated/leaning). A role that means "no face" must say so.

### 2. Validate before generation (full shoots)
- 6+ shots for a full shoot.
- No two shots share the same pose + background (enforce variety).
- Same outfit family across the shoot unless the user intentionally varies it.
- Shot roles are diverse (not all close-portrait); at least 2-3 distinct framings.
- If a role is `true-detail`, it must NOT render as a face portrait.
- On violation: re-plan (ask the model to diversify) rather than render a repetitive set.

### 3. Move outfit safety upstream
- Maya / the shoot planner should choose a generation-SAFE outfit up front (avoid the risky terms
  the sanitizer rewrites), so plan == render.
- Keep `sanitizePromptForImageSafety` as a last-resort net, but LOG when it fires (a fired
  sanitizer = a bad plan to fix), so planned vs rendered outfit can't silently diverge unnoticed.

## Scope
- User-facing Photo/full-shoot: `lib/app-v3/prompt-compiler.ts` + the concept-planning persona/
  emit_concepts.
- Admin Shoot Studio: `lib/content-kit/shoot-generator.ts` (contract + `sanitizeShots` validation).

## Sequencing / overlap (important)
Touches `prompt-compiler.ts` + `shoot-generator.ts`, shared with CONTENT-CAROUSEL-04 +
CONTENT-CAROUSEL-03-FIX. Coordinate to avoid collisions — recommend landing FIX + 04 first (they
finish the carousel/customer thread), then this. Codex's note "carousel detail slides over-use the
selfie" is handled by CONTENT-CAROUSEL-03-FIX (faceless-slide removal); don't double-fix.

## Acceptance
- A full shoot returns a varied, cohesive set: distinct shot roles (establishing/seated/profile/
  movement/close), consistent outfit family, no repeated pose+background. No mandatory faceless
  shot. Planned outfit == rendered outfit (sanitizer logged if it fires).
- Tests for the validation rules. Build/invariants green.

## Confidence (Claude-verified)
Planning-layer is the cause 0.9 · admin shotType missing 0.97 · sanitizer outfit-drift 0.8 ·
model/provider drift unlikely 0.85.
