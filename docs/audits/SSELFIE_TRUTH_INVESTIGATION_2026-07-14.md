# SSELFIE Truth Investigation — audience, customers, recurring value, business model

Date: 2026-07-14 (drafted during One Selfie event dead time, per Sandra's 8-part brief)
Method: direct SQL against production Neon (all money numbers from `stripe_payments` with
`status IN ('succeeded','paid')`, test mode excluded) + three independent web research agents
(retention mechanics, monetization models, voice-of-customer) + prior verified audits.
Labels: **FACT** (queried/verified) · **INFERENCE** (strongly supported) · **HYPOTHESIS** (plausible, untested).

---

## PART 1-2 — Who the audience and customers actually are (internal evidence)

### The money, all-time (FACT)

| Product | Payments | Distinct buyers | Revenue |
|---|---|---|---|
| SUITE membership | 175 | 48 | $10,396 |
| Credit top-ups | 51 | 19 | $1,904 |
| Prompt Vault | 50 | 48 | $1,440 |
| One-time sessions (legacy) | 28 | — | $784 |
| Starter Kit | 21 | 19 | $777 |
| (untyped) | 9 | 9 | $489 |
| Feed Planner blueprint | 33 | 14 | $188 |
| Selfie Guide (retired paid) | 6 | 6 | $104 |
| Presets | 3 | 1+ | $97 |

Corrections to our own narrative (FACT):
- **Membership is the largest lifetime revenue line, ~$10.4K from 48 member-buyers** (~$217
  average lifetime revenue per member). "Subscription has never worked" is FALSE as history —
  what's true is that it stopped: retention decays and new-member acquisition collapsed.
- **19 people paid 51 credit top-ups ($1,904) — repeat, usage-based, voluntary extra payments.**
  A heavy-use segment existed and paid MORE than list price when they were in a creating phase.
- Refund records: none present in `stripe_payments` statuses (succeeded/paid/duplicate only).

### Cross-buying (FACT)
136 buyers bought exactly one product type; 10 bought two; 1 bought four. The product LADDER
essentially does not function — people buy one thing for one job and stop. The single 4-product
buyer + 2-product buyers account for $4.9K of ~$16.2K (30% of revenue from 7% of buyers).

### Usage distribution among all 68 member accounts ever (FACT)
- 28 (41%) generated ZERO images.
- 6 light (1-30 images) · 20 mid (31-200) · 14 heavy (200+).
- Active members today: median 14 images. Canceled members: median 30 — **cancellers used MORE
  than current actives.** They completed their job and left (INFERENCE).
- Heavy/top-up users' last generation dates: mostly March-May 2026 — they faded BEFORE the June 10
  App v3 cutover (FACT). Burn-hot → decay → cancel over 2-5 months.
- **One member (joined Nov 2025) has 1,042 images and generated again TODAY** — 8 months of
  sustained use. The genuinely recurring user exists; n=1 (FACT).

### Who they are (from `user_personal_brand`, 347 rows, 213 with business_type) (FACT)
- Dominant self-descriptions: **Content Creator (~44), Coach/Life coach/Transformational (~20),
  service providers** (hairstylist, VA, builder-adjacent). "Consistency" is the most repeated
  audience-challenge answer, five times verbatim.
- 54 of 117 identifiable buyers (46%) have a business signal on file (INFERENCE: roughly half of
  buyers are business-ish; the other half are personal/confidence buyers).
- `users.profession` / `photo_goals` are empty for 903 of 907 accounts — onboarding never captured
  identity at scale (FACT). Any deeper demographic claim would be invented.
- IG audience (verified June): 97% women, 86% aged 35-64, US-dominant.

### Entry point → purchase (checkout_attribution, FACT)
- `SELFIE` keyword: 33 touches → 5 purchases (**15%** — the strongest keyword by far).
- Free selfie-guide access pages: 33 touches → 10 purchases (30%).
- Free prompt → full-shoot upsell: 440 → 14 (3.2%).
- `VAULT` keyword: 190 → 2 (1%). `SUITE` keyword: 13 → 0. Masterclass page: 50 → 0.
- Email: 358 → 24 (6.7% of attributed touches).
- INFERENCE: buyers enter through the *selfie-improvement* door, not the vault/membership door.
  The more product-y the entry, the worse it converts.

### Timing (FACT, with caveat)
Median time from account creation to first purchase: 0 days (avg 25). Caveat: many accounts are
created BY the purchase webhook. Still consistent with trigger-buying: they buy on arrival-with-
intent, not after long nurture (INFERENCE).

### The free audience (FACT)
5,421 freebie subscribers → 1,930 opened (36%) → 83 clicked a paid CTA (1.5%) → 83 became users.
Massive attention, near-zero crossing. Free-prompt collectors are a real segment and they are
NOT latent buyers at meaningful rates.

### What members do inside (FACT)
App v3 chat titles are overwhelmingly *photoshoot* jobs: "plan a 6-shot shoot", "recreate this
style", "use my inspiration image", occasional content-planning. Maya chat categories: general
(1,455), Style Consultation (463), Photo Creation (1). Top image categories: photoshoot (3,637),
Environmental Portrait, Half Body Lifestyle. Notably, the small "Lifestyle" category has a 64%
favorite rate (380/595) vs ~3.5% for generic photoshoot — casual-real output resonates most
(INFERENCE: "still you, in your real life" is what they keep).

### Support/feedback language (FACT, n=51 feedback rows)
Dominated by friction: generation glitches ("ask Maya to do a photo shoot… it never creates
them"), access problems ("asking in all different places for help"), account deletion/cancel
requests, preset access confusion. 26 bug reports vs 3 feature requests. INFERENCE: reliability
and support gaps are an active churn accelerant. Published testimonials table: empty.

### Segments that survive the evidence (Parts 1-2 verdict)

| Segment | Evidence | Buys | Recurring need? |
|---|---|---|---|
| S1 Free prompt collectors | 5.4K subs, 1.5% CTA click | Rarely ($37 max) | No |
| S2 Personal-confidence buyers ("photos I finally like") | ~half of buyers, SELFIE keyword 15%, guide pages 30% | One-time $37-97 | No — job completes |
| S3 Creator/coach business builders | ~46% of buyers w/ business signal; "consistency" language | Membership + top-ups | **Burst-recurring** (content cycles) |
| S4 Power creators (top-up payers) | 19 payers, $1.9K extra, 300-1000 imgs | Paid list price + overage | Yes while active; decays 2-5 mo |
| S5 Legacy one-time session buyers | 28 payments | One-time | No |

---

## PART 3 — Jobs to be done (internal language + behavior)

Ranked by evidence strength:

1. **"Give me photos of myself I actually like and can use"** — one-time/occasional. Strongest
   converting entry (SELFIE 15%, guide 30%). Emotional core: confidence + identity safety
   ("looks real, and me"). Job completes → churn is RATIONAL.
2. **"Turn my selfie into a specific look I saw"** (inspiration-recreate) — occasional bursts.
   Dominant in-app behavior (chat titles). Entertainment + aspiration mix.
3. **"Keep my content going — consistency"** — the stated challenge of the creator/coach segment.
   Weekly-monthly cadence, connected to revenue. This is the only genuinely RECURRING job in the
   data, and today the product serves it only partially (photos, not the posting workflow).
4. **"Make me look professional without a photoshoot"** — deadline-triggered (website, LinkedIn,
   launch). One-time with periodic refresh (quarterly-ish). HYPOTHESIS on refresh cadence.
5. **"Help me know what to post / what to say"** — voiced in audience polls and by coaches;
   weakly served today (Maya does photos; content planning is thin). HYPOTHESIS: this is the
   unmet half of the consistency job.

Frequency verdict (FACT-based): jobs 1-2 and 4 are one-time/occasional — they explain the revenue
history AND the churn. Job 3 (+5 as its content half) is the only recurring job, it belongs to the
creator/coach segment, and the product currently completes only the photo part of it.

---

## PART 4a — Why people keep paying elsewhere (external research, agent 1, all cited in source report)

Benchmark (VERIFIED, RevenueCat State of Subscription Apps 2026, 115K apps): AI apps monetize +41%
better per payer but churn ~30% faster; 12-month retention of MONTHLY plans is **6.1%** for AI apps
(9.5% non-AI); annual 21.1%. On a typical AI monthly plan ~94% of subscribers are gone within a
year. Any subscription design must assume this gravity.

Retention mechanism taxonomy, ranked by observed strength:

1. **Tied to revenue operations** (Kajabi: migrating loses 15-25% of a creator's paying
   subscribers; Stan: worth it only when actively selling). Strongest, hostage-grade.
2. **Accumulated assets you'd lose** (Canva, 31M paying: years of designs + Brand Kits that lock
   on downgrade; cancel flow weaponizes loss aversion).
3. **The weekly workflow lives inside** (Buffer/Later/Planoly own the publish ritual — though a
   commodity one, partly propped by forgotten annual plans).
4. **The product learns you** — most promised, least delivered anywhere; the only durable version
   is a trained likeness (PhotoAI's model = closest analogue to Maya memory).
5. Fresh template/content drops — supporting, never primary.
6. Community — helps, doesn't abolish churn (Skool's own community: ~18%/mo average member churn;
   2.5-5%/mo is "healthy" for paid communities).
7. **Billing friction — the dishonest mechanism**: Remini Trustpilot 1.4/5 (82% one-star,
   post-cancel charges), CapCut 1.2/5, Adobe's $150M FTC/DOJ settlement over cancellation fees.
   A large share of measured "retention" in this market is people who couldn't cancel. NEVER copy
   (contradicts the No-Fake trust doctrine and invites the same collapse).

Category-specific verdicts (VERIFIED): AI-headshot winners chose ONE-TIME pricing (HeadshotPro
$29-59/shoot ~$300K/mo peak; Aragon $35-75 packs) because the job is episodic; PhotoAI subscription
~$132K MRR with signs of decay; Jasper/Copy.ai collapsed as consumer subscriptions when ChatGPT
gave 80-90% of the value — Copy.ai abandoned self-serve entirely.

Implication for SSELFIE: photos alone = episodic = one-time pricing (external evidence agrees with
our internal churn curve). Subscription is EARNED only when the weekly job lives inside the
product: photos → captions → publishing → offer → income, with accumulating brand assets and real
Maya memory as the honest switching cost.

---

## PART 4b — Monetization model evidence (agent 2, all cited in source report)

Cross-cutting benchmarks (VERIFIED, RevenueCat 2026): monthly plans retain a median **11% at one
year** (annual 28%, but 35% of annual cancels happen in month 1 and 95% of canceled annuals never
return); hard paywalls convert trials 10.7% vs freemium 2.1%; only **4.6% of new subscription apps
ever reach $10K MRR within two years**; hybrid buyers (one-time + subscription mixes) are 7% of
buyers but 25% of revenue.

The 10 models, verdict-style:

1. **One-time only** — HeadshotPro $29-49/shoot (~$300K/mo peak, 196K customers), Aragon $35-75
   packs ($10M+/yr, 83% choose middle tier). Works when the job is sharp and price-anchored
   against a photographer. Fails on viral-spike demand (Lensa: $30.7M/mo → $1.1M in 4 months).
2. **One-time + occasional repurchase** — Lensa still made ~$18M the year AFTER its crash from
   repeat pack buyers. Works with cheap re-activation (an owned list). This is the shape of
   SSELFIE's own history (Vault, Kit, sessions).
3. **Credits/pay-per-use** — works layered on another model for heavy users (SSELFIE's own
   top-up data: 19 payers/$1.9K agrees). Fails as the sole model (no floor).
4. **Subscription tiers** — $9-29 = one sharp job (Stan $29: $35M ARR but growth collapsing as
   churn caught acquisition); $30-60 = multi-channel brand system; $79-149 must "run the
   business, not be a tool" (Stan Pro adds email/funnels/affiliates; Kajabi's Jan 2026 repricing
   to $179 triggered a 1-star exodus — evidence of a solo-creator price ceiling near $100).
5. **Subscription-after-outcome** — young but real (Aragon one-time → optional credit sub;
   HeadshotPro web one-time → $9.99/mo app). Works when the outcome proves quality first. No
   public LTV proof yet (honest gap).
6. **Annual membership** — 2.5x the 1-year retention of monthly, IF value lands in month one.
   Fails on bursty usage (pay 12 months, need 3 weeks, never return).
7. **Software + community** — paid communities churn 7-11%/mo content-only, 2.1%/mo during live
   cohort periods; creators running 3+ cohorts/year earn ~2.1x. Cohort energy, not content drip,
   is what retains.
8. **Software + recurring content drops — the proven model FOR THIS EXACT AUDIENCE**: styled-stock
   memberships for women entrepreneurs (Styled Stock Society $120/qtr, Haute Stock $139/qtr or
   $399/yr, Élevae $42/mo) — weekly visual drops, quarterly billing, long-lived businesses. The
   recurring need "fresh marketing visuals every month" is real and already monetized — but at
   $40-45/mo equivalent, not $97.
9. **B2B/teams** — headshot corporate deals $5K-50K reported; works only after consumer quality is
   proven; likeness consistency at scale is the risk.
10. **Hybrid one-time + recurring** — now the industry default (35% of apps mix models).

The burst-job lesson (VERIFIED): products serving burst needs with monthly/annual subs (Resume.io's
auto-renew trap, Remini's weekly billing) make revenue AND 1.2-1.4/5 Trustpilot reputations. Burst
needs fit one-time or pay-per-event. Recurring pricing belongs only on genuinely recurring needs.

---

## PART 4c — Voice of the customer (agent 3; quotes verbatim from observed pages; Trustpilot/App Store quotes reached via aggregators — chain noted in source report)

Jobs in buyers' own words, with frequency:

- **"Look professional for LinkedIn/job hunt NOW"** — event-driven, ONE-TIME. "Totally worth the
  $29 I paid." Anchor: "$300 to $600 for a professional headshot."
- **"Still ME — a photo I feel confident using"** — the acceptance bar: "Would she really look
  like me — like, 'fool-my-dad look like me'?" The failure: "decidedly me but also decidedly NOT
  me… It felt dishonest." This is SSELFIE's founding promise, in the market's own words.
- **"Stopgap photos for my website/launch before the business earns money"** — burst at launch.
- **"Not have to be photographed at all"** — real pre-existing pain (privacy, self-consciousness,
  safety). The pain that blocks visibility.
- **"Feel beautiful / like myself again"** — emotional burst (the Lensa spike: curiosity
  sugar-high, documented backlash: "makes you look younger…thinner…whiter").

Top complaints: 1) likeness failure, dominant ("NONE of the AI pix looked like me", "Who is that
lady?", "extra teeth… baby fingers"); 2) plastic over-perfection ("a heavily botoxed version of
me", "wax figures"); 3) skin-lightening/ethnicity erasure; 4) subscription traps ("$10 per week
for about 4 months", "keep charging me after repeatedly cancelling"); 5) refund friction.

Willingness to pay: fair = **$25-49 one-time for a big batch**; ripoff = recurring app billing.
75% of surveyed Lensa users called the subscription overpriced.

Key inference (agent's, endorsed): buyers won't subscribe to "photos of me"; recurring intent
appears only when photos fuse with ongoing content/visibility output — photographers already sell
QUARTERLY brand shoots on exactly this logic ("images that keep your content fresh").

---

## PART 5 — The missing value (current product vs the eight statements)

What a member gets today: a chat that generates photo options, credits, a gallery, courses.
Against each target feeling:

| Feeling | Today | Missing |
|---|---|---|
| "Saves me meaningful time" | Generates OPTIONS she must direct, pick, caption | COMPLETION: chosen best-of, captioned in her voice, sized, ready to post |
| "Understands my brand" | Maya learns ~nothing between sessions (pulse audit) | Durable brand/offer/likeness memory that visibly compounds |
| "Can't get from ChatGPT alone" | Prompt anatomy (teachable, and we teach it free) | Delivered outcome quality + her offer woven in + memory |
| "Completes work" | No connection to what she sells | Captions/CTAs tied to HER offer; a week's plan, not a photo pile |
| "More valuable over time" | A gallery | Accumulating brand kit, style memory, organized asset library |
| "Helps me sell/launch/show up" | Absent | Content mapped to her launches/calendar |
| "I'd lose something if I cancelled" | Nothing (photos download) | The compounding memory + the arriving monthly drop |
| "I want to be part of this" | Sandra's story (unexploited in-product) | Belonging is optional; NOT the retention lead (see Skool churn data) |

The missing value is NOT more features. It is: (a) finishing the job instead of generating
options; (b) memory that compounds; (c) attachment to her business cycle; (d) reliability + support
trust (the feedback table is bug/cancel dominated — an active churn accelerant).

## PART 6 — Wow concepts, tested against the evidence

Constraint honored: no model may depend on Sandra manually fulfilling low-priced orders (manual QA
allowed only during validation batches).

1. **THE MONTHLY BRAND DROP (strongest subscription concept).** Every month, without her asking,
   Maya produces a fresh personalized shoot in the member's visual world — seasonal, on-trend,
   still-her — plus captions mapped to her offer; she opens, picks, posts. This is the
   styled-stock membership model (Styled Stock Society / Haute Stock / Élevae — proven for women
   entrepreneurs at ~$40-45/mo equivalent) with the one upgrade none of them can offer: SHE is in
   the photos. Serves the only recurring job in our data ("consistency"). Fully automatable with
   the existing Shoot Studio pipeline (it already does this for Sandra herself). Evidence for:
   external model proven; internal "consistency" language; n=1 retained heavy user behaves exactly
   like this. Evidence against: price ceiling ~$40-49 (not €97) per external comps; caption
   quality in her voice unproven at automation scale.
2. **ONE SELFIE → LAUNCH/WEEK KIT (strongest one-time outcome).** Already contracted
   (ONE_SELFIE_WEEK_OUTCOME_TEST_2026-07-16.md): selfie + offer in → finished week of brand
   content out, 48h, $97-129. The front door for the business-builder segment and the deadline
   buyer. Repeatable per launch (model 2's repurchase shape).
3. **BRAND SHOOT DONE ($49-79 one-time).** Pure delivered photo set at the top of the commodity
   band; the confidence/deadline segment's door; upsell path into 1 and 2. Evidence: fair-price
   window $25-49 batch + still-you premium justifies the top of the band.
4. Visual-content OS with publishing/scheduling (€97+ "runs her visibility"): REJECTED for now —
   heavy build, commodity workflow (Later/Buffer), retention myth without proven habit. Revisit
   only if Drop retention proves the habit exists.
5. Membership + live cohorts: retention evidence is real (2.1%/mo churn during cohorts) but it
   spends Sandra's time — deferred; async challenges could substitute later.

The wow journey (applies to 1-3): she sends one selfie and one sentence about what she sells →
within 48h a delivery lands: her, in her world, photos she'd never admit are AI, captions that
sound like her, the first post already chosen → she posts the same day → next month (Drop) a new
one arrives without her lifting a finger. Fast value, visible before/after, zero learning, her
real business woven in.

## PART 7 — Model comparison (condensed; full evidence in 4b)

| Model | Fit for SSELFIE | Verdict |
|---|---|---|
| 1 One-time only | Matches episodic jobs (½ of buyers) | ✅ Front door |
| 2 One-time + repurchase | Launch/quarterly refresh cycles | ✅ Natural second sale |
| 3 Credits | Already proven internally ($1.9K topups) | ✅ Keep, layered |
| 4 Low sub $39-49 | Monthly Drop tier (styled-stock comp) | ✅ THE honest subscription |
| 4b Sub $97+ | Must "run the business" — not true today | ⚠️ Only if Drop+memory+offer-engine all land |
| 5 Sub-after-outcome | Right sequencing per external+internal evidence | ✅ The order of asks |
| 6 Annual | Only after monthly retention proven | ⏸ Later |
| 7 +Community | Churn math weak without live cohorts (Sandra time) | ⏸ Not now |
| 8 +Recurring drops | The proven mechanism for this exact audience | ✅ Core of the Drop |
| 9 B2B/teams | Real money (headshot corp deals $5-50K) but likeness-at-scale risk | ⏸ After consumer proof |
| 10 Hybrid | Industry default; hybrid buyers 7% of buyers, 25% of revenue | ✅ The umbrella |

## PART 8 — VERDICT

### A. Definitely true (FACT-grade)
1. Photos-of-me is an episodic job; completing it and leaving is rational customer behavior (our
   churn curve + every external comp). 2. Membership historically produced the most revenue
   ($10.4K/48 buyers) and then stopped acquiring+retaining; cancellers out-used current actives.
3. A heavy-use segment existed and voluntarily paid overage ($1.9K/19 people); it decayed in 2-5
   months. 4. ~Half of buyers show real business signals; their stated challenge is consistency.
5. Free-prompt collectors (5.4K) do not become buyers at meaningful rates (1.5%). 6. The
   selfie-confidence door converts (SELFIE 15%, guide 30%); product-doors don't (VAULT 1%,
   SUITE 0%). 7. Externally: one-time outcome pricing wins this category; AI subs are the
   worst-retaining class measured; subscription billing traps are the market's #1 trust killer.
8. Likeness failure is the market's dominant complaint; "still you" is the acceptance bar in
   buyers' own words. 9. Reliability/support friction is present in our own feedback and
   accelerates churn.

### B. Likely true (INFERENCE)
The styled-stock membership model transfers to a personalized version at ~$39-49/mo. The n=1
8-month retained creator is the template of a replicable segment, not a fluke. €97/mo is above the
solo-creator ceiling unless the product runs her visibility end-to-end. Sub-after-outcome is the
right sequence of asks. The Vault's $873/30d is durable small-scale demand, not a growth engine.

### C. Unknown (cannot answer from current data)
True size of the business-builder segment inside HER audience. Refresh cadence of deadline buyers
(quarterly?). Whether automated captions in her voice reach acceptable quality. Whether Maya
memory can compound likeness quality enough to be a real switching cost. $39 vs $49 elasticity.
Why exactly each heavy user faded (no exit interviews — should start).

### D. Best customer segment
Women 35-64 who already sell or are building something (coaches, creators, service providers) and
name consistency as the struggle. Evidence: 46% of identifiable buyers, 100% of top-up payers with
subs, the one long-retained member, the only recurring job in the data, and the segment external
models monetize recurringly.

### E. The job SSELFIE should own (customer language)
**"Keep me visible: photos and posts that still look like me and sell what I do — fresh every
month, without me learning anything."** Short form: *she stays visible; it stays her.*

### F. Recommended model: HYBRID, SEQUENCED
One-time outcome products as the front door ($37 Vault stays; $97-129 One Selfie Week Kit; a
$49-79 Brand Shoot Done as the commodity-band door) → **the Monthly Brand Drop subscription at
$39-49/mo offered only after a delivered outcome** → credits on top for heavy use → €97+ tier only
if/when Drop retention proves the habit and the offer-engine ships. Do NOT lead with subscription.

### G. The subscription case (answered honestly)
Why subscribe: a fresh personalized shoot + captions arrives monthly (proven recurring need:
consistency/content freshness). What she returns to do: open the drop, pick, post — monthly, in
minutes. What compounds: brand/style/likeness memory, organized asset library, content mapped to
her offers. What she loses by cancelling: the arriving drops and the compounding memory (honest
switching cost — never billing friction). **The CURRENT €97 SUITE as-is does not meet this bar;
by this report's standard SSELFIE should not lead with the current subscription.**

### H. Strongest wow concept end-to-end
One selfie + one sentence about her offer → 48h → delivery: her, in her world, recognizably her,
captions in her voice, first post chosen → posts same day → monthly drops keep arriving. First
purchase one-time; the Drop continues the relationship; nothing to learn at any step.

### I. Smallest credible validation test
Extend the already-committed One Selfie Week test (200 qualified visitors, ≥10% checkout start,
≥2-3% purchase, ≥50% use delivery, refunds <5%) with ONE addition: **at delivery, every buyer is
offered the Monthly Brand Drop at $39-49.** Thresholds: ≥25% of buyers accepting = subscription
case proven with money; <10% = stay one-time. Failure decode: low traffic-to-checkout = audience
or promise mismatch; checkout-no-buy = price; buy-but-don't-use = product/delivery; use-but-no-Drop
= no recurring need. Manual QA during the batch is validation, not the model.

### J. Stop immediately
Selling €97 recurring to cold audiences (all data says no). Optimizing content for free-prompt
collectors as the primary engine. New features without repeat-use evidence. New bundles/courses.
Ads (until tracking + 20 organic buyers + stable conversion). The tool spend that doesn't touch
revenue (invoice audit). Treating followers as qualified buyers in any projection.

### K. Protect
Sandra's face, story, and trust (the uncopyable asset — the synthetic wave makes it MORE valuable).
The No-Fake / still-you doctrine (it is the market's stated acceptance bar). The likeness pipeline
+ human QA (the #1 complaint elsewhere is our differentiator). The reach engine (repointed at the
business-builder segment). The $37 Vault. The email list. The one retained member's experience
(study her; she is the product roadmap).
