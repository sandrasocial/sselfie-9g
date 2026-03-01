# CODEX PROMPT 2 — AI-Powered Mini Products (P0)
# SEND THIS AFTER PROMPT 1 IS MERGED
# Full vision: docs/MINI-PRODUCTS-AI-VISION.md

---

Hey Codex — this is the biggest product change we've made. Read the full vision doc before starting:

`docs/MINI-PRODUCTS-AI-VISION.md`

That document has the complete UX flows, question sets, example AI outputs, DB schema, and architecture for all 4 products. Start with P0 only (two products).

---

## WHAT YOU'RE BUILDING

The 4 academy mini-products are currently static HTML workbooks. We're replacing them with AI-powered generators. The user answers questions → AI produces their actual output (bio, captions, prompts, plan) → saves to their profile → feeds Maya context.

**P0 = What To Say + AI Photo Prompts. Build both in this sprint.**

---

## P0A: "WHAT TO SAY" GENERATOR

### New route: `/academy/products/what_to_say/generate`

Access gate: user must own `what_to_say` OR have Studio membership.
Non-owners: redirect to `/academy/products/what_to_say`.

### The form (Screen 1)

6 questions. Render as a clean single-page form (not a stepper — all visible, scroll through):

```
Q1: What do you do? (one sentence)
    [text input, maxLength: 120]

Q2: Who is she? Your specific person.
    The real woman. Her age, situation, what keeps her up at night.
    [textarea, rows: 3, placeholder: "e.g. She's 38, recently divorced, two kids, €800 in savings..."]

Q3: What changes for her after working with you / using your product?
    Before → After. Be specific.
    [textarea, rows: 3]

Q4: What's your founder story — the experience that makes you the right person to help her?
    [textarea, rows: 3]

Q5: What do you believe that most people in your industry get wrong?
    Your honest opinion.
    [textarea, rows: 3]

Q6: Pick your tone:
    [ Warm & Personal ]  [ Bold & Direct ]  [ Expert & Calm ]  [ Raw & Real ]
    (radio — one selection, visual card style)
```

Submit button: "Generate my brand message →"
On submit: POST to `/api/academy/products/what_to_say/generate`

### The API: `/api/academy/products/what_to_say/generate`

- Auth: require session + product ownership
- Method: POST, streaming response
- Model: claude-sonnet (latest available)
- Stream back 3 brand message "angles", each containing:
  - angle name + 1-line description
  - Instagram bio (150 chars max)
  - LinkedIn headline
  - 30-second intro script
  - One-line elevator pitch
  - Each field individually copyable

### System prompt template for the API:

```
You are a personal brand strategist for women entrepreneurs.
The user has answered 6 questions. Generate 3 distinct brand message angles.

Each angle must include:
1. Angle name (e.g. "The Rebuilder", "The Strategist", "The Revolutionary")
2. One-sentence angle description
3. Instagram bio (max 150 chars, including line breaks allowed)
4. LinkedIn headline (max 220 chars)
5. 30-second verbal intro (for calls, reels, DMs — natural spoken language, first-person)
6. One-line elevator pitch (the shortest possible version of what they do)

Rules:
- Write IN the user's chosen tone
- Use the founder story authentically — not as a brag, as a reason WHY
- Make the Instagram bio emotionally compelling AND clear about what they offer
- Each angle should feel genuinely different (different emphasis, not just rewording)
- Never use corporate language. Write like a smart friend who gets it.
- The elevator pitch must be ONE sentence. No exceptions.

User answers:
Q1 (what they do): {q1}
Q2 (who they serve): {q2}
Q3 (transformation): {q3}
Q4 (founder story): {q4}
Q5 (contrarian POV): {q5}
Q6 (tone): {q6}
```

### Output rendering (Screen 2)

Stream each angle progressively. When an angle is complete:
- Show angle name as a label
- Show each field in its own box with a [Copy] button
- Show [ Use this angle → ] and [ See next angle ] navigation
- When all 3 are loaded, show all 3 as tabs or swipeable cards

### Save on angle selection

When user clicks "Use this angle →":
1. Save to `academy_product_outputs` table (see DB schema below)
2. Update `user_brand_context` table with chosen bio, headline, elevator_pitch, tone
3. Show Screen 3: "Saved. What's next?" with two CTAs:
   - [ Open 30-day content calendar → ] (links to Show Up product or generate page if owned)
   - [ Generate your first brand photo → ] (links to `/studio?tab=maya&mode=selfie`)

---

## P0B: "AI PHOTO PROMPTS" GENERATOR

### New route: `/academy/products/ai_photo_prompts/generate`

Access gate: user must own `ai_photo_prompts` OR have Studio membership.
Non-owners: redirect to `/academy/products/ai_photo_prompts`.

### The form (Screen 1)

5 questions:

```
Q1: Pick your visual vibe (select 2-3 that feel like YOUR brand):
    Visual card grid — 8 options with mood labels:
    [ Minimal & Editorial ]  [ Warm & Lifestyle ]  [ Bold & Fashion ]
    [ Dark & Moody ]         [ Bright & Natural ]   [ Professional & Clean ]
    [ Cosy & Intimate ]      [ Outdoor & Fresh ]
    (multi-select, 2-3 max)

Q2: Where do you usually take photos? (select all that apply)
    [ My home office ]  [ Kitchen / living room ]
    [ Outdoors / nature ]  [ Café or co-working space ]
    [ Studio or rented space ]

Q3: What do you need photos FOR? (select up to 4)
    [ Instagram grid — lifestyle posts ]
    [ Professional headshot (LinkedIn, website) ]
    [ Content creation / behind-the-scenes ]
    [ Speaking / teaching / authority positioning ]
    [ Promoting an offer or product ]
    [ Seasonal or campaign content ]

Q4: What colours are in your brand or wardrobe?
    [ Neutrals (black, white, beige, grey) ]
    [ Warm tones (rust, terracotta, gold, brown) ]
    [ Cool tones (navy, sage, slate, dusty pink) ]
    [ Bold or mixed ]

Q5: What's your name? (for personalised prompt headers)
    [text input]
```

Submit: "Generate my photo prompts →"

### The API: `/api/academy/products/ai_photo_prompts/generate`

- Auth: require session + product ownership
- Method: POST, streaming response
- Model: claude-sonnet
- Generate 30 prompts, grouped into 5 categories based on Q3 selections
- Each prompt includes:
  - Prompt name + "best for" label
  - Setting description
  - Full Maya prompt (ready to paste or click)
  - What to wear
  - Prop suggestion
  - Lighting instruction
  - Which platform to use it on

### System prompt template:

```
You are a personal brand photography director for women entrepreneurs.
Generate 30 personalised photo prompts based on the user's vibe, settings, needs, and colours.

Group the prompts into categories matching their selected needs (Q3).
Each prompt must be immediately actionable — specific enough that someone can set it up in their home today.

For each prompt include:
1. Prompt name (evocative, e.g. "The Founder", "Working Mum", "The Expert")
2. Best for: [specific use case — one line]
3. Setting description: [specific room/location setup]
4. Full Maya generation prompt: [photorealistic description for AI image generation, including style, lighting, pose, wardrobe, background, aspect ratio]
5. What to wear: [specific, actionable — colours, items, what to avoid]
6. Prop: [one specific prop or "none needed"]
7. Light: [natural window / ring light / outdoor — specific instructions]
8. Platform: [where this photo works best]

Rules:
- Prompts must reflect the user's ACTUAL settings (Q2) — don't suggest a studio if they don't have one
- Match the visual vibe they selected (Q1) — editorial prompts for minimal vibe, warm prompts for lifestyle, etc.
- Maya prompts should be detailed enough to generate great results — include style keywords, lighting direction, subject positioning, depth of field cues
- Include --ar 4:5 for Instagram, --ar 1:1 for grid, --ar 16:9 for LinkedIn/YouTube

User context:
Name: {name}
Visual vibe: {q1}
Available settings: {q2}
Photo needs: {q3}
Brand colours: {q4}

If they have completed "What To Say", inject their photo_vibe from brand context.
```

### Output rendering (Screen 2)

30 prompts grouped by category. For each prompt card:
- Prompt name as header
- "Best for" as small label
- Expandable: setting, wear, prop, light notes
- Full Maya prompt in a code-style box with [Copy] button
- [ Generate in Maya → ] button — links to:
  `/studio?tab=maya&mode=selfie&prompt=${encodeURIComponent(fullMayaPrompt)}`

### Save on completion

Save all 30 prompts + user answers to `academy_product_outputs`.
Save `photo_vibe` (derived from Q1 answer) to `user_brand_context`.

Show: "Your prompts are saved. Open Maya and start shooting →"
CTA links to `/studio?tab=maya&mode=selfie`

---

## DATABASE TABLES (create both in a single migration)

```sql
-- Generated outputs from each product
CREATE TABLE IF NOT EXISTS academy_product_outputs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- 'what_to_say' | 'show_up' | 'get_paid' | 'ai_photo_prompts'
  answers JSONB NOT NULL,   -- form answers
  outputs JSONB NOT NULL,   -- AI-generated outputs
  chosen_variant TEXT,      -- which angle/variant they selected (nullable)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON academy_product_outputs (user_id, product_id);

-- Quick-access brand context for Maya
CREATE TABLE IF NOT EXISTS user_brand_context (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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

---

## MAYA INTEGRATION

After P0 is shipped, update `use-maya-chat.ts` (or wherever Maya's system prompt is built) to pull and inject brand context:

```ts
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

Add a `GET /api/user/brand-context` endpoint and a `getUserBrandContext(userId)` server utility.

---

## ACCESS GATE PATTERN

Both `/generate` routes need the same access check pattern used in training routes:

```ts
const hasAccess = await checkProductAccess(userId, productId)
// checkProductAccess: owns product via purchase OR has Studio membership

if (!hasAccess) {
  redirect(`/academy/products/${productId}`)
}
```

Use the existing access-checking pattern from the training access work (UX-05).

---

## WHAT NOT TO CHANGE

- `/public/academy/[id]/index.html` workbooks — keep them, link to them as "Download printable version" from the generate completion screen
- `/academy/products/[id]/page.tsx` — keep the sales pages exactly as they are
- `MiniProductCard` — untouched
- Stripe purchase flow — untouched

---

## VALIDATION

```bash
pnpm vitest run tests/academy-journey.test.ts
pnpm build
```

Manual smoke pass:
1. Log in as user with `what_to_say` purchase → go to Academy tab → click "Open workbook" → should land on `/academy/products/what_to_say` → click "Open What To Say →" → should redirect to `/academy/products/what_to_say/generate` → fill form → generate → see 3 angles → copy bio → select angle → see save confirmation
2. Same for `ai_photo_prompts` → generate → see 30 prompts → click "Generate in Maya →" → Maya opens in selfie mode with prompt pre-filled

---

*Full vision with UX examples: docs/MINI-PRODUCTS-AI-VISION.md*
*Priority: P0 only. P1 (Show Up + brand context API) and P2 (Get Paid) come after P0 is live and tested.*
