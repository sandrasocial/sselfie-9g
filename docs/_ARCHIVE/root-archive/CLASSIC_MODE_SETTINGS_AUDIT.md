# Classic Mode Generation Settings Audit

**Date:** January 2025  
**Status:** ✅ VERIFIED & FIXED

## Summary

Audited Classic Mode image generation to verify:
1. Realism extra LoRA inclusion
2. Generation settings persistence and usage

## Findings

### ✅ Realism Extra LoRA - INCLUDED

**Location:** `app/api/maya/generate-image/route.ts`

The realism extra LoRA is correctly included when:
- `extra_lora_scale > 0` (user setting or preset default)
- Enhanced Authenticity toggle is OFF
- No authentic aesthetic keywords in prompt

**Flow:**
1. User sets `realismStrength` in settings panel (0.0-0.8, default: 0.2)
2. Settings saved to `localStorage` via `useMayaSettings` hook
3. On image generation, `concept-card.tsx` reads settings and maps `realismStrength` → `extraLoraScale`
4. API receives `customSettings.extraLoraScale` or `customSettings.realismStrength`
5. API maps to `qualitySettings.extra_lora_scale` with priority:
   - Enhanced Authenticity toggle ON → force 0
   - User's explicit setting → use that value
   - Preset default → 0.2
6. `buildClassicModeReplicateInput` includes `extra_lora` and `extra_lora_scale` if scale > 0

**Code References:**
- `app/api/maya/generate-image/route.ts:186-219` - Settings mapping logic
- `lib/replicate-helpers.ts:129-139` - Conditional extra_lora inclusion
- `lib/maya/quality-settings.ts:19` - Preset default: `extra_lora_scale: 0.2`

### ✅ Generation Settings Persistence - WORKING

**Location:** `components/sselfie/maya/hooks/use-maya-settings.ts`

Settings are:
- ✅ Saved to `localStorage` with debouncing (500ms)
- ✅ Loaded on component mount
- ✅ Persisted across sessions

**Settings Managed:**
- `styleStrength`: 0.9-1.2 (default: 1.0) → maps to `lora_scale`
- `promptAccuracy`: 2.5-5.0 (default: 3.5) → maps to `guidance_scale`
- `aspectRatio`: "1:1" | "4:5" | "16:9" (default: "4:5")
- `realismStrength`: 0.0-0.8 (default: 0.2) → maps to `extra_lora_scale`
- `enhancedAuthenticity`: boolean (default: false) → forces `extra_lora_scale` to 0 if ON

**Storage Keys:**
- `mayaGenerationSettings` - Main settings (JSON)
- `mayaEnhancedAuthenticity` - Enhanced Authenticity toggle (string: "true"/"false")

### ✅ Settings Usage in Generation - WORKING

**Location:** `components/sselfie/concept-card.tsx:600-640`

On image generation:
1. Reads `mayaGenerationSettings` from `localStorage`
2. Maps `realismStrength` → `extraLoraScale` (only if defined)
3. Merges with concept defaults (user settings override)
4. Reads `mayaEnhancedAuthenticity` from `localStorage`
5. Passes to API: `customSettings` + `enhancedAuthenticity`

**API Priority (app/api/maya/generate-image/route.ts:199-219):**
1. **Enhanced Authenticity toggle** → forces `extra_lora_scale = 0` (highest priority)
2. **User's explicit `realismStrength`/`extraLoraScale`** → uses that value
3. **Preset default** → `extra_lora_scale: 0.2`

## Fix Applied

**Issue:** Frontend was forcing `extraLoraScale: 0.2` even when `realismStrength` was undefined, preventing API from using preset defaults.

**Fix:** Changed `concept-card.tsx:603-612` to only set `extraLoraScale` if `realismStrength` is explicitly defined:

```typescript
// BEFORE (incorrect):
extraLoraScale: parsedSettings.realismStrength !== undefined 
  ? parsedSettings.realismStrength 
  : 0.2,  // ❌ Always sets 0.2, even when undefined

// AFTER (correct):
...(parsedSettings.realismStrength !== undefined && {
  extraLoraScale: parsedSettings.realismStrength,
}),  // ✅ Only sets if user explicitly set it
```

This allows the API to use preset defaults (0.2) when the user hasn't adjusted realismStrength, while still respecting user settings when they are set.

## Verification Checklist

- [x] Realism extra LoRA URL is included in quality presets
- [x] Realism extra LoRA scale defaults to 0.2 in presets
- [x] User's `realismStrength` setting is read from localStorage
- [x] User's `realismStrength` is mapped to `extraLoraScale` correctly
- [x] API receives and processes `realismStrength`/`extraLoraScale`
- [x] API includes `extra_lora` and `extra_lora_scale` in Replicate input when scale > 0
- [x] Enhanced Authenticity toggle correctly disables extra LoRA (forces scale to 0)
- [x] Settings persist across sessions via localStorage
- [x] Settings are applied to all Classic Mode image generations
- [x] All generation settings (styleStrength, promptAccuracy, aspectRatio, realismStrength) are used

## Conclusion

✅ **Realism extra LoRA is correctly included** when:
- User hasn't disabled it (Enhanced Authenticity OFF)
- Scale > 0 (either user setting or preset default 0.2)

✅ **Generation settings are correctly persisted and used**:
- Saved to localStorage with debouncing
- Loaded on mount
- Applied to all Classic Mode image generations
- User settings override preset defaults
- Settings persist across sessions

**Status:** All systems working correctly. Fix applied to prevent forcing default when user hasn't set realismStrength.

