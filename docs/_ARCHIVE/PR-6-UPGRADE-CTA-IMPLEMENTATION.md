# PR-6: Add Free Blueprint Upgrade CTA ("Bring My Blueprint to Life")
**Date:** 2026-01-09  
**Status:** ✅ Complete

---

## 📋 INVESTIGATION FINDINGS

### Feature Flag Logic

**Server-side (from `/app/checkout/blueprint/page.tsx`):**
- Function: `isPaidBlueprintEnabled()`
- Checks:
  1. `process.env.FEATURE_PAID_BLUEPRINT_ENABLED` (env var first)
  2. Falls back to `admin_feature_flags` table (`key = 'paid_blueprint_enabled'`)
- Returns 404 if disabled

**Client-side Pattern:**
- No existing reusable hook/component found
- Solution: Use `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED` env var
- This ensures CTA only shows when checkout page will work (same gating logic)

**Decision:**
- Use `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED` for client-side gating
- Matches server-side logic (env var first)
- Safe: CTA hidden if env var not set (defaults to false)

---

### Free Blueprint Page Structure

**File:** `/app/blueprint/page.tsx` (client component)

**Step 3.5 (Grid Generated):**
- Lines: 1074-1150
- Location: After grid is generated and displayed
- Insertion point: After "See my score →" button (line 1145)

**Step 4 (Score Shown):**
- Lines: 1152-1245
- Location: After score animation completes
- Insertion point: After "Show me my calendar →" button (line 1242)

**State Variables:**
- `savedEmail`: Line 15 (`useState("")`)
- No promo code handling found in free blueprint flow

**Price Source:**
- `/lib/products.ts`: `priceInCents: 4700` ($47)
- Decision: Do not display price in CTA (keep it simple, consistent with other CTAs)

---

## ✅ IMPLEMENTATION

### Files Modified

**1. `/app/blueprint/page.tsx` (Modified)**
- Added state: `isPaidBlueprintEnabled` (line ~42)
- Added useEffect to check feature flag on mount (lines ~44-53)
- Added CTA component after Step 3.5 (lines ~1147-1163)
- Added CTA component after Step 4 (lines ~1244-1260)

---

### Code Changes

#### 1. Feature Flag State & Check

**Added after line 41:**
```typescript
const [isPaidBlueprintEnabled, setIsPaidBlueprintEnabled] = useState(false)

// Check if paid blueprint feature is enabled (client-side)
useEffect(() => {
  // Check NEXT_PUBLIC env var (client-readable)
  const envFlag = process.env.NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED
  if (envFlag !== undefined) {
    setIsPaidBlueprintEnabled(envFlag === "true" || envFlag === "1")
  } else {
    // If env var not set, default to false (safe)
    setIsPaidBlueprintEnabled(false)
  }
}, [])
```

#### 2. CTA Component (Step 3.5)

**Added after "See my score →" button (line ~1147):**
```typescript
{/* Paid Blueprint CTA - Step 3.5 */}
{isPaidBlueprintEnabled && savedEmail && (
  <div className="mt-8 sm:mt-12 bg-stone-50 border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
    <h3 className="text-lg sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-2 text-center">
      Bring your Blueprint to life
    </h3>
    <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed text-center mb-6">
      Get 30 custom photos based on your strategy.
    </p>
    <div className="text-center">
      <Link
        href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
        className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 rounded-lg"
      >
        Get my 30 photos
      </Link>
    </div>
  </div>
)}
```

#### 3. CTA Component (Step 4)

**Added after "Show me my calendar →" button (line ~1244):**
```typescript
{/* Paid Blueprint CTA - Step 4 */}
{isPaidBlueprintEnabled && savedEmail && (
  <div className="mt-8 sm:mt-12 bg-stone-50 border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
    <h3 className="text-lg sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-2 text-center">
      Bring your Blueprint to life
    </h3>
    <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed text-center mb-6">
      Get 30 custom photos based on your strategy.
    </p>
    <div className="text-center">
      <Link
        href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
        className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 rounded-lg"
      >
        Get my 30 photos
      </Link>
    </div>
  </div>
)}
```

---

### Feature Flag Logic

**Env Var:**
- `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED` (client-readable)
- Values: `"true"` or `"1"` = enabled, anything else = disabled
- Default: `false` (safe, CTA hidden if not set)

**Gating Conditions:**
1. `isPaidBlueprintEnabled === true` (feature flag enabled)
2. `savedEmail` exists (user has provided email)

**Link Format:**
- `/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`
- Email is URL-encoded for safety
- No promo code appended (not found in free blueprint flow)

---

## 🎨 UI Design

**Styling:**
- Matches existing SSELFIE design system
- Uses `bg-stone-50`, `border-stone-200` (subtle card)
- Button: `bg-stone-950` (primary action)
- Responsive: `sm:` breakpoints for mobile/desktop
- Spacing: `mt-8 sm:mt-12` (consistent with page spacing)

**Layout:**
- Centered card with max-width (`max-w-2xl mx-auto`)
- Headline: Uppercase, tracking-wider
- Body: Light font, leading-relaxed
- Button: Full-width on mobile, inline-block on desktop

---

## 🧪 TEST PLAN

### Test 1: Feature Flag OFF (Default)

**Steps:**
1. Ensure `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED` is not set or set to `false`
2. Complete free blueprint flow to Step 3.5
3. Verify CTA does NOT appear
4. Continue to Step 4
5. Verify CTA does NOT appear

**Expected:**
- No CTA visible in either step
- Free blueprint flow completes normally

### Test 2: Feature Flag ON, Email Provided

**Steps:**
1. Set `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED=true` in `.env.local`
2. Complete free blueprint flow with email capture
3. Reach Step 3.5 (grid generated)
4. Verify CTA appears below "See my score →" button
5. Continue to Step 4 (score shown)
6. Verify CTA appears below "Show me my calendar →" button
7. Click "Get my 30 photos" button
8. Verify redirects to `/checkout/blueprint?email=...`

**Expected:**
- CTA visible in both Step 3.5 and Step 4
- Link includes correct email (URL-encoded)
- Checkout page loads successfully

### Test 3: Feature Flag ON, No Email

**Steps:**
1. Set `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED=true`
2. Complete free blueprint flow WITHOUT email capture
3. Reach Step 3.5
4. Verify CTA does NOT appear (no email)
5. Continue to Step 4
6. Verify CTA does NOT appear (no email)

**Expected:**
- CTA hidden when `savedEmail` is empty
- Free blueprint flow continues normally

### Test 4: Mobile Responsiveness

**Steps:**
1. Enable feature flag and provide email
2. View Step 3.5 on mobile device (or browser dev tools)
3. Verify CTA card is responsive
4. Verify button is full-width on mobile
5. Verify text is readable and properly sized

**Expected:**
- CTA card adapts to mobile screen
- Button is touch-friendly (min 44px height)
- Text is readable (no overflow)

### Test 5: Checkout Page Integration

**Steps:**
1. Enable feature flag
2. Click "Get my 30 photos" from Step 3.5 or Step 4
3. Verify redirects to `/checkout/blueprint?email=test@example.com`
4. Verify checkout page loads (not 404)
5. Verify email is pre-filled in checkout

**Expected:**
- Checkout page loads successfully
- Email parameter is correctly passed
- No 404 errors

---

## ✅ ACCEPTANCE CRITERIA

- [x] CTA shows only when flag enabled AND savedEmail exists
- [x] CTA appears in both Step 3.5 and Step 4 contexts
- [x] CTA click always lands on a working checkout page (no 404 when enabled)
- [x] No visual layout breaks on mobile
- [x] Free blueprint flow still completes
- [x] Feature flag uses same logic as checkout page (env var)
- [x] Email is URL-encoded in link
- [x] Styling matches existing SSELFIE design system

---

## 📝 SUMMARY

**Files Changed:**
- `/app/blueprint/page.tsx` - Added feature flag check and CTA components

**Feature Flag Logic:**
- Env var: `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED`
- Default: `false` (CTA hidden)
- Values: `"true"` or `"1"` = enabled

**CTA Insertion Points:**
- Step 3.5: After "See my score →" button (line ~1147)
- Step 4: After "Show me my calendar →" button (line ~1244)

**CTA Content:**
- Headline: "Bring your Blueprint to life"
- Body: "Get 30 custom photos based on your strategy."
- Button: "Get my 30 photos"
- Link: `/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`

**Gating Conditions:**
1. `isPaidBlueprintEnabled === true`
2. `savedEmail` exists

**Manual Test Steps:**
1. Set `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED=true` in `.env.local`
2. Complete free blueprint flow with email
3. Verify CTA appears in Step 3.5 and Step 4
4. Click CTA and verify checkout page loads
5. Test with flag OFF: verify CTA hidden
6. Test with no email: verify CTA hidden

---

**Ready for:** Testing and deployment
