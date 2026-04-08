# Feed Planner Stabilization - Phase 6: Safe Cleanup
## Freeze Legacy Logic and Add Preservation Comments

**Date:** January 2026  
**Phase:** 6 - Safe Cleanup  
**Status:** ✅ Complete

---

## WHAT WAS DONE

**Frozen Files:** Added freeze comments to 8 legacy files that mutate prompts or override scene intent.

**Preservation Comments:** Added "SINGLE SOURCE OF TRUTH" comments to 3 new files.

**Bypass Comments:** Added bypass comments to 1 file that should never be called.

---

## FROZEN FILES (Legacy Logic)

### High Priority Freezes

1. **`lib/maya/prompt-authority.ts`**
   - Comment: `🧊 FROZEN: Maya system - DO NOT MODIFY. Feed Planner will bypass this.`
   - Reason: Maya routing layer, Feed Planner uses scene-resolver.ts + prompt-shaper.ts

2. **`lib/maya/nano-banana-prompt-builder.ts`**
   - Comment: `🧊 FROZEN: Maya system - DO NOT MODIFY. Feed Planner will use direct prompt shaping.`
   - Reason: Maya prompt builder, Feed Planner uses prompt-shaper.ts

3. **`lib/maya/blueprint-photoshoot-templates.ts`**
   - Comment: `🧊 FROZEN: Legacy template library. Will be replaced with scene-as-data.`
   - Reason: Hardcoded templates, style-first (not activity-first)

4. **`lib/feed-planner/nano-banana-adapter.ts`**
   - Comment: `🧊 FROZEN: Translation layer. Will be bypassed in new pipeline.`
   - Reason: Mutates prompts, should be bypassed

5. **`lib/feed-planner/style-coherence-resolver.ts`**
   - Comment: `🧊 FROZEN: Legacy compatibility matrix. Will be replaced with constraint solver.`
   - Reason: Hardcoded matrices, will be replaced with activity-first constraints

6. **`lib/feed-planner/visual-composition-expert.ts`**
   - Comment: `🚫 BYPASS: Flux prompt builder. Feed Planner uses Pro Mode (Nano Banana) only.`
   - Reason: Creates Flux prompts, not used in Feed Planner

### Medium Priority Freezes

7. **`lib/feed-planner/build-single-image-prompt.ts`**
   - Comment: `🧊 FROZEN: Template parser. Will be replaced with scene-as-data parser.`
   - Reason: Text parsing, will be replaced

8. **`lib/feed-planner/dynamic-template-injector.ts`**
   - Comment: `🧊 FROZEN: Template injection. Will be replaced with scene composition.`
   - Reason: Mutates template text, will be replaced

---

## PRESERVATION COMMENTS (New Files)

### Single Source of Truth Files

1. **`lib/feed-planner/scene-resolver.ts`**
   - Comment: `✅ SINGLE SOURCE OF TRUTH: All Feed Planner scene intent decisions happen here.`
   - Purpose: Scene resolution (not prompt generation)

2. **`lib/feed-planner/prompt-shaper.ts`**
   - Comment: `✅ SINGLE SOURCE OF TRUTH: All Feed Planner prompt text generation happens here.`
   - Purpose: Prompt generation (not scene resolution)

3. **`lib/feed-planner/scene-consistency.ts`**
   - Comment: `✅ SINGLE SOURCE OF TRUTH: Ensures preview and full planner use same scene list.`
   - Purpose: Consistency validation (not scene resolution or prompt generation)

---

## NOTES ADDED

### Identity Anchor Injection

**`lib/nano-banana-client.ts`**
- Added note: Feed Planner prompts now include explicit identity anchor from prompt-shaper.ts
- Auto-injection is fallback for legacy prompts
- New Feed Planner prompts already have identity anchor (no mutation needed)

---

## DEAD CODE IDENTIFICATION

### Files That May Be Unused

1. **`lib/feed-planner/visual-composition-expert.ts`**
   - Status: Bypassed (never call in Feed Planner)
   - Reason: Creates Flux prompts, Feed Planner uses Pro Mode only
   - Action: Keep for now (may be used by other systems)

### Files That Are Still Used (Legacy)

All frozen files are still used by legacy code paths. They are:
- Frozen (not modified)
- Bypassed in new pipeline (not called)
- Kept for backward compatibility

---

## INTEGRATION STATUS

### New Pipeline (Phase 1-5)

**Scene Resolution:**
- `scene-resolver.ts` → Resolves scene intent
- `scene-consistency.ts` → Ensures consistency

**Prompt Generation:**
- `prompt-shaper.ts` → Generates prompt text

**Image Persistence:**
- `check-post/route.ts` → Saves images correctly

### Legacy Pipeline (Still Active)

**Template-Based:**
- `blueprint-photoshoot-templates.ts` → Template selection
- `dynamic-template-injector.ts` → Template injection
- `build-single-image-prompt.ts` → Template parsing
- `nano-banana-adapter.ts` → Template conversion
- `nano-banana-prompt-builder.ts` → Prompt building

**Maya-Based:**
- `prompt-authority.ts` → Maya routing
- `nano-banana-prompt-builder.ts` → Maya prompt building

---

## MIGRATION PATH

### Phase 1-5: Foundation Complete ✅
- Scene resolver created
- Prompt shaper created
- Consistency helper created
- Image persistence fixed

### Phase 6: Cleanup Complete ✅
- Legacy files frozen
- Preservation comments added
- Dead code identified

### Future Phases: Integration
- Integrate scene resolver + prompt shaper into generate-single route
- Replace template injection → adapter → builder chain
- Remove legacy code paths (after full migration)

---

## PRESERVATION GUIDELINES

### For Future AI Agents

**DO NOT MODIFY:**
- Files marked with `🧊 FROZEN`
- Files marked with `🚫 BYPASS`

**DO NOT ADD:**
- Prompt logic to scene-resolver.ts
- Scene logic to prompt-shaper.ts
- Template logic to new files

**DO USE:**
- scene-resolver.ts for scene intent
- prompt-shaper.ts for prompt generation
- scene-consistency.ts for consistency validation

---

**End of Phase 6**
