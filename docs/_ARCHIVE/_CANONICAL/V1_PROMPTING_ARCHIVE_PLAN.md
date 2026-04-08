## V1 Prompting Archive Plan

### Goal
Retire all V1 prompt-generation logic and routes after V2 is confirmed stable for all users (new + current). Keep non‑prompt features (captions, strategy, queue).

---

## Phase 0 — Preconditions (no code removal)
1. **V2 fully validated** using the manual test checklist:
   - Style + variation selection persists
   - Preview feed uses selected variation
   - Manual feed uses selected variation
2. **Feature flag decision**:
   - `use_feed_planner_v2 = true` for all users when ready

---

## Phase 1 — Route-by-Route V1 Removal Plan

### A) Core Feed Generation (V1 fallback paths)
1. `app/api/feed/[feedId]/generate-single/route.ts`
   - **Action:** Remove V1 branch and any V1 prompt assembly logic.
   - **Target:** Use V2 prompts only (V2 preview + scene prompts).

2. `app/api/feed/create-free-example/route.ts`
   - **Action:** Remove V1 fallback resolution (`getCategoryAndMood` path).
   - **Target:** Require V2 feed style for preview feeds when V2 is on.

3. `app/api/feed/create-manual/route.ts`
   - **Action:** Remove V1 fallback resolution (`settings_preference` to legacy mood).
   - **Target:** Require V2 feed style (and variation) when V2 is on.

4. `app/api/feed/[feedId]/regenerate-post/route.ts`
   - **Action:** Remove V1 scene-consistency prompt path.
   - **Target:** Regenerate using V2 prompt selection only.

### B) Legacy Strategy / Concept Generation (V1)
5. `app/api/feed/refresh-concepts/route.ts`
   - **Action:** Remove V1 prompt logic (uses brand aesthetic + vibe mapping).

6. `app/api/feed/add-more/route.ts`
   - **Action:** Remove V1 prompt logic (legacy mapping).

7. `app/api/maya/generate-feed-prompt/route.ts`
   - **Action:** Remove V1 template aesthetic extraction usage.

8. `app/api/feed-planner/create-from-strategy/route.ts`
   - **Action:** Remove V1 prompt builder usage (feed-prompt-expert + visual-composition).

### C) Blueprint Legacy Routes (V1)
9. `app/api/blueprint/generate-grid/route.ts`
   - **Action:** Remove V1 prompt assembly (scene-consistency).

10. `app/api/blueprint/generate-paid/route.ts`
   - **Action:** Remove V1 prompt assembly (generation-helpers + scene-consistency).

---

## Phase 2 — Archive V1 Prompting Files (after route removal)

### ✅ Safe to archive
- `lib/feed-planner/generation-helpers.ts`
- `lib/feed-planner/scene-consistency.ts`
- `lib/feed-planner/build-single-image-prompt.ts`
- `lib/feed-planner/nano-banana-adapter.ts`
- `lib/feed-planner/dynamic-template-injector.ts`
- `lib/feed-planner/template-placeholders.ts`
- `lib/feed-planner/rotation-manager.ts`
- `lib/feed-planner/fashion-style-mapper.ts`
- `lib/feed-planner/extract-aesthetic-from-template.ts`
- `lib/feed-planner/visual-composition-expert.ts`

### ✅ Keep (non‑prompt features still active)
- `lib/feed-planner/access-control.ts`
- `lib/feed-planner/caption-writer.ts`
- `lib/feed-planner/caption-templates.ts`
- `lib/feed-planner/instagram-strategy-agent.ts`
- `lib/feed-planner/mode-detection.ts`
- `lib/feed-planner/queue-images.ts`
- `lib/feed-planner/content-calendar.ts`

### ✅ Keep (V2-aligned / admin-only)
- `lib/feed-planner/database-loader.ts`
- `lib/feed-planner/scene-resolver.ts`
- `lib/feed-planner/prompt-shaper.ts`

---

## Phase 3 — V2 Enforcement (final switch)
1. **Set V2 flag on for all users**
2. **Run manual tests again**
3. **Deploy**

---

## Validation Checklist (post‑archive)
- Preview feed generation works for all 7 styles
- Manual feed creation honors selected variation
- Regenerate single post uses V2 prompts only
- No V1 routes are reachable in logs

---

## Rollback Plan
- Restore archived files from `.backups/`
- Re-enable V1 branches in routes above
- Set `use_feed_planner_v2 = false` for affected users
