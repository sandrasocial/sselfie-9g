# MEMBER-RECAP-01 — "Your month" member recap

Status: READY for Codex 2026-07-15. Parent contract:
`docs/product/SUITE_MEMBERSHIP_VALUE_2026-07-15.md`. Build after CALENDAR-UPGRADE-01's
events exist (it depends on delivered/posted data). All customer copy DRAFT for Sandra.

## What it is

Once a month, every active member (membership or active fixed pass) receives one honest
recap of what SSELFIE delivered and what she did with it — value made visible right before
renewal, and an early-warning signal when a member got nothing.

## Shape

1. **Email** (the primary surface; `renderPersonalNote`, Sandra's letter voice):
   delivered posts this month · images she downloaded · posts she marked posted · her
   best moment (first posted day, or first download) · ONE next-month suggestion (from her
   plan's theme; never generic filler) · one quiet link: "Open your month". No charts, no
   dashboard voice, no shame if numbers are low — if she used nothing, the email says the
   honest version: "Your month is still sitting there, ready. Want me to swap the vibe?"
   with a link to the calendar.
2. **In-app**: a small "Your month" card on the Calendar tab for the last 3 days of the
   month (reuse the explainer-card pattern; dismissible; no new tab).

## Rules

- Data: counts from feed_posts (delivered/pregenerated), `suite_image_downloaded` and
  `calendar_post_published` analytics events, Maya session counts. Behavior data only —
  never money numbers in a member email.
- Cron: monthly, last day 08:00 UTC, idempotent per member per period (dedupe key
  `member-recap:{userId}:{period}`); skip members created <14 days ago (their recap would
  be noise); skip if zero data AND zero plan (nothing honest to say — but log the skip
  count, that's a health metric for us).
- Kill switch env `MEMBER_RECAP_DISABLED`. Default OFF in prod until Sandra approves copy.
- Update `docs/AUTOMATION_ROSTER.md` in the same PR (new repo-lane automation, customer
  lifecycle email). Respect unsubscribe (marketing flag rules as used by Day-7 email).
- `pnpm check:voice` green; no em-dashes; no income claims; numbers must be queryable-true.

## Acceptance

- Tests: idempotency (no double-send per period), skip rules, zero-data variant copy path,
  kill switch. Dry-run proof in PR: one synthetic member rendered both variants.
- Full suite + type-check green. Copy DRAFT for Sandra with both variants shown.
