# Blueprint One-Time Generation Implementation Plan

## Business Requirement
**CRITICAL**: Each email subscriber can only generate **ONE strategy** and **ONE image grid** for free. After generation, they can always access their saved blueprint, but cannot generate new ones without paying.

**Cost Impact**: Each blueprint strategy + grid generation costs $1. Preventing abuse is essential.

---

## Current Flow Analysis

### 1. Email Capture
- **Endpoint**: `/api/blueprint/subscribe`
- **Table**: `blueprint_subscribers`
- **Current Behavior**: 
  - Creates new subscriber OR updates existing subscriber
  - Stores form data in `form_data` JSONB column
  - No tracking of generation limits

### 2. Strategy Generation
- **Endpoint**: `/api/blueprint/generate-concepts`
- **Current Behavior**: 
  - Generates concept title + description using GPT-4o
  - No email validation
  - No limit checking
  - No saving to database

### 3. Grid Generation
- **Endpoint**: `/api/blueprint/generate-grid`
- **Current Behavior**:
  - Generates 3x3 photoshoot grid using Nano Banana Pro
  - No email validation
  - No limit checking
  - No saving to database

### 4. Grid Status Check
- **Endpoint**: `/api/blueprint/check-grid`
- **Current Behavior**:
  - Polls Nano Banana for completion
  - Splits grid into 9 frames
  - Uploads to Vercel Blob
  - Returns URLs but doesn't save to database

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Generation Tracking Columns
**File**: `scripts/add-blueprint-generation-tracking.sql`

```sql
-- Add columns to track generation limits
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS strategy_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS strategy_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS strategy_data JSONB, -- Store generated concept (title, prompt, category)
  
  ADD COLUMN IF NOT EXISTS grid_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grid_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS grid_url TEXT, -- Full 3x3 grid URL
  ADD COLUMN IF NOT EXISTS grid_frame_urls JSONB, -- Array of 9 frame URLs
  ADD COLUMN IF NOT EXISTS grid_prediction_id TEXT, -- Nano Banana prediction ID for tracking

  ADD COLUMN IF NOT EXISTS selfie_image_urls JSONB; -- Store uploaded selfie URLs

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_strategy_generated 
  ON blueprint_subscribers(strategy_generated, strategy_generated_at);

CREATE INDEX IF NOT EXISTS idx_blueprint_grid_generated 
  ON blueprint_subscribers(grid_generated, grid_generated_at);
```

#### 1.2 Migration Script
**File**: `scripts/migrations/add-blueprint-generation-tracking.ts`

---

### Phase 2: API Endpoint Updates

#### 2.1 Update `/api/blueprint/generate-concepts`
**Changes Required**:

1. **Add Email Parameter**: Require `email` in request body
2. **Check Generation Limit**: Query `blueprint_subscribers` to verify `strategy_generated = FALSE`
3. **Return Existing Strategy**: If `strategy_generated = TRUE`, return saved `strategy_data` instead of generating new
4. **Save Strategy**: After generation, update database:
   ```sql
   UPDATE blueprint_subscribers
   SET strategy_generated = TRUE,
       strategy_generated_at = NOW(),
       strategy_data = ${JSON.stringify(concept)}
   WHERE email = ${email}
   ```

**Error Handling**:
- If email not found → Return 404 with message to complete email capture first
- If `strategy_generated = TRUE` → Return 403 with saved strategy data
- If generation fails → Don't mark as generated, allow retry

#### 2.2 Update `/api/blueprint/generate-grid`
**Changes Required**:

1. **Add Email Parameter**: Require `email` in request body
2. **Check Prerequisites**:
   - Email exists in `blueprint_subscribers`
   - `strategy_generated = TRUE` (must have strategy first)
   - `grid_generated = FALSE` (limit check)
3. **Return Existing Grid**: If `grid_generated = TRUE`, return saved grid URLs
4. **Save Grid Data**: After successful generation, update database in `/api/blueprint/check-grid` when status = "completed"

**Error Handling**:
- If email not found → Return 404
- If strategy not generated → Return 400 "Please generate strategy first"
- If `grid_generated = TRUE` → Return 403 with saved grid data

#### 2.3 Update `/api/blueprint/check-grid`
**Changes Required**:

1. **Add Email Parameter**: Require `email` in request body
2. **Save on Completion**: When `status === "succeeded"`, update database:
   ```sql
   UPDATE blueprint_subscribers
   SET grid_generated = TRUE,
       grid_generated_at = NOW(),
       grid_url = ${gridUrl},
       grid_frame_urls = ${JSON.stringify(frameUrls)},
       grid_prediction_id = ${predictionId}
   WHERE email = ${email}
   ```

#### 2.4 Update `/api/blueprint/upload-selfies`
**Changes Required**:

1. **Add Email Parameter**: Require `email` in request body
2. **Save Selfie URLs**: After upload, save to database:
   ```sql
   UPDATE blueprint_subscribers
   SET selfie_image_urls = ${JSON.stringify(uploadedUrls)}
   WHERE email = ${email}
   ```

#### 2.5 New Endpoint: `/api/blueprint/get-blueprint`
**Purpose**: Retrieve saved blueprint for returning users

**Request**: `GET /api/blueprint/get-blueprint?email={email}` or use access token

**Response**:
```json
{
  "success": true,
  "blueprint": {
    "formData": {...},
    "strategy": {
      "generated": true,
      "generatedAt": "2024-01-01T00:00:00Z",
      "data": {
        "title": "...",
        "prompt": "...",
        "category": "..."
      }
    },
    "grid": {
      "generated": true,
      "generatedAt": "2024-01-01T00:00:00Z",
      "gridUrl": "...",
      "frameUrls": [...]
    },
    "selfieImages": [...]
  }
}
```

---

### Phase 3: Frontend Updates

#### 3.1 Update `app/blueprint/page.tsx`

**Changes Required**:

1. **Email Requirement**: Ensure `savedEmail` is set before allowing generation
2. **Pass Email to APIs**: Include `email` in all API calls:
   - `generateConcepts()` → Include `email` in request
   - `handleGenerate()` in concept card → Include `email` in `/api/blueprint/generate-grid`
   - `pollGridStatus()` → Include `email` in `/api/blueprint/check-grid`
3. **Handle Existing Blueprint**: 
   - On page load, check if user has saved blueprint
   - If yes, load and display saved strategy + grid
   - Disable generation buttons if already generated
4. **UI Updates**:
   - Show "Already Generated" state if limit reached
   - Display saved blueprint if exists
   - Add "View My Blueprint" link for returning users

#### 3.2 Update `components/blueprint/blueprint-concept-card.tsx`

**Changes Required**:

1. **Pass Email**: Accept `email` prop and include in API calls
2. **Disable if Generated**: Check if grid already generated for this email
3. **Show Saved Grid**: If grid exists, display it instead of placeholder

#### 3.3 Update `components/blueprint/blueprint-selfie-upload.tsx`

**Changes Required**:

1. **Pass Email**: Accept `email` prop and include in `/api/blueprint/upload-selfies`
2. **Load Saved Selfies**: If selfies exist in database, pre-populate component

---

### Phase 4: Access Token Flow (Optional Enhancement)

**Purpose**: Allow users to access their blueprint via URL with access token

**Implementation**:
- Use existing `access_token` from `blueprint_subscribers`
- Create route: `/blueprint/view?token={accessToken}`
- Verify token and load saved blueprint
- No generation allowed, view-only

---

### Phase 5: Validation & Security

#### 5.1 Email Validation
- **Server-side**: Always validate email exists in `blueprint_subscribers` before generation
- **Client-side**: Ensure email is captured before allowing generation buttons

#### 5.2 Rate Limiting
- Add rate limiting to generation endpoints (additional safety layer)
- Use existing rate limiting infrastructure

#### 5.3 Audit Logging
- Log all generation attempts (successful and blocked)
- Track: email, timestamp, endpoint, result

---

## Implementation Checklist

### Database
- [ ] Create migration script for new columns
- [ ] Run migration on production
- [ ] Verify indexes created
- [ ] Test with sample data

### API Endpoints
- [ ] Update `/api/blueprint/generate-concepts` with email check + save
- [ ] Update `/api/blueprint/generate-grid` with email check + save
- [ ] Update `/api/blueprint/check-grid` to save on completion
- [ ] Update `/api/blueprint/upload-selfies` to save URLs
- [ ] Create `/api/blueprint/get-blueprint` endpoint
- [ ] Add error handling for all limit violations
- [ ] Test all endpoints with valid/invalid emails

### Frontend
- [ ] Update `app/blueprint/page.tsx` to pass email to all APIs
- [ ] Add blueprint loading on page mount
- [ ] Update concept card to handle saved state
- [ ] Update selfie upload to load saved images
- [ ] Add UI for "already generated" state
- [ ] Test complete flow: email → strategy → grid

### Testing
- [ ] Test: New user generates strategy + grid (should work)
- [ ] Test: Same user tries to generate again (should be blocked)
- [ ] Test: User returns later, should see saved blueprint
- [ ] Test: User without email tries to generate (should fail)
- [ ] Test: Edge cases (email not in DB, etc.)

### Documentation
- [ ] Update API documentation
- [ ] Document access token flow (if implemented)
- [ ] Add comments in code explaining limits

---

## Security Considerations

1. **Email Verification**: Never trust client-provided email. Always verify against database.
2. **Race Conditions**: Use database transactions or row-level locking to prevent duplicate generations.
3. **Token Security**: If using access tokens, ensure they're cryptographically secure (already using UUID).
4. **SQL Injection**: Use parameterized queries (already using Neon's template strings ✅).

---

## Cost Protection Summary

**Before**: Unlimited free generations per email = unlimited $1 costs
**After**: 
- 1 strategy generation per email (GPT-4o call)
- 1 grid generation per email (Nano Banana Pro call)
- Total: $1 per email subscriber maximum

**Enforcement Points**:
1. Database columns: `strategy_generated`, `grid_generated` (source of truth)
2. API endpoint checks (server-side validation)
3. Frontend UI (user experience, not security)

---

## Rollout Plan

1. **Phase 1**: Database migration (non-breaking)
2. **Phase 2**: API updates (add email checks, backward compatible)
3. **Phase 3**: Frontend updates (gradual rollout)
4. **Phase 4**: Monitor and verify no duplicate generations
5. **Phase 5**: Optional enhancements (access token flow)

---

## Questions to Resolve

1. **What if generation fails?** 
   - Answer: Don't mark as generated, allow retry (already handled in plan)

2. **What if user wants to regenerate with different selfies?**
   - Answer: Not allowed in free tier. They must upgrade to paid plan.

3. **What if user changes email?**
   - Answer: New email = new subscriber = new free generation allowed. This is acceptable.

4. **What about existing subscribers?**
   - Answer: They get one free generation when they first use the new system.

---

## Next Steps

1. Review and approve this plan
2. Create database migration script
3. Implement API endpoint updates
4. Update frontend components
5. Test thoroughly
6. Deploy to production
