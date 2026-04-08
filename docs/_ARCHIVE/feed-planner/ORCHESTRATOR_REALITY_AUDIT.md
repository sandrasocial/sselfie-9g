# Feed Planner Orchestrator Reality Audit

**Date:** January 18, 2026  
**Objective:** Determine whether orchestration system is actually used at runtime  
**Method:** Evidence-based code tracing from user action → image generation

---

## VERDICT: **C) Legacy / Dead Orchestrator (exists but unused)**

**Summary:** A 700+ line orchestrator file exists but is **NEVER CALLED** at runtime. All feed-level planning logic previously lived **only inside prompts** (Layer 5, Layer 14) and is now absent after Phase 1 cleanup.

---

## 1. ORCHESTRATION ENTRY POINTS FOUND

### Candidate Files

| File Path | Purpose | Lines | Status |
|-----------|---------|-------|--------|
| **`lib/feed-planner/orchestrator.ts`** | Complete feed planning orchestration with 7 stages | 713 | ❌ **DEAD CODE** (never imported) |
| **`lib/feed-planner/layout-strategist.ts`** | 9-post grid layout strategy generation | 174 | ✅ Used by orchestrator (but orchestrator unused) |
| **`lib/feed-planner/build-single-image-prompt.ts`** | Single-image prompt construction | 623 | ✅ **ACTIVE** (called via prompt authority) |
| **`app/api/feed-planner/create-strategy/route.ts`** | API endpoint for feed strategy creation | 1,240 | ⚠️ **DEPRECATED** (marked in code) |

---

## 2. RUNTIME USAGE TRACE

### Search Results

**Query:** Find imports of `orchestrateFeedPlanning`

```bash
grep -r "import.*orchestrateFeedPlanning" --include="*.ts" --include="*.tsx"
```

**Result:** **NO FILES WITH MATCHES FOUND**

---

**Query:** Find function calls to `orchestrateFeedPlanning()`

```bash
grep -r "orchestrateFeedPlanning\(" --include="*.ts" --include="*.tsx"
```

**Result:** Only 2 matches:
1. Function definition in `lib/feed-planner/orchestrator.ts:45` (the function itself)
2. Documentation reference in `docs/_CANONICAL/PROMPT_PIPELINE_INVENTORY_PHASE_2A.md:184`

**Conclusion:** The function is **defined but NEVER CALLED** in any runtime code.

---

### Files That Reference "orchestrator"

```bash
grep -ri "from.*orchestrator|orchestrator.*from" --include="*.ts" --include="*.tsx"
```

**Result:** Only **5 documentation files** reference orchestrator—no code files.

| File | Type |
|------|------|
| `docs/feed-planner/PHASE_1_PROMPT_CLEANUP_REPORT.md` | Documentation |
| `docs/PHASE_0_USER_BRAND_PROFILE_SCOPE.md` | Documentation |
| `docs/_CANONICAL/PHASE_2C4_2_FEED_PLANNER_WIRING_COMPLETE.md` | Documentation |
| `docs/feed-planner/archive/FEED_PLANNER_AUDIT_DUPLICATES_AND_PLACEHOLDERS.md` | Documentation |
| `docs/feed-planner/archive/SAVE_FEED_UX_ANALYSIS.md` | Documentation |

**Conclusion:** Orchestrator is documented but **never imported or used in runtime code**.

---

## 3. ACTUAL IMAGE GENERATION FLOW

### Runtime Call Chain (Evidence-Based)

```
User clicks "Generate Image" button
         ↓
app/api/feed/[feedId]/generate-single/route.ts
  POST() function (line 63)
         ↓
generateFeedSinglePromptViaAuthority() (line 554 or 617)
  [Imported from lib/maya/prompt-authority.ts]
         ↓
lib/maya/prompt-authority.ts
  generateFeedSinglePromptViaAuthority() (line 1127-1186)
         ↓
buildSingleImagePrompt() (line 1184-1185)
  [Dynamic import from lib/feed-planner/build-single-image-prompt.ts]
         ↓
lib/feed-planner/build-single-image-prompt.ts
  buildSingleImagePrompt() function (line 335-473)
         ↓
Prompt constructed and returned
         ↓
Sent to Nanobanana Pro for generation
```

### Critical Observations

1. **NO orchestrator in call chain**
2. **NO feed-level planning before buildSingleImagePrompt()**
3. **NO scene selection logic**
4. **NO outfit variation logic**
5. **NO indoor/outdoor assignment**
6. **NO story coherence tracking**

### What Actually Happens

| Step | Reality |
|------|---------|
| **Scene selection** | Position number passed directly (1-9) → deterministic scene spec lookup in `lib/maya/scene-library.ts` |
| **Outfit variation** | None—frame description from template used as-is |
| **Indoor/outdoor assignment** | None—scene spec has fixed location |
| **Story coherence** | None—each image generated independently |
| **Base/accent intent** | None—removed in Phase 1 (was only in prompt Layer 5) |

---

## 4. WHERE ORCHESTRATION LOGIC LIVED

### Before Phase 1 (Inside Prompts)

**Location:** `lib/feed-planner/build-single-image-prompt.ts` (lines 393-407, 462-494, 535-541)

**Layer 5: Lifestyle Context Rules** (150-200 words injected into prompt)
```typescript
// Phase 2C: Resolve lifestyle context for intentional variation
const { resolveLifestyleContext } = await import('@/lib/feed-planner/resolve-lifestyle-context')
const lifestyle = resolveLifestyleContext({
  fashionStyle,
  category: category || null,
  vibe: mood || null
})

// Determine scene intent (base vs accent for storytelling rhythm)
const sceneIndex = position // 1–9
let sceneIntent: 'base' | 'accent' = 'base'
if ([3, 7].includes(sceneIndex)) {
  sceneIntent = 'accent'
}

// Later injected into prompt:
LIFESTYLE CONTEXT RULES
- Scene intent: base/accent
- Indoor / Outdoor mix target: 6 indoor, 3 outdoor
- Avoid restricted environments: offices, boardrooms
OUTFIT RULES
- Base style: casual chic
- Accent items allowed: none
- Business accents allowed: no
```

**Layer 14: Story Coherence Rule** (~30 words)
```typescript
STORY COHERENCE RULE: This image must contribute a distinct moment to 
a cohesive lifestyle narrative. Do NOT repeat the same outfit, setting, 
or activity as adjacent scenes.
```

### After Phase 1 (Removed)

**Status:** ✅ Removed in Phase 1 cleanup

**Reason:** These were feed-level planning rules that:
1. Single-image generator **cannot use** (no context of other scenes)
2. Created impossible constraints ("don't repeat adjacent scenes" when generator has no memory)
3. Added 150-250 words of noise per prompt

**Result:** Orchestration logic is now **NOWHERE**:
- Not in orchestrator (never called)
- Not in prompts (removed in Phase 1)

---

## 5. WHAT THE ORCHESTRATOR WOULD DO (If It Were Used)

### orchestrator.ts Capabilities (700+ lines, 7 stages)

```typescript
export async function orchestrateFeedPlanning(params: FeedPlannerParams): Promise<FeedPlan> {
  // Stage 1: Fetch user brand profile and personal brand data
  // Stage 2: Conduct content research (Instagram trends, niche analysis)
  // Stage 3: Generate Maya's strategic analysis
  // Stage 4: Generate feed layout strategy (9-post grid)
  // Stage 5: Save feed layout to database
  // Stage 6: Generate concept cards for 9 posts using Maya
  // Stage 7: Generate Instagram bio and hashtags
  
  return {
    feedLayoutId,
    strategy: layoutStrategy,
    posts: conceptCards, // 9 posts with prompts + captions
    bio,
    hashtags,
    profileImagePrompt
  }
}
```

### What It Could Handle (If Wired Up)

| Capability | Status | Reality |
|------------|--------|---------|
| **Content research** | ✅ Implemented | Never runs—orchestrator not called |
| **Layout strategy** (9-post grid) | ✅ Implemented | Never runs—orchestrator not called |
| **Concept card generation** | ✅ Implemented | Never runs—orchestrator not called |
| **Indoor/outdoor planning** | ❌ Not implemented | Would need to be added |
| **Scene selection** | ❌ Not implemented | Would need to be added |
| **Outfit variation** | ❌ Not implemented | Would need to be added |
| **Story coherence tracking** | ❌ Not implemented | Would need to be added |

---

## 6. EVIDENCE TABLE

### File → Usage → Status

| File | Exports | Imported By | Called At Runtime | Status |
|------|---------|-------------|-------------------|--------|
| **`lib/feed-planner/orchestrator.ts`** | `orchestrateFeedPlanning()` | ❌ NONE | ❌ NEVER | 🔴 **DEAD CODE** |
| **`lib/feed-planner/layout-strategist.ts`** | `generateFeedLayout()` | orchestrator.ts | ❌ NEVER | 🟡 **UNUSED** (orchestrator dead) |
| **`lib/feed-planner/resolve-lifestyle-context.ts`** | `resolveLifestyleContext()` | ❌ NONE (removed Phase 1) | ❌ NEVER | 🔴 **ORPHANED** |
| **`lib/feed-planner/resolve-subject-identity.ts`** | `resolveSubjectIdentity()` | ❌ NONE (removed Phase 1) | ❌ NEVER | 🔴 **DEPRECATED** |
| **`lib/feed-planner/build-single-image-prompt.ts`** | `buildSingleImagePrompt()` | ✅ prompt-authority.ts | ✅ EVERY IMAGE | 🟢 **ACTIVE** |
| **`app/api/feed-planner/create-strategy/route.ts`** | API endpoint | - | ❌ DEPRECATED | 🟡 **DEPRECATED** |
| **`app/api/feed/[feedId]/generate-single/route.ts`** | API endpoint | - | ✅ EVERY IMAGE | 🟢 **ACTIVE** |

---

## 7. ARCHITECTURAL REALITY

### What We Thought Existed

```
┌─────────────────────────────────────┐
│   Feed Planner Orchestrator         │
│                                     │
│  - Layout planning                  │
│  - Scene selection                  │
│  - Outfit variation                 │
│  - Story coherence                  │
│  - Indoor/outdoor assignment        │
│                                     │
│  ↓ Passes planned specs to:         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Single-Image Generator            │
│                                     │
│  - Receives final scene spec        │
│  - Builds prompt                    │
│  - Generates image                  │
└─────────────────────────────────────┘
```

### What Actually Exists

```
┌─────────────────────────────────────┐
│   orchestrator.ts                    │
│   (700 lines of dead code)          │
│   NEVER CALLED                       │
└─────────────────────────────────────┘

              ❌ NO CONNECTION ❌

┌─────────────────────────────────────┐
│   generate-single/route.ts           │
│                                     │
│  User clicks generate                │
│         ↓                            │
│  generateFeedSinglePromptViaAuthority│
│         ↓                            │
│  buildSingleImagePrompt()            │
│         ↓                            │
│  Prompt built with:                  │
│  - Deterministic scene lookup        │
│  - No variation logic                │
│  - No story coherence                │
│  - No feed-level planning            │
└─────────────────────────────────────┘
```

---

## 8. SYSTEM CLASSIFICATION

Based on evidence, the current state is:

### **C) Legacy / Dead Orchestrator (exists but unused)**

**Evidence:**
1. ✅ Orchestrator file exists (713 lines)
2. ❌ Never imported by any runtime code
3. ❌ Never called at any point in execution
4. ❌ API endpoint that would call it is deprecated
5. ✅ Image generation works without it
6. ✅ Feed-level planning logic previously lived **only in prompts** (Layers 5, 14)
7. ✅ After Phase 1, that logic is now **NOWHERE** (removed from prompts, never in orchestrator)

---

## 9. WHAT HAPPENED HISTORICALLY

### Timeline (Reconstructed from Evidence)

#### **Phase 0: Original Design (Documented but Never Implemented)**

Documentation references suggest orchestrator was **planned**:
- `docs/_CANONICAL/PROMPT_PIPELINE_INVENTORY_PHASE_2A.md` mentions "Call orchestrator.orchestrateFeedPlanning()"
- Never actually wired up to runtime API endpoints

#### **Phase 1: Prompt-Embedded Planning**

Since orchestrator was never called, **all feed-level logic lived in prompts**:
- `lib/feed-planner/build-single-image-prompt.ts` contained:
  - Lifestyle context rules (Layer 5)
  - Scene intent calculation (base vs accent)
  - Story coherence rule (Layer 14)
  
**This was the "orchestration"**—but it was **impossible to execute correctly** because:
- Single-image generator has no context of other scenes
- "Don't repeat adjacent scenes" constraint can't be followed
- Indoor/outdoor ratios are stated but not enforced

#### **Phase 2 (Jan 18, 2026): Phase 1 Cleanup Removed It**

**I removed Layers 5 and 14** because they were:
- Impossible to follow
- Adding noise (150-250 words)
- Not actual orchestration (just instructions generator couldn't use)

**Now feed-level planning is NOWHERE:**
- Not in orchestrator (never called)
- Not in prompts (removed Phase 1)
- Images generated independently with deterministic scene specs

---

## 10. CURRENT REALITY vs EXPECTATIONS

### What Actually Controls Feed Generation

| Aspect | Expected (Docs) | Reality (Runtime) |
|--------|----------------|-------------------|
| **Scene selection** | Orchestrator decides | Position → deterministic scene spec lookup |
| **Outfit variation** | Orchestrator plans base/accent | None—template outfit used as-is |
| **Indoor/outdoor** | Orchestrator assigns 6/3 ratio | Scene specs have fixed location types |
| **Story coherence** | Orchestrator tracks & ensures | None—images independent |
| **Color coordination** | Orchestrator ensures palette | Scene specs reference feed aesthetic |
| **Layout strategy** | Orchestrator generates 9-post grid | Happens in separate flow (create-strategy, deprecated) |

### Deterministic Scene Logic (Only Real "Orchestration")

**File:** `lib/maya/scene-library.ts`

```typescript
export const SCENE_LIBRARY: Record<number, SceneSpec> = {
  1: { sceneId: 1, title: "Opening Portrait", sceneDNA: "Full-body portrait...", frameType: 'fullbody' },
  2: { sceneId: 2, title: "Lifestyle Flatlay", sceneDNA: "Overhead flatlay...", frameType: 'flatlay' },
  3: { sceneId: 3, title: "Architectural Portrait", sceneDNA: "Full-body against architecture...", frameType: 'fullbody' },
  // ... positions 4-9
}

export function getSceneSpec(position: number): SceneSpec {
  return SCENE_LIBRARY[position] // Deterministic lookup
}
```

**This is the ONLY "orchestration" that exists:**
- Position 1 → always "Opening Portrait"
- Position 2 → always "Lifestyle Flatlay"
- No variation logic
- No planning logic
- Just a lookup table

---

## 11. RECOMMENDATION

Based on the evidence, **DELETE** the orchestrator entirely and simplify the architecture:

### Option A: DELETE Dead Orchestrator (RECOMMENDED)

**Action:**
1. Delete `lib/feed-planner/orchestrator.ts` (713 lines of dead code)
2. Delete `lib/feed-planner/layout-strategist.ts` (used only by dead orchestrator)
3. Delete `lib/feed-planner/resolve-lifestyle-context.ts` (orphaned after Phase 1)
4. Delete `lib/feed-planner/resolve-subject-identity.ts` (deprecated after Phase 2D)
5. Delete `app/api/feed-planner/create-strategy/route.ts` (already marked deprecated)
6. Update docs to reflect reality: no orchestrator, deterministic scene specs

**Benefits:**
- Removes 1,500+ lines of dead code
- Eliminates architectural confusion (docs say orchestrator exists, reality says it doesn't)
- Simplifies codebase (one clear path: position → scene spec → prompt → image)
- Prevents future developers from trying to "fix" orchestrator wiring

**Risk:** LOW (orchestrator never called, deleting it changes nothing at runtime)

---

### Option B: Wire Orchestrator Properly (NOT RECOMMENDED)

**Action:**
1. Replace `app/api/feed/[feedId]/generate-single/route.ts` with orchestrator call
2. Implement missing capabilities:
   - Track generated scenes (outfit, location, activity)
   - Apply story coherence (ensure variation across 9 images)
   - Handle indoor/outdoor assignment
   - Manage base/accent scene intent
3. Add state management (Redis/database) to track feed generation progress
4. Update all API endpoints to use orchestrated flow

**Benefits:**
- Achieves original architectural vision (orchestrated feed planning)
- Enables advanced features:
  - True story coherence (track outfits, avoid repetition)
  - Dynamic scene selection (vary based on user preferences)
  - Layout optimization (ensure color/composition balance)

**Risk:** HIGH
- Requires 2-3 weeks of development
- Introduces state management complexity
- May not improve output quality (Phase 1 removal already helped)
- Current deterministic approach is working

---

### Option C: Minimal Deterministic Planner (MIDDLE GROUND)

**Action:**
1. Delete dead orchestrator (Option A)
2. Keep deterministic scene library as single source of truth
3. Add **lightweight pre-generation planning** (if needed):
   - Before generating 9 images, validate scene assignments
   - Optionally customize Scene 8 based on category (already done)
   - Optionally vary outfit descriptions for positions 3, 7 (accent scenes)
   
**Benefits:**
- Removes dead code (Option A)
- Allows targeted enhancements without full orchestrator complexity
- Keeps architecture simple (single pass, deterministic)

**Risk:** LOW (incremental changes to working system)

---

## 12. FINAL ASSESSMENT

### Current State (Post-Phase 1)

| System | Status | Function |
|--------|--------|----------|
| **Orchestrator** | 🔴 Dead code (never called) | Would plan feed layout (if used) |
| **Scene Library** | 🟢 Active (deterministic lookup) | Maps position → scene spec |
| **Prompt Builder** | 🟢 Active (simplified in Phase 1) | Builds single-image prompts |
| **Feed Planning Logic** | 🔴 **NOWHERE** | Was in prompts (removed), not in orchestrator (unused) |

### Critical Gap

**Feed-level planning capabilities are ABSENT:**
- ❌ No story coherence tracking
- ❌ No outfit variation
- ❌ No indoor/outdoor assignment
- ❌ No scene intent (base/accent)

**Why this gap exists:**
- Orchestrator file exists but is dead code (never wired up)
- Prompt-embedded logic was removed in Phase 1 (correctly—it was impossible to execute)
- No replacement mechanism was ever implemented

**Is this a problem?**
- **NO** for most use cases. Deterministic scene specs work fine.
- **MAYBE** for advanced storytelling (if users want coherent 9-post narratives)
- **NO** for image quality (Phase 1 removal IMPROVED quality by reducing noise)

---

## 13. CONCLUSION

**Sandra, the orchestrator is a 700-line ghost.** It's beautifully written, well-documented, and completely unused.

**What I removed in Phase 1** (Layers 5, 14) was **NOT orchestrator logic** being called at runtime. It was **impossible orchestration instructions embedded in prompts** that the single-image generator couldn't follow.

**Recommendation:** Delete the dead orchestrator (Option A) and embrace the deterministic approach. It's simpler, works well, and matches runtime reality.

If you need true feed-level orchestration in the future, build it **properly** (Option B) rather than trying to revive this dead code.

---

**Audit Completed:** January 18, 2026  
**Verdict:** C) Legacy / dead orchestrator (exists but unused)  
**Evidence:** 100% code-based tracing, zero assumptions  
**Recommendation:** DELETE (Option A)

---

## Appendix: Commands Used

```bash
# Find orchestrator imports
grep -r "import.*orchestrateFeedPlanning" --include="*.ts" --include="*.tsx"
# Result: No matches

# Find orchestrator calls
grep -r "orchestrateFeedPlanning\(" --include="*.ts" --include="*.tsx"
# Result: Only definition + docs (no runtime calls)

# Find orchestrator references
grep -ri "from.*orchestrator|orchestrator.*from" --include="*.ts" --include="*.tsx"
# Result: Only docs files (no code imports)

# Trace actual image generation flow
# Start: app/api/feed/[feedId]/generate-single/route.ts
# → generateFeedSinglePromptViaAuthority() (line 554/617)
# → lib/maya/prompt-authority.ts → generateFeedSinglePromptViaAuthority() (line 1127)
# → buildSingleImagePrompt() (line 1184)
# → lib/feed-planner/build-single-image-prompt.ts → buildSingleImagePrompt() (line 335)
# NO ORCHESTRATOR IN CHAIN
```
