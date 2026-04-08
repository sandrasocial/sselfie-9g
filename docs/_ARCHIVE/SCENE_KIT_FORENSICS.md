# Scene Kit System Forensics (Part A)

## Problem Statement
Mismatched scenes like "gym set + cashmere cardigan in a gallery" and wrong athletic locations are occurring because:
1. Templates mix scenes randomly without coherence
2. Identity anchor is injected into flatlays (should be detail-only phrasing)
3. No scene-type awareness in prompt assembly
4. Outfit materials and locations come from separate libraries without compatibility checks

---

## Source Trace Table

| Element | Source File | Function | Example String | When It Triggers |
|---------|-------------|----------|----------------|------------------|
| **Location Phrases** | `lib/styling/vibe-libraries.ts` | `getVibeLibrary()` → `locations[]` | `"modern art gallery with white walls"` | Every template injection |
| | `lib/feed-planner/dynamic-template-injector.ts` | `buildPlaceholders()` → `LOCATION_OUTDOOR_1`, `LOCATION_INDOOR_1` | `"gym studio with natural light"` | Template placeholder replacement |
| | `lib/maya/blueprint-photoshoot-templates.ts` | Template strings | `{{LOCATION_OUTDOOR_1}}`, `{{LOCATION_INDOOR_1}}` | Template selection by category+mood |
| **Outfit Material Phrases** | `lib/styling/vibe-libraries.ts` | `getOutfitsByStyle()` → `OutfitFormula.pieces[]` | `"cashmere cardigan"`, `"leather blazer"` | Every template injection |
| | `lib/feed-planner/dynamic-template-injector.ts` | `formatOutfit()` | `"A confident woman wearing cashmere cardigan, silk blouse..."` | Template placeholder replacement |
| | `lib/maya/blueprint-photoshoot-templates.ts` | Template strings | `{{OUTFIT_FULLBODY_1}}`, `{{OUTFIT_MIDSHOT_1}}` | Template selection by category+mood |
| **Flatlay Content** | `lib/maya/blueprint-photoshoot-templates.ts` | Template strings (hardcoded) | `"overhead lifestyle flatlay with coffee and laptop"` | Template selection (frames 2, 5, 8) |
| | `lib/feed-planner/nano-banana-adapter.ts` | `resolveFlatlayContent()` | `"water bottle, gym gloves, sneakers"` | When flatlay contains office objects in athletic context |
| **Identity Anchor** | `lib/feed-planner/nano-banana-adapter.ts` | `buildSingleScenePrompt()` line 805 | `"A realistic photo of the person shown in the reference images"` | **ALL scenes** (including flatlays) ❌ |
| | `lib/feed-planner/nano-banana-adapter.ts` | `buildPreviewMultiScenePrompt()` line 544 | `"A realistic photo grid showing the person from the reference images in 9 different scenes"` | Preview feeds only (once at top) ✅ |
| **Base Prompt Injections** | `lib/feed-planner/nano-banana-adapter.ts` | `buildSingleScenePrompt()` lines 811-823 | `"The subject wearing..."` | **ALL scenes** (including flatlays) ❌ |
| | `lib/feed-planner/nano-banana-adapter.ts` | `buildPreviewMultiScenePrompt()` lines 555-586 | `"Scene 1: the subject..."` | Preview feeds (all scenes get "subject") ❌ |

---

## Critical Issues Identified

### Issue #1: Identity Anchor Leaking into Flatlays
**Location:** `lib/feed-planner/nano-banana-adapter.ts:805`
**Problem:** `buildSingleScenePrompt()` adds identity anchor to ALL scenes, including flatlays
**Impact:** Flatlays get "A realistic photo of the person shown in the reference images" + "The subject wearing..." which is wrong
**Fix Required:** Scene-type aware prompt assembly (flatlays should NOT get identity anchor or "subject wearing" phrasing)

### Issue #2: Base Prompt "Subject Wearing" Leaking into Flatlays
**Location:** `lib/feed-planner/nano-banana-adapter.ts:811-823`
**Problem:** `buildSingleScenePrompt()` prepends "The subject " to ALL frame descriptions, including flatlays
**Impact:** Flatlays get "The subject wearing..." when they should be "An overhead lifestyle detail photo featuring..."
**Fix Required:** Scene-type detection before prompt assembly

### Issue #3: Template Free-for-All (No Scene Coherence)
**Location:** `lib/maya/blueprint-photoshoot-templates.ts`
**Problem:** Templates mix scenes randomly - gym outfit can appear with gallery location, cashmere cardigan with athletic scene
**Impact:** Incoherent visuals (gym set + cashmere cardigan + gallery = mismatch)
**Fix Required:** Scene Kit System (structured scene packs that belong together)

### Issue #4: Location Selection Not Context-Aware
**Location:** `lib/feed-planner/dynamic-template-injector.ts:175-213`
**Problem:** Locations are selected from vibe library without checking outfit compatibility
**Impact:** Athletic outfits can get gallery locations, business outfits can get gym locations
**Fix Required:** Scene Kit System with location allow-lists per outfit mode

---

## Fix Plan (Minimal Diff)

### Fix #1: Scene-Type Aware Prompt Assembly
**File:** `lib/feed-planner/nano-banana-adapter.ts`
**Change:** 
- Detect scene type BEFORE prompt assembly
- Flatlays → Use detail-only phrasing (no identity anchor, no "subject wearing")
- Portraits/Movement → Use identity anchor + subject phrasing
- Detail scenes → Use detail-only phrasing

**Diff Preview:**
```typescript
// BEFORE (line 805):
parts.push('A realistic photo of the person shown in the reference images')

// AFTER:
if (frameType === 'flatlay' || frameType === 'detail') {
  // Skip identity anchor for detail scenes
} else {
  parts.push('A realistic photo of the person shown in the reference images')
}
```

### Fix #2: Scene Kit System
**New Files:**
- `lib/feed-planner/scene-kits.ts` - Structured scene kits
- `lib/feed-planner/scene-selector.ts` - Kit selection logic
- `lib/feed-planner/style-realism-guards.ts` - Compatibility guards

**Change:** Replace template free-for-all with curated scene kits that ensure coherence

---

## Next Steps
1. ✅ Part A Complete (Forensics)
2. ⏭️ Part B: Build Scene Kits
3. ⏭️ Part C: Build Scene Selector
4. ⏭️ Part D: Build Realism Guards
5. ⏭️ Part E: Fix Prompt Assembly
6. ⏭️ Part F: Add Tests
