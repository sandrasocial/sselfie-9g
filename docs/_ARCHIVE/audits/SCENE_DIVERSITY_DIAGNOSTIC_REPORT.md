# SCENE DIVERSITY DIAGNOSTIC REPORT

**Date:** 2025-01-XX  
**Problem:** Feed preview prompts generating 9 identical portrait scenes with NO diversity

---

## 1. SCENE CREATION FLOW

```
User Request (Create Preview Feed)
  ↓
[FILE: app/api/feed/[feedId]/generate-single/route.ts]
  → Function: POST handler (line 440)
  → Gets data from: feedLayout, user
  → Calls: resolveConsistentScenes()
  ↓
[FILE: lib/feed-planner/scene-consistency.ts]
  → Function: resolveConsistentScenes() (line 51)
  → Gets data from: feedLayout, user, options
  → Calls: resolveAllFeedPlannerScenes()
  → Outputs: FeedPlannerScene[] (9 scenes)
  ↓
[FILE: lib/feed-planner/scene-resolver.ts]
  → Function: resolveAllFeedPlannerScenes() (line 265)
  → Gets data from: feedLayout, user, options
  → Loops positions 1-9, calls resolveFeedPlannerScene() for each
  → Outputs: FeedPlannerScene[] (9 scenes)
  ↓
[FILE: lib/feed-planner/scene-resolver.ts]
  → Function: resolveFeedPlannerScene() (line 141)
  → Gets data from: feedLayout, user, position
  → Steps:
    1. getCoherentStyleParameters() → category, mood, fashionStyle
    2. deriveActivityFromPosition() → activity
    3. deriveLocationFromActivity() → location
    4. deriveOutfitFromActivity() → outfit
    5. deriveObjectsFromActivity() → objects
    6. deriveLightingFromActivity() → lighting
    7. deriveCameraFromActivity() → camera (framing)
    8. derivePoseFromActivity() → pose
    9. buildNarrative() → narrative
  → Outputs: FeedPlannerScene (single scene)
  ↓
[FILE: lib/feed-planner/scene-consistency.ts]
  → Function: buildPreviewPromptFromScenes() (line 99)
  → Gets data from: FeedPlannerScene[] (9 scenes)
  → Calls: buildPromptFromScene(scenes[0], 'preview_multi', scenes)
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: buildPromptFromScene() (line 74)
  → Gets data from: scene, mode='preview_multi', allScenes
  → Calls: buildPreviewMultiPrompt(scene, allScenes)
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: buildPreviewMultiPrompt() (line 121)
  → Gets data from: scene, allScenes (9 scenes)
  → Loops allScenes, calls buildSceneExecutionBlock() for each
  ↓
[FILE: lib/feed-planner/prompt-shaper.ts]
  → Function: buildSceneExecutionBlock() (line 455)
  → Gets data from: FeedPlannerScene, position
  → Routes to: buildObjectFlatlayBlock, buildTextureShotBlock, buildDetailCloseUpBlock, buildOverheadFlatlayBlock, or buildPortraitBlock
  → Outputs: string (scene description block)
```

---

## 2. FILES INVOLVED

### File 1: `lib/feed-planner/scene-resolver.ts`
- **Functions:**
  - `resolveFeedPlannerScene()` - Creates single scene
  - `resolveAllFeedPlannerScenes()` - Creates all 9 scenes
  - `deriveActivityFromPosition()` - Selects activity based on position
  - `deriveLocationFromActivity()` - Maps activity to location
  - `deriveOutfitFromActivity()` - Maps activity to outfit
  - `deriveObjectsFromActivity()` - Maps activity to objects
  - `deriveLightingFromActivity()` - Maps activity to lighting
  - `deriveCameraFromActivity()` - Maps activity to camera framing ⚠️ **CRITICAL**
  - `derivePoseFromActivity()` - Maps activity to pose
- **Input:** feedLayout, user, position
- **Output:** FeedPlannerScene
- **Status:** ✅ Active

### File 2: `lib/feed-planner/scene-consistency.ts`
- **Functions:**
  - `resolveConsistentScenes()` - Wrapper for resolveAllFeedPlannerScenes
  - `buildPreviewPromptFromScenes()` - Builds preview prompt from 9 scenes
  - `buildSingleScenePromptFromScene()` - Builds single scene prompt
- **Input:** feedLayout, user, options
- **Output:** FeedPlannerScene[] (9 scenes)
- **Status:** ✅ Active

### File 3: `lib/feed-planner/prompt-shaper.ts`
- **Functions:**
  - `buildPromptFromScene()` - Main entry point
  - `buildPreviewMultiPrompt()` - Builds preview prompt
  - `buildSceneExecutionBlock()` - Routes to specific block builders ⚠️ **ROUTING LOGIC**
  - `buildObjectFlatlayBlock()` - Object flatlay (no person)
  - `buildTextureShotBlock()` - Texture shot (no person)
  - `buildDetailCloseUpBlock()` - Detail close-up (cropped person)
  - `buildOverheadFlatlayBlock()` - Overhead flatlay (arms only)
  - `buildPortraitBlock()` - Portrait (full person)
- **Input:** FeedPlannerScene, position
- **Output:** string (prompt block)
- **Status:** ✅ Active

### File 4: `app/api/feed/[feedId]/generate-single/route.ts`
- **Functions:**
  - POST handler - Calls resolveConsistentScenes()
- **Input:** Request with feedId
- **Output:** Response with prompt
- **Status:** ✅ Active

---

## 3. SCENE DATA STRUCTURE

```typescript
interface FeedPlannerScene {
  position: number // 1-9
  activity: string // "post_workout_coffee", "remote_work_break", etc.
  narrative: string // Human-readable story
  
  location: {
    type: string // "coffee_shop", "home_living_room", "gym", etc.
    description: string // Human-readable location description
    indoor: boolean
    public: boolean
  }
  
  outfit: {
    style: string // Resolved fashion style
    description: string // Human-readable outfit description
    base: string // Base outfit type
    layer?: string // Optional layer
  }
  
  objects: Array<{
    type: string // "coffee_cup", "phone", "laptop", etc.
    description: string // Human-readable object description
    position?: 'hand' | 'table' | 'bag' | 'ground'
  }>
  
  lighting: {
    type: string // "natural_window_light", "overcast_daylight", etc.
    quality: 'even' | 'uneven' | 'dramatic'
    description: string // Human-readable lighting description
  }
  
  camera: {
    device: 'iphone_15_pro'
    mode: 'portrait' | 'photo'
    framing: 'close_up' | 'midshot' | 'full_body' | 'environmental' | 'flatlay' ⚠️ **KEY FIELD**
  }
  
  pose: {
    type: string // "walking_toward_camera", "sitting_at_table", etc.
    description: string // Human-readable pose description
  }
  
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  fashionStyle: string // Resolved fashion style
  
  userId: string
  feedId: number
}
```

---

## 4. ACTUAL SCENE DATA (From Code Analysis)

**Expected Scene Data Sample (Position 1):**
```javascript
{
  position: 1,
  activity: "gym_session", // or "morning_routine", "coffee_shop_work"
  camera: {
    framing: "full_body" // ⚠️ ALWAYS full_body (never flatlay or close_up)
  },
  objects: [
    { type: "water_bottle", description: "water bottle", position: "hand" },
    { type: "phone", description: "iPhone", position: "bag" }
  ],
  // NO smoothie, NO bowl, NO fabric, NO texture objects
}
```

**Problem:** All scenes have:
- `camera.framing` = `'full_body'` (default, never 'flatlay' or 'close_up')
- `objects` = Generic items (coffee_cup, phone, book) - NO flatlay objects (smoothie, bowl)
- NO strategic positioning logic

---

## 5. ROUTING ANALYSIS

### Why Everything Routes to Portrait

**In `buildSceneExecutionBlock()` (prompt-shaper.ts:455):**

1. **Object Flatlay Check (Line 470):**
   ```typescript
   if (isFlatlay && (allObjectText.includes('smoothie') || ...))
   ```
   - **Problem:** `isFlatlay` is ALWAYS false because `scene.camera.framing` is NEVER 'flatlay'
   - **Reason:** `deriveCameraFromActivity()` only sets `framing = 'flatlay'` if:
     - `location.type.includes('table')` - NO location types include 'table'
     - `activity.includes('flatlay')` - NO activities include 'flatlay'
   - **Result:** Never routes to `buildObjectFlatlayBlock()`

2. **Texture Shot Check (Line 481):**
   ```typescript
   if (isCloseUp && (allObjectText.includes('fabric') || ...))
   ```
   - **Problem:** `isCloseUp` is ALWAYS false (except for 'routine' or 'self_care' activities)
   - **Reason:** `deriveCameraFromActivity()` only sets `framing = 'close_up'` if:
     - `activity.includes('routine')` - Only 1-2 activities match
     - `activity.includes('self_care')` - Only 1 activity matches
   - **Result:** Rarely routes to `buildTextureShotBlock()`

3. **Detail Close-Up Check (Line 491):**
   ```typescript
   if (isCloseUp && (scene.objects.some(obj => obj.position === 'hand') || ...))
   ```
   - **Problem:** `isCloseUp` is false for most scenes
   - **Result:** Rarely routes to `buildDetailCloseUpBlock()`

4. **Overhead Flatlay Check (Line 502):**
   ```typescript
   if (isFlatlay && (allObjectText.includes('mat') || ...))
   ```
   - **Problem:** `isFlatlay` is ALWAYS false
   - **Result:** Never routes to `buildOverheadFlatlayBlock()`

5. **Default Portrait (Line 513):**
   ```typescript
   return buildPortraitBlock(scene, position, positionLabel)
   ```
   - **Result:** 99% of scenes route here because all checks above fail

---

## 6. MISSING LOGIC

### ❌ Missing: Strategic Positioning Logic

**What Should Exist:**
A function that assigns content types to positions based on Instagram feed layout principles:

```typescript
function assignStrategicContentType(position: number): {
  contentType: 'portrait' | 'flatlay' | 'detail' | 'texture' | 'overhead'
  framing: 'close_up' | 'midshot' | 'full_body' | 'flatlay'
  requiresObjects: string[]
} {
  const strategicMap: Record<number, {...}> = {
    1: { contentType: 'portrait', framing: 'full_body' },
    2: { contentType: 'flatlay', framing: 'flatlay', requiresObjects: ['smoothie', 'bowl', 'yoga_mat'] },
    3: { contentType: 'portrait', framing: 'full_body' },
    4: { contentType: 'detail', framing: 'close_up', requiresObjects: ['tea', 'cup', 'ceramic'] },
    5: { contentType: 'portrait', framing: 'full_body' },
    6: { contentType: 'texture', framing: 'close_up', requiresObjects: ['fabric', 'mesh'] },
    7: { contentType: 'portrait', framing: 'full_body' },
    8: { contentType: 'overhead', framing: 'flatlay', requiresObjects: ['mat', 'bottle', 'band'] },
    9: { contentType: 'portrait', framing: 'full_body' },
  }
  return strategicMap[position] || strategicMap[1]
}
```

**Current State:** This logic DOES NOT EXIST.

### ❌ Missing: Diverse Object Types

**Current Objects (deriveObjectsFromActivity):**
- coffee_cup, phone, laptop, book, tea, water_bottle, yoga_mat, wine_glass, bag, keys, sunglasses

**Missing Objects:**
- smoothie, bowl, granola, berry, coconut (for flatlays)
- fabric, texture, mesh, material (for texture shots)
- resistance_band, headphone (for overhead flatlays)

### ❌ Missing: Camera Framing Diversity

**Current Logic (deriveCameraFromActivity:783):**
```typescript
let framing = 'full_body' // DEFAULT

if (activity.includes('routine') || activity.includes('self_care')) {
  framing = 'close_up'
} else if (activity.includes('work') || activity.includes('meeting')) {
  framing = 'midshot'
} else if (activity.includes('exploration') || activity.includes('travel')) {
  framing = 'environmental'
}

// Check for flatlay indicators
if (location.type.includes('table') || activity.includes('flatlay')) {
  framing = 'flatlay'
}
```

**Problems:**
1. Default is `'full_body'` - 90% of scenes get this
2. Flatlay check NEVER triggers (no locations have 'table', no activities have 'flatlay')
3. No position-based framing assignment
4. No strategic diversity logic

---

## 7. DELETED FILES (Last 30 Commits)

**Git History Shows:**
- `c9c12a4` - "Delete composition system implementation files"
- `957dce4` - "Phase 2: Delete unused code - Remove 3 unused prompt builders"

**No specific scene strategy files found in deleted files**, but composition system deletion may have removed strategic positioning logic.

---

## 8. FIX RECOMMENDATION

### Fix 1: Add Strategic Positioning Logic to `deriveCameraFromActivity()`

**File:** `lib/feed-planner/scene-resolver.ts`  
**Function:** `deriveCameraFromActivity()` (line 783)

**Add position-based framing assignment BEFORE activity-based logic:**

```typescript
function deriveCameraFromActivity(
  activity: string,
  location: FeedPlannerScene['location'],
  position: number // ⚠️ ADD position parameter
): FeedPlannerScene['camera'] {
  // 🔴 FIX: Strategic positioning for feed diversity
  // Position-based framing assignment (Instagram feed layout principles)
  const strategicFraming: Record<number, FeedPlannerScene['camera']['framing']> = {
    1: 'full_body',    // Portrait opener
    2: 'flatlay',      // Object flatlay (smoothie bowl)
    3: 'full_body',    // Portrait
    4: 'close_up',     // Detail close-up (hands + tea cup)
    5: 'full_body',    // Portrait (center anchor)
    6: 'close_up',     // Texture shot (fabric)
    7: 'full_body',    // Portrait
    8: 'flatlay',      // Overhead flatlay (workout gear)
    9: 'full_body',    // Portrait closer
  }
  
  // Use strategic framing if available, otherwise fall back to activity-based
  let framing = strategicFraming[position] || 'full_body'
  
  // Activity-based overrides (only if strategic framing allows)
  if (framing === 'full_body') {
    if (activity.includes('routine') || activity.includes('self_care')) {
      framing = 'close_up'
    } else if (activity.includes('work') || activity.includes('meeting')) {
      framing = 'midshot'
    } else if (activity.includes('exploration') || activity.includes('travel')) {
      framing = 'environmental'
    }
  }
  
  return {
    device: 'iphone_15_pro',
    mode: 'portrait',
    framing
  }
}
```

**Update call site (line 214):**
```typescript
const camera = deriveCameraFromActivity(activity, location, position) // Add position
```

### Fix 2: Add Diverse Objects for Strategic Positions

**File:** `lib/feed-planner/scene-resolver.ts`  
**Function:** `deriveObjectsFromActivity()` (line 594)

**Add position-based object injection:**

```typescript
function deriveObjectsFromActivity(
  activity: string,
  fashionStyle: string,
  position: number // ⚠️ ADD position parameter
): FeedPlannerScene['objects'] {
  // Get base objects from activity
  let objects = activityObjectMap[activity] || activityObjectMap['coffee_shop_work']
  
  // 🔴 FIX: Add strategic objects for diverse content types
  if (position === 2) {
    // Position 2: Object flatlay (smoothie bowl)
    objects = [
      { type: 'smoothie_bowl', description: 'vibrant green smoothie bowl topped with fresh berries, granola, and coconut flakes', position: 'table' },
      { type: 'yoga_mat', description: 'rolled yoga mat', position: 'table' },
      { type: 'utensils', description: 'bamboo utensils', position: 'table' }
    ]
  } else if (position === 4) {
    // Position 4: Detail close-up (hands + tea cup) - keep existing tea objects
    // Objects already include tea cup from activity
  } else if (position === 6) {
    // Position 6: Texture shot (fabric)
    objects = [
      { type: 'fabric', description: 'black mesh athletic fabric with geometric pattern texture and subtle sheen', position: 'table' }
    ]
  } else if (position === 8) {
    // Position 8: Overhead flatlay (workout gear)
    objects = [
      { type: 'yoga_mat', description: 'yoga mat', position: 'ground' },
      { type: 'water_bottle', description: 'water bottle', position: 'ground' },
      { type: 'resistance_band', description: 'resistance bands', position: 'ground' },
      { type: 'headphone', description: 'wireless headphones', position: 'ground' }
    ]
  }
  
  // Apply fashion style filters (existing logic)
  if (fashionStyle.includes('athletic') && !fashionStyle.includes('elevated')) {
    objects = objects.filter(obj => 
      !['laptop', 'notebook', 'desk', 'workspace'].includes(obj.type)
    )
  }
  
  return objects
}
```

**Update call site (line 204):**
```typescript
const objects = deriveObjectsFromActivity(activity, resolvedFashionStyle, position) // Add position
```

### Fix 3: Update Activity Selection for Strategic Positions

**File:** `lib/feed-planner/scene-resolver.ts`  
**Function:** `deriveActivityFromPosition()` (line 296)

**Add activities that support strategic content types:**

```typescript
function deriveActivityFromPosition(
  position: number,
  category: string,
  fashionStyle: string
): string {
  // 🔴 FIX: Strategic activity assignment for diverse content
  if (position === 2) {
    // Position 2: Object flatlay - use wellness activity
    return 'wellness_break' // or create new 'smoothie_prep' activity
  } else if (position === 4) {
    // Position 4: Detail close-up - use tea/coffee activity
    return 'remote_work_break' // Already has tea cup
  } else if (position === 6) {
    // Position 6: Texture shot - use activity that allows fabric focus
    return 'gym_session' // Athletic wear has fabric
  } else if (position === 8) {
    // Position 8: Overhead flatlay - use workout prep activity
    return 'morning_yoga' // Already has yoga mat
  }
  
  // Existing position-based activity patterns for other positions
  const positionPatterns: Record<number, string[]> = {
    // ... existing patterns
  }
  // ... rest of existing logic
}
```

---

## 9. SUMMARY

### Root Cause

**The problem is in `deriveCameraFromActivity()`:**
1. ❌ No position-based framing assignment
2. ❌ Flatlay check NEVER triggers (no locations with 'table', no activities with 'flatlay')
3. ❌ Default framing is 'full_body' for 90% of scenes
4. ❌ No strategic diversity logic

**Secondary Problem in `deriveObjectsFromActivity()`:**
1. ❌ No position-based object injection
2. ❌ Missing objects for flatlays (smoothie, bowl, granola)
3. ❌ Missing objects for texture shots (fabric, mesh)

### Fix Priority

1. **🔴 CRITICAL:** Add position parameter to `deriveCameraFromActivity()` and implement strategic framing
2. **🔴 CRITICAL:** Add position parameter to `deriveObjectsFromActivity()` and inject strategic objects
3. **🟡 HIGH:** Update `deriveActivityFromPosition()` to select activities that support strategic content types
4. **🟡 MEDIUM:** Add logging to verify scene data matches expectations

### Expected Result After Fix

**Position 1:** Portrait (full_body) ✅  
**Position 2:** Object flatlay (flatlay, smoothie bowl objects) ✅  
**Position 3:** Portrait (full_body) ✅  
**Position 4:** Detail close-up (close_up, tea cup objects) ✅  
**Position 5:** Portrait (full_body) ✅  
**Position 6:** Texture shot (close_up, fabric objects) ✅  
**Position 7:** Portrait (full_body) ✅  
**Position 8:** Overhead flatlay (flatlay, workout gear objects) ✅  
**Position 9:** Portrait (full_body) ✅

**Diversity:** 5 portraits + 4 supporting content types = Strategic feed layout ✅
