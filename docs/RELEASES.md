# Completed releases

## 2026-08-12 | Work With Me short-copy pass

Shortened the Work With Me page without changing its approved visuals, images, section structure,
EUR 2,000 price, five-place limit, or application journey. Each section now carries one idea, the
offer is readable from the headings, deliverables are scannable, and the application questions use
shorter everyday language. No email or social content was sent.

Why: the first client-ready rewrite was clear but too text heavy. Production proof: feature commit
`6e959068`, exact Ready Vercel deployment `dpl_EwgMb5uhsR9p4Yg6458tEYmyxfYB`, CI typecheck,
repository invariants, 24 focused tests, and clean diff checks. The visible page now has about 582
words before FAQ data and 15 short paragraphs instead of 27. Live desktop and 390px mobile QA
confirmed the shortened headline, price, application path, zero console errors, and no horizontal
overflow on `www.sselfie.ai/work-with-me`.

## 2026-08-12 | Work With Me client-ready promise

Rebuilt the Work With Me messaging around one specific problem: an experienced service provider is
trusted in real life, but her online presence does not make that value easy for the right client to
understand, trust, and choose. Kept the approved page structure, imagery, visual design, EUR 2,000
price, five-place limit, application flow, and customer protections intact. Aligned the application,
applicant confirmation, private sales-assistant drafts, and paid welcome copy with the same
client-ready online path. No customer email was sent and no price, checkout, entitlement, billing,
or existing-customer access changed.

Why: the previous page sold broad offer clarity and visibility language instead of vividly naming
the audience's current pain, desired client journey, exact fit, and concrete deliverables. Production
proof: feature commit `aa910d44`, exact Ready Vercel deployment
`dpl_Ghb9nZSg4tH4P6iZeW6qRo8PzhLB`, CI typecheck, repository invariants, 23 focused journey tests,
an optimized production build, and clean diff checks. The full repository run reached 2,040 passing
tests with 6 intentional skips; its only failure was the restricted sandbox blocking an existing
local tsx socket, and that exact 8-test check passed when rerun with the required local permission.
Live desktop and 390px mobile QA confirmed the new promise, repeated application actions, updated
questions, zero console errors, and no horizontal overflow on `www.sselfie.ai/work-with-me`.

## 2026-08-12 — Maya finish without Feed Planner

Corrected the Maya result journey so `Finish this post` now creates and displays the member's
caption inside Maya instead of silently creating a Feed Planner placement. Finished captions persist
with the Maya draft across return and reload. Calendar placement remains available only when a member
explicitly starts from an existing Calendar post; existing Calendar data, direct access, member
entitlements, credits, and historical buyers remain unchanged.

Why: the simplified label still called the old `/feed-plan/place-photo` action underneath, so Create
unexpectedly ended in a separate tool members had not chosen. Production proof: feature commit
`8f961cb2`, exact Ready Vercel deployment `dpl_8k7TeN9M6i1dnNogmBdHjzG1G9xx`, 2,041 passing tests
with 6 intentional skips, 32 desktop/mobile operating-layer journeys, CI typecheck, repository
invariants, changed-file lint with zero errors, a successful optimized production build, and clean
diff checks. Authenticated production QA confirmed Today opens the `Create with Maya` dialog while
remaining on `/app`.

## 2026-08-11 — Maya simplified member journey

Made Maya own one visible job: turn one selfie and one real idea into a finished personal-brand post
that looks and sounds like the member. Standard member navigation is now Create, Gallery, and Account;
Calendar and Learn remain intact behind the journey instead of competing as primary products. The
archived founder Home can only return through a new explicit preview flag. Create now leads with one
recommendation, one idea field, and three optional starts, while a finished result has one dominant
`Finish this post` action that uses the preserved Calendar engine for the caption and placement. No
price, checkout, entitlement, subscription, credit, customer data, or frozen creative prompt changed.

Why: current paid-member behavior showed creation and downloads carrying substantially more use than
Calendar or Learn, while the five-destination interface obscured the outcome members are paying for.
Production proof: feature commit `53091b30`, exact Ready Vercel deployment
`dpl_9AWseLi6DpZ7CL19HuhKBMffBCTS`, 2,032 passing tests with 6 intentional skips, CI typecheck,
repository invariants, changed-file lint with zero errors, a successful optimized production build,
and clean diff checks. Authenticated desktop and 390px mobile QA confirmed the three-destination
navigation, focused Create journey, no horizontal overflow, preserved direct Calendar access, and no
`/app` runtime errors. The exact-SHA redeploy reached Ready after the first Vercel build hit a transient
internal font-resolver error.

## 2026-08-11 — Two-speed comeback preparation

Prepared the evidence-gated comeback without opening a second public campaign. Added a read-only,
max-20 Maya Essential-versus-Pro cohort audit; a hidden, fail-closed EUR 29 Essential checkout and
30-credit entitlement contract; plan-aware Maya-only versus Pro access; exact purchase, first-outcome,
and repeat-use gates; and a five-target partnership pilot pack with one scoped EUR 3,000 tutorial
offer. The Revenue Operator can now finish safe Maya and partnership preparation in the background
while Prompt Vault remains the only public priority. No Stripe price or pilot flag was enabled, no
customer access or current membership changed, and no invitation, email, application, publication,
or brand outreach was sent.

Production proof: feature commit `42524f6a`, Vercel deployment
`dpl_EHER4taMpyemv4NQma3TZyizt29Y`, and the exact commit reached Ready on `sselfie.ai` and
`www.sselfie.ai`. The full Vitest suite, typecheck, repository invariants, targeted payment and
entitlement regression tests, the exact optimized production build, and diff checks passed. Live
smoke checks returned health 200, preserved the public monthly membership checkout, redirected the
private Essential URL to the failure path while the pilot remains disabled, and found no error or
fatal runtime logs for the deployment.

## 2026-08-09 — SSELFIE comeback Revenue Operator

Locked the comeback into one evidence-gated operating system with exactly three engines: owned-product
commerce, Maya recurring membership, and creator media/partnerships/licensing. Added a complete
existing-product inventory, a 30-day execution pack, live Stripe/payment/funnel/source reconciliation,
refund-safe cash reporting, persistent campaign gates, and one quiet Revenue Operator. The current
priority remains the already-approved $37 Prompt Vault proof event; its three existing broadcasts are
provider-verified as scheduled, and the full response window is reviewed on 2026-08-18. Maya's next
paid-value test is bounded to at most 20 audited existing buyers and remains fail-closed until cohort,
access, checkout, founder-defect, and invitation gates are all ready. No price, billing, entitlement,
credit, customer-access, or existing-member promise changed, and no new customer campaign was sent.

Production proof: feature commit `6e46d078`, Vercel deployment
`dpl_9x453GtGzVVVuEbbRjmydtEwzmBa`, and the exact commit reached Ready on production. Typecheck,
repository invariants, 2,018 passing tests with 6 intentionally skipped, changed-file lint with zero
errors, an optimized production build, and diff checks passed. A post-deploy live run reported all
seven required sources healthy, 11 active memberships, no payment-review or protected-job failures,
and the Prompt Vault decision safely in progress. The provider guard independently confirmed all
three approved broadcasts remain scheduled without mutation.

## 2026-08-08 — Maya weekly outcome

Made Maya own one repeatable weekly job: she uses the member's current priorities and unfinished
work to choose one useful idea, format, and remembered visual direction, then carries the same idea
through the core asset, matching caption, Calendar placement, reload, and one-tap Resume. The phone
home now leads with “Finish this week's content.” Calendar placement is retry-safe, and the weekly
funnel is measured. Maya Home remains founder-allowlisted; no price, checkout, credits, entitlement,
subscription, or current-member rollout changed.

Production proof: feature commit `b3a4e9f5`, Vercel deployment
`dpl_3KT9fZJRPG9bqUWGayPHXoFQq7ME`, and the exact commit reached Ready on `sselfie.ai` and
`www.sselfie.ai`. Typecheck, repository invariants, 1,972 tests with 6 intentionally skipped, an
optimized production build, diff checks, 15 desktop and 15 mobile operating-layer journeys, and
focused weekly retry/continuity checks passed. Live founder QA confirmed Maya first, the weekly
action and composer above the fold at 390x844, personalized idea/format/style selection without a
menu, and zero browser errors. This is ready for founder dogfood; public €97 price-fit remains
unproven until real members repeatedly prefer the finished weekly outcome to cheaper alternatives.

## 2026-08-08 — Founder-only Maya Home

Made Maya the founder's default SUITE relationship: one above-fold conversation for questions,
writing, planning, and visual creation, with silent format routing, personalized context, and a
one-tap resume path for unfinished Calendar, Learn, and Create work. The new Home uses the paid
quality chat route for ordinary help while preserving the frozen creative system for photos,
shoots, carousels, stories, covers, and motion. Maya Home has its own allowlist-only gate, so the
existing global operating-layer cohort keeps its current Create experience. No price, checkout,
credit, entitlement, subscription, or customer promise changed.

Production proof: feature commit `a2dc238e`, Vercel deployment
`dpl_HbMob1QkLDfuYqdPyuoffpDzNUsw`, and the exact commit reached Ready on `sselfie.ai` and
`www.sselfie.ai`. CI typecheck, repository invariants, 1,967 tests with 6 intentionally skipped,
changed-file lint with zero errors, an optimized production build, diff and formatting checks, and
28 desktop/mobile Maya browser journeys passed. Live founder QA confirmed personalized neutral
help, silent photo handoff without generation or credit spend, one-tap resume after reload, a
390x844 above-fold composer with no horizontal overflow, and zero browser errors. This release is
ready for founder dogfood; public €97 willingness-to-pay remains unproven pending a seven-day
target-member comparison against ChatGPT.

## 2026-08-07 — Prompt Vault proof recovery handoff

Moved the $37 Prompt Vault offer directly behind every copied free prompt on both the five-prompt
access page and the Instagram single-prompt path. Added a proof-led recovery email template and a
read-only audience audit that excludes verified buyers, unsubscribes, delivery-risk contacts,
internal/test addresses, duplicates, and recent Vault-offer recipients. A reconciled 662-contact
Resend segment and review-only broadcast draft were prepared; no customer email was sent.

Production proof: feature commit `51fdb28e`, Vercel deployment
`dpl_3e6YtqcCd3MwXVrtbaMq2VvyXbqi`, and the exact commit reached Ready on the production aliases.
CI typecheck, repository invariants, 1,958 tests with 6 intentionally skipped, an optimized
production build, diff checks, and live desktop plus 390x844 mobile QA passed. The live copied-prompt
offers reached the attributed $37 email checkout with no payment submitted and no console errors.

## 2026-08-05 — Proof-led annual SUITE conversion sprint

Prepared the approved proof-led annual SUITE campaign around Sandra's real source selfie, selected
Marbella results, and eight-slide consistency carousel. Added the approved email as a review-only
draft, kept the Instagram tutorial as a P.S. link after the paid call to action, and added a read-only
audience audit that excludes verified buyers, active access, unsubscribes, and contacts inside the
48-hour email cooldown. The internal review route remains unavailable in production, and the draft
is not connected to a sender, cron, or social publishing path.

Production proof: feature commit `55104d84`, Vercel deployment
`dpl_Bpo4iqBam7fJZdjHXsVfJF5N93na`, and the exact commit reached Ready on `sselfie.ai`. CI typecheck,
repository invariants, 1,953 tests with 6 intentionally skipped, lint, production build, and diff
checks passed. Live desktop and 390x844 mobile QA confirmed the €970 annual checkout, correct campaign
tracking, and no horizontal overflow; the private review route returned 404. After explicit approval,
an attended Resend Marketing pilot broadcast (`39fa1419-c3db-4055-8533-13e23eda09ef`) was sent to the
2 currently eligible contacts. Resend suppressed one address and the other bounced, so the pilot had
zero inbox deliveries and no retry or suppression bypass was attempted. The mobile checkout was then
changed to put its email action before the supporting image. No social post was published, and no
checkout or payment was submitted.

Mobile checkout proof: commit `76c3c757`, Vercel deployment
`dpl_6RtYUCw3mRHz7Qt1B2idt71d3puz`, and the exact commit reached Ready on the production aliases.
Live 390x844 QA placed the €970 price, email field, and payment action before the supporting image;
desktop retained the approved visual layout.

After Sandra approved the corrected full-list path, a fresh audit found 8,922 Resend contacts. The
scheduled cohort excludes 1,666 unsubscribed contacts, 16 protected active-access customers, 184
addresses whose latest provider state is bounced or suppressed, 248 contacts still inside the
48-hour cooldown at send time, and 9 invalid or duplicate records. The approved proof email is
scheduled through Resend for 6,799 unique subscribed recipients at 2026-08-06 08:15 UTC (10:15
Oslo), broadcast `7e5a3fc6-23f6-425d-93ea-e7477361b890`. Provider verification showed status
`scheduled`, 6,799 segment records, 6,799 unique addresses, the approved subject and the truthful
full-list permission reminder. This is scheduled provider state, not a sent or delivered claim;
delivery outcomes still require verification after the send window.

Full-list sender release proof: commit `3889f96b`, Vercel deployment
`dpl_9cWmNw5868AP5vX8p8qszF2si1bZ`, and the exact commit reached Ready on `sselfie.ai` and
`www.sselfie.ai`. Typecheck, repository invariants, 1,955 tests with 6 intentionally skipped,
changed-file lint, production build, and diff checks passed.

Before the scheduled send, the live audience was cleaned without deleting master contacts or
overriding any suppression. Fifteen ineligible segment memberships were removed, including confirmed
test/internal records. Five identities were proven to exist only as synthetic funnel tests with no
SSELFIE account, Stripe payment, or protected access; one was already unsubscribed and the remaining
four were globally unsubscribed in Resend. The final segment reconciled twice at 6,784 records, 6,784
unique eligible recipients, zero duplicates, zero missing contacts, and zero extras. Broadcast
`7e5a3fc6-23f6-425d-93ea-e7477361b890` remains scheduled unchanged for 2026-08-06 08:15 UTC.

Resend's existing production webhook now listens for `contact.updated` and stores global unsubscribe
changes as processed `email.unsubscribed` events, with recent-broadcast attribution when provider data
does not include a broadcast ID. Live provider-generated contact updates were verified in the
production event table after deployment. No customer email was sent during the cleanup or verification.

Email hygiene release proof: feature commits `1f72f78b` and `f1d1abbb`, Vercel deployment
`dpl_2py879fFpUaYJHV7kXJxdSzNCDz4`, and the exact final commit reached Ready on the production aliases.
CI typecheck, repository invariants, 1,956 passing tests with zero failures, lint with zero errors,
focused unsubscribe tests, two optimized production builds, and diff checks passed.

## 2026-08-04 — Private campaign engine QA hardening

Kept the dormant Campaign Takeover offer closed while repairing the existing generation engine from
a real internal test. The planner now uses a provider-compatible structured-output schema, enforces
the complete campaign shape after generation, and rejects invented CTA keywords, unsupported
identity or body guarantees, and urgency that was not supplied in the brief before paid images run.
Reel generation now waits for the existing provider job instead of starting a duplicate paid job,
and Replicate credentials are no longer partially logged.

Production proof: feature commit `a84abc80`, Vercel deployment
`dpl_7yRCtZwtCboeVxBsniwE8jtWgQs4`, and the exact commit reached Ready on the production aliases.
CI typecheck, repository invariants, 1,947 tests with 6 intentionally skipped, targeted campaign and
secret-safety tests, an optimized production build, and diff checks passed. Live health returned 200
and `/campaign` remained fail-closed with “This private test is not open yet.” No customer email,
payment, campaign order, or public offer was created.

## 2026-08-04 — Vault Maya launch conversion and email reliability

Removed the extra Vault Maya email-capture gate so new buyers now move directly from the approved
offer page into Stripe's secure email and payment form. Hardened the launch follow-up runner with
paced Resend pagination and retry/backoff, limited high-intent membership to real Vault Maya offer
clicks or identified checkout starters, and replaced duplicate absolute-count deliverability alerts
with atomic, minimum-volume percentage alerts. No approved email or sales-page copy changed.

Production proof: feature commit `2add6e62`, Vercel deployment
`dpl_2q4Ucuhe17ax31GqfzEbXuJfhyaJ`, and the exact commit passed GitHub's Vercel status check. CI
typecheck, repository invariants, 1,941 tests with 6 intentionally skipped, targeted repair tests,
an optimized production build, and diff checks passed. Live desktop and 390x844 mobile QA reached
Stripe directly with no payment submitted. The failed 07:00 UTC follow-up recovered on the first
post-deploy run: Resend accepted the nonbuyer broadcast once for 7,110 contacts, and the next cron
reported both audiences `already_sent`. The active high-intent segment contained no invalid links.

## 2026-08-03 — Vault Maya launch emails

Launched the approved Vault Maya email sequence with a later image from the newest Golden Hour
Diary collection. The audience is split between included SUITE access, existing commerce buyers,
and eligible nonbuyers. Every sales follow-up removes current Vault Maya buyers and all higher
access immediately before sending. The founder price closes on 11 August 2026 at 10:00 Oslo time.

The first attended small-wave run exposed an observability and idempotency defect: the provider
accepted the send while `email_events` rejected the audit row because `email_type` was missing.
Three verification runs therefore sent the SUITE message three times to 11 contacts and the buyer
message three times to 85 contacts. The main audience was paused before sending. All six provider
sends were reconciled into the audit table, the missing field was repaired, and broadcasts now
check Resend directly and use one provider-idempotent create-and-send operation. A live guard test
confirmed that rerunning an existing campaign did not create or send another broadcast.

Production proof: launch commit `3f0afbcd`, safety commit `01632d12`, Vercel deployment
`dpl_9AP7BhYdQkFXrvwcefyVaXtWezaA`, and exact commit `01632d1` verified in the Vercel build log.
Repository invariants, CI typecheck, targeted email tests, a successful production build, and diff
checks passed. The full suite passed 1,934 tests with 6 intentionally skipped and one unrelated
Calendar timeout that passed immediately in isolation. Resend accepted the main announcement once
for 7,170 reconciled nonbuyers as broadcast `8be23986-311c-4661-94c7-c9090d120a13`; matching
`broadcast_created` and `broadcast_sent` audit rows were verified.

## 2026-08-03 — Vault Maya member controls and identity accuracy

Finished the approved Vault Maya member experience without changing SUITE generation. Members can
now open and manage their selfies directly from Create, choose several selfies in one device picker,
and keep the same controls in Account. Vault Maya now adds a product-scoped instruction that keeps
the member's real face, body shape, build, and proportions separate from the selected Vault
inspiration image. Next-drop requests can include a JPG, PNG, or WebP inspiration image, and members
with five photos or fewer receive a dismissible top-up prompt.

Production proof: feature commit `2fb7b06a`, Vercel deployment
`dpl_Ec6d3SfRLpJPzE6Ts2FbXk1dLZwG`, and the exact Git commit verified in Vercel build logs. CI
typecheck, repository invariants, full Vitest, production build, targeted multipart-upload and Vault
prompt tests, changed-file lint with zero errors, and diff checks passed. Live signed-in QA at the
app's 595px browser-pane width and 390px mobile confirmed the Create selfie manager, native
multi-select input, Account inspiration control, zero horizontal overflow, and zero browser-console
errors. QA was read-only: no selfie, request, credit, payment, or generation was changed. The revised
body-preservation result remains for Sandra to evaluate with the clean member's next generated photo.

## 2026-08-02 — Vault Maya paid product experience

Rebuilt the paid Vault Maya experience around three focused areas: Create, My photos, and Account.
Members can now browse a compact editorial collection library, open each collection separately,
preview a look full screen, create from that look, revisit Vault Maya photos in a dedicated gallery,
and open finished photos full screen with download, favorite, and create-again actions. Account now
keeps selfie, photos, requests, and membership controls in one reachable place. Added direct
“Love this” and “Not quite” result feedback to the existing analytics and Member Pulse surfaces.
Prompting, generation routing, pricing, entitlements, credits, billing mechanics, and SUITE behavior
were not changed.

Production proof: feature commit `f330aefd`, Vercel deployment
`dpl_9TVyE9WChaMqPJz5cqo6MT6hRK6b`, and the exact Git commit verified through Vercel build metadata.
CI typecheck, repository invariants, 1,889 passing tests, production build, targeted Vault Maya and
shared-lightbox regression tests, changed-file lint with zero errors, and diff checks passed. Live
signed-in production QA at the app's 595px browser-pane width confirmed Create, collection browsing,
full-screen look preview, My photos, full-screen gallery controls, and Account with no horizontal
overflow or browser-console errors. QA was read-only: no photo was generated, downloaded, favorited,
or rated, and no selfie, request, billing, credit, or customer data was changed.

## 2026-08-02 — Vault Maya post-purchase handoff

Added the approved Vault Maya success and password-setup experience for both existing and new
buyers. The welcome email now returns a buyer directly to Vault Maya, uses the approved copy and
current Vault image, and is duplicate-safe for each Stripe Checkout Session. Temporary local review
controls and routes were removed before release.

Production proof: feature commit `a12a52b9`, Vercel deployment
`dpl_2VfMFn5kDbSD4TrPknJuXuH9fRqN`, and the exact Git commit verified through Vercel deployment
metadata. CI typecheck, repository invariants, lint with zero errors, 1,879 passing tests with 6
intentionally skipped, production build, targeted post-purchase and email tests, and diff checks
passed. Live production QA confirmed the Vault Maya landing page and embedded recurring checkout
loaded with the approved offer and founder price. No payment was submitted and no customer email
was sent; the success and delivery path remains test-verified rather than proven by a real purchase.

## 2026-08-02 — Vault Maya checkout

Refined the Vault Maya checkout into one focused buying step with a current Vault image, compact
monthly pricing, clear founder-price terms, and the email action before imagery on mobile. Removed
the generic testimonial and supporting-image strip without changing Stripe, fulfillment,
entitlements, credits, generation, or customer email behavior.

Production proof: feature commit `6b185f7d`, Vercel deployment
`dpl_76XBHwHqfdUJxavhEMAptoka3N4Z`, and the exact Git commit verified through Vercel deployment
metadata. CI typecheck, repository invariants, lint with zero errors, 1,874 passing tests with 6
intentionally skipped, production build, targeted checkout tests, and diff checks passed. Live
desktop and 390x844 mobile QA confirmed the approved copy and image, visible email CTA, form-first
mobile order, responsive fit without horizontal overflow, and zero browser-console errors. No
email or payment form was submitted and no charge or customer record was changed.

## 2026-08-02 — Vault Maya sales page

Rebuilt the Vault Maya landing page as a premium, visual buying journey using later images from
the newest Vault collections. Clarified the tap-to-create experience, monthly membership value,
credit terms, cancellation path, and the difference between the Prompt Vault and Vault Maya.
Added landing-view and checkout-click measurement without changing pricing, checkout,
fulfillment, entitlements, credits, generation, or customer email behavior.

Production proof: feature commit `9a65ce02`, Vercel deployment
`dpl_DmC6fm2z2h1fPUEWnNqEftspHN2C`, and the exact Git commit verified through Vercel deployment
metadata. CI typecheck, repository invariants, 1,874 passing tests with 6 intentionally skipped,
production build, targeted Vault Maya truth tests, and diff checks passed. Live desktop and
390x844 mobile QA confirmed the approved hero and copy, responsive fit without horizontal
overflow, working attributed checkout links, loaded Vault imagery, and zero browser-console
errors. No payment, email, entitlement, credit, generation, or customer record was changed.

## 2026-08-02 — Prompt Vault post-purchase handoff

Replaced the generic paid-success state with a calm Prompt Vault handoff that confirms payment,
opens the buyer's private Vault automatically, and provides clear retry, access-recovery, and
support paths when fulfillment is delayed. Corrected the delivery email's fallback destination and
made its built-in retries duplicate-safe for each Stripe Checkout Session. Vault Maya remains
outside this first-use journey.

Production proof: feature commit `b3f6b525`, Vercel deployment
`dpl_AGnAuZEeNc4n8u8J2AN9WTBycBdq`, and the exact Git commit verified through Vercel deployment
metadata. Targeted handoff, payment-attribution, and email tests passed with CI typecheck,
repository invariants, full Vitest, production build, lint with zero errors, and diff checks. Live
390x844 QA confirmed the access-recovery form, zero horizontal overflow, and zero browser console
errors. No purchase was made, no form was submitted, and no customer email was sent.

## 2026-08-02 — Prompt Vault buyer journey and first-copy bridge

Redesigned the paid Prompt Vault around a premium, visual first-use experience; clarified the
$37 checkout and payment hierarchy; and added one calm Prompt Vault invitation after the first
free prompt is copied. The other free prompts remain uninterrupted, and payment, fulfillment,
entitlements, customer email behavior, and Vault Maya remain unchanged.

Production proof: feature commit `7e9fb544`, Vercel deployment
`dpl_7DrH93Gf7xbCLvpCrRnN44ND1Pyu`, and the exact Git commit verified through Vercel deployment
metadata. CI typecheck, repository invariants, 1,869 passing tests with 6 intentionally skipped,
production build, targeted funnel tests, changed-file lint with zero errors, and diff checks passed.
Live QA confirmed the Prompt Vault landing page, checkout, private buyer Vault, and first-copy
invitation on desktop and 390x844 mobile with no horizontal overflow or browser runtime errors. No
payment, email, customer record, entitlement, credit, or generation was changed during verification.

## 2026-08-01 — Prompt Vault sales page

Rebuilt the Prompt Vault landing page around the approved customer journey: a clear one-time
$37 offer, three simple creation steps, current Vault totals, six curated collection previews,
practical FAQs, and a shorter path to checkout. The collection previews use later shots rather
than the first images already shown in the free-prompts journey. Added placement-aware landing CTA
tracking without changing checkout, payment, fulfillment, access, or customer email behavior.

Production proof: feature commit `0b15633b`, Vercel deployment
`dpl_G2XmKaig9RARQP1PDbyTwBmpAhbg`, and the exact Git commit verified in the Vercel build log. CI
typecheck, repository invariants, full Vitest, production build, targeted funnel tests, and diff
checks passed. Live desktop and 390x844 mobile QA confirmed the approved copy, current 31-collection
and 237-prompt totals, six curated collections, all 19 page images loaded, responsive fit without
horizontal overflow, valid checkout links, and zero browser-console errors. No payment, email,
fulfillment, entitlement, or customer record was changed during verification.

## 2026-07-31 — Free prompts email funnel

Aligned the automated free-prompts and Prompt Vault buyer emails with the approved customer
journey. New leads receive their five prompts and practical help before the first Vault offer;
buyers receive clear private-access, first-result, troubleshooting, and next-shoot guidance.
Removed two redundant lead touches and lowered the default cron batch ceiling from 120 to 100 so
the automation stays within its production runtime budget. Vault Maya remains outside this funnel.

Production proof: feature commit `93b1e312`, Vercel deployment
`dpl_ARxisdJinkGfLc8nnoEBoSkK5G9k`, exact Git commit verified in the build log, full Vitest suite,
CI typecheck, repository invariants, lint error check, production build, and diff checks. The live
authenticated dry run confirmed both automations enabled, the 100-email ceiling, all expected lead
and buyer touches, 78 currently eligible sends, zero sends, and zero failures during verification.

## 2026-07-31 — Global Maya Hook Intelligence

Upgraded Maya for every SUITE member so Reel covers, carousels, Story slides, and Story sequences
open from the audience's real situation, use the strongest natural hook approach, stay within the
member's truthful proof, and make the following content deliver the opening promise. The method is
invisible inside Maya's existing recommendation flow: no new setup, questionnaire, scorecard,
feature flag, or member-facing hook system.

Production proof: feature commit `0cf77551`, Vercel deployment
`dpl_AMYSSL5oyKdCssNPgKAKr3DG9xPU`, 1,856 passing tests with 6 intentionally skipped, CI
typecheck, changed-file lint, repository invariants, production build, and diff checks. Vercel was
Ready for the exact feature SHA. Live desktop Create loaded the existing recommendation, composer,
and navigation; the 390x844 production access boundary fit without horizontal overflow. No image
was generated, no credit was used, and no content was published during verification.

## 2026-07-30 — Vault Maya lifecycle stabilization

Hardened Vault Maya checkout, account provisioning, Stripe retry behavior, welcome delivery,
subscription entitlements, monthly credit resets, and funnel measurement so a failed dependency
cannot silently strand a paid buyer or widen Vault access into SUITE.

Production proof: feature commit `a8ca3b95`, Vercel deployment
`dpl_Hg8rqieL7B8kk9Tybwpn3Wr3oxWn`, 1,843 passing tests with 6 intentionally skipped, CI
typecheck, repository invariants, production build, and diff checks. Live desktop and 390px mobile
QA verified the public journey, required email capture, embedded recurring Stripe checkout, access
redirect, responsive fit, accepted funnel events, and zero Vault runtime errors. No payment,
customer email, publishing, refund, or entitlement change was performed during verification.

## 2026-07-30 — Stabilization trust cleanup

Preserved and finished the abandoned Calendar profile-photo work so a member can upload a profile
photo even when her Gallery is empty. Repository verification now ignores local, Git-ignored tool
metadata while still rejecting tracked agent orchestration, and Vitest uses a bounded two-worker
pool so the full suite completes reliably on the local machine.

Production proof: feature commit `236b6400`, Vercel deployment
`dpl_9NSwjqmLb7RdiUoSXdvBAvYQgf2f`, 1,834 passing tests with 6 intentionally skipped, CI
typecheck, repository invariants, production build, and diff checks. Authenticated desktop and
390x844 production QA verified Upload and Gallery mode switching, mobile fit, and cancel/close
without changing the saved profile photo.

## 2026-07-27 — Maya operating layer member rollout gate

Opened the corrected Maya operating layer beyond Sandra-only dogfooding only for eligible Suite
members and active trials when the server rollout flag is enabled. Limited shell users and accounts
without Suite access remain on the existing experience, while Sandra's private allowlist remains a
server-side override for rollback and QA. Existing member-vibe systems in support, growth
intelligence, daily briefing, reviews, and churn/member-health reporting remain the rollout
watchtower instead of adding another dashboard.

Verification: targeted rollout regressions, CI typecheck, changed-file lint, repository invariants,
full Vitest, desktop and 390x844 Maya operating-layer Playwright journeys, production build, diff
checks, and 22/22 creative-freeze checks. Protected prompts, generation routing, Vault selection,
credits, entitlements, payments, and publishing boundaries remain unchanged.

## 2026-07-27 — Hungry growth operator and external benchmarks

Reframed SSELFIE revenue decisions so historical prices and conversion results establish a
baseline rather than a ceiling. Revenue-target work now pairs a fresh first-party snapshot with a
source-graded external case library, returns three ranked mechanisms including annual SUITE and an
adapted proven pattern, and ends with the bounded paid experiment that creates the missing evidence.

Production proof: feature commit `6b3abb51`, Vercel deployment
`dpl_TLGCbphqoydmXA8UdRyJhpdTfEaN`, 1,774 passing tests with 6 intentionally skipped, CI
typecheck, repository invariants, production build, and exact-SHA Vercel Ready verification. No
pricing, checkout, email, customer, or product behavior changed.

## 2026-07-26 — Expired purchase-link recovery

Replaced the expired authentication-link dead end with clear actions to request a fresh password
link or open the paid purchase directly. Prompt Vault delivery now leads with direct Vault access,
keeps password setup optional, and returns password recovery to the buyer's intended product.

Production proof: feature commit `37cfda34`, Vercel deployment
`dpl_9wcKxX2P1822NQu6pKDY8VSXsrSi`, 1,760 passing tests with 6 intentionally skipped, CI
typecheck, repository invariants, production build, and live 390x844 recovery-page QA. The affected
payment and entitlement were verified before a fresh access email and password email were issued.

## 2026-07-26 — Maya multi-slide creation recovery and Phase 5 readiness

Restored the proven direct creation path for carousels and other multi-slide concepts: one
credit-labelled create action now replaces the generic Preview, Continue, and Confirm loop. Each
slide again renders from its own planned visual role and the member's original inspiration instead
of reusing slide one as every later slide's background reference. Single-image creation, explicit
Calendar apply and undo, retry idempotency, Gallery persistence, credits, and publishing boundaries
remain unchanged.

Phase 5 measurement now records the member's committed creation, grid, and learning decisions and
finishes a selected Calendar-post job when an existing generated asset and caption are successfully
applied. Verification includes 1,762 passing tests, 22 desktop and 390x844 Playwright journeys, CI
typecheck, changed-file lint with zero errors, repository invariants, production build, and 22/22
creative-freeze checks. Protected prompts and source hashes remain byte-identical.

## 2026-07-22 — Maya surface simplification

Simplified the Sandra-only Maya operating layer without rebuilding the approved Suite. Create now
leads with one recommendation and composer, Gallery has explicit Calendar and variation handoffs,
Learn opens with one source-backed next step, and Calendar caption creation or improvement follows
the shared preview, confirmation, result, and undo protocol. Account, stored Gallery assets, direct
copy/download/edit utilities, and the existing rollback experience remain intact.

Verification: 1,751 passing tests with 6 intentionally skipped, 20 desktop and 390x844 Playwright
journeys, CI typecheck, repository invariants, production build, and 22/22 creative-freeze checks.
Protected prompts, providers, routing, credits, payments, entitlements, and publishing boundaries
remain unchanged.

## 2026-07-22 — Maya Sandra knowledge corpus

Connected Sandra's owned Branded by SSELFIE course material and current flagship Studio method to
the existing Phase 3 guidance registry. Fourteen live Academy lessons now receive versioned,
entitlement-gated transcript guidance; six high-level method sources help Maya choose one useful
next action. Older Studio.com navigation, stale product assumptions, unverified claims, hype, and
time-sensitive social advice were deliberately excluded.

Verification: 1,740 passing tests with 6 intentionally skipped, 24 focused guidance tests, 16
desktop and 390x844 Playwright journeys, CI typecheck, changed-file lint, repository invariants,
production build, and 22/22 creative-freeze checks. Drive originals and all protected creative
prompts, generation routing, credits, payments, entitlements, and publishing boundaries remain
unchanged.

## 2026-07-21 — Maya inline action protocol

Added one Sandra-only Maya action flow for image, caption, combined creation, Calendar assignment,
and undo while preserving the existing generation, credit, Gallery, Calendar, and publishing
boundaries. Paid results now save to Gallery before an explicit Calendar apply; applying snapshots
the prior post, partial caption failures stay recoverable, retries are idempotent, and undo restores
the assignment without deleting the generated asset or refunding a successful generation.

Production proof: feature SHA `b66cdb5a`, Vercel deployment
`dpl_yjENWWpGGPqVcbbMTuYsUTpZQfap`, 1,714 passing tests with 6 intentionally skipped, 14 desktop
and 390x844 Playwright journeys, CI typecheck, repository invariants, production build, and 22/22
creative-freeze checks. Authenticated production QA created two paid Gallery assets, verified
preview/cancel/apply/reload/failure/retry/undo, returned the unposted QA grid to 0 ready posts, and
left both assets in Gallery. Nothing was published and protected prompt hashes remained unchanged.

## 2026-07-21 — Checkout recovery and email runtime safety

Hardened the live Prompt Vault checkout recovery so successful buyers are excluded before every
touch, each recipient and stage is idempotent, and follow-up stages have durable atomic markers.
Bounded the AI photoshoot nurture and subscriber win-back batches so their cron runs can finish
inside Vercel's function limits. Added safe dry-run paths and moved the Prompt Vault Stripe form
ahead of decorative proof on mobile while preserving the approved desktop design and existing copy.

Production proof: feature commit `cc0c256b`, Vercel deployment
`dpl_2RKNJLcmquU2Ar4moYrx9TVQmRqn`, exact Git commit verified in the build log, 1,692 passing tests,
CI typecheck, changed-file lint with zero errors, repository invariants, production build, and live
desktop plus 390px mobile checkout QA. All three repaired email jobs completed live-data dry-runs
with zero sends; the production recovery columns were verified and the QA checkout record was
removed from recovery eligibility. No manual customer email was sent.

## 2026-07-20 — Free Prompts email path alignment

Aligned the active Free AI Prompts nurture with the current commercial path without adding or
removing a product. Delivery and Day 1 now focus only on getting the first useful image. Day 5 is
the first paid bridge, and Days 7, 9, and 11 continue to the existing $37 Prompt Vault. The separate
AI Photos Kit still exists, but the same lead is no longer switched between two $37 offers inside
one nurture sequence.

The copy now uses Sandra's current voice and states AI limitations honestly. It does not promise
that a face is technically locked, guarantee a two-minute result, invent urgency, or imply that a
buyer needs to purchase before trying the free result. The approved Stone email design and existing
Vault recovery sequence were preserved. No manual email was sent during this release.

Live evidence used: the free prompt delivery was the strongest evergreen click driver, while exact
successful Stripe rows showed that Prompt Vault recovery was already producing paid sales. The
Prompt Vault admin now reports those recovered sales and dollars from successful Stripe payments,
not email conversion flags. At production verification, the selected 14-day view showed 2 recovered
sales and $74 recovered revenue.

Production proof: release commit `6b8f3c21`, Vercel deployment
`dpl_4aPpmo7vNHyUc4B3yRdNjVS2a1AD`, complete Vitest suite, focused commercial tests, CI typecheck,
changed-file lint, repository invariants, voice rules, production build, visual inspection of all six
rendered emails, and authenticated production admin QA. The live Free Prompts and Prompt Vault pages
loaded with meaningful content, zero browser console errors, and no framework error overlay.

## 2026-07-20 — Membership credit claim cleanup

Aligned the remaining membership, account, free-credit, product, email-draft, and internal pricing
claims with the live policy: 100 included credits reset each billing month, while purchased top-ups
stay available. Retired unsafe legacy repair scripts. The separate One Selfie 200-credit pass and
paid 200-credit top-up were preserved.

Production proof: feature commit `bbd5496d`, Vercel deployment
`dpl_ERUWGMSy7hJZhb3VLLcQpGg2uyRW`, exact Git commit verified in the build log, full test suite,
CI typecheck, repository invariants, changed-file lint with zero errors, production build, healthy
database/cache/auth checks, and clean desktop and 390px mobile browser checks. The read-only live
postcheck found zero stale email claims, Stripe price metadata at 100, and zero resumable
subscriptions needing alignment. No email was sent and no customer balance or payment was changed.

## 2026-07-20 — Homepage commercial path

Connected the public homepage to the existing commercial journey without adding a product. The
current path is now Free AI Prompts to Prompt Vault to SSELFIE SUITE, with a real mobile navigation,
the approved SUITE product walkthrough, and a clear choice between the one-time Vault and ongoing
SUITE membership. Older generic homepage sections and stale navigation destinations were removed.

Why: visitors can now understand the first useful step, see the current product, and reach the paid
offers without guessing which SSELFIE page is current. Claude's separately approved Maya carousel
copy contract was preserved and shipped in the same linear main history; its prompt source was not
edited as part of the homepage release.

Production proof: release commit `01f2d316`, Vercel deployment
`dpl_FUf5Fh3igUhJfMakh53uiCCv9bkW`, CI typecheck, production build, repository invariants, voice
rules, 1,586 passing tests with 5 intentionally skipped, and 37/37 isolated reruns for the six tests
that timed out or leaked cleanup state under the full-suite load. Live desktop and 390px mobile QA
confirmed the homepage, SUITE walkthrough, 48px mobile menu targets, zero horizontal overflow,
working Prompt Vault and SUITE destinations, and zero browser console errors.

## 2026-07-20 — Prompt Vault buyer path completion

Completed the existing Vault-to-SUITE path without adding a new product or a new automated email.
The SUITE offer now appears only after a buyer copies her first Vault prompt. That first useful
action is measured separately from offer views and clicks. Subscription payment rows now retain the
original Vault checkout attribution and distinguish first payments from renewals.

Removed the unreachable retired $197 Day 3 email code and its stale admin reporting. Historical
database records were preserved. The active buyer email schedule remains unchanged.

Production proof: feature commit `b88ef789`, Vercel deployment
`dpl_58BYEjhT8uCGqSacgyEFy7psXPcr`, 1,587 tests passed with 5 intentionally skipped, CI typecheck,
production build, repository invariants, voice rules, desktop and 390px mobile buyer-flow checks,
and live non-transactional verification of the €49 first-month SUITE checkout and $39 Presets Bundle
downsell. No email was entered, no checkout session was created, and no payment was attempted.

## 2026-07-20 — Native Codex workflow cleanup

Removed repo-hosted AI task queues, custom agents, duplicated skills, tool-specific configuration,
generated automation commits, and their meta-tests. SSELFIE now uses native Codex plans, goals,
skills, connectors, and worktrees. The repository retains a short native `AGENTS.md`, product code,
customer/payment automations, product tests, canonical brand sources, and release safeguards.

Why: competing agent systems and stale task files were creating drift and making completed work look
unfinished.

## 2026-07-20 — Prompt Vault buyer commercial path

Shipped the paid Vault buyer path: an optional SUITE offer at €49 for the first month and €97/month
afterward, plus a clear $39 Presets Bundle downsell. Vault access remains independent and existing
SUITE members do not see the sales offer. A paid Vault token is verified server-side before the
one-time Stripe discount is applied.

Added separate measurement for offer views, SUITE clicks, declines, Presets clicks, checkout starts,
and successful Stripe payments. Corrected new monthly SUITE checkouts from the stale $97 USD price
pointer to the existing €97 EUR price; existing subscriptions were not changed.

Production proof: commit `5705e969`, Vercel deployment `dpl_cYSVo6yZ1cBDrettgvSCkDj2Lyu8`, clean
Turbopack build, five public route smoke checks, 19 focused tests, CI typecheck, repository invariants,
voice rules, forged-offer fallback, and live Stripe verification of €49 once then €97 monthly.

## 2026-07-20 — Membership credit cost controls

Changed SUITE membership from an additive 200-credit grant to a 100-credit reset each paid membership
month. Unused included credits no longer accumulate. Unused separately purchased top-up credits remain
available. Monthly resets now require a verified billing reference and are idempotent under concurrent
webhooks. Annual members receive the same monthly reset cadence from their verified annual payment.

Moved the remaining legacy photoshoot and Calendar feed-image paths to reserve credits before calling
the paid image provider. Insufficient balances now stop before provider cost, and failed provider starts
refund the reservation. Retired the old additive cron and manual backfill paths. The separate One Selfie
Visibility Bundle keeps its promised fixed 200-credit pass.

Production proof: feature commit `7e71dcc3`, Vercel deployment
`dpl_EP4xegbvhFZ2mTA4wccPvFVMuV9A`, exact Git commit verified in the deployment log, CI typecheck,
repository invariants, changed-file lint with zero errors, focused credit/payment tests, and a successful
webpack production build. Live desktop and 390px mobile QA confirmed the 100-credit promise, no overflow,
and zero browser console errors. Nine payment-verified active memberships were reset from 7,999 credits
to 1,220 total, including all 320 unused purchased top-up credits. Nine matching production ledger entries
were verified. The broad test run passed 350 files; unrelated existing sandbox, timing, and shared-mock
failures were isolated from this release, while the full credit-control boundary suite passed cleanly.

## 2026-07-21 — Maya writing API cost controls

Reduced Maya's writing cost without weakening the creative work. Simple clarification, Calendar
guidance, weekly recommendations, member briefs, workbook chat, and prompt-pack requests now use the
smaller model. Complex creative plans keep the stronger model with output limits sized to the actual
format. Create sends a shorter recent-message window, Calendar no longer repeats every saved caption,
and personalized recommendations are cached once per member and context each day.

Added request-level usage and cost records across the centralized Maya model path without storing
prompt or response content. The meter records feature, task, model, token use, status, timing, and
provider or estimated cost so future pricing decisions can use real production evidence.

Production proof: feature commit `10feed39`, Vercel deployment
`dpl_6erscnq3DKiEL2MQ9LZY9WMcYzJJ`, exact Git commit verified in the build log, CI typecheck,
repository invariants, 86 focused Maya and Calendar tests, full serial suite with 1,666 passing tests
and one confirmed pre-existing quote-style contract mismatch, and a successful Turbopack production
build. Authenticated desktop and 390px mobile QA loaded Create with zero browser errors or horizontal
overflow. The live recommendation used Haiku, logged an estimated `$0.005649` request, and created one
daily cache row; two subsequent reloads reused it without another AI call.

## 2026-07-26 — Prompt Vault access and password recovery

Removed password setup from Prompt Vault delivery and checkout. Buyers now receive one private Vault
link with a clear no-login message. Prompt Vault access remains token-based and independent from a
SSELFIE account.

Repaired the separate SSELFIE account recovery journey. Reset emails now return directly to the
password page, the browser waits for the Supabase recovery session before showing the form, completed
password setup is recorded against the authenticated member, and expired or malformed callbacks lead
to a useful recovery page instead of the homepage.

## 2026-08-08 — Revenue control recovery handoff

Added an exact-shoot preview immediately after a free prompt is copied: the free image stays visible
beside three matching locked Vault frames, with the existing $37 Prompt Vault next step. Hardened the
existing nurture lifecycle so malformed recipient records are filtered and are not retried every day.

Why: live evidence showed healthy free-prompt use but almost no click-through to checkout, while the
checkout itself remained healthy. Production proof: commit `da594276`, Vercel deployment
`dpl_J5Nav7VCDEz88cXG2qaGMdzeA2XV`, full typecheck and build, 1,957 passing tests plus 6 intentional
skips, responsive desktop and 390px buyer-flow verification, and no affected-route runtime errors.

## 2026-08-08 — Maya founder test mode

Added a founder-only report-and-continue workflow inside Maya. Sandra can describe an issue by text
or voice, optionally attach the current Maya screen, save it with the active task and recent relevant
turns, and continue testing. Reports have one durable workflow from Received through Ready to retest;
only Sandra can mark the final result Fixed. A pinned Maya Test Lab task and quiet queue heartbeat now
keep product fixes separate from the strategy conversation.

Screenshots are encrypted with AES-256-GCM before they enter the public-only Blob store. The key stays
in the live database, and the image is decrypted only through an authenticated admin route. Uploads
and downloads validate the real image signature instead of trusting the filename or claimed MIME type.
No member access, entitlement, price, payment, subscription, or credit behavior changed.

Production proof: feature commit `c76c9c7e`, encryption commit `987a00ca`, final viewer commit
`3fbc7e27`, and exact Ready deployment `dpl_7BepGbirtSxnALaLLmjpqgSXqVKE`. The repository passed
typecheck, invariants, production build, and 1,984 tests with 6 intentional skips. Authenticated live
QA passed report capture, context, encrypted storage, queue state, a decrypted 1280x720 attachment,
desktop and 390px mobile usability, and zero runtime errors on the final deployment.

## 2026-08-09 — Cool SUITE depth

Added a cool porcelain, smoke, mist, steel, slate, and graphite depth layer across Maya, Gallery,
Calendar, Learn, Account, and the shared navigation. The SUITE keeps its quiet editorial restraint,
but large white surfaces now separate clearly through cool tonal bands, stronger borders, selected
navigation, and restrained shadows. No access, entitlement, credit, price, payment, or rollout
behavior changed.

Why: founder testing showed that the approved minimal interface had become too flat and
black-and-white across the whole SUITE. Production proof: feature commit `61ae562d`, exact Ready
Vercel deployment `dpl_81GrJnh867MrEmd9iiBAqcTTcbvS`, CI typecheck, repository invariants, changed-file
lint with zero errors, a successful Turbopack production build, and 1,986 passing tests with 6
intentional skips. Authenticated live QA loaded all five SUITE tabs on desktop and at 390px with the
new cool palette, no horizontal overflow, and no framework error overlay.

## 2026-08-09 — Maya one-job founder preview

Focused Maya's first product job on turning one saved selfie and one idea into one finished,
ready-to-post piece with its visual and caption together. Maya now opens with one primary
`Create my next post` action, silently chooses a selfie-led photo or a short teaching carousel, and
removes competing next-format actions until the post is placed in Calendar. Ordinary questions still
start from the same composer, and existing saved tasks remain compatible. No member access,
entitlement, credit, price, payment, subscription, or checkout behavior changed.

Production proof: feature commit `8331259a`, exact Ready Vercel deployment
`dpl_FppMSAa2RBs8ZiJedUpsmWLmhoeG`, typecheck, repository invariants, changed-file lint with zero
errors, a successful production build, and 1,986 passing tests with 6 intentional skips. Independent
target-member journeys passed the narrowed creation, Calendar placement, exact reload/Resume, and
retry-safe no-duplicate boundaries on desktop and 390px mobile. Authenticated live QA confirmed Maya
Home first, the one-job action and composer above the fold at 390x844, and zero browser console errors.

## 2026-08-12: Work With Me one-clear-offer lane

Focused the private four-week Work With Me sprint on one result: turn one existing skill or service
into one clear offer, one message people understand, and a four-week visibility plan. Removed the
unsupported payment-plan and SUITE promises, tightened the application, made the kickoff call the
primary buyer next step, and added attended sales-assistant drafts that never send automatically.

Why: live evidence showed warm Work With Me interest but no paid clients, while the page and follow-up
path asked the buyer to understand too many outcomes at once. Production proof: feature commit
`fb75f7c5`, exact Ready Vercel deployment `dpl_DDFiCUKNubfttECJW8pYqZ6mMqoZ`, typecheck, repository
invariants, a successful production build, 2,036 passing tests with 6 intentional skips, and focused
post-rebase coverage. Live desktop and 390px mobile QA confirmed the focused promise, six required
application fields, the €2,000 paid-in-full price, and no old payment-plan or SUITE promise.

## 2026-08-13 — Maya one finished-post experience

Made Maya the creation home for full and trial members and reduced the primary member app to Maya,
Work, and You. Members now begin with what they want to say, share, or sell; Maya quietly chooses the
strongest format and moves one idea toward one finished post. The finished result keeps its visual and
caption together, removes the format-room and create-another menus, and offers one refinement action:
`Make it more like me`. Existing work, conversations, selfies, Gallery, Calendar deep links, credits,
entitlements, and limited-account protections remain intact. Founder reporting remains admin-only.

Why: founder testing showed that format switches and repeated choices made Maya feel like several
tools mixed together instead of one dependable creative partner. Production proof: feature commit
`a0d09768`, exact Ready Vercel deployment `dpl_Cd6yATcMmiJCpHdWiGw3WeHhhQBe`, CI typecheck,
repository invariants, lint with zero errors, successful local and Vercel production builds, 2,039
passing tests with 6 intentional skips, 24 post-integration regressions, and 10 desktop/mobile browser
journeys covering first-time members, returning members, saved work, finished posts, and founder
report protection. The production app and health routes returned successfully on desktop and mobile.
