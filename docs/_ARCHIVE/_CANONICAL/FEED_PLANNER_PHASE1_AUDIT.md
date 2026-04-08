# Feed Planner Stabilization - Phase 1: Full Audit & Freeze
## Read-Only Inventory of All Feed Planner Files

**Date:** January 2026  
**Phase:** 1 - Audit Only (No Behavior Changes)  
**Scope:** Feed Planner image generation pipeline ONLY (Blueprint + Feed Preview + Full Planner)

---

## AUDIT METHODOLOGY

**Classification System:**
- **DECIDES CONTENT** = Files that determine WHAT the image contains (activity, location, outfit, objects). These are HIGH RISK.
- **FORMATS TEXT** = Files that only format or structure prompt text. These are LOW RISK.
- **TRANSPORT/STORAGE** = Files that only move data or store results. These are SAFE.

**Action Tags:**
- **🧊 FREEZE** = Legacy file, do not modify. Mark with comments only.
- **🚫 BYPASS** = File should never be called in new pipeline. Route around it.
- **❌ DELETE** = Dead code, unused, or redundant. Safe to remove.
- **✅ KEEP** = Core infrastructure, keep and potentially modify.

---

## FILE INVENTORY

### 1. API ROUTES (Entry Points)

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `app/api/feed/[feedId]/generate-single/route.ts` | Single image generation | **DECIDES CONTENT** | ⚠️ MODIFY | Main entry point. Routes to Pro Mode (Nano Banana). Contains complex logic for preview vs full feeds. |
| `app/api/feed-planner/generate-all-images/route.ts` | Batch generation orchestrator | **TRANSPORT** | ✅ KEEP | Simple orchestrator. Calls generate-single for each post. |
| `app/api/feed-planner/preview-feed/route.ts` | Preview feed data retrieval | **TRANSPORT** | ✅ KEEP | Only reads data, doesn't generate. |
| `app/api/blueprint/generate-grid/route.ts` | Blueprint grid generation | **DECIDES CONTENT** | 🧊 FREEZE | Uses blueprint templates. Generates 9-scene grid. |
| `app/api/blueprint/generate-concept-image/route.ts` | Concept image generation | **TRANSPORT** | ✅ KEEP | Simple Flux API wrapper. |

### 2. PROMPT GENERATION LOGIC

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/generation-helpers.ts` | Category/mood/style resolution | **DECIDES CONTENT** | ⚠️ MODIFY | Priority order logic. Resolves category/mood from multiple sources. Contains `getCategoryAndMood`, `getFashionStyleForPosition`, `getCoherentStyleParameters`, `injectAndValidateTemplate`. |
| `lib/feed-planner/style-coherence-resolver.ts` | Fashion style compatibility | **DECIDES CONTENT** | 🧊 FREEZE | Compatibility matrix (480 lines). Ensures fashion styles match categories. Should be replaced with constraint solver in future. |
| `lib/feed-planner/nano-banana-adapter.ts` | Template → Nano Banana conversion | **FORMATS TEXT** | 🧊 FREEZE | Translation layer. Converts templates to Nano Banana format. Contains flatlay substitution logic. Should be bypassed in new pipeline. |
| `lib/feed-planner/build-single-image-prompt.ts` | Template parsing | **FORMATS TEXT** | 🧊 FREEZE | Parses blueprint templates, extracts frames. Text manipulation only. |
| `lib/feed-planner/visual-composition-expert.ts` | Flux prompt generation | **DECIDES CONTENT** | 🚫 BYPASS | Creates Flux prompts. Redundant with prompt-constructor. Never call in Feed Planner (Pro Mode only). |
| `lib/maya/prompt-authority.ts` | Prompt routing layer | **DECIDES CONTENT** | 🧊 FREEZE | Routes to builders. Contains `generateFeedSinglePromptViaAuthority`. Maya system - DO NOT TOUCH per constraints. |
| `lib/maya/nano-banana-prompt-builder.ts` | Nano Banana prompt builder | **FORMATS TEXT** | 🧊 FREEZE | Builds Nano Banana prompts. Cleans prompts. Maya system - DO NOT TOUCH per constraints. |
| `lib/maya/blueprint-photoshoot-templates.ts` | Blueprint template library | **DECIDES CONTENT** | 🧊 FREEZE | 18 hardcoded templates (3000+ words). Source of scene definitions. |

### 3. TEMPLATE INJECTION & VALIDATION

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/dynamic-template-injector.ts` | Dynamic content injection | **DECIDES CONTENT** | 🧊 FREEZE | Injects dynamic content into templates. Used by `injectAndValidateTemplate`. |
| `lib/feed-planner/template-placeholders.ts` | Placeholder definitions | **FORMATS TEXT** | 🧊 FREEZE | Defines template placeholders. Reference only. |

### 4. SCENE SELECTION & COHERENCE

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/scene-selector.ts` | Scene selection logic | **DECIDES CONTENT** | 🧊 FREEZE | Selects scenes for feed positions. |
| `lib/feed-planner/scene-kits.ts` | Scene kit definitions | **DECIDES CONTENT** | 🧊 FREEZE | Defines scene kits. |
| `lib/feed-planner/style-realism-guards.ts` | Style realism validation | **DECIDES CONTENT** | 🧊 FREEZE | Validates style realism. |

### 5. FASHION & STYLE MAPPING

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/fashion-style-mapper.ts` | Fashion style mapping | **DECIDES CONTENT** | 🧊 FREEZE | Maps fashion styles. |

### 6. IMAGE PERSISTENCE & STORAGE

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/feed-persistence.ts` | Feed data persistence | **TRANSPORT** | ✅ KEEP | Saves feed data to database. |
| `lib/feed-planner/queue-images.ts` | Image queue management | **TRANSPORT** | ✅ KEEP | Manages image generation queue. |
| `lib/feed-planner/pre-generate-prompts.ts` | Prompt pre-generation | **TRANSPORT** | ✅ KEEP | Pre-generates prompts. |

### 7. ACCESS CONTROL & ROUTING

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/access-control.ts` | Access control logic | **TRANSPORT** | ✅ KEEP | Determines user access levels. |
| `lib/feed-planner/mode-detection.ts` | Mode detection | **TRANSPORT** | ✅ KEEP | Detects feed modes. |

### 8. STRATEGY & CONTENT GENERATION

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/instagram-strategy-agent.ts` | Strategy generation | **DECIDES CONTENT** | 🧊 FREEZE | Generates Instagram strategy. Not directly involved in image generation. |
| `lib/feed-planner/feed-prompt-expert.ts` | Feed prompt expert | **DECIDES CONTENT** | 🧊 FREEZE | Expert system for feed prompts. |
| `lib/feed-planner/content-calendar.ts` | Content calendar | **TRANSPORT** | ✅ KEEP | Manages content calendar. |
| `lib/feed-planner/caption-templates.ts` | Caption templates | **FORMATS TEXT** | ✅ KEEP | Caption generation, not image prompts. |
| `lib/feed-planner/caption-writer.ts` | Caption writing | **FORMATS TEXT** | ✅ KEEP | Writes captions, not image prompts. |

### 9. API CLIENTS

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/nano-banana-client.ts` | Nano Banana API client | **TRANSPORT** | ⚠️ MODIFY | API client. Currently auto-injects identity anchor. Should be explicit. |
| `lib/replicate-client.ts` | Replicate API client | **TRANSPORT** | ✅ KEEP | API client. No changes needed. |

### 10. UTILITIES & HELPERS

| File | Role | Decision Power | Action | Notes |
|------|------|---------------|--------|-------|
| `lib/feed-planner/rotation-manager.ts` | Style rotation | **DECIDES CONTENT** | 🧊 FREEZE | Rotates fashion styles across positions. |
| `lib/feed-planner/extract-aesthetic-from-template.ts` | Aesthetic extraction | **FORMATS TEXT** | 🧊 FREEZE | Extracts aesthetic from templates. |
| `lib/feed-planner/process-feed-posts-background.ts` | Background processing | **TRANSPORT** | ✅ KEEP | Background job processor. |

---

## CRITICAL FLOW ANALYSIS

### Flow 1: Preview Feed Generation (9 scenes in ONE prompt)

**Entry:** `app/api/feed/[feedId]/generate-single/route.ts` (line 402-472)

**Flow:**
```
generate-single (isPreviewFeed = true)
  → getCoherentStyleParameters() [generation-helpers.ts]
    → resolveCoherentStyle() [style-coherence-resolver.ts]
  → getBlueprintPhotoshootPrompt() [blueprint-photoshoot-templates.ts]
  → injectAndValidateTemplate() [generation-helpers.ts]
    → dynamic-template-injector.ts
  → adaptFeedPlannerToNanoBanana(mode: "preview_multi") [nano-banana-adapter.ts]
    → buildPreviewMultiScenePrompt() [nano-banana-adapter.ts]
  → buildNanoBananaPrompt() [nano-banana-prompt-builder.ts]
    → cleanStudioProPrompt() [nano-banana-prompt-builder.ts]
  → generateWithNanoBanana() [nano-banana-client.ts]
    → AUTO-INJECTS identity anchor [nano-banana-client.ts]
```

**Mutation Chain:** 6 layers
1. Template selection
2. Template injection
3. Adapter conversion
4. Builder formatting
5. Prompt cleaning
6. Identity anchor injection

**Files Involved:**
- `generation-helpers.ts` (DECIDES CONTENT)
- `style-coherence-resolver.ts` (DECIDES CONTENT)
- `blueprint-photoshoot-templates.ts` (DECIDES CONTENT)
- `nano-banana-adapter.ts` (FORMATS TEXT)
- `nano-banana-prompt-builder.ts` (FORMATS TEXT)
- `nano-banana-client.ts` (TRANSPORT - but mutates)

### Flow 2: Full Feed Planner Generation (9 single scenes)

**Entry:** `app/api/feed/[feedId]/generate-single/route.ts` (line 480-743)

**Flow:**
```
generate-single (isPreviewFeed = false)
  → getCoherentStyleParameters() [generation-helpers.ts]
    → resolveCoherentStyle() [style-coherence-resolver.ts]
  → getBlueprintPhotoshootPrompt() [blueprint-photoshoot-templates.ts]
  → injectAndValidateTemplate() [generation-helpers.ts]
  → generateFeedSinglePromptViaAuthority() [prompt-authority.ts]
    → buildSingleImagePrompt() [build-single-image-prompt.ts]
      → parseTemplateFrames() [build-single-image-prompt.ts]
    → adaptFeedPlannerToNanoBanana(mode: "single") [nano-banana-adapter.ts]
      → buildSingleScenePrompt() [nano-banana-adapter.ts]
    → buildNanoBananaPrompt() [nano-banana-prompt-builder.ts]
      → cleanStudioProPrompt() [nano-banana-prompt-builder.ts]
  → generateWithNanoBanana() [nano-banana-client.ts]
    → AUTO-INJECTS identity anchor [nano-banana-client.ts]
```

**Mutation Chain:** 7 layers
1. Template selection
2. Template injection
3. Template parsing
4. Adapter conversion
5. Builder formatting
6. Prompt cleaning
7. Identity anchor injection

**Files Involved:**
- `generation-helpers.ts` (DECIDES CONTENT)
- `style-coherence-resolver.ts` (DECIDES CONTENT)
- `blueprint-photoshoot-templates.ts` (DECIDES CONTENT)
- `build-single-image-prompt.ts` (FORMATS TEXT)
- `prompt-authority.ts` (DECIDES CONTENT - Maya system)
- `nano-banana-adapter.ts` (FORMATS TEXT)
- `nano-banana-prompt-builder.ts` (FORMATS TEXT)
- `nano-banana-client.ts` (TRANSPORT - but mutates)

### Flow 3: Blueprint Grid Generation (Free Tier)

**Entry:** `app/api/blueprint/generate-grid/route.ts`

**Flow:**
```
generate-grid
  → getBlueprintPhotoshootPrompt() [blueprint-photoshoot-templates.ts]
  → generateWithNanoBanana() [nano-banana-client.ts]
    → AUTO-INJECTS identity anchor [nano-banana-client.ts]
```

**Mutation Chain:** 2 layers
1. Template selection
2. Identity anchor injection

**Files Involved:**
- `blueprint-photoshoot-templates.ts` (DECIDES CONTENT)
- `nano-banana-client.ts` (TRANSPORT - but mutates)

---

## DECISION POINT ANALYSIS

### Where Scene Intent is Decided

**Current System (Style-First):**
1. `getCategoryAndMood()` → Resolves aesthetic category (luxury, minimal, beige)
2. `getFashionStyleForPosition()` → Rotates fashion styles
3. `resolveCoherentStyle()` → Ensures compatibility
4. `getBlueprintPhotoshootPrompt()` → Selects template based on category×mood
5. `injectAndValidateTemplate()` → Injects dynamic content

**Problem:** System starts with aesthetic categories, not activities. Templates are aesthetic-based, not activity-based.

**Files That Decide Content:**
- `generation-helpers.ts` (category/mood resolution)
- `style-coherence-resolver.ts` (fashion style compatibility)
- `blueprint-photoshoot-templates.ts` (template selection)
- `dynamic-template-injector.ts` (content injection)

### Where Prompts are Mutated

**Mutation Points:**
1. `injectAndValidateTemplate()` → Injects placeholders
2. `adaptFeedPlannerToNanoBanana()` → Converts format, substitutes flatlays
3. `buildNanoBananaPrompt()` → Structures prompt
4. `cleanStudioProPrompt()` → Removes formatting, unwanted terms
5. `nano-banana-client.ts` → Auto-injects identity anchor

**Problem:** Each mutation degrades intelligence. Original intent is lost.

---

## FILES TO FREEZE (Add Comments Only)

### High Priority Freezes

1. **`lib/maya/prompt-authority.ts`**
   - Comment: `// 🧊 FROZEN: Maya system - DO NOT MODIFY. Feed Planner will bypass this.`
   - Reason: Maya system, outside scope

2. **`lib/maya/nano-banana-prompt-builder.ts`**
   - Comment: `// 🧊 FROZEN: Maya system - DO NOT MODIFY. Feed Planner will use direct prompt shaping.`
   - Reason: Maya system, outside scope

3. **`lib/maya/blueprint-photoshoot-templates.ts`**
   - Comment: `// 🧊 FROZEN: Legacy template library. Will be replaced with scene-as-data.`
   - Reason: Hardcoded templates, will be replaced

4. **`lib/feed-planner/nano-banana-adapter.ts`**
   - Comment: `// 🧊 FROZEN: Translation layer. Will be bypassed in new pipeline.`
   - Reason: Translation layer, should be bypassed

5. **`lib/feed-planner/style-coherence-resolver.ts`**
   - Comment: `// 🧊 FROZEN: Legacy compatibility matrix. Will be replaced with constraint solver.`
   - Reason: Hardcoded matrix, will be replaced

6. **`lib/feed-planner/visual-composition-expert.ts`**
   - Comment: `// 🚫 BYPASS: Flux prompt builder. Feed Planner uses Pro Mode (Nano Banana) only.`
   - Reason: Not used in Feed Planner (Pro Mode only)

### Medium Priority Freezes

7. **`lib/feed-planner/build-single-image-prompt.ts`**
   - Comment: `// 🧊 FROZEN: Template parser. Will be replaced with scene-as-data parser.`
   - Reason: Text parsing, will be replaced

8. **`lib/feed-planner/dynamic-template-injector.ts`**
   - Comment: `// 🧊 FROZEN: Template injection. Will be replaced with scene composition.`
   - Reason: Template manipulation, will be replaced

---

## FILES TO BYPASS (Never Call in New Pipeline)

1. **`lib/feed-planner/visual-composition-expert.ts`**
   - Reason: Creates Flux prompts. Feed Planner uses Pro Mode (Nano Banana) only.

2. **`lib/maya/prompt-authority.ts`**
   - Reason: Maya routing layer. Feed Planner should compose scenes directly.

3. **`lib/maya/nano-banana-prompt-builder.ts`**
   - Reason: Maya prompt builder. Feed Planner should use direct prompt shaping.

---

## FILES TO DELETE (Dead Code)

1. **`lib/feed-planner/visual-composition-expert.ts`** (if confirmed unused)
   - Reason: Redundant with prompt-constructor. Not used in Feed Planner.

---

## FILES TO MODIFY (Core Changes)

1. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Reason: Main entry point. Contains complex routing logic. Needs simplification.

2. **`lib/feed-planner/generation-helpers.ts`**
   - Reason: Contains category/mood resolution. Needs to become activity-first.

3. **`lib/nano-banana-client.ts`**
   - Reason: Auto-injects identity anchor. Should be explicit.

---

## SUMMARY STATISTICS

**Total Files Audited:** 30+

**Files That Decide Content:** 12
- High risk: Can change image content
- Need careful handling

**Files That Format Text:** 6
- Low risk: Only format prompts
- Can be replaced with prompt shaper

**Files That Transport/Store:** 12
- Safe: No content decisions
- Keep as-is

**Mutation Layers Identified:** 7
- Preview flow: 6 layers
- Full planner flow: 7 layers
- Blueprint flow: 2 layers

**Files to Freeze:** 8
**Files to Bypass:** 3
**Files to Delete:** 1
**Files to Modify:** 3

---

## NEXT PHASE PREPARATION

**Phase 2 Requirements:**
- Identify single source of truth for scene intent
- Collapse scene resolution into ONE step
- Output structured scene data (not prompt text)
- Support both preview_multi and single_scene modes

**Key Files for Phase 2:**
- `lib/feed-planner/generation-helpers.ts` → Will become scene resolver
- `app/api/feed/[feedId]/generate-single/route.ts` → Will use scene resolver
- New file: `lib/feed-planner/scene-resolver.ts` → Single source of truth

---

**End of Phase 1 Audit**
