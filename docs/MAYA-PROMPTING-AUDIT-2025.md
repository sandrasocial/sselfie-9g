# Maya Prompting Pipeline Audit - January 2025

## Executive Summary

**Date:** January 2025  
**Issue:** Maya's prompting quality has degraded, possibly due to recent blueprint/feed planner work  
**Scope:** Complete audit of Maya's prompting pipeline for both Pro and Classic modes

---

## 🔴 CRITICAL FINDINGS

### 1. Feed Planner Context Leakage Risk ⚠️

**Location:** `app/api/maya/chat/route.ts:685-725`

**Issue:**
The feed planner context addon (880+ lines) is being loaded when `chatType === "feed-planner"` OR `isFeedTab === true`. The `isFeedTab` flag comes from the `x-active-tab` header, which could be incorrectly set or persist across chat sessions.

**Code:**
```typescript
} else if (chatType === "feed-planner" || isFeedTab) {
  const { getFeedPlannerContextAddon } = await import("@/lib/maya/feed-planner-context")
  // ... feed planner context loaded
  systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + unifiedSystemPrompt
}
```

**Risk:**
- If `x-active-tab` header is set to "feed" during regular Maya chat, the massive feed planner context (with 5 aesthetic definitions, grid layout rules, etc.) gets loaded
- This could confuse Maya's core personality and prompt generation
- Feed planner context is 3-4x larger than regular Maya system prompt

**Recommendation:**
- Add explicit check: Only load feed planner context if BOTH conditions are true: `chatType === "feed-planner"` AND `isFeedTab === true`
- Add logging to track when feed planner context is loaded vs regular Maya prompt
- Consider separating feed planner into a completely separate chat route

---

### 2. System Prompt Construction Order Issue ⚠️

**Location:** `app/api/maya/chat/route.ts:681-751`

**Issue:**
The system prompt construction has multiple conditional branches that could lead to incorrect prompt assembly:

1. `prompt_builder` → Uses `PROMPT_BUILDER_SYSTEM`
2. `feed-planner` OR `isFeedTab` → Uses feed planner context + unified system
3. `pro-photoshoot` → Uses pro photoshoot context + unified system
4. Default → Uses unified system only

**Problem:**
The feed planner context is PREPENDED to the unified system prompt:
```typescript
systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + unifiedSystemPrompt
```

This means feed planner instructions come BEFORE Maya's core personality, which could override her voice and expertise.

**Recommendation:**
- Consider APPENDING feed planner context instead of prepending
- Or better: Make feed planner context a separate section that doesn't override core personality
- Add validation to ensure feed planner context only affects feed-related prompts

---

### 3. Mode Detection Logic Complexity ⚠️

**Location:** `app/api/maya/chat/route.ts:656-679`

**Issue:**
Studio Pro mode detection relies on:
1. Intent detection from user message (`detectStudioProIntent`)
2. Header value (`x-studio-pro-mode`)
3. Chat type checks

**Code:**
```typescript
const studioProIntent = detectStudioProIntent(lastMessageText)
const studioProHeader = req.headers.get("x-studio-pro-mode")
const hasStudioProHeader = studioProHeader === "true"
const isStudioProMode = chatType !== "prompt_builder" && (studioProIntent.isStudioPro || hasStudioProHeader)
```

**Problem:**
- Intent detection could incorrectly trigger Studio Pro mode
- Header might not be set correctly by frontend
- No fallback or validation

**Recommendation:**
- Add explicit mode logging to track which mode is being used
- Validate mode selection before building system prompt
- Consider making mode selection explicit (user toggle) rather than auto-detection

---

### 4. Prompt Generation Pipeline Differences

**Classic Mode (Flux LoRA):**
- Uses `MAYA_CLASSIC_CONFIG` from `mode-adapters.ts`
- Prompt length: 30-60 words (optimal 40-55)
- Format: `[TRIGGER_WORD], [ETHNICITY] [GENDER], [outfit], [location], [lighting], shot on iPhone...`
- Principles: `FLUX_PROMPTING_PRINCIPLES` (364 lines)

**Pro Mode (Nano Banana):**
- Uses `MAYA_PRO_CONFIG` from `mode-adapters.ts`
- Prompt length: 150-200 words
- Format: Identity preservation phrase + detailed narrative
- Principles: `NANOBANANA_PROMPTING_PRINCIPLES` (from `nano-banana-prompt-builder.ts`)

**Issue:**
- Two completely different prompting systems
- If mode detection fails, wrong principles could be applied
- No validation that generated prompts match the selected mode

**Recommendation:**
- Add prompt validation after generation
- Log which mode was used for each prompt generation
- Add mode-specific prompt examples in system prompt

---

## 📊 SYSTEM PROMPT SIZE ANALYSIS

### Regular Maya Chat (Classic Mode)
- `MAYA_VOICE`: ~60 lines
- `MAYA_CORE_INTELLIGENCE`: ~230 lines
- `MAYA_PROMPT_PHILOSOPHY`: ~30 lines
- `MAYA_CLASSIC_CONFIG` instructions: ~70 lines
- **Total: ~390 lines**

### Regular Maya Chat (Pro Mode)
- `MAYA_VOICE`: ~60 lines
- `MAYA_CORE_INTELLIGENCE`: ~230 lines
- `MAYA_PROMPT_PHILOSOPHY`: ~30 lines
- `MAYA_PRO_CONFIG` instructions: ~75 lines
- **Total: ~395 lines**

### Feed Planner Mode
- Feed Planner Context Addon: **~880 lines** ⚠️
- Unified System Prompt: ~395 lines
- **Total: ~1,275 lines** (3.2x larger!)

**Impact:**
The feed planner context is MASSIVE and could be overwhelming Maya's core personality when incorrectly loaded.

---

## 🔍 DETAILED CODE ANALYSIS

### Feed Planner Context Addon (`lib/maya/feed-planner-context.ts`)

**Size:** 880 lines  
**Contains:**
- 5 aesthetic definitions (Dark & Moody, Clean & Minimalistic, Scandinavian Muted, Beige & Simple, Pastels Scandic)
- Grid layout rules (anti-patterns, organic clustering)
- Prompt generation requirements (Classic vs Pro mode)
- Caption guidance
- Visual direction guidance
- Mode-specific instructions

**Risk:**
If this context leaks into regular Maya chat, it could:
1. Override Maya's core personality
2. Add unnecessary aesthetic constraints
3. Confuse prompt generation with feed-specific rules
4. Make responses too long and unfocused

---

### Mode Adapters (`lib/maya/mode-adapters.ts`)

**Status:** ✅ Well-structured  
**Issue:** None identified

The mode adapters correctly separate Classic and Pro mode instructions. However, the system prompt construction in `chat/route.ts` might not be using them correctly in all cases.

---

### Core Personality (`lib/maya/core-personality.ts`)

**Status:** ✅ Clean and focused  
**Issue:** None identified

Maya's core personality is well-defined and shouldn't be affected by recent changes.

---

## 🎯 RECOMMENDATIONS

### Priority 1: Fix Feed Planner Context Leakage

1. **Add explicit validation:**
```typescript
// Only load feed planner context if explicitly in feed planner mode
const shouldLoadFeedPlannerContext = chatType === "feed-planner" && isFeedTab === true

if (shouldLoadFeedPlannerContext) {
  // Load feed planner context
} else {
  // Use regular Maya system prompt
}
```

2. **Add logging:**
```typescript
console.log("[Maya Chat] System Prompt Mode:", {
  chatType,
  isFeedTab,
  shouldLoadFeedPlannerContext,
  systemPromptLength: systemPrompt.length,
  contextType: shouldLoadFeedPlannerContext ? "feed-planner" : "regular-maya"
})
```

3. **Separate routes (long-term):**
Consider creating a separate API route for feed planner chat to completely isolate the contexts.

---

### Priority 2: Fix System Prompt Construction Order

1. **Append instead of prepend:**
```typescript
// Instead of: feedContext + unifiedSystem
// Use: unifiedSystem + feedContext
systemPrompt = unifiedSystemPrompt + getFeedPlannerContextAddon(userSelectedMode)
```

2. **Or better: Make feed context additive:**
Feed planner context should ADD to Maya's expertise, not replace it. Consider restructuring as:
```typescript
systemPrompt = unifiedSystemPrompt + "\n\n" + getFeedPlannerContextAddon(userSelectedMode)
```

---

### Priority 3: Improve Mode Detection

1. **Add explicit mode logging:**
```typescript
console.log("[Maya Chat] Mode Detection:", {
  chatType,
  studioProIntent: studioProIntent.isStudioPro,
  studioProHeader,
  hasStudioProHeader,
  finalMode: isStudioProMode ? "PRO" : "CLASSIC",
  config: isStudioProMode ? "MAYA_PRO_CONFIG" : "MAYA_CLASSIC_CONFIG"
})
```

2. **Add mode validation:**
```typescript
// Validate mode selection
if (isStudioProMode && chatType === "feed-planner") {
  console.warn("[Maya Chat] WARNING: Studio Pro mode detected in feed planner - this might be incorrect")
}
```

---

### Priority 4: Add Prompt Validation

1. **Validate prompt length matches mode:**
```typescript
// After prompt generation
if (isStudioProMode && prompt.length < 150) {
  console.warn("[Maya Chat] WARNING: Pro mode prompt too short")
}
if (!isStudioProMode && prompt.length > 60) {
  console.warn("[Maya Chat] WARNING: Classic mode prompt too long")
}
```

2. **Validate prompt format:**
```typescript
// Classic mode should start with trigger word
if (!isStudioProMode && !prompt.startsWith(triggerWord)) {
  console.warn("[Maya Chat] WARNING: Classic mode prompt missing trigger word")
}

// Pro mode should NOT have trigger word
if (isStudioProMode && prompt.includes(triggerWord)) {
  console.warn("[Maya Chat] WARNING: Pro mode prompt contains trigger word")
}
```

---

## 🧪 TESTING RECOMMENDATIONS

### Test Case 1: Regular Maya Chat (Classic Mode)
1. Open Maya chat (not feed planner)
2. Send message: "Create some street style concepts"
3. **Verify:**
   - System prompt does NOT include feed planner context
   - Generated prompts are 30-60 words
   - Prompts start with trigger word
   - Maya's personality is warm and focused

### Test Case 2: Regular Maya Chat (Pro Mode)
1. Toggle to Pro Mode
2. Send message: "Create some street style concepts"
3. **Verify:**
   - System prompt does NOT include feed planner context
   - Generated prompts are 150-200 words
   - Prompts start with identity preservation phrase
   - Prompts do NOT include trigger word

### Test Case 3: Feed Planner Chat
1. Open feed planner tab
2. Send message: "Create a feed in Clean & Minimalistic style"
3. **Verify:**
   - System prompt DOES include feed planner context
   - Response includes feed strategy JSON
   - Aesthetic-specific instructions are followed

### Test Case 4: Mode Switching
1. Start in Classic Mode
2. Generate concepts
3. Switch to Pro Mode
4. Generate concepts
5. **Verify:**
   - Mode detection logs show correct mode
   - Prompts match selected mode
   - No feed planner context in either mode

---

## 📝 SUMMARY

**Root Cause Hypothesis:**
The feed planner context (880 lines) is likely leaking into regular Maya chat when the `x-active-tab` header is incorrectly set or persists. This massive context could be overwhelming Maya's core personality and causing degraded prompting quality.

**Immediate Actions:**
1. ✅ Add explicit validation to prevent feed planner context leakage
2. ✅ Add comprehensive logging to track system prompt construction
3. ✅ Fix system prompt construction order (append vs prepend)
4. ✅ Add mode detection validation

**Long-term Actions:**
1. Consider separating feed planner into its own API route
2. Add prompt validation after generation
3. Create automated tests for system prompt construction

---

## 🔗 RELATED FILES

- `app/api/maya/chat/route.ts` - Main chat API route
- `lib/maya/feed-planner-context.ts` - Feed planner context (880 lines)
- `lib/maya/mode-adapters.ts` - Mode-specific adapters
- `lib/maya/core-personality.ts` - Maya's core personality
- `lib/maya/flux-prompting-principles.ts` - Classic mode principles
- `lib/maya/nano-banana-prompt-builder.ts` - Pro mode principles

---

**Audit Completed:** January 2025  
**Next Steps:** Implement Priority 1 fixes and test
