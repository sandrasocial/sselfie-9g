# PHASE 2C-1 — PROMPT AUTHORITY FOUNDATION — COMPLETE ✅

**Date:** 2026-01-17  
**Status:** Foundation Complete  
**Mode:** SAFE MODE (No behavior changes)

---

## SUMMARY

Created the Prompt Authority Layer foundation at `lib/maya/prompt-authority.ts`.

**What Was Created:**
- ✅ New file: `lib/maya/prompt-authority.ts` (450+ lines)
- ✅ Three main functions: `generatePrompt()`, `validatePrompt()`, `generateBatch()`
- ✅ Audit logging (console only, no DB yet)
- ✅ Type definitions for all modes and features

**What Was NOT Changed:**
- ✅ No existing files modified
- ✅ No API routes wired yet
- ✅ No behavior changes
- ✅ No feature flags added

---

## ROUTING LOGIC EXPLANATION

### Function: `generatePrompt(mode, feature, context)`

Routes prompt generation requests to the appropriate builder based on mode and feature:

#### Classic Mode (`mode: 'classic'`)

| Feature | Builder Used | Current Status |
|---------|--------------|----------------|
| `concept-card` | `prompt-constructor.buildPrompt()` | ✅ **Implemented** - Routes to prompt-constructor |
| `image-generation` | N/A (use `validatePrompt()` instead) | ⚠️ **Redirected** - Should use validation, not generation |
| `feed-prompt` | Maya chat (not yet implemented) | ⏭️ **Deferred** - Phase 2C-3 |

**Example Flow:**
```
generatePrompt('classic', 'concept-card', {
  category: 'casual',
  vibe: 'cozy',
  location: 'coffee-shop',
  userGender: 'woman',
  ...
})
→ Calls prompt-constructor.buildPrompt()
→ Returns FLUX LoRA prompt with trigger word
```

#### Pro Mode (`mode: 'pro'`)

| Feature | Builder Used | Current Status |
|---------|--------------|----------------|
| `image-generation` | `nano-banana-prompt-builder.buildNanoBananaPrompt()` | ✅ **Implemented** - Routes to NanoBanana builder |
| `feed-prompt` | `nano-banana-prompt-builder.buildNanoBananaPrompt()` | ✅ **Implemented** - Same builder |

**Example Flow:**
```
generatePrompt('pro', 'image-generation', {
  userId: '123',
  proMode: 'brand-scene',
  userRequest: 'Create a brand scene with...',
  inputImages: { baseImages: [...] },
  ...
})
→ Calls buildNanoBananaPrompt()
→ Returns NanoBanana Pro prompt with identity preservation
```

#### Profile Image (`mode: 'profile-image'`)

| Feature | Builder Used | Current Status |
|---------|--------------|----------------|
| `profile-image` | Hardcoded template | ✅ **Implemented** - Simple hardcoded prompt |

**Example Flow:**
```
generatePrompt('profile-image', 'profile-image', {
  triggerWord: 'user_123',
})
→ Returns: "user_123, professional headshot, neutral expression, well-lit, ..."
```

#### Not Yet Implemented

| Mode | Feature | Reason |
|------|---------|--------|
| `blueprint-preview` | `blueprint-preview` | Uses Maya chat directly - Phase 2C-3 |
| `video` | `video-generation` | Uses enhanceMotionPrompt() - Phase 2C-3 |

---

### Function: `validatePrompt(prompt, mode, context)`

Validates and fixes prompts using existing validators:

**Classic Mode Validations:**
1. **Trigger Word Prefix** - Ensures prompt starts with trigger word
   - Uses: `ensureTriggerWordPrefix()` from `replicate-helpers.ts`
   
2. **Gender Validation** - Ensures gender appears after trigger word
   - Uses: `ensureGenderInPrompt()` from `replicate-helpers.ts`

**Example Flow:**
```
validatePrompt(
  "woman in casual outfit...",
  'classic',
  {
    triggerWord: 'user_123',
    userGender: 'woman',
    ethnicity: null,
  }
)
→ Applies ensureTriggerWordPrefix() → "user_123, woman in casual outfit..."
→ Applies ensureGenderInPrompt() → (already has gender, no change)
→ Returns validated prompt
```

---

### Function: `generateBatch(mode, feature, contexts)`

**Status:** ⏭️ **Deferred** - Not yet implemented

Intended for Feed Planner orchestrator (Phase 2C-4). Currently returns empty result.

---

## AUDIT LOGGING

All operations are logged to console with structured JSON:

**Log Format:**
```json
{
  "[PROMPT-AUTHORITY]": {
    "timestamp": "2026-01-17T12:00:00.000Z",
    "mode": "classic",
    "feature": "concept-card",
    "userId": "123",
    "builder": "prompt-constructor",
    "executionTimeMs": "45.23ms",
    "success": true,
    "promptLength": 342
  }
}
```

**Logged Operations:**
- ✅ All `generatePrompt()` calls
- ✅ All `validatePrompt()` calls
- ✅ Execution time (milliseconds)
- ✅ Builder used
- ✅ Success/failure status
- ✅ Errors (if any)

**Future Enhancement (Phase 2D):**
- Database logging table `prompt_authority_audit_log`
- 30-day retention
- Production-only (dev uses console)

---

## CURRENT CAPABILITIES

### ✅ Fully Implemented

1. **Classic Mode Concept Cards**
   - Routes to `prompt-constructor.buildPrompt()`
   - Returns FLUX LoRA prompts with trigger word
   - Requires: category, vibe, location

2. **Pro Mode Image/Feed Prompts**
   - Routes to `buildNanoBananaPrompt()`
   - Returns NanoBanana Pro prompts
   - Requires: userId, proMode, userRequest, inputImages

3. **Profile Image Generation**
   - Returns hardcoded template
   - Requires: triggerWord

4. **Prompt Validation**
   - Applies trigger word and gender fixes
   - Uses existing `replicate-helpers.ts` functions
   - Returns validated prompt with fixes list

### ⏭️ Deferred to Future Phases

1. **Maya Chat Integration** (Phase 2C-3)
   - Classic Mode feed prompts
   - Blueprint preview generation
   - Concept card Maya stage (two-stage process)

2. **Template Injection** (Phase 2C-3)
   - Feed style template injection
   - Aesthetic locking

3. **Video Generation** (Phase 2C-3)
   - Extract `enhanceMotionPrompt()` to Authority Layer

4. **Batch Generation** (Phase 2C-4)
   - Feed Planner orchestrator integration

---

## NEXT STEPS

### Phase 2C-2: Low-Risk Migrations (Week 2)
1. Wire profile image generation → Authority Layer
2. Wire single post validation → Authority Layer
3. Wire Pro Mode generation → Authority Layer

### Phase 2C-3: Medium-Risk Migrations (Week 3-4)
1. Integrate Maya chat for feed prompts
2. Integrate blueprint preview generation
3. Extract video enhancement function

### Phase 2C-4: High-Risk Migrations (Week 5-6+)
1. Integrate concept card generation (two-stage)
2. Integrate Feed Planner orchestrator
3. Add feature flags for safe rollout

---

## VERIFICATION

✅ **File Created:** `lib/maya/prompt-authority.ts`  
✅ **No Linting Errors:** Verified clean  
✅ **No Existing Files Modified:** Safe mode maintained  
✅ **Type Safety:** All types exported and used correctly  
✅ **Audit Logging:** Console logging implemented  
✅ **Routing Logic:** Clear separation of modes and features  

---

## FILES TOUCHED

**Created:**
- ✅ `lib/maya/prompt-authority.ts` (450+ lines)
- ✅ `docs/_CANONICAL/PHASE_2C1_PROMPT_AUTHORITY_FOUNDATION.md` (this file)

**Modified:**
- ✅ None (safe mode)

---

**Phase 2C-1 Complete** ✅

**Foundation is ready for Phase 2C-2 wiring.**
