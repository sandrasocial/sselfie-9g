# The SSELFIE SUITE membership — what a member receives (2026-07-15)

Status: MEMBER VALUE CONTRACT, Sandra-directed 2026-07-15 ("we need to work on the
membership — the recurring suite and calendar for membership users"). This document defines
what the recurring membership DELIVERS, ties the in-flight builds to it, and names the two
missing pieces (specced alongside) plus one decision only Sandra can make.

Boundary (contract v3 stays law): this is PRODUCT work for existing and arriving members —
grandfathered people deserve the better product regardless of the commercial test. Pricing,
trial mechanics, and any new subscription ASK stay gated on the campaign repeat-purchase
data. Nothing here re-opens that sequence.

## The honest problem this solves

The membership churned because it was access-shaped: pay monthly for a machine you must
operate. The customers said it in Stripe's cancellation records: "I dont need them every
month" (job frequency), "The photos just never looked exactly like me" (likeness), "I could
see it's AI" (visible tells), plus 31% involuntary (dunning). A durable membership must be
delivery-shaped: value arrives whether or not she has energy that week, it looks like her,
and it compounds the longer she stays.

## What a member receives (the promise, in her words)

> Your brand stays alive every month. The photos look like you. The posts are written. The
> plan is one tap. And Maya knows you better every single month.

The monthly rhythm:

1. **The 1st: her month arrives.** Maya drafts the month (live: auto-draft + monthly cron,
   fixed 2026-07-14) and the next week's person-slots arrive ALREADY GENERATED
   (CALENDAR-UPGRADE-01, in build — rolling 7 days, business absorbs image cost, capped).
2. **Every day: one tap to stay visible.** Calendar "Today" strip: image ready to download,
   caption ready to copy, "posted" tap that finally works and is measured
   (Phase A, live 2026-07-15).
3. **Any moment: Maya, who remembers her.** Likeness notes anchor every render (live in
   both suite + admin pipelines; per-member notes seeded via chat or support). Vault
   collections reachable again from Create (MAYA-ARRIVAL-01, in build). Campaign-intake
   memory merge (MAYA-MEMORY-MERGE-01, specced today): if she ever bought a campaign, Maya
   already knows what she sells before her first member session.
4. **Month end: proof it was worth it.** "Your month" recap (MEMBER-RECAP-01, specced
   today): what was delivered, what she downloaded, what she marked posted, one suggestion
   for next month. Value made visible right before the renewal date, honestly — if the
   recap is empty, that is OUR signal to intervene, not a reason to hide the email.
5. **Never lost to a card failure.** Dunning + failed-payment recovery (built on the held
   campaign branch, goes live with it — 31% of past cancellations were involuntary).

## Already in flight toward this (no new work)

| Piece | State |
|---|---|
| Calendar trust repairs (post overlay, scroll, dead-ends, bulk gen, mark-posted) | LIVE 2026-07-15 |
| Monthly auto-draft cron eligibility | LIVE (fixed 2026-07-14) |
| Delivered month + Today strip | CALENDAR-UPGRADE-01 — Codex worktree open |
| Legacy cleanup under it | CALENDAR-CLEAN-01 — in build |
| Vault access from Create + member-aware vault page + pre-selfie question path | MAYA-ARRIVAL-01 — in build |
| Dunning / Smart Retries / recovery emails | Built on `codex/campaign-outcome-held`, goes live after event close |
| Likeness memory pipeline | LIVE both pipelines; Sandra's own notes still unseeded; member seeding via Maya works |

## New pieces (specced 2026-07-15)

- `tasks/MEMBER-RECAP-01-your-month.md` — the monthly member recap (email + in-app card).
- `tasks/MAYA-MEMORY-MERGE-01-campaign-intake.md` — campaign intake → member brand memory.

## The one decision only Sandra can make: PAUSE instead of cancel

"I dont need them every month" is a rhythm problem, not a rejection. A visible
"Pause my membership" (1 or 2 months, keeps her gallery/memory/likeness, no charge, auto
resumes) converts episodic need from a cancellation into a breath. Industry-wide this is
one of the strongest voluntary-churn levers for exactly this audience; it is also honest —
we stop charging when she is not using it. Costs: deferred revenue, one more billing state
(Stripe supports pause natively), account UI clarity (billing UI must keep membership /
fixed pass / lifetime distinct — existing law). RECOMMENDED, but it changes what members
are promised, so it ships only on Sandra's explicit yes, as its own spec after that yes.

## What we deliberately do NOT do now

No pricing changes. No new subscription ask anywhere. No forced migration of the 8 current
members or trial/pass holders (grandfathered). No Monthly-Drop commercial framing until the
campaign repeat gate reads (contract v3). No new member-facing tab or navigation surface —
everything lands inside the existing Calendar tab, Maya, email, and account page.

## How we measure a healthy membership (phase-2 benchmarks, product side)

Monthly per-member: delivered posts, downloads, posted-taps (the outcome), Maya sessions,
recap opens. Business: voluntary churn under 5%/month once the delivered experience is what
members actually receive; involuntary recovered by dunning. First read after the delivered
month has run for one full cycle.
