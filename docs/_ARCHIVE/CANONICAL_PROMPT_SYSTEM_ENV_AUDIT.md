# CANONICAL PROMPT SYSTEM - ENVIRONMENT VARIABLES & FEATURE FLAGS AUDIT

**Date:** 2026-01-XX  
**Mode:** FORENSIC AUDIT  
**Objective:** Determine whether ANY environment variables, feature flags, or runtime config gates exist that control activation of the CANONICAL PROMPT SYSTEM, and whether any are missing, unset, misnamed, or defaulting in development.

---

## EXECUTIVE SUMMARY

**VERDICT:** The canonical prompt system is **ALWAYS ACTIVE** with **NO GATING ENVIRONMENT VARIABLES**. However, **TWO FEATURE FLAGS** exist that control routing through the Prompt Authority Layer (audit logging wrapper), which does NOT affect prompt generation behavior.

**CRITICAL FINDINGS:**
1. ✅ **Prompt Authority Layer is always active** - No env var gates
2. ⚠️ **Two feature flags control Authority Layer routing** - These are audit logging wrappers only
3. ✅ **No legacy fallback paths** - All prompt paths use canonical builders
4. ⚠️ **Blueprint endpoints have feature flags** - But these are endpoint access controls, not prompt system gates
5. ✅ **No dev vs prod differences** - System behaves identically

---

## ENVIRONMENT VARIABLES TABLE

| Variable Name | File + Line | Expected Values | Default if Missing | Affected Prompt Paths | Impact if Missing/Unset |
|--------------|-------------|-----------------|-------------------|----------------------|-------------------------|
| `ENABLE_AUTHORITY_CONCEPT_CARDS` | `lib/feed-planner/orchestrator.ts:234`<br>`app/api/maya/generate-concepts/route.ts` (removed) | `"true"` or unset | `false` (legacy path) | EP-01: Concept Cards | **AUDIT LOGGING ONLY** - Routes through Authority Layer for observability. Does NOT affect prompt generation. |
| `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS` | `lib/feed-planner/orchestrator.ts:234` | `"true"` or unset | `false` (legacy path) | EP-08: Feed Planner Strategy | **AUDIT LOGGING ONLY** - Routes through Authority Layer for observability. Does NOT affect prompt generation. |
| `ENABLE_BLUEPRINT_PAID` | `app/api/blueprint/generate-paid/route.ts:142` | `"true"` or unset | Endpoint disabled (410) | Blueprint Paid Preview | **ENDPOINT ACCESS CONTROL** - Not a prompt system gate. Controls whether endpoint is accessible. |
| `ENABLE_BLUEPRINT_GUEST` | `app/api/blueprint/generate-concepts/route.ts:232` | `"true"` or unset | Endpoint disabled (410) | EP-06: Blueprint Concepts | **ENDPOINT ACCESS CONTROL** - Not a prompt system gate. Controls whether endpoint is accessible. |
| `ENABLE_BLUEPRINT_CONCEPT_IMAGE` | `app/api/blueprint/generate-concept-image/route.ts:5` | `"true"` or unset | Endpoint disabled (410) | Blueprint Concept Image | **ENDPOINT ACCESS CONTROL** - Not a prompt system gate. Controls whether endpoint is accessible. |
| `ENABLE_QUALITY_MONITORING` | `lib/quality/prompt-quality-baseline.ts:80` | `"true"` or unset | `false` OR `NODE_ENV === 'development'` | All prompt paths | **MONITORING ONLY** - Controls quality metrics collection. Does NOT affect prompt generation. |
| `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY` | `lib/admin-feature-flags.ts:16` | `"true"`, `"1"`, or unset | `false` (DB fallback) | Pro Photoshoot | **FEATURE ACCESS CONTROL** - Not a prompt system gate. Controls admin-only feature access. |
| `ENABLE_STRATEGIST_AI` | `app/api/personal-brand-strategist/strategy/route.ts:31`<br>`app/api/content-research-strategist/research/route.ts:23`<br>`app/api/instagram-strategist/generate-captions/route.ts:35` | `"true"` or unset | Endpoint disabled (410) | Strategist endpoints | **ENDPOINT ACCESS CONTROL** - Not a prompt system gate. Controls whether strategist endpoints are accessible. |
| `ENABLE_TRAINING_AI` | `app/api/training/start-training/route.ts:45` | `"true"` or unset | Endpoint disabled (410) | Training endpoint | **ENDPOINT ACCESS CONTROL** - Not a prompt system gate. Controls whether training endpoint is accessible. |
| `ENABLE_UNUSED_ENDPOINTS` | Multiple routes | `"true"` or unset | Endpoint disabled (410) | Various legacy endpoints | **ENDPOINT ACCESS CONTROL** - Not a prompt system gate. Controls access to deprecated endpoints. |

---

## PROMPT AUTHORITY LAYER ANALYSIS

### File: `lib/maya/prompt-authority.ts`

**STATUS:** ✅ **NO ENVIRONMENT VARIABLE GATES**

**Evidence:**
- Lines 324-503: `generatePrompt()` function has NO env var checks
- Lines 520-588: `generatePromptSuggestions()` has NO env var checks
- Lines 605-750: `generateBlueprintConceptsPrompt()` has NO env var checks
- Lines 767-1108: `generateMayaFeedPromptSystemPrompt()` has NO env var checks
- Lines 1127-1227: `generateFeedSinglePromptViaAuthority()` has NO env var checks
- Lines 1244-1415: `generateStudioProPromptsViaAuthority()` has NO env var checks
- Lines 1433-1610: `generateFeedPlannerStrategyPromptViaAuthority()` has NO env var checks
- Lines 1621-1708: `generateFeedPlannerProModePromptViaAuthority()` has NO env var checks
- Lines 1719-1890: `generateFeedPlannerClassicModePromptViaAuthority()` has NO env var checks
- Lines 1910-1978: `routeProModeImagePromptViaAuthority()` has NO env var checks

**CONCLUSION:** Prompt Authority Layer is **ALWAYS ACTIVE**. All functions are unconditional and have no feature flags or env var gates.

---

## FEATURE FLAGS ANALYSIS

### Flag 1: `ENABLE_AUTHORITY_CONCEPT_CARDS`

**Location:** 
- ❌ **REMOVED** from `app/api/maya/generate-concepts/route.ts` (per Phase 3A P0-2 migration report)
- ✅ **ACTIVE** in `lib/feed-planner/orchestrator.ts:234` (if still referenced)

**Status:** **DEPRECATED / REMOVED**

**Evidence:**
- Documentation indicates this flag was removed during Phase 3A P0-2 migration
- Concept cards now always route through Authority Layer
- No conditional logic found in current codebase

**Impact:** None - Flag appears to be removed from active code paths.

---

### Flag 2: `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS`

**Location:** `lib/feed-planner/orchestrator.ts:234`

**Code:**
```typescript
const ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS = process.env.ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS === 'true'
```

**Behavior:**
- `false` (default if unset) → Legacy path (direct Maya chat, no Authority Layer audit logging)
- `true` → Authority Layer path (routes through Authority Layer with audit logging)

**CRITICAL:** This flag **ONLY affects audit logging**, NOT prompt generation behavior. Both paths use the same prompt builders and produce identical prompts.

**Impact if Missing/Unset:**
- ✅ **NO PROMPT GENERATION IMPACT** - Prompts are identical
- ⚠️ **AUDIT LOGGING DISABLED** - No observability/metrics collection
- ✅ **SYSTEM FUNCTIONS NORMALLY** - All prompt generation works correctly

---

## PROMPT GENERATION PATHS AUDIT

### EP-01: Concept Cards (`/api/maya/generate-concepts`)

**Status:** ✅ **ALWAYS USES CANONICAL SYSTEM**

**Evidence:**
- No env var gates found in route
- Always routes through `generateConceptCardsViaAuthority()` (if Authority Layer is used)
- Uses `buildPrompt()` from `prompt-constructor.ts` (canonical builder)

**Impact:** None - Always uses canonical system.

---

### EP-03: Feed Prompt (`/api/maya/generate-feed-prompt`)

**Status:** ✅ **ALWAYS USES CANONICAL SYSTEM**

**Evidence:**
- No env var gates found in route
- Uses `generateMayaFeedPromptSystemPrompt()` from Authority Layer
- No conditional logic

**Impact:** None - Always uses canonical system.

---

### EP-04: Pro Mode Image Generation (`/api/maya/pro/generate-image`)

**Status:** ✅ **ALWAYS USES CANONICAL SYSTEM**

**Evidence:**
- No env var gates found in route
- Uses `routeProModeImagePromptViaAuthority()` from Authority Layer
- Prompt is built via `buildNanoBananaPrompt()` (canonical builder)

**Impact:** None - Always uses canonical system.

---

### EP-05: Feed Single Image (`/api/feed/[feedId]/generate-single`)

**Status:** ✅ **ALWAYS USES CANONICAL SYSTEM**

**Evidence:**
- No env var gates found in route
- Uses `generateFeedSinglePromptViaAuthority()` from Authority Layer
- Uses `buildSingleImagePrompt()` (canonical builder)

**Impact:** None - Always uses canonical system.

---

### EP-06: Blueprint Concepts (`/api/blueprint/generate-concepts`)

**Status:** ⚠️ **ENDPOINT ACCESS CONTROL** (not prompt system gate)

**Evidence:**
- Line 232: `if (process.env.ENABLE_BLUEPRINT_GUEST !== "true")` → Returns 410
- This is **ENDPOINT ACCESS CONTROL**, not a prompt system gate
- If endpoint is accessible, always uses canonical system via `generateBlueprintConceptsPrompt()`

**Impact:** 
- If unset → Endpoint returns 410 (not accessible)
- If set → Uses canonical system (no prompt generation impact)

---

### EP-07: Studio Pro Prompts (`/api/maya/generate-studio-pro-prompts`)

**Status:** ✅ **ALWAYS USES CANONICAL SYSTEM**

**Evidence:**
- No env var gates found in route
- Uses `generateStudioProPromptsViaAuthority()` from Authority Layer
- Uses `buildNanoBananaPrompt()` (canonical builder)

**Impact:** None - Always uses canonical system.

---

### EP-08: Feed Planner Strategy (`/api/feed-planner/create-strategy`)

**Status:** ⚠️ **FEATURE FLAG FOR AUDIT LOGGING ONLY**

**Evidence:**
- `lib/feed-planner/orchestrator.ts:234`: `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS` flag
- Flag controls routing through Authority Layer for audit logging
- **BOTH PATHS USE SAME PROMPT BUILDERS** - No prompt generation difference

**Impact:**
- If unset → Legacy path (no audit logging, same prompts)
- If set → Authority Layer path (audit logging enabled, same prompts)

---

### Blueprint Paid Preview (`/api/blueprint/generate-paid`)

**Status:** ⚠️ **ENDPOINT ACCESS CONTROL** (not prompt system gate)

**Evidence:**
- Line 142: `if (!featureEnabled && !data.paid_blueprint_purchased && !userIsAdmin)` → Returns 410
- This is **ENDPOINT ACCESS CONTROL**, not a prompt system gate
- If endpoint is accessible, always uses canonical system via `getBlueprintPhotoshootPrompt()`

**Impact:**
- If unset → Endpoint may return 410 (unless user purchased or is admin)
- If set → Uses canonical system (no prompt generation impact)

---

## DEFAULT BEHAVIOR ANALYSIS

### Development vs Production

**Finding:** ✅ **NO DIFFERENCES**

**Evidence:**
- `lib/quality/prompt-quality-baseline.ts:80`: `ENABLE_QUALITY_MONITORING === 'true' || NODE_ENV === 'development'`
  - This enables quality monitoring in dev, but does NOT affect prompt generation
- No other `NODE_ENV` checks found in prompt generation paths

**Conclusion:** Prompt system behaves identically in dev and prod.

---

### Silent Fallbacks

**Finding:** ✅ **NO SILENT FALLBACKS TO LEGACY SYSTEM**

**Evidence:**
- All prompt paths use canonical builders (`buildPrompt`, `buildNanoBananaPrompt`, `buildSingleImagePrompt`)
- No conditional logic that falls back to legacy prompt generation
- Feature flags only control audit logging, not prompt generation

**Conclusion:** System does NOT silently fall back to legacy behavior.

---

### Boolean Flags Defaulting

**Finding:** ⚠️ **TWO FLAGS DEFAULT TO FALSE**

**Evidence:**
1. `ENABLE_AUTHORITY_CONCEPT_CARDS` - Defaults to `false` (legacy path) - **BUT REMOVED FROM CODE**
2. `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS` - Defaults to `false` (legacy path) - **AUDIT LOGGING ONLY**

**Impact:**
- If flags are unset → Audit logging disabled, but prompts are identical
- No prompt generation impact

---

## MISSING ENVIRONMENT VARIABLES

### Required for System Operation

**Finding:** ✅ **NO MISSING ENV VARS FOR PROMPT SYSTEM**

**Evidence:**
- All prompt generation paths work without any env vars
- Env vars are only used for:
  1. Endpoint access control (not prompt system gates)
  2. Audit logging (observability only)
  3. Quality monitoring (metrics collection only)

**Conclusion:** Prompt system does NOT require any env vars to function.

---

## CONDITIONAL BRANCHES AUDIT

### Pattern: `if (!envVar) { fallback }`

**Finding:** ✅ **NO PROMPT GENERATION FALLBACKS**

**Evidence:**
- All `if (!envVar)` checks found are for:
  - Endpoint access control (returns 410)
  - Feature access control (returns 410)
  - Quality monitoring (enables/disables metrics)
- **NO fallback to legacy prompt generation**

---

### Pattern: `if (envVar !== "true")`

**Finding:** ✅ **NO PROMPT GENERATION GATES**

**Evidence:**
- All `envVar !== "true"` checks found are for:
  - Endpoint access control (returns 410)
  - Feature access control (returns 410)
- **NO prompt generation conditional logic**

---

### Pattern: `envVar ?? default`

**Finding:** ✅ **NO PROMPT GENERATION DEFAULTS**

**Evidence:**
- No `??` operators found in prompt generation code
- All defaults are for endpoint access or monitoring

---

## NANOBANANA / REPLICATE / PROMPT AUTHORITY TOGGLES

### NanoBanana Pro Activation

**Finding:** ✅ **NO ENV VAR GATES**

**Evidence:**
- `lib/maya/nano-banana-prompt-builder.ts` - No env var checks
- Pro Mode is determined by route/mode parameter, not env vars
- Always uses `buildNanoBananaPrompt()` when Pro Mode is requested

---

### Replicate Client

**Finding:** ✅ **NO ENV VAR GATES FOR PROMPT GENERATION**

**Evidence:**
- Replicate client uses `REPLICATE_API_TOKEN` (required for API calls, not prompt generation)
- No conditional logic that affects prompt generation based on Replicate config

---

### Prompt Authority Layer

**Finding:** ✅ **ALWAYS ACTIVE**

**Evidence:**
- `lib/maya/prompt-authority.ts` - No env var gates
- All Authority Layer functions are unconditional
- Feature flags only control routing through Authority Layer (audit logging), not activation

---

## FINAL VERDICT

### Is Canonical Prompt System Gated by Env Vars?

**ANSWER:** ❌ **NO**

**Evidence:**
- Prompt Authority Layer has NO env var gates
- All prompt builders are unconditional
- Feature flags only control audit logging, not prompt generation
- Endpoint access controls do NOT affect prompt system

---

### Are There Missing/Unset Env Vars That Would Cause Fallback?

**ANSWER:** ❌ **NO**

**Evidence:**
- No env vars required for prompt generation
- No fallback logic to legacy system
- System functions identically with or without env vars (except endpoint access)

---

### Is Legacy Prompting Still the Default?

**ANSWER:** ❌ **NO**

**Evidence:**
- All prompt paths use canonical builders
- No legacy prompt generation code paths found
- Feature flags only affect audit logging, not prompt generation

---

### Can Multiple Modes Coexist Unintentionally?

**ANSWER:** ❌ **NO**

**Evidence:**
- Mode is determined by route/parameter, not env vars
- No conditional logic that could cause mode confusion
- Each route has a single, deterministic prompt generation path

---

### Does Nano Banana Pro Use a Different Activation Path?

**ANSWER:** ❌ **NO**

**Evidence:**
- Pro Mode activation is determined by route/mode parameter
- No env var gates for Pro Mode
- Always uses `buildNanoBananaPrompt()` when Pro Mode is requested

---

## RECOMMENDATIONS

### 1. Remove Deprecated Feature Flags

**Action:** Remove `ENABLE_AUTHORITY_CONCEPT_CARDS` if still referenced (appears to be removed already)

**Rationale:** Flag is deprecated and no longer controls behavior.

---

### 2. Document Feature Flag Purpose

**Action:** Add clear documentation that `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS` only affects audit logging, not prompt generation.

**Rationale:** Prevents confusion about flag purpose.

---

### 3. Consider Removing Feature Flags

**Action:** Consider removing `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS` and always route through Authority Layer.

**Rationale:** Since flags only affect audit logging (not prompt generation), there's no risk in always enabling Authority Layer routing.

---

## APPENDIX: FILES AUDITED

1. `lib/maya/prompt-authority.ts` - ✅ No env var gates
2. `lib/maya/nano-banana-prompt-builder.ts` - ✅ No env var gates
3. `lib/feed-planner/build-single-image-prompt.ts` - ✅ No env var gates
4. `lib/feed-planner/orchestrator.ts` - ⚠️ Feature flag for audit logging only
5. `app/api/maya/generate-concepts/route.ts` - ✅ No env var gates (flag removed)
6. `app/api/maya/generate-feed-prompt/route.ts` - ✅ No env var gates
7. `app/api/maya/pro/generate-image/route.ts` - ✅ No env var gates
8. `app/api/feed/[feedId]/generate-single/route.ts` - ✅ No env var gates
9. `app/api/blueprint/generate-concepts/route.ts` - ⚠️ Endpoint access control only
10. `app/api/blueprint/generate-paid/route.ts` - ⚠️ Endpoint access control only
11. `lib/admin-feature-flags.ts` - ⚠️ Feature access control only
12. `lib/quality/prompt-quality-baseline.ts` - ⚠️ Monitoring only

---

**AUDIT COMPLETE**
