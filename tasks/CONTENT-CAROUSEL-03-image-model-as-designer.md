# CONTENT-CAROUSEL-03 - Editorial Overlay on Real Reel Frames (no generation)

OWNER: Codex (Sandra approves merge)

Status: spec rewritten 2026-06-15 after Sandra's correction. **Pending Sandra's final "yes" before
Codex builds.** Supersedes the renderer-as-designer (white cards) of 01/02 AND parks the
gpt-image-2 generation of 02/earlier 03 draft.

## What Sandra actually wants (confirmed 2026-06-15)
A carousel built from ONE of her existing tutorial reels, using the reel's OWN real frames:
- **Slide 1 (cover) = the reel's real result shot** (the editorial "after" at the end of the reel).
  Used as-is. No regeneration, no change.
- **Step slides = the real reel screenshots** (iPhone camera UI, etc.) as the FULL-BLEED 4:5
  background, with the **SSELFIE editorial layer composited ON TOP**: serif hero + minimal sans
  helper + muted oxblood (#6E2A35) callouts/arrows, soft scrim for legibility.
- The real screenshot is **preserved exactly** (pixels untouched — values stay correct).
- **No image generation. No fabricated scenes. No new worlds. No generated covers. No white cards.**

## Why composited, not generated (the corrected mechanism)
Sandra paused all new-image generation because auto-generated scenes/covers were incoherent and
didn't capture the real teaching. So the editorial layer is **composited** over the real frame
(deterministic, exact brand serif, screenshot preserved). This is NOT the rejected white-card
look — the canvas is her real screenshot, full-bleed, with text on top. The image model is NOT in
this path.

## PARKED (do not build now)
- gpt-image-2 new-world generation (CAROUSEL-02) and the generated-cover/scene approach. Revisit
  only when we can make generated slides coherent and on-teaching, with Sandra's go. The
  prototypes (`scripts/prototype-*.ts`) and the style-reference library remain for that future.

## Data (already built)
- `content_reel_references`: per reel, `kind='cover'` = the result shot (→ slide 1), `kind='scene'`
  + `scene_index` = the step screenshots (→ step slides in order). 15 reels / 185 refs live.

## Build (Codex)
- Tutorial carousel = assemble a chosen reel's frames into a 4:5 deck:
  - Slide 1: the `cover` ref image, full-bleed, untouched (optional minimal hero only if Sandra asks).
  - Step slides: each `scene` ref as the full-bleed background + composited editorial overlay.
- Compositing reuses the existing next/og renderer's **photo-background path** (the real frame is
  the background image), NOT the white `Frame`/lesson-card path. Port the burgundy callout SVGs
  (`Squiggle`/`KeywordCircle`/`Arrow`) over the real-frame background. Add a soft scrim only where
  text needs contrast; never cover the key UI/value being taught.
- Editorial text content (hero/helper per slide) from `lib/content/grounding.ts` voice. Note: the
  real screenshots often already carry the reel's own on-screen text — in QA, decide per slide
  whether to add a hero or let the screenshot speak (avoid redundant double text).
- Retire the white-card output as default (only if Sandra explicitly asks for a text-only slide).
- Maya admin tool: assemble the carousel from a chosen reel + return downloadable 1080x1350 PNGs.
  No auto-post.

## Acceptance
- Output = the reel's real result shot as slide 1 + real screenshots as step slides, each with a
  tasteful SSELFIE editorial overlay (serif hero, minimal helper, muted oxblood callouts) over a
  soft scrim. Screenshots preserved exactly (values intact). 1080x1350 PNG, downloadable.
- No generated/fabricated imagery, no new worlds, no white lesson cards, no emoji/green/bright-red.
- "elevate/elevated" absent. Nothing auto-posts.

## Open confirm before build
This composites the editorial layer over your real screenshots (no AI generation, no white cards).
Confirm that's right and I hand it to Codex.
