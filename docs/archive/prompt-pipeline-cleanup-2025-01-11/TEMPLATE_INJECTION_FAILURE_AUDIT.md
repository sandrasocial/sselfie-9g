# Template Injection Failure Audit - Single Scene Generation

**Date:** 2025-01-XX  
**Issue:** Template injection not working for single scene generation  
**User Selection:** Beige feed style, luxury vibe, athletic fashion style  
**Result:** Prompt contains unreplaced placeholders ("Outfits: 9 frames:, wearing 9 frames:,")

---

## Problem Analysis

### User's Generated Prompt (Broken)
```
Generate an image of Influencer/pinterest style of a woman maintaining exactly the same physical characteristics...
Standing casually against weathered brick wall with arms crossed...
in Brooklyn industrial areas, neutral urban spaces, vintage warehouses, concrete and metal environments
Outfits: 9 frames:, wearing 9 frames:,
natural light, natural light, natural window,
Neutral tans, concrete grays, warm beiges, natural urban shadows, subtle grain, Brooklyn aesthetic, industrial cool, street sophistication.
Assembly: professionaleditorial grain, photorealistic, iphone photography style
```

### Issues Identified

1. **"Outfits: 9 frames:, wearing 9 frames:,"** - This suggests:
   - Template had: `Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}`
   - Placeholders were NOT replaced
   - Something corrupted the replacement (became "9 frames:")

2. **Frame description missing outfit details** - Should have:
   - `{{OUTFIT_FULLBODY_1}}` replaced with actual outfit
   - `{{LOCATION_ARCHITECTURAL_1}}` replaced with actual location
   - But these are missing from the prompt

3. **"Outfits:" section in final prompt** - `buildSingleImagePrompt` should NOT include "Outfits:" section, only:
   - Base identity
   - Vibe
   - Setting
   - Frame description (cleaned)
   - Color grade

---

## Root Cause Investigation

### Hypothesis 1: Injection Never Ran

**Check:** Is injection being called for paid users?

**Evidence Needed:**
- Check logs for "Injection successful" message
- Verify `injectDynamicContentWithRotation` is called
- Verify `buildSingleImagePrompt` receives injected template

### Hypothesis 2: Injection Failed Silently

**Check:** Did injection throw error but code continued?

**Evidence Needed:**
- Check if validation (`extractPlaceholderKeys`) passed
- Check if error was caught and ignored
- Check if fallback path was taken

### Hypothesis 3: buildSingleImagePrompt Corrupted Injected Content

**Check:** Does `buildSingleImagePrompt` preserve injected placeholders?

**Evidence Needed:**
- Verify `parseTemplateFrames` correctly extracts frames from injected template
- Verify frame descriptions contain injected content (not placeholders)
- Check if `cleanFrameDescription` removes injected content

### Hypothesis 4: Wrong Template Selected

**Check:** Is correct template being selected?

**User Selection:**
- Beige feed style → mood = "beige" → moodMapped = "beige_aesthetic"
- Luxury vibe → category = "luxury"
- Expected template: `luxury_beige_aesthetic`

**Evidence Needed:**
- Verify template key: `${category}_${moodMapped}` = `luxury_beige_aesthetic`
- Verify template exists in `BLUEPRINT_PHOTOSHOOT_TEMPLATES`
- Check if wrong template was selected

### Hypothesis 5: Vibe Library Missing Content

**Check:** Does vibe library have content for `luxury_beige_aesthetic` + `athletic`?

**Evidence Needed:**
- Verify vibe library has `luxury_beige_aesthetic` entry
- Verify `athletic` fashion style exists in vibe library
- Check if `getOutfitsByStyle` returns empty array

---

## Code Flow to Verify

### Expected Flow (Paid User, Single Scene)

1. **Template Selection** (Line 948)
   ```typescript
   const fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
   // Expected: luxury_beige_aesthetic template
   ```

2. **Template Injection** (Lines 985-1001)
   ```typescript
   const injectedTemplate = await injectDynamicContentWithRotation(
     fullTemplate, vibeKey, fashionStyle, user.id.toString()
   )
   // Expected: All {{PLACEHOLDERS}} replaced with actual content
   ```

3. **Validation** (Lines 994-999)
   ```typescript
   const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
   if (remainingPlaceholders.length > 0) {
     throw new Error(`Template injection incomplete`)
   }
   // Expected: No placeholders remain
   ```

4. **Scene Extraction** (Line 1005)
   ```typescript
   templateReferencePrompt = buildSingleImagePrompt(injectedTemplate, post.position)
   // Expected: Extracted frame 1 with injected content
   ```

5. **Pass to Maya** (Line 1051)
   ```typescript
   referencePrompt: templateReferencePrompt
   // Expected: Injected single scene passed to Maya
   ```

6. **Maya Enhancement** (Line 1062)
   ```typescript
   finalPrompt = mayaData.prompt || mayaData.enhancedPrompt
   // Expected: Maya enhances injected scene
   ```

7. **Clean Placeholders** (Line 1212)
   ```typescript
   const cleanedPrompt = cleanBlueprintPrompt(finalPrompt)
   // Expected: Removes any remaining {{PLACEHOLDERS}}
   ```

---

## Debugging Steps Required

1. **Check Logs:**
   - Look for "Injection successful" message
   - Look for "Extracted scene" message
   - Look for any injection errors

2. **Verify Template Selection:**
   - Check what `category` and `mood` values were used
   - Check what template key was generated
   - Verify template exists

3. **Verify Injection:**
   - Check if `injectDynamicContentWithRotation` was called
   - Check if it returned injected template
   - Check if validation passed

4. **Verify Scene Extraction:**
   - Check what `buildSingleImagePrompt` received (injected template?)
   - Check what it returned (extracted scene?)
   - Verify frame description contains injected content

5. **Verify Maya Input:**
   - Check what `templateReferencePrompt` value was
   - Check if it was passed to Maya
   - Check what Maya received

---

## Most Likely Causes

### 🔴 Cause 1: Template Key Mismatch

**Issue:** Wrong template selected
- User selected: Beige feed style + Luxury vibe
- Code might be using: Professional category (default) + Beige mood
- Result: `professional_beige_aesthetic` template (wrong vibe)

**Fix:** Verify category extraction from visual_aesthetic

### 🔴 Cause 2: Injection Failed But Error Caught

**Issue:** Injection threw error, but catch block continued
- Error in `injectDynamicContentWithRotation`
- Catch block falls back to raw template
- Raw template passed to `buildSingleImagePrompt`
- Result: Placeholders in final prompt

**Fix:** Check error handling, don't continue if injection fails

### 🔴 Cause 3: Vibe Library Missing Athletic Style

**Issue:** `athletic` fashion style not in vibe library
- `getOutfitsByStyle('luxury_beige_aesthetic', 'athletic')` returns []
- Injection fails or uses defaults
- Result: Empty/incomplete injection

**Fix:** Verify athletic style exists in vibe library

### 🔴 Cause 4: buildSingleImagePrompt Receives Raw Template

**Issue:** Injection result not passed to `buildSingleImagePrompt`
- `injectedTemplate` created but not used
- `buildSingleImagePrompt` called with `fullTemplate` instead
- Result: Placeholders in extracted scene

**Fix:** Verify `buildSingleImagePrompt(injectedTemplate, ...)` not `buildSingleImagePrompt(fullTemplate, ...)`

---

## Immediate Action Items

1. **Add Debug Logging:**
   - Log template key selected
   - Log injection input/output
   - Log extracted scene content
   - Log what's passed to Maya

2. **Verify Template Key:**
   - Check if `luxury_beige_aesthetic` template exists
   - Check if correct template is selected

3. **Verify Injection:**
   - Check if `injectDynamicContentWithRotation` succeeds
   - Check if validation passes
   - Check if error is caught and ignored

4. **Verify Scene Extraction:**
   - Check if `buildSingleImagePrompt` receives injected template
   - Check if extracted scene has injected content

---

**Next Steps:** Need to trace actual execution to identify where injection fails.
