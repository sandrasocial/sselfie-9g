# TASK M-11 — Brand Engine VIP Landing Page
Priority: High · Build alongside M-10
Estimated time: 2-3 hours
Context: VIP at €4,997 deserves its own dedicated page.
The woman considering this investment needs a different experience
to the cohort page — more exclusive, more intimate, more personal.

---

## Goal
Create a standalone VIP landing page at:
/brand-engine/vip

This page exists separately from the main apply form.
It has its own energy — exclusive, intimate, high-trust.

---

## Design

Follow Sandra's Scandinavian luxury design system exactly:
- Colors: #0a0a0a / #ffffff / #f5f5f5 / #666666 / #e5e5e5 only
- Headers: Cormorant Garamond, weight 200-300, UPPERCASE
- Body: Inter, weight 300, 16px minimum, line-height 1.8
- Labels: Inter, weight 500, 10-12px, UPPERCASE, tracking 0.5em
- Minimum padding: 48px all sides
- Mobile-first (375px minimum width)
- Asymmetric layout — not centered/symmetrical
- Generous white space throughout

---

## Page structure

### Hero section
Large header (Cormorant Garamond, ultra-light):
"BRAND ENGINE VIP"

Subheader (Inter, small caps label):
"6 WEEKS · 2 SPOTS ONLY · STARTS MARCH 16"

One line of body copy:
"Just you and Sandra. Your entire brand built together."

CTA button: "Apply for VIP"
→ Links to /apply/brand-engine?offerType=vip

---

### What this is section
Header: "THIS IS NOT A COURSE"

Body copy (use this exactly):
"Brand Engine VIP is 6 weeks, just you and me.

We build your entire personal brand using AI —
your Brand DNA, your own AI director, your offer and funnel,
your content system. Everything.

Done together, not handed to you.
I'm beside you the whole way.

Between our weekly calls you have direct access to me
on Telegram or WhatsApp — ask me anything, whenever you need."

---

### The 6 weeks section
Header: "WHAT WE BUILD TOGETHER"

Six rows, clean and minimal:
Week 1 — Brand DNA
Your story, voice, message, values, design system.
Everything rooted in your authenticity.

Week 2 — Your Control Centre
Website or landing page. Tools connected. Everything in one place.

Week 3 — Your AI Director
An agent trained on your brand. Thinks like you. Talks like you.
Available 24/7.

Week 4 — Your Offer + Funnel
Three-tier offer structure. Landing pages. Email sequences.
Automations live.

Week 5 — Your Content System
SSELFIE at advanced level. 30 days of content batched and ready.

Week 6 — Your Full AI Team
A brand team that runs your brand while you live your life.

---

### What you walk away with section
Header: "YOU LEAVE WITH ALL OF THIS"

Clean list (no bullet points — use em dashes or minimal styling):
— Complete Brand DNA document
— Working website or landing page
— Personal AI director trained on your brand
— Connected automation system
— Three-tier offer structure built
— Working sales funnel with email sequences
— 30-day content calendar ready to post
— SSELFIE AI brand photos for all content
— Full AI team running your brand

---

### Investment section
Header: "THE INVESTMENT"

Large price: €4,997
Sub: "Or 3 x €1,749"

Body:
"Includes SSELFIE app membership for the full 6 weeks.
Small API running costs on top — typically €10–50/month.
Sandra guides you through keeping these minimal."

---

### Scarcity section
Header: "2 SPOTS. THAT'S IT."

Body:
"This is not a marketing tactic.
I genuinely only have capacity for 2 women at this level.
When they're filled, that's it until the next cohort."

---

### Final CTA section
Large header: "READY?"

Body: "First step is a 30-minute call.
No pitch. Just a conversation to make sure it's the right fit."

CTA button: "Book Your Discovery Call"
→ Links to: https://calendly.com/sandrasocial/vip-discovery-call-30-min

Secondary link below: "Prefer the group cohort? Apply here →"
→ Links to: /apply/brand-engine?offerType=cohort

---

## Technical notes
- New route: /app/brand-engine/vip/page.tsx
- Static page — no database calls needed
- offerType=vip param pre-selects VIP on apply form
- Add UTM tracking to all CTA links:
  utm_source=vip_page&utm_medium=landing&utm_campaign=brand-engine-feb-2026
- Add to sitemap

## Out of scope
- Do NOT modify existing apply form logic
- Do NOT modify main Brand Engine page
- Do NOT add any analytics beyond existing setup

## Acceptance criteria
- [ ] Page live at /brand-engine/vip
- [ ] Mobile renders correctly at 375px
- [ ] All 5 design system rules followed (colors, fonts, spacing)
- [ ] CTA links to apply form with offerType=vip pre-selected
- [ ] Discovery call button links to Calendly
- [ ] Secondary cohort link working
- [ ] UTM params on all CTAs
- [ ] Page added to sitemap
