# STORY-SEQUENCE-01: fix the weakest format or bench it

Status: shipped/verified 2026-07-15 (measurement gate remains for 2026-07-29).
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

## Investigation and as-built result

- Production telemetry confirmed both July 4-5 policy incidents were OpenAI false positives
  labeled `safety_violations=[sexual]`. The member concepts were benign motherhood/business
  stories: building a business with three children, and teaching children that their mother's
  dreams matter too. No sexual request was present in either chat.
- Graphic/story rendering already reached retry parity on 2026-07-05 in commit `1b013813`: the
  first policy rejection is retried once with the shared safety sanitizer and `moderation: low`.
  Only a second rejection reaches the copy that says Maya softened it. Focused regression tests
  pin both the retry and the honest double-rejection detail.
- Story output-count failures are now repaired by `MAYA-PLAN-REPAIR-01` before concept cards render.
- The generation charge uses one durable request reference; immediate failures refund against
  that reference, and the five-minute reconciliation path settles charged-but-undelivered assets.
- Measurement remains `suite_image_generated` versus `suite_generation_failed`, filtered to
  `format=story-sequence`. Re-evaluate the 20% gate on 2026-07-29; this release does not remove
  the format.
