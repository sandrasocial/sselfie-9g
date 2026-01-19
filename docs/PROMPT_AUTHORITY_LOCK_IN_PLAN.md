# 🎯 PROMPT AUTHORITY LOCK-IN IMPLEMENTATION PLAN
## Architectural Enforcement Plan

**Date Created:** 2026-01-XX  
**Date Implemented:** 2026-01-19  
**Status:** ✅ COMPLETE + OPTIMIZED  
**Objective:** Enforce single Prompt Authority without changing prompt content or behavior

---

## 📋 IMPLEMENTATION STATUS UPDATE (2026-01-19)

**✅ COMPLETED:**
1. Prompt Authority Lock-In (all bypass paths removed)
2. Nano Banana Pro optimization (preview prompt length reduced from ~760 to ~300-450 words)
3. JSONB type mismatch fixes (personal brand updates working)
4. Validation thresholds updated for optimal Nano Banana Pro performance

**Key Changes:**
- Preview prompts now use concise scene blocks (25-35 words each) instead of verbose blocks (60-80 words)
- Validation adjusted from 450-750 words to 120-500 words (optimal: 300-450) for preview mode
- See `NANO_BANANA_PRO_OPTIMIZATION_SUMMARY.md` for complete details

---

## ORIGINAL PLAN (EXECUTED)

---

## 1. PROMPT AUTHORITY DEFINITION

### Single Authoritative Prompt Generator

**File:** `lib/feed-planner/prompt-shaper.ts`  
**Function:** `buildPromptFromScene()`  
**Lines:** 74-98

**Sub-functions (internal to prompt-shaper.ts only):**
- `buildPreviewMultiPrompt()` - Lines 123-214
- `buildSingleScenePrompt()` - Lines 237-315
- Helper functions (lines 317-801): `buildSceneExecutionBlock()`, `buildOutfitBlock()`, `buildSettingBlock()`, `buildCompositionBlock()`, `buildTechnicalBlock()`

### Allowed Prompt Construction Paths

**Path 1: Preview Feed Prompt**
```
lib/feed-planner/scene-consistency.ts:buildPreviewPromptFromScenes()
  → lib/feed-planner/prompt-shaper.ts:buildPromptFromScene('preview_multi')
  → lib/feed-planner/prompt-shaper.ts:buildPreviewMultiPrompt()
```

**Path 2: Single Scene Prompt**
```
lib/feed-planner/scene-consistency.ts:buildSingleScenePromptFromScene()
  → lib/feed-planner/prompt-shaper.ts:buildPromptFromScene('single_scene')
  → lib/feed-planner/prompt-shaper.ts:buildSingleScenePrompt()
```

**Entry Points (allowed to call scene-consistency functions):**
- `app/api/feed/[feedId]/generate-single/route.ts` (lines 447, 566, 604, 635)

### Files/Functions That MUST NEVER Generate or Mutate Prompts

**FORBIDDEN - Prompt Generation:**
- `lib/feed-planner/nano-banana-adapter.ts:buildPreviewMultiScenePrompt()` (line 548)
- `lib/feed-planner/nano-banana-adapter.ts:buildSingleScenePrompt()` (line 844)
- `lib/feed-planner/nano-banana-adapter.ts:adaptFeedPlannerTemplate()` (line 47)

**FORBIDDEN - Prompt Mutation:**
- `lib/nano-banana-client.ts:generateWithNanoBanana()` (lines 92-95) - Identity anchor injection
- Any function that modifies prompt text after `buildPromptFromScene()` returns

**FORBIDDEN - Prompt Reuse:**
- `app/api/feed/[feedId]/generate-single/route.ts` (line 421) - Database prompt reuse: `finalPrompt = post.prompt`

**FORBIDDEN - Prompt Validation/Modification:**
- Any function that "fixes" or "enhances" prompts from `prompt-shaper.ts`
- Any function that adds/removes identity anchors from Feed Planner prompts
- Any function that truncates or summarizes prompts from `prompt-shaper.ts`

---

## 2. CURRENT STATE → TARGET STATE DIFF (STRUCTURAL)

| Area | Current Behavior | Target Behavior | Evidence (file + line) |
|------|------------------|-----------------|------------------------|
| **Prompt Generation** | Two systems: `prompt-shaper.ts` (canonical) and `nano-banana-adapter.ts` (legacy) both generate prompts | Only `prompt-shaper.ts:buildPromptFromScene()` generates prompts | `prompt-shaper.ts:74-98`, `nano-banana-adapter.ts:548-844` |
| **Prompt Mutation** | `nano-banana-client.ts` conditionally injects identity anchor based on string matching | No mutation of Feed Planner prompts. Prompts pass through unchanged. | `nano-banana-client.ts:85-95` |
| **Prompt Reuse (Database)** | `generate-single/route.ts` reuses `post.prompt` from database if length > 50 chars (line 421) | All prompts regenerated via canonical builder. Database prompts never reused. | `generate-single/route.ts:419-425` |
| **Prompt Validation** | No validation. Word counts logged but not enforced. Structure not validated. | Structural validation before transmission. Hard failure on invalid prompts. | `prompt-shaper.ts:210-211`, `prompt-shaper.ts:310-311` |
| **Prompt Transmission** | Prompts sent to Replicate via `generateWithNanoBanana()` after optional mutation | Prompts validated then transmitted unchanged. No mutation layer. | `nano-banana-client.ts:109-116`, `generate-single/route.ts:1259-1276` |
| **Scene Resolution Failure** | Fallback creates placeholder prompts: "[MISSING - Position X not resolved]" | Hard failure if scene resolution fails. No placeholder prompts. | `prompt-shaper.ts:162-172` |
| **Flatlay Identity Anchor** | Identity anchor omitted for flatlay scenes (conditional check) | All prompts MUST start with identity anchor per spec. Flatlay exception removed. | `prompt-shaper.ts:242-248` |

---

## 3. BYPASS PATH ELIMINATION PLAN

### Bypass Path 1: Database Prompt Reuse

**Location:** `app/api/feed/[feedId]/generate-single/route.ts:419-425`

**Current Behavior:**
```typescript
else if (!access.isPaidBlueprint && post.prompt && post.prompt.length > 50) {
  finalPrompt = post.prompt  // BYPASS: Uses stored prompt
  chosenPromptSource = "db_prompt"
}
```

**Why It Violates Prompt Authority:**
- Bypasses canonical builder entirely
- Uses potentially invalid/outdated prompts
- No validation that stored prompt matches spec
- Creates inconsistency (some prompts canonical, some from database)

**Required Action:** REMOVE
- Delete lines 419-425
- Force all prompts through canonical builder
- Never read `post.prompt` for reuse

---

### Bypass Path 2: Legacy Adapter Functions

**Location:** `lib/feed-planner/nano-banana-adapter.ts:548-844`

**Current Behavior:**
- `buildPreviewMultiScenePrompt()` exists with different structure
- `buildSingleScenePrompt()` exists with different structure (duplicate name)
- Functions marked FROZEN but still callable

**Why It Violates Prompt Authority:**
- Creates architectural confusion
- Different prompt structure than canonical system
- Different word count targets (180-240 vs 500-700 for preview)
- Duplicate function names create uncertainty

**Required Action:** HARD FAILURE
- Add guard at function entry that throws error
- Error message: "nano-banana-adapter prompt builders are deprecated. Use prompt-shaper.ts:buildPromptFromScene()"
- Prevent any code path from calling these functions

---

### Bypass Path 3: Conditional Identity Anchor Injection

**Location:** `lib/nano-banana-client.ts:85-102`

**Current Behavior:**
```typescript
const isFeedPlannerPrompt = promptLower.includes('reference images') || 
                           promptLower.includes('3x3 photo grid')
if (!isFeedPlannerPrompt && hasReferenceImages) {
  finalPrompt = `A realistic photo of the person shown in the reference images. ${finalPrompt}`
}
```

**Why It Violates Prompt Authority:**
- Mutates prompts after canonical builder
- Fragile detection (string matching can fail)
- Assumes prompts from canonical builder might be missing identity anchor
- Violates "no mutation" principle

**Required Action:** REMOVE
- Delete lines 85-102
- Assume all Feed Planner prompts already have identity anchors
- Pass prompts through unchanged

---

### Bypass Path 4: Flatlay Identity Anchor Exception

**Location:** `lib/feed-planner/prompt-shaper.ts:242-248`

**Current Behavior:**
```typescript
if (scene.camera.framing !== 'flatlay') {
  parts.push('A portrait photograph of the person from the reference images...')
}
```

**Why It Violates Prompt Authority:**
- Spec requires "MUST start with identity anchor" (no exceptions)
- Flatlay prompts violate spec structure
- Creates inconsistency in prompt format

**Required Action:** REMOVE CONDITIONAL
- Always add identity anchor regardless of framing
- Flatlay prompts must also start with identity anchor per spec

---

### Bypass Path 5: Placeholder Fallback Logic

**Location:** `lib/feed-planner/prompt-shaper.ts:162-172`

**Current Behavior:**
```typescript
if (allScenes && allScenes.length >= 9) {
  // Build 9 scenes
} else {
  // Fallback: Add placeholder positions 2-9
  parts.push(`Position ${i}: [MISSING - Position ${i} not resolved]`)
}
```

**Why It Violates Prompt Authority:**
- Creates invalid prompts with placeholder text
- Silent failure (prompt generated but invalid)
- Should fail hard instead of generating invalid output

**Required Action:** HARD FAILURE
- Remove fallback logic
- Throw error if `allScenes.length < 9` for preview mode
- Error message: "Preview mode requires exactly 9 scenes. Got: {count}"

---

### Bypass Path 6: Word Count Logging Only

**Location:** `lib/feed-planner/prompt-shaper.ts:210-211`, `prompt-shaper.ts:310-311`

**Current Behavior:**
```typescript
const wordCount = prompt.split(/\s+/).length
console.log(`[PROMPT-SHAPER] Preview prompt generated: ${wordCount} words (target: 500-700)`)
```

**Why It Violates Prompt Authority:**
- Logs word count but doesn't enforce
- Invalid prompts can be generated silently
- No validation that prompts match spec requirements

**Required Action:** VALIDATION + ENFORCEMENT
- Add validation function that checks word count ranges
- Hard failure if word count outside target range
- Validation must occur before prompt is returned

---

## 4. LEGACY CODE DISPOSITION STRATEGY

### Legacy System 1: nano-banana-adapter.ts Prompt Builders

**File:** `lib/feed-planner/nano-banana-adapter.ts`

**Current Status:** FROZEN (marked in header comments lines 4-8, 21-22)

**Risk of Leaving in Place:**
- HIGH: Functions still callable, creates architectural confusion
- Developers may accidentally use legacy builders
- Duplicate function names (`buildSingleScenePrompt`) create uncertainty
- Different prompt structures violate single authority principle

**Required Disposition:** GUARD BEHIND HARD FAILURE
- Add guard at function entry points (lines 548, 844)
- Throw error: "ERROR: nano-banana-adapter prompt builders are deprecated. Use prompt-shaper.ts:buildPromptFromScene() instead."
- Do NOT delete file (may contain other non-prompt logic)
- Prevent any code path from calling these functions

**Evidence:** File header explicitly states duplication (line 21-22)

---

### Legacy System 2: Identity Anchor Injection Logic

**File:** `lib/nano-banana-client.ts`

**Current Status:** ACTIVE (lines 85-102)

**Risk of Leaving in Place:**
- MEDIUM: Mutates prompts after canonical builder
- Fragile detection logic can fail
- Assumes canonical builder might produce invalid prompts

**Required Disposition:** REMOVE
- Delete lines 85-102 (identity anchor injection logic)
- Keep prompt trimming (line 81) - acceptable
- Assume all Feed Planner prompts already have identity anchors

**Evidence:** Audit shows canonical builder always includes identity anchors (prompt-shaper.ts:127-131, 242-248)

---

### Legacy System 3: Database Prompt Storage

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Current Status:** ACTIVE (lines 468-472, 1282-1288)

**Risk of Leaving in Place:**
- LOW: Storage itself is fine, reuse is the problem
- Database storage is acceptable for logging/debugging
- Only reuse path (line 421) violates authority

**Required Disposition:** KEEP STORAGE, REMOVE REUSE
- Keep prompt storage to database (lines 468-472, 1282-1288)
- Remove prompt reuse path (lines 419-425)
- Database prompts are for logging only, never for reuse

**Evidence:** Audit shows reuse bypasses canonical builder (line 421)

---

## 5. VALIDATION & ENFORCEMENT LAYER PLAN

### Validation Point 1: After Prompt Generation (prompt-shaper.ts)

**Location:** `lib/feed-planner/prompt-shaper.ts:buildPromptFromScene()` (after line 97, before return)

**What Must Be Validated:**

1. **Identity Anchor Presence**
   - Check: Prompt starts with identity anchor text
   - Pattern: Must contain "reference images" or "person from the reference images"
   - Failure: Hard error - "Prompt missing required identity anchor"

2. **Word Count Range**
   - Preview mode: 500-700 words
   - Single scene mode: 200-270 words
   - Failure: Hard error - "Prompt word count {actual} outside required range [{min}-{max}]"

3. **Scene Count (Preview Mode Only)**
   - Check: If mode === 'preview_multi', prompt must reference 9 scenes
   - Pattern: Count occurrences of "Position" or scene indicators
   - Failure: Hard error - "Preview prompt must contain exactly 9 scene descriptions"

4. **Structure Blocks (Single Scene Mode)**
   - Check: Prompt contains outfit, setting, composition, technical blocks
   - Pattern: Check for key phrases (outfit description, location, camera angle, DSLR)
   - Failure: Hard error - "Prompt missing required structure blocks"

5. **No Placeholder Text**
   - Check: Prompt does not contain "[MISSING" or "[PLACEHOLDER"
   - Failure: Hard error - "Prompt contains placeholder text - scene resolution failed"

**Failure Action:** Throw error, prevent prompt from being returned

---

### Validation Point 2: Before Transmission (nano-banana-client.ts)

**Location:** `lib/nano-banana-client.ts:generateWithNanoBanana()` (after line 81, before line 109)

**What Must Be Validated:**

1. **Prompt Not Empty**
   - Check: `input.prompt.trim().length > 0`
   - Failure: Hard error - "Prompt is empty"

2. **Prompt Source Tagging (Optional - for debugging)**
   - Check: Prompt contains metadata tag indicating source
   - Pattern: Add `[PROMPT_SOURCE:prompt-shaper.ts]` tag (for logging only)
   - Failure: Warning only - "Prompt missing source tag"

**Failure Action:** Hard error for empty prompt, warning for missing tag

---

### Validation Point 3: Route Handler Entry (generate-single/route.ts)

**Location:** `app/api/feed/[feedId]/generate-single/route.ts` (before line 432)

**What Must Be Validated:**

1. **No Database Prompt Reuse**
   - Check: `finalPrompt` is null or empty before canonical builder call
   - Failure: Hard error - "Database prompt reuse detected - must use canonical builder"

2. **Scene Resolution Success (Preview Mode)**
   - Check: If `isPreviewFeed`, scenes array must have length === 9
   - Failure: Hard error - "Preview feed requires exactly 9 scenes. Got: {count}"

**Failure Action:** Hard error, prevent generation

---

### Flatlay Handling (Explicit)

**Current Behavior:** Identity anchor omitted for flatlay scenes (`prompt-shaper.ts:242-248`)

**Required Change:** Remove conditional, always include identity anchor

**Validation:** All prompts (including flatlay) must start with identity anchor

**Failure Action:** Hard error if flatlay prompt missing identity anchor

---

## 6. ORDER OF OPERATIONS (EXECUTION SEQUENCE)

### Phase 1: Remove Database Prompt Reuse

**Objective:** Eliminate bypass path that uses stored prompts

**Systems Touched:**
- `app/api/feed/[feedId]/generate-single/route.ts` (lines 419-425)

**Actions:**
1. Remove database prompt reuse check (lines 419-425)
2. Force all prompts through canonical builder
3. Keep database storage (for logging) but never read for reuse

**Verification:**
- All prompts in `generate-single/route.ts` come from canonical builder
- No code path reads `post.prompt` for reuse
- Database storage still occurs (for logging/debugging)

**Prerequisite:** None

---

### Phase 2: Remove Identity Anchor Injection

**Objective:** Eliminate prompt mutation layer

**Systems Touched:**
- `lib/nano-banana-client.ts` (lines 85-102)

**Actions:**
1. Remove identity anchor injection logic (lines 85-102)
2. Keep prompt trimming (line 81)
3. Assume all Feed Planner prompts already have identity anchors

**Verification:**
- No prompt mutation occurs in `nano-banana-client.ts`
- Prompts pass through unchanged
- Logging confirms prompts already have identity anchors

**Prerequisite:** Phase 1 complete (ensures all prompts come from canonical builder)

---

### Phase 3: Fix Flatlay Identity Anchor Exception

**Objective:** Ensure all prompts (including flatlay) start with identity anchor

**Systems Touched:**
- `lib/feed-planner/prompt-shaper.ts` (lines 242-248)

**Actions:**
1. Remove conditional check `if (scene.camera.framing !== 'flatlay')`
2. Always add identity anchor regardless of framing type
3. Update comment to reflect change

**Verification:**
- All prompts (including flatlay) start with identity anchor
- No conditional logic skips identity anchor

**Prerequisite:** Phase 2 complete (ensures no mutation layer adds anchors)

---

### Phase 4: Add Hard Failure for Scene Resolution Failures

**Objective:** Prevent placeholder prompts from being generated

**Systems Touched:**
- `lib/feed-planner/prompt-shaper.ts` (lines 162-172)
- `app/api/feed/[feedId]/generate-single/route.ts` (line 451)

**Actions:**
1. Remove fallback logic in `buildPreviewMultiPrompt()` (lines 162-172)
2. Add validation in route handler: if `isPreviewFeed`, verify `scenes.length === 9`
3. Throw error if scene count incorrect

**Verification:**
- No placeholder prompts generated
- Hard error if scene resolution fails
- Error messages clearly indicate scene count mismatch

**Prerequisite:** Phase 1 complete (ensures canonical builder is always used)

---

### Phase 5: Add Prompt Validation Layer

**Objective:** Enforce prompt structure and word count before transmission

**Systems Touched:**
- `lib/feed-planner/prompt-shaper.ts` (after line 97)
- New validation function (create in prompt-shaper.ts)

**Actions:**
1. Create `validatePromptStructure()` function
2. Call validation after prompt generation, before return
3. Validate: identity anchor, word count, scene count (preview), structure blocks (single)
4. Throw hard error on validation failure

**Verification:**
- All prompts validated before being returned
- Invalid prompts cause hard errors
- Validation errors include specific failure reason

**Prerequisite:** Phases 1-4 complete (ensures prompts come from canonical builder)

---

### Phase 6: Guard Legacy Adapter Functions

**Objective:** Prevent legacy prompt builders from being called

**Systems Touched:**
- `lib/feed-planner/nano-banana-adapter.ts` (lines 548, 844)

**Actions:**
1. Add guard at entry point of `buildPreviewMultiScenePrompt()` (line 548)
2. Add guard at entry point of `buildSingleScenePrompt()` (line 844)
3. Throw error: "ERROR: nano-banana-adapter prompt builders are deprecated. Use prompt-shaper.ts:buildPromptFromScene() instead."
4. Verify no code paths call these functions

**Verification:**
- Legacy functions throw errors if called
- No code paths call legacy builders
- Error messages direct developers to canonical builder

**Prerequisite:** Phase 5 complete (ensures validation layer exists)

---

### Phase 7: Add Transmission Validation

**Objective:** Final validation before sending to Replicate

**Systems Touched:**
- `lib/nano-banana-client.ts` (after line 81)

**Actions:**
1. Add validation: prompt not empty
2. Add optional source tag check (warning only)
3. Hard error if prompt empty

**Verification:**
- Empty prompts cause hard errors
- All prompts validated before transmission

**Prerequisite:** Phase 5 complete (ensures validation layer exists)

---

## 7. RISK & ROLLBACK CONSIDERATIONS

### Risk 1: Breaking Existing Generations

**What Could Break:**
- Users with stored prompts in database may see errors if reuse path removed
- Preview feeds that previously worked may fail if scene resolution validation added

**Acceptable vs Blocking:**
- **Acceptable:** Users see error and must regenerate (one-time impact)
- **Blocking:** If error rate > 10% of generations, rollback Phase 1

**Mitigation:**
- Phase 1 removes reuse but keeps storage (prompts still logged)
- Errors will be explicit ("Scene resolution failed" not silent failure)

**Safe Checkpoint:** After Phase 1, verify error rate < 5%

---

### Risk 2: Flatlay Prompts Breaking

**What Could Break:**
- Flatlay scenes that previously worked without identity anchor may fail
- Identity anchor may not make sense for flatlay content

**Acceptable vs Blocking:**
- **Acceptable:** Flatlay prompts include identity anchor per spec (may need prompt content adjustment)
- **Blocking:** If flatlay generation failure rate > 20%, investigate prompt content

**Mitigation:**
- Phase 3 adds identity anchor but doesn't change prompt content
- If failures occur, may need to adjust identity anchor wording for flatlay

**Safe Checkpoint:** After Phase 3, verify flatlay generation success rate

---

### Risk 3: Validation Too Strict

**What Could Break:**
- Word count validation may reject valid prompts that are slightly outside range
- Structure validation may fail on edge cases

**Acceptable vs Blocking:**
- **Acceptable:** Hard failures with clear error messages (better than silent failures)
- **Blocking:** If validation rejects > 5% of valid prompts, adjust validation thresholds

**Mitigation:**
- Validation ranges match spec requirements (500-700, 200-270)
- Error messages include actual values for debugging

**Safe Checkpoint:** After Phase 5, verify validation rejection rate < 2%

---

### Risk 4: Legacy Code Still Called

**What Could Break:**
- If legacy adapter functions are called from unknown code paths, errors will be thrown
- May break features that weren't audited

**Acceptable vs Blocking:**
- **Acceptable:** Errors expose hidden code paths that violate authority
- **Blocking:** If critical features break, investigate and fix calling code

**Mitigation:**
- Phase 6 adds guards with clear error messages
- Errors will identify which code path called legacy function

**Safe Checkpoint:** After Phase 6, verify no errors from legacy function calls

---

### Rollback Strategy

**If Any Phase Fails:**
1. Revert specific phase changes
2. Investigate failure cause
3. Fix issue and re-deploy phase
4. Do NOT proceed to next phase until current phase stable

**If Multiple Phases Fail:**
1. Revert all phases
2. Re-audit system to identify root cause
3. Revise implementation plan
4. Re-deploy phases one at a time

**No Partial Rollback:**
- Each phase is independent and can be rolled back separately
- Do not rollback entire system if only one phase fails

---

## 8. DEFINITION OF "DONE"

### Criterion 1: Single Prompt Authority

**Test:** All prompts originate from `prompt-shaper.ts:buildPromptFromScene()`

**Verification:**
- Search codebase for prompt generation: `grep -r "buildPreviewMultiScenePrompt\|buildSingleScenePrompt" --exclude="prompt-shaper.ts"`
- Result: No matches (except in prompt-shaper.ts and guarded legacy functions)
- Search for database prompt reuse: `grep -r "post.prompt" app/api/feed`
- Result: Only storage operations, no reuse operations

**Status:** ✅ Complete when no bypass paths exist

---

### Criterion 2: No Conflicting Systems

**Test:** Legacy prompt builders cannot be called

**Verification:**
- Attempt to call `nano-banana-adapter.ts:buildPreviewMultiScenePrompt()`
- Result: Error thrown with clear message
- Search for imports: `grep -r "from.*nano-banana-adapter" --include="*.ts"`
- Result: No imports of prompt builder functions

**Status:** ✅ Complete when legacy functions throw errors

---

### Criterion 3: No Silent Failures

**Test:** Invalid prompts cause explicit errors

**Verification:**
- Test with invalid scene count (preview mode with < 9 scenes)
- Result: Hard error "Preview feed requires exactly 9 scenes"
- Test with missing identity anchor
- Result: Hard error "Prompt missing required identity anchor"
- Test with word count outside range
- Result: Hard error "Prompt word count {actual} outside required range"

**Status:** ✅ Complete when all invalid prompts cause hard errors

---

### Criterion 4: No Prompt Mutation

**Test:** Prompts pass through unchanged after canonical builder

**Verification:**
- Add logging before/after `generateWithNanoBanana()` call
- Result: Prompt text identical (no modification)
- Search for prompt mutation: `grep -r "finalPrompt.*=" lib/nano-banana-client.ts`
- Result: No assignment to `finalPrompt` after canonical builder

**Status:** ✅ Complete when no mutation occurs

---

### Criterion 5: All Nano Banana Pro Prompts from One Authority

**Test:** All prompts sent to Replicate originate from canonical builder

**Verification:**
- Add source tag to prompts: `[PROMPT_SOURCE:prompt-shaper.ts]`
- Check Replicate API logs for prompt source tags
- Result: 100% of prompts have canonical source tag
- Check for prompts without source tag
- Result: 0 prompts without source tag

**Status:** ✅ Complete when 100% of prompts have canonical source

---

### Final Verification Checklist

- [ ] No database prompt reuse paths exist
- [ ] No identity anchor injection occurs
- [ ] All prompts (including flatlay) start with identity anchor
- [ ] No placeholder prompts generated
- [ ] Word count validation enforced
- [ ] Structure validation enforced
- [ ] Legacy adapter functions throw errors if called
- [ ] All prompts validated before transmission
- [ ] No prompt mutation after canonical builder
- [ ] 100% of prompts originate from `prompt-shaper.ts`

**Status:** ✅ Complete when all checkboxes verified

---

**END OF IMPLEMENTATION PLAN**
