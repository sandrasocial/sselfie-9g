# SSELFIE Comeback Execution Pack

Status: **INTERNAL EXECUTION PACK — NOT A COMMERCIAL AUTHORITY OR SEND APPROVAL**

Updated: 2026-08-11

Controlling authority: `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`

This is the bounded work pack behind the approved three-engine comeback. It does not create a
fourth engine, reactivate a retired offer, change a price, or authorize a customer send. The weekly
Revenue Operator advances one gate at a time and returns at most one outward approval to Sandra.

## Live starting point

The 2026-08-09 read-only operator reconciliation found:

- 11 active Stripe memberships, including 6 discounted memberships.
- Net MRR separated by currency: EUR 349.08 and USD 393.00.
- Current seven-day net sales: 5 Prompt Vault payments / USD 185 and 1 SUITE payment / EUR 97.
- Previous comparable seven-day net sales: 7 Prompt Vault payments / USD 259, 1 Starter Kit
  payment / USD 37, and 1 credit top-up / USD 45.
- The largest measurable current Prompt Vault stage gap is Vault view to checkout: 47 distinct
  viewers and 18 distinct checkout sessions. This is a stage comparison, not a cross-device cohort.
- Payment review and protected-job failures are zero in the current live guard. Current unresolved
  bug reports are 20 and remain in the testing queue.

Money was reconciled to live Stripe charges and net of partial or full refunds. `stripe_payments`
supplies product attribution; analytics supplies behavior only. The report contains no customer
identity.

## Gate 1 — finish the owned-product proof event

Current offer: **Prompt Vault · USD 37 once**.

Current promise: use one ordinary selfie and complete, connected prompt collections to make photos
that belong to the same shoot instead of one random result.

Three already-approved Resend broadcasts are scheduled to the same fixed segment:

| Touch | Provider state verified 2026-08-09 | Scheduled UTC |
|---|---|---|
| Email 1 | scheduled | 2026-08-11 08:30 |
| Email 2 | scheduled | 2026-08-13 08:45 |
| Email 3 | scheduled | 2026-08-15 09:00 |

The existing Revenue Operator is instructed to reconcile exclusions before each send and has a
tightly scoped stop command for these three broadcast IDs only. It stops broadcasts that are still
scheduled if checkout, fulfillment, provider health, or complaint safety fails. No second email
campaign is added while this event is running.

### Measurement matures 2026-08-18 at 09:00 UTC

The operator verifies all three broadcasts from Resend. It scores the campaign only when all three
have provider state `sent` and a full 72-hour response window has elapsed after the last actual
delivery. A date passing by itself is not complete exposure.

- **Pass:** at least 15 campaign-attributed, net qualifying Prompt Vault payments after all three
  touches.
- **Learn and repair:** 5-14 attributed payments. Keep Prompt Vault and repair the largest measured
  stage gap before another exposure.
- **Fail this message/exposure:** 0-4 attributed payments. Do not invent urgency or build a new
  product. Compare proof, click, checkout, access, and activation evidence first.
- **Immediate stop:** any wrong price, broken access or fulfillment, duplicate send, material
  provider failure, or complaint rate at or above 0.1 percent.

The reserved next creative lever is Sandra's real Marbella transformation: original selfie,
connected shoot results, and how she used them. It is not required from Sandra until the first
event has been measured and the operator returns it as the single priority.

## Gate 2 — bounded Maya paid-value test

Preparation starts now in the background. It does not change the public Prompt Vault priority,
interrupt its response window, or authorize a Maya invitation. The paid test starts only after Gate
1 is scored, every customer-protection gate is green, and Sandra approves the exact invitation.

Before the invitation can be approved, the AI team must select the bounded cohort, prove that every
eligible purchaser receives Maya Home rather than the legacy SUITE front door, exercise the exact
purchase-to-first-post path on desktop and mobile, verify checkout and fulfillment, and clear every
open high-severity defect in that journey. The draft and a working checkout are not enough on their
own. The dedicated server-only `MAYA_VALUE_TEST_ALLOWLIST` exists for this cohort; it does not widen
Maya Home to every member and stays empty until the audited buyers are ready. It fails closed above
20 identities and grants the bounded cohort both Maya Home and the operating-layer continuity it
depends on. The operator accepts the cohort, access, and checkout gates only when the matching
`MAYA_VALUE_TEST_COHORT_AUDITED_AT`, `MAYA_VALUE_TEST_ACCESS_VERIFIED_AT`, and
`MAYA_VALUE_TEST_CHECKOUT_VERIFIED_AT` timestamps are no more than seven days old; the founder
defect queue must also contain zero unresolved Maya release blockers.

### Product job

> Bring Maya one selfie and one rough idea. Leave with one beautiful, personal post, the words, and
> the next step ready to use.

### Private two-price evidence test

- Campaign key: `maya_tier_choice_pilot_2026_08`.
- Maximum cohort: 20 recent commerce buyers with no active or protected Maya/SUITE access.
- **Maya Essential · EUR 29/month:** the same focused one-selfie-to-finished-post job, 30 monthly
  credits, and controlled usage. It is a private evidence offer, not a public product.
- **Maya Pro · EUR 97/month:** the focused job with 100 monthly credits, Calendar, Gallery, and the
  current member product library.
- **Annual · EUR 970 · held:** do not offer it until weekly repeat use and renewal intent are proven.
- Exclude current or trialing members, historical protected access, unsubscribed/suppressed
  contacts, internal/test records, recent overlapping marketing, and anyone whose access state is
  unavailable.
- Reconcile the cohort again immediately before the exact send approval.

The tier test measures willingness to pay before building a public Essential architecture. A
hidden, fail-closed checkout and plan-aware entitlement contract may be deployed during preparation,
but it is excluded from the public product registry and cannot call Stripe unless the pilot flag,
an allowlist of no more than 20 approved emails, and the missing Essential Stripe price are all
configured. No Stripe price, environment flag, invitation, customer access, or current-member
change is made during preparation. Both private choices still require working checkout and
fulfillment verification before the invitation can become approval-ready.

### Read-only cohort snapshot verified 2026-08-11

- The aggregate audit found exactly 20 currently eligible commerce buyers after protections.
- Excluded: 8 protected-access buyers, 9 unsubscribed contacts, 2 bounced/suppressed contacts, 12
  within the marketing cooldown, and 51 beyond the audience cap.
- No identities were printed and no records were mutated. The aggregate cohort fingerprint is
  `cd8ba376ff735f5a9494ed42ba07e26a41a969d1a725c081a24b8d798c2e2483`.
- This is preparation evidence, not send authority. The cohort must be reconciled again after Gate
  1 and immediately before Sandra sees the one exact invitation approval.

### Cost guard verified 2026-08-11

- The focused three-slide weekly carousel costs 3 product credits.
- The current image route uses medium-quality `gpt-image-2`; the measured code note is roughly USD
  0.06 per image at that setting.
- Thirty Essential credits therefore support about ten three-image weekly outcomes before top-ups,
  while keeping image-output cost bounded. Actual provider spend remains a release gate because
  reference-image tokens and premium chat turns vary by job.
- Live 30-day text telemetry showed premium Maya chat averaging about USD 0.11 per completed call;
  the pilot must measure calls and image spend by purchaser rather than promise unlimited AI.

### Exact value gates

All three must pass before Maya pricing or scope broadens publicly:

1. At least 3 net qualifying monthly purchases attributed to the test.
2. At least 2 purchasers complete a publish-ready first outcome within 48 hours. Score only
   purchasers whose 48-hour window has matured.
3. At least 2 purchasers complete a second distinct outcome within 10 days. Score only purchasers
   whose ten-day window has matured.

Tier selection and repeat use are separate evidence:

- If Essential is selected and those buyers repeat, validate Essential as the public-tier candidate.
- If Pro is selected and those buyers repeat, keep Pro as the recurring offer.
- If women buy either tier but do not repeat, improve the one job before changing price.
- If they neither buy nor repeat, stop public tier work and return to the buyer problem and proof.

### Invitation draft held for the later approval pack

Subject: `I made Maya simpler`

> Hi {{first_name}},
>
> I have been simplifying Maya around one job because, honestly, there was too much to learn.
>
> You bring her one selfie and one rough idea. She helps you turn it into one personal post, the
> words, and the next step, without making you learn a whole system first.
>
> I am opening this to a very small group because I want to see whether it becomes genuinely useful
> more than once, not just exciting once.
>
> I am testing two simple monthly choices with a very small group:
>
> Maya Essential is EUR 29/month for the focused job with controlled monthly use.
>
> Maya Pro is EUR 97/month for more use, Calendar, Gallery, and everything already inside the
> member library.
>
> Both are monthly and cancel anytime. There is no deadline. I want to learn which version is
> actually useful enough to keep using.
>
> Choose the version that fits you
>
> If this is not what you need, you do not need to join.
>
> Sandra x

This is a draft only. The AI team owns cohort audit, separate tracked links, checkout test,
fulfillment test, measurement, and retest. Sandra receives one exact send approval only when both
private choices work end to end and the Gate 1 review is complete.

## Gate 3 — leveraged opportunity pipeline

This lane is prepared in the background and does not replace the weekly priority. Affiliate
enrollment is not a partnership win, gifting is not revenue, and an application form is not proof
of budget.

| Rank | Opportunity | Bounded first mechanism | SSELFIE-specific proof angle | Condition before action |
|---:|---|---|---|---|
| 1 | ShiftCam | Affiliate proof, then paid tutorial | One window, one phone, one small room: lens versus no lens | Confirm Norway eligibility, fee, deliverables, and usage rights. [Official program](https://affiliate.shiftcam.com/shiftcam-us/register) |
| 2 | ghd Norway | Validate a paid tutorial route | Hair that photographs beautifully on an iPhone, taught by a working hairdresser | Confirm the Norwegian buyer, budget, product claims, and rights before making content. [Official program](https://www.ghdhair.com/no/affiliates) |
| 3 | SANDMARC | Affiliate/gifting proof, then paid tutorial proposal | Bathroom to editorial with a phone light, grip, and lens | No valuable UGC for product-only compensation; confirm phone and shipping fit. [Official program](https://www.sandmarc.com/pages/community) |
| 4 | Picsart | Current performance-paid creator campaign | One ordinary selfie into three useful launch visuals | Treat this as a bounded performance test, not a premium partnership; confirm payout and rights. [Official program](https://picsart.com/earn/) |
| 5 | Canva Creators | One licensed template collection | Selfie to carousel through SSELFIE's visual method | Submit only a tight collection; do not turn SSELFIE into generic templates. [Official program](https://www.canva.com/creators/templates/) |

Secondary researched fits: Facetune, Photoroom, Adobe Express, Ulanzi, LTK, Skillshare, Metricool,
Descript, Riverside, and CapCut. They remain backlog research, not active applications.

Before any application or message, the approval pack must state compensation, deliverables, usage
rights, exclusivity, payment timing, founder time, and the exact relationship-specific message.
No applications, outreach, account creation, or personal-data submission are authorized by this
document.

## Thirty-day operator sequence

| Date/gate | AI team owns | Sandra owns | Advance only when |
|---|---|---|---|
| Aug 9-18 | Provider preflight, exclusions, checkout/access checks, attribution, monitoring, then the full 72-hour response window; prepare Maya and partnership packs internally | Nothing unless a safety stop needs an outward decision | All three Resend broadcasts are sent and Gate 1 evidence is mature |
| Aug 18 | Net revenue and full funnel score; one decision | At most one proof/publication approval if the measured leak requires it | Gate 1 is scored from complete provider-verified exposure |
| Aug 11-18 background | Audit the max-20 Maya cohort, lock the two-price contract, cost guard, drafts, and QA plan | Nothing | Preparation remains internal and cannot change price, access, or send |
| Aug 19-21 | Reconcile the cohort, create and verify both private checkout/fulfillment paths, Maya Home access, desktop/mobile path, and defect gate | One exact invitation-send approval | Every eligible purchaser reaches the focused Maya job and both payment paths are green |
| Aug 22-31 | Maya first-outcome support, exact task continuity, mature cohort tracking | Founder testing and aesthetic judgment only | 48-hour and ten-day cohorts mature |
| Background | Top-five commercial research and one buyer-specific pilot pack | One relationship approval only when compensation and rights are clear | Gate 1 and Maya work do not need interruption |
| Day 30 | Evidence pack: repeat, repair, tier test, hold, or stop | One company-level commercial decision | Cleared money and mature customer outcomes support it |

## Drift guard

Until the Day-30 decision:

- No new standalone low-ticket offer is built because sales are quiet.
- No generic Maya capability is added because a competitor launched it.
- No public Essential or annual campaign is launched from curiosity; the approved private tier test
  stays capped at 20 and behind an exact send approval.
- No partnership is counted before cleared payment and completed delivery.
- No agent opens a second weekly revenue plan.
- Unavailable evidence is never reported as zero.

The operator finishes safe technical and operational work, preserves the existing decision window,
and asks Sandra only for the one outward action that is genuinely ready.
