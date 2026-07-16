# Go-live checklist — "Your Next Campaign" (target: Thursday 2026-07-16 morning)

Owner legend: [C]=Codex · [Cl]=Claude · [S]=Sandra. Order matters; gates are real — the
launch moves to Friday only if a gate fails, never for polish.

## Today, before 18:00 (parallel; nothing touches the live event)

- [C] Pull main. Implement on `codex/campaign-outcome-held`:
  the approved copy sheet (docs/product/CAMPAIGN_COPY_POLISH_2026-07-15.md sections A + B),
  and the evidence items (section B2): itemized service-tier deliverable list on landing +
  buyer page; generator grounded in Sandra's proven-patterns corpus (viral-DNA hooks) with
  a per-campaign traceability note; redo-request tracking surfaced in the admin QA queue.
  Full suite + type-check + check:voice on the branch tip when done.
- [Cl] Launch content pack drafted (email broadcast, reel script + hooks, Stories
  sequence, ManyChat CAMPAIGN setup card, offer frame block) → to Sandra as drafts.
- [S] ~30 min total: word-tweaks on the content pack; pick/record the reel footage (your
  real footage only); 2-4 likeness corrections for the memory store (5 min, still open);
  tonight grab the card statements for tomorrow's expense audit.
- [S] 15:00-17:30: closing Stories for the One Selfie event as planned. 18:00: event
  closes itself (server-owned deadline).

## Tonight, after 18:05 (Claude drives; flag stays OFF throughout)

1. [Cl] Final One Selfie numbers pulled (Stripe + attribution) → postmortem draft.
2. [Cl] Adversarial money review of the held branch — MANDATORY, no exceptions:
   stripe-credit-reviewer on `lib/payments/lifecycle/*` changes, the new
   `campaign-outcome` handler, dunning/recovery routes (`app/api/stripe/recover-payment*`),
   checkout-recovery cron, and payment-reconciliation changes. Any UNSAFE finding is
   fixed and re-reviewed before merge (calendar-branch precedent).
3. [Cl] Independent full suite + type-check + voice on the branch tip (never trust the
   report). Review `app/one-selfie/page.tsx` tracking addition (touches the now-closed
   event page — safe after close).
4. [Cl] Migration `migrations/20260715_campaign_outcome_orders.sql` reviewed, then run
   against Neon in the deploy window.
5. [Cl] Land on main LINEARLY (cherry-pick/rebase — main rejects merge commits), deploy,
   verify production healthy. Dunning + Smart Retries go live tonight with this merge —
   an unconditional win (31% of past cancellations were payment failures).
   Author rule (fixed 2026-07-15): commits must be authored
   `Sandra Sigurjonsdottir <ssa@ssasocial.com>` — Vercel warns it may refuse deploys it
   cannot attribute (the old `north@sselfie.ai` identity is retired; global + repo git
   config corrected). Cherry-pick PRESERVES original authorship, so after cherry-picking
   run: `git rebase origin/main --exec 'git commit --amend --reset-author --no-edit'`
   and confirm `git log --format="%ae" origin/main..HEAD` shows only ssa@ssasocial.com.
6. [Cl] End-to-end TEST-MODE order in production: checkout → intake → generation → admin
   QA queue → delivery page + email → download → Day-7 links resolve. Proof screenshots
   or event-log excerpts saved for the morning.

## Thursday morning (decision, then launch)

1. [Cl] Postmortem final: event close data + attribution verdict + the bundle-buyer
   cohort's behavior → one honest page.
2. [Cl] Offer-architect verdict: market-intel memo + close data together → keep/change on
   composition, frame, price. Material change = launch shifts, honestly.
3. [S] Final copy yes on the implemented pages (they carry your approved lines; this is a
   read-through, not a rewrite).
4. [Cl] Flag on (`CAMPAIGN_OUTCOME_ENABLED`), landing + checkout smoke-checked live.
5. [S] Optional but recommended: place order #1 yourself end-to-end on your phone — you
   experience exactly what buyers will, and it seeds the QA muscle before strangers arrive.
6. [S] Send the launch email (your approved draft, attended send) · post the reel · run
   the launch Stories · turn on the ManyChat CAMPAIGN keyword (setup card provided).
7. [Cl] Live monitoring: checkout starts, orders, generation health, redo requests (the
   price-holding metric from order one), QA queue depth. Also: per-asset download ranking
   (which deliverable excites buyers most — reel vs photos vs carousel is queryable from
   the asset-type events) and Sandra collects buyer DM quotes VERBATIM (their words become
   the next copy iteration; ours are done). Founding batch stays ≤10 orders
   with Sandra QA per order; if orders run past the cap, the honest lever is stated
   delivery time, never fake scarcity.

## Fast-follows (next week; reviewed, explicitly NOT launch blockers)

1. Regenerate should reuse already-finished assets instead of re-running all photos +
   clips per click (business-cost hygiene; attended-only so it cannot loop, per re-review).
2. One-click "Resend intake email" admin action + add campaign_outcome to
   /api/access-recovery so a buyer who loses the intake email can self-serve. Until then:
   the queue's stable "Open buyer page" link is the attended workaround.
3. Redaction pass on webhook logging (session metadata includes customer email;
   pre-existing, not campaign-introduced).
4. Typo-domain guard at fulfillment (proven need 2026-07-15: a $134 buyer typed
   `gmail.co` at Stripe checkout — Starter Kit + bundle deliveries bounced for 3 days
   and her account/auth/token records were keyed to the phantom address; rescued
   attended). When the checkout email's domain is a known typo of a major provider
   (gmail.co/gmail.con/hotmail.co/outlok.com …), flag the order for admin review on
   the queue instead of silently sending into a bounce.

## Standing rules

The 48h delivery clock and the still-you guarantee are load-bearing promises — nothing
launches if the end-to-end test cannot honor them. All sends are Sandra-attended. Gates
from the offer contract stay in force (checkout-start rate, purchases, completion,
publish-confirmation, redo rate, repeat rate). No income promises anywhere.
