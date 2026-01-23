---
title: Feed Planner V2 Implementation Plan
date: 2026-01-20
status: In Progress
---

# Feed Planner V2 Implementation Plan

## Current State Analysis (Read-Only)

### V1 Feed Planner Inventory (lib/feed-planner)

**Keep (core plumbing and used in production flows):**
- `access-control.ts` (access gating for feed planner)
- `prompt-shaper.ts`, `scene-resolver.ts`, `scene-consistency.ts` (canonical V1 pipeline)
- `database-loader.ts` (V1 prompt admin tables loader)
- `generation-helpers.ts` (category/mood resolution, used in V1)
- `nano-banana-adapter.ts`, `build-single-image-prompt.ts` (legacy paths referenced)
- `template-placeholders.ts` (tests + legacy path coverage)

**Legacy (still referenced but intended to be phased out):**
- `dynamic-template-injector.ts`
- `feed-prompt-expert.ts`
- `visual-composition-expert.ts`
- `style-coherence-resolver.ts`
- `fashion-style-mapper.ts`
- `extract-aesthetic-from-template.ts`

**Deletable candidates (unused or superseded; do NOT delete yet):**
- `caption-templates.ts`, `caption-writer.ts`
- `content-calendar.ts`
- `instagram-strategy-agent.ts`
- `mode-detection.ts`
- `queue-images.ts`
- `rotation-manager.ts`

### Canonical V1 Data Flow

**Primary generation path:**
- Route: `app/api/feed/[feedId]/generate-single/route.ts`
- Scene resolution: `lib/feed-planner/scene-resolver.ts`
- Prompt build: `lib/feed-planner/prompt-shaper.ts`
- Replicate: `lib/nano-banana-client.ts`

**Preview grid generation:**
- Route: `app/api/blueprint/generate-grid/route.ts`
- Prompt build: `lib/feed-planner/scene-consistency.ts`

### Maya / Claude Integration
- Existing prompt generation: `app/api/maya/generate-feed-prompt/route.ts`
- Batch prompts: `app/api/maya/generate-all-feed-prompts/route.ts`
- Anthropic key is already configured in production.

---

## V2 Database Schema

### `feed_styles_v2`
- `id` (PK), `name` (unique), `description`
- `preview_prompt`, `preview_prompt_approved`
- `preview_test_image_url`
- `enabled`, `created_at`, `updated_at`

### `scene_prompts_v2`
- `id` (PK), `feed_style_id` (FK), `position` (1–9)
- `prompt_text`, `is_primary`, `variation_name`
- `approved`, `test_image_url`, `created_at`, `updated_at`
- Unique constraint `(feed_style_id, position, is_primary=true)`

### `user_feed_generations_v2` (optional)
- `id`, `user_id`, `feed_style_id`, `generation_date`
- `prompts_used` (jsonb), `created_at`

### Feature Flag
- `users.use_feed_planner_v2` (boolean)

---

## V2 File Structure

**DB/migrations:**
- `scripts/migrations/2026-01-20-create-feed-planner-v2.sql`
- `scripts/seed-feed-planner-v2.ts`

**Admin UI:**
- `app/admin/feed-styles-v2/page.tsx`

**API routes:**
- `app/api/admin/feed-styles-v2/route.ts`
- `app/api/admin/feed-styles-v2/[id]/route.ts`
- `app/api/admin/scene-prompts-v2/route.ts`
- `app/api/admin/scene-prompts-v2/[id]/route.ts`
- `app/api/admin/scene-prompts-v2/[id]/approve/route.ts`
- `app/api/admin/scene-prompts-v2/[id]/unapprove/route.ts`
- `app/api/admin/generate-prompts-with-maya/route.ts`
- `app/api/admin/generate-variation/route.ts`
- `app/api/admin/test-generation/route.ts`

**Runtime helpers:**
- `lib/feed-planner-v2/feature-flag.ts`
- `lib/feed-planner-v2/prompt-loader.ts`
- `lib/feed-planner-v2/generation.ts`
- `lib/feed-planner-v2/maya-prompts.ts`

---

## Maya Integration (V2)

**Approach:**
- Use existing Anthropic API key.
- Dedicated V2 system prompt in `lib/feed-planner-v2/maya-prompts.ts`.
- Generate:
  - Preview prompt (200–250 words).
  - 9 scene prompts (150–200 words each).
  - Variations on demand.

**Validation:**
- Enforce identity anchor in prompts.
- Enforce numbered frames for preview.
- Warn on word count outside targets.

---

## Migration Strategy (No Breakage)

1. Create new V2 tables and seed 7 feed styles.
2. Keep V1 system untouched.
3. Add per-user flag `users.use_feed_planner_v2`.
4. If flag enabled:
   - Use V2 prompts from `feed_styles_v2` + `scene_prompts_v2`.
5. Gradual rollout:
   - Internal users → new users → all users.
6. Rollback:
   - Set `use_feed_planner_v2 = false`.

---

## Risks & Notes

- V2 prompts are authoritative; any missing approvals should block generation.
- V1 and V2 coexist; do not delete V1 files until fully migrated.
- Admin UI is the only editing surface for V2 prompts.
