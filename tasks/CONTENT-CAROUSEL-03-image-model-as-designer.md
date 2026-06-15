# CONTENT-CAROUSEL-03 - Image-to-Image Redesign (the ONLY content-slide workflow)

OWNER: Codex (Sandra approves merge)

Status: authoritative spec, rewritten 2026-06-15 per Sandra. **Pending Sandra's yes on the
customer-app removal before Codex builds.** Supersedes CAROUSEL-01 (renderer), CAROUSEL-02
(new-world), the composited-text rewrite, and MAYA-FIX-03 (text layer).

## The one principle (applies everywhere)
**Reference frame in → image model redesigns it → finished styled slide out.** The image model
(gpt-image-2 `images.edit`) is the designer and bakes the WHOLE slide (image + editorial text).
There is NO text-overlay generator, NO white cards, NO composited text layer, NO coded renderer as
designer. Keep it stupid simple: one image-to-image redesign call per slide.

Output must match Sandra's approved, already-posted ChatGPT generations (now the style anchors).

## Reference differs by content type (this resolves the café-cover mistake)
- **Tutorial carousel:** reference = the REAL reel frame. Preserve it (screenshot UI/values, the
  real result shot). Slide 1 = the reel's real result shot. Steps = the real screenshots
  redesigned into the editorial style. NEVER fabricate a scene/cover for a tutorial.
- **Photoshoot carousel:** reference = a selfie. Generating new looks/scenes IS the product here
  (e.g. approved "The slow morning look" — one selfie → a coherent photoshoot grid, same face,
  new mood/setting). Identity-locked.
- **Story sequence:** reference = an editorial photo. Redesign into a full-bleed 9:16 slide with
  emotional serif copy (e.g. approved "it started changing how I saw myself").

## Style anchors (built)
`content_style_references` (65 approved slides), `category` IN ('tutorial','photoshoot-carousel',
'story-sequence'). Each redesign picks an anchor of the matching category to lock the look.

## REMOVE the text-overlay generator — once and for all
Delete/retire across the whole app (Sandra's explicit instruction):
- Customer-facing Maya (App v3) text-overlay layer: `components/app-v3/layered-image.tsx`,
  `components/app-v3/overlay-composer.tsx`, `lib/app-v3/maya/overlay-styles.ts` text-layer usage
  (the MAYA-FIX-03 editable text layer). Maya's suite generation must produce styled images via
  image-to-image redesign, not generate-clean-then-composite-text.
- The **text-example previews** (the overlay style preview UI).
- The next/og white-card text renderer as a slide DESIGNER (content-kit carousel/story render
  routes' `Frame`/lesson-card text path). Keep next/og only if needed purely to assemble final
  PNGs from model outputs, not to draw text.
- Confirm nothing else depends on these before deleting; do it cleanly with tests updated.

## Workflow (per slide)
1. Pick the reference frame (real reel screenshot / result shot / selfie / editorial photo per type).
2. Pick a matching-category style anchor from `content_style_references`.
3. gpt-image-2 `images.edit`(reference + style anchor [+ selfie for identity on photoshoot/story],
   prompt = "redesign this into the SSELFIE editorial slide style of the anchor; preserve the
   [screenshot meaning + values | identity]; bake the editorial text/callouts in; muted oxblood
   accents; no white card, no emoji, no green, no bright red"). Proven prompts:
   `scripts/prototype-carousel-slide.ts` (screenshot redesign — Sandra-approved v2) and
   `scripts/prototype-cover-slide.ts` (identity-locked).
4. Output finished PNG (1080x1350 carousel / 1080x1920 story). Maya returns for download. No auto-post.

## Generation scope (clarified)
Image-to-image redesign of a REAL reference IS the desired generation — it's grounded and coherent.
What stays OFF: fabricating incoherent new scenes/covers NOT tied to a real reference, or replacing
a tutorial's real result with an invented scene (the café-cover mistake). Photoshoot carousels
generating new looks from a selfie are fine — that's the product.

## Acceptance
- Tutorial / photoshoot / story carousels + customer Maya all produce finished slides via
  image-to-image redesign that match Sandra's approved folders. No text-overlay generator, no white
  cards, no composited text layer anywhere (removed). Identity + screenshot meaning preserved.
- "elevate/elevated" absent. Nothing auto-posts. Tests updated; build/invariants green.

## Open confirm before build
This REMOVES the shipped MAYA-FIX-03 text layer + overlay composer + text previews from the LIVE
customer app and replaces all text-on-image with image-to-image redesign. Confirm Sandra is good
removing those from live, and I hand to Codex.
