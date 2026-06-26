# SSELFIE Demand Message Propagation Plan

Date: 2026-06-26  
Source of truth: `docs/business/SSELFIE_DEMAND_MESSAGE_AUDIT_2026-06-26.md`

## Goal

Move SSELFIE messaging from:

> Better selfies, AI prompts, visual worlds, and content tools.

to:

> Start building online with your phone, face, story, and one clear visual direction that helps people recognize, trust, and buy from you.

This message must appear across the full customer journey, not only in social content.

## Core Message To Propagate

Primary:

> SSELFIE helps women start building online with the phone, face, story, and life they already have by turning one clear selfie into visuals, content, and offers that make them easier to recognize, trust, and buy from.

Short public version:

> Start building online with your phone, your face, and one visual direction that finally feels like you.

Emotional version:

> This is not about looking perfect. It is about finally seeing yourself as someone who can be seen, remembered, and paid.

## Message Hierarchy

Every public-facing page or email should ladder through this:

1. **Painful before**  
   She wants to build online, but her visuals feel random, unclear, or not ready.

2. **Belief shift**  
   She does not need a studio, perfect confidence, or a completely new life. She can start with one clear selfie.

3. **Mechanism**  
   SSELFIE turns that selfie into a visual direction, AI brand images, captions, covers, and content.

4. **Outcome**  
   She looks recognizable, trustworthy, and easier to remember.

5. **Business bridge**  
   When people understand who she is, it becomes easier to follow, trust, inquire, and buy.

## Pages / Surfaces To Update

### 1. Home / Studio Entry

Likely files:

- `components/sselfie/public-marketing.tsx`
- `app/join/studio/page.tsx`
- related membership checkout capture pages

Current likely problem:

- Too much "Maya helps you create" language.
- Not enough "this helps you start building online and become recognizable."

Required message:

> Studio is your monthly personal-brand creation system. It helps you turn your face, story, and ideas into images, covers, captions, and content you can actually post.

CTA role:

- Join Studio
- Start creating with Maya

Do not position it only as AI generation credits.

### 2. AI Prompts Freebie

Likely files:

- `app/ai-prompts/page.tsx`
- AI prompts access/token page
- AI prompts delivery emails

Current likely problem:

- Strong demand, but may still frame as "free prompts."

Required message:

> This is your first proof that one ordinary selfie can become a brand image you would actually want to post.

CTA role:

- Get the free prompts
- Then bridge to Prompt Vault

### 3. Prompt Vault

Likely files:

- `app/prompt-vault/page.tsx`
- Prompt Vault access page
- Prompt Vault buyer emails
- after-copy CTA moments

Current likely problem:

- Sells "library, prompts, drops, collections."
- That is true, but not the demand.

Required message:

> The Vault helps you stop guessing. Choose a visual world, repeat it, and make your content look like it belongs to the same woman.

CTA role:

- Get the Prompt Vault
- Then bridge to Studio for monthly creation

### 4. Starter Kit

Likely files:

- `app/starter-kit/page.tsx`
- Starter Kit access/token page
- Starter Kit delivery/follow-up emails

Current likely problem:

- Presets and assets can feel like a miscellaneous bundle.

Required message:

> If you hate every source photo, start here. The Starter Kit helps you create the clear selfie foundation your brand and AI images need.

CTA role:

- Get the Starter Kit
- Bridge to AI brand shoot / Studio only after the source-photo problem is solved

### 5. Selfie To Brand Shoot System

Likely files:

- `app/selfie-to-brand-shoot/page.tsx`
- `components/selfie-to-brand-shoot/*`
- access pages and course shell

Current likely problem:

- Data shows weak public demand as a standalone $197 offer.
- It may feel like a course/system when buyers currently want a result/shortcut.

Required message:

> This is the guided first-shoot path. Use it when you want to turn one selfie into your first recognizable set of brand images.

Recommended role:

- Membership bonus
- Vault buyer upsell
- onboarding path inside Studio
- not the primary public CTA until stronger proof exists

### 6. Maya / Studio App

Likely files:

- `app/app-v3/**`
- `lib/app-v3/maya/**`
- onboarding components
- zero-credit and low-credit upgrade modals

Current likely problem:

- Maya may feel like an AI tool instead of a personal-brand creation guide.

Required message:

> Maya helps you decide what to create next and turns your face, story, and offer into content you can post.

App copy should constantly reinforce:

- still you
- one visual direction
- what to post next
- content that supports being recognized and trusted

### 7. Checkout / Payment Capture Pages

Likely files:

- checkout route components
- pre-Stripe email capture pages
- embedded checkout pages

Current likely problem:

- Checkout pages often repeat product names and features, but the buyer needs reassurance at the decision point.

Required message:

> You are not buying another prompt folder. You are buying the next clear step toward showing up online with visuals that finally feel like you.

Must include:

- what she gets
- why it matters
- no-fake reassurance
- access/support reassurance

### 8. Lifecycle Emails

Likely files:

- `lib/email/templates/**`

Current likely problem:

- Some emails are better now, but the full system still likely mixes old ladders and new ladders.

Required message:

Every lifecycle email must connect the product to one of:

- start building online
- stop hiding
- create the source selfie
- stop random AI outputs
- make content look like the same woman
- become recognizable and trusted
- turn visuals into posts/offers

### 9. Admin Weekly Brief

Likely files:

- `lib/content-engine/brief-generator.ts`
- `components/admin/content-brief-client.tsx`

Current problem:

- Output schema still centers `photoshootPrompt`.
- Demand fields are missing.

Required update:

Add a demand-led layer:

- demandSignal
- painfulBefore
- desiredAfter
- beliefShift
- visualProof
- offerBridge
- whyThisCreatesDemand

The brief should answer:

> What demand should Sandra create this week?

not just:

> What should Sandra post this week?

## Implementation Order

### Phase 1: Source Of Truth

Create a reusable demand/messaging module so copy does not drift.

Candidate:

- `lib/content/demand-message.ts`

Should export:

- core message
- short message
- emotional message
- product role map
- approved phrases
- avoid phrases
- offer ladder

### Phase 2: Admin Brief Rebuild

Update the weekly brief first because it drives Sandra's content decisions.

Files:

- `lib/content-engine/brief-generator.ts`
- `components/admin/content-brief-client.tsx`

Deliverable:

- Demand Map section
- Demand-led content cards
- Visual proof as a supporting field, not the center

### Phase 3: Money Pages

Update copy on pages closest to revenue:

1. Prompt Vault
2. Studio Membership
3. Starter Kit
4. Selfie to Brand Shoot
5. Checkout capture pages

Rule:

No redesign unless needed. Copy and hierarchy first.

### Phase 4: App / Maya

Update the in-app language so Studio feels like the personal-brand creation system, not a tool drawer.

Key areas:

- onboarding
- Maya empty state
- generation flow
- low-credit upgrade modals
- output/result screens

### Phase 5: Lifecycle Email QA

Audit and update lifecycle emails against the demand message.

Do not send anything automatically from this phase.

Deliverable:

- list of templates updated
- old promise
- new promise
- CTA
- whether Sandra approval is needed

## QA Checklist For Every Surface

Before any copy is approved, ask:

- Does this name a painful before?
- Does this show a desired after?
- Does this make her care before we explain the feature?
- Is the product framed as the mechanism, not the main desire?
- Is the business bridge clear without promising guaranteed income?
- Does this sound like Sandra?
- Does this avoid fake urgency and guru language?
- Is there one clear CTA?
- Does this connect to the current strongest ladder: AI Prompts -> Prompt Vault -> Studio?

## What Not To Do

Do not:

- rewrite every page randomly
- turn every page into a long manifesto
- remove useful product clarity
- overpromise money
- make AI photos sound like fake-life fantasy
- push Selfie to Brand Shoot as the main public offer until demand/proof improves
- make the app feel like generic personal-brand coaching

## Recommended Next Build

Start with the admin weekly brief rebuild.

Reason:

It is currently producing content Sandra cannot use. If that layer improves, every social post, story, and campaign gets better immediately.

Then update the Prompt Vault and Studio pages because they are the current proven revenue paths.

## Success Criteria

This work is successful when:

- the weekly brief gives Sandra demand angles, not repetitive visual ideas
- the Prompt Vault page sells visual identity direction, not just prompt volume
- the Studio page sells monthly creation and recognition, not just Maya/features
- the Starter Kit has a clear source-photo role
- Selfie to Brand Shoot is positioned as guided first-shoot support, not the main growth bet
- every CTA feels like the next step in changing her online reality

