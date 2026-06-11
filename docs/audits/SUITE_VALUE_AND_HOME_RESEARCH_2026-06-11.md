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
- **D4 — APPROVED, shape adjusted**: 7-day full-SUITE trial unlock for Vault/Starter Kit buyers. NO training step — App v3's flagship is gpt-image-2 with the member's reference selfies (zero-shot, no LoRA). Trial guardrail = enough credits for a first photoshoot, wow moment in minutes.

## Addendum — generation model truth (researched 2026-06-11)

**CORRECTED 2026-06-11 (same day):** the first version of this addendum wrongly named Nano Banana Pro as the app's flagship — that is the LEGACY `/studio` stack. **The live member app (App v3, cutover 2026-06-10) runs `gpt-image-2` via the OpenAI API** (`app/api/app-v3/maya/generate/route.ts`, `openai.images.edit` with the member's reference selfie, `OPENAI_IMAGE_MODEL` env override). Lesson recorded: check `app-v3` code before claiming stack facts; steering docs lagged the build by a day.

Research facts, reframed around the real stack:
- Zero-shot reference generation now beats LoRA training (95–98% vs 87–96% identity consistency, seconds vs minutes, cents vs >$1) for personal-brand photos. "LoRA for consistent character is dead" (Segmind 2026). Retiring Flux was right.
- **Our flagship gpt-image-2 is the current overall quality leader** (#1 LMArena, score 469, April 2026 launch): best-in-class realism + text rendering, ~94% identity consistency with a reference image. Known weakness: identity drift in long multi-image batches (5–6+) — relevant if we ever batch big photoshoots in one call. Rate limits tier by OpenAI spend.
- Published OpenAI policy restricts generating identifiable real people, yet our consented self-edit flow (user uploads own selfie → images.edit) runs fine in production. Treat this as policy gray zone, same as Google: **diversification fallback = FLUX.2 [max] (Black Forest Labs, ~$0.056/4MP, multi-ref up to 10, Identity Persistence) — the only top-tier model whose commercial policy EXPLICITLY allows consented personal-brand photos.** Nano Banana Pro (95–98% consistency, pore-level realism, 14 refs) remains a strong second engine already wired in the legacy stack.
- **Video (when we build it)**: HeyGen Avatar IV ($4/min talking head from one photo), Kling 3.0 (multi-shot lifestyle motion, face-locked, ~$0.08–0.11/sec). Sora API is being discontinued Sept 2026 — never build on it.
- **Cheap volume tier**: Seedream 5 (~$0.03/img, 14 refs) for drafts/previews.
- **Watch next quarter**: Gemini Omni policy evolution, FLUX Kontext [max] (identity-preserving outfit/background edits), FASHN.ai try-on.
- **How we keep up**: LMArena image/video arenas + Artificial Analysis + fal.ai explore (day-one new models). Re-check at the start of any generation-related build.
- Retention asset reframe: with no trained model, the non-portable asset = the member's reference set + gallery + Maya's brand memory. Messaging: "Maya knows your brand and gets smarter every time" (matches the North Star pricing line).

Build order stays: BRIDGE-01 (landing page + welcome emails + HOME-01 + D4 trial unlock) → ENTITLE-01 → Masterclass lessons 15–17 → EMAIL-01 cleanup.

---

## Addendum 2 — App v3 re-inventory (2026-06-11, supersedes section 1 for the member experience)

Section 1 inventoried the LEGACY `/studio` app. Members moved to App v3 (`/app`) on 2026-06-10. Full re-inventory done; what changes:

### v3 is a much stronger answer to "worth $97"
The live experience is exactly the locked interaction model: tap-first visual front door (10 Vault aesthetic tiles), format chips, Maya drawer producing exactly 3 concept cards (`emit_concepts`), zero typing to a finished photo. Plus things no competitor has: Daily Relevance Engine (Content tab: Claude-generated "what to post today" cards grounded in brand profile + memory + recent activity), cross-session memory (`app_v3_memory`: agent name, brand notes, preferences), Vault DNA injection (tested collection prompts feed Maya's system prompt), Edit Mode, Overlay Composer (text-on-photo, Mode C), carousel design systems, streaming photo previews, named agent. 1 credit per image (200/mo = 200 images).

### The ChatGPT objection, restated for the real stack
We run gpt-image-2 ourselves, so the moat is NOT the engine — it is everything wrapped around it: Maya's taste (Vault DNA + vision-extracted aesthetic recipes), brand memory, the 3-concept contract, zero prompt labor, and identity handling (reference-selfie edit flow; consumer ChatGPT still mangles/blocks self-likeness). Pitch: "Same engine money can rent. What you can't rent: a creative director who already knows your brand."

### Three real gaps found in v3 (the "do something different" list)
1. **Video is GONE.** Legacy had Replicate video (3 credits); v3 has zero video code. The €97 story claimed photos + video. Either ship VIDEO-01 in v3 (research verdict: Kling 3.0 for lifestyle motion ~$0.08–0.11/sec, HeyGen Avatar IV for talking head $4/min) or stop claiming video.
2. **Members can't reach what they own.** No links from v3 to Feed Planner or Academy (deliberate per `app-v3-shell.tsx` comment), yet the front-door copy says "feed planning" is included, and D3 just made membership include ALL products. v3 needs a "Your SSELFIE" surface (Account tab or own tab): owned products open, unowned locked. **This replaces the separate HOME-01 page idea — App v3 IS the home.**
3. **Memory doesn't auto-learn.** "She gets smarter every time" is the pitch, but `app_v3_memory` only stores what the member types into a form (name/brand/preferences prompts). Maya should save learnings from conversations automatically (with member visibility/edit in the Memory modal). This makes the North Star pricing line true.

### Revised BRIDGE-01 shape
1. SUITE landing page selling the v3 experience + real welcome emails (unchanged).
2. HOME inside v3: products surface (owned + locked) + open `/app` to one-time buyers in limited mode so Vault buyers finally MEET Maya + D4 7-day trial unlock.
3. Quick wins: reconnect Feed Planner/Academy for members who own them (or fix the front-door claim) — Sandra decision, the omission was deliberate design.
4. Memory auto-learn (MEMORY-01).
5. VIDEO-01 (Kling/HeyGen in v3) as the next visible "only at SSELFIE" wow after BRIDGE-01.

---

## Addendum 3 — usage truth + direction decisions (2026-06-11, Sandra + Claude)

Member usage verified in Neon (8 active members):
- **Video (legacy)**: 4/8 members, 48 videos, latest 2026-05-30. Most-used + most-recent legacy feature.
- **Academy**: 4/8 members enrolled (7 enrollments; 30 users all-time). The "members never used Academy" claim that justified dropping it from v3 was FALSE. What was never used: `academy_monthly_drops` — **0 drops ever published**.
- **Feed Planner**: 3/8 members ever, latest member activity 2026-02-07 (dead 4 months for members). 236 users all-time = mostly Blueprint buyers (product stays untouched at /feed-planner).

### Decisions
- **Feed Planner for members: LEAVE BEHIND.** Do not port the complex planner into v3. Legacy stays alive for Blueprint owners. Member replacement (later, post-BRIDGE): "Maya plans your week" inside the Content tab — 3 planned posts (photo + cover + caption) from memory + gallery, tap to make each. Planner mentality out, outcome mentality in.
- **VIDEO-01 (approved, into v3, phased):**
  - Phase 1 — "Bring this photo to life" button in Library lightbox + concept cards: 5–10s cinematic motion via image-to-video. Engine: **Kling 3.0** (face-locked Reference/identity embeddings, ~$0.075–0.112/sec → ~$0.75–1.12 per 10s clip) primary; **Seedance 2.0** (~$0.022/sec) for cheap b-roll/drafts; legacy Wan 2.5 retired with the old app. Suggest 5 credits/clip (cost covered ~2–4x at €97/200 credits).
  - Phase 2 — "Maya hands you a finished Reel": server-side composition (ffmpeg/Remotion class): hook cover with on-screen text (reuse the existing overlay-styles system) → 2–3 motion clips → CTA end card, assembled from a template, refined by taps ("slower", "different hook line"). **Explicitly NOT a timeline editor** — Canva/CapCut sell tools, Maya delivers outcomes. Text-on-screen and stitching are feasible server-side; freeform editing is out of scope permanently.
- **Academy: REBUILD INSIDE v3 as "Library".** Same editorial tile language as the front door: courses (incl. Masterclass via D3), workbooks, 23 existing templates, flatlays, and drops. Wire the never-used monthly-drops into the weekly member drop (Content Engine supplies it). This is the membership's accumulating-value retention surface.
- **Landing page: REWRITE /join/studio** (not new build). Keep hero. Image-led (Sandra's own lookbooks/galleries), copy: "creative director who already knows your brand" + everything-included (D3) + No-Fake doctrine. Copy requires Sandra approval before live. Part of BRIDGE-01.

### Updated build order
BRIDGE-01 (landing rewrite + welcome emails + "Your SSELFIE"/Library surface in v3 + one-time buyers limited mode + 7-day trial) → VIDEO-01 Phase 1 → MEMORY-01 auto-learn → VIDEO-01 Phase 2 (Reel composer) → "Maya plans your week" → ENTITLE-01 / Masterclass 15–17 / EMAIL-01 continue in parallel where small.
