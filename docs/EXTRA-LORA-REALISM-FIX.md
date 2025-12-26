# Extra LoRA (Realism) Fix - User Generation Settings Priority

## Issue

The extra LoRA (realism) feature was being disabled even when users had explicitly set it in their generation settings. The `enhancedAuthenticity` toggle was overriding user preferences.

## Root Cause

The logic in `app/api/maya/generate-image/route.ts` was:
1. Checking if `enhancedAuthenticity === true` and disabling extra_lora_scale
2. NOT checking if the user had explicitly set a `realismStrength` value in their generation settings
3. User's explicit settings were being ignored when `enhancedAuthenticity` toggle was enabled

## The Fix

Changed the priority logic so that **user's explicit generation settings take highest priority**:

**Before:**
```typescript
const shouldDisableExtraLora = enhancedAuthenticity === true || hasAuthenticAesthetic
extra_lora_scale: shouldDisableExtraLora
  ? 0  // Disable Super-Realism LoRA for authentic photos
  : (manualExtraLoraScale !== undefined ? manualExtraLoraScale : presetSettings.extra_lora_scale),
```

**After:**
```typescript
const manualExtraLoraScale = customSettings?.extraLoraScale ?? customSettings?.realismStrength
const hasUserSetRealism = manualExtraLoraScale !== undefined
const shouldDisableExtraLora = !hasUserSetRealism && (enhancedAuthenticity === true || hasAuthenticAesthetic)

extra_lora_scale: hasUserSetRealism
  ? manualExtraLoraScale  // User's explicit setting takes priority
  : (shouldDisableExtraLora ? 0 : presetSettings.extra_lora_scale),
```

## Priority Order (Fixed)

1. **User's explicit generation settings** (realismStrength/extraLoraScale) → **HIGHEST PRIORITY**
2. Enhanced Authenticity toggle is ON (only if no user setting) → disable (set to 0)
3. Prompt has authentic aesthetic keywords (only if no user setting) → disable (set to 0)
4. Preset/default scale → fallback

## How It Works

### Scenario 1: User has set realismStrength in generation settings
- **User setting:** `realismStrength: 0.4` in localStorage `mayaGenerationSettings`
- **enhancedAuthenticity:** `true` (toggle is ON)
- **Result:** ✅ Uses `0.4` (user's explicit setting overrides toggle)

### Scenario 2: User has NOT set realismStrength, enhancedAuthenticity is ON
- **User setting:** None
- **enhancedAuthenticity:** `true` (toggle is ON)
- **Result:** ✅ Uses `0` (disabled - as intended for authentic photos)

### Scenario 3: User has set realismStrength, enhancedAuthenticity is OFF
- **User setting:** `realismStrength: 0.3` in localStorage
- **enhancedAuthenticity:** `false` (toggle is OFF)
- **Result:** ✅ Uses `0.3` (user's setting)

### Scenario 4: No user setting, no toggle, preset default
- **User setting:** None
- **enhancedAuthenticity:** `false`
- **Result:** ✅ Uses preset default (`0.2` from quality presets)

## Files Changed

- ✅ `app/api/maya/generate-image/route.ts`
  - Changed `shouldDisableExtraLora` logic to check if user has explicitly set realism
  - Changed `extra_lora_scale` priority to give user settings highest priority
  - Updated logging to reflect new priority order

## Verification

✅ User's explicit `realismStrength` setting now overrides `enhancedAuthenticity` toggle
✅ Extra LoRA (realism) is included when users have set it in generation settings
✅ Enhanced Authenticity toggle still works when user hasn't set an explicit value
✅ Logging clearly shows when user settings override toggle

---

**Status:** ✅ Fixed
**Date:** 2025-01-XX

