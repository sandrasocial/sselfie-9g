# Position 5 Sign/Text Fix — Implementation Summary

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** Position 5 showing person holding sign instead of sign/text close-up

---

## 🎯 PROBLEM

**Before:**
```
Position 5 (Middle-Center): athletic outfit, sitting in home, full-body angle. 
Holding a small sign with text: "Strong & Well".
```

❌ Person holding a small sign (wrong)  
❌ Person is the focus  
❌ Full-body portrait framing

**After:**
```
Position 5 (Middle-Center): Close-up of a vintage street sign displaying 
"Strong & Well" in bold typography, urban background softly blurred, 
natural daylight, modern editorial lifestyle photography.
```

✅ Sign/text is the focus  
✅ Close-up framing  
✅ Environmental context  
✅ No person holding it

---

## ✅ CHANGES MADE

### 1. `lib/feed-planner/scene-resolver.ts`

**Line 928: Changed position 5 framing from `full_body` to `close_up`**

```typescript
// Before:
5: 'full_body',    // Position 5: Portrait (center anchor - focal point)

// After:
5: 'close_up',     // Position 5: Sign/Text close-up (center anchor - brand statement)
```

**Comment updated:**
```typescript
// Before:
// This ensures diverse content types: portraits + flatlays + close-ups + texture shots

// After:
// This ensures diverse content types: portraits + flatlays + close-ups + texture shots + sign/text
```

---

### 2. `lib/feed-planner/prompt-shaper.ts`

#### **A. Added Two New Functions for Sign/Text Generation**

**`buildSignTextBlockPreview()` - For Preview Mode (9 scenes in 1 image)**
```typescript
function buildSignTextBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const narrative = scene.narrative || 'Brand statement'
  const aesthetic = getDetailedAestheticDescription(scene.visualAesthetic, scene.category)
  const location = scene.location.description || 'urban street'
  
  return `Position ${position} (${positionLabel}): Close-up of a vintage street sign 
    or wall-mounted sign displaying "${narrative}" in bold typography, ${location} 
    background softly blurred, natural daylight, modern editorial lifestyle 
    photography, ${aesthetic}.`
}
```

**`buildSignTextBlock()` - For Single Scene Mode (9 individual images)**
```typescript
function buildSignTextBlock(scene: FeedPlannerScene, position: number, _positionLabel: string): string {
  const narrative = scene.narrative || 'Brand statement'
  const location = scene.location.description || 'urban street corner'
  const lightingDesc = scene.lighting?.description || 'natural daylight'
  const lighting = expandLightingDescription(lightingDesc, position)
  const aesthetic = getDetailedAestheticDescription(scene.visualAesthetic, scene.category)
  
  // Create natural prose for sign/text scene
  const openings = [
    'A close-up photograph of a vintage street sign reading',
    'An eye-level shot of a wall-mounted sign displaying',
    'A detailed close-up of an elegant sign showcasing',
    'A lifestyle photograph of a street sign featuring'
  ]
  const opening = openings[position % openings.length]
  
  return `${opening} "${narrative}" in bold, modern typography. The sign is 
    positioned at eye level in ${location}, creating an authentic lifestyle aesthetic. 
    ${lighting}. The background is softly blurred with natural bokeh, keeping focus on 
    the crisp lettering of the sign. ${aesthetic} across the frame. Shot on iPhone 15 
    Pro with shallow depth of field, the sign's text remains sharp while the environment 
    provides context without distraction.`
}
```

#### **B. Updated Routing in `buildSceneExecutionBlock()` (Preview Mode)**

**Added position 5 check at the top (highest priority):**
```typescript
// 🔴 POSITION 5: SIGN/TEXT CLOSE-UP (ALWAYS - HIGHEST PRIORITY)
// Position 5 is the CENTER ANCHOR and should ALWAYS be a sign/text close-up with brand statement
if (position === 5) {
  console.log(`[SCENE EXECUTION] Position 5: Routing to SIGN/TEXT block`)
  return buildSignTextBlockPreview(scene, position, positionLabel)
}
```

#### **C. Updated Routing in `buildSingleScenePrompt()` (Single Scene Mode)**

**Added position 5 check at the top (before identity anchor):**
```typescript
// 🔴 POSITION 5: SIGN/TEXT CLOSE-UP (SPECIAL HANDLING)
// Position 5 is the CENTER ANCHOR and should ALWAYS be a sign/text close-up with brand statement
// This is a special content type that does NOT include the person or identity anchor
if (scene.position === 5) {
  console.log(`[SINGLE SCENE] Position 5: Routing to SIGN/TEXT builder (no person, no identity anchor)`)
  return buildSignTextBlock(scene, scene.position, getPositionLabel(scene.position))
}
```

#### **D. Removed Old "Holding Sign" Logic**

**Deleted lines 663-667 in `buildPortraitBlockPreview()`:**
```typescript
// REMOVED:
// if (position === 5) {
//   const narrative = scene.narrative || 'Your brand statement here'
//   return `Position ${position} (${positionLabel}): ${outfit} outfit, ${pose.split(' ')[0]} 
//     in ${location}, ${framing} angle, ${lighting.replace(/_/g, ' ')}. 
//     Holding a small sign with text: "${narrative}".`
// }
```

---

## 📊 IMPACT ON FEED LAYOUT

### Content Type Distribution

**Before:**
- 5 Portraits (positions 1, 3, 5, 7, 9)
- 2 Object Flatlays (positions 2, 8)
- 1 Detail Close-Up (position 4)
- 1 Texture Shot (position 6)

**After:**
- 4 Portraits (positions 1, 3, 7, 9)
- **1 Sign/Text Close-Up (position 5)** ← NEW!
- 2 Object Flatlays (positions 2, 8)
- 1 Detail Close-Up (position 4)
- 1 Texture Shot (position 6)

**Result:** More diverse feed layout! ✅

---

## 🧪 TESTING CHECKLIST

### Preview Mode (9 scenes in 1 image)
- [ ] Position 5 shows sign/text close-up (no person holding it)
- [ ] Brand statement appears on sign (e.g., "Strong & Well")
- [ ] Sign matches user's aesthetic (e.g., vintage for bohemian, elegant for luxury)
- [ ] Background is softly blurred
- [ ] Other 8 positions remain unchanged

### Single Scene Mode (9 individual images)
- [ ] Position 5 generates standalone sign/text image
- [ ] NO identity anchor or person reference
- [ ] Brand statement is clear and legible
- [ ] Lighting matches user's aesthetic
- [ ] Sign style matches fashion category

### Brand Statement Mappings
- [ ] Athletic style → "Strong & Well"
- [ ] Luxury style → "Live Luxuriously"
- [ ] Bohemian style → "Free Spirit"
- [ ] Minimal style → "Simply Elegant"
- [ ] Beige/Warm style → "Warmth & Grace"

---

## 🔍 VALIDATION

### Prompt Examples

**Athletic (Preview Mode):**
```
Position 5 (Middle-Center): Close-up of a vintage street sign displaying 
"Strong & Well" in bold typography, gym background softly blurred, natural 
daylight, modern editorial lifestyle photography, extremely bright high-key 
photography with soft diffused light.
```

**Luxury (Single Scene Mode):**
```
An eye-level shot of a wall-mounted sign displaying "Live Luxuriously" in bold, 
modern typography. The sign is positioned at eye level in upscale urban street, 
creating an authentic lifestyle aesthetic. Abundant natural window light with 
soft diffused quality. The background is softly blurred with natural bokeh, 
keeping focus on the crisp lettering of the sign. Cool desaturated tones with 
luxury aesthetic across the frame. Shot on iPhone 15 Pro with shallow depth of 
field, the sign's text remains sharp while the environment provides context 
without distraction.
```

---

## 📝 KEY DESIGN DECISIONS

1. **Position 5 is ALWAYS sign/text** (highest priority routing)
2. **NO person visible** (environmental context only)
3. **NO identity anchor** (this is not a portrait)
4. **Brand statement from `scene.narrative`** (already built in scene-resolver)
5. **Natural lifestyle aesthetic** (street signs, wall signs, not printed cards)
6. **Blurred background** (keeps focus on text)
7. **Aesthetic-aware** (sign style matches user's selected feed style)

---

## 🚀 DEPLOYMENT NOTES

**Files Modified:**
- `lib/feed-planner/scene-resolver.ts` (1 line changed)
- `lib/feed-planner/prompt-shaper.ts` (2 new functions, 2 routing updates, 1 removal)

**Backward Compatibility:**
- ✅ Existing feeds unaffected (only new generations)
- ✅ No database changes required
- ✅ No API changes required

**Linter Status:**
- ⚠️ 11 console.log warnings (diagnostic logging - acceptable)
- ✅ 0 TypeScript errors

---

## 📚 RELATED DOCUMENTS

- Analysis: `POSITION_5_SIGN_FIX_ANALYSIS.md`
- Scene resolver: `lib/feed-planner/scene-resolver.ts`
- Prompt builder: `lib/feed-planner/prompt-shaper.ts`

---

**Status:** ✅ COMPLETE — Ready for testing  
**Next Steps:** Generate preview feed and single scenes to validate position 5
