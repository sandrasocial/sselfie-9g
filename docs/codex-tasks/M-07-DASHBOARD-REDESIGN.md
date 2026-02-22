# TASK M-07 — Dashboard Redesign (Stage 2)
Priority: Backlog · Do AFTER first cohort seat closes
Estimated time: 2-3 hours

## Objective
Redesign the Brand Engine admin dashboard to show metrics that actually help Sandra make decisions during a live launch sprint.

## Problem
Current dashboard is confusing because:
- Lead source shows "UNKNOWN" for all leads — no way to know what's working
- Action board (CALL / OFFER / FOLLOW-UP) shows zeros with no context
- Checkout mode conversion panel is unclear
- No visibility into DM reply rates or info pack conversion
- Design feels unfinished and hard to scan quickly

## What we want instead
A clean, scannable dashboard Sandra can open on her phone and immediately know:
1. How many leads are in each stage
2. Where leads are coming from (ig_story / ig_poll / ig_keyword / direct)
3. Who needs follow-up today
4. How close we are to filling 12 cohort + 2 VIP seats
5. Cash collected vs target

## New metrics to display
- Total leads · by source
- Info packs sent (cohort vs VIP)
- Emails collected
- Applications received
- Calls booked
- Closed won (cohort vs VIP)
- Cash collected · progress bar toward €29,964 target (12 x €2,497)
- Days remaining to March 16

## Lead source tagging
Every lead must be tagged at entry with source:
- ig_keyword_march
- ig_poll_dm
- ig_story_reply
- ig_story_viewer
- direct
- unknown (fallback only)

## Design notes
- Mobile first — Sandra uses this on her phone
- Scandinavian aesthetic — clean, minimal, no clutter
- Match sselfie.ai brand colors
- One screen = full picture, no scrolling for key metrics

## Scope
- Redesign /admin/brand-engine-applications UI
- Add lead source field to database + intake form
- Update Quick Add DM Lead form to include source dropdown
- Add progress bars for cohort seats (0/12) and VIP spots (0/2)

## Out of scope
- Do NOT touch application form that leads fill in
- Do NOT touch payment or Stripe logic
- Do NOT touch email flows or cron jobs

## Acceptance criteria
- [ ] Dashboard loads cleanly on mobile
- [ ] All new metrics visible above the fold
- [ ] Lead source tagged on all new entries
- [ ] Progress bars show correct seat counts
- [ ] No broken layouts or console errors

## Do this AFTER
First cohort seat is closed and paid. Not before.
