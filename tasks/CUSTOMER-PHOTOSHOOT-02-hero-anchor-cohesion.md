# CUSTOMER-PHOTOSHOOT-02 - Hero-anchor cohesion for photoshoots

OWNER: Codex (Sandra approves merge)

Status: ready. BLOCKS merge of branch `codex/content-maya-quality-sequence` (Sandra: add this before
going live, 2026-06-15). Follow-up to CUSTOMER-PHOTOSHOOT-01.

## Problem
The photoshoot set currently generates each shot in PARALLEL from the member's selfies only
(`app/api/app-v3/maya/generate/route.ts` photoshoot branch → `compileConceptJobs(shootBrief, "photo")`
per shot). Cohesion rests entirely on prompt TEXT (same outfit/world described in each brief), so the
outfit, accessories, and lighting can drift across the set — it won't read as ONE real photoshoot.

## Fix — hero-first shared anchor (keeps identity safe)
1. **Generate the hero shot first** from the member's selfies (identity). Pick the hero = the
   `seated-hero` / `establishing-full-body` role, else the first shot.
2. **Generate every remaining shot from selfies + the hero shot**, in this image order:
   selfies FIRST (identity anchor — keeps her face hers), the hero shot SECOND (shared style/cohesion
   reference — carries outfit, accessories, lighting, palette, world across the set).
   - The 1-2 faceless detail shots also reference the hero (for palette/scene cohesion) but render
     no face/full body.
3. Keep the outfit/accessories locked in the prompt too (belt + suspenders with the visual anchor).
4. Sequencing: hero first (1 call), then the rest in parallel, all referencing the hero.

## Why this is safe (no identity drift)
Identity stays anchored to the REAL selfies on EVERY shot (selfies first). The hero (a generated
image) is used only as a style/cohesion reference, not the identity source — so the set matches
outfit/lighting without the compounding drift that chaining the immediately-previous image causes.

## Acceptance
- A photoshoot set shares ONE outfit/look/accessories/lighting across all shots (visibly cohesive,
  like a real shoot), with varied shot roles + 1-2 faceless detail shots.
- Identity preserved and recognizable on every shot (selfies are the anchor; no drift).
- Hero generated first; remaining shots reference selfies + hero. Nothing auto-posts.
- Tests: assert non-hero shots receive both the selfie AND the hero image as references; hero is
  generated before the rest. Build/invariants green.

## After implementation
Claude re-verifies by generating a REAL photoshoot set (6+ shots) and checking set cohesion +
identity before main is fast-forwarded for deploy.
