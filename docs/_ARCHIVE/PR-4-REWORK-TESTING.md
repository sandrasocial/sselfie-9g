# PR-4 Rework Testing Guide
**Incremental Generation Pattern - One Grid at a Time**

---

## Test Prerequisites

### Required Data
```sql
-- Verify test subscriber exists with required data
SELECT 
  email,
  access_token,
  paid_blueprint_purchased,
  selfie_image_urls,
  form_data->>'vibe' as category,
  feed_style as mood,
  jsonb_array_length(COALESCE(paid_blueprint_photo_urls, '[]'::jsonb)) as existing_grids
FROM blueprint_subscribers
WHERE email = 'test@example.com';
```

**Expected:**
- `paid_blueprint_purchased = TRUE`
- `selfie_image_urls` has 1-3 valid HTTP URLs
- `category` (vibe) is one of: luxury, minimal, beige, warm, edgy, professional
- `mood` (feed_style) is one of: luxury, minimal, beige

---

## Test Case 1: Happy Path - Single Grid Generation

### Objective
Verify one grid generates correctly from start to finish.

### Steps

**1. Check initial status**
```bash
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TEST_TOKEN"
```

**Expected Response:**
```json
{
  "purchased": true,
  "generated": false,
  "totalPhotos": 0,
  "progress": {
    "completed": 0,
    "total": 30,
    "percentage": 0
  },
  "missingGridNumbers": [1, 2, 3, ..., 30],
  "hasSelfies": true,
  "hasFormData": true,
  "canGenerate": true
}
```

**2. Generate Grid 1**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":1}'
```

**Expected Response:**
```json
{
  "success": true,
  "gridNumber": 1,
  "predictionId": "abc123xyz",
  "status": "starting",
  "message": "Grid 1/30 generation started"
}
```

**3. Poll for completion (repeat every 5 seconds)**
```bash
curl "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=abc123xyz&gridNumber=1&access=TEST_TOKEN"
```

**Expected Response (processing):**
```json
{
  "success": true,
  "status": "processing",
  "gridNumber": 1
}
```

**Expected Response (completed):**
```json
{
  "success": true,
  "status": "completed",
  "gridNumber": 1,
  "gridUrl": "https://...",
  "totalCompleted": 1,
  "allComplete": false
}
```

**4. Verify database**
```sql
SELECT 
  jsonb_array_length(paid_blueprint_photo_urls) as array_length,
  paid_blueprint_photo_urls->0 as grid_1_url,
  paid_blueprint_generated
FROM blueprint_subscribers 
WHERE access_token = 'TEST_TOKEN';
```

**Expected:**
- `array_length` >= 1
- `grid_1_url` is a valid URL
- `paid_blueprint_generated = FALSE` (not done yet)

---

## Test Case 2: Idempotency - Retry Same Grid

### Objective
Verify requesting the same grid twice returns existing URL without regenerating.

### Steps

**1. Request Grid 1 again**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":1}'
```

**Expected Response:**
```json
{
  "success": true,
  "gridNumber": 1,
  "status": "completed",
  "gridUrl": "https://...",  // Same URL as before
  "message": "Grid 1 already generated"
}
```

**2. Verify no new prediction created**
- Check logs: should show "Grid 1 already exists"
- No new Replicate prediction should be visible in Replicate dashboard

---

## Test Case 3: Sequential Generation (3 Grids)

### Objective
Verify multiple grids generate in sequence correctly.

### Steps

**1. Generate Grids 1, 2, 3**
```bash
for i in 1 2 3; do
  echo "Generating Grid $i..."
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/blueprint/generate-paid \
    -H "Content-Type: application/json" \
    -d "{\"accessToken\":\"TEST_TOKEN\",\"gridNumber\":$i}")
  
  PRED_ID=$(echo $RESPONSE | jq -r '.predictionId')
  echo "Prediction ID: $PRED_ID"
  
  # Poll until complete
  while true; do
    STATUS=$(curl -s "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=$PRED_ID&gridNumber=$i&access=TEST_TOKEN")
    RESULT=$(echo $STATUS | jq -r '.status')
    
    if [ "$RESULT" = "completed" ]; then
      echo "Grid $i complete!"
      break
    elif [ "$RESULT" = "failed" ]; then
      echo "Grid $i failed!"
      break
    fi
    
    echo "Grid $i still processing..."
    sleep 5
  done
done
```

**2. Verify database**
```sql
SELECT 
  jsonb_array_length(paid_blueprint_photo_urls) as count,
  paid_blueprint_photo_urls->0 IS NOT NULL as has_grid_1,
  paid_blueprint_photo_urls->1 IS NOT NULL as has_grid_2,
  paid_blueprint_photo_urls->2 IS NOT NULL as has_grid_3,
  paid_blueprint_generated
FROM blueprint_subscribers 
WHERE access_token = 'TEST_TOKEN';
```

**Expected:**
- `count` >= 3
- All `has_grid_X` = TRUE
- `paid_blueprint_generated = FALSE` (not 30 yet)

---

## Test Case 4: Resume After Interruption

### Objective
Verify generation can resume from last completed grid.

### Setup
```sql
-- Manually set some grids as complete (simulate partial progress)
UPDATE blueprint_subscribers
SET paid_blueprint_photo_urls = '["https://grid1.com", "https://grid2.com", null, null, null]'::jsonb
WHERE access_token = 'TEST_TOKEN';
```

### Steps

**1. Check status**
```bash
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TEST_TOKEN"
```

**Expected Response:**
```json
{
  "totalPhotos": 2,
  "progress": {
    "completed": 2,
    "percentage": 6.67
  },
  "missingGridNumbers": [3, 4, 5, ..., 30],
  "canGenerate": true
}
```

**2. Generate Grid 3 (resume)**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":3}'
```

**Expected:** Success, new prediction starts

---

## Test Case 5: Guard - Missing Selfies

### Objective
Verify graceful error if selfies missing.

### Setup
```sql
UPDATE blueprint_subscribers 
SET selfie_image_urls = NULL 
WHERE access_token = 'TEST_TOKEN_NO_SELFIES';
```

### Steps

**1. Attempt generation**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN_NO_SELFIES","gridNumber":1}'
```

**Expected Response:**
```json
{
  "error": "Selfies required. Please complete the free Blueprint first to upload selfies.",
  "requiresAction": "complete_free_blueprint"
}
```
**Status:** 400

---

## Test Case 6: Guard - Not Purchased

### Objective
Verify purchase check works.

### Setup
```sql
UPDATE blueprint_subscribers 
SET paid_blueprint_purchased = FALSE 
WHERE access_token = 'TEST_TOKEN_NOT_PURCHASED';
```

### Steps

**1. Attempt generation**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN_NOT_PURCHASED","gridNumber":1}'
```

**Expected Response:**
```json
{
  "error": "Paid blueprint not purchased. Please purchase first.",
  "requiresAction": "purchase"
}
```
**Status:** 403

---

## Test Case 7: Guard - Invalid Grid Number

### Objective
Verify gridNumber validation.

### Steps

**1. Test gridNumber = 0**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":0}'
```

**Expected:** 400 error, "gridNumber must be between 1 and 30"

**2. Test gridNumber = 31**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":31}'
```

**Expected:** 400 error, "gridNumber must be between 1 and 30"

**3. Test gridNumber = "abc"**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":"abc"}'
```

**Expected:** 400 error

---

## Test Case 8: Full Completion (30/30 Grids)

### Objective
Verify marking as generated when all 30 complete.

### Setup
```sql
-- Manually set 29 grids as complete
UPDATE blueprint_subscribers
SET paid_blueprint_photo_urls = (
  SELECT jsonb_agg(
    CASE WHEN i <= 29 THEN 'https://grid' || i || '.com' ELSE null END
  )
  FROM generate_series(1, 30) i
)
WHERE access_token = 'TEST_TOKEN';
```

### Steps

**1. Generate Grid 30 (final grid)**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":30}'
```

**2. Poll until complete**
```bash
curl "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=PRED_ID&gridNumber=30&access=TEST_TOKEN"
```

**3. Verify database**
```sql
SELECT 
  jsonb_array_length(paid_blueprint_photo_urls) as count,
  paid_blueprint_generated,
  paid_blueprint_generated_at
FROM blueprint_subscribers 
WHERE access_token = 'TEST_TOKEN';
```

**Expected:**
- `count` = 30
- `paid_blueprint_generated = TRUE`
- `paid_blueprint_generated_at` is recent timestamp

**4. Check status**
```bash
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TEST_TOKEN"
```

**Expected Response:**
```json
{
  "generated": true,
  "totalPhotos": 30,
  "progress": {
    "completed": 30,
    "percentage": 100
  },
  "missingGridNumbers": [],
  "canGenerate": false
}
```

---

## Test Case 9: Failed Grid Retry

### Objective
Verify failed grids can be retried.

### Steps

**1. Simulate failure (manually in test or wait for actual failure)**

**2. Check status**
```bash
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TEST_TOKEN"
```

**Expected:** `missingGridNumbers` includes the failed grid number

**3. Retry failed grid**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":7}'  # Example: Grid 7 failed
```

**Expected:** Success, new prediction starts

---

## Test Case 10: Concurrent Safety (Advanced)

### Objective
Verify two concurrent requests don't create duplicates.

### Steps

**1. Start two requests simultaneously**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":5}' &

curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TEST_TOKEN","gridNumber":5}' &

wait
```

**Expected:**
- One request gets `status: "starting"` with predictionId
- Other request gets `status: "completed"` with existing URL (if first completed)
- OR both get predictionId but only one actually saves (idempotency guard)

**2. Verify database has only ONE grid at index 4**
```sql
SELECT paid_blueprint_photo_urls->4 as grid_5_url
FROM blueprint_subscribers 
WHERE access_token = 'TEST_TOKEN';
```

**Expected:** Only one URL, not duplicates

---

## Automated Test Script

Create `/scripts/test-paid-blueprint-incremental.ts`:

```typescript
// Quick smoke test - generates 3 grids
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function testIncrementalGeneration() {
  const testToken = "test_incremental_" + Date.now()
  
  // Setup test subscriber
  await sql`
    INSERT INTO blueprint_subscribers (
      email, access_token, name, paid_blueprint_purchased,
      selfie_image_urls, form_data, feed_style
    ) VALUES (
      'test@example.com',
      ${testToken},
      'Test User',
      TRUE,
      '["https://example.com/selfie1.jpg"]'::jsonb,
      '{"vibe":"professional"}'::jsonb,
      'minimal'
    )
  `
  
  console.log("✅ Test subscriber created:", testToken)
  
  // Generate 3 grids
  for (let i = 1; i <= 3; i++) {
    console.log(`\nGenerating Grid ${i}/3...`)
    
    const genResponse = await fetch("http://localhost:3000/api/blueprint/generate-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: testToken, gridNumber: i })
    })
    
    const genData = await genResponse.json()
    console.log("Response:", genData)
    
    if (!genData.success) {
      throw new Error(`Failed to start Grid ${i}`)
    }
    
    // Poll for completion
    const predictionId = genData.predictionId
    let attempts = 0
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 5000))  // 5 sec
      
      const checkResponse = await fetch(
        `http://localhost:3000/api/blueprint/check-paid-grid?predictionId=${predictionId}&gridNumber=${i}&access=${testToken}`
      )
      const checkData = await checkResponse.json()
      
      if (checkData.status === "completed") {
        console.log(`✅ Grid ${i} complete:`, checkData.gridUrl.substring(0, 60))
        break
      } else if (checkData.status === "failed") {
        throw new Error(`Grid ${i} failed`)
      }
      
      attempts++
    }
    
    if (attempts >= 60) {
      throw new Error(`Grid ${i} timed out`)
    }
  }
  
  // Verify final state
  const [result] = await sql`
    SELECT jsonb_array_length(paid_blueprint_photo_urls) as count
    FROM blueprint_subscribers
    WHERE access_token = ${testToken}
  `
  
  console.log("\n✅ Test complete! Total grids:", result.count)
  
  // Cleanup
  await sql`DELETE FROM blueprint_subscribers WHERE access_token = ${testToken}`
}

testIncrementalGeneration().catch(console.error)
```

---

## Success Criteria

- ✅ All 10 test cases pass
- ✅ No timeouts (each API call < 5 seconds)
- ✅ Idempotency verified (duplicate requests safe)
- ✅ Resume capability works (can continue after interruption)
- ✅ All 30 grids generate and mark as complete
- ✅ Guards prevent invalid requests
- ✅ Database state always consistent
