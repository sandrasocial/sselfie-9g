# ACTIVATION-FUNNEL-SCORECARD-01 — One admin view of the real activation funnel

## Why

From Codex's 2026-07-12 audit plus verification the same day: the raw events already exist
(confirmed live in `analytics_events`, last 30d counts as of 2026-07-12): `suite_home_viewed` (331),
`activation_selfie_uploaded` (43), `suite_inline_choice_selected` (186), `suite_image_generated`
(424), `suite_image_downloaded` (345), `trial_claimed` (45), `trial_first_generation` (19),
`trial_expired` (42), `trial_cap_offer_shown` (10). Nobody has ever pulled them into one funnel view,
so every activation conversation happens from memory/anecdote instead of a real number. This is a
reporting/aggregation job, not new instrumentation — keep it that way, don't add new event tracking
unless step 4 below finds a genuine gap.

OWNER: codex

## Scope

1. New report (SQL, no new tables) computing, per cohort, the 7-step scorecard:
   1. Opened `/app` → `suite_home_viewed` (distinct user_id/session)
   2. Selected a selfie → `activation_selfie_uploaded`
   3. Chose a look → `suite_inline_choice_selected` OR `suite_next_action_selected` (use whichever
      correlates better with a real "look chosen" moment — check both, pick one, note which and why
      in your PR)
   4. Generated first image → first `suite_image_generated` per user (not total generations — the
      *first* one), falling back to `trial_first_generation` for the trial cohort specifically since
      that event already exists and is first-generation-scoped
   5. Downloaded first image → first `suite_image_downloaded` per user
   6. Returned within 7 days → any qualifying event (2-6 above) again, 1-7 days after their first
      qualifying event
   7. Generated or downloaded again in the following week → same pattern, days 8-14
2. Segment the trial cohort specifically (`subscriptions.product_type='suite_trial'`) by source. There
   is no clean `source` column on `subscriptions` for trial rows — `grantSuiteTrial`'s `source` param
   only ends up in a `credit_transactions` description string, not a queryable column. Join instead
   through `users.email` → `freebie_subscribers.email` → `freebie_subscribers.source` (real column,
   already populated — e.g. `'membership-abandon'` from the recovery flow). Group by that value; if a
   trial user has no matching `freebie_subscribers` row, bucket them as `direct`.
3. Surface this as a new tool card on `/admin/tools` (matches the existing "Check the Prompt Vault
   funnel and customer activity" card pattern already on that page) linking to the report — per the
   Admin Data Contract (rule 5), this is a new tool card on an existing page, not a new top-level nav
   item.
4. While building, if any of the 7 steps genuinely has no usable event (check before assuming), flag
   it in your PR summary rather than silently inventing a proxy — don't add new event tracking without
   flagging it first, this task is scoped to reporting on what already exists.
5. Reference targets to display alongside the real numbers (from Codex's audit, treat as goals to show
   progress against, not hard thresholds to enforce): 70% reach step 2, 50% reach step 4 in the first
   session, 35% reach step 5, 25% reach step 6.

## Acceptance

- The report runs against real data and shows real percentages at each of the 7 steps, for the last
  30 days by default, with the trial cohort broken out by source (kit/vault/email/direct/recovery/etc,
  whatever real values `freebie_subscribers.source` actually contains).
- No new `analytics_events` event names introduced unless a genuine gap was found and flagged in the
  PR — this task reports on existing data.
- One new tool card on `/admin/tools`, no new top-level nav entry, no duplicate of the existing
  Prompt Vault funnel card.
