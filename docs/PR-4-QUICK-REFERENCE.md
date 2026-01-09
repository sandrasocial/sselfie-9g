# PR-4 Quick Reference 🚀

**Paid Blueprint Photo Generation APIs**

---

## 📋 WHAT WAS ADDED

### 2 New API Routes

1. **GET `/api/blueprint/get-paid-status`**
   - Check purchase & generation status
   - Returns photo count + URLs
   - Token-based auth (`access` query param)

2. **POST `/api/blueprint/generate-paid`**
   - Generate 30 custom photos
   - Uses FLUX model (`black-forest-labs/flux-dev`)
   - Saves photos in `paid_blueprint_photo_urls` (JSONB)
   - Idempotent & safe to retry

---

## 🧪 QUICK TEST

### 1. Check Status

```bash
curl "https://your-domain.com/api/blueprint/get-paid-status?access=YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "purchased": true,
  "generated": false,
  "totalPhotos": 0,
  "photoUrls": [],
  "canGenerate": true
}
```

### 2. Generate Photos

```bash
curl -X POST https://your-domain.com/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN"}'
```

**Response (takes 5-10 min):**
```json
{
  "success": true,
  "totalPhotos": 30,
  "photoUrls": ["https://...", ...]
}
```

### 3. Verify in DB

```sql
SELECT 
  email,
  paid_blueprint_generated,
  jsonb_array_length(paid_blueprint_photo_urls) AS photo_count
FROM blueprint_subscribers
WHERE email = 'test@example.com';
```

**Expected:**
- `paid_blueprint_generated` = `TRUE`
- `photo_count` = 30

---

## ⚙️ HOW IT WORKS

### Generation Flow

1. **Validate access token** → Find subscriber
2. **Check purchase status** → Must be `paid_blueprint_purchased = TRUE`
3. **Check if already generated** → Return existing photos (idempotent)
4. **Get strategy_data** → Use for prompts
5. **Generate in batches of 5** → Create predictions
6. **Wait for each batch** → Poll until succeeded
7. **Save progress after each batch** → Append to JSONB array
8. **Mark as generated at 30** → Set `paid_blueprint_generated = TRUE`

### Safety Features

✅ **Idempotent** - Safe to retry, no duplicates  
✅ **Incremental saves** - Progress not lost if fails partway  
✅ **Guardrails** - Must purchase first, must have strategy  
✅ **Concurrency safe** - First request wins, others return existing  

---

## 🚨 GUARDRAILS

| Condition | Status | Error |
|-----------|--------|-------|
| Invalid `access_token` | 404 | "Invalid access token" |
| Not purchased | 403 | "Paid blueprint not purchased" |
| Missing `strategy_data` | 400 | "Please complete free blueprint first" |
| Already generated | 200 | `{ alreadyGenerated: true, photoUrls: [...] }` |

---

## 📊 LOGS TO WATCH

```
[v0][paid-blueprint] Generation request for token: abc12345...
[v0][paid-blueprint] Existing photos: 0 /30
[v0][paid-blueprint] Starting generation: san*** Strategy: Luxury SoHo Evening
[v0][paid-blueprint] Batch 1 - generating 5 photos
[v0][paid-blueprint] Progress saved: 5 /30
[v0][paid-blueprint] Progress saved: 10 /30
...
[v0][paid-blueprint] ✅ Generation complete: san*** 30 photos
```

---

## 🎨 PROMPT DIVERSITY

Photos vary automatically using these hints:

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
Base: "A professional woman in luxury SoHo setting..."
Photo 1: "...close-up portrait, maintaining consistent subject"
Photo 2: "...medium shot, maintaining consistent subject"
```

---

## ⏱️ TIMING

- **Status check:** < 1 second
- **Full generation (30 photos):** 5-10 minutes
  - Batches of 5 photos
  - 6 batches total
  - ~1 minute per photo (FLUX generation + polling)

---

## ✅ READY FOR

- ✅ Local testing
- ✅ Staging deployment
- ✅ Integration with UI (PR-5)
- ✅ Integration with delivery emails (PR-6)

---

## 🔗 RELATED

- [Full Implementation Summary](./PR-4-IMPLEMENTATION-SUMMARY.md)
- [PR-3: Schema](./PR-3-IMPLEMENTATION-SUMMARY.md)
- [PR-2: Webhook](./PR-2-CORRECTED-SUMMARY.md)
- [Implementation Plan](./PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md)
