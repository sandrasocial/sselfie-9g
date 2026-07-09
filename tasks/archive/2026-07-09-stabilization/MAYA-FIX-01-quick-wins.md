# MAYA-FIX-01 - Maya Instruction Contradictions (P0 quick wins)

OWNER: Codex (Sandra approves merge)

Status: spec ready. Source: Maya deep audit 2026-06-15.

Fast, high-impact prompt/logic fixes. No UI rebuild. These resolve the "Maya's responses feel
inconsistent" problem and the "carousels look like stock still-lifes" problem. Ships in ~a day.
(The bigger overlay text-layer rebuild is split out into MAYA-FIX-03.)

---

## 1. Kill the "EXACTLY 3 concepts" contradiction (full shoots must return 6-9)

### Problem
The `emit_concepts` tool description says "Present EXACTLY 3 distinct... Never more or fewer
than 3" (`app/api/app-v3/maya/chat/route.ts` ~line 89-93), but the persona tells Maya to size
the set (1-2 for one photo, **6-9 for a full shoot**, 3 default - `lib/app-v3/maya/persona.ts`
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
- Ask Maya for "a full brand shoot" -> returns 6-9 concept cards.
- Ask for "one photo for my new offer" -> returns 1-2.
- Default ask -> 3. CTA buttons no longer say "3".

---

## 2. Carousels default to FACE-FIRST, and fix the identity-slide cap (2, not 4)

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

## 3. Remove the banned word "flawless" from Maya's own persona example

### Problem
`lib/app-v3/maya/persona.ts:184` few-shot example: "For that flawless editorial look...".
"flawless" is a locked banned word (`core-personality.ts:73`, NO-FAKE doctrine) and is exactly
the trigger for the "people will think I'm fake" fear. Maya mirrors her own examples.

### Change
- Rewrite to drop "flawless", e.g. "For that soft editorial light, face a window with even
  light." Keep it on-voice (warm, short, contractions).

### Verify
- Grep persona for banned words (flawless, perfect, leverage, synergy, transform,
  game-changer, skyrocket, "unlock your potential") -> none in user-facing example copy.

---

## Acceptance (whole spec)
- Full-shoot requests return 6-9 concepts; CTA copy isn't hardcoded to "3".
- Carousels are face-first by default, max 2 identity slides, carousel test green.
- No banned words in Maya's persona examples.
- Existing Maya tests still pass; lint clean.

## Notes
- No money/admin-data-contract surfaces touched here.
- Keep all NO-FAKE language intact; this spec strengthens it.
- The overlay text-rendering rebuild is MAYA-FIX-03 (independent, larger).
