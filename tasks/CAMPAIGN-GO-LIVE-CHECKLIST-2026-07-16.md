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
   price-holding metric from order one), QA queue depth. Founding batch stays ≤10 orders
   with Sandra QA per order; if orders run past the cap, the honest lever is stated
   delivery time, never fake scarcity.

## Standing rules

The 48h delivery clock and the still-you guarantee are load-bearing promises — nothing
launches if the end-to-end test cannot honor them. All sends are Sandra-attended. Gates
from the offer contract stay in force (checkout-start rate, purchases, completion,
publish-confirmation, redo rate, repeat rate). No income promises anywhere.
