# Quality Baseline - Quick Start Guide

**Phase 2C-4-3: Prompt Quality Baseline**  
**5-Minute Setup Guide**

---

## Step 1: Run Database Migration (1 minute)

```sql
-- Execute this SQL in your Neon database console
-- File: migrations/create-prompt-quality-metrics-table.sql

CREATE TABLE IF NOT EXISTS prompt_quality_metrics (
  id SERIAL PRIMARY KEY,
  generation_id TEXT,
  prediction_id TEXT,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  prompt_hash VARCHAR(32) NOT NULL,
  model_used VARCHAR(255) NOT NULL,
  model_version TEXT,
  face_consistency_score NUMERIC(5,2),
  realism_score NUMERIC(5,2),
  stability_score NUMERIC(5,2),
  image_hash VARCHAR(32),
  image_url TEXT NOT NULL,
  category VARCHAR(100),
  source VARCHAR(50),
  is_baseline BOOLEAN NOT NULL DEFAULT true,
  baseline_version VARCHAR(50) NOT NULL DEFAULT '2026-01-17-v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_quality_user_id ON prompt_quality_metrics(user_id);
CREATE INDEX idx_prompt_quality_created_at ON prompt_quality_metrics(created_at DESC);
```

---

## Step 2: Enable Monitoring (30 seconds)

Add to `.env.local`:

```bash
ENABLE_QUALITY_MONITORING=true
```

Or set in Vercel dashboard: Environment Variables → Add

---

## Step 3: Add Integration Hooks (3 minutes)

### Maya Generation

**File**: `app/api/maya/check-generation/route.ts`

```typescript
// Add at top
import { hookMayaGeneration } from '@/lib/quality/hooks'

// Add after line ~61 (after blob upload)
hookMayaGeneration({
  imageUrl: blob.url,
  prompt: generation.description || "",
  userId: generation.user_id,
  generationId: generationId,
  predictionId: predictionId,
  category: generation.category,
}).catch(() => {})
```

### Feed Generation

**File**: `app/api/feed/[feedId]/check-post/route.ts`

```typescript
// Add at top
import { hookFeedPostGeneration } from '@/lib/quality/hooks'

// Add after line ~174 (after post save)
hookFeedPostGeneration({
  imageUrl: blobUrl,
  prompt: post.prompt || "",
  userId: post.user_id,
  postId: postId,
  predictionId: predictionId,
}).catch(() => {})
```

---

## Step 4: Test (1 minute)

1. **Generate a test image** in Maya or Feed Planner

2. **Check logs** for quality messages:
   ```
   [PROMPT-QUALITY] 🔍 Starting quality assessment...
   [PROMPT-QUALITY] ✅ Quality assessment complete
   [PROMPT-QUALITY] Realism score: 72
   ```

3. **Verify database**:
   ```sql
   SELECT COUNT(*) FROM prompt_quality_metrics;
   ```

---

## Step 5: View Report (30 seconds)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://sselfie.ai/api/admin/quality-report?format=text"
```

Or visit in browser (admin only):
```
https://sselfie.ai/api/admin/quality-report
```

---

## That's It!

**Total Time**: 5 minutes  
**Result**: Quality monitoring active

---

## Quick Commands

### Check if monitoring is working:
```bash
# Check logs
grep "PROMPT-QUALITY" logs/app.log

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*), source FROM prompt_quality_metrics GROUP BY source;"
```

### View weekly report:
```bash
curl https://sselfie.ai/api/admin/quality-report?format=text
```

### Get quick verdict:
```bash
curl https://sselfie.ai/api/admin/quality-report?action=verdict
```

---

## Troubleshooting

**No metrics collected?**
- Check `ENABLE_QUALITY_MONITORING=true` is set
- Check logs for `[PROMPT-QUALITY]` messages
- Verify database table exists

**Scores are null?**
- Expected! Face consistency and stability not yet implemented
- Realism score should have values

**Report shows "insufficient data"?**
- Generate more images (need at least a few)
- Try `?days=1` for recent data only

---

## Next Steps

1. ✅ Setup complete
2. ⏭️ Let run for 1-2 weeks to collect baseline
3. ⏭️ Review first weekly report
4. ⏭️ Enhance signals (face consistency, CLIP score)

---

## Full Documentation

See: `docs/_CANONICAL/PHASE_2C4_3_PROMPT_QUALITY_BASELINE.md`

---

**Status**: ✅ Ready to use
