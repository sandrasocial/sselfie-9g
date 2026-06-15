# MAYA-FIX-03 - Composited Overlay/Caption Text Layer (P0, standalone build)

OWNER: Codex (Sandra approves merge)

Status: spec ready. Source: Maya deep audit 2026-06-15. Independent of MAYA-FIX-01/02 - can ship
on its own. This is the single biggest text-overlay quality lever; it is a real UI build, not a
prompt tweak, so it is its own spec.

---

## Problem

Overlay and carousel text is currently rendered *by gpt-image-2 inside the photo*. The composer
(`components/app-v3/overlay-composer.tsx`) only collects the headline/subline/style, then the
words are baked into the image via the generation prompt (`lib/app-v3/prompt-compiler.ts` overlay/
carousel prompts: "Render the text verbatim..." ~lines 257-259, 298-300, 341).

Image models treat type as pixels, so on the live path text:
- garbles / drops / duplicates letters on longer strings,
- shrinks to illegible or runs outside Instagram safe zones,
- can't be edited after generation (changing one word = regenerate the whole image),
- can't reliably hit brand fonts or exact contrast.

This is the #1 reason "text overlays look off."

Best practice (2026, verified in audit research): generate the *visual* with AI, then composite
*text as an editable layer* with brand fonts, correct contrast, and IG safe zones. Refs: NN/g
text-over-images; the layered-text workflow is the industry standard and keeps copy swappable.

---

## Change

### A. Generate clean, text-free images
- Remove the "render the text verbatim / large bold headline across the top third" instructions
  from the overlay + carousel text-slide prompts in `lib/app-v3/prompt-compiler.ts`.
- Keep (and strengthen) the photographic-composition guidance that leaves a calm area for text:
  e.g. "leave the lower third clean and low-contrast for text placement", "do not place busy
  detail across the top third", "keep her face/eyes/hands clear of the text zone".

### B. Build the real text layer (HTML/CSS or canvas) on top of the image
- Render headline/subline as a true overlay layer in the app, using the design system:
  - Display font: Cormorant Garamond / approved editorial serif. Body: approved clean sans.
  - Colors from tokens only (porcelain / obsidian / smoke). No gold `#c9a96e`. No gradient text.
    No gradient buttons.
  - Contrast: min 4.5:1 body, 3:1 large text. Use a subtle scrim / floor-fade behind text on
    busy images (do not drastically darken the photo). Never raw white text on a faded photo.
  - Instagram safe zones: keep text in the central band; ~310px clear top/bottom on a 1080x1920
    story canvas; for 4:5 feed keep generous margins; auto-avoid covering the face.
- The 5 overlay styles (`lib/app-v3/maya/overlay-styles.ts`) and 3 carousel design systems
  (`lib/app-v3/maya/carousel-design-systems.ts`) become **CSS layer presets**, not prompt text.
  Preserve their visual intent (the "world"/mood of each), just move them from prompt strings to
  real styles.

### C. Make text editable + exportable
- Copy/font/position swappable in one click WITHOUT regenerating the image (this is the whole
  point of the rebuild).
- Export/download flattens the layer into the final image for posting (canvas render or
  server-side composite). Confirm exported quality matches on-screen.

### D. Headline length (was a "fix while here" in old FIX-01)
- `components/app-v3/overlay-composer.tsx:196` headline `maxLength={120}` is far too long for a
  cover line. Drop headline to ~40-50, subline ~80. Add a hint ("Keep it short, like a magazine
  cover line"). With a real text layer this becomes graceful wrapping, not garble.

---

## Acceptance
- Overlay + carousel slides generate as clean photos with NO baked-in text.
- Headline/subline render as a crisp, on-brand serif layer, legible on light AND dark photos,
  inside IG safe zones, no clipping, no garbled letters.
- Editing headline copy/font/position updates instantly without regenerating the image.
- Download/export produces a flattened image with text intact, matching on-screen quality.
- Design-system compliant (tokens, serif display, no gold, no gradients). Build + lint clean.

## Notes
- Coordinate with MAYA-FIX-01 #2 (face-first carousels): the clean image behind the text layer
  should still be the customer's photoshoot by default.
- This unblocks future per-style polish since presets are now real CSS, not fragile prompt text.
