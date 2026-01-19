# PERSONAL BRAND UPDATE FIX - ROOT CAUSE ANALYSIS

## Problem Statement

When users select feed style, visual aesthetic, and fashion style in the feed style picker, the personal brand update fails with an empty error object `{}`. The data is not being saved or synced properly with the onboarding wizard.

## Root Cause Analysis

### Issue 1: Undefined Values in Request Body

**Problem:**
- `FeedStyleModalData` has optional fields: `visualAesthetic?: string[]` and `fashionStyle?: string[]`
- When users don't select these (or they're empty arrays), they're sent as `undefined` in the JSON body
- `JSON.stringify()` omits `undefined` properties, so the API receives incomplete data
- The API's `prepareJsonbValue()` function returns `null` for undefined values
- The SQL UPDATE query then tries to set fields to `null`, which may fail or cause data loss

**Location:**
- `components/feed-planner/feed-header.tsx` lines 95-98, 267-270 (before fix)

**Example of problematic request:**
```json
{
  "settingsPreference": ["minimal"],
  // visualAesthetic and fashionStyle are missing entirely
}
```

### Issue 2: INSERT Case Not Handling JSONB Properly

**Problem:**
- When creating a new personal brand (INSERT), the code was using:
  - `body.visualAesthetic || ""` → Empty string instead of null
  - `body.settingsPreference || ""` → Empty string instead of null
  - `body.fashionStyle || ""` → Empty string instead of null
- Empty strings are invalid for JSONB columns and can cause database errors

**Location:**
- `app/api/profile/personal-brand/route.ts` lines 333-335 (before fix)

### Issue 3: Inconsistent JSONB Handling

**Problem:**
- UPDATE case uses `prepareJsonbValue()` helper function
- INSERT case was using raw values with `|| ""` fallback
- This inconsistency could cause data corruption or errors

## Solution Implemented

### Fix 1: Client-Side - Only Send Fields with Values

**File:** `components/feed-planner/feed-header.tsx`

**Change:**
- Build payload object explicitly
- Only include `visualAesthetic` and `fashionStyle` if they're arrays with length > 0
- This ensures undefined/empty values are never sent to the API

**Before:**
```typescript
body: JSON.stringify({
  settingsPreference: updatedSettingsPreference,
  visualAesthetic: data.visualAesthetic,  // Could be undefined
  fashionStyle: data.fashionStyle,  // Could be undefined
})
```

**After:**
```typescript
const updatePayload: Record<string, any> = {
  settingsPreference: updatedSettingsPreference,
}

if (data.visualAesthetic && Array.isArray(data.visualAesthetic) && data.visualAesthetic.length > 0) {
  updatePayload.visualAesthetic = data.visualAesthetic
}

if (data.fashionStyle && Array.isArray(data.fashionStyle) && data.fashionStyle.length > 0) {
  updatePayload.fashionStyle = data.fashionStyle
}

body: JSON.stringify(updatePayload)
```

### Fix 2: Server-Side - Consistent JSONB Handling in INSERT

**File:** `app/api/profile/personal-brand/route.ts`

**Change:**
- Use the same `prepareJsonbValue()` helper function for INSERT as UPDATE
- Ensure JSONB fields are properly stringified or set to null (not empty strings)

**Before:**
```typescript
${body.visualAesthetic || ""},  // Empty string - WRONG
${body.settingsPreference || ""},  // Empty string - WRONG
${body.fashionStyle || ""},  // Empty string - WRONG
```

**After:**
```typescript
const visualAestheticJson = prepareJsonbValue(body.visualAesthetic, true)
const fashionStyleJson = prepareJsonbValue(body.fashionStyle, true)
const settingsPreferenceJson = prepareJsonbValue(body.settingsPreference)

${visualAestheticJson !== null && visualAestheticJson !== undefined ? JSON.stringify(visualAestheticJson) : null}::jsonb,
${settingsPreferenceJson !== null && settingsPreferenceJson !== undefined ? JSON.stringify(settingsPreferenceJson) : null}::jsonb,
${fashionStyleJson !== null && fashionStyleJson !== undefined ? JSON.stringify(fashionStyleJson) : null}::jsonb,
```

## Data Flow (Fixed)

```
User selects feed style in FeedStyleModal
  ↓
FeedStyleModalData = {
  feedStyle: "minimal",
  visualAesthetic: ["minimal", "warm"],  // Optional - may be undefined
  fashionStyle: ["casual", "athletic"]   // Optional - may be undefined
}
  ↓
handleFeedStyleConfirm() / handleFullFeedStyleConfirm()
  ↓
Build updatePayload (only include fields with values)
  ↓
POST /api/profile/personal-brand
  Body: {
    settingsPreference: ["minimal"],
    visualAesthetic: ["minimal", "warm"],  // Only if provided
    fashionStyle: ["casual", "athletic"]   // Only if provided
  }
  ↓
API: prepareJsonbValue() processes arrays
  ↓
SQL UPDATE/INSERT with proper JSONB handling
  ↓
✅ Data saved successfully
```

## Testing Checklist

After fix, verify:

1. ✅ User selects feed style only → `settingsPreference` saved, other fields unchanged
2. ✅ User selects feed style + visual aesthetic → Both saved correctly
3. ✅ User selects feed style + visual aesthetic + fashion style → All saved correctly
4. ✅ User with no existing personal brand → New record created with proper JSONB values
5. ✅ User with existing personal brand → Fields updated correctly, others preserved
6. ✅ Empty arrays not sent → No undefined/null errors
7. ✅ Console logs show proper payload structure
8. ✅ No empty `{}` error objects in console

## Expected Behavior After Fix

**Scenario 1: User selects feed style only**
- Request: `{ settingsPreference: ["minimal"] }`
- Result: `settings_preference` updated, `visual_aesthetic` and `fashion_style` unchanged

**Scenario 2: User selects feed style + visual aesthetic**
- Request: `{ settingsPreference: ["minimal"], visualAesthetic: ["minimal", "warm"] }`
- Result: Both fields updated correctly

**Scenario 3: User selects all three**
- Request: `{ settingsPreference: ["minimal"], visualAesthetic: ["minimal"], fashionStyle: ["casual"] }`
- Result: All three fields updated correctly

**Scenario 4: New user (no personal brand)**
- Request: `{ settingsPreference: ["minimal"], visualAesthetic: ["minimal"] }`
- Result: New personal brand record created with proper JSONB arrays (not empty strings)

## Files Modified

1. `components/feed-planner/feed-header.tsx`
   - `handlePreviewFeedStyleConfirm()` - Fixed payload building
   - `handleFullFeedStyleConfirm()` - Fixed payload building

2. `app/api/profile/personal-brand/route.ts`
   - INSERT case - Fixed JSONB field handling to use `prepareJsonbValue()`

## Why This Fixes The Issue

1. **No more undefined values:** Client only sends fields that have actual values
2. **Consistent JSONB handling:** INSERT and UPDATE use the same logic
3. **Proper null handling:** Missing fields are set to `null` (not empty strings), which PostgreSQL JSONB handles correctly
4. **Better error messages:** Enhanced error logging will show actual error details instead of empty objects

The root cause was a mismatch between what the client sent (undefined values) and what the API expected (proper JSONB arrays or null). By ensuring only valid values are sent and handling them consistently, the update should now succeed.
