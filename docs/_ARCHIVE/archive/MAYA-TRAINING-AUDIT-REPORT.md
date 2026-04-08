# Maya Training & Prompting Audit Report
**Date:** January 2025  
**Issue:** Users reporting degraded image quality - wrong hair color, wrong age, wrong body type  
**Timeframe:** Working perfectly 3 weeks ago, now getting weak results

---

## Executive Summary

The audit reveals **two critical issues** that have degraded image quality:

1. **Prompt Generation Changes (Dec 7, 2025)** - Removed hair/feature descriptions assuming LoRA learned them perfectly
2. **Training Parameters** - Potentially problematic settings that may not be learning user features correctly

---

## 🔴 CRITICAL ISSUE #1: Prompt Generation Changes

### The Problem
**Commit:** `5118708` (Dec 7, 2025) - "improve prompt generation guidelines and logic for character likeness preservation"

**What Changed:**
- Added instructions to **AVOID** describing hair color/style (lines 96-103 in `flux-prompting-principles.ts`)
- Logic states: "DO NOT describe fixed facial features that the LoRA already knows (hair color/style)"
- Assumption: LoRA learned hair from training, so prompts shouldn't mention it

**The Issue:**
- If the LoRA **didn't learn hair color well** during training, removing it from prompts causes the model to default to wrong colors
- The user feedback specifically mentions: **"dark hair"** when it should be different
- This suggests the LoRA training may not have captured hair color properly

### Evidence from Code

**File:** `lib/maya/flux-prompting-principles.ts` (lines 96-103)
```typescript
**🔴 CRITICAL - AVOID FACIAL FEATURE MICROMANAGEMENT:**
- **DO NOT describe fixed facial features** that the LoRA already knows (eye color, jawline, cheekbones, nose shape, hair color/style)
- The LoRA was trained on these features - it already knows them
- Mentioning them can confuse the model or cause conflicts with character likeness
- ❌ AVOID: "blue eyes", "sharp jawline", "high cheekbones", "defined nose", **"long dark brown hair"**, **"blonde hair"**, **"short hair"**, **"curly hair"**
```

**File:** `app/api/maya/generate-concepts/route.ts` (lines 344-352)
```typescript
**CRITICAL - AVOID FACIAL FEATURE MICROMANAGEMENT:**
- DO NOT describe fixed facial features that the LoRA already knows (eye color, jawline, cheekbones, nose shape, **hair color/style/length**)
- ❌ AVOID: "blue eyes", "sharp jawline", "high cheekbones", "defined nose", **"long dark brown hair"**, **"blonde hair"**, **"short hair"**, **"curly hair"** (UNLESS user specified these in their physical preferences/settings)
- **ONLY avoid hair descriptions** if they're NOT in user's physical preferences
```

### Physical Preferences Handling Issue

**File:** `lib/maya/flux-prompt-builder.ts` (lines 79-110)
- Code removes instruction phrases like "keep my natural hair color"
- If a user had "keep my natural hair color" and it gets removed, AND the LoRA didn't learn it, the model defaults to wrong colors

---

## 🔴 CRITICAL ISSUE #2: Training Parameters

### ⚠️ IMPORTANT: Parameters Have NOT Changed in Last 3 Weeks
**Answer:** No, the training parameters have **NOT changed** in the last 3 weeks. They were set in commit `369c962` (before 3 weeks ago) and remain unchanged.

This means:
- The issue is **NOT from parameter changes**
- The parameters may have been problematic all along
- The Dec 7 prompt changes likely **exposed** the parameter issues by removing safety nets

### Current Settings (`lib/replicate-client.ts`)
```typescript
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400,
  lora_rank: 48,  // ⚠️ VERY HIGH - may cause instability
  optimizer: "adamw_bf16",
  batch_size: 1,
  resolution: "1024",
  autocaption: true,
  learning_rate: 0.00008,  // ⚠️ Quite low
  num_repeats: 20,  // High repetition
  caption_dropout_rate: 0.15,  // ⚠️ 15% dropout may be too high
  network_alpha: 48,
  save_every_n_steps: 250,
  guidance_scale_training: 1.0,
  lr_scheduler: "constant_with_warmup",
}
```

### Potential Problems

1. **`lora_rank: 48`** - This is **very high** (typically 8-32 range)
   - High rank can cause:
     - Overfitting (memorizes training images too closely)
     - Instability (inconsistent results)
     - Poor generalization (doesn't work well with varied prompts)
   - **Recommendation:** Consider reducing to 16-24 range

2. **`caption_dropout_rate: 0.15`** - 15% dropout might be too aggressive
   - Higher dropout means the model learns less from image captions
   - If captions contain important info (hair color, body type), dropout prevents learning it
   - **Recommendation:** Reduce to 0.05-0.1 for better feature learning

3. **`learning_rate: 0.00008`** - Very low learning rate
   - Combined with high `lora_rank: 48`, this might cause slow/insufficient learning
   - **Recommendation:** Consider increasing to 0.0001-0.0002

4. **`num_repeats: 20`** - High repetition
   - With only 5-10 training images, this means 100-200 total training images
   - Combined with high `lora_rank`, this could cause overfitting
   - **Recommendation:** May need to reduce if overfitting is detected

---

## 🔴 CRITICAL ISSUE #3: Physical Preferences Processing

### The Problem
**File:** `lib/maya/flux-prompt-builder.ts` (lines 79-110) and `app/api/maya/generate-concepts/route.ts` (lines 312-332)

The code **removes instruction phrases** like:
- "keep my natural hair color"
- "dont change the face"
- "always keep my natural features"

**The Issue:**
- If user wrote "keep my natural hair color" and it gets removed
- AND the LoRA didn't learn hair color well from training
- The model has NO guidance on hair color and defaults to wrong colors

---

## 🔴 User Feedback Analysis

### Reported Issues:
1. **"dark hair"** when it should be different → **Hair color not preserved**
2. **"too young"** → **Age/face structure not preserved**
3. **"too skinny"** → **Body type not preserved**
4. **"retraining 5x but kept being spat out"** → **Training may be failing silently or producing bad models**
5. **"only 3 decent photos out of a whole credit pack"** → **Inconsistent quality**

### Root Causes:
1. **Hair color:** LoRA not learning it + prompts not reinforcing it = wrong colors
2. **Age/Body type:** Either LoRA not learning these OR prompts overriding them
3. **Training failures:** High `lora_rank: 48` might be causing training instability

---

## 📋 Recommendations

### Immediate Fixes (High Priority)

1. **REVERT or MODIFY the Dec 7 prompt changes:**
   - Stop avoiding hair descriptions if they're in the original training images
   - Add logic to check if hair/features should be included based on training quality
   - Consider adding hair color to prompts even if LoRA should know it (as a safety measure)

2. **Adjust Training Parameters:**
   ```typescript
   lora_rank: 24,  // Reduce from 48 (try 16-24 range)
   caption_dropout_rate: 0.05,  // Reduce from 0.15 (less aggressive)
   learning_rate: 0.0001,  // Increase slightly from 0.00008
   ```

3. **Improve Physical Preferences Handling:**
   - Don't remove "keep my natural hair color" if it's in user preferences
   - Convert to descriptive language (e.g., "brown hair") instead of removing
   - Add fallback logic: if LoRA confidence is low, include explicit descriptions

4. **Add Training Quality Checks:**
   - Verify training images have captions with hair/body/age info
   - Check if autocaption is working correctly
   - Add validation that training actually learned user features

### Medium Priority

5. **Prompt Length:** The recent reduction to 25-45 words might be cutting important details. Consider allowing 30-45 words minimum.

6. **Add Explicit Feature Reinforcement:**
   - For critical features (hair color, body type), consider always including them in prompts
   - Use a "safety net" approach: describe features even if LoRA should know them

---

## 🔍 Files to Review

### Prompt Generation:
- `lib/maya/flux-prompting-principles.ts` (lines 96-112)
- `app/api/maya/generate-concepts/route.ts` (lines 312-360)
- `lib/maya/flux-prompt-builder.ts` (lines 79-110)
- `app/api/maya/create-photoshoot/route.ts` (lines 40-76)

### Training:
- `lib/replicate-client.ts` (DEFAULT_TRAINING_PARAMS)
- `app/api/training/start-training/route.ts`
- `app/api/training/start/route.ts`

---

## 🎯 Next Steps

1. **Test hypothesis:** Run a test training with lower `lora_rank` (16-24) and see if results improve
2. **Prompt fix:** Modify prompt generation to be less aggressive about removing feature descriptions
3. **User communication:** Ask affected users to retrain with corrected parameters
4. **Monitoring:** Add logging to track training success rates and feature preservation

---

## 📝 Notes

- The Dec 7 changes were well-intentioned (trying to preserve character likeness) but made an incorrect assumption
- The assumption was: "LoRA learned everything perfectly, so we don't need to mention features"
- Reality: LoRA may not have learned features well, especially with high dropout and high rank
- **Key insight:** Even if LoRA should know a feature, explicitly mentioning it in prompts can serve as a "safety net" and improve consistency
