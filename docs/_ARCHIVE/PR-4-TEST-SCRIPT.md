# PR-4 Testing Script 🧪

**Copy-paste commands for testing Paid Blueprint APIs**

---

## 🔧 SETUP

### 1. Get Test Access Token

```sql
-- Find a subscriber with strategy_data
SELECT 
  email, 
  access_token,
  strategy_generated,
  paid_blueprint_purchased
FROM blueprint_subscribers 
WHERE strategy_data IS NOT NULL
LIMIT 1;
```

Copy the `access_token` value.

### 2. Mark as Purchased (if needed)

```sql
-- Simulate webhook by marking as purchased
UPDATE blueprint_subscribers
SET 
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW(),
  paid_blueprint_stripe_payment_id = 'pi_test_' || gen_random_uuid()
WHERE email = 'YOUR_EMAIL_FROM_ABOVE';
```

---

## 🧪 TEST COMMANDS

Replace these values:
- `YOUR_DOMAIN` = your deployment URL (e.g., `localhost:3000` or `sselfie.com`)
- `YOUR_ACCESS_TOKEN` = the `access_token` from Step 1

---

### Test 1: Check Status ✅

```bash
curl "https://YOUR_DOMAIN/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN" | jq
```

**Expected Output:**
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

### Test 2: Start Generation ⚡

```bash
curl -X POST https://YOUR_DOMAIN/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}' \
  | jq
```

**Expected:**
- Takes 5-10 minutes
- Returns 30 photo URLs

**While Running:**
Check server logs for progress:
```
[v0][paid-blueprint] Progress saved: 5/30
[v0][paid-blueprint] Progress saved: 10/30
...
```

---

### Test 3: Check Status (After Generation) ✅

```bash
curl "https://YOUR_DOMAIN/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN" | jq
```

**Expected Output:**
```json
{
  "purchased": true,
  "generated": true,
  "generatedAt": "2026-01-09T...",
  "totalPhotos": 30,
  "photoUrls": ["https://...", "https://...", ...],
  "canGenerate": false,
  "error": null
}
```

---

### Test 4: Retry Generation (Idempotency) ♻️

```bash
curl -X POST https://YOUR_DOMAIN/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}' \
  | jq
```

**Expected:**
- Returns immediately (< 1 sec)
- Same 30 photo URLs
- No new generation

**Expected Output:**
```json
{
  "success": true,
  "alreadyGenerated": true,
  "totalPhotos": 30,
  "photoUrls": ["https://...", ...]
}
```

---

### Test 5: Verify in Database 📊

```sql
SELECT 
  email,
  paid_blueprint_purchased,
  paid_blueprint_generated,
  paid_blueprint_generated_at,
  jsonb_array_length(paid_blueprint_photo_urls) AS photo_count,
  paid_blueprint_photo_urls->0 AS first_photo_url,
  paid_blueprint_photo_urls->29 AS last_photo_url
FROM blueprint_subscribers
WHERE access_token = 'YOUR_ACCESS_TOKEN';
```

**Expected:**
- `paid_blueprint_purchased` = `TRUE`
- `paid_blueprint_generated` = `TRUE`
- `photo_count` = 30
- `first_photo_url` and `last_photo_url` = valid URLs

---

## 🚨 ERROR TESTS

### Test: Invalid Token

```bash
curl "https://YOUR_DOMAIN/api/blueprint/get-paid-status?access=invalid_token_123" | jq
```

**Expected:**
```json
{
  "error": "Invalid access token"
}
```

**Status:** 404

---

### Test: Not Purchased

```bash
# First, reset purchase flag
# UPDATE blueprint_subscribers SET paid_blueprint_purchased = FALSE WHERE email = 'test@example.com';

curl -X POST https://YOUR_DOMAIN/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}' \
  | jq
```

**Expected:**
```json
{
  "error": "Paid blueprint not purchased. Please purchase first."
}
```

**Status:** 403

---

## 📸 VIEW GENERATED PHOTOS

After generation, open URLs in browser:

```bash
# Get first 3 photo URLs
curl "https://YOUR_DOMAIN/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN" \
  | jq -r '.photoUrls[0:3][]'
```

Copy URLs and paste in browser to verify images look correct.

---

## 🔄 RESET FOR RE-TESTING

```sql
-- Reset generation flags (keeps purchase)
UPDATE blueprint_subscribers
SET 
  paid_blueprint_generated = FALSE,
  paid_blueprint_generated_at = NULL,
  paid_blueprint_photo_urls = '[]'::jsonb
WHERE email = 'YOUR_TEST_EMAIL';
```

Now you can re-run Test 2 to generate again.

---

## ✅ SUCCESS CHECKLIST

- [ ] Status API returns correct data
- [ ] Generation creates exactly 30 photos
- [ ] Photos are valid image URLs
- [ ] Retry returns same photos (idempotent)
- [ ] Database flags updated correctly
- [ ] Logs show progress (`5/30`, `10/30`, etc.)
- [ ] Invalid token returns 404
- [ ] Not purchased returns 403

---

## 📋 TROUBLESHOOTING

### Issue: Generation hangs

**Check logs for:**
```
[v0][paid-blueprint] Error creating prediction: ...
[v0][paid-blueprint] Error polling prediction: ...
```

**Common causes:**
- Invalid `REPLICATE_API_TOKEN`
- Rate limit hit (wait 1 minute, retry)
- Network timeout (retry, progress is saved)

### Issue: Missing strategy_data

**Fix:**
```bash
# Generate strategy first
curl -X POST https://YOUR_DOMAIN/api/blueprint/generate-concepts \
  -H "Content-Type: application/json" \
  -d '{"email": "YOUR_EMAIL", "selectedFeedStyle": "minimal-aesthetic"}'
```

### Issue: Photos look identical

**Check:**
- Are prompts varying? (logs should show different variations)
- Is `varyPrompt()` function working?

**Debug:**
```sql
-- Check if prompt variations are being used
SELECT strategy_data->'prompt' FROM blueprint_subscribers WHERE email = 'test@example.com';
```

---

## 🔗 RELATED

- [Full Implementation Summary](./PR-4-IMPLEMENTATION-SUMMARY.md)
- [Quick Reference](./PR-4-QUICK-REFERENCE.md)
