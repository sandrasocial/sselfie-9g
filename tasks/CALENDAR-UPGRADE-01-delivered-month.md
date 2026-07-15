# CALENDAR-UPGRADE-01 — the month arrives finished (Phase B v1)

Status: READY for Codex 2026-07-15. Build order: start AFTER CALENDAR-CLEAN-01 lands (this
builds on the cleaned base) — design/scaffolding may start immediately. Ships DARK behind
`CALENDAR_DELIVERED_MONTH_ENABLED` (default off); Sandra flips it after trying her own
account. Evidence base: `docs/audits/SUITE_CALENDAR_AUDIT_2026-07-14.md` (usage truth) and
the v3 decision contract `docs/business/ONE_SELFIE_WEEK_OUTCOME_TEST_2026-07-16.md`.

## Why (one paragraph of data)

Members stall exactly where the calendar switches from delivering to assigning: 72% of
planned posts have captions, 14% ever got an image, 0 were ever marked posted. Maya already
drafts the month (auto-draft + cron, fixed in Phase A); the missing piece is that every day
then demands the member generate her own image. The flip: the month arrives FINISHED enough
to use — open calendar, see today, download, copy, post, tap done.

## Product shape (v1 — deliberately small)

1. **Rolling pre-generation, one week ahead.** When a month plan exists (auto-draft or
   member-created), the system pre-generates images for PERSON slots in the next 7 days
   that have none, using her existing identity references + the plan's feed style world via
   the EXISTING feed generation pipeline (the Phase A per-post claim/charge machinery).
   Rolling: a scheduled job tops up so ~7 upcoming days are always ready. Flatlay/detail
   slots keep their existing on-tile generation.
2. **Credits: the business absorbs pre-generation in v1.** Pre-generated slots charge ZERO
   member credits (silent credit drain is forbidden — this week's credit lesson). Guardrails:
   env cap `CALENDAR_PREGEN_WEEKLY_CAP` (default 10 images/member/week), only members with
   active membership/pass, only current-period plans, skip members with zero uploaded
   selfies. Track spend via a `pregenerated=true` marker on feed_posts (or equivalent) so
   cost is queryable. If a member REGENERATES a pre-made slot, normal credit rules apply.
3. **"Today" strip at the top of the Calendar tab**: today's post front and center — image,
   caption, three actions: Download · Copy caption · Mark as posted (the Phase A-fixed
   route). Empty state ("nothing scheduled today") points at the next ready day. Reuse the
   ThisWeekStrip visual pattern; light editorial, design-system tokens, no new colors.
4. **Posted feedback loop**: marking posted records `calendar_post_published` in
   analytics_events (behavior only — Admin Data Contract) so we finally measure the
   calendar's real outcome.
5. **Campaign-kit compatibility note (build nothing yet)**: CAMPAIGN-OUTCOME-01 fulfillment
   will later place finished campaign posts onto calendar days by writing feed_posts rows
   with `scheduled_at` + image + caption. Keep that write path viable (no schema/contract
   changes that would block it).

## Explicitly OUT of scope (v1)

Stories on the calendar. Any subscription/pricing/Monthly-Drop framing (commercial decision
gated on the campaign read — this ships as a product improvement to existing members). Full
grid redesign. Multi-week pre-generation. Auto-posting to Instagram (never). Changes to the
member Maya chat pipeline.

## Acceptance

- Flag off: zero behavior change anywhere (prove with the Phase A contract tests + smoke).
- Flag on (staging/Sandra's account): a member with a current plan sees the next 7 person
  slots fill within the job's cadence without spending her credits; Today strip actions all
  work on a 375px viewport; regenerating a pre-made slot charges normal credits exactly once
  (per-post claim respected — no double charge; extend `tests/calendar-phase-a-contract.test.ts`
  with the pregen money invariants).
- Pre-generation failures are per-slot and silent to the member (slot simply stays in the
  old tap-to-generate state) but logged; no zombie `generating` rows (Phase A recovery rules
  apply).
- Full suite + type-check + check:voice green; all new member-visible copy DRAFT for Sandra;
  no em-dashes.
