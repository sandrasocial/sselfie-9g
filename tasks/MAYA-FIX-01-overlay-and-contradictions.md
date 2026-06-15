# MAYA-FIX-01 - Overlay Text Layer + Maya Instruction Contradictions (P0)

OWNER: Codex (Sandra approves merge)

Status: spec ready. Source: Maya deep audit 2026-06-15.

These are the highest-impact, customer-visible quality problems found in the Maya audit.
Fix in this order. Each item lists evidence (file:line), the change, and how to verify.

---

## 1. Move text overlays/captions OFF the baked-in image and ONTO a composited layer

### Problem
Overlay and carousel text is currently rendered *by gpt-image-2 inside the photo*. The
composer (`components/app-v3/overlay-composer.tsx`) only collects the headline/subline/style,
then the words are baked into the image via the generation prompt
(`lib/app-v3/prompt-compiler.ts` overlay/carousel prompts: "Render the text verbatim..."
~lines 257-259, 298-300, 341). Image models treat type as pixels, so long strings shrink,
garble, clip, or land outside Instagram safe zones, and the copy can never be edited without
regenerating the whole image. This is the #1 cause of "text overlays look off."

Best-practice (2026): generate the *visual* with AI, composite *text as an editable layer*
with brand fonts, correct contrast, and IG safe zones. Refs: NN/g text-over-images;
layered-text workflow is the industry standard.

### Change
- Generate overlay/carousel slides as **clean images with NO baked-in text** (remove the
  "render the text verbatim / large bold headline" instructions from the overlay + carousel
  text-slide prompts in `lib/app-v3/prompt-compiler.ts`). Keep the photographic composition
  guidance that leaves a calm area for text (e.g. "leave the lower third clean and low-contrast
  for text placement", "do not put detail across the top third").
- Render the headline/subline as a **real HTML/CSS (or canvas) layer on top of the image** in
  the app, using the design system:
  - Display font: Cormorant Garamond / approved editorial serif. Body: approved clean sans.
  - Colors from tokens only (porcelain/obsidian/smoke). No gold `#c9a96e`. No gradient text.
  - Contrast: min 4.5:1 body, 3:1 large text. Use a subtle scrim/floor-fade behind text on
    busy images, not raw text on photo.
  - Instagram safe zones: keep text in the central band; ~310px clear top/bottom on a
    1080x1920 story canvas; for 4:5 feed keep generous margins.
- Make the composited text **swappable in one click** (edit copy/font/position without
  regenerating the image). Export should flatten the layer for download/post.
- The 5 overlay styles (`lib/app-v3/maya/overlay-styles.ts`) and 3 carousel design systems
  (`lib/app-v3/maya/carousel-design-systems.ts`) become **CSS layer presets**, not prompt text.

### Also fix while here
- `components/app-v3/overlay-composer.tsx:196` headline `maxLength={120}` is far too long for a
  cover line. Drop headline to ~40-50, subline ~80, and add a hint ("Keep it short, like a
  magazine cover line"). With a real text layer this becomes a graceful-wrap concern, not a
  garble concern.

### Verify
- Generate an overlay and a 5-slide carousel. Headline/subline render crisp, on-brand serif,
  legible on light and dark photos, inside safe zones, no clipping, no garbled letters.
- Edit the headline copy without regenerating the image. Confirm it updates instantly.
- Download/export produces a flattened image with the text intact.

---

## 2. Kill the "EXACTLY 3 concepts" contradiction (full shoots must return 6-9)

### Problem
The `emit_concepts` tool description says "Present EXACTLY 3 distinct... Never more or fewer
than 3" (`app/api/app-v3/maya/chat/route.ts` ~line 89-93), but the persona tells Maya to size
the set (1-2 for one photo, **6-9 for a full shoot**, 3 default — `lib/app-v3/maya/persona.ts`
~155-158) and the Zod schema agrees (`.min(1).max(9)`, chat/route.ts ~98). Maya gets opposite
orders, so "give me a full shoot" under-delivers 3 photos. This breaks the headline
"one selfie becomes a full brand shoot" promise (`visual-front-door.tsx`).

### Change
- Rewrite the `emit_concepts` tool description to match the persona/schema:
  "Present concept directions sized to her ask: 3 by default, 1-2 for one specific photo,
  6-9 for a full shoot." Delete "Never more or fewer than 3."
- Make user-facing CTA labels count-agnostic: `components/app-v3/maya-concierge.tsx:114-117`
  ("Create my 3 photo directions" etc.) and the opener at ~line 97 ("I'll pull three
  directions") should not hardcode "3". Use "Create my photo directions" / "Pull my directions".

### Verify
- Ask Maya for "a full brand shoot" → returns 6-9 concept cards.
- Ask for "one photo for my new offer" → returns 1-2.
- Default ask → 3. CTA buttons no longer say "3".

---

## 3. Carousels default to FACE-FIRST, and fix the identity-slide cap (2, not 4)

### Problem
Two contradictions push carousels toward faceless stock-looking slides and/or repetitive faces:
- Persona says "default every value and CTA slide to a photographed 'detail' visual"
  (`lib/app-v3/maya/persona.ts:76`) but the design doctrine + locked test say the opposite:
  "PHOTOSHOOT-FIRST DEFAULT: use identity slides by default for hook, value, and CTA"
  (`lib/app-v3/maya/carousel-design-systems.ts:143`; safety-net default ~119-121;
  `tests/app-v3-carousel-design-systems.test.ts:50-64`).
- Identity-slide cap mismatch: doctrine/test say 2 max (comment `prompt-compiler.ts:295`,
  test line 35), but live code caps at 4 (`lib/app-v3/prompt-compiler.ts:455`
  `if (identityCount > 4)`). This likely makes the locked test fail AND produces "same face 4x".

### Change
- Rewrite `persona.ts:76` to match the doctrine: default hook/value/CTA to `identity`
  (the customer's photoshoot); `detail` is opt-in only when an object explains the point better;
  `text-only` for lists or the single big statement.
- Change `lib/app-v3/prompt-compiler.ts:455` from `> 4` to `> 2`.

### Verify
- `npm test -- tests/app-v3-carousel-design-systems.test.ts` passes green.
- Generate a carousel: hook/value/CTA slides show the customer's face by default; at most 2
  identity (face) slides per set; no faceless-still-life-by-default look.

---

## 4. Remove the banned word "flawless" from Maya's own persona example

### Problem
`lib/app-v3/maya/persona.ts:184` few-shot example: "For that flawless editorial look...".
"flawless" is a locked banned word (`core-personality.ts:73`, NO-FAKE doctrine) and is exactly
the trigger for the "people will think I'm fake" fear. Maya mirrors her own examples.

### Change
- Rewrite to drop "flawless", e.g. "For that soft editorial light, face a window with even
  light." Keep it on-voice (warm, short, contractions).

### Verify
- Grep persona for banned words (flawless, perfect, leverage, synergy, transform,
  game-changer, skyrocket, "unlock your potential") → none in user-facing example copy.

---

## Acceptance (whole spec)
- Overlay/carousel text renders as a crisp, editable, on-brand layer (not baked, not garbled).
- Full-shoot requests return 6-9 concepts; CTA copy isn't hardcoded to "3".
- Carousels are face-first by default, max 2 identity slides, carousel test green.
- No banned words in Maya's persona examples.
- Existing Maya tests still pass; lint clean.

## Notes
- No money/admin-data-contract surfaces touched here.
- Keep all NO-FAKE language intact; this spec strengthens it.
