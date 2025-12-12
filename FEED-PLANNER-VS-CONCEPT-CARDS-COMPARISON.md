# Why Concept Cards Work Perfectly But Feed Planner Is Complicated

## The Core Issue

**Concept Cards (Maya Chat):**
- ✅ ONE simple, clear system prompt
- ✅ Uses `getFluxPromptingPrinciples()` - all requirements in ONE place
- ✅ Trusts the AI to follow instructions
- ✅ Model: `claude-sonnet-4-20250514`
- ✅ Works perfectly - no validation loops needed

**Feed Planner:**
- ❌ MULTIPLE layers of complexity:
  1. `visual-composition-expert.ts` - generates initial prompt
  2. Generic term replacement (466-496 lines)
  3. Format validation (498-518 lines)
  4. Requirement validation (520-578 lines)
  5. Auto-enhancement (580-645 lines)
  6. Final validation (650-697 lines)
  7. `generate-feed-prompt/route.ts` - enhances it AGAIN
  8. `queue-images.ts` - validates it AGAIN
- ❌ Requirements duplicated in multiple places
- ❌ Overcomplicated with validation loops
- ❌ Model: was haiku (now sonnet ✅)

## The Solution

**Feed Planner should work EXACTLY like Concept Cards:**

1. **Same system prompt structure** - just add feed-specific context (cohesion, brand colors)
2. **Same model** - `claude-sonnet-4-20250514` ✅ (already fixed)
3. **Same trust** - let the AI follow instructions, don't add complex validation loops
4. **Same principles** - use `getFluxPromptingPrinciples()` directly

## What Makes Concept Cards Work

Looking at `app/api/maya/generate-concepts/route.ts`:

1. **Simple system prompt:**
   - Maya personality
   - User context
   - Flux prompting principles
   - Mandatory requirements (clear, simple list)
   - That's it!

2. **Simple user prompt:**
   - User request
   - Shot type
   - Context
   - That's it!

3. **Trust the AI:**
   - No validation loops
   - No generic term replacement
   - No auto-enhancement
   - Just parse JSON and return

## What Makes Feed Planner Complicated

Looking at `lib/feed-planner/visual-composition-expert.ts`:

1. **Complex system prompt:**
   - Maya personality ✅
   - User context ✅
   - Flux principles ✅
   - Feed-specific context ✅
   - **PLUS:** Duplicate requirements, examples, warnings, checklists

2. **Complex user prompt:**
   - Layout strategist decision
   - Shot type, purpose, visual direction
   - **PLUS:** Multiple examples, warnings, checklists

3. **Complex validation:**
   - Generic term replacement (466-496 lines)
   - Format validation (498-518 lines)
   - Requirement validation (520-578 lines)
   - Auto-enhancement (580-645 lines)
   - Final validation (650-697 lines)
   - **Total: ~230 lines of validation code!**

## Why This Happened

The feed planner was built with a "defensive" approach:
- "What if the AI doesn't follow instructions?"
- "Let's add validation to catch errors"
- "Let's auto-fix generic terms"
- "Let's add missing requirements"

But concept cards prove the AI DOES follow instructions when:
1. The system prompt is clear and simple
2. The model is strong (sonnet, not haiku)
3. The requirements are in ONE place (flux principles)

## The Fix

**Simplify feed planner to match concept cards:**

1. ✅ Use same model (sonnet) - DONE
2. ✅ Use same flux principles - DONE
3. ❌ Remove complex validation loops - TODO
4. ❌ Trust the AI like concept cards do - TODO
5. ❌ Keep only feed-specific context (cohesion, brand colors) - TODO

## Recommendation

**Remove all the validation loops (lines 466-697) and just:**
1. Parse the JSON
2. Fix trigger word format if needed (simple check)
3. Return the composition

**Let `generate-feed-prompt/route.ts` handle any final enhancements** (it already does this for concept cards when generating images).

This will make feed planner work exactly like concept cards - simple, clean, and effective.

