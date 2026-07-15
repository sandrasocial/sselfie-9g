# Campaign build — copy + clarity polish before go-live (2026-07-15)

Status: REVIEW COMPLETE on the held build (`codex/campaign-outcome-held` @ e4824576).
Verdict: the build is strong — honest structure, real examples in every intake field, the
first-post reason is delivered per contract, mechanical voice check passes. What follows is
the judgment layer: places where the copy leaks internal language, undersells the moat, or
misses a feedback moment. ALL customer-facing wording below is DRAFT until Sandra approves
exact words. Implementation items at the bottom are Codex's, no copy approval needed.

Audience + mental state this was reviewed against: a woman 35-64 who sells something,
arriving mid-scroll from Instagram, afraid AI will make her look fake, paying $97 alone on
her phone. Law applied: Brand Constitution (Sandra's Voice + Sandra Test + Creative Bar),
No-Fake psychology doctrine, design system.

## A. Copy changes for Sandra's exact words (ranked)

1. **The guarantee line — SANDRA APPROVED 2026-07-15: use (a).**
   Replace "If the face is clearly wrong, we fix the image once." with:
   **"If you don't recognize yourself in a photo, we redo it."**
   Redo limits live in policy/support, not on the sales page.
   (Sandra also approved the rest of this sheet as drafted the same day — items 2-12 may be
   implemented with the draft wording below; she may still refine exact words before flag-on.)
2. **Hero copy — FINAL, copy iteration CLOSED 2026-07-15 night (round 3; further changes
   only from live buyer data). Sandra locks the words:**
   - Eyebrow: **"For women building something of their own"** — KEPT as a qualifier by
     design. The eyebrow is a 10px label; the scroll-stopping happens in the reel/hooks
     before she ever lands here, and the H1 carries the page. Its one job: "am I in the
     right place?" Division of labor, not a missed emotion.
   - H1 stays: **"Give Maya one selfie. Leave with your next campaign."**
   - Subline v2 — destination first, freeze as recognition, itemization moved OUT (the
     what-you-get panel below the fold carries it): **"For the woman who knows what she's
     building and freezes when it's time to post. One selfie becomes the campaign that
     finally shows people what you're building."**
   Rules unchanged: never "promote" as the selling verb; claims line-checkable (one
   campaign, never "months of content"); itemized list stays structurally on the page
   (it is what separates $97 from template packs) — it just doesn't live in the subline.
2b. **The "Sandra checks" panel goes first-person — the human layer is the premium.**
   Replace the third panel's body with a signed line: **"I look at every image before it
   reaches you. If you don't recognize yourself in a photo, I'll redo it. Your campaign
   lands within 48 hours. · Sandra"**
   (First-person note says "I'll redo it" — warmer; the neutral site-wide guarantee line
   stays exactly as Sandra approved it: "we redo it". Both are correct in their voice.) (Most AI tools are upload, generate, good luck. A named
   human who checks the work is the reassurance buyers at $97 are actually paying for —
   say it in her voice, not in feature language.)
2c. **One emotional anchor line above the final CTA** (the transformation, Constitution-
   true): **"This was never about creating more content. It's about finally becoming
   visible for what you're building."**
3. **"five-day order" → "five-day plan" everywhere.** "Order" collides with purchase-order.
   Appears: landing subline ("five-day order for one promotion"), delivery email ("the
   five-day order Maya prepared"), buyer page section header ("Your five-day order"). The
   .txt export already says PLAN — unify on plan.
4. **"Maya uses your selfie as the identity reference"** — internal jargon. Draft: "Every
   photo starts from your real selfie, and Sandra checks the set before it reaches you."
5. **Failure state shows internal words to a customer.** Buyer page, generation_failed:
   "…will restart it from the admin queue." Draft: "You do not need to do anything. Sandra
   can see your order and will restart it for you. Nothing is lost."
6. **The waiting state never restates the 48 hours** — the one question in her head right
   after submitting. Add to the waiting body: "Everything lands in your inbox within 48
   hours of your details arriving."
7. **Delivery email is missing its most important sentence.** The published-in-7-days gate
   depends on her posting DAY ONE. Add after the link: "Start with post one today. It is
   marked at the top of your page." (+ item 3's term fix in the same email.)
8. **"Tell Maya what needs to be sold."** (buyer page pre-intake heading) — passive, odd.
   Draft: "Tell Maya what you're promoting."
9. **"Sandra checks" panel mixes two clocks.** "A human quality check before the campaign
   reaches you, within 48 hours." Draft: "Sandra looks at every image before it reaches
   you. Your campaign lands within 48 hours."
10. **"CTA:" label on the buyer page** → spell it out: "Call to action:". (Audience is
    35-64; not all speak marketing.)
11. **Published yes/no needs a visible thank-you** (see B3 for the mechanic). Drafts —
    after "Yes, I posted": "Posted. That is exactly what this was for." After "Not yet":
    "No stress. Day one is the smallest step, start there."
12. Optional warmth nit, Day-7 email: add "No pressure either way, I just want to know if
    it helped." before the buttons.

## A2. Supersede note (read before the held-branch spec/contract)

The held branch's own copies of `tasks/CAMPAIGN-OUTCOME-01-your-next-campaign.md` and the
contract's "Audience callout" line still say "for women who already sell something and need
to promote it" — SUPERSEDED by item 2 above (2026-07-15 behavior analysis + swap test).
Where the held-branch docs and this polish doc disagree, THIS DOC WINS. Update those two
lines in the same PR so no future reader re-imports the stale callout.

## B. Implementation polish (Codex, on the held branch, before go-live)

1. **Two side-stripe error boxes violate the design ban**: landing `checkoutFailed`
   (`campaign-landing.tsx` ~line 101, `border-l-2 border-white`) and the intake error
   (`campaign-order-experience.tsx` ~line 150, `border-l-2 border-red-700`). Restyle as
   full 1px border + tinted background, no left-stripe.
2. **Intake submit does `window.location.reload()`** (`campaign-order-experience.tsx:51`).
   Replace with a state transition to the waiting view — same page, no flash (the exact
   pattern class we removed from the calendar).
3. **`?published=yes|no` records silently** — she acts, nothing acknowledges. Render the
   A11 banner once on load when the param is present, then strip the param from the URL.
4. **`firstPostReason` grammar seam**: the buyer page renders "Start with post one because
   {firstPostReason}" but the schema (`generator.ts:29`, min 10 max 300) doesn't constrain
   shape — a capitalized full sentence renders broken. Either constrain the generator
   prompt to a lowercase clause completing "because…", or render it standalone: "Start with
   post one. {firstPostReason}".
5. **Go-live review checklist (tonight, after 18:05, before flag-on):** the branch touches
   payment lifecycle heavily (`subscription-events.ts` +165, `invoice-paid.ts`,
   `checkout-session-completed.ts`, new recovery routes + dunning). Full adversarial pass
   before merge: stripe-credit-reviewer on every money path, full suite + type-check +
   voice on the branch tip, linear-history landing (main rejects merge commits), and a
   review of the `app/one-selfie/page.tsx` tracking addition (measurement-only, but it
   edits the live event page — merge only after the event closes).

## B2. Evidence-driven additions (market intel 2026-07-15 — see
`docs/business/MARKET_INTEL_OFFER_AND_MEMBERSHIP_2026-07-15.md`)

1. **Itemized deliverable list on landing + buyer page**, line by line in service-tier
   format (the market's $99/mo DFY tier justifies its price with a line-item list; a count
   of posts reads as an $8-25 template pack). Lead every list with the strategy + human
   layer, never the asset count.
2. **Generator grounding**: campaign hooks/structures generated FROM Sandra's proven
   corpus (viral-DNA reel analysis, hook patterns) with a per-campaign traceability note,
   so "built from patterns proven in this niche" is a true, checkable claim on the page.
3. **Track redo/refund-request rate from order one** vs the industry ~1-in-3
   identity-drift baseline — this single metric decides whether $97 holds (and later
   whether $149+ is earned). Surface it in the admin QA queue.
4. Do not lead with the redo guarantee as THE differentiator — it is table stakes at the
   $18-75 tier; pair it with the human-check + strategy proof points.

## C. Explicitly fine (reviewed, do not churn)

Intake field examples (excellent), numbered steps, single CTA "Start my campaign",
"One payment. No subscription." reassurance, footer privacy note, per-asset download
labels, "Download everything" + graceful zip failure fallback, repeat CTA framing
("Another one-time purchase. No subscription."), Day-7 yes/no measurement mechanic,
checkout redirect loop (fail lands back on landing with a recoverable message).
