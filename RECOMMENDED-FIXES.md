# Recommended Fixes for Maya Training & Prompting Issues

## Priority 1: Fix Prompt Generation (Most Critical)

### Issue
The Dec 7 changes removed hair/feature descriptions from prompts, assuming the LoRA learned them perfectly. This causes wrong hair colors, ages, and body types when the LoRA didn't learn these features well.

### Fix Strategy
**Don't assume LoRA learned everything perfectly. Use a "safety net" approach.**

### Recommended Changes

#### 1. Modify `lib/maya/flux-prompting-principles.ts`

**Current (lines 96-103):**
```
- ❌ AVOID: "blue eyes", "sharp jawline", "high cheekbones", "defined nose", **"long dark brown hair"**, **"blonde hair"**, **"short hair"**, **"curly hair"**
```

**Recommended Change:**
```
- **CONSIDER INCLUDING:** Hair color/style if user's training images show it prominently (as a safety net)
- **AVOID OVER-DESCRIBING:** Don't describe facial features that are clearly visible in training images, but hair color/style is often ambiguous and should be reinforced
- **USER PREFERENCES OVERRIDE:** Always include user-specified physical preferences (these are intentional modifications)
```

#### 2. Modify `app/api/maya/generate-concepts/route.ts`

**Current (lines 344-352):** Tells Maya to avoid hair descriptions

**Recommended Addition (after line 352):**
```
   - **SAFETY NET APPROACH:** If unsure whether LoRA learned a feature well (especially hair color, body type, age), it's safer to include a subtle description than to omit it
   - **When in doubt, reinforce features:** Better to include "long brown hair" even if LoRA should know it, than to omit it and get wrong colors
   - **User preferences are ALWAYS included:** If user specified hair/body modifications, these are MANDATORY and must be in every prompt
```

#### 3. Modify Physical Preferences Processing

**File:** `lib/maya/flux-prompt-builder.ts` and `app/api/maya/generate-concepts/route.ts`

**Current:** Removes "keep my natural hair color" completely

**Recommended:** Convert to descriptive language instead of removing:
- "keep my natural hair color" → Check training images or user data for actual color, then use that
- If color unknown, keep the phrase but make it descriptive: "natural hair color as in training images"
- Don't remove user-intended feature descriptions

---

## Priority 2: Adjust Training Parameters

### Issue
High `lora_rank: 48` combined with high `caption_dropout_rate: 0.15` may be preventing proper feature learning.

### Recommended Changes to `lib/replicate-client.ts`

```typescript
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400,  // Keep this
  lora_rank: 24,  // REDUCE from 48 to 24 (sweet spot for stability + quality)
  optimizer: "adamw_bf16",  // Keep
  batch_size: 1,  // Keep
  resolution: "1024",  // Keep
  autocaption: true,  // Keep
  trigger_word: "",
  learning_rate: 0.0001,  // INCREASE from 0.00008 to 0.0001 (better learning with lower rank)
  num_repeats: 18,  // SLIGHTLY REDUCE from 20 to 18 (reduce overfitting risk)
  caption_dropout_rate: 0.05,  // REDUCE from 0.15 to 0.05 (learn more from captions)
  cache_latents_to_disk: false,
  network_alpha: 24,  // MATCH lora_rank (24)
  save_every_n_steps: 250,
  guidance_scale_training: 1.0,
  lr_scheduler: "constant_with_warmup",
}
```

### Rationale:
- **lora_rank: 24** - More stable than 48, still high enough for detail
- **caption_dropout_rate: 0.05** - Lower dropout = model learns hair/body/age from captions better
- **learning_rate: 0.0001** - Slightly higher to compensate for lower rank
- **num_repeats: 18** - Slight reduction to reduce overfitting risk

---

## Priority 3: Improve Training Validation

### Add Checks to Verify Training Quality

**File:** `app/api/training/progress/route.ts` or create new validation endpoint

Add validation that:
1. Training images have good caption quality
2. Check autocaption results include hair/body/age descriptors
3. Validate trigger word is being learned correctly
4. Test generated sample image after training to verify feature preservation

---

## Priority 4: Enhanced Physical Preferences

### Better Processing of User Preferences

**Current Issue:** Instructions get removed, losing user intent

**Recommended:** Create a smarter conversion system:

```typescript
function convertPhysicalPreferencesToPrompt(preferences: string, userData: any): string {
  // Step 1: Remove instruction phrases
  let cleaned = preferences.replace(/always keep my|dont change|keep my|preserve my/gi, "")
  
  // Step 2: Convert "keep my natural hair color" to actual hair color from training
  if (cleaned.includes("natural hair color")) {
    // Try to extract actual color from training images or user data
    // If found, use: "long brown hair" (descriptive)
    // If not found, use: "natural hair color" (keeps intent)
  }
  
  // Step 3: Keep all descriptive modifications
  // "curvier body type" → keep as-is
  // "long blonde hair" → keep as-is
  
  return cleaned.trim()
}
```

---

## Testing Strategy

### Before Deploying:

1. **Test with existing user:**
   - Find a user who reported issues
   - Retrain their model with new parameters (lora_rank: 24, lower dropout)
   - Generate images with updated prompt logic
   - Compare: old vs new results

2. **A/B Test:**
   - Keep old prompt logic for 50% of users
   - Use new logic for 50%
   - Compare quality metrics

3. **Monitor:**
   - Track user complaints about hair color/age/body type
   - Monitor training success rates
   - Check if "retraining failures" decrease

---

## Rollout Plan

### Phase 1: Training Parameters (Lower Risk)
1. Update `DEFAULT_TRAINING_PARAMS` in `lib/replicate-client.ts`
2. Test with 1-2 users
3. If successful, roll out to all new trainings

### Phase 2: Prompt Generation (Higher Risk - Needs Careful Testing)
1. Update prompt principles to be less aggressive about removing features
2. Test thoroughly with existing users
3. Monitor for any regressions in quality
4. Gradually roll out

### Phase 3: Physical Preferences (Medium Risk)
1. Improve conversion logic
2. Test with users who have physical preferences set
3. Verify intent is preserved

---

## Expected Outcomes

### After Fixes:

✅ **Hair Color:** Should match training images more consistently  
✅ **Age/Body Type:** Should preserve user's actual appearance  
✅ **Training Stability:** Lower `lora_rank` should reduce training failures  
✅ **User Satisfaction:** "Only 3 decent photos" should improve to 8-9 out of 9

### Metrics to Track:

- % of generated images with correct hair color
- % of generated images with correct body type/age
- Training success rate (should increase)
- User retraining attempts (should decrease)
- Credit pack satisfaction (should improve)
