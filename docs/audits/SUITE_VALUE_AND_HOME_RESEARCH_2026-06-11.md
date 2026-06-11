# SUITE Value + Customer Home Research — 2026-06-11

Sandra asked three questions:
1. Is the membership actually worth $97/mo, or will people think "I can just use ChatGPT" / "I'll just keep the $27 Vault"?
2. Every product has an isolated access page. The old app had a HOME showing all purchases + upsells. What do professional creators do post-checkout?
3. What new technology / build would make SSELFIE stand out and make people want to stay and become members?

Research: codebase inventory of actual SUITE deliverables + two web research passes (competitor landscape 2026, post-checkout/retention patterns). This doc is the synthesis. Decisions at the bottom.

---

## 1. What a SUITE member actually gets today (verified in code)

- 200 credits/month (≈100 Pro photos OR ≈200 Classic, video at 3 credits, training at 20). Credits roll over indefinitely — no cap.
- Custom Flux LoRA model training (the identity-consistency engine).
- Maya chat + photo + video generation.
- Feed Planner: unlimited planners, full grid, gallery.
- Academy: all 10 mini-products/workbooks, monthly drops, flatlays, templates.
- Annual plan exists (€970/yr) — normalized to monthly in DB, same 200 credits per invoice (annual members get 200 credits ONCE per year-invoice — see Risk note below).

**NOT included in membership (verified `membershipIncluded: false` in `lib/academy-entitlements.ts`):** Prompt Vault ($27), Starter Kit ($37), Masterclass ($147), Selfie to Brand Shoot System ($197). A €97/mo member is shown upsells for $27 products. This is the single biggest value-perception bug.

**Other structural findings:**
- No membership gate on training/generation — only credit gate. Membership = the credit faucet.
- New `/app` v3 shell behind `APP_V3_MEMBERS_ENABLED`; members still on legacy `/studio`.
- `/academy` already IS a proto-home (owned products grid, locked upsells, Maya card) but nobody is routed there as "home"; token access pages are isolated and don't link to it.
- SuiteDoor upsell exists only on 2 public token pages, nothing inside the member app.
- ⚠️ Annual-member credit risk: one `invoice.payment_succeeded` per year = one 200-credit grant per YEAR, not per month. Currently academic (members are monthly) but must be fixed before selling annual.

## 2. Competitive truth (June 2026)

- **Photo AI (Pieter Levels), $99/mo Max tier** is the direct comparison: LoRA training (10 models/mo), ~480 photos/mo, video, editing. $132K MRR, self-serve, zero strategy layer. Raw generation is now table-stakes at this price.
- One-time headshot tools (HeadshotPro/Aragon/BetterPic/Secta, $29–79 once) anchor the "AI photos cost $40" perception but don't do ongoing content.
- **ChatGPT objection — honest verdict:** GPT-image quality is now excellent for one-off stylization, but documented and persistent failure at identity consistency: "the face in the final image wasn't mine" (profilebakery, perfectcorp, aivideobootcamp 2026). For 2–3 casual photos ChatGPT is good enough. For showing up weekly with photos that are recognizably YOU, a trained personal model still wins decisively. This maps 1:1 onto the No-Fake doctrine: ChatGPT literally gives you someone else's face. "Your face stays your face" is not just brand copy, it is the technical differentiator.
- **No competitor bundles** trained model + AI creative director + brand strategy + content system + founder. The moat is Maya + taste + Sandra, not the generator.
- Retention research: 40%+ of cancellations happen in month one; weekly-use products retain 85% better; community cuts churn 23%; annual plans cut churn 51%. A subscription without a weekly return trigger is "a one-time purchase priced as a subscription."
- Hardest internal truth: the $27 Vault + $20 ChatGPT is the real competitor, not ChatGPT alone. The Vault must have a 30-day bridge to membership or it's a dead end.

## 3. Post-checkout patterns worth copying (researched)

1. **Unified customer home** (Kajabi Library / Skool / Whop pattern): owned products as active cards, unowned as locked previews with one upgrade CTA. Permanent merchandising surface, no email needed.
2. **Order bump at checkout** converts 37.8% vs 4–10% for post-purchase pages.
3. **Name the trained model as the non-portable asset**: it lives here, improves with use, gone if you cancel. The only retention asset a cheaper tool can't replicate.
4. **Trial unlock > discount** for one-time-buyer → member conversion (Skool evidence: buyers convert on experienced value continuation, not savings).
5. **Weekly drops on top of a growing archive**: FOMO forward + sunk-cost backward = what makes ~$100/mo defensible.
6. 2026 standout tech: talking-head/AI-avatar video (Hedra/Argil/Captions class) is the frontier creators are paying for; we already have video generation to build on. AI posting agents are real but commoditizing; the moat stays Maya + taste.

## 4. Verdict: is it worth $97?

The raw tech is worth it (Photo AI charges the same for less guidance). The EXPERIENCE is not yet, for three fixable reasons:
1. Members don't get everything (Vault/Kit/Masterclass excluded) — kills "obvious yes".
2. No home — products feel like scattered email links, not a world.
3. No weekly reason to come back — month-one churn risk.

The answer to "why not ChatGPT" is already our brand: **ChatGPT makes someone who looks a bit like you. Your model keeps your face.** Use it everywhere.

## 5. Proposal — HOME-01 (fold into BRIDGE-01)

1. **SSELFIE Home** (`/home` or evolve `/academy`): every customer (any product, any token) lands on one page — owned products active, rest locked previews, Maya/SUITE as the centerpiece, one upgrade CTA. Tap-first, Cool Editorial.
2. **Everything-included membership** (DECISION D3): flip `membershipIncluded: true` for Vault, Starter Kit, Masterclass (+ System?). Positioning: "The SUITE includes every product I've ever made, plus Maya." Lost revenue ≈ $0 (members weren't buying these anyway); clarity gained = the whole pitch.
3. **7-day SUITE trial unlock after Vault/Kit purchase** (DECISION D4): experienced value > discount. Needs credit-grant guardrails (e.g. 20 credits trial = 1 training + first shoot).
4. **Weekly Monday drop for members**: new look/collection drop via existing monthly-drops infra + Content Engine. The weekly return trigger.
5. **Model-as-asset messaging** in welcome + renewal emails: "Your model lives in your Studio and gets smarter. Cancel and the photoshoots stop; your gallery stays yours."
6. **Don't build yet:** community, posting agents, AI avatar video products. Revisit avatar video after BRIDGE-01 ships (we already have video gen as the seed).

Pricing: hold at €97. The €197 North Star price requires the Maya-guided experience + home + drops to be live first.

## Decisions (Sandra, 2026-06-11)
- **D3 — APPROVED + SHIPPED**: membership now includes ALL one-time products (Vault, Starter Kit, Masterclass, Selfie to Brand Shoot System). Flipped `membershipIncluded: true` in `lib/academy-entitlements.ts` AND in the `academy_products` DB rows (DB wins over code defaults — remember this for future product flags).
- **D4 — APPROVED, shape adjusted**: 7-day full-SUITE trial unlock for Vault/Starter Kit buyers. NO training step — the app's flagship is Nano Banana Pro with up to 14 reference selfies (zero-shot, no LoRA). Trial guardrail = enough Pro credits for a first photoshoot (e.g. 10–16 credits at 2/Pro image), not "1 training + shoot".

## Addendum — generation model truth (researched 2026-06-11)

Sandra confirmed Flux LoRA training is retired as the flagship; research confirms this was right:
- Zero-shot reference generation (Nano Banana Pro: 95–98% identity consistency with 5–8 refs, ~$0.04–0.13/img) now beats LoRA (87–96%, >$1, minutes of training) for personal-brand photos. "LoRA for consistent character is dead" (Segmind 2026).
- **App today**: Studio Pro = `google/nano-banana-pro` via Replicate host, up to 14 reference selfies (`lib/nano-banana-client.ts`). Classic Flux path still wired but legacy.
- **⚠️ Policy risk (the one thing to watch)**: Google tightened real-person rules March 2026 — composites/edits of identifiable people can return `blockReason: OTHER`, server-side, unbypassable. Self-consented "this is me" sits in a gray zone. **Fallback if Google ever blocks us: FLUX.2 [max] (Black Forest Labs, ~$0.056/4MP img, multi-ref up to 10, Identity Persistence) — the only top-tier model whose commercial policy EXPLICITLY allows consented personal-brand photos.** GPT Image 2 is the quality/text-render leader but prohibits identifiable real people via API — not usable for our core flow.
- **Video (when we build it)**: HeyGen Avatar IV ($4/min talking head from one photo), Kling 3.0 (multi-shot lifestyle motion, face-locked, ~$0.08–0.11/sec). Sora API is being discontinued Sept 2026 — never build on it.
- **Cheap volume tier**: Seedream 5 (~$0.03/img, 14 refs) for drafts/previews.
- **Watch next quarter**: Gemini Omni policy evolution, FLUX Kontext [max] (identity-preserving outfit/background edits), FASHN.ai try-on.
- **How we keep up**: LMArena image/video arenas + Artificial Analysis + fal.ai explore (day-one new models). Re-check at the start of any generation-related build.
- Retention asset reframe: with no trained model, the non-portable asset = the member's reference set + gallery + Maya's brand memory. Messaging: "Maya knows your brand and gets smarter every time" (matches the North Star pricing line).

Build order stays: BRIDGE-01 (landing page + welcome emails + HOME-01 + D4 trial unlock) → ENTITLE-01 → Masterclass lessons 15–17 → EMAIL-01 cleanup.
