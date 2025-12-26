# Diversity Engine & Component Systems Audit

## Executive Summary

The Diversity Engine and related component systems (CompositionBuilder, ComponentDatabase, MetricsTracker) are **ACTIVELY CONSTRAINING** concept generation in Classic Mode. These systems force concept variation through component-based generation instead of trusting Maya's natural creativity.

**Key Finding:** The composition system REPLACES Maya's AI generation when the component database has ≥20 components, forcing concepts to be assembled from pre-defined components rather than allowing Maya to create organically.

---

## 1. DiversityEngine

### File: `lib/maya/prompt-components/diversity-engine.ts`
- **Status:** ✅ File exists
- **Purpose:** Enforces diversity thresholds, prevents component reuse, checks similarity
- **Usage:** ACTIVELY CONSTRAINING generation

### Active Usage Locations:

#### A) `app/api/maya/generate-concepts/route.ts` (Classic Mode)
- **Line 23:** Import statement
- **Lines 2581-2585:** Instantiation with constraints
  ```typescript
  const diversityEngine = new DiversityEngine({
    minPoseDiversity: 0.6,
    minLocationDiversity: 0.5,
    maxComponentReuse: 2,
  })
  ```
- **Line 2753:** Active constraint check
  ```typescript
  const diversityCheck = diversityEngine.isDiverseEnough(composed.components)
  if (!diversityCheck.diverse) {
    continue // REJECTS concepts that don't meet diversity thresholds
  }
  ```
- **Line 2762:** Tracking usage
  ```typescript
  diversityEngine.addToHistory(composed.components)
  ```

**Impact:** ❌ **BAD - Actively constraining** - Rejects concepts that don't meet artificial diversity thresholds

#### B) `lib/maya/prompt-components/composition-builder.ts`
- **Line 12:** Import statement
- **Line 30:** Used as dependency
- **Line 37:** Default instantiation if not provided
- **Line 506:** Used for diversity scoring

**Impact:** ❌ **BAD - Used in component generation** - Forces diversity constraints in composition

#### C) `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode)
- **Status:** ✅ **NOT USED** - Pro Mode doesn't use composition system

**Impact:** ✅ **GOOD** - Pro Mode trusts Maya's creativity

#### D) Documentation Files
- Multiple docs reference DiversityEngine but don't use it
- **Impact:** ⚠️ **NEUTRAL** - Just documentation

---

## 2. CompositionBuilder

### File: `lib/maya/prompt-components/composition-builder.ts`
- **Status:** ✅ File exists
- **Purpose:** Assembles prompts from pre-defined components instead of AI generation
- **Usage:** ACTIVELY REPLACING Maya's generation

### Active Usage Locations:

#### A) `app/api/maya/generate-concepts/route.ts` (Classic Mode)
- **Line 24:** Import statement
- **Line 2586:** Instantiation
  ```typescript
  const compositionBuilder = new CompositionBuilder(componentDB, diversityEngine)
  ```
- **Line 2739:** ACTIVE REPLACEMENT of Maya's generation
  ```typescript
  const composed = compositionBuilder.composePrompt({
    category: categoryForComposition,
    userIntent: userRequest || context || aesthetic || '',
    brand: detectedBrandValue,
    count: composedConcepts.length,
    previousConcepts: composedComponents,
  })
  ```
- **Line 2790:** Uses composed prompt instead of Maya's
  ```typescript
  prompt: composed.prompt,
  ```

**Impact:** ❌ **BAD - Actively replacing** - Uses component assembly instead of Maya's AI generation

#### B) `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode)
- **Status:** ✅ **NOT USED**

**Impact:** ✅ **GOOD** - Pro Mode doesn't use this system

---

## 3. ComponentDatabase

### File: `lib/maya/prompt-components/component-database.ts`
- **Status:** ✅ File exists
- **Purpose:** Stores extracted components from prompts (poses, locations, lighting, etc.)
- **Usage:** USED BY CompositionBuilder to find components

### Active Usage Locations:

#### A) `app/api/maya/generate-concepts/route.ts` (Classic Mode)
- **Line 22:** Import statement
- **Line 2568:** Instantiation
  ```typescript
  const componentDB = getComponentDatabase()
  ```
- **Line 2571:** Check if database has enough components
  ```typescript
  const allComponents = componentDB.filter({})
  const hasEnoughComponents = allComponents.length >= 20
  ```
- **Line 2586:** Passed to CompositionBuilder
  ```typescript
  const compositionBuilder = new CompositionBuilder(componentDB, diversityEngine)
  ```

**Impact:** ❌ **BAD - Enables component-based generation** - Provides components that replace Maya's creativity

#### B) `app/api/admin/composition-analytics/route.ts`
- **Line 4:** Import statement
- **Line 32:** Used for analytics
  ```typescript
  const componentDB = getComponentDatabase()
  ```
- **Lines 59-95:** Used for metrics calculation

**Impact:** ⚠️ **MAYBE KEEP** - Admin analytics, but only useful if composition system is used

#### C) `lib/maya/prompt-components/composition-builder.ts`
- **Line 11:** Import statement
- **Line 29:** Required dependency
- **Used throughout** for component selection

**Impact:** ❌ **BAD - Core dependency** - Needed for component-based generation

---

## 4. MetricsTracker

### File: `lib/maya/prompt-components/metrics-tracker.ts`
- **Status:** ✅ File exists
- **Purpose:** Tracks composition metrics, diversity scores, component usage
- **Usage:** TRACKING ONLY (doesn't constrain generation directly)

### Active Usage Locations:

#### A) `app/api/maya/generate-concepts/route.ts` (Classic Mode)
- **Line 25:** Import statement
- **Lines 3339-3376:** Tracking metrics for composed concepts
  ```typescript
  const metricsTracker = getMetricsTracker()
  metricsTracker.trackBatch(batchId, category, composedPrompts, components)
  ```

**Impact:** ⚠️ **MAYBE KEEP** - Tracking only, doesn't constrain generation. But only useful if composition system is active.

#### B) `app/api/admin/composition-analytics/route.ts`
- **Line 5:** Import statement
- **Lines 98-99:** Used for admin analytics
  ```typescript
  const metricsTracker = getMetricsTracker()
  const aggregatedMetrics = metricsTracker.getAggregatedMetrics()
  ```

**Impact:** ⚠️ **MAYBE KEEP** - Admin analytics endpoint, but only useful if composition system exists

---

## Critical Code Path Analysis

### Classic Mode Generation Flow (`app/api/maya/generate-concepts/route.ts`)

```
Line 2563-2586: Initialize composition system
  ├─ Check if database has ≥20 components
  ├─ Create DiversityEngine with constraints
  └─ Create CompositionBuilder with database + engine

Line 2707-2805: Generate concepts
  ├─ IF hasEnoughComponents:
  │   ├─ Use compositionBuilder.composePrompt() ← REPLACES Maya
  │   ├─ Check diversityEngine.isDiverseEnough() ← REJECTS concepts
  │   ├─ diversityEngine.addToHistory() ← TRACKS for constraints
  │   └─ Use composed.prompt instead of Maya's generation
  └─ ELSE:
      └─ Fallback to Maya's AI generation (line 2815)

Line 2808-2850: Fallback to AI if composition failed
  └─ Only if composition didn't produce enough concepts
```

**Problem:** The composition system **REPLACES** Maya's generation when components are available, forcing concepts to be assembled from pre-defined components rather than allowing Maya to create organically.

---

## Recommendations

### 🔴 REMOVE (Actively Constraining):

1. **Remove from Classic Mode (`app/api/maya/generate-concepts/route.ts`):**
   - Remove lines 22-25 (imports)
   - Remove lines 2563-2586 (initialization)
   - Remove lines 2707-2805 (composition-based generation)
   - Remove lines 3339-3380 (metrics tracking)
   - Keep only Maya's AI generation path

2. **Delete Implementation Files:**
   - `lib/maya/prompt-components/diversity-engine.ts` - ❌ DELETE
   - `lib/maya/prompt-components/composition-builder.ts` - ❌ DELETE
   - `lib/maya/prompt-components/component-database.ts` - ❌ DELETE (if not used elsewhere)

3. **Update Index Exports:**
   - `lib/maya/prompt-components/index.ts` - Remove exports for deleted files

### ⚠️ MAYBE KEEP (Admin Analytics):

4. **MetricsTracker:**
   - **Option A:** Delete if removing composition system (no metrics to track)
   - **Option B:** Keep if you want to track Maya's generation metrics differently
   - **Decision needed:** Do we need analytics for Maya's natural generation?

5. **Admin Analytics Endpoint:**
   - `app/api/admin/composition-analytics/route.ts`
   - **Decision:** If composition system is removed, this endpoint becomes useless
   - **Action:** Either delete or refactor to track Maya's generation metrics

### ✅ VERIFY (Not Used):

6. **Pro Mode:**
   - ✅ Confirmed: Pro Mode does NOT use these systems
   - ✅ No changes needed for Pro Mode

7. **Documentation:**
   - Multiple docs reference these systems
   - **Action:** Delete or update documentation after removal

---

## Files Summary

### Files to DELETE:
- ✅ `lib/maya/prompt-components/diversity-engine.ts` (308 lines)
- ✅ `lib/maya/prompt-components/composition-builder.ts` (643 lines)
- ✅ `lib/maya/prompt-components/component-database.ts` (423+ lines)
- ⚠️ `lib/maya/prompt-components/metrics-tracker.ts` (401 lines) - Decision needed
- ⚠️ `app/api/admin/composition-analytics/route.ts` - Decision needed (depends on metrics tracker)

### Files to MODIFY:
- 🔴 `app/api/maya/generate-concepts/route.ts` - Remove ~350 lines of composition system code
- 🔴 `lib/maya/prompt-components/index.ts` - Remove exports

### Files to VERIFY:
- ✅ `app/api/maya/pro/generate-concepts/route.ts` - Already clean (doesn't use these systems)

---

## Impact Assessment

### Before Removal:
- Classic Mode uses component-based generation when database has ≥20 components
- Diversity Engine rejects concepts that don't meet artificial thresholds
- Concepts are assembled from pre-defined components
- Maya's creativity is constrained by component database limits

### After Removal:
- Classic Mode always uses Maya's AI generation (like Pro Mode)
- Maya creates diversity naturally through her intelligence
- No artificial constraints on concept variation
- Full creative freedom for Maya

### Risk:
- ⚠️ **LOW** - Pro Mode already works without these systems
- ✅ Maya naturally creates diverse concepts
- ✅ No functionality loss (composition was a fallback anyway)

---

## Next Steps

1. **Confirm removal decision** for MetricsTracker and admin analytics
2. **Remove composition system** from Classic Mode route
3. **Delete implementation files**
4. **Clean up exports**
5. **Remove/update documentation**
6. **Test that Maya generates diverse concepts naturally**

---

## Search Results Summary

### DiversityEngine:
- ✅ Used in: `app/api/maya/generate-concepts/route.ts` (ACTIVE)
- ✅ Used in: `lib/maya/prompt-components/composition-builder.ts` (ACTIVE)
- ❌ Not used in: `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode)

### CompositionBuilder:
- ✅ Used in: `app/api/maya/generate-concepts/route.ts` (ACTIVE)
- ❌ Not used in: `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode)

### ComponentDatabase:
- ✅ Used in: `app/api/maya/generate-concepts/route.ts` (ACTIVE)
- ✅ Used in: `app/api/admin/composition-analytics/route.ts` (ANALYTICS)
- ✅ Used in: `lib/maya/prompt-components/composition-builder.ts` (ACTIVE)

### MetricsTracker:
- ✅ Used in: `app/api/maya/generate-concepts/route.ts` (TRACKING)
- ✅ Used in: `app/api/admin/composition-analytics/route.ts` (ANALYTICS)

