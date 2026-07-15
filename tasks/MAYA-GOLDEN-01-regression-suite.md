# MAYA-GOLDEN-01: golden regression suite for Maya's creative pipeline

Status: ready for Codex (Phase A). Phase B runs attended with Sandra.
Context: `docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md` - read first. The freeze holds
until this suite exists and passes a baseline run.

Goal: every future change to Maya's prompts, models, retrieval, or memory is proven safe
against a fixed golden set BEFORE it reaches members. No more "it felt off".

## Phase A: deterministic layer (no image spend, runs in CI)

1. Extend `tests/maya-prompt-framework-freeze.test.ts` with snapshots for the remaining
   formats: carousel, reel-cover, story-slide (fixed `graphic` specs), the photoshoot
   scene-foundation path (`sceneTemplate` set), and the inspiration modes (close-recreate,
   set-variation).
2. Snapshot the Stage-1 system prompt assembly: build the chat system prompt for a fixed
   member context (fixed brand profile, memory, vault list) and snapshot it. Assemble it via
   the same code path `app/api/app-v3/maya/chat/route.ts` uses (extract a pure builder if
   needed - extraction must be verbatim, byte-proven, like WEBHOOK-01).
3. Add a test that pins model routing: the task-to-model map in `lib/maya/openrouter.ts`
   (chat_pro etc.) and the explicit thinking/reasoning-disabled settings. A model bump must
   fail tests until the map snapshot is deliberately updated (this is how the July 9
   thinking-default incident becomes impossible to repeat silently).

## Phase B: golden image runs (attended, costs credits, Sandra scores)

1. Fixed inputs, stored in the repo: 3 reference selfies (Sandra's QA set), 6 golden concept
   briefs covering photo, photoshoot hero, carousel cover, reel cover, story slide, and one
   inspiration recreate. Never change these inputs; version them if they must evolve.
2. A script (`scripts/maya-golden-run.ts`) that generates N=20+ images per brief through the
   REAL generate route against a QA account, saves outputs + compiled prompts + params to
   `output/golden/<date>/`, and prints a scoring sheet.
3. Scoring, two layers, 0-10 each, scored by Sandra (or the suite-ux auditor agent for a
   first pass). Store scores as JSON next to the run.
   - Technical: identity preservation, lighting realism, composition, realism, prompt
     adherence.
   - Brand (the real differentiator, weighted at least equally): looks like the same person,
     looks editorial, feels premium, fits the member's brand, emotional impact, and the
     decisive one: "would I actually post this?"
4. Baseline: run once on the CURRENT frozen pipeline and commit the scores. Every proposed
   creative change reruns the suite and must match or beat baseline statistically (20+
   generations, not one impression) before merge. Rerun the baseline monthly even when the
   repo is unchanged: hosted image models drift server-side, and the visual baseline is how
   that drift gets caught instead of felt.
5. Guardrails: QA account only (`orriaamodt@gmail.com`, excluded from analyses), never a real
   member; runs are attended; costs are visible in the script output before it starts.

## Explicitly out of scope

- Any change to prompts, models, retrieval, or memory themselves. This task MEASURES; it
  never tunes. Tuning proposals go to Sandra with baseline-vs-candidate scores attached.
