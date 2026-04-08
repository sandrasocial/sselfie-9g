# PROMPT SURFACE MAP

**Last Updated**: 2026-01-17 (Phase 2F - Safety warnings added)  
**Phase**: 2E - Prompt Surface Simplification  
**Purpose**: Complete map of all prompt entry points and flows  
**Status**: ✅ COMPLETE - 55 files analyzed, 10 API entry points, 5 lib builders, 4 component triggers

---

## ⚠️ CRITICAL WARNING

**5 of 19 entry points bypass Prompt Authority Layer**

- ✅ **Canonical (using Authority)**: 12 entry points (63%)
- ❌ **Legacy-but-live (bypassing Authority)**: 5 entry points (26%)
- ⚠️ **Partial (audit only)**: 2 entry points (11%)

**DO NOT ADD MORE BYPASS PATTERNS**

All new prompt generation MUST route through Prompt Authority Layer.

See: `docs/_CANONICAL/PROMPT_AUTHORITY_POLICY.md`

---

## EXECUTIVE SUMMARY

This document maps **every way prompts enter and flow through SSELFIE**. It identifies:
- **10 API Routes** that generate or return prompts
- **5 Lib Functions** that build prompts
- **4 Component Triggers** that initiate prompt generation
- **The Canonical Flow** through Prompt Authority Layer
- **Legacy/Bypass Patterns** that skip Authority
- **Confusing Naming** that causes mental load

**Key Finding**: Only **3 of 10 API routes** use Prompt Authority correctly. Most bypass it and call builders directly.

---

## ENTRY POINT INVENTORY

### API Routes (External Entry Points)

| EP ID | Route | Type | What It Does | Next Hop | Authority? | Classification | Evidence |
|-------|-------|------|--------------|----------|------------|---------------|----------|
| **EP-01** | `/api/maya/generate-concepts` | Classic Mode | Generates concept cards for Classic Mode (FLUX LoRA) | ✅ `generateConceptCardsViaAuthority()` from `lib/maya/prompt-authority.ts` | ✅ **CANONICAL** (Migrated Phase 3A P0-2 - 2026-01-17) | **PUBLIC** - Used by Maya chat UI (user-facing) | `app/api/maya/generate-concepts/route.ts:2778` |
| **EP-02** | `/api/maya/generate-prompt-suggestions` | Prompt Suggestions | Returns 3 prompt suggestions for workbench | ✅ `generatePromptSuggestions()` from `lib/maya/prompt-authority.ts` | ✅ **CANONICAL** (Migrated Phase 3A - 2026-01-17) | **INTERNAL** - Used by workbench UI only, not external API | `app/api/maya/generate-prompt-suggestions/route.ts:2` |
| **EP-03** | `/api/maya/generate-feed-prompt` | Feed Prompts | Generates prompts for feed posts (Classic or Pro) | ✅ `generateMayaFeedPromptSystemPrompt()` from `lib/maya/prompt-authority.ts` | ✅ **CANONICAL** (Migrated Phase 3B P1-1 - 2026-01-17) | **PUBLIC** - Used by feed generation (user-facing) | `app/api/maya/generate-feed-prompt/route.ts:253` |
| **EP-04** | `/api/maya/pro/generate-image` | Pro Mode Generation | Generates images using NanoBanana Pro with full prompts | ✅ `routeProModeImagePromptViaAuthority()` from `lib/maya/prompt-authority.ts` | ✅ **CANONICAL** (Migrated Phase 3C P0-1 - 2026-01-17) | **PUBLIC** - Used by Pro Mode image generation (user-facing) | `app/api/maya/pro/generate-image/route.ts:96` |
| **EP-05** | `/api/feed/[feedId]/generate-single` | Feed Single Post | Generates single post in feed (Classic or Pro mode) | ✅ `generateFeedSinglePromptViaAuthority()` for Pro, EP-03 (Authority) for Classic | ✅ **CANONICAL** (Migrated Phase 3B P1-2 - 2026-01-17) | **PUBLIC** - Used by feed single post generation (user-facing) | `app/api/feed/[feedId]/generate-single/route.ts:534` |
| **EP-06** | `/api/blueprint/generate-concepts` | Blueprint Concepts | Generates concepts for paid blueprint users | ✅ `generateBlueprintConceptsPrompt()` from `lib/maya/prompt-authority.ts` | ✅ **CANONICAL** (Migrated Phase 3A P0-3 - 2026-01-17) | **PUBLIC** - Used by blueprint onboarding (user-facing) | `app/api/blueprint/generate-concepts/route.ts:327` |
| **EP-07** | `/api/maya/generate-studio-pro-prompts` | Studio Pro Prompts | Generates Studio Pro prompts for NanoBanana | ✅ `generateStudioProPromptsViaAuthority()` from `lib/maya/prompt-authority.ts` | ✅ **CANONICAL** (Migrated Phase 3B P1-3 - 2026-01-17) | **PUBLIC** - Used by Studio Pro feature (user-facing) | `app/api/maya/generate-studio-pro-prompts/route.ts:60` |
| **EP-08** | `/api/feed-planner/create-strategy` | Feed Strategy (DEPRECATED) | Creates feed strategy with 9 posts | ✅ `generateFeedPlannerStrategyPromptViaAuthority()`, `generateFeedPlannerProModePromptViaAuthority()`, `generateFeedPlannerClassicModePromptViaAuthority()` | ✅ **CANONICAL** (Migrated Phase 3B P1-4 - 2026-01-17) | **PUBLIC** - Used by Feed Planner (user-facing, though deprecated) | `app/api/feed-planner/create-strategy/route.ts:203,1146,1182` |
| **EP-09** | `/api/feed/[feedId]/generate-profile` | Profile Image | Generates profile image for feed | ✅ `generatePrompt('profile-image')` from Authority | ✅ **CANONICAL** | **PUBLIC** - Used by feed profile generation (user-facing) | `app/api/feed/[feedId]/generate-profile/route.ts:9,131` |
| **EP-10** | `/api/maya/generate-video` | Video Motion Prompt | Generates motion prompts for WAN video generation | ✅ `generatePrompt('video')` from Authority | ✅ **CANONICAL** | **PUBLIC** - Used by video generation (user-facing) | `app/api/maya/generate-video/route.ts:7,126` |

---

### Lib Functions (Internal Builders)

| Builder ID | Function | File | What It Does | Used By | Authority? | Evidence |
|------------|----------|------|--------------|---------|------------|----------|
| **B-01** | `generatePrompt()` | `lib/maya/prompt-authority.ts` | **THE CANONICAL LAYER** - Routes to appropriate builder based on mode/feature | EP-09, EP-10 | ✅ **IS AUTHORITY** | `lib/maya/prompt-authority.ts:242-246` |
| **B-02** | `buildPrompt()` | `lib/maya/prompt-constructor.ts` | Classic Mode builder - creates 250-500 word prompts with trigger words | EP-01 (directly), B-01 (via Authority) | ⚠️ BOTH | `lib/maya/prompt-constructor.ts:1-26` |
| **B-03** | `buildNanoBananaPrompt()` | `lib/maya/nano-banana-prompt-builder.ts` | Pro Mode builder - creates composition prompts for NanoBanana | EP-03, EP-05, EP-08 (directly), B-01 (via Authority) | ⚠️ BOTH | `lib/maya/nano-banana-prompt-builder.ts:1-16` |
| **B-04** | `PromptGenerator.generatePromptSuggestions()` | `lib/maya/prompt-generator.ts` | Analyzes workbench context and returns 3 prompt suggestions | EP-02 | ❌ BYPASS | `lib/maya/prompt-generator.ts:108-134` |
| **B-05** | `applyProgrammaticFixes()`, `validatePromptLight()` | `lib/maya/direct-prompt-generation.ts` | Validation helpers - applies fixes and validates prompts | EP-01 | ❌ HELPER | `lib/maya/direct-prompt-generation.ts:63-67` |

---

### Component Triggers (UI Entry Points)

| Component ID | Component | What It Does | Calls | Authority? | Evidence |
|--------------|-----------|--------------|-------|------------|----------|
| **C-01** | `components/sselfie/maya-chat-screen.tsx` | Maya chat UI - initiates concept generation | `/api/maya/generate-concepts` (EP-01) | ❌ NO | `components/sselfie/maya-chat-screen.tsx:461-788` |
| **C-02** | `components/sselfie/concept-card.tsx` | Concept card UI - triggers image generation from concept | `/api/maya/generate-image` (not in EP list - image gen route) | N/A | `components/sselfie/concept-card.tsx:33-40` |
| **C-03** | `components/sselfie/b-roll-screen.tsx` | B-Roll video UI - generates motion prompts and videos | `/api/maya/generate-motion-prompt`, `/api/maya/generate-video` (EP-10) | ✅ YES (EP-10) | `components/sselfie/b-roll-screen.tsx:172,198` |
| **C-04** | `components/blueprint/blueprint-concept-card.tsx` | Blueprint concept card - triggers blueprint generation | `/api/blueprint/generate-concepts` (EP-06) | ❌ NO | `components/blueprint/blueprint-concept-card.tsx:23-30` |

---

## CANONICAL FLOW (THE HAPPY PATH)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                             │
│                 (Component or API call)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API ROUTE (Entry Point)                       │
│   • /api/maya/generate-concepts                                  │
│   • /api/maya/pro/generate-image                                 │
│   • /api/feed/[feedId]/generate-single                           │
│   • etc.                                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROMPT AUTHORITY LAYER (B-01)                       │
│                                                                  │
│   generatePrompt(mode, feature, context)                        │
│                                                                  │
│   • Routes based on mode ('classic', 'pro', 'video')            │
│   • Routes based on feature ('concept-card', 'image-gen', etc.) │
│   • Logs all operations for audit trail                         │
│   • Validates inputs and outputs                                │
│   • Returns: { prompt, metadata }                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                   ┌─────────┴──────────┐
                   │                    │
                   ▼                    ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  CLASSIC MODE     │  │   PRO MODE       │
        │  (B-02)           │  │   (B-03)         │
        │                   │  │                  │
        │  buildPrompt()    │  │  buildNanaBanana │
        │  from prompt-     │  │  Prompt() from   │
        │  constructor.ts   │  │  nano-banana-    │
        │                   │  │  prompt-builder  │
        └─────────┬─────────┘  └────────┬─────────┘
                  │                     │
                  │                     │
                  └─────────┬───────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   VALIDATED PROMPT       │
              │   (returned to API)      │
              └─────────────┬────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   MODEL API CALL         │
              │   • Replicate (FLUX)     │
              │   • NanoBanana Pro       │
              │   • WAN (Video)          │
              └─────────────┬────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   IMAGE/VIDEO GENERATED  │
              └─────────────┬────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   QUALITY MONITORING     │
              │   (silent, fire-and-     │
              │    forget)               │
              └──────────────────────────┘
```

**Key Points**:
- **Prompt Authority (B-01) is the single routing layer** - All prompts should go through it
- **Authority never calls models** - It only creates prompts, APIs call models
- **Quality monitoring is silent** - Fire-and-forget, never blocks

---

## CURRENT REALITY (WHAT ACTUALLY HAPPENS)

### Routes Using Authority Correctly ✅

| Route | Mode/Feature | Evidence |
|-------|-------------|----------|
| `/api/maya/generate-video` (EP-10) | `generatePrompt('video', 'video-generation', ...)` | `app/api/maya/generate-video/route.ts:126` |
| `/api/feed/[feedId]/generate-profile` (EP-09) | `generatePrompt('profile-image', 'profile-image', ...)` | `app/api/feed/[feedId]/generate-profile/route.ts:131` |

**Total**: 2 / 10 (20%)

### Routes Bypassing Authority ❌

| Route | What It Does Instead | Evidence |
|-------|---------------------|----------|
| ~~`/api/maya/generate-concepts` (EP-01)~~ | ~~Calls `buildPrompt()` directly~~ | ✅ **MIGRATED** (Phase 3A P0-2 - 2026-01-17) - Now uses Authority |
| ~~`/api/maya/generate-prompt-suggestions` (EP-02)~~ | ~~Uses `PromptGenerator` class directly~~ | ✅ **MIGRATED** (Phase 3A P0-1 - 2026-01-17) - Now uses Authority |
| ~~`/api/maya/generate-feed-prompt` (EP-03)~~ | ~~Direct Claude generation~~ | ✅ **MIGRATED** (Phase 3B P1-1 - 2026-01-17) - Now uses Authority |
| ~~`/api/feed/[feedId]/generate-single` (EP-05)~~ | ~~Calls `buildSingleImagePrompt()` directly~~ | ✅ **MIGRATED** (Phase 3B P1-2 - 2026-01-17) - Now uses Authority |
| ~~`/api/blueprint/generate-concepts` (EP-06)~~ | ~~Direct Claude generation~~ | ✅ **MIGRATED** (Phase 3A P0-3 - 2026-01-17) - Now uses Authority |
| ~~`/api/maya/generate-studio-pro-prompts` (EP-07)~~ | ~~Direct Claude generation~~ | ✅ **MIGRATED** (Phase 3B P1-3 - 2026-01-17) - Now uses Authority |
| ~~`/api/feed-planner/create-strategy` (EP-08)~~ | ~~Calls `buildNanoBananaPrompt()` directly~~ | ✅ **MIGRATED** (Phase 3B P1-4 - 2026-01-17) - Now uses Authority |

**Total**: 0 / 10 (0%)

### Partial Use (Audit Only) ⚠️

| Route | What It Does | Evidence |
|-------|-------------|----------|
| ~~`/api/maya/pro/generate-image` (EP-04)~~ | ~~Audits via manual logging but doesn't use Authority~~ | ✅ **MIGRATED** (Phase 3C P0-1 - 2026-01-17) - Now uses Authority |

**Total**: 0 / 10 (0%)

---

## CONFUSION DRIVERS (TOP 5)

### 1. **File Named "Deprecated" But Actively Used** ⚠️ HIGH IMPACT

**File**: `lib/maya/prompt-generator.ts`  
**Header Comment**: "Template system removed - this file is deprecated" (line 6-8)  
**Reality**: ✅ **ACTIVELY USED**

**Used By**:
- `app/api/maya/generate-prompt-suggestions/route.ts:2,19`
- `components/sselfie/maya-chat-screen.tsx:50`
- `components/sselfie/maya/maya-chat-interface.tsx:8`
- `components/sselfie/prompt-suggestion-card.tsx:10`

**Impact**: Founder assumes file is dead, but it's critical for prompt suggestions feature

**Recommendation (Doc-Only)**: Update header comment to:
```typescript
/**
 * PROMPT SUGGESTION GENERATOR
 * 
 * STATUS: ✅ ACTIVELY USED
 * 
 * PURPOSE: Analyzes workbench context and generates 3 prompt suggestions for Pro Mode.
 * 
 * USAGE:
 * - API: /api/maya/generate-prompt-suggestions
 * - Components: maya-chat-screen.tsx, prompt-suggestion-card.tsx
 * 
 * NOTE: Template system removed (Phase 5), but PromptGenerator class is still used.
 */
```

---

### 2. **Ambiguous Naming: "direct-prompt-generation"** ⚠️ MEDIUM IMPACT

**File**: `lib/maya/direct-prompt-generation.ts`  
**Name Suggests**: Direct prompt generation (like a builder)  
**Reality**: Validation and fix helpers

**Exports**:
- `applyProgrammaticFixes()` - Fixes prompt issues
- `validatePromptLight()` - Validates prompts
- `DirectPromptContext` type

**Used By**:
- `app/api/maya/generate-concepts/route.ts:63-67`

**Impact**: Name suggests it's a prompt builder, but it's actually validation helpers

**Recommendation (Doc-Only)**: Rename file to `prompt-validation-helpers.ts` or add clear header:
```typescript
/**
 * PROMPT VALIDATION HELPERS
 * 
 * PURPOSE: Validates and fixes prompts after generation.
 * 
 * FUNCTIONS:
 * - applyProgrammaticFixes() - Applies programmatic fixes to prompts
 * - validatePromptLight() - Lightweight prompt validation
 * 
 * NOTE: Despite file name, this is NOT a prompt builder. Use Prompt Authority for generation.
 */
```

---

### 3. **Multiple Prompt Builders With Overlapping Names** ⚠️ HIGH IMPACT

**Problem**: 3 different builders with similar purposes:

1. **`prompt-constructor.ts`**
   - Function: `buildPrompt()`
   - Purpose: Classic Mode (FLUX LoRA)
   - Status: ✅ Active

2. **`nano-banana-prompt-builder.ts`**
   - Function: `buildNanoBananaPrompt()`
   - Purpose: Pro Mode (NanoBanana)
   - Status: ✅ Active

3. **`prompt-generator.ts`** (confusing name)
   - Function: `generatePromptSuggestions()`
   - Purpose: Workbench prompt suggestions (NOT image generation)
   - Status: ✅ Active (but named "deprecated")

**Impact**: Unclear which builder to use for which purpose

**Recommendation (Doc-Only)**: Add clear header comments to each file explaining:
- When to use it
- What mode it's for
- Who calls it

---

### 4. **Authority Layer Exists But Rarely Used** ⚠️ CRITICAL IMPACT

**File**: `lib/maya/prompt-authority.ts`  
**Purpose**: Central routing layer for all prompt generation  
**Reality**: Only 2 / 10 API routes use it

**Routes Using Authority**:
- ✅ `/api/maya/generate-video` (EP-10)
- ✅ `/api/feed/[feedId]/generate-profile` (EP-09)

**Routes Bypassing Authority**:
- ❌ 7 other API routes call builders directly

**Impact**: Authority Layer is supposed to be canonical, but most code bypasses it

**Recommendation (Doc-Only)**:
1. Add prominent comment at top of each API route file:
   ```typescript
   /**
    * PROMPT GENERATION: Should use Prompt Authority Layer
    * 
    * Current status: ⚠️ BYPASSING AUTHORITY (legacy code)
    * 
    * Canonical flow:
    *   import { generatePrompt } from '@/lib/maya/prompt-authority'
    *   const result = await generatePrompt(mode, feature, context)
    * 
    * Current flow: Calls builders directly (TODO: migrate to Authority)
    */
   ```

2. Add GitHub issue for each bypass route to track migration

---

### 5. **Deprecated Endpoint Still Active** ⚠️ LOW IMPACT

**Route**: `/api/feed-planner/create-strategy` (EP-08)  
**Status**: Marked `@deprecated` in comment (line 19-28)  
**Reality**: Still active and functional

**Header Comment**:
```typescript
/**
 * @deprecated This endpoint is deprecated. 
 * Feed strategies should be generated through Maya Chat (Feed Tab) which uses the conversational approach.
 * 
 * This endpoint remains for backward compatibility but will be removed in a future version.
 */
```

**Impact**: Unclear if this should still be used or not

**Recommendation (Doc-Only)**:
- If truly deprecated: Add runtime warning log + add removal date
- If still needed: Remove `@deprecated` tag and update comment

---

## DO NOT TOUCH LIST (FRAGILE AREAS)

### 🔴 CRITICAL - NEVER MODIFY WITHOUT APPROVAL

1. **Prompt Authority Layer** (`lib/maya/prompt-authority.ts`)
   - Central routing layer
   - Changing breaks everything
   - Only modify if explicitly instructed

2. **Prompt Constructors**
   - `lib/maya/prompt-constructor.ts` (Classic Mode)
   - `lib/maya/nano-banana-prompt-builder.ts` (Pro Mode)
   - Changing output format breaks generations

3. **Quality Monitoring Hooks** (`lib/quality/hooks.ts`)
   - Fire-and-forget async system
   - Changing breaks data collection
   - Only modify if fixing bugs

4. **Feed Planner Orchestrator** (`lib/feed-planner/orchestrator.ts`)
   - Complex state management
   - Coordinates multi-post generation
   - Do not refactor without approval

---

## LEGACY BUT LIVE LIST

### Files/Routes That Are Legacy But Still Active

1. **`lib/maya/prompt-generator.ts`**
   - Status: Header says "deprecated" but file is active
   - Used by: Prompt suggestions feature
   - Action: Update header comment (don't remove)

2. **`/api/feed-planner/create-strategy`** (EP-08)
   - Status: Marked `@deprecated` but still functional
   - Used by: Feed strategy creation (non-chat flow)
   - Action: Clarify if truly deprecated or still needed

3. **Direct builder calls** (bypassing Authority)
   - Status: Legacy pattern, should use Authority
   - Used by: 7 / 10 API routes
   - Action: Add migration plan (Phase 3+)

---

## SHOULD BE INTERNAL ONLY LIST

### Routes/Functions That Should Not Be Public

These entry points are currently exposed as public APIs but should be internal-only. They're used by specific UI components and shouldn't be documented as external APIs.

#### 1. `/api/maya/generate-prompt-suggestions` (EP-02) 🔒

**Current Status**: Public API route  
**Used By**: Workbench UI only (components/sselfie/maya-chat-screen.tsx)  
**Why Internal-Only**: 
- Specific to workbench feature
- Not intended for external consumption
- Tightly coupled to UI component

**Recommendation**: 
- Add internal-only guards (Phase 3+)
- Do not document as public API
- Consider moving logic closer to component

**Evidence**: `app/api/maya/generate-prompt-suggestions/route.ts:2,19`

---

#### 2. `applyProgrammaticFixes()` (lib/maya/direct-prompt-generation.ts) 🔒

**Current Status**: Exported function  
**Used By**: generate-concepts route only  
**Why Internal-Only**:
- Validation helper, not a public API
- Should be internal to prompt-constructor
- No external use case

**Recommendation**:
- Move into prompt-constructor.ts as private function
- Or move into prompt-authority.ts as internal helper
- Remove from exports

**Evidence**: `lib/maya/direct-prompt-generation.ts:63-67`

---

#### 3. `PromptGenerator` class (lib/maya/prompt-generator.ts) 🔒

**Current Status**: Exported class  
**Used By**: generate-prompt-suggestions route only  
**Why Internal-Only**:
- Specific to prompt suggestions feature
- No external use case
- Should be internal to suggestions route

**Recommendation**:
- Move class into generate-prompt-suggestions route file
- Or keep in lib but mark as internal-only
- Do not document as public API

**Evidence**: `lib/maya/prompt-generator.ts:108-134`

---

### Internal-Only Enforcement (Phase 3+)

**Add Guards**:
```typescript
// Example internal-only guard
const isInternalRequest = req.headers.get('x-internal-request') === 'true'
if (!isInternalRequest) {
  return NextResponse.json({ error: 'Internal API only' }, { status: 403 })
}
```

**Documentation**:
- Do NOT include in public API docs
- Mark as "Internal Use Only" in code comments
- Add to "Do Not Use Externally" list

---

## NAMING RECOMMENDATIONS (NO REFACTOR)

### Files That Should Be Renamed (Future Phase)

| Current Name | Confusing Because | Suggested Name | Reason |
|--------------|-------------------|----------------|--------|
| `lib/maya/prompt-generator.ts` | Header says "deprecated" but file is active | `lib/maya/prompt-suggestion-generator.ts` | Clarifies it generates suggestions, not prompts for generation |
| `lib/maya/direct-prompt-generation.ts` | Name suggests it generates prompts, but it validates them | `lib/maya/prompt-validation-helpers.ts` | Clarifies it's for validation, not generation |
| `/api/maya/generate-prompt-suggestions` | Suggests it generates prompts, but it returns suggestions | `/api/maya/workbench-suggestions` | Clarifies it's for workbench suggestions |

---

## PROMPT ENTRY SUMMARY

### By Type

| Type | Count | Using Authority | Bypassing Authority | Partial |
|------|-------|-----------------|---------------------|---------|
| API Routes | 10 | 2 (20%) | 7 (70%) | 1 (10%) |
| Lib Functions | 5 | 1 (Authority itself) | 3 | 1 (helper) |
| Component Triggers | 4 | 1 (25%) | 3 (75%) | - |
| **Total** | **19** | **4 (21%)** | **13 (68%)** | **2 (11%)** |

### By Mode

| Mode | API Routes | Builders | Authority Usage |
|------|-----------|----------|-----------------|
| Classic Mode (FLUX) | 4 | 1 (`prompt-constructor.ts`) | ❌ Bypassing |
| Pro Mode (NanoBanana) | 4 | 1 (`nano-banana-prompt-builder.ts`) | ❌ Bypassing |
| Video (WAN) | 1 | 0 (enhances existing prompts) | ✅ Using |
| Blueprint | 1 | 0 (direct Claude) | ❌ Bypassing |
| Suggestions | 1 | 1 (`prompt-generator.ts`) | ❌ Bypassing |

---

## QUESTIONS ANSWERED

### "Where do prompts enter the system?"

**Answer**: 10 API routes (EP-01 through EP-10), 5 lib functions (B-01 through B-05), 4 component triggers (C-01 through C-04).

### "Which entry points are canonical vs legacy?"

**Canonical**: 
- ✅ `/api/maya/generate-video` (EP-10)
- ✅ `/api/feed/[feedId]/generate-profile` (EP-09)

**Legacy (Bypass)**:
- ❌ 7 other API routes
- ❌ 3 component triggers

### "Which ones should be internal-only?"

**Should be internal**:
- `/api/maya/generate-prompt-suggestions` (EP-02) - UI-only
- `applyProgrammaticFixes()` - Internal helper
- `PromptGenerator` class - Internal to suggestions route

### "What naming/docs changes would reduce confusion?"

**Top 3**:
1. Update `prompt-generator.ts` header to remove "deprecated" language
2. Rename `direct-prompt-generation.ts` to `prompt-validation-helpers.ts`
3. Add clear Authority usage comments to all API routes

---

## FILES ANALYZED

**Total**: 55 files

**API Routes**: 10
- `app/api/maya/generate-concepts/route.ts`
- `app/api/maya/generate-prompt-suggestions/route.ts`
- `app/api/maya/generate-feed-prompt/route.ts`
- `app/api/maya/pro/generate-image/route.ts`
- `app/api/feed/[feedId]/generate-single/route.ts`
- `app/api/blueprint/generate-concepts/route.ts`
- `app/api/maya/generate-studio-pro-prompts/route.ts`
- `app/api/feed-planner/create-strategy/route.ts`
- `app/api/feed/[feedId]/generate-profile/route.ts`
- `app/api/maya/generate-video/route.ts`

**Lib Functions**: 5
- `lib/maya/prompt-authority.ts`
- `lib/maya/prompt-constructor.ts`
- `lib/maya/nano-banana-prompt-builder.ts`
- `lib/maya/prompt-generator.ts`
- `lib/maya/direct-prompt-generation.ts`

**Components**: 4
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/concept-card.tsx`
- `components/sselfie/b-roll-screen.tsx`
- `components/blueprint/blueprint-concept-card.tsx`

**Documentation**: 36 (referenced for context)

---

## NEXT STEPS (OUT OF SCOPE FOR PHASE 2E)

**Phase 2E is READ-ONLY. The following are recommendations only.**

### Immediate (Phase 2F)

1. Update header comments for confusing files:
   - `prompt-generator.ts` - Remove "deprecated" language
   - `direct-prompt-generation.ts` - Clarify it's validation helpers

2. Add Authority usage comments to all API routes

### Short-Term (Phase 3)

1. Migrate bypassing routes to use Authority Layer:
   - `/api/maya/generate-concepts` (EP-01)
   - `/api/maya/generate-feed-prompt` (EP-03)
   - `/api/feed/[feedId]/generate-single` (EP-05)

2. Consolidate validation helpers into builders

### Long-Term (Phase 4)

1. Rename confusing files (with code migration)
2. Remove deprecated routes
3. Make internal-only functions truly internal

---

## STATUS

✅ **COMPLETE** - All prompt entry points mapped and documented

**Last Updated**: 2026-01-17  
**Next Phase**: Phase 2F (Documentation Fixes - docs/comments only)
