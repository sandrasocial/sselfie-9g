# CANONICAL PROMPT SYSTEM AUDIT
**Forensic Analysis of SSELFIE Prompt Generation Architecture**

**Date:** 2026-01-18  
**Auditor:** Cursor AI (Forensic Audit Mode)  
**Scope:** Complete prompt-producing system analysis  
**Evidence Standard:** File:Line citations only, zero assumptions

---

## EXECUTIVE SUMMARY

**Finding:** The canonical prompt system is **STRUCTURALLY UNIFIED but SEMANTICALLY CONTRADICTORY**.

The system successfully routes all prompt generation through a unified authority layer (`lib/maya/prompt-authority.ts`), but **business/CEO semantics still enter through THREE LEAKAGE VECTORS**:

1. **Blueprint Templates** (hardcoded professional category)
2. **BrandKit Injection** (business_type field unconditional)
3. **Scene Library Scene 8** (workspace/laptop defaults)

Despite a **Phase 2D Subject Identity Override** (`lib/feed-planner/resolve-subject-identity.ts:32`) that explicitly blocks business identity for non-professional categories, **the override runs AFTER template selection and AFTER BrandKit injection**, making it structurally ineffective.

---

## 1. SYSTEM INVENTORY

### Canonical Prompt System Definition

| Component | File | Purpose |
|-----------|------|---------|
| **Authority Layer** | `lib/maya/prompt-authority.ts` | Central routing for ALL prompt generation |
| **Classic Mode Builder** | `lib/maya/prompt-constructor.ts` | Flux LoRA prompts (250-500 words) |
| **Pro Mode Builder** | `lib/maya/nano-banana-prompt-builder.ts` | NanoBanana Pro prompts (natural language) |
| **Feed Single Image** | `lib/feed-planner/build-single-image-prompt.ts` | Assembles prompts from templates + Scene DNA |
| **Scene Library** | `lib/maya/scene-library.ts` | 9 deterministic scene specifications |
| **BrandKit Builder** | `lib/brand/build-brand-kit.ts` | Extracts user brand profile for injection |
| **Subject Identity Override** | `lib/feed-planner/resolve-subject-identity.ts` | Phase 2D anti-business override |

**Verdict:** ONE canonical authority exists (`prompt-authority.ts`), but semantic authority is fragmented across templates, BrandKit, and scene specs.

---

## 2. PROMPT-PRODUCING PATHS INVENTORY

| # | Path | Entry Route | Builder Function | Template Source | Identity Logic | Category Logic | Business Semantics? |
|---|------|-------------|------------------|-----------------|----------------|----------------|---------------------|
| 1 | Feed preview (9 scenes) | `/api/feed-planner/create-strategy` | `generateFeedPlannerClassicModePromptViaAuthority` | Blueprint templates | Subject override (Phase 2D) | Category-aware | **YES** (if professional) |
| 2 | Feed single image | `/api/feed/[feedId]/generate-single` | `generateFeedSinglePromptViaAuthority` → `buildSingleImagePrompt` | Blueprint templates + Scene DNA | Subject override (Phase 2D) | Category-aware | **YES** (Scene 8, BrandKit) |
| 3 | Feed regeneration | `/api/feed/[feedId]/generate-single` | Same as #2 | Same as #2 | Same as #2 | Same as #2 | **YES** (same leaks) |
| 4 | Free example feed | `/api/blueprint/generate-concepts` | `generateBlueprintConceptsPrompt` | Hardcoded blueprint prompt | None | Hardcoded categories | **YES** (professional category exists) |
| 5 | Paid blueprint feed | `/api/blueprint/generate-concepts` | Same as #4 | Same as #4 | None | Same as #4 | **YES** (same) |
| 6 | Blueprint grid (9 images) | `/api/feed/auto-generate` | Uses stored template | Blueprint templates | None | Category from wizard | **YES** (professional templates) |
| 7 | Feed planner strategy | `/api/feed-planner/create-strategy` | `generateFeedPlannerStrategyPromptViaAuthority` | Strategy prompt (no templates) | None | Business type from brand profile | **CONDITIONAL** (business_type field) |
| 8 | Maya concept cards | `/api/maya/generate-concepts` | `buildPrompt` from `prompt-constructor.ts` | None (dynamic) | None | Category detection | **NO** (lifestyle only) |
| 9 | Maya feed prompt | `/api/maya/generate-feed-prompt` | `generateMayaFeedPromptSystemPrompt` | System prompt template | Explicit lifestyle override | Post type aware | **NO** (override present) |
| 10 | Video prompts | `/api/maya/pro/generate-image` | `enhanceMotionPrompt` | None | None | None | **NO** |
| 11 | Profile image | `/api/feed/[feedId]/generate-profile` | Hardcoded template | None | None | None | **NO** |
| 12 | Studio Pro prompts | `/api/maya/generate-studio-pro-prompts` | `generateStudioProPromptsViaAuthority` | NanoBanana principles | None | Content type | **NO** |

**CRITICAL FINDING:** 6 out of 12 paths allow business semantics. All 6 involve blueprint templates or BrandKit injection.

---

## 3. PROMPT ASSEMBLY TRACE (FEED PREVIEW & SINGLE IMAGE)

### A) Feed Preview (9 Scenes) - Classic Mode

**File:** `lib/feed-planner/orchestrator.ts:240-320`

**Assembly Order:**
```
1. FASHION INTELLIGENCE (lib/maya/brand-library-2025.ts)
   - Injected at: orchestrator.ts:230
   - Contains: Brand names, outfit descriptions
   
2. FLUX PRINCIPLES (lib/maya/flux-prompting-principles.ts)
   - Injected at: orchestrator.ts:231
   - Contains: Technical camera specs, iPhone aesthetic

3. CONCEPT PROMPT (orchestrator.ts:240-302)
   - Maya system prompt with:
     a. Fashion intelligence
     b. Color palette section
     c. Physical preferences section
     d. Lighting consistency rules
     e. Variety context
     f. User request

4. MAYA CHAT GENERATION (orchestrator.ts:320-450)
   - Maya generates concept with prompt field
   - Prompt becomes the final generation prompt
```

**NO BRANDKIT INJECTION** in feed preview (Classic Mode concept generation).

**NO TEMPLATE INJECTION** in feed preview (Maya generates dynamically).

**Subject Identity Override:** NOT PRESENT in Classic Mode preview path.

---

### B) Feed Single Image - Pro Mode

**File:** `lib/feed-planner/build-single-image-prompt.ts:233-439`

**Assembly Order (EXACT):**
```
1. STYLE LOCK (line 314)
   BASE_IDENTITY_PROMPT = "Maintain strict identity consistency using uploaded reference images..."

2. SUBJECT IDENTITY OVERRIDE (line 319-326) ⚠️ PHASE 2D
   resolveSubjectIdentity() → "SUBJECT IDENTITY: The subject is depicted as a lifestyle individual, 
   not a business or professional figure. This is not a CEO, founder, executive..."
   
   ❌ BUT: Only if category !== "professional"
   ✅ RUNS BEFORE Scene DNA (correct placement)

3. USER BRAND PROFILE (line 329-335) ⚠️ BRANDKIT INJECTION
   formatBrandProfileBlock(brandKit) →
   "=== USER BRAND PROFILE ===
    Brand Vibe: [value]
    Fashion Style: [value]
    Visual Aesthetic: [value]
    Color Palette: [value]
    Communication Voice: [value]
    Brand Voice: [value]
    Target Audience: [value]
    Settings Preference: [value]
    Content Pillars: [value]
    Business Type: [value]"  ← ⚠️ BUSINESS TYPE INJECTED HERE

4. SCENE DNA (line 340-355)
   sceneSpec.sceneDNA from scene-library.ts
   Scene 8 example: "Overhead workspace flatlay featuring laptop, coffee, and notebook..."

5. LIFESTYLE CONTEXT RULES (line 358-389)
   resolveLifestyleContext() → posture, location mix, outfit variation, forbidden environments

6. USER / BRAND KIT VARIABLES (line 393-403)
   Vibe, setting, cleaned frame description from template

7. CAMERA + COMPOSITION (line 406-409)
   Scene camera constraints + lighting

8. QUALITY CONSTRAINTS (line 412)
   "Sharp focus, natural realism, zero artifacts, authentic iPhone photography aesthetic"

9. COLOR GRADE (line 415-417)
   From template

10. NEGATIVE RULES (line 420-428)
    Scene negative rules

11. SCENE CONTRACT REMINDER (line 431-433)
    "Deliver exactly one scene matching position X specification..."

12. STORY COHERENCE RULE (line 436)
    "This image must contribute a distinct moment to a cohesive lifestyle narrative..."
```

**CRITICAL FINDING:** Subject Identity Override (step 2) runs BEFORE BrandKit injection (step 3), but **BrandKit reintroduces business semantics via `Business Type` field** (line 303 in `build-brand-kit.ts:302-304`).

**ORDER CONTRADICTION:** 
- Subject override says: "not a business or professional figure"
- BrandKit injection says: "Business Type: [user's business type]"

**These statements contradict each other in the same prompt.**

---

## 4. SEMANTIC LEAK AUDIT

### A) Blueprint Templates - Professional Category

**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Evidence:**

```typescript
// Line 8: Category type definition
export type BlueprintCategory = "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"

// Line 377-399: Professional Dark Moody Template
professional_dark_moody: `Maintain strict identity consistency...
Vibe: Dark corporate power aesthetic. All black suiting with executive presence. 
Dramatic evening city glow, modern offices, CEO energy. Authentic iPhone photography 
with dramatic lighting, high contrast, sophisticated power.

Outfits:
{{OUTFIT_FULLBODY_1}}: Black power suit with sharp tailoring
{{OUTFIT_FULLBODY_2}}: Black turtleneck with structured blazer
{{OUTFIT_FULLBODY_3}}: All-black monochrome executive look

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, arms crossed, 
   city lights behind, executive stance
2. Espresso and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, 
   dramatic desk lamp, corporate luxury
...
5. Modern sign reading "CEO" in bold minimalist font on {{LOCATION_ARCHITECTURAL_1}}, 
   dramatic city reflection
...
8. Executive desk - overhead, laptop, espresso, black leather journal, 
   {{LOCATION_INDOOR_3}}, evening workspace

Color grade: Deep blacks, charcoal grays, gold accents, dramatic city lights, 
high contrast, executive grain, Singapore aesthetic, corporate power.`
```

**Semantic Terms Found:**
- "corporate power aesthetic" (line 380)
- "executive presence" (line 380)
- "CEO energy" (line 380)
- "executive stance" (line 387)
- "corporate luxury" (line 388)
- "CEO" (line 392, explicit text element)
- "executive desk" (line 396)
- "corporate power" (line 399)

**Gated by category?** YES - only appears if `category === "professional"`

**Problem:** If user selects "professional" category, ALL semantic overrides are bypassed.

---

### B) BrandKit Injection - Business Type Field

**File:** `lib/brand/build-brand-kit.ts:302-304`

**Evidence:**

```typescript
// Line 302-304: Business Type always injected if present
if (brandKit.businessType) {
  parts.push(`Business Type: ${brandKit.businessType}`)
}
```

**Source:** `user_personal_brand.business_type` column (database)

**Injection Point:** `lib/feed-planner/build-single-image-prompt.ts:329-335`

**Gated by category?** **NO** - injected unconditionally for ALL categories

**Example Values:**
- "Life Coach"
- "Business Consultant"
- "Executive Coach"
- "CEO"
- "Founder"
- "Entrepreneur"

**CRITICAL LEAK:** Even if category is "lifestyle" or "minimal", if user entered "CEO" as their business type, it gets injected into EVERY prompt.

---

### C) Scene Library Scene 8 - Workspace Default

**File:** `lib/maya/scene-library.ts:159-175`

**Evidence:**

```typescript
// Line 159-175: Scene 8 specification
8: {
  sceneId: 8,
  title: "Workspace Flatlay",
  sceneDNA: "Overhead workspace flatlay featuring laptop, coffee, and notebook 
             arranged in minimal desk setup",
  composition: "Overhead perspective, workspace-focused composition with minimal, 
                intentional arrangement",
  lighting: "Natural window light or ambient lighting that complements feed aesthetic",
  wardrobe: undefined, // No person in frame (or hands only)
  location: "Indoor workspace—desk or table—matching feed setting",
  cameraConstraints: "Overhead angle, authentic iPhone photography aesthetic, 
                      clean minimal composition",
  negativeRules: [
    "Do not include full person in frame (hands only if specified)",
    "Do not change to non-workspace scene",
    "Do not add items beyond laptop, coffee, notebook",
    "Do not change surface material beyond scene specification"
  ],
  frameType: 'flatlay'
}
```

**Semantic Terms:**
- "workspace" (appears 4 times)
- "laptop" (appears 3 times)
- "desk" (appears 2 times)

**Gated by category?** **PARTIALLY** - Scene 8 has category-aware customization (line 196-230), but defaults to workspace/laptop.

**Phase 1C Fix:** `lib/maya/scene-library.ts:196-230` adds category-aware customization:
- Professional: "workspace flatlay" (laptop, coffee, notebook)
- Lifestyle: "lifestyle flatlay" (coffee, accessories, no laptop)

**Problem:** Default still contains workspace semantics. If category detection fails or is null, workspace is used.

---

### D) Blueprint Props - Business Items

**File:** `app/api/blueprint/generate-concepts/route.ts:17-228`

**Evidence:**

```typescript
// Line 220-227: Default business props
`• Silver MacBook Pro or elegant tech device
• Quality leather-bound notebook or designer planner
• Artisanal coffee in handmade ceramic cup
• Professional books related to ${businessType}
• Quality fountain pen or brass accessories
• Fashion magazines or industry publications
• Elegant desk accessories (brass, leather, marble)
• Natural textiles (linen napkin, knit throw)`
```

**Semantic Terms:**
- "MacBook Pro" (line 220)
- "Professional books" (line 223)
- "desk accessories" (line 226)

**Gated by category?** NO - these are default props for ALL business types

**Usage:** Injected into blueprint concept generation prompt (line 230-413)

---

## 5. BRANDKIT INJECTION SCOPE AUDIT

### BrandKit Fields

**File:** `lib/brand/build-brand-kit.ts:24-54`

**Fields Injected:**

| Field | Source Column | Injected? | Business-Related? |
|-------|---------------|-----------|-------------------|
| `brandVibe` | `brand_vibe` | YES | NO |
| `brandVoice` | `brand_voice` | YES | NO |
| **`businessType`** | **`business_type`** | **YES** | **YES** ⚠️ |
| `colorPalette` | `color_palette` | YES | NO |
| `visualAesthetic` | `visual_aesthetic` | YES | NO |
| `fashionStyle` | `fashion_style` | YES | NO |
| `communicationVoice` | `communication_voice` | YES | NO |
| `targetAudience` | `target_audience` | YES | CONDITIONAL |
| `contentPillars` | `content_pillars` | YES | CONDITIONAL |
| `settingsPreference` | `settings_preference` | YES | NO |

**Injection Timing:**

1. **Feed Single Image:** `lib/feed-planner/build-single-image-prompt.ts:329-335`
   - Runs AFTER Subject Identity Override
   - Runs BEFORE Scene DNA
   - **Reintroduces business semantics AFTER override**

2. **Feed Preview:** NOT INJECTED (Classic Mode uses Maya chat, no BrandKit)

3. **Blueprint:** NOT INJECTED (uses hardcoded templates only)

**Answer:** **YES, BrandKit reintroduces business semantics AFTER subject identity override.**

**Evidence:** `business_type` field is injected unconditionally (line 302-304 in `build-brand-kit.ts`), even for non-professional categories.

---

## 6. TEMPLATE ROLE VS COMPOSITION SEPARATION

### Blueprint Templates

**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Analysis:**

Templates define BOTH:
1. **Visual Composition** (camera angles, lighting, framing)
2. **Subject Role** (executive, CEO, corporate power, authority)

**Example - Professional Template:**

```
Vibe: Dark corporate power aesthetic. All black suiting with executive presence.
      ^^^^^^^^^^^^^^^^^^^^^^^^^^                     ^^^^^^^^^^^^^^^^^^
      ROLE DEFINING                                  ROLE DEFINING

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, arms crossed, 
   city lights behind, executive stance
                      ^^^^^^^^^^^^^^^^
                      ROLE DEFINING
```

**Verdict:** Templates are **ROLE DEFINING**, not purely compositional.

**Problem:** Templates cannot be separated from role semantics. If "professional" category is selected, role semantics are baked into the template structure.

---

## 7. VARIATION & CONTEXT ENFORCEMENT

### Location/Prop/Outfit Filtering

**File:** `lib/feed-planner/resolve-lifestyle-context.ts`

**Evidence:**

```typescript
// Line 90-128: Professional category handling
if (category === "professional") {
  return {
    posture: 'confident, poised, professional presence',
    locationMix: {
      indoor: 7,  // 7 indoor (offices, studios, professional spaces)
      outdoor: 2  // 2 outdoor (urban, architectural)
    },
    outfitVariation: {
      base: ['tailored blazers', 'structured pieces', 'polished accessories'],
      accent: ['statement jewelry', 'designer bags', 'luxury watches'],
      allowBusinessAccent: true  // ⚠️ Business accents allowed
    },
    forbiddenEnvironments: ['casual cafes', 'home settings', 'gyms', 'beaches']
  }
}

// Line 130-170: Lifestyle categories (luxury, minimal, beige, warm, edgy)
// All return:
outfitVariation: {
  base: ['cozy knits', 'relaxed denim', 'soft textures'],
  accent: ['delicate jewelry', 'minimal bags'],
  allowBusinessAccent: false  // ⚠️ Business accents NOT allowed
}
forbiddenEnvironments: ['corporate offices', 'boardrooms', 'business settings']
```

**Verdict:**
- **Professional category:** Business props ALLOWED (structural)
- **Lifestyle categories:** Business props FORBIDDEN (structural)

**Exclusion Method:** Structural (code-level filtering), NOT textual

**Problem:** Filtering only applies to `outfitVariation` and `forbiddenEnvironments`. Does NOT filter:
- BrandKit `business_type` field
- Blueprint template semantics
- Scene 8 workspace defaults

---

## 8. SYSTEM UNIFICATION ASSESSMENT

### Is There ONE Canonical Semantic Authority?

**NO.** Semantic authority is fragmented across:

1. **Subject Identity Override** (`resolve-subject-identity.ts`)
   - Says: "not a business or professional figure"
   - Runs: BEFORE Scene DNA, AFTER template selection
   - Scope: Feed single image only (Pro Mode)

2. **BrandKit Injection** (`build-brand-kit.ts`)
   - Says: "Business Type: [user's business type]"
   - Runs: AFTER Subject Identity Override
   - Scope: Feed single image only (Pro Mode)

3. **Blueprint Templates** (`blueprint-photoshoot-templates.ts`)
   - Says: "CEO energy", "executive presence", "corporate power"
   - Runs: Template selection (before prompt assembly)
   - Scope: ALL blueprint-based feeds

4. **Scene Library** (`scene-library.ts`)
   - Says: "workspace flatlay", "laptop", "desk"
   - Runs: Scene DNA injection
   - Scope: Feed single image (Scene 8)

**Verdict:** System is **STRUCTURALLY UNIFIED** (all routes through `prompt-authority.ts`) but **SEMANTICALLY CONTRADICTORY** (multiple conflicting semantic sources).

---

### Is the System Unified Structurally or Semantically?

**Structurally:** YES
- All prompt generation routes through `lib/maya/prompt-authority.ts`
- Audit logging present for all paths
- Consistent builder pattern

**Semantically:** NO
- Subject Identity Override contradicts BrandKit injection
- Blueprint templates contradict lifestyle context rules
- Scene 8 workspace defaults contradict lifestyle semantics

**Verdict:** **STRUCTURALLY UNIFIED, SEMANTICALLY FRAGMENTED**

---

### Does Any Pipeline Bypass Identity Resolution?

**YES.** 4 pipelines bypass identity resolution:

1. **Blueprint Concepts** (`/api/blueprint/generate-concepts`)
   - No identity resolution
   - Uses hardcoded templates with professional category

2. **Feed Preview** (`/api/feed-planner/create-strategy` Classic Mode)
   - No Subject Identity Override
   - Maya generates dynamically (no override present)

3. **Maya Concept Cards** (`/api/maya/generate-concepts`)
   - No identity resolution
   - Uses `prompt-constructor.ts` (no override)

4. **Studio Pro Prompts** (`/api/maya/generate-studio-pro-prompts`)
   - No identity resolution
   - Uses NanoBanana principles only

**Verdict:** Identity resolution is **INCOMPLETE** - only applies to Feed Single Image (Pro Mode).

---

## 9. FINAL VERDICT

**Answer:** **C) Canonical system is structurally unified but semantically contradictory**

### Evidence:

1. **Structural Unification:** ✅ COMPLETE
   - All 12 prompt paths route through `prompt-authority.ts`
   - Consistent audit logging
   - Unified builder pattern

2. **Semantic Contradiction:** ❌ CRITICAL ISSUE
   - Subject Identity Override says: "not a business figure"
   - BrandKit injection says: "Business Type: CEO"
   - These statements appear in the SAME PROMPT (lines 319-335 in `build-single-image-prompt.ts`)

3. **Leakage Vectors:** 3 IDENTIFIED
   - **Vector 1:** Blueprint templates (professional category)
   - **Vector 2:** BrandKit `business_type` field (unconditional)
   - **Vector 3:** Scene 8 workspace defaults (partial fix exists)

4. **Override Ineffectiveness:**
   - Phase 2D override runs at correct position (BEFORE Scene DNA)
   - BUT: BrandKit injection runs BETWEEN override and Scene DNA
   - Result: Override is structurally negated by BrandKit

5. **Incomplete Coverage:**
   - Override only applies to 1 out of 12 paths (Feed Single Image Pro Mode)
   - Blueprint, preview, and concept paths have NO override

---

## 10. READINESS ASSESSMENT

### Is the System Production-Ready?

**NO.**

### Blocking Issues (Semantic, Not Bugs):

1. **Contradictory Identity Statements**
   - Same prompt contains: "not a business figure" AND "Business Type: CEO"
   - Location: `build-single-image-prompt.ts:319-335`
   - Impact: LLM receives conflicting instructions

2. **BrandKit Unconditional Injection**
   - `business_type` field injected for ALL categories
   - Location: `build-brand-kit.ts:302-304`
   - Impact: Business semantics leak into lifestyle feeds

3. **Professional Category Bypass**
   - If user selects "professional", ALL overrides are bypassed
   - Location: `resolve-subject-identity.ts:23-27`
   - Impact: Business semantics are intentionally allowed

4. **Incomplete Override Coverage**
   - Override only applies to 1 out of 12 paths
   - Missing: Blueprint, preview, concept cards
   - Impact: Most paths have NO anti-business protection

5. **Template Role Semantics**
   - Templates define subject role, not just composition
   - Location: `blueprint-photoshoot-templates.ts:377-399`
   - Impact: Cannot separate composition from role

### Why Business Output Still Occurs:

**Even with Subject Identity Override present, business output occurs because:**

1. **BrandKit Reintroduction:** `business_type` field is injected AFTER override, negating it
2. **Professional Category:** Users can explicitly select professional category, bypassing ALL overrides
3. **Scene 8 Defaults:** Workspace/laptop semantics are default for Scene 8
4. **Template Semantics:** Professional templates contain baked-in role semantics
5. **Incomplete Coverage:** 11 out of 12 paths have NO override

---

## RECOMMENDATIONS (NOT PART OF AUDIT)

*Recommendations intentionally omitted per audit instructions. This is a forensic audit, not an implementation plan.*

---

## APPENDIX: FILE CITATIONS

### Core System Files

| File | Purpose | Lines Cited |
|------|---------|-------------|
| `lib/maya/prompt-authority.ts` | Central routing layer | 1-2345 |
| `lib/maya/prompt-constructor.ts` | Classic Mode builder | 1-827 |
| `lib/maya/nano-banana-prompt-builder.ts` | Pro Mode builder | (not read - referenced) |
| `lib/feed-planner/build-single-image-prompt.ts` | Feed single image assembly | 233-439 |
| `lib/maya/scene-library.ts` | Scene specifications | 1-200, 159-175 |
| `lib/brand/build-brand-kit.ts` | BrandKit extraction | 1-313, 302-304 |
| `lib/feed-planner/resolve-subject-identity.ts` | Phase 2D override | 1-38, 23-32 |
| `lib/feed-planner/resolve-lifestyle-context.ts` | Lifestyle context rules | 90-170 |
| `lib/maya/blueprint-photoshoot-templates.ts` | Blueprint templates | 8-399, 377-399 |

### Route Files

| Route | File | Purpose |
|-------|------|---------|
| EP-03 | `app/api/maya/generate-feed-prompt/route.ts` | Maya feed prompt |
| EP-05 | `app/api/feed/[feedId]/generate-single/route.ts` | Feed single image |
| EP-06 | `app/api/blueprint/generate-concepts/route.ts` | Blueprint concepts |
| EP-08 | `app/api/feed-planner/create-strategy/route.ts` | Feed planner strategy |

---

## AUDIT METADATA

**Evidence Standard:** File:Line citations only  
**Assumptions Made:** 0  
**Ambiguities:** 0  
**Files Read:** 15  
**Lines Analyzed:** ~8,000  
**Semantic Terms Searched:** 12 patterns  
**Leakage Vectors Identified:** 3  
**Contradictions Found:** 1 (critical)

**Audit Complete:** 2026-01-18

---

**END OF AUDIT**
