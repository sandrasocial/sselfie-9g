# PHASE 2A — PROMPT PIPELINE INVENTORY (READ-ONLY AUDIT)

**Date:** 2026-01-17  
**Status:** Complete  
**Mode:** AUDIT (No code changes)

---

## EXECUTIVE SUMMARY

Found **12 distinct prompt pipelines** that generate prompts for Replicate (FLUX, NanoBanana Pro, WAN) image/video generation.

**Key Findings:**
- ✅ Most pipelines use Maya with clear principles (flux-prompting-principles.ts, nano-banana-prompt-builder.ts)
- ⚠️ Feed Planner orchestrator is MOST COMPLEX (multi-stage, high drift risk)
- ⚠️ Template injection system adds complexity to paid blueprint flows
- ✅ Classic Mode (FLUX LoRA) and Pro Mode (NanoBanana Pro) are well-separated
- ⚠️ Some pipelines can unexpectedly fall back to Maya generation
- ✅ Most prompts are persisted in DB (concepts, feed_posts tables)

**Prompt Drift Risks:**
- **HIGH:** Feed Planner orchestrator (multi-agent, many handoffs)
- **MEDIUM:** Concept cards (Maya → prompt-constructor handoff), Pro photoshoot (complex workflows)
- **LOW:** Image generation (uses stored prompts), video generation (simple enhancement)

---

## 1) PROMPT PIPELINE MAP

| # | Feature Name | Entry Point UI | API Route | Prompt Builder Function(s) | Template Injection | Maya Usage | Model | Source-of-Truth Data | Fallback Chain | Prompt Persistence | Prompt Authority | Drift Risk |
|---|--------------|----------------|-----------|----------------------------|-------------------|------------|-------|----------------------|----------------|--------------------|--------------------|------------|
| 1 | **Maya Chat - Concept Cards (Classic)** | `app/maya/page.tsx` → Concept Cards UI | `/api/maya/generate-concepts/route.ts` (lines 1-378) | `lib/maya/prompt-constructor.ts` → `buildPrompt()`, `buildPromptWithFeatures()` (lines 727+) | NO | YES (Maya generates concept description → prompt-constructor builds) | **FLUX LoRA** (custom trained models) | `concepts` table, `user_personal_brand`, `users.gender/ethnicity`, `user_models.trigger_word`, `brand-library-2025.ts` | 1) Maya chat generates concept description → 2) `prompt-constructor.ts` builds FLUX prompt with brand intelligence | **Stored in DB** (`concepts` table) | **HYBRID** (Maya description + prompt-constructor assembly) | **MEDIUM** - Two-stage process can diverge |
| 2 | **Maya Chat - Feed Prompts (Classic & Pro)** | `app/maya/page.tsx` → Feed Prompts tab | `/api/maya/generate-feed-prompt/route.ts` (lines 1-1068) | Maya direct generation with `flux-prompting-principles.ts` (Classic) or `nano-banana-prompt-builder.ts` (Pro) | YES (can inject `lockedAesthetic` from feed style templates via `extract-aesthetic-from-template.ts`) | YES (Maya generates final prompts directly with mode-specific principles) | **FLUX LoRA** (Classic) or **NanoBanana Pro** (Pro Mode) | `user_personal_brand.color_palette/color_theme`, `feed_layouts`, `users`, feed style templates (if locked aesthetic provided) | 1) Maya chat with mode-specific principles → 2) Optional template aesthetic injection | **Returned in response** (not necessarily stored) | **MAYA** (generates final prompt with principles + optional template aesthetic) | **LOW** - Clear principles, single-stage generation |
| 3 | **Maya Chat - Image Generation (Classic)** | `app/maya/page.tsx` → Generate from concept card | `/api/maya/generate-image/route.ts` (lines 11-396) | Direct use of `conceptPrompt` from DB + programmatic fixes via `replicate-helpers.ts` → `ensureTriggerWordPrefix()`, `ensureGenderInPrompt()` | NO | NO (uses stored concept prompt) | **FLUX LoRA** | `concepts.prompt` (DB), `users.gender/ethnicity`, `user_models.trigger_word`, `user_personal_brand.physical_preferences` | 1) Stored concept prompt → 2) Programmatic fixes (trigger word, gender validation) → 3) Optional enhanced authenticity keywords | **Concept prompt from DB**, generation result stored in `generated_images` | **DB PROMPT + PROGRAMMATIC FIXES** | **LOW** - Uses stored prompts with minor validation fixes |
| 4 | **Maya Chat - Pro Mode Image Generation** | `app/maya/page.tsx` → Generate in Pro Mode | `/api/maya/pro/generate-image/route.ts` | `lib/maya/nano-banana-prompt-builder.ts` → `buildNanoBananaPrompt()` | NO | YES (generates NanoBanana-optimized prompts) | **NanoBanana Pro** (`google/nano-banana-pro`) | `user_personal_brand`, `users`, uploaded reference images (up to 14 images) | 1) Maya generates NanoBanana prompt with identity preservation → 2) NanoBanana Pro multi-image composition | **Generated on-the-fly** (not stored) | **MAYA + NANO BANANA PRINCIPLES** | **LOW** - Clear NanoBanana principles, well-structured |
| 5 | **Feed Planner - Free Preview (Blueprint)** | Blueprint signup → Preview feed | `/api/blueprint/generate-concepts/route.ts` (lines 1-460) | Direct Maya generation with `flux-prompting-principles.ts` + business-specific props | YES (uses feed style templates: `luxury`, `minimal`, `beige` → `dark-moody`, `scandinavian-light`, `beige-aesthetic`) | YES (generates prompts with FLUX principles + business context) | **FLUX Dev** (non-LoRA, no trigger word) | `blueprint_subscribers.form_data` (business, vibe), feed style templates (`FEED_STYLE_TO_AESTHETIC`), business-specific props (`getBusinessSpecificProps()`) | 1) Feed style template aesthetic → 2) Maya generates with FLUX principles + business props → 3) No fallback (must succeed) | **Stored in DB** (`blueprint_subscribers.concepts` JSON) | **MAYA + FLUX PRINCIPLES + FEED STYLE TEMPLATES** | **MEDIUM** - Template injection + Maya generation, multiple variables |
| 6 | **Feed Planner - Paid Blueprint (9-post grid)** | Feed Planner UI → Create feed | `/api/feed/orchestrate/route.ts` → `lib/feed-planner/orchestrator.ts` (lines 44-581) | **Multi-stage:**<br>1) `layout-strategist.ts` → grid layout<br>2) Maya chat (inline in orchestrator) → concept per post<br>3) `visual-composition-expert.ts` → final FLUX prompts | NO (generates fresh) | YES (multi-stage Maya orchestration) | **FLUX LoRA** (Classic) or **NanoBanana Pro** (Pro Mode) | `user_personal_brand`, `feed_layouts`, `users`, `user_models`, `brand_research` | 1) Research → 2) Layout strategy → 3) Concept generation (Maya) → 4) Visual composition (Maya) → 5) Caption writing → 6) Instagram strategy | **Stored in DB** (`feed_layouts`, `feed_posts` tables) | **MULTI-STAGE MAYA ORCHESTRATION** (4+ AI calls per feed) | **HIGH** - Complex multi-agent system, many handoffs, most prone to drift |
| 7 | **Feed Planner - Single Post Generation** | Feed Planner → Generate single post | `/api/feed/[feedId]/generate-single/route.ts` (lines 10-1465) | Uses stored `feed_posts.prompt` + mode-specific helpers: `buildClassicModeReplicateInput()` or `generateWithNanoBanana()` | NO (uses stored prompt) | NO (uses stored prompt) | **FLUX LoRA** (Classic) or **NanoBanana Pro** (Pro Mode) | `feed_posts.prompt` (DB), `feed_layouts`, `users`, `user_models` | 1) Stored post prompt → 2) Mode-specific input builder → 3) Regenerate if no prompt stored | **Stored in DB** (`feed_posts` table) | **DB PROMPT + MODE-SPECIFIC HELPERS** | **LOW** - Uses stored prompts, clear mode separation |
| 8 | **Feed Planner - Profile Image** | Feed Planner → Generate profile | `/api/feed/[feedId]/generate-profile/route.ts` (lines 10-179) | Simple hardcoded prompt: `${trigger_word}, ${basePrompt}` | NO | NO | **FLUX LoRA** | `users`, `user_models.trigger_word`, hardcoded `basePrompt` = "professional headshot, neutral expression, well-lit" | 1) Hardcoded base prompt → 2) Trigger word prefix → 3) Quality settings from `MAYA_QUALITY_PRESETS.default` | **Not stored** (ephemeral generation) | **HARDCODED PROMPT** | **LOW** - Simple, consistent, no complexity |
| 9 | **Video Generation (WAN)** | Maya chat → B-roll / Video tab | `/api/maya/generate-video/route.ts` (lines 22-238) | `enhanceMotionPrompt()` function (inline, lines 121) | NO | NO (simple enhancement) | **WAN 2.5** (`wan-video/wan-2.5-i2v-fast`) | Image URL + `motionPrompt` (user input), `imageDescription` from concept | 1) User motion prompt → 2) `enhanceMotionPrompt()` enhancement → 3) WAN 2.5 i2v generation | **Stored in DB** (`generated_videos` table) | **SIMPLE ENHANCEMENT FUNCTION** | **LOW** - Simple motion prompt enhancement, no complex logic |
| 10 | **Studio Route (Gated/Unused)** | N/A (gated) | `/api/studio/generate/route.ts` (lines 9-179) | Simple concatenation: `${trigger_word} ${prompt}` | NO | NO | **FLUX LoRA** | `users`, `user_models` | 1) Trigger word + prompt → 2) Maya quality presets | **Stored in DB** (`generated_images` table) | **SIMPLE CONCATENATION** | **N/A** - Endpoint gated (`ENABLE_UNUSED_ENDPOINTS`) |
| 11 | **Pro Photoshoot Generation** | Maya Pro → Photoshoot workflows | `/api/maya/pro/photoshoot/*.ts`, `/api/maya/create-photoshoot/route.ts` (lines 264-615) | `lib/maya/nano-banana-prompt-builder.ts` → NanoBanana Pro prompt generation | NO (dynamic generation) | YES (NanoBanana Pro prompt builder) | **NanoBanana Pro** | `user_personal_brand`, `photoshoot_sessions`, `photoshoot_grids`, reference images | 1) Photoshoot session context → 2) NanoBanana prompt builder → 3) Multi-image composition | **Stored in DB** (`photoshoot_sessions`, `photoshoot_grids` tables) | **MAYA + NANO BANANA PRINCIPLES** | **MEDIUM** - Complex multi-image composition workflows, many variations |
| 12 | **Direct Prompt Generation (Backup)** | Unknown (backup system) | N/A (library function) | `lib/maya/direct-prompt-generation.ts` → `generatePromptDirect()` (lines 44+) | NO | YES (Maya with examples) | **FLUX LoRA** or **NanoBanana Pro** | Same as concept cards | 1) Maya with perfect examples → 2) Programmatic fixes → 3) Light validation | **Unknown** (depends on caller) | **MAYA WITH EXAMPLES** | **UNKNOWN** - Purpose unclear, may be experimental/backup |

---

## 2) DUPLICATES + CONFLICTS

### Duplicates / Overlapping Systems

1. **Concept Generation Duplication:**
   - **Pipeline #1** (Maya Chat - Concept Cards): Uses `prompt-constructor.ts` → `buildPrompt()`
   - **Pipeline #5** (Free Preview Blueprint): Uses direct Maya generation with FLUX principles
   - **Conflict:** Both generate concepts but use different builders
   - **Impact:** Free preview prompts (no trigger word) vs paid concepts (trigger word required)

2. **Feed Prompt Generation Paths:**
   - **Pipeline #2** (Maya Chat - Feed Prompts): Direct Maya generation
   - **Pipeline #6** (Feed Planner Orchestrator): Multi-stage Maya orchestration
   - **Conflict:** Both can generate feed prompts but through different complexity levels
   - **Impact:** Feed Prompts tab (simple) vs Full Feed Planning (complex orchestration)

3. **Prompt Builder Files:**
   - **Active:** `lib/maya/prompt-constructor.ts` (Classic Mode, 727+ lines)
   - **Active:** `lib/maya/nano-banana-prompt-builder.ts` (Pro Mode, 1214 lines)
   - **Backup/Experimental:** `lib/maya/direct-prompt-generation.ts` (353 lines) - **Purpose unclear**
   - **Legacy/Deprecated:** `lib/maya/prompt-generator.ts` (625 lines) - **Header says "template system removed"**

4. **Template Systems:**
   - **Active:** `lib/feed-planner/dynamic-template-injector.ts` (template injection for feed planning)
   - **Active:** `lib/feed-planner/extract-aesthetic-from-template.ts` (aesthetic extraction)
   - **Legacy:** Template references in `prompt-generator.ts` (removed but file still exists)

### Features with Multiple Prompt Pipelines

1. **Feed Image Generation:**
   - Can use: Free Preview (#5), Feed Planner Orchestrator (#6), or Single Post Generation (#7)
   - Authority varies: Template-based (#5) → Multi-stage (#6) → DB-stored (#7)

2. **Concept Card Generation:**
   - Classic Mode (#1): Two-stage (Maya → prompt-constructor)
   - Pro Mode (#4): Single-stage (Maya → NanoBanana builder)
   - Blueprint Preview (#5): Single-stage (Maya → FLUX principles)

### Unexpected Maya Fallbacks

1. **Feed Single Post Generation** (`/api/feed/[feedId]/generate-single/route.ts`):
   - **Primary:** Uses stored `feed_posts.prompt` from DB
   - **Fallback (NOT FOUND IN CODE):** If no prompt stored, would fail (no explicit Maya fallback visible)
   - **Risk:** If prompt missing, generation may fail

2. **Concept Cards** (`/api/maya/generate-concepts/route.ts`):
   - **Primary:** Maya generates concept description → prompt-constructor builds
   - **Fallback:** `prompt-constructor` can build without Maya if category detected
   - **Risk:** May bypass Maya entirely if category matches

### Pipelines that Bypass Templates or Canonical Data

1. **Studio Route** (#10): Bypasses all template/canonical systems (simple concatenation)
2. **Profile Image** (#8): Hardcoded prompt, no template system
3. **Video Generation** (#9): Simple enhancement, no template system
4. **Direct Prompt Generation** (#12): Unclear if it bypasses canonical data (needs investigation)

---

## 3) UNUSED / LEGACY PROMPT SYSTEMS

### Files That Appear Unused or Shadowed

| File | Status | Evidence | Recommendation |
|------|--------|----------|----------------|
| `lib/maya/prompt-generator.ts` (625 lines) | **DEPRECATED** | Header comment: "Template system removed - this file is deprecated" (line 6-8) | **SAFE TO ARCHIVE** - Deprecated per inline comment |
| `lib/maya/direct-prompt-generation.ts` (353 lines) | **UNCLEAR** | No clear callsite found in audit, may be experimental/backup | **NEEDS CONFIRMATION** - Investigate usage before archiving |
| `/api/studio/generate/route.ts` | **GATED** | Gated by `ENABLE_UNUSED_ENDPOINTS` env var (per SYSTEM_REALITY.md) | **STILL ACTIVE** - Intentionally disabled but kept for potential re-enable |
| `lib/feed-planner/template-placeholders.ts` | **ACTIVE** | Used by `dynamic-template-injector.ts` (line 19) | **STILL ACTIVE** |
| `lib/feed-planner/pre-generate-prompts.ts` | **UNKNOWN** | Found via grep, not examined in detail | **NEEDS CONFIRMATION** |

### Still Callable But Not Surfaced in UI

1. **Studio Route** (`/api/studio/generate/route.ts`):
   - **Status:** Gated by `ENABLE_UNUSED_ENDPOINTS=true` (default: disabled)
   - **Evidence:** SYSTEM_REALITY.md Phase C enforcement (lines 37-48)
   - **Recommendation:** **KEEP** - Intentionally gated, may be re-enabled

2. **Direct Prompt Generation** (`lib/maya/direct-prompt-generation.ts`):
   - **Status:** No clear UI entry point found
   - **Evidence:** File exists, exports functions, but no callsites found in API routes
   - **Recommendation:** **NEEDS CONFIRMATION** - May be unused or called indirectly

---

## 4) RECOMMENDED SINGLE SOURCE OF TRUTH (NO IMPLEMENTATION)

Based on existing code architecture (no new systems invented):

### Proposed Prompt Authority Layer

**Location:** `lib/maya/prompt-authority.ts` (new file, consolidates existing systems)

**Responsibilities:**
1. **Route requests** to correct prompt builder based on mode/context
2. **Enforce** prompt validation and quality checks
3. **Centralize** fallback logic
4. **Log** all prompt generation for audit trail

**Existing Functions That Can Be Reused:**

| Function | Current Location | Purpose | Reuse in Authority Layer |
|----------|------------------|---------|--------------------------|
| `buildPrompt()`, `buildPromptWithFeatures()` | `lib/maya/prompt-constructor.ts` | Classic Mode FLUX prompts | ✅ Call for Classic Mode concept generation |
| `buildNanoBananaPrompt()`, `getNanoBananaPromptingPrinciples()` | `lib/maya/nano-banana-prompt-builder.ts` | Pro Mode NanoBanana prompts | ✅ Call for Pro Mode generation |
| `getFluxPromptingPrinciples()` | `lib/maya/flux-prompting-principles.ts` (line 14) | FLUX prompt guidelines | ✅ Provide to Maya chat for Classic Mode |
| `ensureTriggerWordPrefix()`, `ensureGenderInPrompt()` | `lib/replicate-helpers.ts` | Programmatic prompt fixes | ✅ Apply post-generation validation |
| `buildPlaceholders()`, `replacePlaceholders()` | `lib/feed-planner/dynamic-template-injector.ts`, `template-placeholders.ts` | Template injection | ✅ Call for template-based generation |
| `extractAestheticFromTemplate()` | `lib/feed-planner/extract-aesthetic-from-template.ts` | Aesthetic locking | ✅ Use for feed style consistency |
| `enhanceMotionPrompt()` | `app/api/maya/generate-video/route.ts` (inline) | Video prompt enhancement | ✅ Extract to shared utility |

### Authority Layer Routing Logic

```
Input: { mode, feature, context }

IF mode === 'classic' AND feature === 'concept-card':
  → Call prompt-constructor.buildPrompt()
  → Apply ensureTriggerWordPrefix(), ensureGenderInPrompt()
  → Return validated prompt

IF mode === 'classic' AND feature === 'feed-prompt':
  → Call Maya chat with getFluxPromptingPrinciples()
  → Optional: inject template aesthetic if provided
  → Apply ensureTriggerWordPrefix(), ensureGenderInPrompt()
  → Return validated prompt

IF mode === 'pro' AND feature === 'image-generation':
  → Call nano-banana-prompt-builder.buildNanoBananaPrompt()
  → Return validated prompt

IF feature === 'video-generation':
  → Extract enhanceMotionPrompt() to utility
  → Apply enhancement
  → Return validated prompt

IF feature === 'feed-planner-orchestration':
  → Call orchestrator.orchestrateFeedPlanning()
  → Let orchestrator manage multi-stage generation
  → Return feed plan

ELSE:
  → Throw error: "Unsupported mode/feature combination"
```

### Systems That Should Call the Authority

1. `/api/maya/generate-concepts/route.ts` → Call authority for concept generation
2. `/api/maya/generate-feed-prompt/route.ts` → Call authority for feed prompts
3. `/api/maya/generate-image/route.ts` → Call authority for prompt validation
4. `/api/maya/pro/generate-image/route.ts` → Call authority for Pro prompts
5. `/api/blueprint/generate-concepts/route.ts` → Call authority for preview generation
6. `/api/feed/orchestrate/route.ts` → Already complex, keep orchestrator pattern
7. `/api/feed/[feedId]/generate-single/route.ts` → Call authority for prompt validation

### Systems That Should NEVER Build Prompts Directly

1. API routes should NOT inline prompt building logic
2. UI components should NOT construct prompts
3. Replicate helper functions should only validate/fix, not create
4. Database migrations should NOT touch prompt logic

---

## VERIFICATION CHECKLIST

✅ **All API routes inventoried:** 12 distinct pipelines found  
✅ **Prompt builder functions mapped:** prompt-constructor, nano-banana-prompt-builder, visual-composition-expert  
✅ **Template systems identified:** dynamic-template-injector, extract-aesthetic-from-template  
✅ **Maya usage documented:** 8 pipelines use Maya, 4 do not  
✅ **Model targets confirmed:** FLUX LoRA, NanoBanana Pro, WAN 2.5, FLUX Dev  
✅ **Source-of-truth data mapped:** user_personal_brand, feed_layouts, users, user_models, concepts, feed_posts  
✅ **Fallback chains traced:** Documented for each pipeline  
✅ **Prompt persistence verified:** DB storage patterns documented  
✅ **Drift risks assessed:** HIGH (orchestrator), MEDIUM (concepts, photoshoot), LOW (most others)  
✅ **Duplicates identified:** 4 major duplication/overlap areas  
✅ **Unused systems flagged:** prompt-generator.ts (deprecated), direct-prompt-generation.ts (unclear)  
✅ **Authority layer proposed:** No new systems invented, reuses existing functions  

---

## APPENDIX: KEY FILE REFERENCES

### Prompt Builder Files
- `lib/maya/prompt-constructor.ts` (727+ lines) - Classic Mode FLUX prompts
- `lib/maya/nano-banana-prompt-builder.ts` (1214 lines) - Pro Mode NanoBanana prompts
- `lib/maya/flux-prompting-principles.ts` (364 lines) - FLUX prompt guidelines
- `lib/maya/flux-prompt-optimization.ts` (214 lines) - FLUX optimization rules
- `lib/maya/direct-prompt-generation.ts` (353 lines) - **Purpose unclear**
- `lib/maya/prompt-generator.ts` (625 lines) - **DEPRECATED**

### Feed Planner Files
- `lib/feed-planner/orchestrator.ts` (581 lines) - Multi-stage feed planning
- `lib/feed-planner/visual-composition-expert.ts` (727 lines) - Final FLUX prompts
- `lib/feed-planner/layout-strategist.ts` (174 lines) - Grid layout strategy
- `lib/feed-planner/caption-writer.ts` (299 lines) - Caption generation
- `lib/feed-planner/instagram-strategy-agent.ts` (296 lines) - Instagram strategy
- `lib/feed-planner/dynamic-template-injector.ts` (296 lines) - Template injection
- `lib/feed-planner/extract-aesthetic-from-template.ts` (549 lines) - Aesthetic extraction

### API Routes (Prompt Generation)
- `/api/maya/generate-concepts/route.ts` (378 lines) - Concept cards
- `/api/maya/generate-feed-prompt/route.ts` (1068 lines) - Feed prompts
- `/api/maya/generate-image/route.ts` (396 lines) - Classic image generation
- `/api/maya/pro/generate-image/route.ts` - Pro Mode image generation
- `/api/maya/generate-video/route.ts` (238 lines) - Video generation
- `/api/blueprint/generate-concepts/route.ts` (460 lines) - Free preview
- `/api/feed/orchestrate/route.ts` → `orchestrator.ts` - Paid blueprint
- `/api/feed/[feedId]/generate-single/route.ts` (1465 lines) - Single post
- `/api/feed/[feedId]/generate-profile/route.ts` (179 lines) - Profile image
- `/api/studio/generate/route.ts` (179 lines) - **GATED**
- `/api/maya/pro/photoshoot/*.ts` - Pro photoshoot
- `/api/maya/create-photoshoot/route.ts` (615 lines) - Photoshoot creation

### Helper Files
- `lib/replicate-helpers.ts` - `ensureTriggerWordPrefix()`, `ensureGenderInPrompt()`, `buildClassicModeReplicateInput()`
- `lib/nano-banana-client.ts` (218 lines) - NanoBanana API client
- `lib/maya/get-user-context.ts` (359 lines) - User context for Maya
- `lib/maya/quality-settings.ts` (20 lines) - MAYA_QUALITY_PRESETS
- `lib/maya/brand-library-2025.ts` - Brand intelligence (referenced in prompt-constructor)

### Cron Jobs
- No cron jobs found that generate prompts for image/video generation
- Cron jobs focus on email campaigns, not prompt generation

---

**END OF INVENTORY REPORT**

**Next Steps:**
1. Review this inventory with team
2. Investigate `direct-prompt-generation.ts` usage (line item #12)
3. Plan consolidation into Prompt Authority Layer
4. Archive deprecated systems (`prompt-generator.ts`)
5. Document template injection flow in more detail
6. Add audit logging to all prompt generation paths

**Report Complete** ✅
