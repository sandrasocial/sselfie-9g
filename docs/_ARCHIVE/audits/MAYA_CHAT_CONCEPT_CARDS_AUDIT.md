# 🎯 MAYA CHAT & CONCEPT CARDS AUDIT
## Impact Assessment for Prompt Authority Lock-In

**Date:** 2026-01-XX  
**Objective:** Determine if Maya chat and concept cards are affected by Prompt Authority Lock-In plan

---

## EXECUTIVE SUMMARY

**VERDICT:** Maya chat and concept cards ARE affected, but impact is LOW RISK.

**Key Finding:** Maya's prompt generation systems already include identity anchors. The identity anchor injection logic in `nano-banana-client.ts` is redundant for Maya paths but may catch edge cases.

**Recommendation:** Preserve identity anchor injection logic but make it explicit and scoped to non-Feed-Planner paths only.

---

## 1. MAYA CHAT & CONCEPT CARDS PROMPT GENERATION

### Maya Chat (Studio Pro Mode)

**Entry Point:** `app/api/maya/generate-studio-pro/route.ts`  
**Prompt Source:** `userRequest` parameter (from Maya's prompt generation)  
**Transmission:** `generateWithNanoBanana()` (line 185)

**Prompt Generation Flow:**
```
Maya Chat UI
  → Maya generates prompt (via prompt-authority.ts or nano-banana-prompt-builder.ts)
  → Prompt includes identity anchor: "Use the uploaded photos as strict identity reference"
  → generate-studio-pro/route.ts receives prompt
  → generateWithNanoBanana() called
  → nano-banana-client.ts:85-102 checks if Feed Planner prompt
  → If NOT Feed Planner AND has reference images, adds identity anchor
  → Replicate API
```

**Evidence:**
- `lib/maya/prompt-authority.ts:887` - System prompt requires identity anchor: "Start with 'Use the uploaded photos as strict identity reference' (MANDATORY)"
- `lib/maya/prompt-authority.ts:922` - Structure requires identity anchor first
- `lib/maya/nano-banana-prompt-builder.ts:135-149` - Builder includes identity anchor in structure

**Current Behavior:** Maya prompts already include identity anchors, so injection logic is redundant but harmless.

---

### Concept Cards

**Entry Point:** `app/api/maya/generate-concepts/route.ts`  
**Prompt Source:** Maya generates prompts via `generateConceptCardsViaAuthority()`  
**Transmission:** `generateWithNanoBanana()` (line 68, used in generation flow)

**Prompt Generation Flow:**
```
Concept Card Generation
  → generateConceptCardsViaAuthority() (prompt-authority.ts)
  → Maya generates prompts with identity anchors
  → generateWithNanoBanana() called for each concept
  → nano-banana-client.ts:85-102 checks if Feed Planner prompt
  → If NOT Feed Planner AND has reference images, adds identity anchor
  → Replicate API
```

**Evidence:**
- `app/api/maya/generate-concepts/route.ts:60` - Uses `generateConceptCardsViaAuthority()` from prompt-authority
- `lib/maya/prompt-authority.ts:887` - Requires identity anchor for Pro Mode
- Concept cards use Pro Mode (Nano Banana Pro)

**Current Behavior:** Concept card prompts already include identity anchors, so injection logic is redundant but harmless.

---

### Maya Pro Mode Generate Image

**Entry Point:** `app/api/maya/pro/generate-image/route.ts`  
**Prompt Source:** `fullPrompt` parameter (from Maya's prompt generation)  
**Transmission:** `generateWithNanoBanana()` (line 109)

**Prompt Generation Flow:**
```
Maya Pro Mode Image Generation
  → routeProModeImagePromptViaAuthority() (prompt-authority.ts:97)
  → Maya generates prompt with identity anchor
  → generateWithNanoBanana() called
  → nano-banana-client.ts:85-102 checks if Feed Planner prompt
  → If NOT Feed Planner AND has reference images, adds identity anchor
  → Replicate API
```

**Evidence:**
- `app/api/maya/pro/generate-image/route.ts:97` - Routes through `routeProModeImagePromptViaAuthority()`
- `lib/maya/prompt-authority.ts:887` - Requires identity anchor for Pro Mode

**Current Behavior:** Maya Pro Mode prompts already include identity anchors, so injection logic is redundant but harmless.

---

## 2. IDENTITY ANCHOR INJECTION LOGIC ANALYSIS

### Current Implementation

**Location:** `lib/nano-banana-client.ts:85-102`

**Logic:**
```typescript
const isFeedPlannerPrompt = promptLower.includes('reference images') || 
                           promptLower.includes('3x3 photo grid') ||
                           promptLower.includes('person from the reference images')

if (!isFeedPlannerPrompt && hasReferenceImages) {
  finalPrompt = `A realistic photo of the person shown in the reference images. ${finalPrompt}`
}
```

**Detection Method:** String matching (fragile)

**Injection Condition:** NOT Feed Planner AND has reference images

---

### Impact on Maya Chat & Concept Cards

**Scenario 1: Maya Prompt Already Has Identity Anchor**
- Detection: `promptLower.includes('reference images')` = TRUE
- Result: `isFeedPlannerPrompt` = TRUE (incorrectly detected as Feed Planner)
- Injection: SKIPPED (prompt used as-is)
- **Outcome:** ✅ CORRECT - No duplicate anchor added

**Scenario 2: Maya Prompt Missing Identity Anchor (Edge Case)**
- Detection: `promptLower.includes('reference images')` = FALSE
- Result: `isFeedPlannerPrompt` = FALSE
- Injection: ADDED (if reference images present)
- **Outcome:** ✅ CORRECT - Missing anchor added

**Scenario 3: Maya Prompt Has Different Identity Anchor Phrasing**
- Detection: Depends on exact phrasing
- Result: May or may not be detected
- Injection: May add duplicate anchor
- **Outcome:** ⚠️ RISK - Duplicate anchor possible

---

## 3. AFFECTED SYSTEMS

### Systems Using `generateWithNanoBanana()`

| System | Entry Point | Prompt Source | Has Identity Anchor? | Affected? |
|--------|-------------|---------------|---------------------|----------|
| **Feed Planner (Preview)** | `generate-single/route.ts:1259` | `prompt-shaper.ts` | ✅ YES | ✅ YES (primary target) |
| **Feed Planner (Single Scene)** | `generate-single/route.ts:1259` | `prompt-shaper.ts` | ✅ YES | ✅ YES (primary target) |
| **Maya Chat (Studio Pro)** | `generate-studio-pro/route.ts:185` | `prompt-authority.ts` | ✅ YES | ⚠️ INDIRECT |
| **Concept Cards** | `generate-concepts/route.ts` | `prompt-authority.ts` | ✅ YES | ⚠️ INDIRECT |
| **Maya Pro Mode** | `pro/generate-image/route.ts:109` | `prompt-authority.ts` | ✅ YES | ⚠️ INDIRECT |
| **Photoshoot Grid** | `pro/photoshoot/generate-grid/route.ts:232` | Maya generation | ✅ YES | ⚠️ INDIRECT |

**All systems currently include identity anchors in their prompts.**

---

## 4. RISK ASSESSMENT

### Risk 1: Removing Identity Anchor Injection Breaks Edge Cases

**Probability:** LOW  
**Impact:** MEDIUM

**Scenario:** If Maya's prompt generation fails to include identity anchor (bug, edge case, or future change), removing injection logic would cause generation failures.

**Mitigation:** 
- Maya prompts already include identity anchors (verified)
- Injection logic is redundant but provides safety net
- Recommendation: Keep injection but make it explicit and scoped

---

### Risk 2: String Matching False Positives

**Probability:** MEDIUM  
**Impact:** LOW

**Scenario:** Maya prompt contains "reference images" but is not Feed Planner prompt. Detection incorrectly marks it as Feed Planner, skipping injection (which is fine since it already has anchor).

**Current Impact:** None (Maya prompts already have anchors)

**Future Impact:** If Maya prompts change structure, false detection could cause issues.

**Mitigation:** Improve detection logic or remove it entirely (since Maya prompts always have anchors).

---

### Risk 3: Duplicate Identity Anchors

**Probability:** LOW  
**Impact:** LOW

**Scenario:** Maya prompt has identity anchor with different phrasing, detection fails, injection adds second anchor.

**Current Impact:** Minimal (duplicate anchor is redundant but not harmful)

**Future Impact:** Could cause confusion or prompt bloat.

**Mitigation:** Improve detection or remove injection (since Maya prompts always have anchors).

---

## 5. RECOMMENDATIONS

### Option A: Remove Identity Anchor Injection Entirely (RECOMMENDED)

**Rationale:**
- All prompt sources (Feed Planner, Maya) already include identity anchors
- Injection logic is redundant
- Removes fragile string matching
- Simplifies codebase

**Implementation:**
- Remove lines 85-102 from `nano-banana-client.ts`
- Keep prompt trimming (line 81)
- Add validation that prompts include identity anchor (fail hard if missing)

**Risk:** LOW - All current prompt sources include anchors

**Verification:** Test Maya chat, concept cards, and Feed Planner generation after removal

---

### Option B: Preserve Injection but Make Explicit (ALTERNATIVE)

**Rationale:**
- Provides safety net for edge cases
- Handles future prompt source changes
- Maintains backward compatibility

**Implementation:**
- Keep injection logic but improve detection
- Add explicit source tagging (e.g., `[SOURCE:feed-planner]` or `[SOURCE:maya]`)
- Only inject for non-Feed-Planner, non-Maya paths (if any exist)

**Risk:** LOW - Maintains current behavior

**Verification:** Ensure detection logic correctly identifies all prompt sources

---

### Option C: Scoped Injection (COMPROMISE)

**Rationale:**
- Removes injection for Feed Planner (primary target)
- Preserves injection for Maya paths (safety net)
- Explicit separation of concerns

**Implementation:**
- Remove injection for Feed Planner prompts (explicit check)
- Keep injection for Maya prompts (explicit check)
- Add source tagging for clarity

**Risk:** LOW - Maintains safety net while removing Feed Planner mutation

**Verification:** Test both Feed Planner and Maya paths

---

## 6. IMPACT ON PROMPT AUTHORITY LOCK-IN PLAN

### Phase 2: Remove Identity Anchor Injection

**Original Plan:** Remove lines 85-102 entirely

**Revised Recommendation:** 
- **Option A (Preferred):** Remove entirely, add validation
- **Option B (Alternative):** Keep but make explicit and scoped

**Reasoning:**
- Maya prompts already include identity anchors (verified)
- Injection is redundant but provides safety net
- Removing it simplifies architecture (aligns with lock-in goals)
- Adding validation ensures prompts always have anchors (better than injection)

---

### Validation Layer (Phase 5)

**Original Plan:** Validate identity anchor presence before transmission

**Revised Recommendation:** 
- Validate identity anchor for ALL prompts (Feed Planner and Maya)
- Hard failure if missing
- This replaces injection logic (better enforcement)

**Reasoning:**
- Ensures all prompts have identity anchors (explicit requirement)
- Fails fast if prompt generation bug occurs
- Better than silent injection (explicit errors)

---

## 7. TESTING REQUIREMENTS

### Test Case 1: Maya Chat Generation

**Test:** Generate image via Maya chat (Studio Pro mode)

**Expected:** 
- Prompt includes identity anchor from Maya generation
- No duplicate anchor added
- Generation succeeds

**After Phase 2 (Option A):**
- Prompt includes identity anchor from Maya generation
- No injection occurs
- Generation succeeds

---

### Test Case 2: Concept Card Generation

**Test:** Generate concept card images

**Expected:**
- Prompts include identity anchors from Maya generation
- No duplicate anchors added
- All generations succeed

**After Phase 2 (Option A):**
- Prompts include identity anchors from Maya generation
- No injection occurs
- All generations succeed

---

### Test Case 3: Edge Case - Missing Identity Anchor

**Test:** Simulate Maya prompt missing identity anchor (manual test)

**Current Behavior:**
- Injection adds identity anchor
- Generation succeeds

**After Phase 2 (Option A):**
- Validation fails with hard error
- Generation blocked
- Error message: "Prompt missing required identity anchor"

**Assessment:** ✅ BETTER - Explicit failure is better than silent injection

---

## 8. FINAL RECOMMENDATION

### Recommended Approach: Option A (Remove Injection, Add Validation)

**Rationale:**
1. All prompt sources already include identity anchors (verified)
2. Injection logic is redundant and fragile (string matching)
3. Validation is better than injection (explicit errors vs silent fixes)
4. Aligns with Prompt Authority Lock-In goals (no mutation, explicit failures)

**Implementation:**
1. Remove identity anchor injection logic (lines 85-102)
2. Add validation in Phase 5 that checks for identity anchor presence
3. Hard failure if identity anchor missing
4. Test Maya chat, concept cards, and Feed Planner after removal

**Risk Level:** LOW
- All current prompt sources include anchors
- Validation catches any missing anchors (better than silent injection)
- Explicit errors are better than silent fixes

**Rollback Plan:**
- If validation causes too many failures, revert to Option B (scoped injection)
- Keep validation but allow injection as fallback

---

## 9. CONCLUSION

**Maya chat and concept cards ARE affected by Prompt Authority Lock-In plan, but impact is LOW RISK.**

**Key Points:**
- ✅ Maya prompts already include identity anchors
- ✅ Injection logic is redundant for Maya paths
- ✅ Removing injection simplifies architecture
- ✅ Adding validation is better than injection
- ⚠️ Test thoroughly after Phase 2 implementation

**Recommendation:** Proceed with Phase 2 (remove injection) but add validation in Phase 5 to ensure all prompts have identity anchors.

---

**END OF AUDIT**
