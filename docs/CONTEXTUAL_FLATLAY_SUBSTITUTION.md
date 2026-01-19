# Contextual Flatlay Substitution

**Date:** 2026-01-18  
**Status:** ✅ COMPLETE

---

## Problem Statement

**Previous Behavior (BROKEN):**
- Flatlays were BLOCKED for athletic contexts
- This broke 9-scene preview logic (reduced to 6-7 scenes)
- Reduced lifestyle richness
- Created empty/dead scenes

**Design Intent (Authoritative):**
- Flatlays are ALLOWED in both single and preview modes
- Flatlays must be CONTEXTUAL
- Office/work flatlays (laptop, coffee, desk) are WRONG for athletic/wellness
- Athletic/wellness flatlays should be lifestyle detail scenes (water bottle, gym gear)

**Solution:**
- STOP blocking flatlays
- START substituting flatlay CONTENT based on fashion + category

---

## Implementation

### Step 1: Removed Flatlay Blocking ✅

**Before:**
```typescript
'athletic': {
  allowedFrameTypes: ['full_body', 'midshot', 'closeup'], // NO flatlays ❌
  blockedObjects: ['laptop', 'coffee', ...],
}
```

**After:**
```typescript
'athletic': {
  allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'], // Flatlays NOW ALLOWED ✅
  officeObjects: ['laptop', 'coffee', ...], // Objects to AVOID, not BLOCK
}
```

**Changes:**
- All 13 fashion contexts now include `'flatlay'` in `allowedFrameTypes`
- Renamed `blockedObjects` → `officeObjects` (semantic clarity)
- Removed frame type blocking logic completely

---

### Step 2: Flatlay Intent Resolver ✅

**New Function:** `resolveFlatlayContent()`

**Purpose:** Decides WHAT the flatlay contains based on fashion context

**Signature:**
```typescript
function resolveFlatlayContent(params: {
  resolvedFashionStyle: string
  category?: string | null
  mood?: string | null
}): string
```

**Behavior:**
- Looks up appropriate content library for fashion style
- Selects 2-3 items from library (deterministic, varied)
- Builds natural language flatlay description
- Adds category aesthetic modifier

**Example Output:**
```typescript
resolveFlatlayContent({
  resolvedFashionStyle: 'athletic',
  category: 'minimal',
  mood: 'minimal'
})
// Returns: "Overhead flatlay showing water bottle, sneakers placed neatly, 
// and smartwatch or fitness tracker arranged naturally on a clean surface 
// with minimalist composition"
```

---

### Step 3: Flatlay Content Libraries ✅

**Structure:**
```typescript
const FLATLAY_CONTENT_LIBRARIES: Record<string, string[]>
```

**Athletic & Wellness Flatlays:**
- water bottle
- green juice or smoothie
- gym gloves
- yoga mat edge detail
- resistance bands
- sneakers placed neatly
- gym outfit folded on neutral surface
- smartwatch or fitness tracker
- white towel and water bottle
- wireless earbuds and phone
- gym bag partially open

**Elevated Athleisure Flatlays (Luxury + Athletic):**
- neutral-toned gym wear on linen surface
- ceramic water bottle on marble
- minimalist gym accessories on stone surface
- leather gym bag detail
- monochrome designer sneakers
- luxury activewear folded on bed
- smartwatch on wooden surface
- high-end gym essentials on neutral fabric
- designer water bottle and towel

**Business & Professional Flatlays (Office OK):**
- laptop and coffee on desk
- planner and pen on workspace
- business essentials arranged
- notebook and phone
- professional accessories

**Bohemian Flatlays:**
- natural items on textured fabric
- crystals and plants
- vintage accessories on woven surface
- natural jewelry and stones
- bohemian accessories on cloth

**Total:** 13 fashion contexts with unique flatlay objects

---

### Step 4: Substitution Logic ✅

**Replaced:** `sanitizeFrameDescription()` → `processFrameDescription()`

**New Behavior:**

```typescript
function processFrameDescription(
  description: string,
  officeObjects: string[],
  resolvedFashionStyle: string,
  category?: string | null,
  mood?: string | null
): string
```

**Logic Flow:**

1. **Detect if frame is flatlay:**
   - Contains "flatlay", "overhead", "arranged on", "birds eye"
   - OR contains "desk" + "laptop"

2. **Check for office objects:**
   - If flatlay + contains office objects → SUBSTITUTE entire flatlay
   - If non-flatlay + contains office objects → REMOVE objects only

3. **Substitution:**
   - Call `resolveFlatlayContent()` with fashion context
   - Replace entire flatlay description with lifestyle-appropriate content
   - Log substitution action

4. **Sanitization (fallback):**
   - For non-flatlays, just remove office objects
   - Clean up orphaned text

**Example:**

**Input:**
```
"Overhead flatlay of laptop, coffee mug, and notebook arranged on a desk"
```

**Context:** `resolvedFashionStyle = 'athletic'`

**Output:**
```
"Overhead flatlay showing water bottle, gym gloves, and sneakers placed 
neatly arranged naturally on a clean surface"
```

---

### Step 5: Applied to Both Modes ✅

**Single Mode (mode="single"):**
- Flatlays allowed if `frame.type === flatlay`
- Content resolved via `resolveFlatlayContent()`
- Athletic context → wellness flatlay

**Preview Mode (mode="preview_multi"):**
- Flatlays encouraged for variety (9-scene grid)
- Each flatlay gets contextual objects
- Athletic context → all 9 scenes preserved with wellness flatlays

**Both modes use:**
- Same `processFrameDescription()` function
- Same flatlay content libraries
- Same substitution logic

---

### Step 6: Logging Added ✅

**Flatlay Substitution Logs:**

```
[FLATLAY-RESOLVER] Context=athletic → Substituted office flatlay
[FLATLAY-RESOLVER] Detected: "laptop" → Replaced with lifestyle detail
[FLATLAY-RESOLVER] New flatlay: Overhead flatlay showing water bottle, gym gloves, and sneakers placed neatly...
```

**Object Sanitization Logs:**

```
[NANO-BANANA-ADAPTER] 🧹 Removed "laptop" from non-flatlay scene for athletic
```

**Frame Type Logs:**

```
[NANO-BANANA-ADAPTER] Frame type: flatlay → ALLOWED (content will be contextual)
```

---

## Before vs. After Examples

### Example 1: Athletic Preview Feed

**Before (BLOCKED):**
```
Scene 1: Full-body portrait in gym wear
Scene 2: Mid-shot in modern gym
Scene 3: Close-up of face
[BLOCKED] Scene 4: Flatlay (would have laptop)
Scene 5: Walking through architectural space
[BLOCKED] Scene 6: Flatlay (would have coffee)
Scene 7: Leaning against wall
Scene 8: Sitting pose
[BLOCKED] Scene 9: Flatlay (would have desk)

Result: Only 6 scenes generated ❌
```

**After (SUBSTITUTED):**
```
Scene 1: Full-body portrait in gym wear
Scene 2: Mid-shot in modern gym
Scene 3: Close-up of face
Scene 4: Overhead flatlay showing water bottle and gym gloves arranged naturally ✅
Scene 5: Walking through architectural space
Scene 6: Overhead flatlay showing sneakers placed neatly and smartwatch ✅
Scene 7: Leaning against wall
Scene 8: Sitting pose
Scene 9: Overhead flatlay showing resistance bands and towel ✅

Result: All 9 scenes generated ✅
```

---

### Example 2: Single Athletic Flatlay

**Before (BLOCKED):**
```
Input: "Overhead flatlay of laptop, coffee, and notebook on desk"
Context: athletic
Output: [FRAME BLOCKED] → fallback prompt or skip
```

**After (SUBSTITUTED):**
```
Input: "Overhead flatlay of laptop, coffee, and notebook on desk"
Context: athletic
Output: "Overhead flatlay showing water bottle, gym gloves, and sneakers 
         placed neatly arranged naturally on a clean surface"
```

**Log:**
```
[FLATLAY-RESOLVER] Context=athletic → Substituted office flatlay
[FLATLAY-RESOLVER] Detected: "laptop" → Replaced with lifestyle detail
```

---

### Example 3: Business Flatlay (Unchanged)

**Before:**
```
Input: "Overhead flatlay of laptop, coffee, and notebook on desk"
Context: business
Output: "Overhead flatlay of laptop, coffee, and notebook on desk"
```

**After (Same):**
```
Input: "Overhead flatlay of laptop, coffee, and notebook on desk"
Context: business
Output: "Overhead flatlay of laptop, coffee, and notebook on desk"
```

**Reason:** Business contexts ALLOW office objects, no substitution needed

---

### Example 4: Elevated Athleisure Preview

**Preview Prompt (After Substitution):**

```
A realistic photo grid showing the person from the reference images in 9 different scenes. 

Scene 1: the subject is standing confidently wearing tailored black athleisure in a luxury studio. 

Scene 2: the subject is in a mid-shot portrait with arms crossed showing athletic confidence. 

Scene 3: close-up of the subject's face with natural expression and gym setting background. 

Scene 4: overhead flatlay showing neutral-toned gym wear on linen surface, ceramic water bottle on marble, and minimalist gym accessories on stone surface arranged naturally on a clean surface with luxurious styling. 

Scene 5: the subject is walking through a modern architectural space with floor-to-ceiling windows. 

Scene 6: the subject is leaning against a concrete wall in urban gym attire. 

Scene 7: the subject is in a relaxed seated pose on minimalist furniture. 

Scene 8: overhead flatlay showing leather gym bag detail, monochrome designer sneakers, and smartwatch on wooden surface arranged naturally on a clean surface with luxurious styling. 

Scene 9: the subject is looking directly at camera with confident gaze in luxury athletic wear. 

All scenes feature dramatic moody lighting with rich shadows. Overall luxurious high-end aesthetic. All photos shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Word Count:** ~215 words ✅ (target: 180-240)

**Scene Count:** 9 scenes ✅ (all preserved)

**Flatlays:** 2 wellness lifestyle flatlays ✅ (no office objects)

---

## Blocked vs. Substituted Objects

### Athletic Contexts

**Office Objects (AVOID in flatlays):**
- laptop
- coffee
- desk
- workspace
- office
- computer
- notebook (business)
- journal (business)
- keyboard
- mouse

**Wellness Objects (USE in flatlays):**
- water bottle ✅
- green juice ✅
- gym gloves ✅
- yoga mat ✅
- resistance bands ✅
- sneakers ✅
- gym outfit ✅
- smartwatch ✅
- towel ✅
- earbuds ✅
- phone ✅ (fitness apps, not work)

---

## Files Modified

**`lib/feed-planner/nano-banana-adapter.ts`**

1. **Updated FASHION_CONTEXT_RULES (lines 63-140):**
   - Added `'flatlay'` to all `allowedFrameTypes`
   - Renamed `blockedObjects` → `officeObjects`

2. **Added FLATLAY_CONTENT_LIBRARIES (lines 145-260):**
   - 13 fashion contexts with unique flatlay objects
   - Athletic, wellness, business, lifestyle, bohemian variants

3. **Added resolveFlatlayContent() (lines 265-320):**
   - Takes fashion style, category, mood
   - Returns contextual flatlay description
   - Selects 2-3 items from content library

4. **Replaced sanitizeFrameDescription() with processFrameDescription() (lines 715-785):**
   - Detects flatlays
   - Substitutes office flatlays for athletic contexts
   - Sanitizes objects for non-flatlays

5. **Removed frame type blocking logic (line 457-468):**
   - Deleted conditional that blocked flatlays
   - All frame types now allowed

6. **Updated call sites (lines 482-487, 576-582):**
   - Both single and preview modes use `processFrameDescription()`
   - Pass category and mood for contextual resolution

---

## Testing Checklist

### Single Mode Tests

- [ ] Athletic + flatlay scene → generates wellness flatlay (NOT office)
- [ ] Athletic + flatlay → contains at least one wellness object
- [ ] Athletic + flatlay → does NOT contain laptop/coffee/desk
- [ ] Business + flatlay → CAN contain laptop/coffee (unchanged)
- [ ] Athletic + non-flatlay → laptop/coffee removed (sanitized)

### Preview Mode Tests

- [ ] Athletic preview → all 9 scenes generated (not blocked)
- [ ] Athletic preview → flatlays use wellness objects
- [ ] Athletic preview → NO laptop/coffee in any scene
- [ ] Athletic preview → at least 2 flatlays present
- [ ] Business preview → office flatlays allowed
- [ ] Bohemian preview → natural/artistic flatlays

### Logging Tests

- [ ] `[FLATLAY-RESOLVER]` logs appear for substitutions
- [ ] `Context=athletic → Substituted` logged
- [ ] `Detected: "laptop" → Replaced` logged
- [ ] `New flatlay: ...` shows substituted content

---

## Rules Followed

- ✅ Scene count NOT reduced
- ✅ Flatlays NOT blocked
- ✅ Business defaults NOT hardcoded
- ✅ Template count NOT touched
- ✅ No new prompt builders introduced
- ✅ This is substitution, NOT restriction

---

## Expected Impact

### Before (Blocking)

- ❌ Athletic previews: 6-7 scenes (3 flatlays blocked)
- ❌ Reduced lifestyle richness
- ❌ Empty/dead scenes
- ❌ Preview grids incomplete
- ❌ Athletic = NO variety (only portraits)

### After (Substitution)

- ✅ Athletic previews: 9 scenes (all flatlays substituted)
- ✅ Full lifestyle richness
- ✅ All scenes populated
- ✅ Preview grids complete
- ✅ Athletic = FULL variety (portraits + wellness flatlays)

---

## Troubleshooting

### Issue: Athletic preview still shows laptop

**Check:**
1. Is `processFrameDescription()` being called? (Check logs)
2. Is flatlay detected? (Check "Overhead" or "arranged on" in description)
3. Is office object detected? (Check "laptop" in description)

**Fix:**
- Verify `resolveFlatlayContent()` is called for flatlays with office objects
- Check logs for `[FLATLAY-RESOLVER]` substitution messages

### Issue: Business flatlay is substituted (wrong)

**Check:**
1. What is `resolvedFashionStyle`? (Should be "business" or "professional")
2. Are office objects in `officeObjects` list for business? (Should be gym items, not laptop)

**Fix:**
- Verify `FASHION_CONTEXT_RULES['business'].officeObjects` only contains gym items
- Business contexts should NOT substitute office flatlays

### Issue: Preview scene count still reduced

**Check:**
1. Is frame type blocking removed? (Check line ~457-468)
2. Are flatlays in `allowedFrameTypes`? (Check FASHION_CONTEXT_RULES)
3. Is preview mode using `processFrameDescription()`? (Check line ~576)

**Fix:**
- Verify all fashion contexts include `'flatlay'` in `allowedFrameTypes`
- Verify frame type blocking logic is deleted (not just conditional)

---

## Related Documentation

- **Coherence Enforcement Fix:** `docs/COHERENCE_ENFORCEMENT_FIX.md`
- **Preview 9-Scene Restoration:** `docs/PREVIEW_9SCENE_RESTORATION.md`
- **Style Coherence Resolver:** `docs/STYLE_COHERENCE_RESOLVER.md`

---

**Status:** ✅ **COMPLETE AND READY FOR TESTING**

Flatlays are now contextual lifestyle details, not blocked. Athletic contexts get wellness flatlays. Office contexts keep office flatlays. Scene count is preserved. 9-scene previews stay rich and varied.

**Linter:** ✅ NO ERRORS
