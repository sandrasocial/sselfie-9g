# Location Selection System - Detailed Audit

**Date:** 2025-01-11  
**Auditor:** Cursor AI  
**Purpose:** Comprehensive audit of how the injection system selects and assigns locations to template placeholders  
**File:** `lib/feed-planner/dynamic-template-injector.ts`

---

## EXECUTIVE SUMMARY

### Location Selection Status: ⚠️ **FUNCTIONAL WITH LIMITATIONS**

The location selection system **works** but has **logical issues** that prevent proper rotation for outdoor/indoor locations. The rotation index is applied to the full locations array, but then filtering by setting type happens **after** rotation, which can cause mismatches.

### Key Findings

| Aspect | Status | Issue |
|--------|--------|-------|
| **Rotation Index** | ✅ Works | Applied to full locations array |
| **Setting Filtering** | ⚠️ **ISSUE** | Happens AFTER rotation, causing mismatches |
| **Outdoor Selection** | ⚠️ **ISSUE** | May not respect rotation if no outdoor locations |
| **Indoor Selection** | ⚠️ **ISSUE** | May not respect rotation if insufficient indoor locations |
| **Architectural Selection** | ⚠️ **ISSUE** | Always uses location1, ignores rotation |
| **Frame Type Formatting** | ✅ Works | Contextual formatting for flatlay/closeup works |

---

## HOW LOCATION SELECTION WORKS

### Step 1: Get All Locations from Vibe Library

**Code (Line 79):**
```typescript
const locations = library.locations
```

**What Happens:**
- Retrieves all location descriptions from the vibe library
- Each location has: `id`, `name`, `description`, `lighting`, `mood`, `setting` ('indoor' | 'outdoor' | 'urban')

**Example (luxury_dark_moody):**
```typescript
locations = [
  { id: 'lux_dark_loc_001', name: 'Brutalist Concrete Staircase', setting: 'outdoor', ... },
  { id: 'lux_dark_loc_002', name: 'Dark Marble Hotel Lobby', setting: 'indoor', ... },
  { id: 'lux_dark_loc_003', name: 'Modern Office Interior', setting: 'indoor', ... },
  // ... more locations
]
```

---

### Step 2: Apply Rotation Index (With Wraparound)

**Code (Lines 70, 80-82):**
```typescript
const locationIndex = context.locationIndex || 0

const location1 = locations[locationIndex % locations.length]
const location2 = locations[(locationIndex + 1) % locations.length]
const location3 = locations[(locationIndex + 2) % locations.length]
```

**What Happens:**
- Uses rotation index from database (or defaults to 0)
- Selects 3 consecutive locations from the array using wraparound
- Example: If `locationIndex = 3` and there are 6 locations:
  - `location1 = locations[3]` (4th location)
  - `location2 = locations[4]` (5th location)
  - `location3 = locations[5]` (6th location)

**Rotation Increment:**
- After each feed generation, `locationIndex` increments by 3
- This ensures next feed uses different locations

---

### Step 3: Filter by Setting Type

**Code (Lines 173-175):**
```typescript
const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
const indoorLocations = locations.filter(l => l.setting === 'indoor')
```

**What Happens:**
- Filters ALL locations (not the rotated subset) by setting type
- Creates separate arrays for outdoor and indoor locations
- **⚠️ ISSUE:** This filtering happens AFTER rotation, so it doesn't respect the rotation index

**Example:**
```typescript
// If locations array is:
[
  { setting: 'outdoor' },  // index 0
  { setting: 'indoor' },    // index 1
  { setting: 'indoor' },    // index 2
  { setting: 'outdoor' },  // index 3
  { setting: 'indoor' },   // index 4
  { setting: 'indoor' },   // index 5
]

// After filtering:
outdoorLocations = [locations[0], locations[3]]  // First and 4th
indoorLocations = [locations[1], locations[2], locations[4], locations[5]]  // 2nd, 3rd, 5th, 6th

// But rotation uses:
location1 = locations[3]  // 4th location (outdoor)
location2 = locations[4]  // 5th location (indoor)
location3 = locations[5]  // 6th location (indoor)
```

---

### Step 4: Assign to Placeholders

**Code (Lines 190-202):**
```typescript
LOCATION_OUTDOOR_1: outdoorLocations.length > 0 
  ? formatLocationForFrameType(outdoorLocations[0], frameType)
  : formatLocationForFrameType(location1, frameType),
  
LOCATION_INDOOR_1: indoorLocations.length > 0 
  ? formatLocationForFrameType(indoorLocations[0], frameType)
  : formatLocationForFrameType(location1, frameType),
  
LOCATION_INDOOR_2: indoorLocations.length > 1 
  ? formatLocationForFrameType(indoorLocations[1], frameType)
  : formatLocationForFrameType(location2, frameType),
  
LOCATION_INDOOR_3: indoorLocations.length > 2 
  ? formatLocationForFrameType(indoorLocations[2], frameType)
  : formatLocationForFrameType(location3, frameType),
  
LOCATION_ARCHITECTURAL_1: formatLocationForFrameType(location1, frameType),
```

**What Happens:**

1. **LOCATION_OUTDOOR_1:**
   - If outdoor locations exist: Uses `outdoorLocations[0]` (first outdoor location)
   - Otherwise: Falls back to `location1` (from rotation)
   - **⚠️ ISSUE:** Always uses first outdoor location, ignores rotation

2. **LOCATION_INDOOR_1:**
   - If indoor locations exist: Uses `indoorLocations[0]` (first indoor location)
   - Otherwise: Falls back to `location1` (from rotation)
   - **⚠️ ISSUE:** Always uses first indoor location, ignores rotation

3. **LOCATION_INDOOR_2:**
   - If 2+ indoor locations exist: Uses `indoorLocations[1]` (second indoor location)
   - Otherwise: Falls back to `location2` (from rotation)
   - **⚠️ ISSUE:** Always uses second indoor location, ignores rotation

4. **LOCATION_INDOOR_3:**
   - If 3+ indoor locations exist: Uses `indoorLocations[2]` (third indoor location)
   - Otherwise: Falls back to `location3` (from rotation)
   - **⚠️ ISSUE:** Always uses third indoor location, ignores rotation

5. **LOCATION_ARCHITECTURAL_1:**
   - Always uses `location1` (from rotation)
   - **⚠️ ISSUE:** No architectural filtering, just uses rotated location1

---

## CRITICAL ISSUES IDENTIFIED

### 🔴 Issue #1: Rotation Not Respected for Outdoor/Indoor Filtering

**Problem:**
- Rotation index selects locations from full array
- But outdoor/indoor filtering happens on full array (not rotated subset)
- Placeholders always use first/second/third outdoor/indoor locations, ignoring rotation

**Example:**
```typescript
// Initial state (locationIndex = 0)
outdoorLocations[0] = locations[0]  // First outdoor
indoorLocations[0] = locations[1]   // First indoor

// After rotation (locationIndex = 3)
outdoorLocations[0] = locations[0]  // STILL first outdoor (no change!)
indoorLocations[0] = locations[1]   // STILL first indoor (no change!)

// But location1 = locations[3] (different location)
```

**Impact:**
- Users get **same outdoor/indoor locations** every feed
- Rotation only affects fallback cases (when no outdoor/indoor locations exist)
- **LOCATION_ARCHITECTURAL_1** rotates correctly (uses location1)

**Fix Required:**
- Filter locations FIRST, then apply rotation to filtered arrays
- OR: Apply rotation to full array, then filter the rotated subset

---

### 🟡 Issue #2: Architectural Location Always Uses location1

**Problem:**
- `LOCATION_ARCHITECTURAL_1` always uses `location1` from rotation
- No filtering for "architectural" setting type
- If location1 is not architectural, placeholder gets wrong location type

**Impact:**
- Architectural placeholder may get non-architectural location
- No way to ensure architectural locations are used for architectural placeholders

**Fix Required:**
- Add architectural filtering OR
- Document that architectural = any location (current behavior)

---

### 🟡 Issue #3: Fallback Logic May Use Wrong Setting Type

**Problem:**
- If no outdoor locations exist, `LOCATION_OUTDOOR_1` falls back to `location1`
- But `location1` might be indoor, not outdoor
- Same issue for indoor placeholders

**Example:**
```typescript
// If no outdoor locations exist:
LOCATION_OUTDOOR_1 = location1  // But location1 might be indoor!
```

**Impact:**
- Placeholder name suggests outdoor, but gets indoor location
- Template may have incorrect location type

**Fix Required:**
- Better fallback logic that respects setting type
- OR: Ensure all vibes have both outdoor and indoor locations

---

## CURRENT BEHAVIOR SUMMARY

### How It Actually Works:

1. **Rotation Index Applied:**
   - `location1 = locations[locationIndex % locations.length]`
   - `location2 = locations[(locationIndex + 1) % locations.length]`
   - `location3 = locations[(locationIndex + 2) % locations.length]`

2. **Filtering Happens:**
   - `outdoorLocations = locations.filter(l => l.setting === 'outdoor')`
   - `indoorLocations = locations.filter(l => l.setting === 'indoor')`

3. **Placeholder Assignment:**
   - `LOCATION_OUTDOOR_1`: Uses `outdoorLocations[0]` (first outdoor, ignores rotation)
   - `LOCATION_INDOOR_1`: Uses `indoorLocations[0]` (first indoor, ignores rotation)
   - `LOCATION_INDOOR_2`: Uses `indoorLocations[1]` (second indoor, ignores rotation)
   - `LOCATION_INDOOR_3`: Uses `indoorLocations[2]` (third indoor, ignores rotation)
   - `LOCATION_ARCHITECTURAL_1`: Uses `location1` (respects rotation, but no filtering)

### Result:

- **Outdoor/Indoor locations:** **DO NOT ROTATE** (always use first/second/third)
- **Architectural location:** **ROTATES** (uses location1 from rotation)
- **Fallback cases:** **ROTATE** (when no outdoor/indoor locations exist)

---

## TEMPLATE USAGE PATTERNS

### How Templates Use Location Placeholders:

**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Example (luxury_dark_moody):**
```typescript
1. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}
2. Coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay
3. Full-body against {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_2}}
7. Walking naturally on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}
8. Working at laptop with coffee - overhead view, hands typing, {{LOCATION_INDOOR_2}}
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_3}}
```

**Pattern:**
- `LOCATION_OUTDOOR_1`: Used in frames 1, 7 (outdoor scenes)
- `LOCATION_INDOOR_1`: Used in frame 2 (indoor flatlay)
- `LOCATION_INDOOR_2`: Used in frame 8 (indoor workspace)
- `LOCATION_INDOOR_3`: Used in frame 9 (indoor mirror)
- `LOCATION_ARCHITECTURAL_1`: Used in frame 3 (architectural background)

**Issue:**
- Frames 1 and 7 both use `LOCATION_OUTDOOR_1` (same location)
- Frames 2, 8, 9 use different indoor placeholders (good variety)
- Frame 3 uses architectural (rotates correctly)

---

## RECOMMENDED FIXES

### 🔴 Priority 1: Fix Rotation for Outdoor/Indoor Locations

**Current Code:**
```typescript
// ❌ WRONG: Filters full array, then uses first/second/third
const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
LOCATION_OUTDOOR_1: outdoorLocations[0]  // Always first outdoor
```

**Fixed Code:**
```typescript
// ✅ CORRECT: Filter first, then apply rotation
const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
const indoorLocations = locations.filter(l => l.setting === 'indoor')

// Apply rotation to filtered arrays
const outdoorIndex = locationIndex % outdoorLocations.length
const indoorIndex = locationIndex % indoorLocations.length

LOCATION_OUTDOOR_1: outdoorLocations.length > 0
  ? formatLocationForFrameType(outdoorLocations[outdoorIndex], frameType)
  : formatLocationForFrameType(location1, frameType),

LOCATION_INDOOR_1: indoorLocations.length > 0
  ? formatLocationForFrameType(indoorLocations[indoorIndex], frameType)
  : formatLocationForFrameType(location1, frameType),

LOCATION_INDOOR_2: indoorLocations.length > 1
  ? formatLocationForFrameType(indoorLocations[(indoorIndex + 1) % indoorLocations.length], frameType)
  : formatLocationForFrameType(location2, frameType),

LOCATION_INDOOR_3: indoorLocations.length > 2
  ? formatLocationForFrameType(indoorLocations[(indoorIndex + 2) % indoorLocations.length], frameType)
  : formatLocationForFrameType(location3, frameType),
```

**Impact:** Outdoor and indoor locations will rotate correctly across feeds.

---

### 🟡 Priority 2: Fix Architectural Location Selection

**Option A: Add Architectural Filtering**
```typescript
const architecturalLocations = locations.filter(l => 
  l.setting === 'outdoor' || l.name.toLowerCase().includes('architectural')
)

LOCATION_ARCHITECTURAL_1: architecturalLocations.length > 0
  ? formatLocationForFrameType(architecturalLocations[locationIndex % architecturalLocations.length], frameType)
  : formatLocationForFrameType(location1, frameType),
```

**Option B: Document Current Behavior**
- Document that `LOCATION_ARCHITECTURAL_1` = any location (no filtering)
- Keep current behavior (uses location1 from rotation)

**Impact:** Ensures architectural placeholder gets appropriate location type.

---

### 🟡 Priority 3: Improve Fallback Logic

**Current:**
```typescript
LOCATION_OUTDOOR_1: outdoorLocations.length > 0 
  ? outdoorLocations[0]
  : location1  // ❌ location1 might be indoor!
```

**Fixed:**
```typescript
LOCATION_OUTDOOR_1: outdoorLocations.length > 0 
  ? outdoorLocations[outdoorIndex]
  : (location1.setting === 'outdoor' 
      ? location1 
      : locations.find(l => l.setting === 'outdoor') || location1)  // Find any outdoor
```

**Impact:** Fallback respects setting type when possible.

---

## LOCATION DATA STRUCTURE

### Location Description Interface:

```typescript
export interface LocationDescription {
  id: string;
  name: string;
  description: string;  // Full description used in prompts
  lighting: string;     // Lighting description
  mood: string;         // Mood description
  setting: 'indoor' | 'outdoor' | 'urban';  // Used for filtering
}
```

### Example Location (luxury_dark_moody):

```typescript
{
  id: 'lux_dark_loc_001',
  name: 'Brutalist Concrete Staircase',
  description: 'Geometric shadows of a brutalist concrete staircase outside a high-rise building. The evening light creates dramatic shadows across the dark stone surfaces. Modern architectural backdrop with angular concrete forms and industrial elegance.',
  lighting: 'evening golden hour with dramatic shadows',
  mood: 'powerful, architectural, sophisticated',
  setting: 'outdoor'  // Used for LOCATION_OUTDOOR_1 filtering
}
```

---

## FRAME TYPE FORMATTING

### How Frame Type Affects Location Description:

**Code (Lines 143-159):**
```typescript
function formatLocationForFrameType(
  location: LocationDescription,
  frameType: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
): string {
  switch (frameType) {
    case 'flatlay':
      // Extract just surface/material (e.g., "dark marble surface")
      return extractSurfaceDescription(location)
    case 'closeup':
      // Return minimal context or empty
      return '' // Closeup scenes don't need location context
    case 'fullbody':
    case 'midshot':
      // Return full description
      return location.description
  }
}
```

**What Happens:**

1. **Flatlay Scenes:**
   - Full description: "Luxurious hotel lobby with floor-to-ceiling dark marble walls..."
   - Formatted: "dark marble surface"
   - **Impact:** Removes ambient details, keeps only surface/material

2. **Closeup Scenes:**
   - Full description: "Luxurious hotel lobby..."
   - Formatted: "" (empty)
   - **Impact:** No location context for closeup shots

3. **Fullbody/Midshot Scenes:**
   - Full description: "Luxurious hotel lobby with floor-to-ceiling dark marble walls..."
   - Formatted: Full description (unchanged)
   - **Impact:** Complete location context for full/mid shots

**Status:** ✅ **WORKS CORRECTLY** - Frame type formatting is functional.

---

## ROTATION INCREMENT LOGIC

### How Rotation Index Increments:

**File:** `lib/feed-planner/rotation-manager.ts`

**Code:**
```typescript
export async function incrementRotationState(
  userId: string,
  vibe: string,
  fashionStyle: string
): Promise<void> {
  await sql`
    UPDATE user_feed_rotation_state
    SET location_index = location_index + 3,  // Increments by 3
        outfit_index = outfit_index + 4,
        accessory_index = accessory_index + 2,
        ...
  `
}
```

**What Happens:**
- After each feed generation, `location_index` increments by **3**
- This ensures next feed uses locations[3], locations[4], locations[5] instead of locations[0], locations[1], locations[2]

**Issue:**
- Increment by 3 assumes 3 locations are used per feed
- But if outdoor/indoor filtering doesn't rotate, increment doesn't help

**Fix:**
- After fixing rotation logic, increment should work correctly
- OR: Increment by number of unique location placeholders used (5: outdoor_1, indoor_1, indoor_2, indoor_3, architectural_1)

---

## SUMMARY

### Current Behavior:

1. **Rotation Index:** ✅ Applied to full locations array
2. **Setting Filtering:** ⚠️ Happens on full array (not rotated subset)
3. **Outdoor Selection:** ❌ Always uses first outdoor (ignores rotation)
4. **Indoor Selection:** ❌ Always uses first/second/third indoor (ignores rotation)
5. **Architectural Selection:** ✅ Uses location1 from rotation (but no filtering)
6. **Frame Type Formatting:** ✅ Works correctly for flatlay/closeup/fullbody

### Impact:

- **Outdoor/Indoor locations:** **DO NOT ROTATE** across feeds
- **Architectural location:** **ROTATES** correctly
- **Users see:** Same outdoor/indoor locations every feed (no variety)

### Fix Priority:

1. 🔴 **Fix rotation for outdoor/indoor** (Critical - prevents variety)
2. 🟡 **Fix architectural filtering** (Medium - ensures correct location type)
3. 🟡 **Improve fallback logic** (Low - edge case handling)

---

**Audit Completed:** 2025-01-11  
**Next Review:** After rotation fix implemented
