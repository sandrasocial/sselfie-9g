# Maya Funnel Redesign
**Date:** 2026-02-25  
**Decision:** Rebuild the blueprint freebie funnel to lead to Maya, not Feed Planner  
**Author:** AI Engineering Team  
**Status:** APPROVED — Implementing

---

## The Problem With The Old Funnel

The blueprint funnel was built around Feed Planner. The free offer promised a "strategy + content plan." The paid Blueprint ($47) delivered "30 custom AI photos + full Feed Planner access."

**The result:** Users signed up expecting a strategy tool and got confused by a complex click-and-create feed builder. 0% activation. 24 canceled subscriptions. Feed Planner had 1 continue-click in 3 days.

Feed Planner is a powerful feature. But it is **not the "wow" moment.** The wow moment is:

> You upload one selfie. 90 seconds later, you look like you hired a €300 photographer.

That is Maya. That is what SSELFIE actually IS. The funnel was pointing at the wrong thing.

---

## The New Funnel Architecture

### Tier 1: Free (Lead Generation + Activation)

**Old promise:** "Get your brand strategy"  
**New promise:** "Your first AI brand photo — free"

| What changes | Old | New |
|---|---|---|
| Default tab on signup | Feed Planner | Maya |
| Welcome flow trigger | Feature flag (was off) | Always on for new users |
| Free offer copy | "Brand Blueprint strategy" | "2 free AI brand photos" |
| First action shown | Onboarding wizard | Maya welcome 3-step flow |
| Value delivered | Strategy document (abstract) | Actual photo they can post (concrete) |

**The activation event:** User generates their first AI photo.  
That single moment — seeing themselves look stunning — is worth more than any strategy document.

---

### Tier 2: Paid Blueprint ($47 — One-Time)

**Old promise:** "30 custom photos + full Feed Planner"  
**New promise:** "30 AI photos that look like you + your personal AI model"

| What changes | Old | New |
|---|---|---|
| Primary value | Feed Planner access + 60 credits | 60 credits → 30 Maya photos |
| Secondary value | 9-post feed planning | Train your custom model (Classic mode) |
| Welcome wizard | "Welcome to Feed Planner!" | "You have 30 photos to create. Start here." |
| Default tab | Feed Planner | Maya |
| CTA on purchase | "Create your first feed" | "Let's make your first 3 photos" |

**What stays the same:** Feed Planner is still accessible. It becomes the "next step" after they've generated photos — "Now let's plan how you'll use them on Instagram."

---

### Tier 3: Creator Studio ($97/month)

**No change to core offer.** Adjust messaging to lead with Maya.

**Old headline:** "Your complete AI content studio"  
**New headline:** "Unlimited AI photos + your personal model + a full content system"

The Feed Planner is positioned as the "compound value" — you generate photos with Maya, then plan your feed. Both features together = the full system.

---

## Classic Mode: Train Your Model

Classic mode is a **core differentiator.** Users love it. Do NOT remove or de-prioritize it.

**Current flow:** User uploads 10-20 photos → Replicate trains a Flux LoRA → They can generate infinite variations of themselves in any style

**The positioning problem:** Training your model sounds technical. It needs to feel personal.

**Reposition:** "Your personal AI — trained on you, forever yours"
- Not "train a model" → "create your personal AI"
- Not "LoRA training" → "teaching the AI what you look like"
- Outcome: "Every photo it generates actually looks like you — not someone else"

**The journey:**
1. Day 1: Generate first Maya photo (Pro mode — upload selfie each time)
2. Day 3-7: "Want photos that always look exactly like you? Train your personal AI." → Classic mode training
3. Week 2+: Use Classic mode → faster, no selfie upload, perfectly consistent

This positions training as the **upgrade from Pro to Classic** — a natural progression, not an upfront barrier.

---

## Classic Mode: Technical Upgrade Path

**Current trainer:** `replicate/fast-flux-trainer` (MAYA_FLUX_V3)  
This is production-stable and working. Do not change it in Phase 1.

**Better for portraits:** `fal.ai/flux-lora-portrait-trainer`
- Preserves eye highlights, single hairs, skin texture
- Multi-resolution training maintains identity at small face sizes
- Better prompt following and relighting

**Recommendation:**
- Phase 1 (now): Keep current Replicate trainer — activation is the priority
- Phase 3 (month 2-3): A/B test fal.ai portrait trainer for new training jobs
- Migration: fal.ai API key + update `lib/replicate-client.ts` trainer reference
- Cost: ~$2.40 per training (1000 steps at $0.0024) vs ~$2 on Replicate — minimal difference

**Don't break existing trained models.** Inference (generation) stays on Replicate regardless.

---

## Feed Planner: Rethought, Not Removed

Feed Planner moves from **entry point** to **step 3 in the journey.**

| Position | Feature | Purpose |
|---|---|---|
| Step 1 | Maya (Pro mode) | First AI photo — the WOW |
| Step 2 | Classic mode training | Personal consistency — YOUR face |
| Step 3 | Feed Planner | Plan your feed with the photos you've made |
| Step 4 | Academy | Level up your content skills |

**What changes in Feed Planner UX:**
- Empty state: "You've generated photos. Now let's plan your feed." (not "Build your first feed from scratch")
- Onboarding wizard: Skip or simplify for users who've already generated photos
- Default tab: Still accessible but no longer the first thing new users see

---

## Implementation Checklist

### Immediate (already done)
- [x] Welcome flow enabled by default (feature flag fix)
- [x] `hasNoImageSpend` gate removed
- [x] New users default to Maya tab

### This week
- [ ] Update `blueprint-welcome-wizard.tsx` to be Maya-focused
- [ ] Add "You have [N] credits — make your first photo" banner to Maya tab for new users
- [ ] Update free user empty state in Maya to show credit count + first-gen CTA
- [ ] Update paid blueprint welcome message from "Feed Planner" to "Maya photoshoot"

### Next sprint (Phase 2)
- [ ] Update landing page copy for Blueprint offer (Maya-first messaging)
- [ ] Update email sequences for new Blueprint buyers (Maya onboarding, not Feed Planner)
- [ ] Simplify Classic mode training entry — "Create your personal AI" framing
- [ ] Add "Next: plan your feed →" CTA after 3+ photos generated

### Month 2 (Phase 3)
- [ ] A/B test fal.ai portrait trainer vs Replicate for new training jobs
- [ ] Maya contextual prompts based on Academy product purchased

---

## OpenClaw Bridge Integration

The bridge between OpenClaw (North) and sselfie-9g is ACTIVE.

**Outbound (North → sselfie-9g):** `https://sselfie.ai/api/stella/bridge`  
**Inbound (sselfie-9g → North):** `http://localhost:18789/hooks` (Stripe webhooks configured)

**Planned integrations:**
1. New subscriber event → North queues personalized onboarding message via Telegram
2. First photo generated event → North sends "Your first AI photo — save it, post it, let me know how it landed"
3. Training complete event → North sends "Your personal AI is ready. Here's your first prompt to try."
4. 7-day inactivity trigger → North sends a re-engagement message with a quick-win prompt
5. Academy purchase → North sends product-specific guide + in-app deep link

**Implementation:** Extend `/api/webhooks/stripe/route.ts` to push events to North via the bridge endpoint after key lifecycle events.

---

*This document should be updated after each sprint. Last updated: 2026-02-25*
