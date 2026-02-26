# SSELFIE Copy Audit — 2026-02-26

**Auditor:** Cursor AI Brand Copy Auditor  
**Voice Bible source:** `docs/brand/VOICE_BIBLE.md`, `docs/brand/DO_DONT.md`, `docs/brand/MESSAGING_PILLARS.md`  
**Scoring:** 1 = sounds corporate/wrong → 5 = sounds like Sandra  
**Criteria:** Warm not corporate · Conversational not instructional · Outcome-focused not feature-focused · Uses "you" not "users" · Sounds like a woman talking to women · Never robotic

---

## Priority Order — Fix These 3 First

These have the worst voice scores AND sit at direct conversion moments:

1. **#4 Upgrade modal** — Score 1/5. Every paid tier upgrade passes through this. A one-word headline with no emotional hook will bleed conversions.
2. **#2 Zero-credits upgrade modal** — Score 2/5. The highest-intent moment in the app — users who have burned through all their credits and want more. The current copy treats them like an error state.
3. **#8 Training tab** — Score 2/5. Training is the gateway to product value. If this feels like a developer dashboard, users skip it, never get personalised photos, never see value, never upgrade.

---

## The 10 Moments

---

### 1. Welcome / Activation Banner

**File:** `components/sselfie/sselfie-app.tsx` ~line 787  
*(Note: currently hidden via `className="hidden"` — but code is live and auditable)*

**Current copy:**
> "Welcome to SSELFIE! 🎉 Purchase credits to start creating your professional selfies"

**Voice Bible score:** 1/5

**Issues:**
- "Purchase credits to start creating" is the first thing a new user reads — it opens with a demand for money, not a reason to care.
- "Professional selfies" is awkward phrasing; selfies by definition are not "professional," and it still tells no one *why* they would want them.
- No warmth, no outcome, no Sandra. Reads like a system notification.
- Zero connection to brand messaging (visibility, content, business growth).

**Rewritten copy:**

> **Banner line:** You're in. Grab credits and let's get your first brand photo done — it takes under 2 minutes.
>
> *Alt headline + CTA format:*
> **Headline:** Your first brand photo is one selfie away.  
> **CTA:** Get credits

---

### 2. Zero-Credits Upgrade Modal

**File:** `components/credits/zero-credits-upgrade-modal.tsx`

**Current copy:**
- **Title:** OUT OF CREDITS
- **Body:** You've used all your credits. Upgrade to Studio Membership for monthly credits, or purchase a one-time session.
- **Primary CTA:** UPGRADE TO STUDIO
- **Secondary CTA:** BUY CREDITS
- **Dismiss:** MAYBE LATER

**Voice Bible score:** 2/5

**Issues:**
- "OUT OF CREDITS" reads like an ATM error screen. No warmth, no acknowledgment that the user just *did something*.
- "purchase a one-time session" sounds like calling tech support. Nobody talks like this.
- Purely transactional — zero emotional connection, zero momentum acknowledgment.
- No outcome framing. Why should she care about "monthly credits"? Connect it to photos, content, business visibility.

**Rewritten copy:**

> **Title:** You've been creating.
>
> **Body:** You've used every credit — that means you've been showing up. Keep the momentum going.
>
> Studio gives you 200 credits a month — that's 100 brand photos, consistently, without having to think about it. Or top up now with a one-time pack if you want to keep it flexible.
>
> **Primary CTA:** Join Studio — 200 credits/mo  
> **Secondary CTA:** Top up with a credit pack  
> **Dismiss:** Not right now

---

### 3. Buy Credits Modal

**File:** `components/sselfie/buy-credits-modal.tsx`

**Current copy:**
- **Title:** Buy Credits
- **Feature bullets:** Generate AI images · Create Instagram feeds · Never expires
- **CTA:** Select Package

**Voice Bible score:** 2/5

**Issues:**
- "Buy Credits" as a modal title is purely transactional — it is a label, not a reason.
- Feature bullets describe *what the system does*, not what the user *gets*. "Generate AI images" means nothing to someone thinking about showing up online.
- "Never expires" is a reassurance stated robotically with zero warmth.
- "Select Package" is the most generic e-commerce CTA imaginable. Zero personality.
- No mention of *why* credits matter — photos that look like you, a feed that is ready to post, content without the stress.

**Rewritten copy:**

> **Title:** Add more credits
>
> **Body:** Pick the pack that fits where you're at. Use them whenever — they never expire.
>
> **Feature bullets:**
> - AI brand photos that actually look like you
> - Feed layouts you can post right away
> - Credits that stay in your account until you need them
>
> **CTA:** Get this pack

---

### 4. Upgrade Modal

**File:** `components/upgrade/upgrade-modal.tsx`

**Current copy:**
- **Title:** UPGRADE
- **Body:** Upgrade to Creator Studio and get 200 credits / month
- **Primary CTA:** UPGRADE TO CREATOR STUDIO
- **Dismiss:** MAYBE LATER

**Voice Bible score:** 1/5

**Issues:**
- "UPGRADE" as a standalone headline is completely empty — a verb with no subject, no emotion, no hook.
- The body is a feature statement (credits/month). Gives no reason to care beyond the number. What *are* 200 credits? What does that let her do?
- "UPGRADE TO CREATOR STUDIO" asks the user to take action for the system's benefit, not hers.
- Zero Sandra. No warmth, no outcome, no story. Reads like a SaaS upgrade modal from 2015.

**Rewritten copy:**

> **Title:** Ready to keep going?
>
> **Body:** Creator Studio gives you 200 credits a month — that's 100 brand photos. One monthly plan, everything you need to show up consistently without scrambling for content.
>
> **Primary CTA:** Yes, join Studio  
> **Dismiss:** Not right now

---

### 5. Maya Empty State Prompt

**File:** `components/sselfie/maya-chat-screen.tsx` ~line 2965–2969 (Classic mode, no messages)

**Current copy:**
- **Heading:** Welcome
- **Body:** Hi, I'm Maya. I'll help you create beautiful photos and videos.

**Voice Bible score:** 2/5

**Issues:**
- "Welcome" is the most generic heading possible.
- "I'll help you create beautiful photos and videos" — "beautiful" is empty phrasing. No connection to the user's brand, business, visibility, or outcome.
- No invitation to start, no energy, no Sandra.
- Completely misses the SSELFIE brand truth: one good selfie fuels weeks of content. Maya should feel like a capable creative partner, not a generic assistant.

**Rewritten copy:**

> **Heading:** Hi, I'm Maya.
>
> **Body:** Tell me what you want to create — a brand photo, a feed layout, or something that's been on your mind. I'll help you make it happen.

---

### 6. Academy Tab Headline and Section Copy

**File:** `components/sselfie/academy-screen.tsx`

**Current copy (key moments):**
- **Hero heading:** Academy
- **Courses card body:** Explore our complete library of courses designed to help you master professional photography and personal branding
- **Templates card body:** Download professional templates for Canva, PDFs, and more to **elevate** your brand
- **Monthly Drops body:** Exclusive monthly resources and content drops for Studio Members
- **Flatlay card body:** Professional flatlay images to **elevate** your content and brand aesthetic
- **Studio gating body:** Access exclusive templates, monthly drops, and flatlay images with a Studio Membership

**Voice Bible score:** 2/5

**Issues:**
- "elevate" used **twice** — this is a **banned word** per `DO_DONT.md`.
- "Explore our complete library of courses designed to help you master professional photography and personal branding" is dense, institutional, and instructional. "Master professional photography" is jargon; women come here to show up online, not get a credential.
- "Exclusive monthly resources and content drops for Studio Members" — generic SaaS language. Tells no one *why* they would want them.
- The gating copy is pure corporate-speak with zero warmth or invitation.

**Rewritten copy:**

> **Hero heading:** Academy *(keep — nav label is fine)*
>
> **Courses card:**
> - **Headline:** Learn at your own pace
> - **Body:** Courses built around what you're actually trying to do — grow your brand, show up online, and create content that feels like you.
> - **CTA:** See all courses →
>
> **Templates card:**
> - **Headline:** Templates
> - **Body:** Grab ready-to-use Canva and PDF templates. Design your brand without starting from scratch.
> - **CTA:** Browse templates →
>
> **Monthly Drops card:**
> - **Headline:** Monthly Drops
> - **Body:** Fresh content and resources every month so you always have something new to work with.
> - **CTA:** View monthly drops →
>
> **Flatlay Images card:**
> - **Headline:** Flatlay Images
> - **Body:** Professional images to fill out your feed when you need them. No photoshoot required.
> - **CTA:** Browse flatlay images →
>
> **Studio Membership Required gating:**
> - **Heading:** Studio members only
> - **Body:** Templates, monthly drops, and flatlay images come with Studio membership. Join to get full access.
> - **CTA:** Join Studio

---

### 7. Onboarding Wizard

**File:** `components/onboarding/unified-onboarding-wizard.tsx`

**Current copy:**
- **Step 1 title:** What's your goal?
- **Step 1 body:** Hi {userName}! 👋 Tell us a bit about what you do and who you're here for.
- **Step 2 title:** What's your style?
- **Step 2 body:** Pick a vibe that feels like you. Then add 1–3 selfies so we can match your look.
- **Step 3 title:** You're ready!
- **Step 3 body (line 1):** Your feed is ready. One tap and we'll create your first 9-post grid.
- **Step 3 body (line 2):** You can always come back to edit your goal or style from the Feed Planner header.
- **Step 3 CTA:** Create my first feed

**Voice Bible score:** 3/5

**Issues:**
- "What's your goal?" and "What's your style?" are generic titles that could belong to any app. No SSELFIE personality.
- "Tell us a bit" — "us" is institutional. Sandra would say "tell me."
- Step 2 "Pick a vibe that feels like you" is genuinely Sandra-adjacent — the best line in this wizard.
- Step 3's second body line — "You can always come back to edit your goal or style from the Feed Planner header" — is a procedural instruction. It deflates the momentum of the finish.
- Step 3 CTA "Create my first feed" is solid — keep it.

**Rewritten copy:**

> **Step 1 title:** Let's set you up right.
> **Step 1 body:** Hi {userName}! Tell me a little about what you do — it helps Maya create content that actually fits your brand, not just anyone's.
>
> **Step 2 title:** What does your brand feel like?
> **Step 2 body:** Pick the feed style that looks most like you. Then add a selfie so we can match your face to your vibe.
>
> **Step 3 title:** You're all set.
> **Step 3 body:** Your first 9-post feed is ready to generate. This is the easy part — one tap and you'll have a full grid to work with.
> **Step 3 CTA:** Create my first feed *(keep)*

---

### 8. Training Tab Empty State

**File:** `components/sselfie/maya/maya-training-tab.tsx`

**Current copy:**
- **Main heading:** AI Model Training
- **Main description:** Train your personal AI model with your selfies. This takes about 5 minutes and you only need to do it once.
- **Empty state heading:** Get Started
- **Empty state body:** Upload 5+ selfies to train your personal AI model. Once trained, you can generate personalized images.
- **Empty state CTA:** Start Training

**Voice Bible score:** 2/5

**Issues:**
- "AI Model Training" sounds like a heading from a developer dashboard. It describes the *system process*, not the *user outcome*.
- "Get Started" is the most overused heading in product design. It says nothing about what you are starting or why it matters.
- The body is technical documentation, not a welcome. No warmth, no excitement.
- Zero connection to the brand truth: after training, Maya generates photos that *look like you* — your face, your style, your brand. That hook is completely absent.
- "Once trained, you can generate personalized images" is the most sterile description of something genuinely exciting.

**Rewritten copy:**

> **Main heading:** Your Personal AI
>
> **Main description:** Upload a few selfies and Maya learns your look. After that, every photo she creates will actually look like you — not a generic model.
>
> **Empty state heading:** Let's build your AI.
>
> **Empty state body:** Upload 5 or more selfies — clear face, good light, a few different angles. It takes about 5 minutes and you only do it once. After that, Maya knows your look.
>
> **Empty state CTA:** Start training

---

### 9. Post-Purchase Success Page

**File:** `app/academy/success/page.tsx`

**Current copy:**
- **Main heading:** You're in, {firstName}! / You're in!
- **Body line 1:** {product.name} is now in your library.
- **Body line 2:** Proud of you for doing this.
- **Next step — ai_photo_prompts headline:** Inspiration unlocked
- **Next step — ai_photo_prompts body:** Browse curated prompts in Maya and generate your next photos.
- **Next step — paid_blueprint body:** Create your first 9-post feed in Feed Planner and watch the magic happen.
- **Upsell block label:** Ready for everything?
- **Upsell membership body:** All products. All tools. €97/month.

**Voice Bible score:** 3/5

**Issues:**
- "You're in, {firstName}!" — this is genuinely good. Keep it.
- "Proud of you for doing this." — pure Sandra. Keep it.
- "{product.name} is now in your library." — cold, transactional. "Library" feels like a software file system. Missed opportunity to acknowledge the decision.
- **"Inspiration unlocked"** — BANNED WORD. "unlocked" is explicitly on the `DO_DONT.md` banned list.
- "watch the magic happen" — generic hype language. Not Sandra.
- "Ready for everything?" — feels like an infomercial upsell.
- "All products. All tools. €97/month." — a spec sheet, not a reason.

**Rewritten copy:**

> **Main heading:** You're in, {firstName}! *(keep)*
>
> **Body line 1:** {product.name} is yours now.  
> **Body line 2:** Proud of you for doing this. *(keep)*
>
> **Next step — ai_photo_prompts:**
> - **Headline:** Your inspiration is waiting.
> - **Body:** Browse prompts in Maya and generate your next photos.
> - **CTA:** Browse Prompts → *(keep)*
>
> **Next step — paid_blueprint:**
> - **Headline:** Your 60 credits are ready. *(keep)*
> - **Body:** Create your first 9-post feed in Feed Planner and watch it come together.
> - **CTA:** Create First Feed → *(keep)*
>
> **Next step — show_up:**
> - **Headline:** Let's show you to the world. *(keep)*
> - **Body:** Chat with Maya about your brand and she'll help you find your voice.
>
> **Upsell block label:** Want the full toolkit?  
> **Upsell membership body:** Every product, every tool, one monthly plan. €97/month.

---

### 10. Blueprint Welcome Wizard

**File:** `components/sselfie/blueprint-welcome-wizard.tsx`

**Current copy:**
- **Heading:** You're in, {userName}. / You're in.
- **Body:** You have 60 credits. That's 30 AI brand photos. Let's use them — upload a selfie and Maya creates your first photo in under 2 minutes.
- **Bullet 1:** Upload one selfie → get a brand photo
- **Bullet 2:** Train your personal AI for faster results
- **Bullet 3:** Plan your feed once you have your photos
- **CTA:** Make my first photo →

**Voice Bible score:** 4/5

**Issues:**
- This is the strongest copy in the app. "You're in, {userName}." is warm and personal. The credit-to-photos translation ("60 credits = 30 AI brand photos") is concrete and helpful. "Let's use them" is proactive and Sandra-adjacent.
- Minor: "Train your personal AI for faster results" is slightly technical. A new user does not think in terms of "training a personal AI" — she thinks in terms of photos that look like her.
- "Plan your feed once you have your photos" is procedural — slightly deflating at the end.
- "Make my first photo →" is strong — keep it.

**Rewritten copy:**

> **Heading:** You're in, {userName}. *(keep)*
>
> **Body:** You've got 60 credits — that's 30 brand photos. Let's start with one selfie and Maya will have your first photo ready in under 2 minutes.
>
> **Bullets:**
> - Upload a selfie → get your first brand photo
> - Let Maya learn your look — photos get better every time
> - Build your feed once your photos are in
>
> **CTA:** Make my first photo → *(keep)*

---

## Summary of Voice Failure Patterns

Three patterns appear across almost every failing moment:

### Pattern 1: Feature-focus over outcome-focus
"Generate AI images," "AI Model Training," "200 credits/month," "Create Instagram feeds" — the app constantly describes *what the system does* instead of *what the user experiences*. Sandra's voice leads with the result ("photos that look like you," "content without the stress") and uses features as supporting proof.

### Pattern 2: Banned vocabulary in active copy
- "elevate" appears **twice** in `academy-screen.tsx` (banned per `DO_DONT.md`)
- "unlocked" appears in `app/academy/success/page.tsx` as "Inspiration unlocked" (banned)
- "magic" appears in the paid_blueprint next-step body (generic hype language, violates DO_DONT rule #2)

### Pattern 3: Transactional / error-state tone at conversion moments
"OUT OF CREDITS," "UPGRADE," "Select Package," "Buy Credits" — the highest-stakes moments in the app (where the user decides to spend money) read like system error messages or generic SaaS UI. Sandra's voice at a conversion moment acknowledges the user's momentum, reminds her of the outcome, and frames the ask as for her, not the platform.

### Pattern 4: Institutional "we" and "us" language
"Tell us a bit about what you do," "designed to help you master" — these phrases imply a faceless company, not Sandra personally. Sandra speaks directly as herself ("tell me," "I'll help you").

---

*Output file written: `docs/COPY-AUDIT-2026-02-26.md`*
