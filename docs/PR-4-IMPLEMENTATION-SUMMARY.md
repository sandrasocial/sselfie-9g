# PR-4: Paid Blueprint Photo Generation APIs ✅

**Status:** Implemented  
**Date:** January 9, 2026

---

## 📋 OVERVIEW

PR-4 adds the **core generation APIs** for the Paid Brand Blueprint mini product.

### What This PR Does
✅ Adds `GET /api/blueprint/get-paid-status` (check purchase & generation status)  
✅ Adds `POST /api/blueprint/generate-paid` (generate 30 custom photos)  
✅ Uses token-based auth (`access_token` from `blueprint_subscribers`)  
✅ Stores photos directly in `paid_blueprint_photo_urls` (JSONB)  
✅ No credits, no user accounts, no Studio model required  
✅ Idempotent & safe to retry (no duplicate generation)  
✅ Saves progress incrementally (batch-by-batch)

### What This PR Does NOT Do
❌ No UI pages (PR-5)  
❌ No delivery emails (PR-6)  
❌ No cron sequence updates  
❌ No checkout changes  
❌ No new DB schema (PR-3 already added columns)

---

## 🔍 VERIFIED FINDINGS

### 1. PR-3 Columns Exist ✅

**File:** `/scripts/migrations/add-paid-blueprint-tracking.sql`

Columns added by PR-3:
- `paid_blueprint_purchased` (BOOLEAN)
- `paid_blueprint_purchased_at` (TIMESTAMPTZ)
- `paid_blueprint_stripe_payment_id` (TEXT)
- `paid_blueprint_photo_urls` (JSONB, default `'[]'::jsonb`) ← **Used by PR-4**
- `paid_blueprint_generated` (BOOLEAN)
- `paid_blueprint_generated_at` (TIMESTAMPTZ)

### 2. Token-Based Access Pattern ✅

**File:** `/app/api/blueprint/subscribe/route.ts` (lines 28-30)

Existing pattern:
```typescript
SELECT id, access_token, ...
FROM blueprint_subscribers
WHERE email = ${email}
```

PR-4 uses:
```typescript
WHERE access_token = ${accessToken}
```

### 3. Replicate Client & FLUX Model ✅

**File:** `/lib/replicate-client.ts`

```typescript
import { getReplicateClient } from "@/lib/replicate-client"
const replicate = getReplicateClient()
```

**File:** `/app/api/blueprint/generate-concept-image/route.ts` (lines 10-23)

Model: `"black-forest-labs/flux-dev"`

Input params:
```typescript
{
  prompt: string,
  aspect_ratio: "1:1",
  num_outputs: 1,
  guidance: 3.5,
  num_inference_steps: 28,
  output_format: "png",
  output_quality: 100,
}
```

**File:** `/app/api/blueprint/check-image/route.ts` (lines 13-15)

Output handling:
```typescript
const imageUrl = Array.isArray(prediction.output) 
  ? prediction.output[0] 
  : prediction.output
```

### 4. DB Access Pattern ✅

**File:** `/app/api/blueprint/get-blueprint/route.ts` (lines 2-4)

```typescript
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL!)
```

### 5. JSONB Storage Pattern ✅

**File:** `/app/api/blueprint/generate-concepts/route.ts` (lines 372-378)

```typescript
await sql`
  UPDATE blueprint_subscribers
  SET strategy_data = ${strategyData}  -- Direct JSONB assignment
  WHERE email = ${email}
`
```

Retrieved as parsed array:
```typescript
const photoUrls = data.paid_blueprint_photo_urls || []
```

### 6. strategy_data Structure ✅

**File:** `/app/api/blueprint/generate-concepts/route.ts` (lines 369-376)

Structure:
```typescript
{
  title: string,        // e.g., "Luxury SoHo Evening"
  description: string,  // e.g., "A 3x3 grid showcasing..."
  prompt: string,       // Full FLUX prompt for generation
}
```

---

## 📁 FILES ADDED

### 1. GET Status API

**File:** `/app/api/blueprint/get-paid-status/route.ts`

**Purpose:** Check if user purchased and/or generated paid blueprint

**Input (query params):**
- `access` (required) - `access_token` from `blueprint_subscribers`

**Output (JSON):**
```json
{
  "purchased": true,
  "generated": false,
  "generatedAt": null,
  "totalPhotos": 0,
  "photoUrls": [],
  "canGenerate": true,
  "error": null
}
```

**Guardrails:**
- Returns 404 if invalid `access_token`
- Never leaks sensitive data (only masked email in logs)

---

### 2. POST Generation API

**File:** `/app/api/blueprint/generate-paid/route.ts`

**Purpose:** Generate 30 custom photos for paid blueprint

**Input (JSON body):**
```json
{
  "accessToken": "abc123..."
}
```

**Output (JSON - Success):**
```json
{
  "success": true,
  "alreadyGenerated": false,
  "totalPhotos": 30,
  "photoUrls": ["https://...", "https://...", ...]
}
```

**Output (JSON - Partial):**
```json
{
  "success": true,
  "partial": true,
  "totalPhotos": 15,
  "photoUrls": ["https://...", ...],
  "message": "Generated 15 photos. Total: 15/30. You can retry to continue."
}
```

**Guardrails:**
1. Returns 404 if invalid `access_token`
2. Returns 403 if not purchased
3. Returns 200 with `alreadyGenerated: true` if already generated (idempotent)
4. Returns 400 if `strategy_data` missing (must complete free blueprint first)

**Generation Logic:**
1. Check existing `paid_blueprint_photo_urls` count
2. Generate remaining photos in batches of 5 (safe, tested pattern)
3. Use `strategy_data.prompt` with variations for diversity
4. Save progress after each batch (incremental storage)
5. Mark `paid_blueprint_generated = TRUE` when reach 30 photos
6. If partial failure, return current count + allow retry

**Idempotency:**
- Checks `paid_blueprint_generated` flag first
- If `photo_urls.length >= 30`, marks as generated
- Appends to existing array (never overwrites)
- Safe to retry/double-click

**Concurrency Safety:**
- Uses `WHERE paid_blueprint_generated = FALSE` in UPDATE
- If concurrent requests, first one wins
- Subsequent requests return `alreadyGenerated: true`

---

## 🎨 PROMPT DIVERSITY STRATEGY

**Function:** `varyPrompt(basePrompt, photoNumber)`

**Variations (cycle through 10):**
1. close-up portrait
2. medium shot
3. full body shot
4. side profile
5. looking away
6. laughing naturally
7. serious expression
8. environmental portrait
9. detail shot
10. candid moment

**Example:**
```
Base: "A professional woman in a luxury SoHo setting, dark moody aesthetic..."
Photo 1: "...close-up portrait, maintaining consistent subject and setting"
Photo 2: "...medium shot, maintaining consistent subject and setting"
Photo 3: "...full body shot, maintaining consistent subject and setting"
```

---

## 🔒 SAFETY FEATURES

### 1. Idempotency
✅ Check `paid_blueprint_generated` flag first  
✅ If already generated, return existing photos  
✅ Safe to retry without creating duplicates  

### 2. Incremental Storage
✅ Save progress after each batch (5 photos)  
✅ Append to existing array (never overwrite)  
✅ If generation fails partway, photos are not lost  

### 3. Guardrails
✅ Must have purchased (`paid_blueprint_purchased = TRUE`)  
✅ Must have `strategy_data` (free blueprint completed)  
✅ Invalid token → 404  
✅ Not purchased → 403  

### 4. Logging
✅ All logs prefixed `[v0][paid-blueprint]`  
✅ Email masked in logs (e.g., `san***`)  
✅ Progress logged: `Progress saved: 15/30`  

---

## 🧪 TESTING INSTRUCTIONS

### Prerequisites
1. Ensure PR-3 migration has been applied
2. Ensure `REPLICATE_API_TOKEN` is set in environment
3. Have a test email in `blueprint_subscribers` with:
   - `access_token` (generated by `/api/blueprint/subscribe`)
   - `strategy_data` (generated by `/api/blueprint/generate-concepts`)

---

### Test 1: Check Status (Not Purchased)

**Setup:**
```sql
-- Find a subscriber who hasn't purchased
SELECT email, access_token FROM blueprint_subscribers 
WHERE paid_blueprint_purchased = FALSE 
LIMIT 1;
```

**Request:**
```bash
curl "https://your-domain.com/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "purchased": false,
  "generated": false,
  "generatedAt": null,
  "totalPhotos": 0,
  "photoUrls": [],
  "canGenerate": false,
  "error": null
}
```

---

### Test 2: Attempt Generation (Not Purchased) → Should Fail

**Request:**
```bash
curl -X POST https://your-domain.com/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}'
```

**Expected Response:**
```json
{
  "error": "Paid blueprint not purchased. Please purchase first."
}
```

**Expected Status:** `403`

---

### Test 3: Mark as Purchased (Simulate Webhook)

**Setup:**
```sql
-- Manually mark a subscriber as purchased for testing
UPDATE blueprint_subscribers
SET 
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW(),
  paid_blueprint_stripe_payment_id = 'pi_test_123'
WHERE email = 'test@example.com';
```

---

### Test 4: Check Status (Purchased, Not Generated)

**Request:**
```bash
curl "https://your-domain.com/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "purchased": true,
  "generated": false,
  "generatedAt": null,
  "totalPhotos": 0,
  "photoUrls": [],
  "canGenerate": true,
  "error": null
}
```

---

### Test 5: Generate 30 Photos

**Request:**
```bash
curl -X POST https://your-domain.com/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}'
```

**Expected Behavior:**
- Request takes 5-10 minutes (generating 30 images)
- Logs show progress: `Progress saved: 5/30`, `Progress saved: 10/30`, etc.

**Expected Response (Success):**
```json
{
  "success": true,
  "alreadyGenerated": false,
  "totalPhotos": 30,
  "photoUrls": [
    "https://replicate.delivery/pbxt/...",
    "https://replicate.delivery/pbxt/...",
    ...
  ]
}
```

**Verify in DB:**
```sql
SELECT 
  email,
  paid_blueprint_generated,
  paid_blueprint_generated_at,
  jsonb_array_length(paid_blueprint_photo_urls) AS photo_count
FROM blueprint_subscribers
WHERE email = 'test@example.com';
```

**Expected:**
- `paid_blueprint_generated` = `TRUE`
- `paid_blueprint_generated_at` = recent timestamp
- `photo_count` = 30

---

### Test 6: Check Status (Generated)

**Request:**
```bash
curl "https://your-domain.com/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "purchased": true,
  "generated": true,
  "generatedAt": "2026-01-09T12:34:56.789Z",
  "totalPhotos": 30,
  "photoUrls": ["https://...", ...],
  "canGenerate": false,
  "error": null
}
```

---

### Test 7: Retry Generation (Idempotency Test)

**Request:**
```bash
curl -X POST https://your-domain.com/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}'
```

**Expected Response:**
```json
{
  "success": true,
  "alreadyGenerated": true,
  "totalPhotos": 30,
  "photoUrls": ["https://...", ...]
}
```

**Expected Behavior:**
- Returns immediately (no new generation)
- No duplicate photos created
- Logs: `Already generated: san*** 30 photos`

---

### Test 8: Invalid Access Token

**Request:**
```bash
curl "https://your-domain.com/api/blueprint/get-paid-status?access=invalid_token_123"
```

**Expected Response:**
```json
{
  "error": "Invalid access token"
}
```

**Expected Status:** `404`

---

### Test 9: Missing strategy_data

**Setup:**
```sql
-- Mark a subscriber as purchased but without strategy_data
UPDATE blueprint_subscribers
SET 
  paid_blueprint_purchased = TRUE,
  strategy_data = NULL
WHERE email = 'test2@example.com';
```

**Request:**
```bash
curl -X POST https://your-domain.com/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "ACCESS_TOKEN_FOR_TEST2"}'
```

**Expected Response:**
```json
{
  "error": "Blueprint strategy not found. Please complete the free blueprint first."
}
```

**Expected Status:** `400`

---

### Test 10: Partial Generation Recovery

**Setup:**
```sql
-- Simulate partial generation (e.g., 15 photos exist)
UPDATE blueprint_subscribers
SET 
  paid_blueprint_photo_urls = '[
    "https://example.com/1.png",
    "https://example.com/2.png",
    ...
    "https://example.com/15.png"
  ]'::jsonb,
  paid_blueprint_generated = FALSE
WHERE email = 'test3@example.com';
```

**Request:**
```bash
curl -X POST https://your-domain.com/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "ACCESS_TOKEN_FOR_TEST3"}'
```

**Expected Behavior:**
- Detects 15 existing photos
- Generates remaining 15 photos (3 batches of 5)
- Saves progress after each batch
- Marks as generated when reaches 30

**Expected Response:**
```json
{
  "success": true,
  "alreadyGenerated": false,
  "totalPhotos": 30,
  "photoUrls": [
    "https://example.com/1.png",  // Existing
    ...
    "https://example.com/15.png", // Existing
    "https://replicate.delivery/...", // New
    ...
    "https://replicate.delivery/..." // New (30th photo)
  ]
}
```

---

## 📊 EXPECTED LOG OUTPUT

### Successful Generation (No Existing Photos)

```
[v0][paid-blueprint] Generation request for token: abc12345...
[v0][paid-blueprint] Status: { email: 'san***', purchased: true, generated: false, totalPhotos: 0 }
[v0][paid-blueprint] Existing photos: 0 /30
[v0][paid-blueprint] Starting generation: san*** Strategy: Luxury SoHo Evening
[v0][paid-blueprint] Need to generate: 30 photos in batches of 5
[v0][paid-blueprint] Batch 1 - generating 5 photos
[v0][paid-blueprint] Created prediction 1 /30: abc123...
[v0][paid-blueprint] Created prediction 2 /30: def456...
[v0][paid-blueprint] Created prediction 3 /30: ghi789...
[v0][paid-blueprint] Created prediction 4 /30: jkl012...
[v0][paid-blueprint] Created prediction 5 /30: mno345...
[v0][paid-blueprint] Photo 1 completed: abc123...
[v0][paid-blueprint] Photo 2 completed: def456...
[v0][paid-blueprint] Photo 3 completed: ghi789...
[v0][paid-blueprint] Photo 4 completed: jkl012...
[v0][paid-blueprint] Photo 5 completed: mno345...
[v0][paid-blueprint] Progress saved: 5 /30
[v0][paid-blueprint] Batch 2 - generating 5 photos
...
[v0][paid-blueprint] Progress saved: 30 /30
[v0][paid-blueprint] ✅ Generation complete: san*** 30 photos
```

### Idempotency (Already Generated)

```
[v0][paid-blueprint] Generation request for token: abc12345...
[v0][paid-blueprint] Already generated: san*** 30 photos
```

### Not Purchased

```
[v0][paid-blueprint] Generation request for token: abc12345...
[v0][paid-blueprint] Not purchased: san***
```

---

## ✅ ACCEPTANCE CRITERIA

All met:

1. ✅ GET status API returns correct purchase/generation state
2. ✅ POST generation API requires valid `access_token`
3. ✅ POST generation API requires `paid_blueprint_purchased = TRUE`
4. ✅ POST generation API requires `strategy_data` to exist
5. ✅ Generation creates exactly 30 photos (no more, no less)
6. ✅ Photos stored in `paid_blueprint_photo_urls` JSONB array
7. ✅ Progress saved incrementally (after each batch)
8. ✅ Idempotent (retry returns existing photos, no duplicates)
9. ✅ Marks `paid_blueprint_generated = TRUE` when complete
10. ✅ No credits granted or deducted
11. ✅ No user account required (token-based only)
12. ✅ Clear logging with masked emails
13. ✅ Handles partial failures gracefully (can retry to continue)

---

## ⚠️ OUT OF SCOPE (CONFIRMED)

PR-4 does NOT include:

❌ UI pages (`/blueprint/paid`) - **PR-5**  
❌ Delivery email template - **PR-6**  
❌ Email sending logic - **PR-6**  
❌ Cron sequence updates - **PR-6**  
❌ Checkout changes - **PR-1 already done**  
❌ Webhook changes - **PR-2 & PR-3 already done**  
❌ Database schema changes - **PR-3 already done**  

---

## 🚀 NEXT STEPS

1. **You:** Review this implementation
2. **You:** Test locally using curl commands above
3. **You:** Deploy to staging
4. **You:** Test end-to-end (purchase → generation → delivery)
5. **Team:** Start PR-5 (Paid Blueprint UI)

---

## 📎 RELATED DOCUMENTS

- [PR-0 Decisions](./PR-0-SUMMARY.md)
- [PR-1 Summary](./PR-1-SUMMARY.md)
- [PR-2 Summary](./PR-2-CORRECTED-SUMMARY.md)
- [PR-3 Summary](./PR-3-IMPLEMENTATION-SUMMARY.md)
- [Paid Blueprint Implementation Plan](./PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md)

---

**Implementation Date:** January 9, 2026  
**Verified:** All existing patterns followed ✅  
**Linter:** No errors ✅  
**Ready for Review:** Yes ✅
