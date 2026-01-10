# PR-8 Verification Audit (Evidence-First)
**Before Merge/Deploy Verification**

**Date:** 2025-01-XX  
**Status:** Verification Only (No Changes Unless Blocker Found)

---

## 1) CHANGESET INVENTORY

### Files Modified in PR-8

**1. `app/blueprint/page-client.tsx`**
- **Lines 37-49:** Added `loadEmailFromStorage()` function to read email from localStorage
- **Lines 53-63:** Modified email initialization to load from localStorage if not in server props
- **Lines 204-224:** Added useEffect to sync email between URL params and localStorage
- **Lines 442-469:** Modified `handleEmailSuccess()` to save email/name/token to localStorage and proceed to step 1 after capture
- **Lines 471-478:** Added safety check in `generateConcepts()` to force email capture if missing
- **Lines 735-751:** Modified step 0 "Start your blueprint" button to require email before proceeding
- **Evidence:**
  ```typescript
  // Line 37-49: localStorage email loading
  const loadEmailFromStorage = (): string => {
    if (initialEmail) return initialEmail
    try {
      const storedEmail = localStorage.getItem("blueprint-email")
      if (storedEmail && typeof storedEmail === "string" && storedEmail.includes("@")) {
        return storedEmail
      }
    } catch (error) {
      console.error("[Blueprint] Error reading localStorage:", error)
    }
    return ""
  }
  
  // Line 55: Email capture shown if no email
  const [showEmailCapture, setShowEmailCapture] = useState(!storedEmail && !initialEmail && initialResumeStep === 0)
  
  // Line 448-457: Save to localStorage on email capture
  try {
    localStorage.setItem("blueprint-email", email)
    localStorage.setItem("blueprint-name", name)
    if (accessToken) {
      localStorage.setItem("blueprint-access-token", accessToken)
    }
  } catch (error) {
    console.error("[Blueprint] Error saving to localStorage:", error)
  }
  
  // Line 460-462: Proceed to step 1 after email capture
  if (step === 0) {
    setStep(1)
  }
  
  // Line 737-741: Require email before proceeding
  if (!savedEmail) {
    setShowEmailCapture(true)
    return
  }
  ```

**2. `components/blueprint/blueprint-email-capture.tsx`**
- **Lines 103-111:** Added localStorage persistence after successful email capture
- **Evidence:**
  ```typescript
  // Line 103-111: Save to localStorage after API success
  try {
    localStorage.setItem("blueprint-email", email)
    localStorage.setItem("blueprint-name", name)
    localStorage.setItem("blueprint-access-token", data.accessToken || "")
  } catch (storageError) {
    console.error("[v0] Error saving to localStorage:", storageError)
    // Continue even if localStorage fails (graceful degradation)
  }
  ```

**3. `app/blueprint/page-server.tsx`**
- **Lines 114-126:** Modified completion detection to use canonical definition (strategy_generated && grid_generated)
- **Lines 128-152:** Improved resume step detection with edge case handling
- **Evidence:**
  ```typescript
  // Line 114-118: Canonical completion definition
  const hasStrategy = subscriber.strategy_generated === true
  const hasGrid = subscriber.grid_generated === true && subscriber.grid_url
  const isCompleted = hasStrategy && hasGrid
  
  // Line 124-126: Log mismatch if DB flag differs from canonical
  if (isCompleted !== dbMarkedCompleted) {
    console.warn(`[Blueprint Server] Completion mismatch for ${subscriber.email}: canonical=${isCompleted}, db_flag=${dbMarkedCompleted}`)
  }
  
  // Line 130-152: Resume step logic
  if (isCompleted) {
    resumeStep = 7
  } else if (hasGrid && !hasStrategy) {
    resumeStep = 3.5
  } else if (hasStrategy && !hasGrid) {
    resumeStep = 3.5
  } else if (subscriber.form_data && Object.keys(subscriber.form_data).length > 0) {
    if (subscriber.feed_style) {
      resumeStep = 3.5
    } else {
      resumeStep = 3
    }
  } else {
    resumeStep = 1
  }
  ```

**4. `app/api/blueprint/check-grid/route.ts`**
- **Lines 115-154:** Modified completion marking to only set `blueprint_completed = TRUE` if strategy also exists
- **Evidence:**
  ```typescript
  // Line 118-126: Check if strategy exists first
  const strategyCheck = await sql`
    SELECT strategy_generated
    FROM blueprint_subscribers
    WHERE email = ${email}
    LIMIT 1
  `
  const hasStrategy = strategyCheck.length > 0 && strategyCheck[0].strategy_generated === true
  
  // Line 129-142: Only mark completed if both exist
  if (hasStrategy) {
    await sql`
      UPDATE blueprint_subscribers
      SET grid_generated = TRUE,
          blueprint_completed = TRUE,
          blueprint_completed_at = NOW()
      WHERE email = ${email}
    `
  } else {
    // Line 144-153: Grid only, don't mark completed
    await sql`
      UPDATE blueprint_subscribers
      SET grid_generated = TRUE
      WHERE email = ${email}
    `
  }
  ```

**5. `app/api/blueprint/get-blueprint/route.ts`**
- **Lines 21-38:** Added `blueprint_completed` and `paid_blueprint_purchased` to SELECT query
- **Lines 53-74:** Calculate canonical completion and include in response
- **Evidence:**
  ```typescript
  // Line 36-38: Added completion fields to query
  blueprint_completed,
  blueprint_completed_at,
  paid_blueprint_purchased
  
  // Line 53-54: Calculate canonical completion
  const isCompleted = (data.strategy_generated === true) && (data.grid_generated === true && data.grid_url)
  
  // Line 72-74: Include in response
  completed: isCompleted,
  completedAt: isCompleted ? (data.blueprint_completed_at || data.grid_generated_at) : null,
  paidBlueprintPurchased: data.paid_blueprint_purchased || false,
  ```

---

## 2) FUNNEL VERIFICATION (5 Scenarios)

### Scenario A: New User Flow
**Steps:**
1. Navigate to `/blueprint` (no URL params)
2. Click "Start your blueprint" button on landing page

**Expected Behavior:**
- Email capture modal appears (cannot proceed without email)
- After email capture, proceed to step 1 (questions)

**Actual Behavior from Code:**
- **File:** `app/blueprint/page-server.tsx` lines 26-41
  - No email/token params → returns client component with `initialEmail={null}`, `initialResumeStep={0}`
- **File:** `app/blueprint/page-client.tsx` lines 53-55
  - `loadEmailFromStorage()` returns empty string (no localStorage initially)
  - `showEmailCapture` state: `!storedEmail && !initialEmail && initialResumeStep === 0` = `true`
- **File:** `app/blueprint/page-client.tsx` lines 604-606
  - Early return if `showEmailCapture === true`: renders `<BlueprintEmailCapture />`
- **File:** `app/blueprint/page-client.tsx` lines 735-751
  - Button click checks `if (!savedEmail)` → `setShowEmailCapture(true)` → returns (prevents proceeding)
- **File:** `components/blueprint/blueprint-email-capture.tsx` lines 75-113
  - On submit, calls `/api/blueprint/subscribe` (line 75)
  - On success, saves to localStorage (lines 104-111) and calls `onSuccess(email, name, data.accessToken)`
- **File:** `app/blueprint/page-client.tsx` lines 442-462
  - `handleEmailSuccess()` sets email, saves to localStorage, hides capture modal, sets `step = 1`

**Evidence Summary:**
- Email capture required before questions: CONFIRMED (lines 604-606 early return, line 738 check)
- Cannot skip email capture: CONFIRMED (button disabled/returns if no email)
- Proceeds to step 1 after capture: CONFIRMED (line 461-462)

**Risks/Edge Cases:**
- If localStorage fails, email is still saved via API, but resume via localStorage won't work
- If API fails, user sees error but cannot proceed (by design)

---

### Scenario B: Returning Partial User (localStorage Resume)
**Steps:**
1. User completes email capture + answers some questions (step 1-2)
2. Form data saved to localStorage (`blueprint-form-data`)
3. User closes browser/navigates away
4. User returns to `/blueprint` (no URL params)

**Expected Behavior:**
- Email loaded from localStorage
- Form data loaded from localStorage
- Resume at correct step (step 1 or 2)

**Actual Behavior from Code:**
- **File:** `app/blueprint/page-server.tsx` lines 26-41
  - No email/token params → returns client with `initialEmail={null}`, `initialResumeStep={0}`
- **File:** `app/blueprint/page-client.tsx` lines 37-49
  - `loadEmailFromStorage()` reads `localStorage.getItem("blueprint-email")` → returns stored email
- **File:** `app/blueprint/page-client.tsx` lines 53-56
  - `storedEmail` = email from localStorage
  - `showEmailCapture` = `!storedEmail && !initialEmail && initialResumeStep === 0` = `false` (email exists)
  - `savedEmail` state = `initialEmail || storedEmail` = stored email
- **File:** `app/blueprint/page-client.tsx` lines 66-79
  - `formData` initialized from `initialFormData` (null) or default empty object
  - **ISSUE FOUND:** Form data is NOT loaded from localStorage on mount
- **File:** `app/blueprint/page-client.tsx` lines 195-202
  - Form data is SAVED to localStorage when it changes (via useEffect)
  - But not LOADED on initial mount

**Evidence Summary (After Issue 2 Hotfix):**
- Email resume from localStorage: CONFIRMED (lines 37-49, 53-56)
- Form data resume: FIXED - loads from localStorage on mount if no server props (lines 155-175)
- Resume at correct step: FIXED - restores step from localStorage if no server resume step (lines 179-217)

**Actual Behavior from Code (After Issue 2 Hotfix):**
- **File:** `app/blueprint/page-server.tsx` lines 26-41
  - No email/token params → returns client with `initialEmail={null}`, `initialResumeStep={0}`, `initialFormData={null}`
- **File:** `app/blueprint/page-client.tsx` lines 37-49
  - `loadEmailFromStorage()` reads `localStorage.getItem("blueprint-email")` → returns stored email
- **File:** `app/blueprint/page-client.tsx` lines 53-56
  - `storedEmail` = email from localStorage
  - `showEmailCapture` = `!storedEmail && !initialEmail && initialResumeStep === 0` = `false` (email exists)
  - `savedEmail` state = `initialEmail || storedEmail` = stored email
- **File:** `app/blueprint/page-client.tsx` lines 66-79
  - `formData` initialized from `initialFormData` (null) or default empty object
- **File:** `app/blueprint/page-client.tsx` lines 155-175 (HOTFIX Issue 1)
  - New useEffect runs on mount
  - Checks: `hasServerFormData = initialFormData && typeof initialFormData === "object" && Object.keys(initialFormData).length > 0`
  - Since `initialFormData` is null, `hasServerFormData = false`
  - Reads `localStorage.getItem("blueprint-form-data")` → returns stored JSON string
  - Parses JSON: `JSON.parse(storedFormData)` → returns parsed object
  - Validates: `parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0`
  - If valid: `setFormData(parsed)` → form data restored
- **File:** `app/blueprint/page-client.tsx` lines 179-217 (HOTFIX Issue 2)
  - New useEffect runs on mount (after completion check)
  - Checks: `shouldRestoreStep = initialResumeStep === 0 && !initialIsCompleted && savedEmail && savedEmail.length > 0 && !showEmailCapture`
  - Since `initialResumeStep = 0`, `initialIsCompleted = false`, `savedEmail` exists, `showEmailCapture = false` → `shouldRestoreStep = true`
  - Reads `localStorage.getItem("blueprint-last-step")` → returns stored step string (e.g., "2")
  - Parses: `parseFloat(storedStep)` → returns number (e.g., 2)
  - Validates: `Number.isFinite(2) && 2 >= 1 && [1,2,3,3.5,4,5,6,7].includes(2)` = `true`
  - If valid: `setStep(2)` → step restored
- **File:** `app/blueprint/page-client.tsx` lines 219-231 (HOTFIX Issue 2)
  - useEffect runs whenever `step` or `savedEmail` changes
  - If `step > 0 && savedEmail && savedEmail.length > 0` → saves step to localStorage: `localStorage.setItem("blueprint-last-step", step.toString())`

**Evidence Summary:**
- Email resume from localStorage: CONFIRMED (lines 37-49, 53-56)
- Form data resume: FIXED - loads from localStorage on mount (lines 155-175)
- Resume at correct step: FIXED - restores step from localStorage if no server resume step (lines 179-217)

**Risks/Edge Cases (After Issue 2 Hotfix):**
- Form data loading: FIXED - now loads from localStorage if no server props
- Step preservation: FIXED - now restores step from localStorage if no server resume step
- Server-side resume logic: Works with URL params or DB state (by design), localStorage only used as fallback when server has no resume step

---

### Scenario C: Returning User with DB Progress (URL Params)
**Steps:**
1. User has completed email capture + some questions
2. Data exists in DB: `form_data` populated, `strategy_generated` may be true/false
3. User returns to `/blueprint?email=user@example.com`

**Expected Behavior:**
- Server queries DB for subscriber by email
- Resumes at correct step based on DB state (form_data → step 1-3, strategy → step 3.5, etc.)

**Actual Behavior from Code:**
- **File:** `app/blueprint/page-server.tsx` lines 47-65
  - Email param exists → queries DB: `SELECT email, access_token, form_data, strategy_generated, grid_generated, ... WHERE email = ${emailParam}`
- **File:** `app/blueprint/page-server.tsx` lines 91-106
  - If subscriber not found → returns client with `initialEmail={emailParam}`, `initialResumeStep={0}` (new user flow)
- **File:** `app/blueprint/page-server.tsx` lines 128-152
  - Resume step logic:
    - If `isCompleted` (strategy + grid) → `resumeStep = 7`
    - Else if `hasGrid && !hasStrategy` → `resumeStep = 3.5`
    - Else if `hasStrategy && !hasGrid` → `resumeStep = 3.5`
    - Else if `form_data` exists and has keys → check `feed_style`: if exists → `resumeStep = 3.5`, else → `resumeStep = 3`
    - Else → `resumeStep = 1`
- **File:** `app/blueprint/page-server.tsx` lines 154-158
  - Form data parsed: `formData = subscriber.form_data` if object with keys
- **File:** `app/blueprint/page-server.tsx` lines 166-178
  - Client component receives: `initialEmail={subscriber.email}`, `initialFormData={formData}`, `initialResumeStep={resumeStep}`, etc.

**Evidence Summary:**
- Server-side resume detection: CONFIRMED (lines 47-65, 128-152)
- Form data restoration: CONFIRMED (lines 154-158)
- Resume step calculation: CONFIRMED (lines 128-152)
- Client receives server props: CONFIRMED (lines 166-178)

**Risks/Edge Cases:**
- Edge case: If form_data exists but is empty object `{}`, resume step logic at line 140 checks `Object.keys(subscriber.form_data).length > 0` - correct
- Edge case: If feed_style exists but form_data is empty, resumes at step 3 (feed style selection) - may be incorrect if strategy already generated

---

### Scenario D: Completed Free Blueprint
**Steps:**
1. User has completed free blueprint: `strategy_generated = TRUE`, `grid_generated = TRUE`
2. User returns to `/blueprint?email=user@example.com`

**Expected Behavior:**
- Shows completed/results view (step 7)
- Shows upgrade CTA (not restart)

**Actual Behavior from Code:**
- **File:** `app/blueprint/page-server.tsx` lines 114-118
  - `hasStrategy = subscriber.strategy_generated === true` = `true`
  - `hasGrid = subscriber.grid_generated === true && subscriber.grid_url` = `true` (assumes grid_url exists)
  - `isCompleted = hasStrategy && hasGrid` = `true`
- **File:** `app/blueprint/page-server.tsx` lines 130-132
  - `if (isCompleted)` → `resumeStep = 7`
- **File:** `app/blueprint/page-server.tsx` lines 166-178
  - Client receives: `initialIsCompleted={true}`, `initialResumeStep={7}`
- **File:** `app/blueprint/page-client.tsx` lines 149-152
  - useEffect checks: `if (initialIsCompleted && step !== 7)` → `setStep(7)`
  - This ensures step 7 even if initialResumeStep is wrong
- **File:** `app/blueprint/page-client.tsx` lines 52
  - `step` state initialized with `initialResumeStep` = `7`

**Evidence Summary:**
- Completed detection: CONFIRMED (lines 114-118 use canonical definition)
- Resume at step 7: CONFIRMED (line 132, line 52, line 151)
- Does not restart: CONFIRMED (step 7 is upgrade/results view, not step 0)

**Risks/Edge Cases:**
- If `grid_generated = TRUE` but `grid_url` is NULL, `hasGrid` = `false` (line 116) → not marked as completed
- This is correct behavior (grid exists but not yet processed/uploaded)

---

### Scenario E: Paid Blueprint Purchaser Redirect
**Steps:**
1. User has purchased paid blueprint: `paid_blueprint_purchased = TRUE` in DB
2. User navigates to `/blueprint?email=purchaser@example.com`

**Expected Behavior:**
- Server-side redirect to `/blueprint/paid?access=TOKEN`
- Redirect happens before client component renders

**Actual Behavior from Code:**
- **File:** `app/blueprint/page-server.tsx` lines 109-112
  - Checks: `if (subscriber.paid_blueprint_purchased && subscriber.access_token)`
  - Calls: `redirect(\`/blueprint/paid?access=${subscriber.access_token}\`)`
  - This is server-side redirect (Next.js `redirect()` function) - happens before component render
- **File:** `app/blueprint/page-server.tsx` lines 47-85
  - Subscriber query includes: `paid_blueprint_purchased`, `paid_blueprint_photo_urls`, `access_token`
  - Query executes BEFORE redirect check (line 109)

**Evidence Summary:**
- Paid purchaser detection: CONFIRMED (line 110 checks `paid_blueprint_purchased && access_token`)
- Server-side redirect: CONFIRMED (line 111 uses Next.js `redirect()` - server-side)
- Redirect destination: CONFIRMED (`/blueprint/paid?access=${subscriber.access_token}`)

**Risks/Edge Cases:**
- If `paid_blueprint_purchased = TRUE` but `access_token` is NULL, redirect does NOT happen (line 110 condition fails)
- This could leave paid users in free blueprint flow - may need handling

---

## 3) EMAIL CAPTURE PROOF

### Email Required Before Questions

**Evidence:**
- **File:** `app/blueprint/page-client.tsx` lines 604-606
  ```typescript
  if (showEmailCapture) {
    return <BlueprintEmailCapture onSuccess={handleEmailSuccess} formData={formData} currentStep={step} />
  }
  ```
  - Early return renders email capture component, preventing question steps from rendering

- **File:** `app/blueprint/page-client.tsx` lines 53-55
  ```typescript
  const storedEmail = loadEmailFromStorage()
  const [showEmailCapture, setShowEmailCapture] = useState(!storedEmail && !initialEmail && initialResumeStep === 0)
  ```
  - `showEmailCapture` is `true` if no email from localStorage OR server props

- **File:** `app/blueprint/page-client.tsx` lines 735-751
  ```typescript
  onClick={() => {
    if (!savedEmail) {
      setShowEmailCapture(true)
      return  // Prevents proceeding
    }
    setStep(1)
  }}
  ```
  - Button click handler checks `savedEmail` before proceeding

**State Transition:**
- Step 0 → Email capture modal (if no email)
- Email capture success → Step 1 (questions)
- No mid-flow email gate: Questions (step 1-2) only accessible if email exists (early return prevents rendering)

### Email/Name/Token Persistence

**localStorage Keys:**
- `blueprint-email` (line 41, 105, 219, 450)
- `blueprint-name` (line 59, 106, 451)
- `blueprint-access-token` (line 107, 453)

**Write Locations:**
1. **File:** `components/blueprint/blueprint-email-capture.tsx` lines 104-111
   - After successful API call to `/api/blueprint/subscribe`
   - Saves: email, name, accessToken

2. **File:** `app/blueprint/page-client.tsx` lines 448-457
   - In `handleEmailSuccess()` callback
   - Saves: email, name, accessToken (duplicate write, same values)

3. **File:** `app/blueprint/page-client.tsx` lines 217-219
   - In useEffect that syncs email with URL
   - Only saves email if localStorage differs from state

**Read Locations:**
1. **File:** `app/blueprint/page-client.tsx` lines 37-49
   - `loadEmailFromStorage()` function reads `localStorage.getItem("blueprint-email")`
   - Called during component initialization (line 54)

2. **File:** `app/blueprint/page-client.tsx` lines 57-63
   - `savedName` state initialized from `localStorage.getItem("blueprint-name")`

**API Call to Ensure/Create Subscriber:**

- **File:** `components/blueprint/blueprint-email-capture.tsx` lines 75-90
  ```typescript
  const response = await fetch("/api/blueprint/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      name,
      formData,
      step: currentStep,
      source: "brand-blueprint",
      utm_source: new URLSearchParams(window.location.search).get("utm_source"),
      utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
      utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
      referrer: document.referrer,
      user_agent: navigator.userAgent,
    }),
  })
  ```

- **File:** `app/api/blueprint/subscribe/route.ts` lines 26-61
  - Checks if email exists: `SELECT id, access_token FROM blueprint_subscribers WHERE email = ${email}`
  - If exists: Updates form_data (if provided), returns existing `access_token`
  - If not exists: Creates new subscriber (lines 67-100)

- **File:** `app/api/blueprint/subscribe/route.ts` lines 69-100
  ```sql
  INSERT INTO blueprint_subscribers (
    email, name, source, access_token, ...
  )
  VALUES (
    ${email}, ${name}, ${source || "brand-blueprint"}, ${accessToken}, ...
  )
  RETURNING id, access_token
  ```
  - Creates subscriber record with generated `access_token`

---

## 4) RESUME LOGIC PROOF

### Server-Side Resume Step Computation

**File:** `app/blueprint/page-server.tsx` lines 114-152

**Completion Detection:**
```typescript
// Line 114-118: Canonical definition
const hasStrategy = subscriber.strategy_generated === true
const hasGrid = subscriber.grid_generated === true && subscriber.grid_url
const isCompleted = hasStrategy && hasGrid
```

**Resume Step Logic:**
```typescript
// Line 129-152: Step determination
let resumeStep = 0
if (isCompleted) {
  resumeStep = 7  // Completed view
} else if (hasGrid && !hasStrategy) {
  resumeStep = 3.5  // Edge case: grid without strategy
} else if (hasStrategy && !hasGrid) {
  resumeStep = 3.5  // Strategy exists, needs grid
} else if (subscriber.form_data && Object.keys(subscriber.form_data).length > 0) {
  if (subscriber.feed_style) {
    resumeStep = 3.5  // Has form data + feed style (ready for grid)
  } else {
    resumeStep = 3  // Has form data, needs feed style selection
  }
} else {
  resumeStep = 1  // Has email but no form data (start questions)
}
```

**Evidence:**
- Step computed server-side based on DB state
- Passed to client via props: `initialResumeStep={resumeStep}` (line 170)

### Client Reconciliation (URL vs localStorage vs Server Props)

**Priority Order:**
1. Server props (`initialEmail`, `initialResumeStep`) - highest priority
2. localStorage (`blueprint-email`) - fallback if no server props
3. URL params - synced but not used for initialization

**File:** `app/blueprint/page-client.tsx` lines 37-56

**Email Initialization:**
```typescript
// Line 37-49: Load from localStorage
const loadEmailFromStorage = (): string => {
  if (initialEmail) return initialEmail  // Server props first
  try {
    const storedEmail = localStorage.getItem("blueprint-email")  // localStorage second
    if (storedEmail && typeof storedEmail === "string" && storedEmail.includes("@")) {
      return storedEmail
    }
  } catch (error) {
    console.error("[Blueprint] Error reading localStorage:", error)
  }
  return ""
}

// Line 54-56: Initialize state
const storedEmail = loadEmailFromStorage()
const [showEmailCapture, setShowEmailCapture] = useState(!storedEmail && !initialEmail && initialResumeStep === 0)
const [savedEmail, setSavedEmail] = useState(initialEmail || storedEmail)
```

**Step Initialization:**
```typescript
// Line 52: Use server props
const [step, setStep] = useState(initialResumeStep)
```

**URL Sync (One-Way: State → URL):**
```typescript
// Line 204-224: Update URL with email (does not read from URL)
useEffect(() => {
  if (savedEmail) {
    const url = new URL(window.location.href)
    if (!url.searchParams.has("email") && !url.searchParams.has("token")) {
      url.searchParams.set("email", savedEmail)
      window.history.replaceState({}, "", url.toString())
    }
  }
}, [savedEmail, initialEmail])
```

**Evidence:**
- Client does NOT read email from URL params directly (only from server props or localStorage)
- URL is updated when email is captured (line 211), but URL params are only used server-side
- This prevents infinite loops (URL update does not trigger re-render that reads URL)

### No Infinite Loop Analysis

**Potential Loop Scenarios:**

1. **URL Update → Re-render → URL Read → URL Update**
   - **Prevented:** Client does not read email from URL (only server does)
   - **Evidence:** `loadEmailFromStorage()` only checks `initialEmail` (server prop) and localStorage, not URL

2. **localStorage Write → Re-render → localStorage Read → localStorage Write**
   - **Prevented:** localStorage write in `handleEmailSuccess()` happens once per email capture
   - **Evidence:** `savedEmail` state check prevents re-triggering (line 738 checks `if (!savedEmail)`)

3. **Server Fetch → State Update → URL Update → Server Fetch**
   - **Prevented:** Server-side resume only happens on page load (server component)
   - **Evidence:** Client-side `loadSavedStrategy()` (lines 134-150) only runs if `initialHasStrategy && savedEmail`, does not trigger URL update

**Confirmed: No infinite loops in current implementation.**

### Behavior When localStorage Empty but URL Has Email

**Scenario:** User has `/blueprint?email=user@example.com` but localStorage is cleared

**Actual Behavior:**
- **File:** `app/blueprint/page-server.tsx` lines 47-65
  - Server reads email from URL param: `emailParam = params?.email`
  - Queries DB: `SELECT ... WHERE email = ${emailParam}`
  - Returns subscriber data (if exists) or new user props (if not)
- **File:** `app/blueprint/page-client.tsx` lines 37-49
  - `loadEmailFromStorage()` returns empty string (localStorage empty)
  - But `initialEmail` prop = email from server (if subscriber found)
  - `savedEmail` = `initialEmail || storedEmail` = `initialEmail` (server prop wins)
- **Result:** Email from URL → Server query → Server props → Client uses server props
- **localStorage restored:** Line 217-219 syncs email to localStorage after server props load

**Evidence:** Works correctly - server props take priority over localStorage

### Behavior When localStorage Has Email but URL Empty

**Scenario:** User has email in localStorage but navigates to `/blueprint` (no params)

**Actual Behavior:**
- **File:** `app/blueprint/page-server.tsx` lines 26-41
  - No email/token params → returns client with `initialEmail={null}`, `initialResumeStep={0}`
- **File:** `app/blueprint/page-client.tsx` lines 37-49
  - `loadEmailFromStorage()` reads localStorage → returns stored email
  - `savedEmail` = `initialEmail || storedEmail` = stored email (localStorage wins)
- **File:** `app/blueprint/page-client.tsx` lines 204-224
  - useEffect updates URL with email: `url.searchParams.set("email", savedEmail)`
- **File:** `app/blueprint/page-client.tsx` lines 52
  - `step` = `initialResumeStep` = `0` (server returned 0 because no URL params)
- **Result:** Email from localStorage → URL updated → But resume step is 0 (not preserved)

**Issue Found:**
- Resume step not preserved when using localStorage-only resume
- User must manually navigate through steps even though email/form data exists

---

## 5) COMPLETION TRACKING PROOF

### Canonical Completion Definition

**Definition:** `completion = strategy_generated === true AND grid_generated === true AND grid_url IS NOT NULL`

**Applied Locations:**

**1. Server-Side (page-server.tsx):**
```typescript
// Line 114-118
const hasStrategy = subscriber.strategy_generated === true
const hasGrid = subscriber.grid_generated === true && subscriber.grid_url
const isCompleted = hasStrategy && hasGrid
```

**2. API Response (get-blueprint/route.ts):**
```typescript
// Line 53-54
const isCompleted = (data.strategy_generated === true) && (data.grid_generated === true && data.grid_url)
```

**3. Grid Completion (check-grid/route.ts):**
```typescript
// Line 119-126: Check strategy first
const strategyCheck = await sql`
  SELECT strategy_generated
  FROM blueprint_subscribers
  WHERE email = ${email}
  LIMIT 1
`
const hasStrategy = strategyCheck.length > 0 && strategyCheck[0].strategy_generated === true

// Line 129-142: Only mark completed if both exist
if (hasStrategy) {
  await sql`
    UPDATE blueprint_subscribers
    SET blueprint_completed = TRUE,
        blueprint_completed_at = NOW()
    WHERE email = ${email}
  `
} else {
  // Line 144-153: Don't mark completed if strategy missing
  await sql`
    UPDATE blueprint_subscribers
    SET grid_generated = TRUE
    -- Note: blueprint_completed NOT set
    WHERE email = ${email}
  `
}
```

**Evidence:** Canonical definition applied consistently in all three locations

### blueprint_completed Only Set When Both Flags True

**Primary Path (check-grid/route.ts):**
- **Line 129-142:** Only sets `blueprint_completed = TRUE` if `hasStrategy === true` (verified by query)
- **Line 144-153:** Sets `grid_generated = TRUE` but does NOT set `blueprint_completed` if strategy missing

**Secondary Path (track-engagement/route.ts):**
- **Line 17-25:** Has `blueprint_completed` event type that sets flag unconditionally
- **Issue:** This endpoint can set `blueprint_completed = TRUE` without checking strategy/grid flags
- **Severity:** Low - endpoint is only called manually (not automatically), and server-side resume logic uses canonical definition anyway

**Strategy Generation (generate-concepts/route.ts):**
- **Line 373-378:** Only sets `strategy_generated = TRUE`, does NOT set `blueprint_completed`
- **Correct:** Completion only set when grid completes (check-grid route)

**Evidence Summary:**
- Primary path (grid completion): CORRECTLY checks both flags
- Strategy generation: CORRECTLY does not set completion
- Engagement tracking: CAN set completion without checks (manual endpoint, low risk)

### Endpoint Consistency

**1. GET /api/blueprint/get-blueprint**
- **Line 53-54:** Calculates canonical completion: `(strategy_generated === true) && (grid_generated === true && grid_url)`
- **Line 72:** Returns `completed: isCompleted` (calculated value, not DB flag)

**2. Server Component (page-server.tsx)**
- **Line 114-118:** Calculates canonical completion: `hasStrategy && hasGrid`
- **Line 118:** Uses calculated value: `const isCompleted = hasStrategy && hasGrid`
- **Line 124-126:** Logs warning if DB flag differs from canonical (does not use DB flag for logic)

**3. POST /api/blueprint/check-grid**
- **Line 129-142:** Sets `blueprint_completed = TRUE` only if strategy exists (canonical check)

**Evidence:** All endpoints use canonical definition, not DB flag. DB flag is set but not trusted for logic (server logs mismatch but uses canonical).

---

## 6) DEPLOYMENT/ROLLBACK NOTES

### Migration Requirements

**None required.**

**Evidence:**
- No new database columns added
- Uses existing columns: `strategy_generated`, `grid_generated`, `grid_url`, `blueprint_completed`, `paid_blueprint_purchased`
- No schema changes

### Environment Variable Dependencies

**None introduced.**

**Evidence:**
- All existing env vars used (DATABASE_URL, RESEND_API_KEY, etc.)
- No new env vars required for PR-8 changes
- Feature flag check (`FEATURE_PAID_BLUEPRINT_ENABLED`) already existed

### Rollback Steps

**If issues occur:**

1. **Revert commit:** `git revert <commit-hash>`
2. **Deploy:** Push revert commit

**Behavior that regresses:**
- Email capture no longer required upfront (can skip to questions)
- Email not saved to localStorage (resume via localStorage broken)
- Completion tracking uses DB flag directly (no canonical check)
- Resume step always 0 for localStorage-only users (already broken)

**Rollback Safety:**
- Low risk - changes are additive (localStorage saves), not destructive
- Existing DB records unaffected
- Guest flow unchanged (still works without localStorage)

---

## BLOCKER-LEVEL ISSUES FOUND

### Issue 1: Form Data Not Loaded from localStorage on Mount

**Severity:** HIGH (user loses progress on refresh)

**Location:** `app/blueprint/page-client.tsx`

**Evidence:**
- **Line 66-79:** Form data initialized from `initialFormData` (server prop) or empty object
- **Line 195-202:** Form data SAVED to localStorage when it changes
- **Missing:** No useEffect to LOAD form data from localStorage on mount

**Impact:**
- User fills form (step 1-2), closes browser
- Returns to `/blueprint` (no URL params)
- Email loads from localStorage (works)
- Form data is EMPTY (should be loaded from localStorage)
- User must re-enter all form data

**Fix Required:**
```typescript
// Add to useEffect on mount (line 137-153)
useEffect(() => {
  // Load form data from localStorage if not in server props
  if (!initialFormData) {
    try {
      const storedFormData = localStorage.getItem("blueprint-form-data")
      if (storedFormData) {
        const parsed = JSON.parse(storedFormData)
        if (parsed && typeof parsed === "object") {
          setFormData(parsed)
        }
      }
    } catch (error) {
      console.error("[Blueprint] Error loading form data from localStorage:", error)
    }
  }
}, []) // Run once on mount
```

### Issue 2: Resume Step Not Preserved for localStorage-Only Users

**Severity:** MEDIUM (user must manually navigate, but data exists)

**Location:** `app/blueprint/page-server.tsx` + `app/blueprint/page-client.tsx`

**Evidence:**
- **Line 26-41 (page-server.tsx):** No URL params → returns `initialResumeStep={0}`
- **Line 52 (page-client.tsx):** Step initialized from server prop: `useState(initialResumeStep)` = `0`
- **Missing:** No localStorage read for step, no URL update to trigger server-side resume

**Impact:**
- User has email + form data in localStorage
- Returns to `/blueprint` (no URL params)
- Server returns `initialResumeStep={0}` (landing page)
- Client initializes `step = 0` (landing page)
- User must click "Start your blueprint" again, then navigate through steps manually

**Fix Options:**
1. Save step to localStorage and restore on mount
2. Update URL with email param on mount (triggers server-side resume)
3. Client-side step calculation based on form data state

**Recommended Fix:**
```typescript
// In page-client.tsx, add after email is loaded from localStorage:
useEffect(() => {
  if (savedEmail && !initialEmail) {
    // Update URL to trigger server-side resume
    const url = new URL(window.location.href)
    url.searchParams.set("email", savedEmail)
    window.history.replaceState({}, "", url.toString())
    // Reload page to get server-side props (or use router.push for client-side navigation)
    window.location.href = url.toString()
  }
}, [savedEmail, initialEmail])
```

### Issue 3: Paid Blueprint Redirect Requires access_token

**Severity:** LOW (edge case, may not occur)

**Location:** `app/blueprint/page-server.tsx` line 110

**Evidence:**
```typescript
if (subscriber.paid_blueprint_purchased && subscriber.access_token) {
  redirect(`/blueprint/paid?access=${subscriber.access_token}`)
}
```

**Issue:** If `paid_blueprint_purchased = TRUE` but `access_token` is NULL, redirect does not happen

**Impact:** Paid user stuck in free blueprint flow (low likelihood, but possible if token was deleted/corrupted)

**Fix:** Consider redirect even without token, or handle paid status differently

---

## RECOMMENDATION

**BLOCKER FOUND:** Form data not loaded from localStorage on mount

**Action Required:**
1. Fix Issue 1 (form data loading) before merge
2. Consider Fix Issue 2 (resume step preservation) for better UX
3. Issue 3 can be deferred (edge case)

**Fix Implementation:**
- Minimal change: Add useEffect to load form data from localStorage
- File: `app/blueprint/page-client.tsx`
- Lines: Add after line 153 (in existing useEffect or new one)

**Status:** NOT READY FOR MERGE (blocker found)

---

## RESOLUTION

### Blocker Fixed: Form Data Loading from localStorage

**Date:** 2025-01-XX  
**Fix Location:** `app/blueprint/page-client.tsx` lines 155-175

**Change:**
Added useEffect hook that loads form data from localStorage on mount, only if server did not provide initialFormData.

**Code Added:**
```typescript
// PR-8 Hotfix: Load form data from localStorage if not provided by server
useEffect(() => {
  // Only load from localStorage if server did not provide form data
  // Check if initialFormData is null, undefined, or empty object
  const hasServerFormData = initialFormData && typeof initialFormData === "object" && Object.keys(initialFormData).length > 0
  
  if (!hasServerFormData) {
    try {
      const storedFormData = localStorage.getItem("blueprint-form-data")
      if (storedFormData) {
        const parsed = JSON.parse(storedFormData)
        // Validate: must be plain object with keys
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          setFormData(parsed)
        }
      }
    } catch (error) {
      console.error("[Blueprint] Error loading form data from localStorage:", error)
      // Continue execution - form data remains in default empty state
    }
  }
}, []) // Run once on mount
```

**Verification:**
- Scenario A (new user): localStorage.getItem returns null, hasServerFormData is false, but storedFormData is null, so setFormData not called - formData remains empty object (correct)
- Scenario C (server props): hasServerFormData is true (initialFormData has keys), localStorage not loaded - server props win (correct)
- Scenario B (returning partial user): hasServerFormData is false (no server props), localStorage has data, parsed and validated, setFormData called - form data restored (fixed)

**Status:** BLOCKER RESOLVED - Ready for merge after Scenario B verification

---

## RESOLUTION - Issue 2: Step Persistence

**Date:** 2025-01-XX  
**Fix Location:** `app/blueprint/page-client.tsx` lines 179-231

**Change:**
Added step persistence to localStorage with restoration on mount, only if server did not provide resume step.

**Code Added:**

**1. Step Persistence (lines 219-231):**
```typescript
// PR-8 Hotfix Issue 2: Persist step to localStorage whenever it changes
useEffect(() => {
  // Only persist if step is valid (not 0) and email exists (user has progressed past landing)
  // Do not persist step 0 (landing page) as it's the default state
  if (step > 0 && savedEmail && savedEmail.length > 0) {
    try {
      localStorage.setItem("blueprint-last-step", step.toString())
    } catch (error) {
      console.error("[Blueprint] Error saving step to localStorage:", error)
      // Continue execution - step still works, just not persisted
    }
  }
}, [step, savedEmail])
```

**2. Step Restoration (lines 179-217):**
```typescript
// PR-8 Hotfix Issue 2: Restore step from localStorage on mount (only if server did not provide resume step)
// This runs after completion check useEffect above (order matters - server props must win)
useEffect(() => {
  // Server props MUST win: Only restore if server provided initialResumeStep === 0
  // Guard conditions ensure server props always take precedence:
  // 1. initialResumeStep === 0: Server did not provide resume step (if > 0, server wins)
  // 2. !initialIsCompleted: Not completed (if true, server sets step to 7 via first useEffect)
  // 3. savedEmail exists: Email captured (user has progressed past landing)
  // 4. !showEmailCapture: Not showing email capture modal (email capture already completed)
  const shouldRestoreStep = 
    initialResumeStep === 0 && // Server did not provide resume step (server props win if > 0)
    !initialIsCompleted && // Not completed (completion check useEffect sets step to 7 if true)
    savedEmail && // Email exists (user has progressed past landing)
    savedEmail.length > 0 && // Email is not empty string
    !showEmailCapture // Not showing email capture modal (user has completed email capture)

  if (shouldRestoreStep) {
    try {
      const storedStep = localStorage.getItem("blueprint-last-step")
      if (storedStep) {
        const parsedStep = parseFloat(storedStep)
        // Validate: must be finite number, >= 1 (never restore to 0), and within allowed values
        // Allowed steps: 1, 2, 3, 3.5, 4, 5, 6, 7 (from existing implementation)
        // Step 0 = landing page (never restore to this - user must go through email capture)
        const allowedSteps = [1, 2, 3, 3.5, 4, 5, 6, 7]
        if (
          Number.isFinite(parsedStep) &&
          parsedStep >= 1 &&
          allowedSteps.includes(parsedStep)
        ) {
          setStep(parsedStep)
        }
      }
    } catch (error) {
      console.error("[Blueprint] Error loading step from localStorage:", error)
      // Continue execution - step remains at initialResumeStep (0)
    }
  }
}, []) // Run once on mount
```

**Server Props Win - Guard Conditions:**
1. **initialResumeStep === 0:** If server provides resume step (> 0), localStorage restore is skipped (server wins)
2. **!initialIsCompleted:** If server marks completed (initialIsCompleted = true), completion check useEffect sets step to 7, restore is skipped (server wins)
3. **savedEmail exists:** If no email captured, cannot restore (email capture required first)
4. **!showEmailCapture:** If showing email capture modal, cannot restore (email capture required first)

**Allowed Step Values:**
- Determined from existing implementation: `[1, 2, 3, 3.5, 4, 5, 6, 7]`
- Step 0 excluded (never restored - landing page requires email capture)

**Verification:**
- Scenario A (new user): initialResumeStep = 0, savedEmail = "", showEmailCapture = true → shouldRestoreStep = false → no restore, stays at step 0 (correct)
- Scenario B (returning partial user): initialResumeStep = 0, savedEmail exists, showEmailCapture = false, localStorage has step → shouldRestoreStep = true → restores step from localStorage (fixed)
- Scenario C (URL param user): initialResumeStep = 3 (server calculated), savedEmail exists → shouldRestoreStep = false (initialResumeStep !== 0) → uses server resume step (correct)
- Scenario D (completed user): initialResumeStep = 7 (server calculated), initialIsCompleted = true → shouldRestoreStep = false (!initialIsCompleted fails) → uses server step 7 (correct)

**Status:** ISSUE 2 RESOLVED - Step persistence implemented, server props always win
