# PR-8 Hydration Fix Implementation
**Date:** 2025-01-XX  
**Status:** Implementation Complete ✅

---

## SUMMARY

Fixed hydration logic in `app/blueprint/page-client.tsx` to load grid_url and other generated outputs from DB on mount when `savedEmail` exists, even for localStorage-only users (no URL params).

---

## FIXES IMPLEMENTED

### Fix 1: Unified Hydration Function ✅

**File:** `app/blueprint/page-client.tsx`  
**Lines:** 161-223

**Change:**
Added `hydrateBlueprintState()` function that:
- Calls `/api/blueprint/get-blueprint?email=...` 
- Sets all state: `formData`, `feedStyle`, `strategy`, `grid`, `selfieImages`, `completed`
- Only hydrates if server didn't provide props (localStorage-only users)
- Guards against URL update loops with `urlUpdateRef`

**Code:**
```typescript
const hydrateBlueprintState = useCallback(async () => {
  if (!savedEmail || !savedEmail.includes("@")) return
  if (urlUpdateRef.current) return // Don't hydrate if URL was updated (refresh will provide server props)

  try {
    const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
    // ... validates response
    const blueprint = data.blueprint

    // Hydrate form data if server didn't provide it
    if (!initialFormData || (typeof initialFormData === "object" && Object.keys(initialFormData).length === 0)) {
      if (blueprint.formData && typeof blueprint.formData === "object" && Object.keys(blueprint.formData).length > 0) {
        setFormData(blueprint.formData)
      }
    }

    // Hydrate feed style if server didn't provide it
    if (!initialSelectedFeedStyle && blueprint.feedStyle) {
      setSelectedFeedStyle(blueprint.feedStyle)
    }

    // Hydrate strategy if exists and server didn't indicate it
    if (!initialHasStrategy && blueprint.strategy?.generated && blueprint.strategy?.data) {
      setConcepts([blueprint.strategy.data])
      setHasStrategy(true)
    }

    // Hydrate grid if exists and server didn't indicate it
    if (!initialHasGrid && blueprint.grid?.generated && blueprint.grid?.gridUrl) {
      setGeneratedConceptImages({ 0: blueprint.grid.gridUrl })
      if (blueprint.grid.frameUrls && Array.isArray(blueprint.grid.frameUrls) && blueprint.grid.frameUrls.length === 9) {
        setSavedFrameUrls(blueprint.grid.frameUrls)
      }
      setHasGrid(true)
    }

    // Hydrate selfie images if server didn't provide them
    if ((!initialSelfieImages || initialSelfieImages.length === 0) && blueprint.selfieImages && Array.isArray(blueprint.selfieImages) && blueprint.selfieImages.length > 0) {
      setSelfieImages(blueprint.selfieImages)
    }

    // Hydrate completion status if server didn't indicate it
    if (!initialIsCompleted && blueprint.completed) {
      setIsCompleted(true)
      setHasGrid(true) // If completed, grid must exist
      setStep((currentStep) => currentStep !== 7 ? 7 : currentStep) // Show completed view if not already at step 7
    }
  } catch (error) {
    console.error("[Blueprint] Error hydrating blueprint state:", error)
  }
}, [savedEmail, initialFormData, initialSelectedFeedStyle, initialHasStrategy, initialHasGrid, initialSelfieImages, initialIsCompleted])
```

**Called From:**
- Lines 242-253: Mount useEffect calls `hydrateBlueprintState()` if server didn't provide props

**Evidence:**
- Lines 198-205: Grid hydration sets `generatedConceptImages[0]` and `savedFrameUrls` (9 items)
- Lines 199-204: Only hydrates if `!initialHasGrid` (server didn't indicate grid exists)
- Lines 246-253: Only calls if `hasNoServerState && savedEmail && !urlUpdateRef.current`

---

### Fix 2: Add feed_style to API ✅

**File:** `app/api/blueprint/get-blueprint/route.ts`  
**Lines:** 22-42 (SELECT query), 56-76 (API response)

**Change 1: Add feed_style to SELECT query**
```typescript
const subscriber = await sql`
  SELECT 
    id,
    email,
    name,
    form_data,
    strategy_generated,
    strategy_generated_at,
    strategy_data,
    grid_generated,
    grid_generated_at,
    grid_url,
    grid_frame_urls,
    selfie_image_urls,
    blueprint_completed,
    blueprint_completed_at,
    paid_blueprint_purchased,
    feed_style  // ✅ ADDED
  FROM blueprint_subscribers
  WHERE email = ${email}
  LIMIT 1
`
```

**Evidence:**
- Line 38: Added `feed_style` to SELECT query

**Change 2: Add feedStyle to API response**
```typescript
return NextResponse.json({
  success: true,
  blueprint: {
    formData: data.form_data || {},
    feedStyle: data.feed_style || null,  // ✅ ADDED
    strategy: {
      generated: data.strategy_generated || false,
      generatedAt: data.strategy_generated_at || null,
      data: data.strategy_data || null,
    },
    grid: {
      generated: data.grid_generated || false,
      generatedAt: data.grid_generated_at || null,
      gridUrl: data.grid_url || null,
      frameUrls: data.grid_frame_urls || null,
    },
    selfieImages: data.selfie_image_urls || [],
    completed: isCompleted,
    completedAt: isCompleted ? (data.blueprint_completed_at || data.grid_generated_at) : null,
    paidBlueprintPurchased: data.paid_blueprint_purchased || false,
  },
})
```

**Evidence:**
- Line 60: Added `feedStyle: data.feed_style || null` to API response

**Hydration Usage:**
- Lines 187-190: `hydrateBlueprintState()` sets `selectedFeedStyle` from `blueprint.feedStyle`

---

### Fix 3: URL Update for localStorage Users ✅

**File:** `app/blueprint/page-client.tsx`  
**Lines:** 3 (import), 38 (router init), 141-159 (URL update effect)

**Change 1: Add router import**
```typescript
import { useRouter } from "next/navigation"
```

**Change 2: Add router and ref initialization**
```typescript
const router = useRouter()
const urlUpdateRef = useRef(false) // Guard against infinite loops for URL update
```

**Change 3: Add URL update effect**
```typescript
// PR-8 Hydration Fix: URL update for localStorage-only users (must run first)
useEffect(() => {
  // Check if URL has email param, if not and localStorage has email, update URL and refresh
  // This enables server-side hydration for localStorage-only users
  if (urlUpdateRef.current) return // Guard against infinite loops
  if (typeof window === "undefined") return // SSR guard

  const urlParams = new URLSearchParams(window.location.search)
  const urlEmail = urlParams.get("email")
  const storedEmail = localStorage.getItem("blueprint-email")

  // If no email param in URL but localStorage has email, update URL
  if (!urlEmail && storedEmail && storedEmail.includes("@") && !initialEmail) {
    urlUpdateRef.current = true // Mark as updated to prevent loop
    router.replace(`/blueprint?email=${encodeURIComponent(storedEmail)}`)
    router.refresh()
    return // Exit early - refresh will re-render with server props
  }
}, []) // Run once on mount
```

**Evidence:**
- Lines 148-150: Checks if URL has email param, reads localStorage email
- Line 153: Only updates if `!urlEmail && storedEmail && !initialEmail`
- Line 154: Sets `urlUpdateRef.current = true` to prevent loops
- Line 155: Updates URL with `router.replace()` (no history entry)
- Line 156: Calls `router.refresh()` to trigger server-side hydration
- Lines 163, 246-253: Hydration checks `urlUpdateRef.current` and skips if URL was updated

**Result:**
- localStorage-only users get URL updated, which triggers server-side hydration
- Server-side hydration is preferred (more reliable than client-side)
- Client-side hydration only runs if URL update didn't happen

---

### Fix 4: UI Behavior for One-Free-Generation ✅

**File:** `components/blueprint/blueprint-concept-card.tsx`  
**Lines:** 19-20 (props), 36-37 (state), 140-168 (grid display), 200-208 (generate button)

**Already Correct - No Changes Needed**

**Evidence:**
- Lines 19-20: Component accepts `initialGridUrl` and `initialFrameUrls` props
- Lines 36-37: Initializes state from props: `const [gridUrl, setGridUrl] = useState<string | null>(initialGridUrl || null)`
- Lines 140-168: Shows grid if `gridUrl && frameUrls.length === 9` exists
- Line 200: Only shows "Generate Grid" button if `!gridUrl && !isGenerating`
- **Result:** If grid exists (from hydration), button is hidden

**Hydration Integration:**
- File: `app/blueprint/page-client.tsx` lines 1470-1471
  - Passes `initialGridUrl={generatedConceptImages[0] || undefined}` to BlueprintConceptCard
  - Passes `initialFrameUrls={savedFrameUrls.length === 9 ? savedFrameUrls : undefined}` to BlueprintConceptCard
  - If hydration works, `generatedConceptImages[0]` is set (line 200), `savedFrameUrls` has 9 items (line 202)
  - BlueprintConceptCard receives grid URL and frame URLs, displays grid, hides button

---

## EVIDENCE: GRID STATE STORAGE AND RENDERING

### Grid State Storage

**File:** `app/blueprint/page-client.tsx`

**State Variables:**
- Line 88-90: `const [generatedConceptImages, setGeneratedConceptImages] = useState<{ [key: number]: string }>(initialHasGrid ? { 0: "" } : {})`
- Line 91: `const [savedFrameUrls, setSavedFrameUrls] = useState<string[]>([])`

**Hydration Sets State:**
- Line 200: `setGeneratedConceptImages({ 0: blueprint.grid.gridUrl })` - Sets grid URL at index 0
- Line 202: `setSavedFrameUrls(blueprint.grid.frameUrls)` - Sets frame URLs (array of 9)

**Evidence:**
- Grid state is stored in React state (not localStorage)
- Hydration loads state from DB via API call
- State persists during session, lost on refresh if not hydrated

**localStorage Keys Used:**
- Line 41: `blueprint-email` (email address)
- Line 164: `blueprint-form-data` (form data JSON)
- Line 197: `blueprint-last-step` (step number string)
- **NO grid state in localStorage** - loaded from DB on mount

**Grid State Rendering:**

**File:** `app/blueprint/page-client.tsx` line 1470-1471:
```typescript
<BlueprintConceptCard
  initialGridUrl={generatedConceptImages[0] || undefined}
  initialFrameUrls={savedFrameUrls.length === 9 ? savedFrameUrls : undefined}
  // ... other props
/>
```

**File:** `components/blueprint/blueprint-concept-card.tsx`:
- Line 36: `const [gridUrl, setGridUrl] = useState<string | null>(initialGridUrl || null)` - Initializes from prop
- Line 140: `{gridUrl && frameUrls && frameUrls.length === 9 ? (` - Shows grid if exists
- Line 200: `{!gridUrl && !isGenerating && (` - Only shows "Generate Grid" button if no grid

**Evidence:**
- Grid URL: `generatedConceptImages[0]` → `initialGridUrl` prop → `gridUrl` state → displayed
- Frame URLs: `savedFrameUrls` (9 items) → `initialFrameUrls` prop → `frameUrls` state → displayed as 3x3 grid
- Generate button: Hidden if `gridUrl` exists (line 200)

---

## EVIDENCE: NO INFINITE LOOPS

### Potential Loop Scenarios

**1. URL Update → Refresh → URL Update**
- **Prevented:** `urlUpdateRef.current = true` set on first update (line 154)
- **Guard:** Effect checks `if (urlUpdateRef.current) return` (line 145)
- **Result:** URL update only happens once

**2. Hydration → setState → Re-render → Hydration**
- **Prevented:** Hydration only called in mount useEffect (line 225) with empty dependency array
- **Guard:** Checks `urlUpdateRef.current` before hydrating (line 163, 250)
- **Result:** Hydration runs once on mount, not on state changes

**3. URL Update → Refresh → Hydration → URL Update**
- **Prevented:** URL update sets `urlUpdateRef.current = true` (line 154)
- **Guard:** Hydration checks `if (urlUpdateRef.current) return` (line 163)
- **Result:** If URL was updated, hydration skipped (refresh provides server props)

**4. Hydration → setState → Re-render → Step Change → Hydration**
- **Prevented:** Hydration function uses `useCallback` with stable dependencies (line 223)
- **Guard:** Mount useEffect only runs once (empty dependency array, line 255)
- **Result:** Hydration runs once on mount, not triggered by state changes

**Confirmed: No infinite loops in implementation.**

---

## TESTING SCENARIOS

### Scenario 1: localStorage-Only User (No URL Params)
**Steps:**
1. User has `blueprint-email` in localStorage
2. User has grid generated in DB (`grid_generated = TRUE`, `grid_url` exists)
3. User navigates to `/blueprint` (no URL params)

**Expected Behavior:**
- URL updated to `/blueprint?email=...` (Fix 3)
- `router.refresh()` triggers server-side hydration
- Server queries DB, returns `initialHasGrid={true}`
- Client calls `loadSavedGrid()` (legacy path, line 238)
- Grid displayed, "Generate Grid" button hidden

**Alternative Path (if refresh doesn't complete):**
- Client-side hydration runs (Fix 1, lines 246-253)
- `hydrateBlueprintState()` calls API, sets `generatedConceptImages[0]` and `savedFrameUrls`
- Grid displayed, "Generate Grid" button hidden

**Evidence:**
- Lines 153-157: URL update happens if `!urlEmail && storedEmail && !initialEmail`
- Lines 246-253: Client-side hydration runs if URL update didn't happen
- Lines 199-205: Grid hydration sets state from API response

### Scenario 2: URL Param User (Server-Side Hydration)
**Steps:**
1. User has grid generated in DB
2. User navigates to `/blueprint?email=user@example.com`

**Expected Behavior:**
- Server queries DB by email param (page-server.tsx lines 47-65)
- Server returns `initialHasGrid={true}`, `initialFormData={...}`, etc.
- Client calls `loadSavedGrid()` (legacy path, line 238)
- Grid displayed, "Generate Grid" button hidden

**Evidence:**
- Lines 153-157: URL update skipped (email param exists)
- Line 238: Legacy `loadSavedGrid()` called if `initialHasGrid === true`
- Lines 163, 250: Client-side hydration skipped (server props exist)

### Scenario 3: New User (No localStorage, No DB)
**Steps:**
1. User navigates to `/blueprint` (no localStorage, no URL params)
2. User completes email capture
3. User generates grid

**Expected Behavior:**
- No URL update (no localStorage email, line 153)
- No client-side hydration (no savedEmail, line 163)
- User generates grid normally
- Grid state set: `setGeneratedConceptImages({ 0: gridUrl })` (from generation, not hydration)

**Evidence:**
- Line 153: URL update skipped (no storedEmail)
- Line 163: Hydration skipped (no savedEmail)
- Grid generation sets state directly (via `onImageGenerated` callback, line 1472)

### Scenario 4: Returning User with Existing Grid
**Steps:**
1. User has grid in DB (`grid_generated = TRUE`, `grid_url` exists)
2. User returns to `/blueprint?email=user@example.com` or `/blueprint` (localStorage has email)

**Expected Behavior:**
- Grid loaded from DB (via server-side or client-side hydration)
- `generatedConceptImages[0]` set to grid URL
- `savedFrameUrls` set to frame URLs (9 items)
- Grid displayed in BlueprintConceptCard (step 3.5)
- "Generate Grid" button hidden (component checks `!gridUrl`, line 200)

**Evidence:**
- Lines 199-205: Grid hydration sets `generatedConceptImages[0]` and `savedFrameUrls`
- Lines 1470-1471: Props passed to BlueprintConceptCard
- Component lines 140, 200: Grid shown, button hidden if `gridUrl` exists

---

## STATUS

**Implementation Complete:** ✅  
**All Fixes Implemented:** ✅  
**No Linter Errors:** ✅  
**Evidence Provided:** ✅

**Next Steps:**
1. Manual test all 4 scenarios
2. Verify grid display prevents re-generation
3. Verify URL update doesn't create loops
4. Verify hydration works for localStorage-only users

---

**Files Modified:**
1. `app/blueprint/page-client.tsx` (lines 3, 38, 141-159, 161-223, 225-255)
2. `app/api/blueprint/get-blueprint/route.ts` (lines 38, 60)

**Files Not Modified (already correct):**
1. `components/blueprint/blueprint-concept-card.tsx` (already handles one-free-generation)
