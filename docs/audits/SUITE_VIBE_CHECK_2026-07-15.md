# Suite Vibe Check - baseline (14 days to 2026-07-15)

Sources: `analytics_events` member pulse (behavior only, per the Admin Data Contract),
`admin_testimonials`, `app_v3_memory`, `ai_images`. Sandra's admin and the QA account
excluded. This snapshot is the BEFORE for the credit/recovery fixes deployed 2026-07-15 and
for the three specs it produced. Rerun weekly with the same queries and compare.

## Happy signals

| Signal | Value |
|--------|-------|
| Photoshoot sets generated / downloaded | 85 / 74 (0% rerun - the hero product) |
| Photos generated / rerun rate | 132 / 14% |
| Members whose downloads exceed generations | Tracy (38/59), Eveliene (14/53), Grethe (20/28), jorden6 (3/22) |
| Power user | Myriam: 103 gens, 82 downloads |
| Trial-cap offer shown -> clicked | 13 -> 4 (31%) |
| Published 5-star review | Laurie Garcia ("+40% reel views after 1 post") |

## Friction signals (ranked)

1. Plan-quality failures, DAILY incl. Jul 14-15: 17x `thin_shoot_plan` client blocks + server
   `plan_invalid` ("needs at least 6 shots, got 5", "needs 1-2 true-detail shots, got 0",
   "story outputCount must be 3, 5, or 7, got 1"). Maya's mistake, member's error message.
   -> `tasks/MAYA-PLAN-REPAIR-01-silent-plan-repair.md`
2. 28x `exception` recoveries (mostly the lost-response photoshoot bug fixed 2026-07-15).
   EXPECTATION: collapses next week; if not, reopen.
3. Story-sequence: 7 gens, 4 failures (57%) - 2 plan, 2 content-policy.
   -> `tasks/STORY-SEQUENCE-01-triage.md`
4. Learning invisible: 2 likeness notes total, 6 named Mayas, review prompt 5 shown / 1
   opened / 0 submitted. -> `tasks/MAYA-LEARNING-01-visible-memory.md`
5. Insufficient-credit blocks: 11 (monetization moment working; watch trial photoshoot burn).

## Concierge list (generate-but-don't-keep = results not feeling like her)

- jenna_teasdale@hotmail.com: 3 gens, 0 downloads, 4 frictions
- theessentialmind8@gmail.com: 3 gens, 0 downloads
- tabowedding2022@gmail.com: 7 gens, 1 download
- orders@rosainstitute.com: 22 gens, only 8 downloads

These four are attended, personal outreach for Sandra - not automation.

## Next-week comparison targets

- photoshoot `exception` recoveries: 35 -> near 0 (proof the 2026-07-15 fixes worked)
- `thin_shoot_plan` + `plan_invalid`: -> ~0 after MAYA-PLAN-REPAIR-01
- story-sequence failure rate: 57% -> <20% after STORY-SEQUENCE-01
- likeness notes: 2 -> climbing after MAYA-LEARNING-01
