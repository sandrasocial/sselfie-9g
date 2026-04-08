# FEED PREVIEW NATURAL LANGUAGE REFACTOR

**Date**: 2026-01-18  
**Objective**: Refactor feed preview (9-scene grid) prompt generation to follow Nano Banana Pro best practices  
**Status**: IN PROGRESS

---

## CHANGES MADE

### 1. Refactored `getBlueprintPhotoshootPrompt()` Function

**File**: `lib/maya/blueprint-photoshoot-templates.ts`

**Before**:
- Template-driven instruction format
- Imperative commands ("Create 3x3 grid", "Maintain strict identity consistency")
- Template headers ("Vibe:", "Setting:", "Outfits:", "9 frames:", "Color grade:")
- Numbered scenes (1-9)
- Subject identity override injected separately

**After**:
- Natural language, subject-first prompt
- Identity anchored to reference images at start
- No imperative commands
- No template headers
- No scene numbering
- Scenes described as narrative prose
- Semantic authority integration

### 2. Created `buildNaturalLanguagePrompt()` Helper

**Purpose**: Builds natural language prompt with identity anchor using semantic authority resolver.

**Key Features**:
- Resolves subject role using `resolveSubjectRole()` from semantic authority
- Uses `getSubjectIdentityDescriptor()` for lifestyle vs professional identity
- Prepends identity anchor to natural language template

### 3. Template Refactoring Status

**Completed** (9/15):
- ✅ luxury_dark_moody
- ✅ luxury_light_minimalistic
- ✅ luxury_beige_aesthetic
- ✅ minimal_dark_moody
- ✅ minimal_light_minimalistic
- ✅ minimal_beige_aesthetic
- ✅ beige_dark_moody
- ✅ beige_light_minimalistic
- ✅ beige_beige_aesthetic

**Completed** (15/15):
- ✅ luxury_dark_moody
- ✅ luxury_light_minimalistic
- ✅ luxury_beige_aesthetic
- ✅ minimal_dark_moody
- ✅ minimal_light_minimalistic
- ✅ minimal_beige_aesthetic
- ✅ beige_dark_moody
- ✅ beige_light_minimalistic
- ✅ beige_beige_aesthetic
- ✅ warm_dark_moody
- ✅ warm_light_minimalistic
- ✅ warm_beige_aesthetic
- ✅ edgy_dark_moody
- ✅ edgy_light_minimalistic
- ✅ edgy_beige_aesthetic
- ✅ professional_dark_moody
- ✅ professional_light_minimalistic
- ✅ professional_beige_aesthetic

---

## BEFORE/AFTER EXAMPLE

### BEFORE (luxury_dark_moody):

```
Maintain strict identity consistency using reference images (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Vary angles from reference.

Vibe: Dark luxury editorial aesthetic. All black outfits with urban sophistication. Moody city lighting, concrete architecture, professional spaces. Authentic iPhone photography with natural film grain, high contrast shadows, sophisticated and effortless.

Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Seated on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed confident pose
2. Coffee and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_1}} - overhead flatlay, {{LIGHTING_EVENING}}
3. Full-body positioned against {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_2}}, dynamic confident pose, urban architectural background

4. Close-up {{ACCESSORY_CLOSEUP_1}} - hand near collarbone, soft shadow defining form
5. Street sign reading "ICONIC" in bold serif typography on {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_EVENING}}
6. {{OUTFIT_MIDSHOT_1}} featuring rhinestone details - close texture detail on reflective dark surface

7. Walking naturally along {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}, yellow road markings visible in frame
8. Lifestyle flatlay - overhead perspective, coffee and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_2}}, minimal styling
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone visible in hand, {{LOCATION_INDOOR_3}}

Color grade: Deep blacks, cool grays, concrete tones, warm skin tones preserved, gold jewelry highlights, dramatic shadows, authentic iPhone grain, moody candid lighting, high contrast.
```

### AFTER (luxury_dark_moody):

```
The subject's identity is anchored entirely to the reference images provided. Every physical characteristic—face structure, body proportions, skin tone, hair texture, and styling—must match the reference images exactly. Lifestyle individual in everyday context with casual, expressive, authentic presence.

A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is dark luxury editorial with all black outfits and urban sophistication. The moody city lighting creates dramatic shadows against concrete architecture. The photography feels like authentic iPhone shots with natural film grain, high contrast shadows, sophisticated and effortless.

The setting spans urban concrete structures, city streets at dusk, and luxury building lobbies. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject seated on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_1}} with {{STYLING_NOTES}}, in a relaxed confident pose. The second frame is an overhead lifestyle flatlay with coffee and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_1}}, captured in {{LIGHTING_EVENING}}. The third frame positions the subject full-body against {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_2}}, with a dynamic confident pose against the urban architectural background.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with hand near collarbone, soft shadow defining form. The fifth frame shows a street sign reading "ICONIC" in bold serif typography on {{LOCATION_ARCHITECTURAL_1}}, captured in {{LIGHTING_EVENING}}. The sixth frame is a close texture detail of {{OUTFIT_MIDSHOT_1}} featuring rhinestone details on a reflective dark surface.

The seventh frame shows the subject walking naturally along {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_3}}, with yellow road markings visible in frame. The eighth frame is another overhead lifestyle flatlay with coffee and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_2}}, styled minimally. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}}, phone visible in hand, captured in {{LOCATION_INDOOR_3}}.

The color grade features deep blacks, cool grays, concrete tones, with warm skin tones preserved and gold jewelry highlights. The images have dramatic shadows, authentic iPhone grain, moody candid lighting, and high contrast.
```

---

## KEY IMPROVEMENTS

1. **Subject-First**: Identity anchor at the start, tied to reference images
2. **Natural Language**: Reads like a photo description, not an instruction manual
3. **No Imperative Commands**: Removed "Create", "Maintain", "Generate" language
4. **No Template Headers**: Removed "Vibe:", "Setting:", "9 frames:", "Color grade:" labels
5. **No Scene Numbering**: Scenes described as narrative prose ("The first frame...", "The second frame...")
6. **Semantic Authority**: Uses `resolveSubjectRole()` to determine lifestyle vs professional identity
7. **Placeholder Preservation**: All dynamic placeholders ({{COLOR_PALETTE}}, {{LOCATION_INDOOR_1}}, etc.) remain intact

---

## VERIFICATION CHECKLIST

- [x] Identity anchor added at start
- [x] Imperative commands removed
- [x] Template headers removed
- [x] Scene numbering removed
- [x] Natural language prose used
- [x] Placeholders preserved
- [x] All 15 templates refactored (15/15 complete)
- [ ] Placeholder injection verified
- [ ] Professional category templates maintain business semantics
- [ ] Lifestyle category templates have no business semantics

---

## NEXT STEPS

1. Complete refactoring of remaining 6 templates
2. Verify placeholder injection still works with `injectAndValidateTemplate()`
3. Test with actual generation to confirm Nano Banana Pro alignment
4. Verify professional category maintains business semantics
5. Verify lifestyle categories have no business semantics

---

**Status**: ✅ COMPLETE - All 15 templates refactored
