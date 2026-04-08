# SSELFIE Mini-Products — AI-Powered Redesign Vision
# Version 1.0 — 2026-02-28
# For: Sandra (founder) + Codex (implementation) + North (orchestration)

---

## THE CORE INSIGHT

The current products are static HTML workbooks. A woman pays €17-47, fills in textareas,
and her answers sit in her browser until she clears her cache. Nothing is generated FOR her.
Nothing connects to Maya. The AI is nowhere.

**The new model:**
> You answer 6-8 questions → AI produces YOUR actual output, ready to use today.

Not "here's a framework." YOUR Instagram bio. YOUR 30 captions. YOUR revenue plan.
YOUR photo prompts for your home office, your vibe, your brand.

The WOW moment isn't fancy technology. It's: "Oh my god, I can use this right now."

---

## HOW ALL 4 PRODUCTS CONNECT (THE CHAIN)

```
WHAT TO SAY          SHOW UP            GET PAID           AI PHOTO PROMPTS
─────────────        ───────────        ────────────        ────────────────
"Who are you +  →    "30 days of   →    "Turn your     →    "Photos that
what do you          content using       visibility          match your
stand for?"          your message"       into money"         message"

Saves: brand         Pulls brand         Pulls brand +       Pulls brand
context to           context from        audience data       vibe + content
user profile         step 1              from step 2         calendar themes
     ↓                    ↓                   ↓                    ↓
     └────────────────────┴───────────────────┴────────────────────┘
                               ↓
                    ALL OUTPUTS FEED MAYA
             Maya knows your message, your content pillars,
             your revenue goals, your visual brand style.
             Every generation gets smarter the more products you use.
```

---

## PRODUCT 1: "WHAT TO SAY"
### Brand Message Generator — €17

**Current state:** 5 textareas, progress bar, localStorage save. Static.

**New experience:**

### The Flow (5-7 minutes total)

**Screen 1 — 6 questions (structured form, NOT chat)**
```
Q1: What do you do? (one sentence, don't overthink it)
    [text input]

Q2: Who is she? Your specific person — not "women entrepreneurs."
    The real woman. Her age, her situation, what keeps her up at night.
    [textarea — 3-4 sentences]

Q3: What changes for her after working with you / using your product?
    Before → After. Be specific.
    [textarea]

Q4: What's the part of your story that makes you the right person to help her?
    The experience. The moment. The thing you went through.
    [textarea]

Q5: What do you believe that most people in your industry get wrong?
    Your contrarian POV. Your "actually..."
    [textarea]

Q6: Pick your tone (visual selector — 4 options):
    [ Warm & Personal ]  [ Bold & Direct ]  [ Expert & Calm ]  [ Raw & Real ]
```

**Screen 2 — AI generates 3 brand message angles**

Each angle is a complete package:

```
ANGLE 1 — "THE REBUILDER"
━━━━━━━━━━━━━━━━━━━━━━━━
Instagram bio (150 chars):
"Single mum who rebuilt after 14 years. I help women going through it
turn one good selfie into a business that pays them. 📲 sselfie.ai"
[Copy]

LinkedIn headline:
"Personal Branding Coach for Women Rebuilding | Founder @SSELFIE |
AI Brand Photos Without the €1,500 Shoot"
[Copy]

30-second intro (for calls, reels, DMs):
"I'm Sandra. I help women who are starting over — or starting for
the first time — build a personal brand that actually makes money.
No big following needed. No perfect photos. Just you, your story,
and your phone. I went from €12 to a live AI app in 8 months.
I know what's possible."
[Copy]

Elevator pitch (one line):
"I turn selfies into a personal brand that pays you."
[Copy]
━━━━━━━━━━━━━━━━━━━━━━━━
[ Use this angle ] [ See next angle → ]

ANGLE 2 — "THE STRATEGIST"
ANGLE 3 — "THE REVOLUTIONARY"
```

**Screen 3 — Preview in real contexts**

Show the chosen bio/headline rendered in a mock:
- iPhone Instagram profile card
- LinkedIn header preview
- Email signature block

**Screen 4 — Save + connect**

```
✅ Your brand message is saved to your SSELFIE profile.
   Maya will now use your message and positioning in every photo generation.

WHAT'S NEXT:
[ Build 30 days of content using this message → "Show Up" ]
[ Generate your first brand photo with this context → Maya ]
```

### What gets saved to the user profile
```json
{
  "brand_context": {
    "who_they_serve": "...",
    "transformation": "...",
    "founder_story": "...",
    "pov": "...",
    "tone": "warm_personal",
    "chosen_angle": "rebuilder",
    "instagram_bio": "...",
    "linkedin_headline": "...",
    "elevator_pitch": "...",
    "completed_at": "2026-02-28"
  }
}
```

Maya's system prompt pulls this context on every generation from that point forward.

### The WOW moment
She fills in 6 boxes → she has her exact Instagram bio, LinkedIn headline, and a script
for the next time someone asks "so what do you do?" All of it in her voice.
In 5 minutes. Done.

---

## PRODUCT 2: "SHOW UP"
### 30-Day Content AI Calendar — €27

**Current state:** Static explanation of 4 content buckets. No generation. No calendar.

**New experience:**

### The Flow (5-8 minutes total)

**Screen 1 — Context (pulls from What To Say if available)**

If user has completed Product 1, auto-fills their brand context and skips to Screen 2.
If not, asks 3 quick questions:
```
Q1: What's your business in one sentence?
Q2: Who do you help?
Q3: What platform are you posting on?
    [ Instagram ]  [ TikTok ]  [ LinkedIn ]  [ All three ]
```

**Screen 2 — 5 quick calibration questions**
```
Q1: How often can you realistically post?
    [ Daily ]  [ 5x/week ]  [ 3x/week ]  [ 1-2x/week ]

Q2: What 3 things do you want to be known for?
    (Examples: Rebuilding after divorce / AI personal branding / Making money as a single mum)
    [Tag input — add up to 3]

Q3: What types of content feel natural to you?
    [ My personal story ]  [ Teaching / tips ]  [ Behind the scenes ]
    [ Client results ]     [ Controversial opinions ]  [ Day in my life ]

Q4: Do you want captions written IN FULL or just the idea + hook?
    [ Full captions ]  [ Ideas + hooks only ]

Q5: What month are you planning for?
    [ This month ] [ Next month ] [ Custom ]
```

**Screen 3 — AI generates the full 30-day calendar**

```
FEBRUARY CONTENT CALENDAR — @SANDRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEEK 1 — THEME: YOUR STORY
━━━━━━━━━━━━━━━━━━━━━━━━

DAY 1 — MONDAY — INSTAGRAM CAROUSEL
Topic: "The day I decided to start"
Hook: "I had €12 in my account when I decided to build a company."
Full caption:
"I had €12 in my account when I decided to build a company.
Not €1,200. Not €12,000.
€12.

My husband and I had just separated after 14 years.
I had two kids, no income, and no idea what I was doing.
But I had one thing: I knew how to show up on camera.
And I knew other women needed to learn how.

That was 8 months ago.
Today SSELFIE is live, with 30 paying members, and I'm rebuilding
something I'm genuinely proud of.

The hardest part wasn't the tech.
It was giving myself permission to be visible.

What's stopping you from starting?
↓ Tell me below."

Photo prompt: [Lifestyle — natural light, behind laptop, slightly off-center]
Platform: Instagram
Suggested time: 9am CET
Pillars: Personal story, visibility
──────────────────────────────────

DAY 2 — TUESDAY — TIKTOK/REEL
Topic: "What nobody tells you about rebuilding"
Hook (first 3 seconds of video): "Three things I wish someone told me..."
Script: [full 45-second script]
Text overlay: "rebuilding at 38 hits different"
...
```

Full 30 days rendered. Each post has: topic, full caption, hook, photo prompt, platform, time.

**Screen 4 — Export options**
```
[ Sync to Feed Planner ]  ← one click, all 30 posts appear in Feed Planner tab
[ Download as CSV ]
[ Download as PDF ]
[ Copy Week 1 to clipboard ]
```

### The WOW moment
She answers 8 questions → she has 30 captions written in her voice, organised by week,
with photo prompts for each one, ready to paste into her feed planner.
Never stares at a blank screen again. Ever.

---

## PRODUCT 3: "GET PAID"
### Revenue Strategy AI — €47

**Current state:** Static workbook about revenue concepts. No personalisation. No plan.

**New experience:**

### The Flow (8-10 minutes total)

**Screen 1 — Baseline audit (structured form)**
```
Q1: What's your current monthly income from your personal brand?
    [ €0 — just starting ]  [ €1-500 ]  [ €500-2K ]  [ €2K-5K ]  [ €5K+ ]

Q2: How big is your audience right now?
    Instagram: [number]  TikTok: [number]  LinkedIn: [number]
    Email list: [number]  (enter 0 if none)

Q3: What do you currently offer or sell? (check all that apply)
    [ Nothing yet ]           [ 1:1 coaching / services ]
    [ Digital products ]      [ Online course ]
    [ Membership / community ] [ Brand deals / affiliates ]
    [ Physical products ]

Q4: What have you already tried to monetize, and what happened?
    [textarea — be honest, it helps the AI]

Q5: What's your income target for the next 90 days?
    [ €500/month ]  [ €1,000/month ]  [ €2,000/month ]  [ €5,000/month ]

Q6: How many hours per week can you put into this?
    [ 2-5 hours ]  [ 5-10 hours ]  [ 10-20 hours ]  [ More than 20 ]

Q7: What's your biggest blocker right now?
    [ I don't know what to sell ]
    [ I know what to sell but don't know how to price it ]
    [ I have offers but can't get anyone to buy ]
    [ I get interest but can't close ]
    [ I'm scared to put myself out there ]
```

**Screen 2 — AI generates your personalised 90-day revenue roadmap**

```
YOUR REVENUE ROADMAP — SANDRA
Target: €2,000/month in 90 days
Starting point: €0 income, 180K followers, no email list
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHY €2,000/MONTH IS REALISTIC FOR YOU:
With 180K followers and a strong personal story, you have
significant trust capital. The gap isn't audience — it's offer clarity
and a conversion path. Here's the plan.

──────────────────────────────────────────
PHASE 1 — WEEKS 1-4: THE QUICK WIN
Goal: €500 from one simple offer
──────────────────────────────────────────

YOUR QUICK WIN OFFER:
"Brand Audit Call" — 45-minute 1:1
Price: €97-147
Why this: You have credibility. Women want your eye on their brand.
No tech needed, no product to build, immediate income.

WEEK 1 — SET UP:
□ Write your offer in one sentence (template below)
□ Create a simple booking link (Calendly — free)
□ Set your price: Start at €97

Your offer sentence (ready to use):
"I'll spend 45 minutes reviewing your Instagram, your bio, and your
first impression — and tell you exactly what to fix, what to lean
into, and how to start getting visible. €97. Book below."

□ Post this offer once (template below):

"Real talk: I spent years invisible online. Not because I was boring.
Because I didn't know how to show up.
I've rebuilt everything — including a company.
And now I can see in 5 minutes what's keeping someone hidden.
I'm opening 5 spots this week for a Brand Audit Call.
45 minutes. €97. I'll tell you exactly what I see and what to change.
Link in bio."

WEEK 2-4 — CLOSE 5-8 BOOKINGS:
□ Story series: "What I noticed on [client's] Instagram" (anonymised)
□ Repost any DMs or comments asking about the offer
□ Follow up: Email or DM anyone who clicked but didn't book
Expected: €485-1,176 in weeks 1-4

──────────────────────────────────────────
PHASE 2 — WEEKS 5-8: BUILD THE ASSET
Goal: Add €500-1,000/month of passive income
──────────────────────────────────────────

YOUR ASSET: "What To Say" workbook → SSELFIE mini-product
Price: €17-27
Why this: You already have it. Every call client is a potential buyer.
Automate it: Set up a simple email sequence post-call.

WEEK 5 — YOUR EMAIL SEQUENCE (written below):
Email 1 (day after call): Thank you + summary of advice
Email 2 (day 3): "The thing most people do wrong after a brand audit"
Email 3 (day 7): Offer to "What To Say" — link + discount code

...

──────────────────────────────────────────
PHASE 3 — WEEKS 9-12: SCALE WHAT WORKS
Goal: Reach €2,000/month consistently
──────────────────────────────────────────

Based on Phases 1-2, your best path to scale is:
[ AI will personalise this after Phase 1 check-in ]

──────────────────────────────────────────
PROJECTED REVENUE BREAKDOWN:
Week 1-4:   €485-1,176  (5-8 audit calls × €97-147)
Week 5-8:   €500-800    (audit calls + mini-product)
Week 9-12:  €800-1,200  (scale what's working)
Month 3 run rate: €1,785-3,176
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Screen 3 — Monthly check-in (recurring value)**

At 30 days, user returns and fills in:
```
How did it go?
[ On track — hitting targets ]
[ Behind — explain what happened ]
[ Ahead — what worked ]
```

AI reads their update and revises Phase 2/3 accordingly.
This is the feature that makes this product worth paying for repeatedly.

### The WOW moment
She tells the AI where she is, what she has, what she wants.
She gets a specific offer to launch THIS WEEK, the exact post copy to promote it,
the email sequence to send after, and a realistic income projection.
Not generic advice. Her plan. Her copy. This week.

---

## PRODUCT 4: "AI PHOTO PROMPTS"
### Visual Brand Generator — €17

**Current state:** 50 generic copy-to-clipboard prompts. No personalisation. No Maya connection.

**New experience:**

### The Flow (4-6 minutes total)

**Screen 1 — Visual brand calibration**

```
Q1: Pick your visual vibe (tap 2-3 images that feel like YOUR brand):
    [12 mood images — minimal/editorial, warm/lifestyle, bold/fashion,
     dark/moody, bright/natural, professional/clean, etc.]

Q2: Where do you usually take photos? (pick all that apply)
    [ My home office ]  [ Kitchen / living room ]
    [ Outdoors / nature ]  [ Café / co-working ]
    [ Studio / rented space ]

Q3: What do you need photos FOR? (pick up to 4)
    [ Instagram grid — lifestyle posts ]
    [ Professional headshot (LinkedIn, website) ]
    [ Content creation / behind-the-scenes ]
    [ Speaking / teaching / authority ]
    [ Product / offer promotion ]
    [ Seasonal / campaign-specific ]

Q4: What colours are in your brand or wardrobe?
    [ Neutrals (black, white, beige, grey) ]
    [ Warm tones (rust, terracotta, gold) ]
    [ Cool tones (navy, sage, slate) ]
    [ Bold / mixed ]

Q5: Upload one selfie (optional — helps personalise prompts for your look)
    [Photo upload]
```

**Screen 2 — AI generates 30 personalised prompts**

NOT generic. Based on HER vibe, HER setting, HER needs.

```
YOUR BRAND PHOTO PROMPTS — SANDRA
Style: Editorial minimal / Warm neutral
Setting: Home office + outdoors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROFESSIONAL HEADSHOTS (LinkedIn, website)
──────────────────────────────────────────

PROMPT 01 — "The Founder"
Best for: LinkedIn banner, website hero, press kit
Setting: Your desk / bookshelf background
Scene: Sitting slightly sideways at desk, looking up at camera,
       natural side light from window, laptop open in front

Full Maya prompt:
"Professional personal branding photo, Scandinavian editorial style,
woman in her late 30s sitting at minimalist desk with soft natural
window light from left, slight 3/4 angle to camera, warm neutral
tones, bookshelf slightly blurred in background, wearing black or
camel blazer, confident but approachable expression, shallow depth
of field, magazine quality, natural skin tones, --ar 4:5"

What to wear: Black, camel, or cream — nothing with logos or patterns
Prop: Laptop open (screen facing away), coffee mug optional
Light: Natural window light only. Face the window.
Platform: LinkedIn header, website About page

[ Generate in Maya → ] ← one click, opens Maya SELFIE tab with prompt pre-filled

──────────────────────────────────────────

PROMPT 02 — "Working Mum"
Best for: Instagram carousel cover, Stories, relatable posts
Setting: Kitchen table or home desk
...

PROMPT 03 — "The Expert"
...
```

All 30 prompts rendered, grouped by category, each with a "Generate in Maya →" button.

**Screen 3 — After generation**

When she hits "Generate in Maya →":
- Maya opens in SELFIE mode
- The prompt is pre-loaded in the input
- Her vibe preferences are passed as style context

After she generates, a prompt: "Add this to your Show Up calendar as a content photo?"
If yes, it appears in the Feed Planner for the relevant week.

### The WOW moment
She picks her vibe, her setting, her needs. She gets 30 prompts written for HER home,
HER style, HER brand — not a generic "woman at laptop" prompt pack.
One click and she's generating in Maya. The photo session starts in 4 minutes.

---

## TECHNICAL ARCHITECTURE — HOW TO BUILD THIS

### What changes

**Each product is now a Next.js route inside the app:**

```
/studio?tab=academy → Academy tab (existing)
/academy/products/[id] → Sales page (existing, correct)
/academy/products/[id]/generate → NEW: The AI-powered experience
```

The `/generate` route is where the magic happens for users who own the product.

### The generation flow (same pattern for all 4 products)

```
1. User submits the form
   POST /api/academy/products/[id]/generate
   Body: { answers: { q1: "...", q2: "...", ... } }

2. Server builds a structured prompt from answers
   Template: system prompt (product-specific) + user answers

3. Stream the AI response back to the client
   Uses existing streaming pattern (same as Maya)
   Model: claude-sonnet (for quality + speed)

4. Client renders the output progressively
   Each section appears as it streams
   "Copy" buttons appear after each section is complete

5. Save outputs to user profile
   POST /api/user/brand-context (new endpoint)
   Stores structured data from each product

6. Update Maya's context
   On next Maya load, system prompt includes brand_context
```

### New database tables needed

```sql
-- Store each product's generated outputs
CREATE TABLE academy_product_outputs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id TEXT, -- 'what_to_say' | 'show_up' | 'get_paid' | 'ai_photo_prompts'
  answers JSONB, -- the form answers
  outputs JSONB, -- the AI-generated outputs
  chosen_variant TEXT, -- which angle/variant they selected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick-access brand context for Maya
CREATE TABLE user_brand_context (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  instagram_bio TEXT,
  linkedin_headline TEXT,
  elevator_pitch TEXT,
  tone TEXT,
  content_pillars TEXT[],
  revenue_goal TEXT,
  photo_vibe TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Maya integration (the multiplier)

In `use-maya-chat.ts`, pull brand context and inject into system prompt:

```ts
// Existing: product context passed through
// NEW: also pull brand_context from user profile

const brandContext = await getUserBrandContext(userId)

const systemPrompt = buildMayaSystemPrompt({
  mode,
  product,
  brandContext: {
    elevatorPitch: brandContext?.elevator_pitch,
    contentPillars: brandContext?.content_pillars,
    photoVibe: brandContext?.photo_vibe,
    tone: brandContext?.tone,
  }
})
```

This makes Maya smarter the more products a user completes. No extra work from the user.

### Photo prompts → Maya deep link

In the AI Photo Prompts product, each prompt card has:

```tsx
<a href={`/studio?tab=maya&mode=selfie&prompt=${encodeURIComponent(prompt)}`}>
  Generate in Maya →
</a>
```

Maya receives the prompt via URL param and pre-fills it.

### Show Up → Feed Planner sync

In the Show Up product, after generation:

```tsx
<button onClick={() => syncToFeedPlanner(generatedPosts)}>
  Sync to Feed Planner →
</button>
```

Calls existing Feed Planner API to create post drafts for each day.

---

## WHAT STAYS THE SAME

- `/academy/products/[id]` sales pages (already good — keep them)
- `/public/academy/[id]/index.html` workbooks (keep as bonus download — "want the printable version?")
- `MiniProductCard` for unowned products
- `ProductAccessCard` routing fix (already specced in `codex-fix-product-access-routing.md`)
- Stripe purchase flow

---

## WHAT GETS BUILT (CODEX SPEC SUMMARY)

### Priority order

**P0 (ship first — highest impact, clearest spec):**
1. `What To Say` AI generator — 6-question form → 3 brand message angles
2. `AI Photo Prompts` AI generator — 5-question form → 30 personalised prompts + Maya deep link

**P1 (after P0 validated):**
3. `Show Up` AI generator — 8-question form → 30-day calendar → Feed Planner sync
4. User brand context API + Maya injection

**P2 (after P1 validated):**
5. `Get Paid` AI generator — 7-question form → 90-day roadmap + copy templates
6. Monthly check-in flow for Get Paid

### Routes to create
```
/academy/products/what_to_say/generate   (new)
/academy/products/show_up/generate       (new)
/academy/products/get_paid/generate      (new)
/academy/products/ai_photo_prompts/generate (new)
/api/academy/products/[id]/generate      (new — streaming)
/api/user/brand-context                  (new — CRUD)
```

### Access gate (same pattern as training)
- User must own the product OR have Studio membership to access `/generate`
- Non-owners: redirect to `/academy/products/[id]` (purchase page)

---

## WHY THIS WINS

Current products: "Here's a framework. Good luck."
New products: "Here are YOUR bio, YOUR captions, YOUR plan, YOUR prompts. Use them today."

The workbook version could be replaced by a Google Doc. This version cannot be replaced
by anything that doesn't know her story, her brand, her vibe.

And because every output feeds Maya — the more she uses, the more personalised
every single generation becomes. That's the compounding moat.

---
*Document prepared: 2026-02-28 | Owner: Sandra | Implementation: Codex via north-code*
