# Wizard Image Save Analysis

## Problem Statement
Free users completing the Feed Planner wizard: Steps 1-2 save correctly, but Steps 3-4 (particularly images) do not save/persist correctly. Images are not queried and linked the same way as Pro Mode photo generation in Maya chat.

## Key Findings

### 1. **Image Upload Flow Inconsistencies**

#### Wizard Image Upload (Steps 3-4):
- **Component**: `BlueprintSelfieUpload` 
- **API Endpoint**: `/api/blueprint/upload-selfies`
- **Storage**: 
  - Saves to `user_avatar_images` table ✅ (for Pro Mode)
  - Also saves to `blueprint_subscribers.selfie_image_urls` (JSONB, backward compatibility) ⚠️
- **Frontend State**: Updates `formData.selfieImages` in `BlueprintOnboardingWizard`
- **Save Trigger**: Wizard completion calls `/api/onboarding/blueprint-onboarding-complete`

#### Maya Chat Pro Mode Image Upload:
- **Component**: Likely uses profile image upload or avatar upload system
- **Storage**: Saves to `user_avatar_images` table directly ✅
- **Query**: Directly queries `user_avatar_images` table
- **Usage**: Images are immediately available for Pro Mode generation

### 2. **Critical Issues Identified**

#### Issue #1: Frontend Query Endpoint Missing/Incorrect
**Location**: `components/feed-planner/feed-single-placeholder.tsx:35-42`
```typescript
const { data: avatarImages } = useSWR<{ images: Array<{ image_url: string }> }>(
  "/api/images?type=avatar",  // ❌ This endpoint doesn't handle 'type' parameter
  fetcher,
  ...
)
```

**Problem**: The `/api/images` route (`app/api/images/route.ts`) does NOT handle a `type` parameter. It only calls `getUserImages()` which queries `ai_images` and `generated_images` tables, NOT `user_avatar_images`.

**Impact**: Frontend cannot query uploaded avatar images, so placeholder shows "Upload a selfie" even after images are uploaded.

#### Issue #2: Data Flow Mismatch
**Wizard Flow**:
1. User uploads images → `/api/blueprint/upload-selfies` → saves to `user_avatar_images` ✅
2. Wizard completes → `/api/onboarding/blueprint-onboarding-complete` → reads from `user_avatar_images` → saves to `blueprint_subscribers.selfie_image_urls` ⚠️
3. Frontend queries → `/api/images?type=avatar` → **FAILS** (endpoint doesn't exist/handle type) ❌

**Maya Chat Flow**:
1. User uploads images → direct save to `user_avatar_images` ✅
2. Pro Mode generation → queries `user_avatar_images` directly ✅

#### Issue #3: Step 3-4 Data Persistence
**Steps 1-2** (form fields):
- Save to `user_personal_brand` table (business, dreamClient, vibe) ✅
- Save to `blueprint_subscribers.form_data` (JSONB) ✅
- Persist correctly ✅

**Steps 3-4** (extension data + images):
- Step 3: Extension data (feedStyle, etc.) → saves to `blueprint_subscribers.form_data` and columns ✅
- Step 4: Images → saves to `user_avatar_images` ✅ BUT:
  - Frontend cannot query them (missing endpoint)
  - localStorage persistence for images may be incomplete
  - Wizard completion endpoint checks for images but frontend doesn't reflect this

#### Issue #4: localStorage Persistence Gap
**Location**: `components/onboarding/blueprint-onboarding-wizard.tsx`
- Steps 1-2: Text fields persist in localStorage ✅
- Steps 3-4: Images stored as URLs in localStorage ⚠️
- Problem: If images are uploaded but wizard is not completed, images exist in DB but not in localStorage state

### 3. **Database Schema Analysis**

#### `user_avatar_images` Table:
- Columns: `id`, `user_id`, `image_url`, `image_type`, `is_active`, `display_order`, `uploaded_at`
- Used by: Pro Mode image generation (both wizard and Maya chat)
- Status: ✅ Correct schema, images save successfully

#### `blueprint_subscribers.selfie_image_urls`:
- Type: JSONB
- Purpose: Backward compatibility
- Status: ⚠️ Redundant, but kept for compatibility

### 4. **Root Causes**

1. **Missing API Endpoint**: No `/api/images?type=avatar` endpoint to query `user_avatar_images`
2. **Frontend Query Mismatch**: Frontend tries to query non-existent endpoint
3. **State Sync Issue**: Images save to DB but frontend state doesn't reflect this
4. **Incomplete Persistence**: localStorage may not sync with DB state properly

### 5. **Recommended Solutions**

#### Solution 1: Add Type Parameter Support to `/api/images`
**File**: `app/api/images/route.ts`
- Add `type` query parameter handling
- If `type=avatar`, query `user_avatar_images` instead of `ai_images`/`generated_images`
- Return format: `{ images: Array<{ image_url: string }> }`

#### Solution 2: Create Dedicated Avatar Images Endpoint
**File**: `app/api/images/avatar/route.ts` (new)
- Dedicated endpoint for avatar images
- Queries `user_avatar_images` table directly
- Returns same format as expected by frontend

#### Solution 3: Sync Frontend State with DB
- After image upload, immediately query DB to verify
- Update localStorage with DB state
- On wizard load, check DB first, then localStorage

#### Solution 4: Simplify Data Flow
- Remove dual storage (only use `user_avatar_images`)
- Remove `blueprint_subscribers.selfie_image_urls` dependency
- Make wizard completion endpoint only check `user_avatar_images`

### 6. **Comparison: Maya Chat vs Wizard**

| Aspect | Maya Chat Pro Mode | Wizard Steps 3-4 |
|--------|-------------------|------------------|
| Upload Endpoint | Direct to `user_avatar_images` | `/api/blueprint/upload-selfies` → `user_avatar_images` |
| Query Endpoint | Direct DB query in generation | ❌ Missing `/api/images?type=avatar` |
| State Management | Direct DB access | localStorage + DB (out of sync) |
| Image Availability | Immediate | Delayed (requires wizard completion) |
| Data Consistency | ✅ Single source of truth | ⚠️ Dual storage (can get out of sync) |

### 7. **Implementation Priority**

1. **HIGH**: Fix `/api/images` endpoint to handle `type=avatar` OR create dedicated endpoint
2. **HIGH**: Verify frontend can query uploaded images after wizard step 4
3. **MEDIUM**: Sync localStorage with DB state after upload
4. **LOW**: Remove redundant `blueprint_subscribers.selfie_image_urls` storage (backward compatibility)

## Next Steps

1. Implement avatar images query endpoint
2. Update frontend to use correct endpoint
3. Test image persistence across page reloads
4. Verify images are available for Pro Mode generation after wizard completion
