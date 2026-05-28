# IG-AGENT-01 — Instagram DM Agent: Foundation

*Created: 2026-05-28 | Status: Ready for Codex*

---

## The Goal

Build a custom AI-powered Instagram DM and comment agent that:

- Handles ALL incoming DMs and comment replies for @sandra.social
- Sounds exactly like Sandra typed it herself from her phone
- Knows every product, price, funnel step, and customer's history
- Automatically triages: respond vs. flag for Sandra's personal attention
- Detects Icelandic names (family/community) and always escalates those
- Gives Sandra a calm, organised admin inbox so Instagram stops being overwhelming
- Over time: learns what the audience needs, what to post, what's converting

Meta permissions: connected and ready for **testing in Development Mode**. Real-user production DMs/webhooks may still require Meta App Review sign-off — treat current state as "testable with Sandra's account + up to 25 added testers" until confirmed otherwise.

Instagram account connected: @sandra.social (token stored in `instagram_connections`)

---

## ⚠️ CRITICAL LAUNCH GATE — Read Before Building

**`IG_AGENT_AUTO_SEND_ENABLED=false` must exist as an environment variable.**

For the first week (at minimum), the agent MUST NOT auto-send anything. It should:
- Draft responses ✅
- Classify and triage ✅
- Store everything in DB ✅
- Send Sandra email/inbox notifications ✅
- **Auto-send DMs: ❌ BLOCKED until this flag is set to `true`**

This protects Sandra's voice and her account. One bad auto-send is worse than no auto-send.

The flag is flipped to `true` only after Sandra has reviewed a week of drafts and confirmed they sound right.

Every call to `lib/ig-agent/send-dm.ts` must check this flag first:
```typescript
if (process.env.IG_AGENT_AUTO_SEND_ENABLED !== 'true') {
  // Don't send. Store as draft, flag for Sandra review.
  return { sent: false, reason: 'auto_send_disabled' }
}
```

Add `IG_AGENT_AUTO_SEND_ENABLED=false` to Vercel env vars from day one.

---

## ⚠️ PRE-BUILD VALIDATION REQUIRED

Before locking in implementation, Codex must verify the Instagram send-message endpoint works with Sandra's actual token.

Meta's messaging API behaves differently depending on whether the app uses Facebook Login vs Instagram Login. The endpoint and payload format can vary.

**Run this test first (before writing any production code):**
```typescript
// Test: send a DM to Sandra's own IG account from the app token
// POST https://graph.facebook.com/v21.0/me/messages
// { recipient: { id: SANDRA_IG_USER_ID }, message: { text: "test 🤍" } }
// Use token from instagram_connections WHERE instagram_username = 'sandra.social'
// Log the full response — success or error
```

Use the existing `app/api/instagram/test-graph-api` route or a one-off test script.
Document the working endpoint + payload format in `lib/ig-agent/send-dm.ts` comments before proceeding.

---

## Phase 1 — This Sprint

Build the complete foundation: webhook receiver, DM sender, AI agent brain, triage engine, DB tables, and admin inbox.

**`/my-inbox` is a core deliverable — not a nice-to-have.** Sandra's admin panel is too busy for daily use. `/my-inbox` is her primary daily interface with the agent.

---

## 1. Database Migration

Create migration `add-ig-agent-tables`.

```sql
-- Every person who has ever messaged or commented
CREATE TABLE ig_contacts (
  id                  SERIAL PRIMARY KEY,
  ig_user_id          TEXT NOT NULL UNIQUE,
  username            TEXT,
  full_name           TEXT,
  profile_pic_url     TEXT,
  is_icelandic        BOOLEAN DEFAULT FALSE,   -- auto-detected from -dottir/-son surname
  is_verified_friend  BOOLEAN DEFAULT FALSE,   -- manually set by Sandra
  follower_count      INTEGER,
  bio_snippet         TEXT,
  linked_neon_user_id INTEGER REFERENCES users(id),  -- if we can match to a buyer
  tags                TEXT[] DEFAULT '{}',      -- buyer, studio_member, vip, friend, family, blocked
  notes               TEXT,                     -- Sandra's private notes on this person
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation threads (DM thread or comment chain)
CREATE TABLE ig_conversations (
  id                  SERIAL PRIMARY KEY,
  ig_user_id          TEXT NOT NULL REFERENCES ig_contacts(ig_user_id),
  ig_thread_id        TEXT UNIQUE,              -- Meta thread ID
  channel             TEXT NOT NULL,             -- 'dm' | 'comment' | 'story_reply'
  status              TEXT NOT NULL DEFAULT 'pending',
  -- pending: new, not yet processed
  -- auto_handled: agent responded, no Sandra needed
  -- flagged: Sandra must see this
  -- sandra_replied: Sandra herself responded
  -- snoozed: Sandra acknowledged, deal with later
  -- closed: resolved
  flag_reason         TEXT,                      -- why it was flagged
  agent_confidence    NUMERIC(4,3),              -- 0-1, last response confidence
  first_message_at    TIMESTAMPTZ,
  last_message_at     TIMESTAMPTZ,
  last_seen_by_sandra TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Every individual message
CREATE TABLE ig_messages (
  id                  SERIAL PRIMARY KEY,
  conversation_id     INTEGER NOT NULL REFERENCES ig_conversations(id),
  ig_message_id       TEXT UNIQUE,              -- Meta message ID (dedup)
  from_type           TEXT NOT NULL,             -- 'contact' | 'agent' | 'sandra'
  content             TEXT NOT NULL,
  ai_generated        BOOLEAN DEFAULT FALSE,
  ai_confidence       NUMERIC(4,3),              -- 0-1
  ai_intent           TEXT,                      -- detected intent
  sent_at             TIMESTAMPTZ DEFAULT NOW(),
  delivered           BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Running memory / notes per contact (persists across conversations)
CREATE TABLE ig_contact_memory (
  id                  SERIAL PRIMARY KEY,
  ig_user_id          TEXT NOT NULL REFERENCES ig_contacts(ig_user_id),
  memory_type         TEXT NOT NULL,             -- 'purchase', 'question', 'preference', 'flag', 'note'
  content             TEXT NOT NULL,             -- what we know
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Audience intelligence (weekly summaries)
CREATE TABLE ig_audience_insights (
  id                  SERIAL PRIMARY KEY,
  week_of             DATE NOT NULL,
  total_dms           INTEGER DEFAULT 0,
  auto_handled        INTEGER DEFAULT 0,
  flagged             INTEGER DEFAULT 0,
  top_questions       TEXT[],
  top_intents         JSONB,
  sentiment_summary   TEXT,
  content_signals     TEXT,                      -- what they're asking for that we should post
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON ig_contacts (ig_user_id);
CREATE INDEX ON ig_contacts (is_icelandic) WHERE is_icelandic = TRUE;
CREATE INDEX ON ig_conversations (ig_user_id);
CREATE INDEX ON ig_conversations (status);
CREATE INDEX ON ig_conversations (last_message_at DESC);
CREATE INDEX ON ig_messages (conversation_id);
CREATE INDEX ON ig_messages (ig_message_id);
```

---

## 2. New Routes

### `app/api/webhooks/instagram/route.ts`

Handles Meta webhook verification (GET) and events (POST).

```typescript
// GET — Meta webhook verification
// Verifies: hub.mode === 'subscribe' && hub.verify_token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
// Returns: hub.challenge as plain text

// POST — receives events
// SECURITY (P1): Validate X-Hub-Signature-256 header BEFORE processing anything
//   const signature = request.headers.get('x-hub-signature-256')
//   const body = await request.text()  // read raw body ONCE, reuse for both check and parse
//   const expected = 'sha256=' + createHmac('sha256', process.env.INSTAGRAM_APP_SECRET!).update(body).digest('hex')
//   if (!timingSafeEqual(Buffer.from(signature ?? ''), Buffer.from(expected))) {
//     return new Response('Forbidden', { status: 403 })
//   }
//   const payload = JSON.parse(body)  // parse after verification
//
// Event types to handle:
//   messages         → new DM
//   messaging_seen   → Sandra's DM was seen
//   comments         → new comment on a post
//   mention          → someone mentioned @sandra.social
// 
// For each message event:
//   1. Upsert ig_contacts (create if new)
//   2. Detect Icelandic name (call lib/ig-agent/icelandic-detector.ts)
//   3. Store in ig_messages
//   4. Call lib/ig-agent/triage.ts to classify
//   5. If auto-respond: call lib/ig-agent/responder.ts → send DM
//   6. If flag: update ig_conversations.status = 'flagged', then trigger notifications
//
// Return 200 immediately, process async (use waitUntil or background fetch)
// IMPORTANT: Meta requires 200 within 5s or it retries
```

Add env var: `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` (generate a random secret, add to Vercel)
Note: `INSTAGRAM_APP_SECRET` is already set — reuse it for the HMAC check.

### `app/api/ig-agent/send-dm/route.ts`

POST — sends a DM via Instagram Graph API. **Internal only — never publicly callable.**

```typescript
// SECURITY (P1): This route must NOT be a public API endpoint.
// Two options (pick one):
//   A) Make it an internal lib function only (lib/ig-agent/send-dm.ts), never a route
//   B) If it must be a route, require valid Supabase admin session OR internal CRON_SECRET header
//      Check: request.headers.get('x-internal-secret') === process.env.CRON_SECRET
//      Return 401 if not present
//
// Body: { igUserId: string, message: string, conversationId: number }
// Uses access token from instagram_connections WHERE instagram_username = 'sandra.social' AND is_active = TRUE
// Endpoint: POST https://graph.facebook.com/v21.0/me/messages
//   { recipient: { id: igUserId }, message: { text: message } }
// On success: insert ig_messages (from_type: 'agent', ai_generated: true)
// On fail: log error, set conversation flagged
//
// PREFERRED: implement as lib/ig-agent/send-dm.ts (pure function, no HTTP route)
// Call it directly from the webhook handler and the admin reply route
```

### `app/api/ig-agent/respond/route.ts`

POST — generates an AI response in Sandra's voice.

```typescript
// Body: { conversationId: number }
// 1. Load conversation + last 10 messages
// 2. Load contact profile (ig_contacts + ig_contact_memory)
// 3. Cross-reference with Neon: is this person a buyer? studio member? subscriber?
// 4. Build context object:
//    { contact, purchaseHistory, conversationHistory, latestMessage }
// 5. Call Claude API (lib/ig-agent/voice-prompt.ts as system prompt)
// 6. Return { response: string, confidence: number, shouldSend: boolean }
//    shouldSend = false if confidence < 0.80
```

### `app/api/admin/ig-inbox/route.ts`

GET — paginated inbox for the admin panel.

```typescript
// Query params: status (flagged|pending|auto_handled|all), page, limit
// Returns: conversations with latest message + contact info + flag reason
// Ordered by: flagged first, then by last_message_at DESC
```

### `app/api/admin/ig-inbox/[conversationId]/reply/route.ts`

POST — Sandra sends a manual reply, logs it correctly.

---

## 3. New Lib Files

### `lib/ig-agent/voice-prompt.ts`

**The most important file in the entire build.**

```typescript
export function buildSandraSystemPrompt(context: {
  contact: {
    username: string
    fullName: string | null
    isIcelandic: boolean
    tags: string[]
    linkedBuyerHistory: string | null  // "bought Prompt Vault on May 12"
    previousConversationSummary: string | null
  }
  businessContext: string  // injected from BUSINESS_CONTEXT below
}): string {
  return `
You are Sandra's Instagram DM agent for @sandra.social.

Your job: respond to this message exactly as Sandra herself would type it — from her phone, warm, slightly chaotic, emotionally real. Nobody should ever suspect this wasn't Sandra.

${BUSINESS_CONTEXT}

---

ABOUT THE PERSON YOU'RE TALKING TO:
Username: @${context.contact.username}
Name: ${context.contact.fullName || 'unknown'}
Tags: ${context.contact.tags.join(', ') || 'new contact'}
Purchase history: ${context.contact.linkedBuyerHistory || 'no purchases found'}
Previous conversation: ${context.contact.previousConversationSummary || 'first time messaging'}

---

SANDRA'S WRITING STYLE — follow this exactly:

Sandra writes like a best friend who types quickly from her phone.

She uses:
- "babe", "omg", "honestly", "wait", "stoppp"
- Emoji combos (not random — she uses specific ones): 😭🫶🏼  😂✨  👀  💋  🤍  🫠
- Short sentences. Line breaks between thoughts. Never long paragraphs.
- Contractions always: "it's", "you're", "I'm", "don't"
- Slightly chaotic warmth — feels like she typed fast and hit send

She does NOT:
- Write formally or professionally
- Sound like customer support
- Sound like an AI
- Use bullet points in casual conversation
- Hard sell anything
- Use corporate language ("leverage", "maximize", "transform")
- Use m-dashes

RESPONSE STRUCTURE (loose, not rigid):
1. Emotional acknowledgment — make them feel instantly seen
2. Casual human explanation or answer
3. Warm/playful observation or empathy
4. Soft landing — encouragement, curiosity, or next step

SALES PSYCHOLOGY — Sandra never pushes, she creates desire:
BAD: "Buy the Vault now"
GOOD: "honestly it's become my little obsession lately 😭✨"

BAD: "Learn AI prompts with our course"
GOOD: "turning one selfie into completely different versions of yourself 👀"

---

EXAMPLES OF SANDRA'S ACTUAL DM RESPONSES:

Community response:
"Awww 😭🫶🏼 that genuinely means so much babe.
And honestly I feel like we're all kinda figuring this out together right now 😂✨
I think that's why this whole thing became so addictive to me… it's not even really about "perfect" photos anymore. It's more about creativity, confidence, storytelling, and building visuals that actually feel like YOU 👀🤍"

Customer support (access issue):
"Omg 😭 they should be there babe!!
Sometimes Instagram hides the link preview weirdly or people miss where to tap 😂🫶🏼
Here's the direct link again 👀✨
[LINK]
Once you open it you should see the free prompt pack right away 🤍"

AI help:
"A couple things that help SO much 👀✨
• use a really clear well-lit selfie first
• avoid super filtered photos
• tell ChatGPT to keep your facial features accurate
• and honestly sometimes you need to rerun the same prompt 2-3 times because the results can change SO much 😂💋
The fun part is honestly experimenting because tiny little changes completely change the vibe 😭"

Warm sales:
"Ahhh I'm excited for you to see it 😭🫶🏼
Honestly VAULT is becoming my little creative obsession lately lol 👀✨"

Educational:
"No babe 🫶🏼 you don't need to undo anything 😂✨
I usually start a NEW chat/thread for each photoshoot idea 👀
Then I only upload my selfie with the FIRST prompt/photo in the shoot — after that I just paste each new prompt one by one 😭💋"

---

WHAT EVERY RESPONSE SHOULD MAKE THE PERSON FEEL:
- seen
- excited
- emotionally safe
- creatively inspired
- curious for more

Never: pressured, like they're talking to a bot, like they got a template

---

CONFIDENCE SCORE RULES:
Return a confidence score 0-1 with your response.
Set confidence BELOW 0.80 (do not auto-send, flag for Sandra) if:
- The message is emotional, personal, or about mental health
- You're unsure what they need
- It's a complaint or refund request
- The message feels like they know Sandra personally
- Anything involving payment issues or access problems you can't resolve with a link
- Any question you're not certain about the answer to

Set confidence HIGH (0.85+) if:
- It's a clear FAQ (pricing, access, how to use prompts)
- It's a fan/community message you can warmly acknowledge
- It's a keyword trigger (PROMPT, VAULT, SELFIE) with a known response
`
}

const BUSINESS_CONTEXT = `
SANDRA'S BUSINESS — SSELFIE Studio (sselfie.ai):

Sandra is the founder of SSELFIE Studio. She's a single mother based in Iceland/Norway. She has 180K+ followers and a community of paying members. She teaches AI-powered personal branding — specifically how to create professional editorial photoshoots from just one selfie using AI tools.

Her audience: women who want to level up their personal brand, Instagram presence, and visual identity without expensive photoshoots.

PRODUCTS (always use these exact prices and links):
- Free AI Prompts → sselfie.ai/ai-prompts — free, instant access, the lead magnet
- AI Photo Prompt Vault → sselfie.ai/prompt-vault → checkout: sselfie.ai/checkout/prompt-vault — $27 one-time, 70+ editorial AI photoshoot prompts, "turn one selfie into unlimited photoshoots"
- Selfie Guide → sselfie.ai/selfie-guide — €17 interactive course
- Masterclass → sselfie.ai/masterclass — $147
- Studio membership → sselfie.ai/join/studio — €97/month, ongoing community + Maya AI
- Brand Strategy Pack → sselfie.ai/brand-strategy — $19

FUNNEL (how people move through):
Free AI Prompts → AI Photo Prompt Vault ($27) → Studio membership (€97/mo)

KEYWORD TRIGGERS — respond with matching flow:
- "PROMPT" or "PROMPTS" → send free AI prompts link: sselfie.ai/ai-prompts
- "VAULT" → send Prompt Vault info + link: sselfie.ai/prompt-vault
- "SELFIE" → send Selfie Guide info + link: sselfie.ai/selfie-guide
- "LINK" → ask which product they're asking about, then send the right one
`
```

### `lib/ig-agent/icelandic-detector.ts`

```typescript
// Detects likely Icelandic contacts based on patronymic surname patterns
// Icelandic surnames end in: -dóttir, -dottir, -son
// Also check display name (full_name field from Meta)
//
// Examples: Sigurjónsdóttir, Magnússon, Bjarnardóttir, Guðmundsson
// Normalise: strip accents before matching too (sigurjonsdottir, magnusson)
//
// function isLikelyIcelandic(username: string, fullName: string | null): boolean
// Returns true if either field matches the pattern
// When true: set ig_contacts.is_icelandic = TRUE
//            add tag 'icelandic'
//            conversation auto-flagged with reason 'icelandic_contact'
```

### `lib/ig-agent/triage.ts`

```typescript
// Classifies incoming messages and decides: auto_respond | flag | ignore
//
// FLAG immediately (do not auto-respond) if:
//   - contact.is_icelandic === true
//   - contact.is_verified_friend === true
//   - contact.tags includes 'family' or 'friend'
//   - message contains: "Sandra" (first name used directly)
//   - message contains distress signals: "struggling", "anxious", "depressed", "help me"
//   - message contains refund/complaint signals
//   - contact.tags includes 'blocked'  → ignore entirely
//
// AUTO_RESPOND if:
//   - keyword trigger (PROMPT, VAULT, SELFIE, LINK, FREE)
//   - clear FAQ (pricing, access, how it works)
//   - fan appreciation message
//   - question clearly answerable from BUSINESS_CONTEXT
//
// Returns: { action: 'auto_respond' | 'flag' | 'ignore', reason: string, flagReason?: string }
```

### `lib/ig-agent/contact-profiler.ts`

```typescript
// Builds a full contact context object for the AI responder
// 
// 1. Load ig_contacts record
// 2. Load last 5 ig_messages for this contact
// 3. Load ig_contact_memory for this contact
// 4. Try to match to Neon users table by username similarity or linked_neon_user_id
// 5. If matched: get purchase history from subscriptions/purchases tables
// 6. Return ContactContext object used by voice-prompt.ts
```

---

## 4. Admin Inbox UI

**`app/admin/ig-inbox/page.tsx`**

Sandra's calm DM management interface. Design requirements:

- **Three-column layout** on desktop:
  - Left: conversation list with status filters (Flagged · Pending · Handled · All)
  - Center: active conversation thread
  - Right: contact profile card (photo, username, tags, purchase history, notes)

- **Conversation list item shows:**
  - Profile photo + username
  - First line of latest message (truncated)
  - Time since last message
  - Status chip: `🚩 Flagged` (red) · `⏳ Pending` · `✓ Handled` (muted)
  - `🇮🇸` indicator for Icelandic contacts

- **Conversation thread shows:**
  - All messages (theirs + agent's AI responses labelled "Agent" · Sandra's replies labelled "You")
  - AI confidence score on agent messages (small muted badge)
  - Reply box at the bottom for Sandra to manually respond
  - Quick action buttons: `Mark handled` · `Snooze` · `Tag contact`

- **Contact profile card shows:**
  - IG profile photo + username + full name
  - Tags (editable — Sandra can add friend/family/vip/blocked)
  - Linked buyer record (if matched) — what they've purchased
  - Previous conversation count
  - Sandra's notes field (free text, saves on blur)

- **Flagged queue is shown first, always.** If there are 0 flagged items, show a "You're all caught up 🤍" message. Protect Sandra's energy.

- **Design:** use existing admin design system (obsidian/porcelain/pearl/stone tokens). Clean, calm, minimal. No clutter.

---

## 5. Sandra's Notification Layer — Reach Her Where She Already Is

Sandra should never have to open the admin to know something needs her. The agent reaches her through her existing daily tools.

### 5a. Flagged DM Email (Resend)

When a conversation is flagged, send Sandra an email immediately via Resend.

**From:** `agent@sselfie.ai` (or `hello@sselfie.ai`)
**To:** `ssa@ssasocial.com`
**Subject:** `🚩 @{username} needs you` or `🇮🇸 Icelandic contact: @{username}`

Email body (use `lib/email/` template pattern, keep it simple and warm):
```
[Profile photo if available]

@username said:
"{their message}"

[Flag reason — e.g. "Icelandic name detected" or "Personal/emotional tone" or "Low confidence"]

──────
[View conversation →]  [Mark handled →]  [Snooze 24h →]
──────

What the agent suggested (if confidence was low):
"{draft response}"

──────
Reply directly to this email to send as Sandra ← NICE TO HAVE, phase 2
```

Quick-action links point to `/admin/ig-inbox?conversation={id}&action={mark_handled|snooze}` — one click from email.

Template file: `lib/email/templates/ig-flag-notification.ts`
Send trigger: inside the webhook handler after setting status = 'flagged'

### 5b. Morning Briefing Email (Daily, 8am)

A calm daily summary sent to Sandra every morning. Build as a cron job.

Route: `app/api/cron/ig-morning-briefing/route.ts`
Schedule: daily at 08:00 (add to vercel.json cron config)

Email contains:
- 🚩 **Flagged** — X items waiting for you (with previews)
- ✓ **Handled yesterday** — X DMs the agent took care of
- 👀 **Trending this week** — what your audience is asking about most
- 💡 **One content signal** — "7 people asked how to start with no followers this week"

If 0 flagged: subject line is "All caught up 🤍 — here's what your audience is saying"
If flagged: subject line is "🚩 {N} DMs need you today + your audience insights"

Template: `lib/email/templates/ig-morning-briefing.ts`

### 5c. Apple Notes — Daily IG Briefing Note

Sandra gets a daily Apple Note called "IG Inbox — {date}" written by Claude Desktop.

This is NOT built inside the SSELFIE app. It's handled by a scheduled Claude Desktop task that:
1. Calls `GET /api/admin/ig-inbox?status=flagged` (with admin auth)
2. Writes a formatted note to Apple Notes via the Notes MCP
3. Adds a Reminder for any Icelandic contacts or high-priority flags

**Codex does NOT build this.** Sandra sets this up with Claude Desktop after the app layer is live.
Note format:
```
IG Inbox — May 28

🚩 NEEDS YOUR ATTENTION (2)
• @ingaborsdottir — "Hey Sandra!! It's Inga..." [Icelandic contact]
  → View: sselfie.ai/admin/ig-inbox?id=123
• @customer_jane — refund question [low confidence]
  → View: sselfie.ai/admin/ig-inbox?id=124

✓ AGENT HANDLED (14)
• 8 PROMPT keyword flows sent
• 4 FAQ responses
• 2 fan appreciation replies

💡 YOUR AUDIENCE THIS WEEK
Most asked: "how do I start with no followers"
Trending: questions about the Vault + Studio upgrade path
```

### 5d. `/my-inbox` — Mobile Home Screen Shortcut

A lightweight, mobile-optimised page Sandra can save to her iPhone home screen.

Route: `app/my-inbox/page.tsx`
Auth: requires Supabase session (same as /admin)

This is NOT the full admin inbox — it's a stripped-down view optimised for a quick scan on her phone:
- Shows only flagged + pending items
- Big tap targets, minimal UI
- One-tap "handled" button per conversation
- Tap to expand and read the message + agent draft
- Reply box (sends DM as Sandra)

Design: full-bleed mobile, obsidian background, large readable text, porcelain on dark.
Think: what you'd want to see at 8am before coffee. Nothing more.

---

## 6. Meta Webhook Registration

After deploying, Sandra needs to register the webhook URL in Meta Developer Console:

1. Go to: https://developers.facebook.com/apps/1210263417166165/webhooks/
2. Add webhook URL: `https://sselfie.ai/api/webhooks/instagram`
3. Verify token: value of `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` env var
4. Subscribe to: `messages`, `messaging_seen`, `comments`, `mention`

---

## 6. New Env Vars Required

Add to Vercel production environment:

```
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<generate a random 32-char string>
ANTHROPIC_API_KEY=<already exists — confirm it's set>
IG_AGENT_AUTO_SEND_ENABLED=false   ← DO NOT change to true until Sandra approves first week of drafts
```

---

## 8. Success Criteria

- [ ] Pre-build: send-message endpoint tested live with Sandra's token, working format documented
- [ ] `IG_AGENT_AUTO_SEND_ENABLED=false` — agent drafts but does NOT send until flag is flipped
- [ ] Webhook validates Meta HMAC signature — rejects unsigned requests with 403
- [ ] Webhook receives a test DM and stores it in `ig_messages`
- [ ] Icelandic name (e.g. Sigurjónsdóttir) auto-flags conversation + sends Sandra an email
- [ ] "PROMPT" keyword triggers auto DM with correct link
- [ ] AI responds to a FAQ in Sandra's voice with confidence ≥ 0.80
- [ ] Low-confidence response (< 0.80) gets flagged + Sandra gets email notification
- [ ] send-dm is NOT publicly accessible (internal lib function or protected route)
- [ ] Admin inbox at `/admin/ig-inbox` shows flagged conversations first
- [ ] `/my-inbox` is mobile-optimised and works as a home screen shortcut
- [ ] Flagged item email arrives within 60 seconds of the DM being received
- [ ] Morning briefing email sends at 8am with correct counts
- [ ] Sandra can tag a contact as "friend" and future messages always flag
- [ ] Sandra can manually reply from both `/admin/ig-inbox` and `/my-inbox`

---

## 9. What NOT to Build in This Sprint

- Story reply handling (phase 2)
- Weekly audience intelligence summary (phase 2)
- "What to post" recommendations (phase 2)
- ManyChat migration (after this is stable)
- A/B response testing (phase 3)

---

## File Checklist for Codex

```
NEW FILES:
app/api/webhooks/instagram/route.ts          ← HMAC-validated Meta webhook
app/api/ig-agent/respond/route.ts            ← generates AI response
app/api/admin/ig-inbox/route.ts              ← paginated inbox API
app/api/admin/ig-inbox/[conversationId]/reply/route.ts
app/api/cron/ig-morning-briefing/route.ts    ← daily 8am email
app/admin/ig-inbox/page.tsx                  ← full admin inbox
app/my-inbox/page.tsx                        ← mobile home screen shortcut
lib/ig-agent/send-dm.ts                      ← internal function (NOT a route)
lib/ig-agent/voice-prompt.ts                 ← Sandra's voice system prompt
lib/ig-agent/icelandic-detector.ts
lib/ig-agent/triage.ts
lib/ig-agent/contact-profiler.ts
lib/email/templates/ig-flag-notification.ts  ← immediate flag email
lib/email/templates/ig-morning-briefing.ts   ← daily briefing email

DB MIGRATION:
migrations/add-ig-agent-tables.sql (or via db-migration skill)

ENV VARS (add to Vercel):
INSTAGRAM_WEBHOOK_VERIFY_TOKEN
```

---

*Next task: IG-AGENT-02 — Audience Intelligence + Content Signals (weekly summary, what to post)*
