# STORY-SEQUENCE-01: fix the weakest format or bench it

Status: ready for Codex (investigation first, then the fix path below).
Freeze compliance: read `docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md`. Retry
orchestration and copy are Track B; any change to prompt TEXT stops and goes to Sandra.

## The evidence (14 days to 2026-07-15)

Story-sequence is the weakest offered format: 7 generations, 4 failures (57%).

- 2x `plan_invalid`: "story_sequence outputCount must be 3, 5, or 7, got 1"
  (2026-07-14 and -15) - covered by MAYA-PLAN-REPAIR-01; verify stories are included.
- 2x `content_policy`: OpenAI safety rejections (2026-07-04 and -05). The generate route's
  member-facing copy claims "even after I softened it" - verify the softening/retry pass
  actually runs for the story/graphic job path (`renderGraphicJob` and the photoshoot/photo
  path's `runEditWithRetry` in `app/api/app-v3/maya/generate/route.ts` ~line 948). If the
  graphic path never softens, the copy is dishonest today.

## Build

1. Investigate the two content-policy failures: pull the stored prompts for those runs
   (`ai_images` has none for failures; use the `suite_generation_failed` detail + the
   concept text in the chat) and identify WHAT tripped safety. Report findings in the PR.
2. Bring the story/graphic render path to parity with the photo path's
   content-policy-soften-retry behavior (one soften retry, then honest failure). If parity
   requires new soften PROMPT TEXT, stop: present the text to Sandra for approval before
   shipping (frozen surface).
3. Confirm MAYA-PLAN-REPAIR-01 covers story outputCount repair; if that task ships first,
   only the policy-retry parity remains here.
4. Failed sequences must follow the credit contract: charges carry the request reference and
   the reconcile cron settles undelivered slides (verify, do not rebuild - it shipped
   2026-07-15).
5. Decision gate for Sandra after 2 weeks of data: if story-sequence failure rate stays
   above 20% after these fixes, propose pulling it from the offered formats until it earns
   its place. Ship the measurement, not the removal.

## Acceptance

- Story-sequence failure rate drops below 20% over the following 2 weeks (baseline 57%).
- No dishonest copy: the "softened it" message only shows when a soften retry actually ran.
- Freeze snapshots unchanged; full suite + check:voice green before merge.
