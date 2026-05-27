# Vault Club E2E Plan — What Exists, What To Build, Who Does What

Date: 2026-05-27
Status: Active planning document. Do not build Phase 3 until validation gates in Phase 1 pass.
Source of truth: `docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md`

---

## What Is Already Built — Do Not Duplicate

Before assigning any Codex task, confirm these exist and work:

| Feature | Status | Routes / Files |
|---|---|---|
| Prompt Vault landing page | ✅ Live | `app/prompt-vault/page.tsx` |
| Prompt Vault checkout | ✅ Live | `app/checkout/prompt-vault/page.tsx` |
| Prompt Vault access page (buyer) | ✅ Live | `app/access/prompt-vault/[token]/page.tsx` |
| Prompt Vault Academy access | ✅ Live | `app/academy/access/prompt-vault/page.tsx` |
| Prompt Vault Stripe webhook fulfillment | ✅ Live | `app/api/webhooks/stripe/route.ts` |
| Checkout recovery cron | ✅ Live + Enabled | `app/api/cron/prompt-vault-checkout-recovery/` |
| Buyer nurture (Day 2 / Day 5 / Day 10) | ✅ Templates exist, cron enabled | `lib/email/templates/prompt-vault-buyer-sequence.ts` |
| Delivery email | ✅ Live | `lib/email/templates/prompt-vault-delivery.ts` |
| Admin launch monitor | ✅ Live | `app/admin/prompt-vault/page.tsx` |
| AI Photoshoot Audience segment rule | ✅ Documented | `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md` |
| Purchase attribution (UTM, reel slug, buyer stage) | ✅ Live | `lib/audience/ai-photoshoot-segment.ts` |
| Launch broadcast | ✅ Sent 2026-05-27 | Resend broadcast ID `89322db0-3d00-4261-b00c-8e17f22f0ec3` |
| Free prompts (AI Prompts lead magnet) | ✅ Live | `app/ai-prompts/`, `app/ai-prompts/access/[token]/` |
| Studio membership checkout + Maya | ✅ Live (7 paying members) | `app/checkout/membership/`, `app/maya/` |
| Maya Classic (Replicate LoRA) | ✅ Live | `app/api/maya/generate-image/route.ts` |
| Maya Quick Photo (OpenAI gpt-image-2) | ✅ Live, new default | `app/api/maya/generate-image-openai/route.ts` |
| Maya Pro (Nano Banana) | ✅ Live | `app/api/maya/pro/generate-image/route.ts` |
| LoRA training pipeline | ✅ Live, gated by `ENABLE_TRAINING_AI` | `app/api/training/start-training/route.ts` |
| Gallery (ai_images table) | ✅ Live | `app/api/maya/gallery/` |
| Credits system | ✅ Live | `lib/credits.ts` |

---

## Maya Pipeline Decision (Based on Code Audit)

This answers the question: **"Now that users can use ChatGPT directly, is the Maya pipeline unnecessary?"**

### Short Answer

**No — but the pipeline serves a different audience than Vault Club.**

### What the audit found

Three generation paths exist:

| Path | Provider | Requires Training | Best For |
|---|---|---|---|
| Classic | Replicate LoRA | YES — user trains their face | Studio members who want consistent likeness across all their images |
| Quick Photo | OpenAI gpt-image-2 | NO | Any user, immediate results, now the default |
| Pro | Nano Banana | NO | High-quality style transfer with multiple reference images |

### The key differentiator ChatGPT does NOT have

1. **LoRA model training** — User uploads selfies, a personalized model is trained on their face. Every Classic generation uses their trained weights. ChatGPT + one selfie gets you ONE result. Maya + trained LoRA gets consistent likeness across unlimited generations from just the trigger word.
2. **Gender + ethnicity augmentation** — automatically injected into every prompt.
3. **Reference image refinement** — iterative edits ("make it softer", "more editorial") using a previous generated image.
4. **Persistent gallery** — all images stored to Vercel Blob, tracked per user, permanent URLs.
5. **Quality presets by category** — auto-adjusts LoRA scale, guidance scale, aspect ratio per concept type.

### What stays, what evolves, what goes

| Component | Decision | Reason |
|---|---|---|
| LoRA training pipeline (Replicate) | **Keep for Studio** | Trained model = consistent likeness. This is a real differentiator for Studio members who complete training. |
| OpenAI gpt-image-2 path | **Keep + make default** | Already the Phase H default. Removes training barrier for new users. |
| Nano Banana Pro path | **Keep** | Serves power users needing style transfer from multiple reference images. |
| Credit system | **Keep for Studio** | Studio members get 200 credits/month. Required for generation gating. |
| Gallery (ai_images) | **Keep + extend** | Core value for Studio — persistent gallery ChatGPT doesn't have. |
| generated_images (legacy table) | **Maintain, do not migrate yet** | Classic mode still writes to it. Migrate only if Classic mode is deprecated. |
| Feed Tab (maya-feed-tab.tsx) | **Dead — safe to delete** | Already hardcoded disabled. Confirmed orphaned. See CLAUDE.md dead code map. |
| Maya for Vault Club | **Do not build** | Vault Club buyers use ChatGPT directly with Sandra's prompts. Adding Maya = friction, not value. The prompts ARE the product. |

### Phase 2 opportunity (build only after Vault Club validates)

Add "Paste Vault Prompt" shortcut inside Maya Classic for Studio members. A Studio member who has a trained LoRA model can paste any Vault Club prompt and get results using their personalized model instead of ChatGPT. This makes the two products complementary instead of competing. Do not build this until Vault Club has paying members.

### What keeps Studio members from churning

Studio is not a commodity because of the LoRA training pipeline. Once a member trains their model, all their images look consistently like *them*. ChatGPT + one selfie = hit or miss on likeness. Maya + trained LoRA = guaranteed. This is the retention argument for Studio. The feed planner, Maya chat, and gallery are supporting features. The trained model is the moat.

**Action for Codex:** Create `tasks/UX-03-maya-classic-training-retention.md` — identify what percentage of current Studio members have completed LoRA training. Members who have trained are much less likely to churn. Members who have not trained are vulnerable.

---

## Phase 0 — This Week (Measure Only, No Building)

**Owner: Sandra (content + signals) + Claude (monitoring + reporting)**

| Task | Who | What |
|---|---|---|
| Pull daily Prompt Vault dashboard | Claude (admin monitor) | Check `/admin/prompt-vault` daily. Track purchases, access opens, prompt copies. |
| Identify top aesthetics by copy count | Claude + admin monitor | Which prompts are copied most? This is the next drop direction. |
| Monitor day-7 unprompted vault returns | Codex (small query) | SQL: count distinct buyers who opened vault access ≥7 days after purchase without being emailed in that window. This is the key new metric. |
| Post 2 more Dark Balcony/Reel Cover Hero reels | Sandra | Content creation. Watch for DM volume and "how do I get this" questions. |
| Monitor checkout recovery | Claude + admin | Did any abandoned checkouts convert? Recovery cron is enabled. |
| Confirm nurture sequence is firing | Codex | Check `email_logs` for prompt-vault-day2-first-result sends after broadcast. |

---

## Phase 1 — Prove Repeat Demand (Week 2)

**Owner: Sandra (content + buyer outreach) + Codex (email tooling)**

| Task | Who | What | Agent |
|---|---|---|---|
| Add one new drop to Prompt Vault | Sandra | Manually add a new aesthetic (biweekly-style). 5-9 prompts, one cover image, Sandra's notes. | Sandra |
| Email Vault buyers: "I added something" | Claude drafts, Sandra approves, Codex sends | Short email. Subject: "I added a new transformation." Body: "Here's this week's direction. Let me know which aesthetic you want next — just reply." | Claude drafts → Codex builds send route → Sandra approves |
| Ask buyers for next aesthetic | Sandra (email reply CTA) | Simple reply CTA in buyer email. Collect replies manually. | Sandra |
| Track access opens + prompt copies 48h after email | Codex query | SQL query on `analytics_events` comparing opens/copies before/after email send timestamp. | Codex |

---

## Phase 2 — Test Club Interest Without Building (Week 3)

**Owner: Sandra (signal collection) + Claude (interest email)**

Do not build anything in this phase. Collect demand signals only.

| Task | Who | What |
|---|---|---|
| Instagram DM signal | Sandra | Post reel or story. Caption/sticker: "DM me DROPS if you want new AI photoshoot transformations every two weeks." Count DMs over 48 hours. 20+ DMs = strong signal. |
| Buyer interest email | Claude drafts → Sandra approves → Codex sends | One question: "Would you pay $27/month for Sandra-tested transformations every two weeks? Reply yes or no." Track reply rate and sentiment. |
| Tally signals | Sandra + Claude | Combine: DMs + email yes-replies + waitlist clicks. If total ≥ 20 strong signals, validation gates are being approached. |

---

## Phase 3 — MVP Build (Week 4, Only If Gates Pass)

**Owner: Codex (all code) + Sandra (content) + Claude (email copy)**

Gates must be checked before any Codex task in this phase begins.
Minimum: 3 of 8 validation gates from `docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md` must be true.

### 3A — Stripe Subscription Product

**Agent: Codex**
**Task file: `tasks/VAULT-CLUB-01-stripe-subscription.md`**

What to build:
- New Stripe product: `vault_club` subscription
- Two prices: $27/month (regular) and $19/month (founding member, limited)
- Founding member price should be archived/hidden from public checkout after 20 members
- Webhook handler: `subscription_type = 'vault_club'` in stripe webhook → grant vault_club access → send welcome email → tag in Resend audience

What NOT to build:
- Annual pricing (add only after 6-month monthly retention data exists)
- Trial period (complicates the founding member urgency)

### 3B — Vault Club Checkout Page

**Agent: Codex**
**Task file: `tasks/VAULT-CLUB-02-checkout-page.md`**

What to build:
- Route: `app/checkout/vault-club/page.tsx`
- Matches SSELFIE design system (cream, obsidian, Georgia serif)
- Shows founding member price and urgency (X of 20 spots remaining — query Stripe for active vault_club subscriptions)
- Passes UTM/attribution params through to Stripe session

What NOT to build:
- Full marketing page (the offer page comes from Vault Club landing, not the checkout)

### 3C — Vault Club Access / Archive Page

**Agent: Codex**
**Task file: `tasks/VAULT-CLUB-03-access-archive-page.md`**

What to build:
- Route: `app/vault-club/access/page.tsx` (token-based OR session-based via Studio/subscription check)
- Lists drops: newest first, filterable by aesthetic and use case
- Each drop: cover image, drop name, release date, Sandra's notes, prompt cards with copy buttons
- Copy button fires `analytics_event: 'vault_club_prompt_copied'` with `drop_name`, `prompt_number`, `aesthetic`
- Prompt view fires `analytics_event: 'vault_club_prompt_viewed'`
- Non-member: show teaser of most recent drop, CTA to checkout

**Reuse:** Can use existing `app/ai-prompts/access/[token]` as structural template. The UI pattern (prompt cards, copy buttons) already exists in the free prompts page.

What NOT to build:
- Member profiles
- Public gallery / community submission interface
- Voting or ranking system
- Feed Planner integration

### 3D — Welcome / Delivery Email

**Agent: Claude (drafts) → Codex (sends)**
**Task file: `tasks/VAULT-CLUB-04-welcome-email.md`**

What to build:
- Template: `lib/email/templates/vault-club-delivery.ts`
- Uses editorial email shell (`lib/email/editorial-email.ts`)
- Subject: something like "your vault club access is live"
- Body: "You are in. Here is this week's aesthetic. Open ChatGPT. Upload one selfie. Try this one prompt right now." [paste first prompt]. "That is enough. More inside your archive."
- Primary CTA: vault club access page
- Day-3 follow-up: "Did you try it? Here is what to do if the first result was not right." (can reuse Day-5 buyer sequence structure)

**Critical:** The welcome email must get her to try ONE prompt on day one. This is the retention lever.

### 3E — Admin Report

**Agent: Codex**
**Task file: `tasks/VAULT-CLUB-05-admin-report.md`**

What to build:
- Route: `app/admin/vault-club/page.tsx`
- Modeled on `app/admin/prompt-vault/page.tsx` (same structure, different queries)
- Metrics: active members, MRR, churn count, prompt views, prompt copies, top aesthetics, drops published

**Reuse:** Copy the pattern from `/admin/prompt-vault/page.tsx` entirely. Same component structure, different SQL queries.

### 3F — Founding Member Invite Email

**Agent: Claude (draft) → Sandra approves → Codex sends**
**Task file: None — one-shot email**

Draft: short email to Vault buyers + waitlist. "I am opening 20 founding member spots at $19/month, locked for life. You get every drop, the archive, and my notes on what I am testing. After 20 members, this goes to $27/month." One CTA: checkout link. No launch strategy. No countdown timer. Just Sandra texting a group of women she knows want this.

---

## Phase 4 — Community Loop (After 25+ Members)

**Do not plan implementation details yet.** Trigger this phase only when:
- 25+ vault_club active subscribers
- Average prompt copies per member ≥ 3 in first 30 days
- At least 5 members have shared a result Sandra would repost

Tasks at that point:
- Referral code system (Codex)
- "Share your result" email campaign (Claude + Sandra)
- Creator affiliate application page (Codex)
- In-app challenge submission (Codex — only when submission volume justifies it)

---

## Phase 5 — Maya Vault Club Integration (After Phase 4 Validates)

**Do not build yet.** Only relevant if:
- Vault Club has paying members AND
- Studio has members who have completed LoRA training AND
- Any Studio member expresses interest in using Vault prompts in Maya

What to build (when ready):
- "Use in Maya" button on each vault prompt card (for users who have a trained model)
- Opens Maya Classic with the prompt pre-populated
- Generation uses trained LoRA weights
- Result goes to user's gallery

This bridges the two products without asking anyone to change their workflow.

---

## Codex Task Assignment Summary

| Task File | Phase | Description | Dependency |
|---|---|---|---|
| `tasks/UX-03-maya-classic-training-retention.md` | Now | Query: what % of Studio members have completed LoRA training? | None |
| `tasks/VAULT-CLUB-01-stripe-subscription.md` | Phase 3 | Stripe product, prices, webhook | Gates must pass |
| `tasks/VAULT-CLUB-02-checkout-page.md` | Phase 3 | `/checkout/vault-club` page | Task 01 |
| `tasks/VAULT-CLUB-03-access-archive-page.md` | Phase 3 | Vault Club archive + prompt cards | Task 01 |
| `tasks/VAULT-CLUB-04-welcome-email.md` | Phase 3 | Welcome + day-3 follow-up email templates | Task 01 |
| `tasks/VAULT-CLUB-05-admin-report.md` | Phase 3 | `/admin/vault-club` dashboard | Task 03 |

### Sandra Task Assignment Summary

| Task | Phase | Description |
|---|---|---|
| Post 2 Dark Balcony/Reel Cover Hero variations | Phase 0 | Watch DM volume and comments |
| Add one new drop manually to Prompt Vault | Phase 1 | 5-9 prompts, cover image, Sandra's notes, tested personally |
| Approve buyer email: "I added something" | Phase 1 | Claude drafts, Sandra approves and sends |
| Post DM collection story/reel | Phase 2 | "DM me DROPS" — collect 48h signal |
| Approve and send interest email | Phase 2 | Claude drafts, Sandra approves |
| Content: first 3 Vault Club drops | Phase 3 | Required before any member gets access |
| Approve founding member invite email | Phase 3 | Claude drafts |

### Claude Task Assignment Summary

| Task | Phase | Description |
|---|---|---|
| Daily admin monitor check | Phase 0 | Check `/admin/prompt-vault`, flag if gates are approaching |
| Draft buyer email: "I added something" | Phase 1 | Short, Sandra-voice, one reply CTA |
| Draft buyer interest email | Phase 2 | One question, yes/no reply |
| Draft welcome email copy | Phase 3 | "Try this one prompt right now" — 7-day activation |
| Draft founding member invite email | Phase 3 | Short, personal, founding price + urgency |

---

## Files To Not Touch

Per `CLAUDE.md` dead code map and confirmed during Maya audit:

| File / Route | Status |
|---|---|
| `components/sselfie/maya/maya-feed-tab.tsx` | Dead, safe to delete (separate task) |
| `app/api/maya/feed/`, `feed-chat/`, `feed-progress/`, `generate-feed/`, `generate-feed-prompt/`, `generate-all-feed-prompts/` | Dead, safe to delete (separate task) |
| `lib/feed-chat/history.ts` | Dead, safe to delete |
| `app/feed-planner/` ENTIRE DIRECTORY | Live, paying Blueprint users — DO NOT TOUCH |
| `app/api/feed/` ENTIRE DIRECTORY | Live Feed Planner data layer — DO NOT TOUCH |
| `lib/maya/feed-generation-handler.ts` | SHARED — used by live Feed Planner — DO NOT DELETE |
