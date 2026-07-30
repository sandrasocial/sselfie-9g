# Vault Maya Implementation Audit — Evidence Report

Date: 2026-07-30 (evening). Auditor: Claude (same agent that built the feature — noted as a
limitation; §7 gives an independent agent everything needed to re-verify without trusting
this document).

State at audit time: ALL implementation and launch work PAUSED per Sandra. No emails sent to
customers (one [TEST]-prefixed welcome email was sent to Sandra's own inbox at her request).
No pricing deadline changed during this audit. No code changed during this audit.

Hard fact that frames everything: **zero real Vault Maya purchases exist.**
`stripe_payments` and `subscriptions` contain 0 vault_maya rows (verified live, §7-Q5).
Every claim about the purchase→fulfillment→renewal→cancellation lifecycle is therefore at
best code-inspected, never production-proven.

---

## 1. Product Truth Contract

### 1a. Requirements explicitly approved by Sandra (her words, this session)

| # | Requirement | Source (Sandra's message) |
|---|---|---|
| R1 | Self-serve mini product: vault buyers get "their own little chat with maya… instead of pasting it into chatgpt" | "Now What I was trying to explain… litterally that. just more simple." |
| R2 | Lower monthly cost than SUITE; Maya only produces the vault images | same message |
| R3 | Not capped to weekly drops — "They can use it as much as they want and choose from all the collections" | "Dont just cap it to this weeks drops" |
| R4 | $19/month founder price for one week, then $29/month | "door founder price for one week at $19 is a good price for 30 photos then it goes up to $29" |
| R5 | 30 photos for the price | same message |
| R6 | Credit top-up available "if they want more credits" | same message |
| R7 | Weekly drops of new styles/shoots by Sandra | "I drop new styles and shoots every week" |
| R8 | Save everything into a "smart gallery" | same message |
| R9 | Selfie uploaded once | same message |
| R10 | "Tell me what I should create in the next drop" — messages AND inspo images | "People can send me inspo images or just messages" |
| R11 | Live same day; retire after 1–2 weeks if it doesn't work | "I want this live today. and if it doesnt work after a week or two, Fine then we retire it" |
| R12 | Launch to entire list except SUITE members | "Why not launch it to my entire list? Except the ones who are allready members of the suite?" |
| R13 | Page copy = her rewrite; outcome-first; protect the Prompt Vault; no banned fragments; Sandra speaks | her rewrite message |
| R14 | Welcome email with studio link, first-photo instructions, renewal, top-ups, cancellation, support | audit-ordering message |
| R15 | Defined failure/credit policy; accurate selfie storage/replacement/deletion FAQ | same |
| R16 | Measurement: separate acquisition/checkout/activation/acceptance/mature retention; no auto-stop | same |

### 1b. Assumptions I made (full register with risk in §5)

A1 price flip timestamp/timezone · A2 founders keep $19 via price-pinned subscriptions ·
A3 "chat" delivered as tap-to-create without free-form chat · A4 30 photos = 30 credits in
the shared wallet, reset (not rolled over) at renewal · A5 vault tier excluded from full
app; /app redirects to studio · A6 SUITE members/trials get studio access free · A7 trial
users excluded from launch emails · A8 selfie-deletion-by-reply promise · A9 "about 30
seconds" timing claim · A10 top-up = existing shared credit packs at existing prices ·
A11 retire = stop selling, existing members keep access · A12 buyers get launch email hours
before the list · A13 monthly credit reset wipes unused subscription credits.

### 1c. Implementation decisions Sandra did NOT approve

| # | Decision | Where |
|---|---|---|
| D1 | Exact flip moment 2026-08-06 21:59 UTC (= 23:59 Marbella) | cash-launch-pricing.ts |
| D2 | New access level "vault" evaluated BEFORE bundle-pass and trial in getSuiteAccess | suite-trial.ts:93 |
| D3 | Vault users blocked from the full /app (redirect to studio) | app/app/page.tsx |
| D4 | No guard preventing an existing SUITE member from buying Vault Maya | checkout/vault-maya |
| D5 | Selfie deletion handled manually via support reply (promised in live FAQ) | public-marketing.tsx |
| D6 | Studio has NO account/cancel surface (copy still says "cancel anytime from your account") | vault-maya-studio.tsx |
| D7 | Generation quality "medium" (cost/likeness tradeoff inherited from SUITE) | generate/route.ts:98-100 |
| D8 | Founder-price env fallback: if founder env var were missing, checkout silently uses the $29 price during founder week | cash-launch-pricing.ts (verified by simulation §7-Q8) |

### 1d. Unfinished features (never claimed live, listed for completeness)

- Free-form Maya chat in the studio (R1 as literally worded — see §1e/F1)
- Inspo IMAGE upload for next-drop requests (R10 — API field exists, no UI)
- Admin digest/surface for reading drop requests (rows only reachable via SQL)
- Any account/billing/cancel surface reachable by a vault-only user (D6)
- Launch broadcast setup (paused before creation)

### 1e. Ambiguous requirements — SANDRA MUST DECIDE (not resolved by me)

| # | Ambiguity | Options |
|---|---|---|
| Q-A | Does "their own little chat with maya" REQUIRE free-form chat in v1, or is tap-to-create acceptable? Current v1 has no chat input to Maya (only the request-to-Sandra box). | accept v1 / build scoped chat before launch |
| Q-B | May a SUITE member buy Vault Maya (paying for a subset they own)? Block, warn, or allow? | block / warn / allow |
| Q-C | What should happen to an ACTIVE TRIAL user who buys Vault Maya? Current code DOWNGRADES her from full-app trial to studio-only (D2 ordering). Same for One Selfie bundle-pass holders. | fix ordering / intended |
| Q-D | "30 photos a month": credits reset on billing date (unused monthly credits vanish; purchased top-ups preserved). Acceptable? Copy says "refreshed", does not say "unused ones expire". | accept copy / disclose expiry |
| Q-E | "About 30 seconds": internal 2026-06-10 measurement says medium quality ≈ 82s; my single live test was ~35s. Keep, soften ("usually under a minute"), or re-measure? | keep / soften / measure n≥20 |
| Q-F | Founder week Day 0 and whether the Aug 6 flip moves. | date decision |

### 1f. Promised in live copy but NOT available in v1 (truth failures still live)

| # | Live claim | Reality | Where claimed |
|---|---|---|---|
| F1 | "Cancel anytime from your account" | A vault-only user has NO reachable account surface: /app redirects her to the studio, and the studio has zero account/billing links (verified §7-Q10). Stripe portal API route exists but nothing links to it. | offer page price section, checkout footer, welcome email |
| F2 | "The chance to request future looks and collections" — with inspo images per R10 | Text requests work (browser-verified round trip). Image requests: no UI exists. Copy on the page says only "request" (safe), but R10 is half-delivered. | offer page list |
| F3 | "Normally ready in about 30 seconds" | One live observation 35s; internal note says ~82s at medium quality. Sample size 1-2. | page, FAQ, welcome email |

---

## 2. Requirement Traceability Matrix

Legend: PASS needs evidence beyond code (live behavior, DB row, test run, or browser
observation). Code-only = UNVERIFIED. Browser tests were run on Sandra's ADMIN session —
admin bypasses paywalls and possibly credit charging, so admin observations do NOT verify
member behavior.

| Req | Source | Code (files/functions) | DB/state | Stripe/webhooks | Production behavior | Automated tests | Browser test | Failure/recovery | RESULT |
|---|---|---|---|---|---|---|---|---|---|
| R1 tap-to-create studio | Sandra msg | components/vault-maya/vault-maya-studio.tsx (makeLook); app/api/vault-maya/{looks,brief}; lib/vault-maya/looks.ts (buildVaultMayaBrief → sceneTemplate) | ai_images row on success (id 17705, prediction_id contains `vault-maya-golden-hour-escape-61-shot-1`) | — | 1 successful live generation 2026-07-30 13:04Z | none for studio component | YES: tap → ~35s → photo of Sandra, likeness OK (screenshots in session) | 2nd attempt 13:09Z FAILED, +1 credit refund row exists | **PARTIAL** — works, but n=1 success/1 failure; "chat" ambiguity Q-A |
| R2 lower price, vault images only | Sandra msg | products.ts vault_maya $19; generate locked format:"photo"; briefs only from vault cards (findVaultMayaCard) | — | prices $19/$29 live (§7-Q4) | studio offers only vault looks | — | YES (studio shows only collections) | — | **PASS** for scope; price flip see R4 |
| R3 all collections | Sandra msg | lib/vault-maya/looks.ts getVaultMayaCollections merges DB + static | vault_collections/vault_prompts + static prompt-data | — | live page computes 230 looks/30 collections | — | YES: studio listed weekly drop + further collections | looks API failure → studio shows retry message (code only) | **PASS** |
| R4 $19 founder → $29 | Sandra msg | cash-launch-pricing.ts resolveVaultMayaPriceId / isVaultMayaFounderPriceFlipped; landing-checkout envVar map | — | both prices active in Stripe | checkout showed 188,46 kr ≈ $19 (browser, Stripe-localized NOK) | time-simulation run §7-Q8: flips exactly 2026-08-06T21:59:00Z | YES (embedded checkout, $19 eq.) | D8: missing founder env silently charges $29 (simulated) | **PARTIAL** — founder price verified at checkout-form level only; no completed purchase ever; flip verified by simulation not by crossing the date |
| R4b founders keep $19 | my assumption A2 | Stripe subscriptions renew on their creation price (platform behavior) | — | — | — | none | none | resubscription after cancel = NEW subscription at then-current price (never stated in copy) | **UNVERIFIED** — no founder exists; platform-behavior assumption |
| R5 30 photos/mo | Sandra msg | credit-policy VAULT_MAYA_MONTHLY_CREDITS=30; credits.ts SUBSCRIPTION_CREDITS; invoice-paid.ts gate + grantMonthlyCredits("vault_maya") | user_credits, credit_transactions (subscription_grant keyed on invoice id) | invoice.paid / invoice.payment_succeeded | never exercised (0 purchases) | full suite passes incl. invoice-paid regression tests for membership path; NO test grants vault_maya credits specifically | none possible | grant idempotent per invoice (advisory lock — code + membership tests) | **UNVERIFIED** for vault_maya specifically |
| R6 top-ups | Sandra msg | existing credit_topup product; app/checkout/credits; credit-topup handler; studio "Top up" link | user-scoped shared balance; purchased credits preserved at reset (credits.ts:505-518) | checkout.session.completed:credit_topup | top-ups proven for other users historically (3 in 90d, §1 revenue pull) | existing suite tests | link visible in studio (browser) | — | **PARTIAL** — mechanism proven generally; never by a vault_maya-tier user |
| R7 weekly drops appear | Sandra msg | isWeeklyDrop = first published collection (looks.ts) | vault_collections.published_at ordering | — | studio showed "THIS WEEK'S DROP · Golden Hour Escape" | — | YES | — | **PASS** for display; drop pipeline itself pre-existing |
| R8 gallery | Sandra msg | studio "Your photos" section → GET /api/app-v3/gallery (auth-only, per-user getAllUserImages) | ai_images per user_id | — | deployed today; NOT seen in browser (added after my studio browser session) | gallery route pre-existing tests | **NO** | gallery fetch fails silently (empty state) | **UNVERIFIED** in browser |
| R9 selfie once | Sandra msg | upload-selfie route (slot=face, single-active), user_avatar_images; studio upload + change | user_avatar_images is_active flip | — | Sandra's existing selfie detected in studio | upload route pre-existing tests | Selfie card YES; fresh upload flow NO (admin already had one) | <512px rejected; errors surfaced (code) | **PARTIAL** |
| R10 next-drop requests | Sandra msg | drop-requests POST route; studio request box | vault_maya_drop_requests (created, verified) | — | round trip verified: row landed 15:05Z, then deleted | none | YES (text only) | 10/day flood guard (code) | **PARTIAL** — text yes; inspo images NO UI; Sandra has no reading surface except SQL |
| R11 live today | Sandra msg | commits 3042d8fe, 005dfe59, 3b6f2bc6 deployed | — | — | all URLs live (§7-Q1) | suites green at each deploy | YES | — | **PASS** (shipped same day) |
| R12 full-list targeting | Sandra msg | counts computed (8,460 / 18 excl. / 88 / 8,358); NO broadcast built | — | — | nothing sent | — | — | — | **PAUSED** by Sandra before build |
| R13 her copy live | Sandra rewrite | public-marketing.tsx VaultMayaPageContent | — | — | live: her story section present, 0 banned fragments, live counts (§7-Q2) | 7 marketing/pin tests pass | YES (hero screenshot) | — | **PASS** with F1-F3 truth exceptions |
| R14 welcome email | Sandra order | vault-maya-welcome.tsx; wired in studio-membership.ts both branches; email_logs idempotency | email_logs | fires on checkout.session.completed (paid) | NEVER fired for a real purchase; [TEST] render sent to Sandra 15:4xZ (Resend accepted) | tests/vault-maya-welcome-email.test.ts: 2 pass, asserts all required elements | Sandra can inspect her inbox | 7-day resend suppression via email_logs (code) | **PARTIAL** — content verified; delivery path UNVERIFIED |
| R15 failure/credit policy | Sandra order | generate route: all-or-nothing refund, logged (route:795-811); FAQ copy | credit_transactions refund rows | — | REAL refund observed: 13:09:37Z "+1 OpenAI generation failed" — but WITHOUT a matching charge row for the admin account (§7-Q6) | suite covers refund path for members (pre-existing) | failure observed live (the 13:09 attempt) | this IS the recovery path | **PARTIAL** — refund fires in production; "1 credit = 1 finished photo" NOT verifiable from admin data; member-path unverified |
| R16 measurement plan | Sandra order | doc only (launch pack §5); no dashboards/queries built | — | — | — | — | — | — | **UNVERIFIED** — plan exists on paper; no instrumentation report built |

---

## 3. Explicit audit areas

1. **Founder/standard pricing** — Stripe live: `price_1TyvCzEVJvME7vkw5U4pbv6H` $19/mo and
   `price_1TyvD0EVJvME7vkwZnQOM44A` $29/mo, both active, product `prod_UysyyUgokKt1oI`
   active (§7-Q4). Checkout form rendered $19-equivalent (browser). No purchase ever
   completed. PARTIAL.
2. **Timezone/price-switch** — Constant `2026-08-06T21:59:00.000Z` (UTC) = 23:59 Marbella
   (CEST). Simulation: false at 21:58:59Z, true at 21:59:00Z. Switch applies at
   checkout-session creation; a session opened before and paid after the flip keeps $19
   (Stripe session holds its price — platform behavior, not tested). Offer page after flip
   renders $29 (code path; force-dynamic so no stale cache; not observable until the date).
   PARTIAL.
3. **Renewals / cancellations / resubscriptions** — Renewals: invoice-paid grants 30
   credits, idempotent per invoice (code + membership-path tests; vault-specific
   UNVERIFIED). Cancellation: **FAIL** — no reachable cancel surface for vault-only users
   (F1). Resubscription: new subscription at current price — founder price NOT restored;
   copy says "for as long as your membership stays active", which is consistent, but the
   lapse consequence is stated nowhere. UNVERIFIED overall.
4. **Duplicate/delayed webhooks** — Subscription upsert: pg_advisory_xact_lock +
   stripe_subscription_id conflict target; order/replay safety covered by
   tests/membership-bundle-upgrade-safety.test.ts (2 pass, exercises the SHARED code path
   with membership fixtures, not vault_maya fixtures). Credit grant: per-invoice advisory
   lock + existing-grant check. Welcome email: email_logs 7-day suppression. PARTIAL
   (shared-path evidence only).
5. **Vault vs SUITE entitlements** — getSuiteAccess returns `vault` for active vault_maya;
   member for SUITE. Vault never unlocks full app (page redirect, code). **Defect D2:**
   vault check precedes bundle-pass and trial checks → an active-trial or bundle-pass user
   who buys Vault Maya is DOWNGRADED to studio-only. **Dead code:** hasVaultMayaAccess in
   lib/subscription.ts is used by NOTHING (§7-Q9) — the real gate is getSuiteAccess; the
   dead helper also grants members access, but it is unreferenced. No vault-tier user has
   ever existed → all vault-level behavior (redirect, generate 403→allow) UNVERIFIED in
   production.
6. **Direct URL access** — Verified live unauthenticated: /api/vault-maya/looks → 401;
   /vault-maya/studio → 307 to login with returnTo; marketing/checkout pages public
   (§7-Q1). Authenticated-but-unentitled: code redirects to /vault-maya (server) and APIs
   403 — UNVERIFIED live (no such account tested).
7. **Existing buyer / SUITE member states** — Buyer (no sub): treated as any lead;
   purchases normally. SUITE member: **no guard** stops her paying $19 for a subset she
   owns (D4/Q-B); her access stays member-level. Trial/bundle-pass: downgrade defect (Q-C).
   All code-level only.
8. **30 credits vs 30 finished photos** — Copy says "30 photo creations". Mechanics: 30
   wallet credits; 1 image = 1 credit; failures auto-refund → credits ≈ finished photos
   IF refunds always fire. Caveats: (a) monthly reset expires unused subscription credits
   (Q-D); (b) admin-account anomaly §3.10 prevents confirming member accounting; (c) a
   photo that completes but is unusable (bad likeness) still consumes a credit — copy
   nowhere promises otherwise. PARTIAL.
9. **Failed / timed-out / rejected generations** — Failure: observed live (13:09Z refund).
   Timeout: maxDuration 300s; a hard function death can end without response — recovery
   exists for members via gallery recovery paths (pre-existing); vault studio does NOT
   surface recovered images except via new gallery section. Rejected (moderation): falls
   into failure path (code). PARTIAL.
10. **Credit restoration** — Live refund row exists: `+1 "OpenAI generation failed"`
    13:09:37Z. **Anomaly:** no matching `-1` charge row for the admin account in the same
    window (§7-Q6) — either admin charging diverges or charge rows record differently;
    consequence: cannot certify the charge↔refund pairing for real members from today's
    data. PARTIAL with open question.
11. **Top-ups** — Existing shared credit packs; purchased credits preserved across resets
    (code); studio links to /checkout/credits. Never exercised by a vault user. PARTIAL.
12. **Selfie upload/storage/replacement/deletion** — Upload: multipart → Vercel Blob
    `app-v3/identity-references` (PUBLIC blob host) + user_avatar_images row; single-active
    per type; replacement deactivates prior (code; upload path browser-untested today).
    Deletion: NO automated deletion; face selfies are never deleted by any route; the live
    FAQ promises deletion on request = MANUAL support commitment (A8/D5). Storage location
    is a public-but-unguessable URL — see 13. PARTIAL.
13. **Cross-customer data isolation** — DB queries are user-scoped (gallery, requests,
    selfies — code). BUT: (a) generated images and selfies live on PUBLIC Vercel Blob
    URLs — anyone holding a URL can view the image (pre-existing platform design, applies
    to all SSELFIE members); (b) **the generate API verifies the reference selfie URL's
    HOST, not its OWNER** (isAllowedReferenceUrl, §7-Q7) — any authenticated, entitled user
    who obtains another woman's selfie blob URL could generate images using HER face.
    Pre-existing app-v3 design, inherited by Vault Maya, surface area now larger. No
    exploit observed; risk assessment stands. PARTIAL/RISK.
14. **Gallery privacy** — API auth-scoped per user (401 live). Image URLs public-blob as
    above. PARTIAL.
15. **Vendors** — Image generation: OpenAI gpt-image-2 via images.edit (identity anchor),
    quality "medium". Storage: Vercel Blob. DB: Neon. Payments: Stripe. Email: Resend.
    No LLM in the vault generation path (brief building is deterministic — looks.ts).
    Maya text elsewhere: OpenRouter (unused by vault studio v1). PASS (inventory).
16. **Stale identity / inspiration leakage** — Studio sends the CURRENT server-rendered
    selfie URL or fresh upload; no inspiration inputs exist in the studio; briefs derive
    only from vault prompt text (sceneTemplate) + collection aestheticId. Risk: the client
    controls referenceSelfieUrl (see 13b). If the user replaces her selfie mid-session,
    in-flight tabs may still hold the old URL (stale identity of HERSELF). Code-level.
    PARTIAL.
17. **Email access / return path** — Welcome email links /vault-maya/studio; logged-out
    hits login redirect with returnTo (verified live). New-account variant carries password
    setup link (template). End-to-end (real purchase → email → login → studio) NEVER run.
    PARTIAL.
18. **Cancellation & support** — Support: reply path to hello@sselfie.ai in copy; Resend
    tag `vault-maya` wired for buyer tagging. Cancellation: **FAIL (F1)** as above.
19. **Analytics & attribution** — Checkout attribution params preserved by
    VaultMayaCheckoutLink (code); `vault_maya_checkout_email_capture_view` event wired;
    stripe_payments carries utm/checkout_source columns (schema verified earlier). Zero
    purchase rows → attribution pipeline for vault_maya UNVERIFIED. Studio has no
    activation analytics events at all (no instrumentation for §R16 activation metric).
    PARTIAL/GAP.
20. **Cost per generation / per accepted photo** — Internal measured note (2026-06-10):
    medium ≈ $0.06/image, ~82s (generate/route.ts:98-100). Today's vault sample: 2
    attempts, 1 success (~35s), 1 failure (refunded; failed calls may still bill vendor-side
    — unknown). Cost per ACCEPTED photo: unknowable at n=1. At $19/30 photos, revenue
    ≈$0.63/photo vs ≈$0.06-0.12 cost → margin sound IF failure rate is modest. UNVERIFIED
    (needs volume).

---

## 4. Consolidated defect list (found, NOT fixed — per instruction)

| ID | Severity | Defect |
|---|---|---|
| DEF-1 | HIGH (truth) | "Cancel anytime from your account" is live copy, but vault-only users have no path to any account/cancel surface (F1). |
| DEF-2 | HIGH (customer) | getSuiteAccess ordering downgrades active-trial and bundle-pass users to studio-only if they buy Vault Maya (D2/Q-C). |
| DEF-3 | MED (money) | No guard stops a SUITE member paying for Vault Maya she already effectively has (Q-B). |
| DEF-4 | MED (truth) | "About 30 seconds" vs internal ~82s measurement; n too small to certify (Q-E/F3). |
| DEF-5 | MED (integrity) | Admin credit anomaly: refund without matching charge — member charge path uncertifiable from current data (§3.10). |
| DEF-6 | MED (security, pre-existing) | Reference selfie URL host-only validation permits cross-user identity use given URL leakage (§3.13). |
| DEF-7 | LOW | hasVaultMayaAccess dead code — misleading for future work. |
| DEF-8 | LOW (money) | Missing founder-price env var would silently charge $29 during founder week (env currently set — verified). |
| DEF-9 | LOW (R10 gap) | Inspo image requests have no UI; Sandra has no surface to read requests. |
| DEF-10 | LOW (gap) | No activation/acceptance analytics events → §R16 measurement plan cannot run without SQL work. |
| DEF-11 | LOW | Credit-expiry-on-reset not disclosed in copy (Q-D). |

---

## 5. Assumption Register

| ID | Assumption | Why I made it | Affects | Customer risk | Sandra decision needed? |
|---|---|---|---|---|---|
| A1 | Flip at Aug 6 21:59 UTC | "one week" from planned launch; matched prompt-vault flip pattern | pricing | buyer near midnight CEST sees $19 page then $29 checkout for 1 min | YES (with Day 0) |
| A2 | Founders keep $19 by never changing their sub's price | Stripe default behavior | pricing promise | if any future price migration touches subs, promise breaks silently | note, no action now |
| A3 | Tap-to-create satisfies "little chat with Maya" | ship-today scope | product shape | buyer expecting chat may feel shortchanged | YES (Q-A) |
| A4 | 30 photos = 30 shared-wallet credits, reset monthly | reuse proven credit system | billing | unused monthly credits vanish; top-ups persist | YES (Q-D disclosure) |
| A5 | Vault tier never sees full /app | protect SUITE value | UX | none direct; blocks account surface (DEF-1) | implicitly OK'd by tier concept; cancel path needs decision |
| A6 | SUITE members/admins get studio free | member goodwill | entitlement | none | no |
| A7 | Active trials excluded from launch audience | protect €97 trial decision | launch reach | none | YES (audience final cut) |
| A8 | Selfie deletion = manual support promise | no deletion API exists | privacy promise | unmet promise if support lapses | YES (accept burden or descope copy) |
| A9 | "About 30 seconds" | one observation | copy truth | disappointment | YES (Q-E) |
| A10 | Top-ups at existing pack prices ($10/20cr … $85/200cr) | reuse | pricing | pack prices tuned for SUITE, look expensive next to $19/30 | YES (fine or new pack) |
| A11 | Retire = stop selling, keep serving | customer protection rule | lifecycle | none | already aligned with her words |
| A12 | Buyers email a few hours before list | founder-story courtesy | launch | none | YES (sequence sign-off) |
| A13 | Monthly reset wipes unused subscription credits (inherited SUITE policy) | consistency | perceived value | see Q-D | YES (same as A4) |

---

## 6. What was verified in production today (the honest PASS list)

- Offer page live with Sandra's copy, zero banned fragments, live counts 230/30 (§7-Q2).
- Checkout page renders embedded Stripe at $19-equivalent with Vault Maya name (browser).
- Studio (admin session): selfie detected; weekly drop + collections rendered; ONE real
  generation succeeded in ~35s with recognizable likeness; result persisted (ai_images
  17705); Save/Again UI present.
- One real generation FAILURE auto-refunded (+1 credit, logged description).
- Next-drop text request round-trip (insert verified, test row deleted).
- Unauthenticated protection of studio + APIs (401/redirect).
- Stripe product + both prices live and correct.
- Welcome email content: 2 unit tests pass; [TEST] copy delivered to Sandra's inbox.
- Full test suite: see §7-Q11 for the fresh run result.

Everything else in this report is code-inspected or unexercised, and is labeled so.

---

## 7. Independent verification kit

Run from repo root `/Users/MD760HA/ACTIVE/sselfie-9g` (env in `.env.local`). Read-only
unless marked. QA account: orriaamodt@gmail.com (user 80d47131-4d6d-43f7-959f-2105be06e1fb)
currently holds an admin-granted SUITE membership row (id 241) — it tests MEMBER level, not
vault level. **No vault-level test account exists; creating one requires either a real $19
purchase or a manual subscriptions row (state-changing; needs Sandra's go).**

- **Q1 URL gates:** `curl -s -o /dev/null -w '%{http_code}\n' https://www.sselfie.ai/api/vault-maya/looks` → 401; same for `/vault-maya/studio` → 307 with login redirect; `/vault-maya`, `/checkout/vault-maya` → 200.
- **Q2 copy truth:** `curl -s https://www.sselfie.ai/vault-maya | grep -cE 'stranger with your haircut|engine I built|she frames you|ready to wear|my style, your face'` → 0; `grep -oE 'More than [0-9]+ ready-to-create looks'` → live count.
- **Q3 page source:** components/sselfie/public-marketing.tsx `VaultMayaPageContent`; FAQ constant `VAULT_MAYA_FAQ`.
- **Q4 Stripe:** `stripe.products.retrieve("prod_UysyyUgokKt1oI")`; `stripe.prices.list({product})` → expect $19 + $29 monthly USD, active.
- **Q5 zero customers:** SQL `SELECT COUNT(*) FROM subscriptions WHERE product_type='vault_maya'` → 0; same for stripe_payments → 0.
- **Q6 generation + refund evidence:** SQL `SELECT id, prediction_id, generation_status FROM ai_images WHERE prediction_id LIKE '%vault-maya-golden-hour%'` → completed row id 17705; `SELECT * FROM credit_transactions WHERE user_id=(SELECT id::text FROM users WHERE email='ssa@ssasocial.com') AND created_at>'2026-07-30T12:30:00Z'` → one refund (+1, "OpenAI generation failed"), NO charge row (the anomaly).
- **Q7 reference allowlist:** app/api/app-v3/maya/generate/route.ts:393-401 — host check only (`.public.blob.vercel-storage.com`), no ownership check.
- **Q8 price flip:** `npx tsx -e` script calling `resolveVaultMayaPriceId`/`isVaultMayaFounderPriceFlipped` with dates `2026-08-06T21:58:59Z` (founder) and `21:59:00Z` (standard); with founder env omitted → returns standard id even before the flip.
- **Q9 dead code:** `grep -rn hasVaultMayaAccess app components lib --include='*.ts*'` → only its definition in lib/subscription.ts.
- **Q10 missing cancel path:** `grep -n 'account\|portal\|cancel' components/vault-maya/vault-maya-studio.tsx` → only the copy string "Cancel anytime from your account" appears nowhere (it's on marketing surfaces); no links. app/app/page.tsx redirects `access.level === "vault"` to /vault-maya/studio.
- **Q11 tests:** `pnpm vitest run` — fresh audit run 2026-07-30 evening: **1784 passed,
  1 failed, 6 skipped (1791)**. The single failure (tests/ig-reply-system-retired.test.ts)
  is order-dependent and passes in isolation, and is unrelated to Vault Maya. A second
  known order-dependent flake exists (tests/maya-prompts-tab-actions.test.tsx). Both
  indicate parallel-order sensitivity in the suite, not Vault Maya defects — but the suite
  is NOT deterministic-green, and that is itself a finding.
- **Q12 trial-downgrade defect:** lib/trial/suite-trial.ts — vault return (line ~93) precedes bundle-pass (~101) and trial (~105) branches. Reproduce logically: user with active suite_trial + active vault_maya rows → getSuiteAccess = "vault", /app redirects away from full app.
- **Q13 welcome email:** `pnpm vitest run tests/vault-maya-welcome-email.test.ts`; wiring in lib/payments/handlers/studio-membership.ts (search "vault_maya_welcome"); [TEST] send visible in Sandra's inbox + Resend dashboard (2026-07-30).
- **Q14 browser evidence:** screenshots captured in this session (offer hero, checkout 188,46 kr, studio drop + generated photo). A fresh agent should re-run: open /vault-maya/studio on an entitled session, tap one look, expect a completed photo in ≤90s and a matching ai_images row.
