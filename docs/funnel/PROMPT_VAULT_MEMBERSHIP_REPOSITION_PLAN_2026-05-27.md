# Prompt Vault Membership Reposition Plan

Date: 2026-05-27
Revised: 2026-05-27 (updated with competitive research findings and validated recommendations)
Owner: Sandra (strategic approval) / Codex (implementation)
Status: Planning source of truth. Do not build Vault Club until validation gates are met.

---

## Executive Decision

Do not create ten new products.

The next recurring product must grow directly out of Prompt Vault buyer behavior. The direction is a recurring creative ecosystem for women who want to become different aesthetic versions of themselves using one selfie and ChatGPT.

**Working name:** SSELFIE Vault Club

**Core promise:** Every two weeks, new Sandra-tested AI photoshoot transformations for the version of you that wants to show up next.

This replaces the cold-traffic role that Studio used to play. Studio and Maya continue serving existing members. For the AI prompt audience, the recurring offer must not be sold as an AI app, model training, credits, or feed planner.

---

## Competitor Research Correction (May 2026)

The original plan cited several competitors. Research revealed most are in different markets. This changes how the opportunity should be framed.

**What the research found:**

| Cited Competitor | Reality |
|---|---|
| Banana Prompts | Credit-based image generation studio ($9.99–$400+/month for rendering credits). Not a prompt subscription. |
| PromptMaster | Dave Talas's business automation consultancy for non-technical business owners. No Instagram, no photo, no personal brand angle. |
| Creator's Copy Vault / Pen Pivot Pro | ChatGPT prompts for copywriting, hooks, and headlines. Marketers, not creators. No selfie, no aesthetic. |
| 7Prompts | No significant product found. Does not exist at meaningful scale. |
| PromptDen / My Prompt Gallery | Discovery platforms, not subscriptions. Different model. |

**The correct conclusion:** Sandra's niche — "one selfie → editorial AI photoshoot → Instagram content for women building personal brands" — has **no dedicated subscription competitor**. Generic AI headshot tools (PhotoGPT, Photo AI) sell generation credits. Pen Pivot and PromptMaster serve copywriters. Nobody is selling a styled, Sandra-curated, biweekly aesthetic drop membership to women who want their selfie to look like an editorial and use it for content. **This niche is genuinely open.**

**Market pattern that still holds:**
The stronger recurring patterns in adjacent markets are fresh drops, trend discovery, and creator identity (buying taste and direction, not text). Community proof and distribution loops work best after members have a visible result to share. The Discord/challenge/voting model from AI art communities is a different audience — hobbyists, not personal brand creators.

---

## The Retention Finding That Changes Everything

Research into comparable AI-native subscriptions under $50/month:

> **Products with 75%+ gross revenue retention share one trait: the subscriber uses the prompts on their own content within the first 7 days and sees a visible result. Products where this does not happen see 23% gross revenue retention.**

This is the most important number in this document.

**Implication:** The subscription does not succeed based on what is in the drops. It succeeds based on whether the buyer actually does the thing in week one. The welcome email, the first drop, and the onboarding experience are more important than the content calendar.

**What this means for the MVP:**

- The first drop a new member receives should be the **easiest possible aesthetic to execute**, not the most impressive.
- The welcome email must say: "Open ChatGPT. Upload one selfie. Try this one prompt right now." One prompt. Not nine. Get her one result in the first hour.
- There should be a "did you try it?" email at day 3.
- The validation metric for month-two retention is: did she open the vault and copy a prompt without being emailed to do so?

---

## Studio Membership — Non-Negotiable Decisions

Sandra currently has 7 Studio members:
- 6 founding members at ~50% off lifetime ($47–48/month). This pricing is a permanent contract. It will never change.
- 1 full-price member at $97/month.

**Decisions:**

1. **All 7 members keep their exact current pricing and access. Forever.** Founding member pricing is a trust contract. Breaking it — even with good reason — destroys the loyalty that makes any creator subscription viable.

2. **When Vault Club launches, add new drops as a free bonus inside Studio.** Existing members get more, not less. They feel remembered and rewarded.

3. **Stop actively selling Studio to AI-prompts cold traffic.** The Studio value proposition (Maya, model training, credits, feed planner, dashboard) creates friction for an audience already inside ChatGPT. Do not ask them to switch apps. Let the prompt funnel drive Vault Club.

4. **Do not rename or reframe Studio yet.** Wait until Vault Club has 25+ members and usage data shows whether Studio members engage with drops more than Maya/Feed Planner features. If they do, that is the migration signal.

5. **Studio MRR (~$385/month) is protected.** Vault Club builds revenue on top of it, not instead of it.

---

## Current Status Checklist

### Done

- Rescue bounced buyer: done.
- Checkout recovery: done and enabled in Vercel Production.
- Next reel: done.
- ManyChat bridge improvement: done.
- Composio integration: done enough for current ops.
- Intelligence automations: Product Health, Revenue Intelligence, and Growth Intelligence are restored and active.
- Purchase attribution: implemented for Prompt Vault source, UTM, reel slug, CTA keyword, buyer stage, checkout recovery, prompt views, and prompt copies.
- Segment AI audience: canonical rule created as AI Photoshoot Audience. Source of truth: `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md`.
- Launch broadcast sent: broadcast ID `89322db0-3d00-4261-b00c-8e17f22f0ec3`, full list, 2026-05-27.

### Partially Done

- Identify top-performing aesthetics: tracking is live. Reliable signal comes after more buyer behavior flows through.
- Maya image pipeline reposition: switched from Replicate to ChatGPT Image Model 2. Still in progress. Open question: what does Maya offer on top of ChatGPT that justifies the app experience? See Maya Pipeline Decision section below.

### Not Yet

- Prompt Vault membership: planning only. Do not build until validation gates pass.
- Affiliate/community loop: planning only. Add after 25+ vault purchases and 10+ club members.
- Seasonal collection calendar: planning only.
- Creator challenge system: planning only. Add at 30+ members, run via Instagram DMs first.

---

## The Moat — What Makes This Not Generic

The competitor analysis confirms this niche is open. But it only stays Sandra's if the product is clearly differentiated from generic prompt packs.

**The sentence that must be true of every drop:**

> "I tested this on my own selfie this week. Here is the selfie I used. Here is what I prompted. Here is what it produced. Here is how to make yours."

This is what nobody else in this market can say. The buyer is not purchasing text. She is purchasing Sandra's aesthetic judgment, personally tested, applied to the exact workflow she uses. This is the moat. Protect it by making it the frame for every drop, every email, every reel.

**What differentiates SSELFIE Vault Club from generic prompt packs:**
- Real face. Sandra's own selfies as source material.
- Nordic/editorial/luxury aesthetic — curated, not crowdsourced.
- Specific use cases: reel cover, profile photo, launch photo, sales page. Not "art for fun."
- Tested in ChatGPT Image Model 2 specifically, not in Midjourney or generic AI art tools.
- Sandra's notes on why the look works, which selfie to use, what not to ask ChatGPT, how to make it look less fake.

---

## Proposed Offer

### Name

**SSELFIE Vault Club** — keeps continuity with Prompt Vault while making the subscription feel like the living, ongoing version of the product.

### Pricing

| Tier | Price | Notes |
|---|---|---|
| Regular monthly | $27/month | Anchors to the $27 one-time Vault purchase. Same investment, but it refreshes. |
| Founding member | $19/month locked | First 20 members only. Real urgency, real pricing gap. |
| Annual | Not yet | Do not offer until monthly retention signal exists (6+ months data). |

**Rationale for $27 not $19:** At $19/month, the buyer's brain processes this as less than the one-time vault ($27). At $27/month, the anchor is: "Same amount, but it refreshes every time." Founding pricing at $19 creates real urgency because it is genuinely below the regular price.

### Positioning Line

"New AI photoshoot transformations every two weeks, so your content never looks stuck in one version of you."

### Short Sales Promise

"Upload one selfie. Pick the aesthetic. Create the shoot in ChatGPT."

---

## Membership Contents — MVP Only

### 1. Biweekly Drops (not weekly)

**Cadence: every 2 weeks for the first 90 days.** If Sandra is consistently ahead and demand is strong, upgrade to weekly. Do not promise weekly and go quiet in week six. Overdelivering at biweekly is better than going dark on weekly.

Each drop includes:
- 1 named aesthetic (the name matters — this is a creative event, not a file).
- 5 to 9 copy-paste prompts tested in ChatGPT Image Model 2.
- Cover result image (Sandra's own).
- Which selfie to use for best results.
- What not to ask ChatGPT.
- Best use case: reel cover, profile photo, sales page, carousel, story, launch teaser.
- Sandra's note: why this look works right now.

One free preview prompt from each drop becomes the next reel or freebie. Full collection stays member-only.

Aesthetic examples:
- Dark Balcony City Girl
- Winter Rich Girl Mirror
- Soft CEO Hotel Morning
- Paris Apartment Window
- Red Lip Night Editorial
- Coastal Rich Aunt
- Launch Day Founder Portraits

### 2. Seasonal Collections (monthly)

One larger collection per month built around content moments members need. 15 to 30 transformations. These create urgency and a reason not to cancel before the next season.

Examples: Summer Main Character, Fall Founder Era, Holiday Glam, New Year Rebrand, Valentine's Soft Luxury.

### 3. Member Archive

The archive is the retention asset. Members stay subscribed because everything that came before is still there.

First version: protected page (can be Academy access area). No custom build required yet.

Structure:
- Newest drops first.
- Filter by aesthetic (dark feminine, luxury, glam, mirror, soft, coastal, founder, launch, seasonal).
- Filter by use case (reel cover, profile photo, carousel, sales page, story, launch).
- Prompt cards with copy buttons and view/copy tracking.

### 4. Sandra's Notes (every drop)

- Why this look works right now.
- Which selfie to use.
- What not to ask ChatGPT.
- How to make it look less fake.
- What caption angle fits the image.

This is the moat. Anyone can get prompts from ChatGPT. Nobody else gets Sandra's current taste, tested examples, and content instinct.

### What Is Not In The MVP

Do not build:
- Full social community platform.
- Complex member profiles.
- Custom AI generation inside the app.
- Public prompt marketplace.
- In-app challenge submission (run challenges through Instagram DMs until 30+ members).
- Leaderboard.
- Feed Planner integration as a core promise.

### Creator Challenge System — Deferred Until 30+ Members

Running a challenge with 10 members and 2 submissions feels sad. The mechanic only works with volume. Until 30+ active members:
- Sandra posts the weekly aesthetic on Instagram.
- "DM me your result" is the whole submission mechanism.
- Sandra reposts 3 results. No code required.
- Add in-app submission infrastructure only when there is enough volume to make it feel alive.

---

## Affiliate And Community Loop

### When To Add

Do not launch affiliate on day one. Launch after:
- 25+ Prompt Vault purchases.
- 10+ recurring club members.
- 5+ public member transformations Sandra would repost.

### Customer Referral First

Offer members: give a friend 20% off their first month, get one free month when they join.

Why this first: existing buyers are more trusted than random affiliates. They can show their own result. A member sharing her own editorial photo is worth 10x a coupon code in a newsletter.

### Creator Affiliate Later (after proof)

- 30% recurring commission for 6 months.
- Affiliate must show actual examples or create content around a SSELFIE-style transformation.
- No generic coupon spam.
- Target affiliates: beauty creators, personal brand coaches, Instagram coaches, digital product sellers, women teaching ChatGPT/AI for creators.

### The Loop That Matters

Member creates transformation → member shares result on Instagram → audience asks "what did you use?" → member shares referral link → new buyer joins Vault or Club → new buyer creates transformation.

This is stronger than: affiliate posts a discount code → cold audience clicks → maybe buys.

---

## Segment Strategy

The AI prompt audience is its own segment. Do not mix messaging with legacy Selfie Guide or education ladder audiences.

**Segment name:** AI Photoshoot Audience
**Source of truth:** `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md`

| Intent Level | Definition | Right Message |
|---|---|---|
| Curious | Opted into free prompts | "Try this week's free transformation." |
| Activated | Copied a free prompt | "Unlock the full shoot." |
| Buyer | Bought Prompt Vault | "Get new drops every two weeks." |
| Power user | Copied 3+ vault prompts | "You are the best fit for Vault Club." |
| Abandoned | Started checkout, did not buy | "Your transformation is waiting." |

**Exclude from first membership push:**
- Legacy Selfie Guide only leads who never engaged with AI prompts.
- Studio members unless message is framed as included/new member benefit.
- Starter Kit buyers unless they also entered AI Prompts.

---

## Validation Gates Before Building

Do not build the membership until at least 3 of these are true:

1. Prompt Vault reaches 25+ purchases.
2. 40% or more of buyers open vault access.
3. 50% or more of access openers copy at least one prompt.
4. At least 10 buyers copy 3+ prompts.
5. Dark Balcony or another aesthetic gets repeated DMs/comments asking to buy.
6. At least 5 buyers reply or DM asking for more prompts/drops.
7. Checkout recovery produces at least 1 recovered purchase.
8. **[New — most important]** Any buyers return to the vault on day 7 or day 14 without being emailed. Unprompted return visits are the only proof of recurring desire. Purchases prove the offer. Unprompted returns prove the habit.

If these are not met, keep improving the free-to-paid bridge and the Vault sales page.

---

## 30-Day Plan

### Week 1: Measure

- Pull daily Prompt Vault dashboard.
- Identify top viewed/copied prompts by aesthetic.
- Monitor day-7 vault access opens (unprompted — this is the new key metric).
- Maintain AI Photoshoot Audience segment rule.
- Post 2 more Dark Balcony/Reel Cover Hero reel variations.
- Confirm checkout recovery email sends without errors.

### Week 2: Prove Repeat Demand

- Add one new drop manually to Prompt Vault (biweekly-style, not weekly-style).
- Email Vault buyers: "I added a new transformation this week."
- Ask buyers to reply with the next aesthetic they want.
- Track access opens and prompt copies 48 hours after email.

### Week 3: Test Club Interest Without Building Anything

- **Instagram DM signal:** Post reel or story. Caption/sticker: "DM me DROPS if you want new AI photoshoot transformations every two weeks." Count DMs over 48 hours. This is the most honest signal — no form, no friction.
- Send buyer-only interest email. One question: "Would you pay $27/month to get new Sandra-tested transformations every two weeks? Reply yes or no."
- Goal: 20+ DMs or 10+ direct yes replies.

### Week 4: Build MVP Only If Gates Pass

- Create Stripe subscription product ($27/month regular, $19/month founding member).
- Create protected Club archive page (can use existing Academy access infrastructure).
- Add first 3 drops to the archive.
- Build welcome/delivery email with "try this one prompt right now" CTA.
- Invite founding members only (first 20, locked at $19/month).

---

## First Offer Page Outline

Headline: "New AI photoshoot transformations every two weeks."

Subhead: "Turn one selfie into a new version of your visual identity — Sandra-tested, ChatGPT-ready, and updated every two weeks so your content never looks stuck."

Sections:
1. What dropped this period (tease the current aesthetic).
2. What members get (drops, archive, Sandra's notes).
3. Why this is different from a prompt pack (Sandra tested it on her own selfie).
4. Examples from the archive.
5. Founding member price and urgency.
6. FAQ.

FAQ must answer:
- Works in ChatGPT (no new app).
- Use your own selfie.
- New drops every two weeks.
- Cancel anytime.
- Prompt Vault buyers keep their one-time vault access.
- Club is for ongoing new drops and editorial direction.

---

## Maya Pipeline — Decision (Audit Complete 2026-05-27)

A full code audit of the Maya pipeline answered: **No, the pipeline is not unnecessary. But it serves a different audience than Vault Club.**

### What the audit found

Three generation paths exist:

| Path | Provider | Training Required | What it adds vs ChatGPT |
|---|---|---|---|
| Classic | Replicate FLUX LoRA | YES | Trained personal model — consistent face likeness across unlimited generations |
| Quick Photo | OpenAI gpt-image-2 | NO | Immediate results, no training, now the default for new users |
| Pro | Nano Banana | NO | Style transfer from up to 14 reference images |

**What Maya has that plain ChatGPT cannot replicate:**
- LoRA model training — once trained, every generation uses the user's personalized weights. ChatGPT + one selfie gives one result. Maya + trained LoRA gives consistent likeness every time.
- Gender and ethnicity prompt augmentation, automatically injected.
- Reference image refinement — iterative edits from a previous result.
- Persistent gallery to Vercel Blob — permanent URLs, never raw provider responses.
- Quality presets by category (aspect ratio, guidance scale, LoRA scale).

### Decisions

| Component | Decision | Reason |
|---|---|---|
| LoRA training pipeline (Replicate) | Keep for Studio | Trained model is the Studio retention moat. Members who complete training have consistent likeness ChatGPT cannot match. |
| OpenAI gpt-image-2 path | Keep as default | Already Phase H default. Removes training barrier for new users. |
| Nano Banana Pro path | Keep | Power users and style transfer use cases. |
| Credits system | Keep for Studio | Studio members get 200 credits/month. Required for generation gating. |
| ai_images gallery | Keep and extend | Core Studio value. ChatGPT has no persistent gallery. |
| generated_images (legacy) | Maintain, do not migrate yet | Classic mode still writes to it. Migrate only if Classic is deprecated. |
| Maya for Vault Club | Do not build | Vault Club buyers use ChatGPT directly with Sandra's prompts. Maya = friction, not value, for this audience. The prompts ARE the product. |
| Feed Tab (maya-feed-tab.tsx) | Dead — safe to delete | Hardcoded disabled, confirmed orphaned. See CLAUDE.md dead code map. |

### What keeps Studio members from churning

Studio is not a commodity because of the LoRA training pipeline. Once a member trains their model, every image they generate uses it. ChatGPT + one selfie produces inconsistent likeness. Maya + trained LoRA produces consistent likeness every time. This is the retention argument.

**Immediate action (no gates required):** Codex task `tasks/UX-03-maya-classic-training-retention.md` — query what percentage of current Studio members have completed LoRA training. Members who have trained are significantly less likely to churn. Members who have not trained are the Studio churn risk.

### Phase 2 opportunity (after Vault Club validates, not now)

Add a "Use in Maya" shortcut on each Vault Club prompt card for Studio members who have a trained LoRA. Tap to open Maya Classic with the prompt pre-populated. Generation uses their trained weights. This makes the two products complementary — Vault Club provides the direction, Maya provides the personalized result. Do not build this until Vault Club has paying members and Studio retention data confirms trained members want it.

---

## Biggest Strategic Risk

Building the membership before proving buyers want ongoing drops.

The correct sequence:
1. Sell Prompt Vault.
2. Watch which aesthetics people copy.
3. Add one new drop.
4. Measure whether buyers return unprompted.
5. Ask buyers directly if they want drops on a schedule.
6. Then build the subscription.

Skipping any step means building for assumed demand, not proven demand.

---

## Sources

- Competitive research conducted 2026-05-27. Found that most originally cited competitors are in different markets (copywriting, AI art credits, business automation). Sandra's specific niche — editorial AI photoshoot drops for personal brand women using ChatGPT — has no direct subscription competitor.
- Retention benchmark: AI-native subscriptions under $50/month see 23% gross revenue retention when activation (first use) does not happen within 7 days; 75%+ when it does.
- Source: Medium case study "Can I Sell AI Prompts as a Subscription? I Tried a 7-Month Membership"; supported by Pen Pivot Pro (penpivotpro.com) and Banana Prompts (bananaprompts.xyz/pricing) pricing research.
- `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md`
- `docs/funnel/AI_PROMPT_FUNNEL_RESEARCH_AND_LADDER_2026-05-26.md`
- `docs/funnel/PROMPT_VAULT_PIVOT_AUDIT_2026-05-26.md`
