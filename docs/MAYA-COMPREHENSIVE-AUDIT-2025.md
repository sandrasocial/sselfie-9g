# Maya Comprehensive System Audit - January 2025

**Date:** January 2025  
**Status:** 🔴 CRITICAL ISSUES IDENTIFIED  
**Executive Summary:** Multiple systemic issues have degraded Maya's performance compared to earlier versions. This audit identifies all problems and provides actionable fixes.

---

## 🔴 CRITICAL ISSUES SUMMARY

1. **Training Parameters Too Aggressive** - High `lora_rank: 48` + high `caption_dropout_rate: 0.15` = poor feature learning
2. **Lighting Changes Made Images Less Appealing** - Changed from warm/golden hour to "realistic but harsh" lighting
3. **Conflicting Prompt Guidelines** - Multiple contradictory instructions about feature descriptions
4. **Physical Preferences Lost in Translation** - Code removes user intent phrases, losing critical information
5. **Prompt Length Inconsistencies** - Three different word count targets (30-45, 40-55, 50-80 words)

---

## 1. TRAINING PARAMETERS (CRITICAL)

### Current Settings (PROBLEMATIC)

**File:** `lib/replicate-client.ts` (lines 37-53)

```typescript
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400,
  lora_rank: 48,              // ⚠️ VERY HIGH (typically 8-32)
  learning_rate: 0.00008,     // ⚠️ Very low
  caption_dropout_rate: 0.15, // ⚠️ Too high (15% dropout)
  network_alpha: 48,          // Matches rank
  num_repeats: 20,
  // ... other params
}
```

### Problems Identified

1. **`lora_rank: 48` is EXCESSIVELY HIGH**
   - Typical range: 8-32
   - High rank causes:
     - Overfitting (memorizes training images too closely)
     - Instability (inconsistent results across generations)
     - Poor generalization (doesn't adapt well to varied prompts)
     - Training failures (model may not converge properly)

2. **`caption_dropout_rate: 0.15` (15%) is TOO AGGRESSIVE**
   - High dropout means model ignores 15% of caption information
   - If captions contain hair color, body type, age → model doesn't learn these features
   - **Impact:** Wrong hair colors, wrong body types, wrong age in generated images

3. **`learning_rate: 0.00008` is TOO LOW**
   - Combined with high `lora_rank: 48`, model learns very slowly
   - May not capture features properly within 1400 steps
   - **Impact:** Weak feature learning, inconsistent results

### Evidence from User Feedback

From `MAYA-TRAINING-AUDIT-REPORT.md`:
- "dark hair" when it should be different → Hair color not learned
- "too young" → Age/face structure not learned
- "too skinny" → Body type not learned
- "retraining 5x but kept being spat out" → Training instability
- "only 3 decent photos out of a whole credit pack" → Inconsistent quality

### Recommended Fix

**Change to more stable parameters:**

```typescript
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400,
  lora_rank: 24,              // ✅ REDUCE from 48 to 24 (sweet spot)
  learning_rate: 0.0001,      // ✅ INCREASE from 0.00008 to 0.0001
  caption_dropout_rate: 0.05, // ✅ REDUCE from 0.15 to 0.05 (learn more from captions)
  network_alpha: 24,          // ✅ MATCH lora_rank (24)
  num_repeats: 20,
  // ... keep other params the same
}
```

**Why These Work Better:**
- `lora_rank: 24` - More stable than 48, still high enough for detail
- `caption_dropout_rate: 0.05` - Lower dropout = model learns hair/body/age from captions
- `learning_rate: 0.0001` - Slightly higher to compensate for lower rank, ensures features are learned

---

## 2. LIGHTING DESCRIPTION CHANGES (CRITICAL)

### What Changed (December 12, 2025)

**File:** `lib/maya/flux-prompting-principles.ts` (lines 163-185)

**BEFORE (What was working - warm, appealing):**
```typescript
// Warm, appealing lighting descriptions
- "Soft afternoon sunlight"
- "Natural window light"
- "Warm golden hour lighting"
- "Overcast daylight"
```

**AFTER (Current - realistic but harsh):**
```typescript
// Realistic but potentially less appealing
- "Uneven natural lighting"
- "Mixed color temperatures"
- "Natural window light with shadows"
- "Overcast daylight, soft shadows"
```

**BANNED (Formerly good lighting):**
```typescript
- ❌ "Soft afternoon sunlight" (too idealized)
- ❌ "Warm golden hour lighting" (too perfect)
```

### Problem

The change prioritized "realism" over "appeal". While real phone photos DO have uneven lighting, users expect Instagram-worthy images that look polished and appealing, not harshly realistic.

### Impact

- Images look more realistic but less Instagram-worthy
- Users may perceive quality degradation even if technically more "authentic"
- Lighting descriptions now sound clinical rather than appealing

### Recommended Fix

**Hybrid approach - realistic but appealing:**

```typescript
// KEEP realistic but add warmth back
✅ "Natural afternoon light with warm tones"
✅ "Golden hour lighting with natural shadows"
✅ "Soft window light with warm color temperature"
✅ "Overcast daylight, soft and diffused"  // Softer than "soft shadows"
✅ "Natural window light, warm and inviting"  // Add appeal back

// ALLOW (not ban) warm lighting descriptions when appropriate
✅ "Soft afternoon sunlight"  // Allow when it fits the concept
✅ "Warm golden hour lighting"  // Allow when it fits the concept
```

**File to update:** `lib/maya/flux-prompting-principles.ts` lines 163-185

---

## 3. CONFLICTING PROMPT GUIDELINES (HIGH PRIORITY)

### Issue: Multiple Contradictory Instructions

**File 1:** `lib/maya/flux-prompting-principles.ts` (lines 123-144)

Says: "Include key features (hair color/style, distinctive traits) concisely as guidance"

**File 2:** `lib/maya/personality.ts` (lines 164-169)

Says: "BALANCED APPROACH: Include key features (hair color/style, distinctive traits) concisely as a safety net"

**File 3:** `lib/maya/flux-prompting-principles.ts` (lines 62-75)

Says: "AVOID FACIAL FEATURE MICROMANAGEMENT: DO NOT describe fixed facial features"

### Problem

The system both requires AND forbids feature descriptions, creating confusion and inconsistent behavior.

### Current Behavior

From code analysis:
- Code tries to include features "as safety net"
- BUT also has logic to avoid/remove feature descriptions
- Result: Inconsistent prompts, sometimes includes features, sometimes doesn't

### Recommended Fix

**Clarify and standardize:**

1. **ALWAYS include user physical preferences** (if specified in database)
2. **Include hair color/style as safety net** (brief, e.g., "brown hair")
3. **Avoid detailed facial feature descriptions** (eye color, nose shape, jawline)
4. **Make this consistent across all files**

**Implementation:**

```typescript
// STANDARDIZED RULE (apply everywhere):
// 1. User physical_preferences → ALWAYS include (MANDATORY)
// 2. Hair color/style → Include briefly as safety net (e.g., "brown hair", "blonde hair")
// 3. Facial features (eyes, nose, jaw) → DO NOT include (LoRA should handle these)
// 4. Body type/age → Include if in user preferences, otherwise let LoRA handle
```

**Files to update:**
- `lib/maya/flux-prompting-principles.ts`
- `lib/maya/personality.ts`
- `app/api/maya/generate-concepts/route.ts`
- `lib/maya/flux-prompt-builder.ts`

---

## 4. PHYSICAL PREFERENCES PROCESSING (HIGH PRIORITY)

### Problem

**File:** `lib/maya/flux-prompt-builder.ts` (lines 79-110)

The `convertPhysicalPreferencesToPrompt()` function **removes instruction phrases** like:
- "keep my natural hair color"
- "dont change the face"
- "always keep my natural features"

### Issue

If a user wrote "keep my natural hair color" and the code removes it:
- User intent is lost
- If LoRA didn't learn hair color well → no guidance remains
- Model defaults to wrong colors

### Evidence

From `MAYA-TRAINING-AUDIT-REPORT.md`:
- Code removes instruction phrases during prompt building
- User feedback: "dark hair" when it should be different
- This confirms physical preferences are being lost

### Recommended Fix

**Convert, don't remove:**

```typescript
private static convertPhysicalPreferencesToPrompt(preferences: string): string {
  // CONVERT instruction phrases to descriptive language
  // DON'T remove them entirely
  
  let converted = preferences
  
  // Convert instruction phrases to descriptive
  converted = converted.replace(/keep my natural hair color/gi, "natural hair color")
  converted = converted.replace(/dont change (?:the )?face/gi, "")  // OK to remove face instructions
  converted = converted.replace(/always keep my natural features/gi, "natural features")
  
  // Keep descriptive phrases as-is
  // "brown hair" → "brown hair" (no change)
  // "curvier body" → "curvier body" (no change)
  
  return converted.trim()
}
```

**Key principle:** Convert user intent to descriptive language, don't delete it entirely.

---

## 5. PROMPT LENGTH INCONSISTENCIES (MEDIUM PRIORITY)

### Issue: Three Different Word Count Targets

1. **Personality file says:** 30-45 words (lines 15, 157-160)
2. **Flux principles says:** 40-55 words (lines 307-312)
3. **Flux principles also says:** 30-60 words (line 40)

### Problem

Different parts of the system target different word counts, causing:
- Inconsistent prompt lengths
- Confusion in prompt generation logic
- Suboptimal results (too short = missing detail, too long = losing focus)

### Recommended Fix

**Standardize on one range:**

```typescript
// STANDARDIZED PROMPT LENGTH
// Target: 40-50 words (optimal balance)
// Acceptable range: 35-55 words
// 
// Rationale:
// - <35 words: May miss critical details (outfit, lighting, camera specs)
// - 40-50 words: Optimal for LoRA activation + safety net features + styling details
// - >55 words: Model may lose focus on character features
```

**Files to update:**
- `lib/maya/personality.ts` - Change 30-45 to 40-50
- `lib/maya/flux-prompting-principles.ts` - Change 30-60 to 40-50 (target), 35-55 (acceptable)

---

## 6. AUTHENTICITY KEYWORDS (MEDIUM PRIORITY)

### Issue: Too Mandatory

**File:** `lib/maya/flux-prompting-principles.ts` (lines 196-227)

Current code requires:
- "candid photo" or "candid moment" (MANDATORY)
- "amateur cellphone photo" or "cellphone photo" (MANDATORY)
- "shot on iPhone 15 Pro" (MANDATORY)

### Problem

Making these mandatory makes prompts formulaic. If a user wants a more polished look, they can't get it because these keywords are forced.

### Evidence

From `GIT_HISTORY_ANALYSIS.md`:
- These keywords were optional before
- Made mandatory in commit 45bf012 (December 12, 2025)
- Impact: "More authenticity keywords, but may have made prompts longer or more formulaic"

### Recommended Fix

**Make context-aware, not always mandatory:**

```typescript
// DEFAULT: Include authenticity keywords for Instagram-style content
// ALLOW OVERRIDE: If user requests "editorial", "professional", "studio" → skip authenticity keywords

if (conceptCategory.includes("editorial") || 
    conceptCategory.includes("professional") || 
    userRequest.includes("studio")) {
  // Skip authenticity keywords, use professional camera specs
} else {
  // Include authenticity keywords (default behavior)
}
```

**Files to update:**
- `lib/maya/flux-prompt-builder.ts`
- `app/api/maya/generate-concepts/route.ts`

---

## 7. SCANDINAVIAN FILTER (MEDIUM PRIORITY)

### Issue: Forced Default Aesthetic

**File:** `app/api/maya/generate-concepts/route.ts` (lines 177-237)

Current code:
- Defaults to Scandinavian minimalism for ALL concepts
- Only allows override if user explicitly requests non-Scandi aesthetic

### Problem

Not all users want Scandinavian minimalism. Forcing it as default limits creative variety and may not match user's brand.

### Evidence

Code explicitly filters trends through "SCANDINAVIAN MINIMALISM lens" by default.

### Recommended Fix

**Remove forced default, use user's brand aesthetic:**

```typescript
// PRIORITY 1: User's saved visual_aesthetic from brand profile
// PRIORITY 2: User's explicit request
// PRIORITY 3: No default (let Maya's creativity guide)

// Remove this line:
// trendResearchPrompt += `\n\nCRITICAL: Filter trends through a SCANDINAVIAN MINIMALISM lens...`

// Replace with:
if (userAesthetic) {
  trendResearchPrompt += `\n\nUse these insights, filtered through ${userAesthetic} aesthetic.`
} else {
  trendResearchPrompt += `\n\nUse these insights to inform your concept creation.`
}
```

**Files to update:**
- `app/api/maya/generate-concepts/route.ts` (lines 177-237)

---

## 8. CHAT SYSTEM ISSUES (LOW PRIORITY)

### Issue: Message Filtering May Be Too Aggressive

**File:** `app/api/maya/chat/route.ts` (lines 103-168)

Current code filters out messages with:
- Invalid roles
- Tool calls/results
- Malformed content structures

### Potential Problem

Filtering may be removing valid messages or causing conversation context loss.

### Recommended Fix

**Review filtering logic** - ensure it's not too aggressive. Consider logging filtered messages to monitor.

---

## 9. QUALITY SETTINGS (VERIFY)

### Current Settings

**File:** `lib/maya/quality-settings.ts`

```typescript
export const MAYA_DEFAULT_QUALITY_SETTINGS = {
  guidance_scale: 3.5,  // ✅ Good (typical range 2.5-5.0)
  num_inference_steps: 50,  // ✅ Good (standard)
  lora_scale: 1.0,  // ✅ Good (standard)
  extra_lora_scale: 0.2,  // ✅ Good (subtle realism boost)
  // ...
}
```

### Status

These settings look reasonable. No immediate changes needed, but monitor if issues persist after other fixes.

---

## 📋 PRIORITY FIX RECOMMENDATIONS

### IMMEDIATE (Do First - Biggest Impact)

1. **Fix Training Parameters** (CRITICAL)
   - Change `lora_rank: 48` → `24`
   - Change `caption_dropout_rate: 0.15` → `0.05`
   - Change `learning_rate: 0.00008` → `0.0001`
   - **File:** `lib/replicate-client.ts`
   - **Impact:** Should dramatically improve feature learning (hair, body, age)

2. **Fix Lighting Descriptions** (CRITICAL)
   - Restore warm, appealing lighting options
   - Keep realistic but add warmth back
   - **File:** `lib/maya/flux-prompting-principles.ts` lines 163-185
   - **Impact:** Images will look more appealing/Instagram-worthy

3. **Fix Physical Preferences Processing** (HIGH)
   - Convert instruction phrases instead of removing them
   - **File:** `lib/maya/flux-prompt-builder.ts` lines 79-110
   - **Impact:** User intent preserved, better hair/body accuracy

### HIGH PRIORITY (Do Second)

4. **Standardize Prompt Guidelines** (HIGH)
   - Resolve conflicts between files
   - Clear rules: when to include features, when to avoid
   - **Files:** `lib/maya/flux-prompting-principles.ts`, `lib/maya/personality.ts`
   - **Impact:** Consistent, predictable prompts

5. **Standardize Prompt Length** (MEDIUM)
   - Set single target: 40-50 words
   - Update all references
   - **Files:** Multiple
   - **Impact:** Consistent prompt quality

### MEDIUM PRIORITY (Do Third)

6. **Remove Forced Scandinavian Filter** (MEDIUM)
   - Use user's brand aesthetic instead
   - **File:** `app/api/maya/generate-concepts/route.ts`
   - **Impact:** More variety, better brand matching

7. **Make Authenticity Keywords Context-Aware** (MEDIUM)
   - Allow override for editorial/professional concepts
   - **Files:** `lib/maya/flux-prompt-builder.ts`, `app/api/maya/generate-concepts/route.ts`
   - **Impact:** More flexibility for different content types

### LOW PRIORITY (Monitor/Review)

8. **Review Chat Message Filtering** (LOW)
   - Ensure not too aggressive
   - Add logging to monitor

---

## 🧪 TESTING PLAN

After implementing fixes:

1. **Training Parameter Test**
   - Retrain one user's model with new parameters
   - Compare before/after: hair color accuracy, body type accuracy, age accuracy
   - If improved → roll out to all new trainings

2. **Lighting Test**
   - Generate 10 concepts with old vs new lighting descriptions
   - User feedback: which looks more appealing?
   - Adjust based on feedback

3. **Prompt Consistency Test**
   - Generate 20 concepts, check prompt length distribution
   - Verify: all prompts 35-55 words
   - Verify: features included consistently

4. **Physical Preferences Test**
   - User with "keep my natural hair color" preference
   - Generate 10 concepts
   - Verify: hair color matches user's actual hair color

---

## 📊 SUCCESS METRICS

Track these after fixes:

1. **Feature Accuracy**
   - Hair color matches user: % correct
   - Body type matches user: % correct
   - Age looks correct: % correct

2. **User Satisfaction**
   - Feedback: "looks like me" ratings
   - Generation-to-favorite ratio
   - Retraining frequency (should decrease)

3. **Training Stability**
   - Training success rate (should increase)
   - Failed training frequency (should decrease)

4. **Prompt Quality**
   - Average prompt length (target: 40-50 words)
   - Consistency score (variance in length)

---

## 🔍 FILES TO REVIEW/MODIFY

### Critical Changes Required:
- `lib/replicate-client.ts` - Training parameters
- `lib/maya/flux-prompting-principles.ts` - Lighting, prompt length, feature guidelines
- `lib/maya/personality.ts` - Prompt length, feature guidelines
- `lib/maya/flux-prompt-builder.ts` - Physical preferences processing
- `app/api/maya/generate-concepts/route.ts` - Scandinavian filter, authenticity keywords

### Review/Verify:
- `app/api/maya/chat/route.ts` - Message filtering
- `lib/maya/quality-settings.ts` - Settings verification
- `lib/maya/get-user-context.ts` - Context building (looks good, no changes needed)

---

## 📝 NOTES

- Many issues stem from December 12, 2025 changes (lighting, authenticity keywords)
- Training parameters have been problematic for longer (but exposed by prompt changes)
- Physical preferences issue likely existed before but worsened with recent changes
- Prioritize training parameters fix - this likely has the biggest impact on quality

---

**Next Steps:**
1. Implement training parameter fixes
2. Test with one user's retraining
3. If successful, implement lighting fixes
4. Continue with other fixes in priority order
5. Monitor metrics and adjust as needed
