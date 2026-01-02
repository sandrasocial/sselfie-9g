# Generation Settings Audit - Classic Mode

**Date:** January 2025  
**Issue:** Generation settings not being included when users adjust them manually in Classic Mode

---

## Current Flow Analysis

### 1. UI Settings (maya-chat-screen.tsx)

**Available Settings:**
- `styleStrength` (LoRA scale): 0.9 - 1.2, default 1.0
- `promptAccuracy` (guidance scale): 2.5 - 5.0, default 3.5
- `aspectRatio`: "1:1" | "4:5" | "16:9", default "4:5"
- `realismStrength` (extra LoRA scale): 0.0 - 0.8, default 0.2

**Storage:**
- Saved to `localStorage` as `mayaGenerationSettings` (line 260-266)
- Keys: `styleStrength`, `promptAccuracy`, `aspectRatio`, `realismStrength`

---

### 2. Concept Card (concept-card.tsx)

**Reading Settings (line 600-608):**
```typescript
const settingsStr = localStorage.getItem("mayaGenerationSettings")
const parsedSettings = settingsStr ? JSON.parse(settingsStr) : null

const customSettings = parsedSettings
  ? {
      ...parsedSettings,
      extraLoraScale: parsedSettings.realismStrength ?? 0.2,
    }
  : null
```

**Issues Found:**
1. ✅ Reads from localStorage correctly
2. ✅ Maps `realismStrength` to `extraLoraScale` (for API compatibility)
3. ⚠️ **PROBLEM:** Always sets `extraLoraScale` even if `realismStrength` is 0
   - `parsedSettings.realismStrength ?? 0.2` will use 0.2 if `realismStrength` is 0
   - Should be: `parsedSettings.realismStrength !== undefined ? parsedSettings.realismStrength : 0.2`

**Merging with Concept Settings (line 610-615):**
```typescript
const finalSettings = customSettings
  ? {
      ...customSettings,
      ...(concept.customSettings || {}),
    }
  : concept.customSettings
```

**Issue Found:**
- ⚠️ **PROBLEM:** Concept's `customSettings` override user's manual settings
- Should be: User's manual settings should override concept's default settings
- Current: `concept.customSettings` spreads last, overriding user settings

**Passing to API (line 631):**
```typescript
customSettings: finalSettings,
```
✅ Settings are passed to API

---

### 3. API (generate-image/route.ts)

**Reading Settings (line 202-219):**
```typescript
const qualitySettings = {
  ...presetSettings,
  aspect_ratio: customSettings?.aspectRatio || presetSettings.aspect_ratio,
  lora_scale: userLoraScale ?? customSettings?.styleStrength ?? presetSettings.lora_scale,
  guidance_scale: customSettings?.promptAccuracy ?? presetSettings.guidance_scale,
  extra_lora: customSettings?.extraLora || presetSettings.extra_lora,
  extra_lora_scale: hasUserSetRealism
    ? manualExtraLoraScale
    : (shouldDisableExtraLora ? 0 : presetSettings.extra_lora_scale),
  num_inference_steps: presetSettings.num_inference_steps, // ❌ NOT reading from customSettings
}
```

**Issues Found:**

1. ✅ `aspect_ratio`: Reads from `customSettings?.aspectRatio` correctly
2. ✅ `lora_scale`: Reads from `customSettings?.styleStrength` correctly (after DB check)
3. ✅ `guidance_scale`: Reads from `customSettings?.promptAccuracy` correctly
4. ✅ `extra_lora_scale`: Reads from `customSettings?.realismStrength` or `customSettings?.extraLoraScale` correctly
5. ❌ **PROBLEM:** `num_inference_steps` is hardcoded to preset, not reading from `customSettings`
   - Users can't adjust this in UI, but if they could, it wouldn't work
6. ⚠️ **POTENTIAL ISSUE:** Key name mismatch
   - UI saves: `realismStrength`
   - Concept card maps to: `extraLoraScale`
   - API checks for: `customSettings?.realismStrength` OR `customSettings?.extraLoraScale`
   - This should work, but the mapping in concept-card might cause issues

---

## Problems Identified

### Problem 1: Concept Settings Override User Settings

**Location:** `concept-card.tsx` line 610-615

**Current Code:**
```typescript
const finalSettings = customSettings
  ? {
      ...customSettings,
      ...(concept.customSettings || {}), // ❌ This overrides user settings!
    }
  : concept.customSettings
```

**Issue:**
- If `concept.customSettings` exists, it will override user's manual settings
- User adjusts `aspectRatio` to "16:9" → Concept has `aspectRatio: "1:1"` → Final: "1:1" ❌

**Fix:**
```typescript
const finalSettings = customSettings
  ? {
      ...(concept.customSettings || {}), // Concept defaults first
      ...customSettings, // User settings override concept defaults ✅
    }
  : concept.customSettings
```

---

### Problem 2: RealismStrength Default Value Issue

**Location:** `concept-card.tsx` line 606

**Current Code:**
```typescript
extraLoraScale: parsedSettings.realismStrength ?? 0.2,
```

**Issue:**
- If user sets `realismStrength` to `0`, the `??` operator will use `0.2` instead
- `0` is falsy, so `0 ?? 0.2` = `0.2` ❌

**Fix:**
```typescript
extraLoraScale: parsedSettings.realismStrength !== undefined 
  ? parsedSettings.realismStrength 
  : 0.2,
```

---

### Problem 3: Settings Not Persisting Across Concept Cards

**Location:** `concept-card.tsx` line 600-608

**Issue:**
- Settings are read from localStorage each time, which is correct
- But if localStorage is cleared or not set, no settings are used
- Should have better fallback handling

**Current:** ✅ Actually works correctly - reads from localStorage each time

---

## Recommended Fixes

### Fix 1: Correct Settings Merge Order

**File:** `components/sselfie/concept-card.tsx`  
**Line:** 610-615

**Change:**
```typescript
// BEFORE (WRONG - concept overrides user)
const finalSettings = customSettings
  ? {
      ...customSettings,
      ...(concept.customSettings || {}),
    }
  : concept.customSettings

// AFTER (CORRECT - user overrides concept)
const finalSettings = customSettings
  ? {
      ...(concept.customSettings || {}), // Concept defaults first
      ...customSettings, // User settings override ✅
    }
  : concept.customSettings
```

---

### Fix 2: Fix RealismStrength Default Handling

**File:** `components/sselfie/concept-card.tsx`  
**Line:** 606

**Change:**
```typescript
// BEFORE (WRONG - 0 becomes 0.2)
extraLoraScale: parsedSettings.realismStrength ?? 0.2,

// AFTER (CORRECT - 0 stays 0)
extraLoraScale: parsedSettings.realismStrength !== undefined 
  ? parsedSettings.realismStrength 
  : 0.2,
```

---

### Fix 3: Add num_inference_steps Support (Optional)

**File:** `app/api/maya/generate-image/route.ts`  
**Line:** 218

**Change:**
```typescript
// BEFORE
num_inference_steps: presetSettings.num_inference_steps,

// AFTER (if users can adjust this in UI)
num_inference_steps: customSettings?.numInferenceSteps ?? presetSettings.num_inference_steps,
```

**Note:** Users can't currently adjust this in UI, so this is optional for future.

---

## Testing Checklist

### Test 1: User Adjusts Aspect Ratio
1. User sets `aspectRatio` to "16:9" in settings
2. Generate image from concept card
3. **Expected:** Image uses "16:9" aspect ratio
4. **Current:** ❌ Might use concept's default if concept has `customSettings.aspectRatio`

### Test 2: User Adjusts Guidance Scale
1. User sets `promptAccuracy` to 4.5 in settings
2. Generate image from concept card
3. **Expected:** Image uses guidance_scale 4.5
4. **Current:** ✅ Should work (no override issue)

### Test 3: User Sets RealismStrength to 0
1. User sets `realismStrength` to 0.0 in settings
2. Generate image from concept card
3. **Expected:** `extra_lora_scale` should be 0
4. **Current:** ❌ Might become 0.2 due to `??` operator

### Test 4: User Adjusts Style Strength
1. User sets `styleStrength` to 1.1 in settings
2. Generate image from concept card
3. **Expected:** Image uses lora_scale 1.1
4. **Current:** ✅ Should work (no override issue)

---

## Summary

**Issues Found:**
1. ❌ Concept settings override user settings (merge order wrong)
2. ❌ RealismStrength 0 becomes 0.2 (default value handling)
3. ⚠️ num_inference_steps not configurable (but users can't adjust it anyway)

**Priority:**
1. **HIGH:** Fix merge order (user settings should override concept defaults)
2. **HIGH:** Fix realismStrength 0 handling
3. **LOW:** Add num_inference_steps support (future enhancement)

