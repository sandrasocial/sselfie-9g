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
2. **"A paid SSELFIE outcome" (hero eyebrow)** is internal strategy vocabulary. Replace with
   the audience qualifier the contract mandates: "For women who sell something" (then the
   subline no longer needs its "For women who already have something to sell" open — swap
   that line to what she GETS).
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

## C. Explicitly fine (reviewed, do not churn)

Intake field examples (excellent), numbered steps, single CTA "Start my campaign",
"One payment. No subscription." reassurance, footer privacy note, per-asset download
labels, "Download everything" + graceful zip failure fallback, repeat CTA framing
("Another one-time purchase. No subscription."), Day-7 yes/no measurement mechanic,
checkout redirect loop (fail lands back on landing with a recoverable message).
