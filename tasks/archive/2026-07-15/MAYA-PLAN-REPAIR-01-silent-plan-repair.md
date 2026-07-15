# MAYA-PLAN-REPAIR-01: Maya fixes her own plan before the member ever sees it

Status: shipped 2026-07-15. Sandra approved 2026-07-15 (explicit yes on the Stage-1 corrective
loop under the creative freeze).
Freeze compliance: read `docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md` first. This task
adds ORCHESTRATION (validation feedback on a tool call), not prompt-framework changes.
`tests/maya-prompt-framework-freeze.test.ts` must stay green with UNCHANGED snapshots.

## The evidence (member pulse, 14 days to 2026-07-15)

The #1 live friction after the credit fixes. Maya's Stage-1 plan fails validation and the
MEMBER gets the error:

- 17x client block "Ask Maya for a fuller shoot plan first" (`thin_shoot_plan`), daily
  occurrences including 2026-07-14 and -15.
- Server `plan_invalid` rejections: "photoshoot needs at least 6 shots, got 5",
  "photoshoot needs 1-2 true-detail shots, got 0",
  "story_sequence outputCount must be 3, 5, or 7, got 1" (2x).

An expert never shows the member her homework mistakes. Maya should repair the plan
silently and only ever present a valid one.

## Where the pieces live

- Stage 1 emits plans: `app/api/app-v3/maya/chat/route.ts` via the `emit_concepts` tool.
  A repair hook ALREADY exists for schema errors (`experimental_repairToolCall`, see the
  comment near line 321). Extend this pattern to SEMANTIC plan validation.
- Photoshoot rules: `validatePhotoshootBriefs` in `app/api/app-v3/maya/generate/route.ts`
  (~line 304): >=6 shots, every shot has a shotRole, >=4 distinct roles, exactly 1-2
  true-detail shots.
- Story rules: `lib/app-v3/maya/creative-plan.ts` (~line 298): outputCount 3, 5, or 7.
- Client backstop: `generatePhotoshootSet` in `components/app-v3/maya-concierge.tsx`
  rejects <6 concepts with `thin_shoot_plan`.

## Build

1. Extract the semantic validators into a shared module (verbatim moves, no rule changes)
   so chat route, generate route, and tests use ONE set of rules.
2. In the chat route, validate `emit_concepts` output for photoshoot and story-sequence
   plans at tool-call time. On failure, feed the exact validator errors back through the
   existing repair path so the model re-emits a corrected plan. Cap at 2 repair attempts,
   then fall through to today's behavior (never an infinite loop, never a silent hang).
3. Log `suite_plan_repaired` (behavior analytics: format, attempt count, errors fixed) so
   the vibe check can watch repair frequency; if repairs trend up, Stage 1 itself needs
   attention (that decision goes to Sandra, not this task).
4. Keep the generate-route validators and the client `thin_shoot_plan` check as backstops.
   Soften the client copy to put the work on Maya, not the member (short, warm, no
   m-dashes): e.g. "Let me finish the full shoot plan first. Ask me again in a moment."
5. Tests: unit-test the shared validators; test the repair loop (invalid plan -> corrective
   feedback -> valid plan accepted; two failures -> graceful fallback); extend the freeze
   test ONLY if a snapshot would change (it must not - if it does, stop and ask Sandra).

## Acceptance

- A Stage-1 plan with 5 shots or 0 true-detail shots never reaches the member; the repaired
  plan renders as if nothing happened.
- `thin_shoot_plan` and `plan_invalid` events trend to ~zero in the week after deploy.
- Prompt-framework freeze snapshots unchanged. Full suite green before merge.

## As built

- `emit_concepts` now shares the same photoshoot and story-count validators used by the
  generation backstops.
- A semantic failure feeds its exact errors into Maya's concept-writing repair call, capped at
  two attempts. A still-invalid result returns to the existing graceful fallback instead of
  reaching the member.
- Successful repairs emit `suite_plan_repaired` with format, attempt count, and fixed errors.
- The frozen prompt/persona snapshots remained byte-unchanged.
