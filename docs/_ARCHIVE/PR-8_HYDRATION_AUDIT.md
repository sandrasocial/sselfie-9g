# PR-8 Hydration Audit: Blueprint State Loading
**Date:** 2025-01-XX  
**Status:** Audit Complete, Fixes Required

---

## EVIDENCE: CURRENT HYDRATION LOGIC

### File: `app/blueprint/page-client.tsx`

**Lines 137-154: Initialization useEffect (Server Props Only)**
```typescript
useEffect(() => {
  // Load saved strategy if exists
  if (initialHasStrategy && savedEmail) {
    loadSavedStrategy()
  }
  
  // Load saved grid if exists
  if (initialHasGrid && savedEmail) {
    loadSavedGrid()
  }
  
  // If completed, ensure we're showing upgrade view (server props win - set step to 7)
  if (initialIsCompleted && step !== 7) {
    setStep(7)
    return // Prevent localStorage restore if completed
  }
}, []) // Run once on mount
```

**Evidence:**
- Only loads if `initialHasStrategy === true` OR `initialHasGrid === true` (lines 140, 145)
- For localStorage-only users (no URL params), server returns `initialHasStrategy={false}`, `initialHasGrid={false}` (page-server.tsx lines 33-34)
- **Result:** Hydration never happens for localStorage-only users

**Lines 234-249: loadSavedStrategy() Function**
```typescript
const loadSavedStrategy = async () => {
  if (!savedEmail || hasStrategy) return
  
  try {
    const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.blueprint?.strategy?.generated && data.blueprint?.strategy?.data) {
        setConcepts([data.blueprint.strategy.data])
        setHasStrategy(true)
      }
    }
  } catch (error) {
    console.error("[Blueprint] Error loading strategy:", error)
  }
}
```

**Evidence:**
- Only called if `initialHasStrategy === true` (line 140)
- If called, loads strategy data and sets `hasStrategy` (line 243)
- **Missing:** Never called for localStorage-only users

**Lines 252-271: loadSavedGrid() Function**
```typescript
const loadSavedGrid = async () => {
  if (!savedEmail || hasGrid) return
  
  try {
    const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.blueprint?.grid?.generated && data.blueprint?.grid?.gridUrl) {
        setGeneratedConceptImages({ 0: data.blueprint.grid.gridUrl })
        if (data.blueprint.grid.frameUrls && Array.isArray(data.blueprint.grid.frameUrls) && data.blueprint.grid.frameUrls.length === 9) {
          setSavedFrameUrls(data.blueprint.grid.frameUrls)
        }
        setHasGrid(true)
        setIsCompleted(true)
      }
    }
  } catch (error) {
    console.error("[Blueprint] Error loading grid:", error)
  }
}
```

**Evidence:**
- Only called if `initialHasGrid === true` (line 145)
- If called, loads `gridUrl` and `frameUrls` correctly (lines 260-262)
- Sets `hasGrid` and `isCompleted` (lines 264-265)
- **Missing:** Never called for localStorage-only users

---

## EVIDENCE: API RESPONSE COMPLETENESS

### File: `app/api/blueprint/get-blueprint/route.ts`

**Lines 22-42: Database Query**
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
    paid_blueprint_purchased
  FROM blueprint_subscribers
  WHERE email = ${email}
  LIMIT 1
`
```

**Evidence:**
- **MISSING:** `feed_style` column NOT selected (line 22-42)
- Database has `feed_style` column (schema: `scripts/create-blueprint-subscribers-table.sql` line 15)
- Component needs `feed_style` (page-client.tsx line 82: `selectedFeedStyle`)

**Lines 56-76: API Response**
```typescript
return NextResponse.json({
  success: true,
  blueprint: {
    formData: data.form_data || {},
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
- Returns: `formData`, `strategy`, `grid`, `selfieImages`, `completed`, `completedAt`, `paidBlueprintPurchased`
- **MISSING:** `feedStyle` NOT in response (needed by component)

---

## EVIDENCE: URL UPDATE LOGIC

### File: `app/blueprint/page-client.tsx`

**Grep Results:**
- No `useRouter` import found
- No `router.replace` or `router.push` calls found
- No URL update logic for localStorage-only users

**Evidence:**
- **MISSING:** No logic to update URL when localStorage has email but URL doesn't
- If URL has `?email=...`, server-side hydration works (page-server.tsx lines 47-65)
- If URL has no email param, server returns new user props, hydration never happens

---

## EVIDENCE: ONE-FREE-GENERATION UI BEHAVIOR

### File: `components/blueprint/blueprint-concept-card.tsx`

**Lines 36-37: Initial State**
```typescript
const [gridUrl, setGridUrl] = useState<string | null>(initialGridUrl || null)
const [frameUrls, setFrameUrls] = useState<string[]>(initialFrameUrls || [])
```

**Evidence:**
- Accepts `initialGridUrl` and `initialFrameUrls` as props (lines 19-20)
- Initializes state from props (lines 36-37)
- **Correct:** If props exist, grid is shown immediately

**Lines 140-168: Grid Display**
```typescript
{gridUrl && frameUrls && frameUrls.length === 9 ? (
  <button onClick={() => setIsModalOpen(true)}>
    {/* 3x3 Grid Preview */}
    <div className="grid grid-cols-3 gap-0.5 w-full h-full">
      {frameUrls.map((url, i) => (
        <img key={i} src={url} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
      ))}
    </div>
  </button>
) : (
  <div>Preview will appear here</div>
)}
```

**Evidence:**
- Shows grid if `gridUrl` exists AND `frameUrls.length === 9` (line 140)
- **Correct:** Existing grid is displayed if state is set

**Lines 200-208: Generate Button**
```typescript
{!gridUrl && !isGenerating && (
  <button onClick={handleGenerate} disabled={isGenerating}>
    Generate Grid
  </button>
)}
```

**Evidence:**
- Only shows "Generate Grid" button if `!gridUrl` (line 200)
- **Correct:** Prevents re-generation if grid exists
- **Issue:** If `gridUrl` is not hydrated from DB, button shows even if grid exists in DB

**Lines 1369-1370: Props Passed to BlueprintConceptCard**
```typescript
<BlueprintConceptCard
  initialGridUrl={generatedConceptImages[0] || undefined}
  initialFrameUrls={savedFrameUrls.length === 9 ? savedFrameUrls : undefined}
  // ... other props
/>
```

**Evidence:**
- Passes `initialGridUrl` from `generatedConceptImages[0]` (line 1369)
- Passes `initialFrameUrls` from `savedFrameUrls` (line 1370)
- **Issue:** If hydration never happens, these are empty, button shows even if grid exists in DB

---

## EVIDENCE: LOCALSTORAGE KEYS USED

### File: `app/blueprint/page-client.tsx`

**localStorage Keys Found:**
1. `blueprint-email` (lines 41, 295, 528)
2. `blueprint-name` (lines 59, 529)
3. `blueprint-access-token` (line 531)
4. `blueprint-form-data` (lines 164, 276)
5. `blueprint-last-step` (lines 197, 225)

**Evidence:**
- **NO code clears these keys** - they persist indefinitely
- Keys are written but never explicitly cleared
- User can clear localStorage manually, but code never clears them

**Grid State Storage:**
- `generatedConceptImages` (state, line 88-90) - NOT persisted to localStorage
- `savedFrameUrls` (state, line 91) - NOT persisted to localStorage
- **Issue:** Grid state is only in memory, lost on refresh if not hydrated from DB

---

## EVIDENCE: SERVER PROPS VS LOCALSTORAGE

### File: `app/blueprint/page-server.tsx`

**Lines 26-41: No URL Params (localStorage-only user)**
```typescript
if (!emailParam && !tokenParam) {
  return (
    <BrandBlueprintPageClient
      initialEmail={null}
      initialAccessToken={null}
      initialResumeStep={0}
      initialHasStrategy={false}  // ❌ Always false
      initialHasGrid={false}      // ❌ Always false
      initialIsCompleted={false}
      initialIsPaid={false}
      initialFormData={null}
      initialSelectedFeedStyle={null}
      initialSelfieImages={null}
    />
  )
}
```

**Evidence:**
- If no URL params, server returns `initialHasStrategy={false}`, `initialHasGrid={false}`
- Client never calls `loadSavedStrategy()` or `loadSavedGrid()` (lines 140, 145 require true)
- **Result:** Grid never loaded from DB for localStorage-only users

**Lines 47-65: URL Has Email Param (server-side hydration)**
```typescript
if (emailParam) {
  const subscriber = await sql`
    SELECT 
      email, access_token, form_data, strategy_generated, grid_generated, ...
      feed_style, ...
    FROM blueprint_subscribers
    WHERE email = ${emailParam}
    LIMIT 1
  `
  // ... calculates hasStrategy, hasGrid, isCompleted, resumeStep
  // ... returns client with initialHasStrategy={hasStrategy}, initialHasGrid={hasGrid}
}
```

**Evidence:**
- If URL has email param, server queries DB and returns correct props
- Client calls `loadSavedStrategy()` and `loadSavedGrid()` if props are true
- **Result:** Grid loaded correctly for URL param users
- **But:** `feed_style` is queried (line 65) but API doesn't return it

---

## ISSUES FOUND

### Issue 1: Hydration Never Happens for localStorage-Only Users
**Severity:** BLOCKER  
**Location:** `app/blueprint/page-client.tsx` lines 138-154

**Problem:**
- Hydration only happens if `initialHasStrategy === true` OR `initialHasGrid === true`
- For localStorage-only users, server returns `false` for both
- Result: Grid never loaded from DB, user sees "Generate Grid" button even if grid exists

**Fix Required:**
- Call hydration API regardless of server props if `savedEmail` exists
- Unified `hydrateBlueprintState()` function that loads all state from DB

### Issue 2: API Missing feed_style
**Severity:** HIGH  
**Location:** `app/api/blueprint/get-blueprint/route.ts` lines 22-42, 56-76

**Problem:**
- API query doesn't select `feed_style` column
- API response doesn't include `feedStyle`
- Component needs `feed_style` to display selected feed style

**Fix Required:**
- Add `feed_style` to SELECT query (line 22-42)
- Add `feedStyle` to API response (line 56-76)

### Issue 3: No URL Update for localStorage-Only Users
**Severity:** HIGH  
**Location:** `app/blueprint/page-client.tsx` (missing)

**Problem:**
- No logic to update URL when localStorage has email but URL doesn't
- Server-side hydration requires email param in URL
- localStorage-only users never get server-side hydration

**Fix Required:**
- Check if URL has email param, if not and localStorage has email, update URL and refresh
- Use `router.replace()` to update URL without adding to history
- Guard with ref to prevent infinite loops

### Issue 4: Grid State Not Persisted to localStorage
**Severity:** MEDIUM  
**Location:** `app/blueprint/page-client.tsx` (missing)

**Problem:**
- `generatedConceptImages` and `savedFrameUrls` not persisted to localStorage
- Grid state lost on refresh if not hydrated from DB
- Not critical if hydration works, but adds resilience

**Fix Required:**
- Optional: Persist grid state to localStorage when set
- Or: Ensure hydration always works (fixes Issue 1)

---

## RECOMMENDED FIXES

### Fix 1: Unified Hydration Function
**File:** `app/blueprint/page-client.tsx`

**Add:**
- Single `hydrateBlueprintState()` function that:
  - Calls `/api/blueprint/get-blueprint?email=...`
  - Sets all state: `formData`, `feedStyle`, `strategy`, `grid`, `completed`
  - Only called if `savedEmail` exists AND server didn't provide props

### Fix 2: Add feed_style to API
**File:** `app/api/blueprint/get-blueprint/route.ts`

**Change:**
- Add `feed_style` to SELECT query (line 38)
- Add `feedStyle` to API response (line 75)

### Fix 3: URL Update for localStorage Users
**File:** `app/blueprint/page-client.tsx`

**Add:**
- `useRouter()` import from `next/navigation`
- `useRef()` to guard against infinite loops
- useEffect that checks: if `!initialEmail && storedEmail && URL has no email param`, do `router.replace(/blueprint?email=${storedEmail})` and `router.refresh()`

### Fix 4: UI Behavior for One-Free-Generation
**File:** `app/blueprint/page-client.tsx` (already handled by BlueprintConceptCard)

**Note:**
- `BlueprintConceptCard` already prevents re-generation if `gridUrl` exists (line 200)
- Just need to ensure `gridUrl` is hydrated correctly (Fix 1 covers this)

---

## STATUS

**Audit Complete:** ✅  
**Issues Identified:** 4 (1 blocker, 2 high, 1 medium)  
**Fixes Required:** 3 (Fix 4 already handled by component)

**Implementation Complete:** ✅  
**All Fixes Implemented:** ✅

### Fix 1: Unified Hydration Function ✅
**File:** `app/blueprint/page-client.tsx` lines 161-223
- Added `hydrateBlueprintState()` function that calls `/api/blueprint/get-blueprint?email=...`
- Hydrates: `formData`, `feedStyle`, `strategy`, `grid`, `selfieImages`, `completed`
- Only hydrates if server didn't provide props (localStorage-only users)

### Fix 2: Add feed_style to API ✅
**File:** `app/api/blueprint/get-blueprint/route.ts`
- Added `feed_style` to SELECT query (line 38)
- Added `feedStyle` to API response (line 60)

### Fix 3: URL Update for localStorage Users ✅
**File:** `app/blueprint/page-client.tsx` lines 141-159
- Added `useRouter()` import from `next/navigation`
- Added `urlUpdateRef` to guard against infinite loops
- Checks: if `!urlEmail && storedEmail && !initialEmail`, updates URL with `router.replace()` and `router.refresh()`
- This enables server-side hydration for localStorage-only users

### Fix 4: UI Behavior for One-Free-Generation ✅
**File:** `components/blueprint/blueprint-concept-card.tsx` (already correct)
- Component accepts `initialGridUrl` and `initialFrameUrls` (lines 19-20)
- Shows grid if `gridUrl` exists (line 140)
- Only shows "Generate Grid" button if `!gridUrl` (line 200)
- After hydration sets `generatedConceptImages[0]` and `savedFrameUrls`, grid is shown and button hidden

**Verification:**
- Hydration sets `generatedConceptImages[0]` (line 200)
- Hydration sets `savedFrameUrls` (line 202)
- These are passed to `BlueprintConceptCard` (lines 1470-1471)
- Component prevents re-generation if grid exists (line 200)

**Next Steps:**
1. Test hydration with localStorage-only user (no URL params)
2. Test hydration with URL param user (server props win)
3. Test URL update for localStorage-only user
4. Verify grid display prevents re-generation
