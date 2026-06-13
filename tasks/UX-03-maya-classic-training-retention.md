# Task: UX-03 — Maya Classic Training Retention Query

Date: 2026-05-27
Agent: Codex
Priority: Now (no gates required)
Status: Still active, needs schema refresh before implementation

> Status audit 2026-06-13: Genuinely unbuilt. No Studio Member Health admin/report
> output was found. The old query references legacy training paths, so refresh it
> against the current live schema before building.

## Context

Maya has three generation paths: Classic (Replicate LoRA, requires trained model), Quick Photo (OpenAI gpt-image-2, no training required), and Pro (Nano Banana). The LoRA training pipeline is the primary retention differentiator for Studio members — once trained, every generation uses their personalized model.

A code audit (2026-05-27) found that the training completion rate among Studio members is unknown. This matters because:
- Members with a completed LoRA model have a strong reason to stay (consistent likeness in all their images).
- Members who signed up but never completed training have weak retention.
- The Studio churn risk is concentrated in untrained members.

## What To Build

A SQL query (run once now, then expose in admin dashboard) that answers:

1. How many active Studio members exist?
2. How many have started LoRA training?
3. How many have completed LoRA training (model fully trained, `status='completed'` in `user_models`)?
4. How many have ever generated an image using Classic mode (Replicate)?
5. How many have ever generated an image using OpenAI Quick Photo?
6. How many have never generated any image at all?

## Implementation

### Step 1: Run this query on Neon (read-only)

```sql
SELECT
  COUNT(DISTINCT u.id) AS total_studio_members,
  COUNT(DISTINCT um.user_id) FILTER (WHERE um.status IS NOT NULL) AS training_started,
  COUNT(DISTINCT um.user_id) FILTER (WHERE um.status = 'completed') AS training_completed,
  COUNT(DISTINCT gi.user_id) FILTER (WHERE gi.user_id IS NOT NULL) AS classic_generators,
  COUNT(DISTINCT ai.user_id) FILTER (WHERE ai.source = 'openai') AS quick_photo_generators,
  COUNT(DISTINCT ai.user_id) FILTER (WHERE ai.source = 'maya_pro') AS pro_generators,
  COUNT(DISTINCT u.id) FILTER (
    WHERE u.id NOT IN (SELECT DISTINCT user_id FROM generated_images)
      AND u.id NOT IN (SELECT DISTINCT user_id FROM ai_images)
  ) AS never_generated
FROM users u
JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN user_models um ON um.user_id = u.id
LEFT JOIN generated_images gi ON gi.user_id = u.id
LEFT JOIN ai_images ai ON ai.user_id = u.id
WHERE s.subscription_type IN ('studio_membership', 'sselfie_studio', 'studio')
  AND s.status IN ('active', 'trialing')
  AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL);
```

Note: adjust `subscription_type` values to match what is actually in the `subscriptions` table. Check with:
```sql
SELECT DISTINCT subscription_type FROM subscriptions WHERE status IN ('active', 'trialing') LIMIT 20;
```

### Step 2: Add a "Studio Member Health" card to `/admin/prompt-vault` OR create a new `/admin/studio-health` page

This data should be visible in the admin dashboard, not just a one-off query. Add it to the existing admin layout.

Card should show:
- Total active Studio members
- % who completed training
- % who have ever generated an image
- % who have never generated (churn risk segment)

### Step 3: Output a Markdown summary of findings

Create `docs/revenue/STUDIO_MEMBER_HEALTH_2026-05-27.md` with the query results. Sandra needs this to make informed decisions about Studio positioning and whether to reach out to untrained members.

## Why This Matters

If the majority of Studio members have completed LoRA training:
- Studio's retention argument is strong — trained model = personalized images only Maya can produce.
- Do not deprecate or simplify the Classic mode.
- Invest in making training completion easier (onboarding, tutorials).

If the majority of Studio members have NOT completed training:
- Retention is weak and Studio churn is likely.
- Consider a re-engagement email campaign specifically for untrained members.
- Evaluate whether the training pipeline friction is costing more members than it retains.

## Files To Check

- `user_models` table — training status, `trigger_word`, `lora_weights_url`
- `generated_images` table — Classic mode usage
- `ai_images` table — OpenAI Quick Photo and Pro mode usage
- `subscriptions` table — active Studio members
- `app/api/training/` — confirm training status values
- `lib/credits.ts` — confirm credit cost for training (20 credits)

## Do Not Touch

- `app/api/training/start-training/route.ts` — do not modify, query only
- `user_models` table — read-only for this task
- Any live generation routes

## Deliverables

1. SQL results in `docs/revenue/STUDIO_MEMBER_HEALTH_2026-05-27.md`
2. "Studio Member Health" metric card visible in admin (attach to existing admin layout)
3. Flag in output: which Studio members have never generated (for optional re-engagement email)
