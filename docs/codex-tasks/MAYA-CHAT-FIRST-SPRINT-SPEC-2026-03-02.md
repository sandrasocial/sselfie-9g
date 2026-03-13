# MAYA CHAT-FIRST ARCHITECTURE — FULL SPRINT SPEC
**Created:** 2026-03-02 by Claude (Cowork)  
**Status:** AWAITING SANDRA APPROVAL → then North executes  
**Branch:** `sprint/chat-first-maya` (DO NOT touch `main`)  
**Prerequisite:** North agents complete R1/R2/R3 research before sprint starts  

---

## THE VISION (Sandra's words, locked)

> "Instead of the users go in and have to navigate everything on their own, we had everything in the chat. User signs up and the first thing they do is go through onboarding and name their agent. Maya does everything from the chat. If users want to generate images maya pulls up options, if they want videos maya does that, if they want landing pages maya generates and loads inside the chat and sends them the link or shows a snapshot preview. If they want a strategy maya creates the HTML strategy. Users can always ask maya to remember this. They can have maya create their content calendar as HTML. And if they want help creating their first digital product like a PDF or a workbook they can do that. Everything Maya produces lives in their dashboard."

**Core principle: Visibility = Financial Freedom. Everything through chat.**

---

## AUDIT FINDINGS — What Already Exists

### Chat Infrastructure
- **Main chat route:** `/api/maya/chat/route.ts` (1,432 lines) — Claude Sonnet 4.5, AI SDK streaming
- **Pro chat:** `/api/maya/pro/chat/route.ts` — NanoBanana Pro mode
- **Auto mode selection:** `lib/maya/auto-select-mode.ts` — routes to Classic/Pro/Feed-planner automatically
- **User context builder:** `lib/maya/get-user-context.ts` (540 lines) — rich personal brand, memory, agent notes
- **Agent context injection channel:** `maya_personal_memory.memory_data->>'agent_context_note'` — agents can push context INTO Maya's chat session already

### Generation Capabilities (ALL exist, just need chat-native calling)
| Capability | Route | Status |
|-----------|-------|--------|
| Classic image (Flux LoRA) | `/api/maya/generate-image` | ✅ Live |
| Pro image (NanoBanana) | `/api/maya/generate-studio-pro` | ✅ Live |
| Concept cards | `/api/maya/generate-concepts` | ✅ Live |
| Photoshoot 6-9 images | `/api/maya/create-photoshoot` | ✅ Live |
| Video (WAN-2.5) | `/api/maya/generate-video` | ✅ Live |
| Feed planner | `/api/maya/feed` + feed-chat | ✅ Live |
| Brand strategy | `/api/maya/brand-strategy` | ✅ Live |
| Content pillars | `/api/maya/content-pillars` | ✅ Live |
| Instagram tips | `/api/maya/instagram-tips` | ✅ Live |

### Trigger System (Current Architecture)
Maya emits text triggers in her response → UI detects → calls API → results in separate panels  
```
[GENERATE_CONCEPTS] street style urban feminine
[CREATE_FEED_STRATEGY:weekly]
[SHOW_IMAGE_UPLOAD_MODULE]
```
**Problem:** Results are disconnected from chat. Users have to context-switch between chat and panels.

### Current Mode Logic
```typescript
autoSelectMayaMode({
  hasReferenceImage: true  → "pro" (NanoBanana)
  hasTrainedLoraModel: true → "maya" (Classic Flux)  
  isContentPlanning: true   → "feed-planner"
  default                   → "pro"
})
```

### Existing DB Tables (relevant)
- `generated_images` — all generated images, user_id, photoshoot metadata
- `generated_videos` — all videos
- `maya_chats` / `maya_messages` — chat history
- `maya_personal_memory` — memory + agent_context_note
- `personal_brand_profiles` — completed wizard data
- `brand_assets` — uploaded reference images
- `maya_concepts` — concept card history
- `user_models` — Flux LoRA training data (trigger_word, replicate_version_id, lora_scale)
- `academy_courses`, `academy_lessons` — existing video courses
- `academy_monthly_drops` — EMPTY (needs content)

### Missing DB Tables (to create in sprint)
- `personal_pages` — HTML pages Maya generates for users
- `user_agent_profiles` — user's named agent (from Agent V1 spec, use as-is)
- `maya_produced_assets` — catalogue of everything Maya has made (pages, PDFs, calendars)

---

## THE ARCHITECTURAL CHANGE

### Current (Trigger Pattern)
```
User: "create my landing page"
Maya: "Creating your landing page! [CREATE_PAGE]"
     ↓ UI detects trigger
     → API call (separate flow)
     → Result opens in new tab/panel
     → User must navigate away from chat
```

### Target (Tool-Calling Pattern)
```
User: "create my landing page"
Maya: [calls create_html_page tool internally]
     ↓ Tool returns HTML + hosted URL
     → Chat displays: inline preview image + "Your page is live →"
     → Maya continues: "Want me to tweak anything? I can edit it directly."
     → Page lives in user's dashboard under /dashboard/pages
```

### How to Implement Without Breaking Existing App

**Option A (Recommended): Extend trigger system → structured tool responses**
- Keep text triggers for backward compat
- Add new structured tool-result message format in chat
- UI renders tool results inline based on `type` field
- No change to existing generation APIs (they're already great)
- Just adds a new layer between trigger → result

**Why this approach:**
- Existing users see no breaking changes
- Can ship incrementally (one tool at a time)
- Existing trigger detection stays as fallback
- Generation APIs are stable and tested

---

## SPRINT PLAN

### Branch strategy
```bash
git checkout -b sprint/chat-first-maya
# All sprint work here. Never touch main.
# PR back to main when Sandra approves full sprint.
```

### Week 1 — Chat-Native Tool Architecture

#### W1-A: Tool Registry + Structured Tool Responses (3 days)

**What we're building:**
A `MayaToolRegistry` — a typed map of tool names to their API routes and result renderers.

```typescript
// lib/maya/tool-registry.ts
export const MAYA_TOOLS = {
  generate_image: {
    route: '/api/maya/generate-image',
    trigger: '[GENERATE_IMAGE]',
    resultType: 'image_grid',
  },
  create_photoshoot: {
    route: '/api/maya/create-photoshoot', 
    trigger: '[CREATE_PHOTOSHOOT]',
    resultType: 'photoshoot_grid',
  },
  generate_video: {
    route: '/api/maya/generate-video',
    trigger: '[GENERATE_VIDEO]',
    resultType: 'video_player',
  },
  create_html_page: {
    route: '/api/maya/create-page',   // NEW
    trigger: '[CREATE_PAGE]',
    resultType: 'page_preview',
  },
  edit_html_page: {
    route: '/api/maya/edit-page',     // NEW
    trigger: '[EDIT_PAGE]',
    resultType: 'page_preview',
  },
  create_content_calendar: {
    route: '/api/maya/create-calendar', // NEW
    trigger: '[CREATE_CALENDAR]',
    resultType: 'calendar_preview',
  },
  create_pdf: {
    route: '/api/maya/create-pdf',    // NEW
    trigger: '[CREATE_PDF]',
    resultType: 'pdf_preview',
  },
  show_training_flow: {
    trigger: '[START_TRAINING]',
    resultType: 'training_module',    // Opens inline training panel
  },
  show_upload_selfies: {
    trigger: '[UPLOAD_SELFIES]',
    resultType: 'upload_module',      // Opens inline upload
  },
}
```

**New DB migration:**
```sql
-- personal_pages: HTML pages Maya generates
CREATE TABLE personal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                        -- e.g. "landing-page", "about-me"
  page_type TEXT NOT NULL DEFAULT 'landing', -- landing | strategy | calendar | custom
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',      -- draft | published
  page_jsonb JSONB,                          -- structured data for regeneration
  published_html TEXT,                        -- full HTML content
  preview_url TEXT,                           -- Vercel Blob hosted preview image
  live_url TEXT,                              -- /p/[username]/[slug]
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_agent_profiles: user's named agent
CREATE TABLE user_agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'Maya',   -- user can rename
  tone TEXT,                                  -- from onboarding
  focus_area TEXT,                            -- from onboarding
  context_jsonb JSONB,                        -- flexible memory
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- maya_produced_assets: catalogue of everything Maya made
CREATE TABLE maya_produced_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'page' | 'calendar' | 'pdf' | 'strategy' | 'workbook'
  title TEXT NOT NULL,
  url TEXT,                 -- live URL or download URL
  preview_image_url TEXT,
  source_chat_id TEXT,      -- which chat session created this
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New message part types for inline rendering:**
```typescript
// In chat message, tool results are new part types
type MayaToolResultPart = {
  type: 'tool-image-grid'
  images: { url: string; concept_title: string }[]
  generationId: string
} | {
  type: 'tool-page-preview'
  pageId: string
  previewImageUrl: string
  liveUrl: string
  title: string
  isEditable: true
} | {
  type: 'tool-video-player'
  videoUrl: string
  thumbnailUrl: string
  videoId: string
} | {
  type: 'tool-calendar-preview'
  calendarHtml: string   // inline rendered
  downloadUrl: string
} | {
  type: 'tool-pdf-preview'
  pdfUrl: string
  title: string
  pageCount: number
}
```

**Owner:** north-code  
**Done when:** Tool registry exists, message part types defined, migration runs clean.

---

#### W1-B: Chat-First Onboarding (Name Your Agent) (2 days)

**What we're building:**
New users see a chat-based onboarding instead of a wizard. Through conversation, Maya:
1. Welcomes them
2. Asks them to name their agent
3. Asks 3 quick brand questions (style, goal, audience)
4. Saves to `user_agent_profiles`
5. Drops them into their first generation

**Onboarding chat flow:**
```
Maya: "Hey gorgeous 👋 I'm Maya — your personal AI brand studio. 
       Before we dive in, what do you want to call me? 
       You can keep 'Maya' or give me your own name..."

User: "I'll call you Luna"

Maya: "Luna it is! 🌙 Now tell me — what's your vibe? 
       Are you more editorial luxury, casual authentic, or bold and bright?"

User: "Editorial luxury for sure"

Maya: "Yes! I love that for you. And what do you want your brand to do for you — 
       more clients, bigger audience, or just looking stunning online?"

User: "All of the above honestly"

Maya: "Perfect answer 😍 One last thing — who are you talking to? 
       Like who needs to see your content and think 'I need to work with her'?"

User: "Women who want to go from invisible to booked"

Maya: "I SEE IT. Starting your custom brand library now... 
       [SHOW_TRAINING_FLOW]"
```

**Implementation:**
- New env flag: `FEATURE_CHAT_ONBOARDING=true`
- `user_agent_profiles.onboarding_completed` gates the flow
- First chat session for new users uses `ONBOARDING_SYSTEM_PROMPT` instead of standard Maya prompt
- On completion: saves agent_name + context_jsonb, sets onboarding_completed=true, transitions to standard Maya

**Owner:** north-code  
**Done when:** New users go through chat onboarding, agent name saves, transitions to main Maya correctly.

---

#### W1-C: Inline Tool Result Rendering in Chat UI (3 days)

**What we're building:**
The chat message renderer needs to handle new `tool-*` part types and display them inline.

**New components to create:**
```
components/maya/chat-tools/
  ChatImageGrid.tsx        — shows 4 concept images inline with actions
  ChatPagePreview.tsx      — shows page preview + live URL + edit button
  ChatVideoPlayer.tsx      — inline video player
  ChatCalendarPreview.tsx  — renders calendar HTML inline
  ChatPDFPreview.tsx       — PDF thumbnail + download
  ChatUploadModule.tsx     — inline selfie upload (replaces modal)
  ChatTrainingModule.tsx   — inline training flow trigger
```

**MessageRenderer updates:**
```typescript
// In MayaChatInterface or ChatMessageRenderer
case 'tool-image-grid':
  return <ChatImageGrid {...part} onSelect={handleImageSelect} />
case 'tool-page-preview':
  return <ChatPagePreview {...part} onEdit={() => sendMessage('edit my page')} />
case 'tool-video-player':
  return <ChatVideoPlayer {...part} />
```

**Key UX rules:**
- Results appear BELOW Maya's message text, not in a separate panel
- Always have a clear action button ("Use this", "Edit", "Download")
- Mobile-first: all previews must work at 375px
- Show loading state inline while generation runs (skeleton/pulse)

**Owner:** north-code  
**Done when:** Images, page previews, and video all render inline in chat without opening new panels.

---

### Week 2 — Core Chat Capabilities

#### W2-A: HTML Page Generation in Chat (3 days)

**What we're building:**
Maya generates branded HTML landing pages, strategy pages, and content calendars through chat. User sees preview inline, page is live at `/p/[username]/[slug]`.

**New API route:** `/api/maya/create-page/route.ts`
```typescript
// Input: user intent + brand profile + optional existing page ID to edit
// Process:
//   1. Pull user's personal_brand_profiles for brand data
//   2. Pull their generated_images for photo selection
//   3. Claude generates HTML with their brand aesthetic (Scandinavian luxury if SSELFIE branding)
//   4. Store in personal_pages table
//   5. Host at /p/[username]/[slug]
//   6. Screenshot preview → Vercel Blob
//   7. Return previewImageUrl + liveUrl
```

**Page types Maya can create:**
1. **Landing page** — headline, brand story, what they offer, CTA to book/buy
2. **Link-in-bio** — all their links in branded format
3. **Strategy page** — brand strategy as visual HTML (extends existing /strategy/[token])
4. **Content calendar** — monthly content plan as visual HTML grid
5. **Digital product page** — sales page for their PDF/workbook

**Edit flow (CRITICAL — Maya edits, never recreates):**
```
User: "The headline doesn't feel like me"
Maya: [reads existing page_jsonb from personal_pages]
      [edits ONLY the headline section]
      [increments version]
      [updates published_html]
      [returns updated preview]
      "Updated! How does this feel now? →"
```

**Route:** `/p/[username]/[slug]` reads from `personal_pages` table — public, no auth required for viewing.

**Owner:** north-code  
**Done when:** User can say "create my landing page" in chat, see inline preview, page is live at /p/username/landing, edits work without full regeneration.

---

#### W2-B: Content Calendar + Feed Planner in Chat (2 days)

**What we're building:**
Maya creates a monthly content calendar as a beautiful HTML page with their actual generated images embedded. Extends existing feed planner.

**Chat trigger:** `[CREATE_CALENDAR:month=march:posts=12]`

**What it generates:**
- HTML page with 12 post slots
- Each slot: image thumbnail from their gallery, caption starter, post type label
- Downloads as HTML file + lives in `/p/username/calendar-march`
- Can be edited post-by-post ("change this Tuesday post to a reel instead")

**Connection to existing feed planner:**
- Feed planner already generates strategy
- This extends it to a visual, shareable HTML calendar
- Uses their actual generated images (pulls from `generated_images`)

**Owner:** north-code  
**Done when:** "create my content calendar for March" → inline calendar preview → shareable HTML page.

---

#### W2-C: Text Overlay Carousels in Chat (2 days)

**What we're building:**
Maya creates carousels with text overlays using NanoBanana Pro. User sees all slides inline.

**Research dependency:** Wait for north-content R3 report on best NanoBanana text overlay approach.

**Chat trigger:** `[CREATE_CAROUSEL:slides=7:topic=visibility]`

**Workflow:**
1. Maya asks: "What's the topic? And what's the big message on slide 1?"
2. Maya generates slide text + NanoBanana prompts for each slide
3. Creates 7 images with text baked in (or overlaid via CSS in HTML)
4. Shows all 7 slides inline as a scrollable strip
5. Exports as ZIP for Instagram scheduling

**Implementation approach (TBD pending R3 research):**
- Option A: NanoBanana generates images, CSS text overlays applied client-side
- Option B: NanoBanana Pro with text-in-image prompting if model supports it
- Option C: Canvas API compositing in a server-side route

**Owner:** north-code + north-content  
**Done when:** Full 7-slide carousel created from chat, downloadable as images.

---

### Week 3 — Dashboard + Memory

#### W3-A: User Dashboard — Everything Maya Made (2 days)

**What we're building:**
`/dashboard` page showing everything Maya has produced for the user. Not a navigation menu — a visual gallery.

**Sections:**
```
MY BRAND STUDIO (dashboard)
├── My Photos (generated_images gallery — existing)
├── My Videos (generated_videos — existing)  
├── My Pages (personal_pages table — NEW)
│   ├── Landing Page → /p/username/landing [Edit] [Share]
│   ├── Content Calendar March → /p/username/calendar-march [Edit] [Download]
│   └── Brand Strategy → /p/username/strategy [Edit] [Share]
├── My Training (user_models — existing)
└── My Downloads (PDFs, workbooks — maya_produced_assets)
```

**Key UX principle:** Everything Maya made is owned by the user. One click to share, edit, or download. No digging through settings.

**Owner:** north-code  
**Done when:** /dashboard shows all user assets across all types, links to live pages, edit buttons go back to chat with context pre-loaded.

---

#### W3-B: Maya Memory — Remember, Don't Recreate (2 days)

**What we're building:**
When user says "remember this" or "update my landing page" — Maya reads her previous work and edits it instead of starting fresh.

**Memory architecture:**

```typescript
// lib/maya/memory-layer.ts

// What Maya remembers per user:
interface MayaMemory {
  // From maya_personal_memory (already exists)
  preferred_topics: string[]
  personalized_styling_notes: string
  agent_context_note: string       // ← agents inject here already
  
  // From personal_pages (new)
  activePage: { id, slug, title, version } | null
  
  // From user_agent_profiles (new)
  agentName: string
  
  // From generated_images (already exists)
  recentImages: { id, url, concept_title }[]
}
```

**"Remember this" handler:**
```
User: "Remember I hate blue tones in my photos"
Maya: [appends to personalized_styling_notes in maya_personal_memory]
      "Got it — keeping your palette warm from now on 🖤"
```

**"Edit my page" handler:**
```
User: "Update my landing page — change the headline to 'Turn one selfie into a month of content'"
Maya: [reads personal_pages WHERE slug='landing' AND user_id=X]
      [reads current published_html]
      [Claude edits ONLY the H1 tag]
      [saves updated HTML + increments version]
      "Done! Updated just the headline → [preview]"
```

**Owner:** north-code  
**Done when:** "Remember this" saves to memory, "edit my page" reads + patches existing HTML, memory persists across chat sessions.

---

#### W3-C: PDF / Workbook Generation in Chat (2 days)

**What we're building:**
Maya creates downloadable PDF workbooks and strategy guides through chat.

**Chat flow:**
```
User: "Create a workbook for my followers — how to build their personal brand in 7 days"
Maya: "Love this! 🙌 Creating your 7-Day Brand Building Workbook...
      [CREATE_PDF:type=workbook:topic=7-day-brand-building:pages=12]"
      [inline PDF preview thumbnail]
      "Your workbook is ready — 12 pages. You can sell this for €17-€27. 
       Want me to create a sales page for it too? →"
```

**PDF generation:**
- Use existing pdf skill approach (write_pdf via Desktop Commander pattern)
- Or: Puppeteer/playwright to render HTML → PDF (server-side)
- HTML template matching SSELFIE brand aesthetic
- Store URL in `maya_produced_assets`

**Types Maya can create:**
- Brand strategy workbook
- 7-day challenge guide
- Caption writing cheatsheet
- Content planning template

**Owner:** north-code  
**Done when:** "Create a workbook" → inline PDF preview → downloadable file → option to create sales page.

---

## TECHNICAL DECISIONS

### Model Selection (update pending R1 research)
**Current:**
- Chat: `claude-sonnet-4-20250514`
- Classic images: Flux LoRA via Replicate
- Pro images: `google/nano-banana-pro` via Replicate
- Video: `wan-video/wan-2.5-i2v-fast` via Replicate

**Principles for model updates:**
- Always use the most capable available model for each task
- Keep Anthropic (Claude) for chat/reasoning — not switching this
- Update Replicate model IDs when better versions release
- Add model version config to environment variables so updates don't require code changes:
  ```
  REPLICATE_FLUX_MODEL=...
  REPLICATE_VIDEO_MODEL=...
  REPLICATE_PRO_IMAGE_MODEL=...
  ```

### Separate Branch Strategy
```bash
# Create branch from current main
git checkout main
git pull
git checkout -b sprint/chat-first-maya

# Development workflow
# - All sprint work on this branch
# - north-code runs tests after each slice
# - Sandra reviews at end of each week
# - No direct merges to main without Sandra approval

# Testing
pnpm test  # vitest
pnpm build # verify no TypeScript errors
```

### Environment Variables to Add
```bash
FEATURE_CHAT_FIRST_MAYA=true        # Gates new chat architecture
FEATURE_CHAT_ONBOARDING=true        # Gates onboarding flow
FEATURE_INLINE_TOOL_RESULTS=true    # Gates inline rendering
REPLICATE_FLUX_MODEL=               # Flux model version (from R1 research)
REPLICATE_VIDEO_MODEL=              # Video model version (from R1 research)
REPLICATE_PRO_IMAGE_MODEL=          # NanoBanana or replacement (from R1 research)
```

---

## PRICING (LOCKED)

| Plan | Price | What's included |
|------|-------|----------------|
| Chat-First Maya (standalone) | **€67/month** | Full Maya chat, all generation tools, dashboard, pages |
| Maya + Studio | **€147/month** | Everything above + Studio membership (courses, community) |
| Studio only (existing) | €97/month | Existing — not changing |
| Beta access for existing Studio | **FREE for 30 days** | Existing 15 Studio members get free trial |

**Why €67:** NanoBanana Pro generates at ~€0.02/image, video at ~€0.10/video. Active user ~100 generations/month = ~€2-3 API cost. €67 gives healthy margin while staying accessible.

**Why NOT bundled at same price:** Keeps clear product lanes. Studio = learning + community. Maya Chat-First = creation engine. They complement, not duplicate.

---

## SPRINT DEPENDENCIES + SEQUENCING

```
R1 Model Research ──────────────────────────────────→ Informs W2-C (carousel models) + W1-A model config
R2 Audience Research ────────────────────────────────→ Informs onboarding questions (W1-B) + dashboard UX (W3-A)
R3 Content Research ─────────────────────────────────→ Informs W2-C carousel approach

W1-A (Tool Registry + DB) ──→ W1-C (UI rendering) ──→ W2-A (Page gen) ──→ W3-A (Dashboard)
W1-B (Onboarding) ──→ W3-B (Memory) 
W2-A (Page gen) ──→ W2-B (Calendar) ──→ W3-C (PDF)
```

**Parallel execution:**
- north-code handles all W1-A through W3-C (sequential per dependency)
- north-product monitors model availability + updates config
- north-content supports W2-C carousel copy + workbook content
- north-audience validates onboarding questions match real audience language

---

## SUCCESS METRICS (per week)

### Week 1
- [ ] New user can name their agent in chat and it persists
- [ ] `user_agent_profiles` table exists + populated on onboarding complete
- [ ] `personal_pages` + `maya_produced_assets` tables exist + migrations clean
- [ ] Concept image grid renders inline in chat (not in separate panel)
- [ ] Video renders inline in chat
- [ ] All on `sprint/chat-first-maya` branch, `pnpm build` passes

### Week 2
- [ ] "Create my landing page" → page at /p/username/landing within 30 seconds
- [ ] "Edit my headline" → HTML patched in place, version incremented
- [ ] "Create my content calendar" → shareable HTML page with images
- [ ] At least 3 carousel slides generated with text overlay approach (TBD R3)
- [ ] No regressions on main Maya generation flow

### Week 3
- [ ] /dashboard shows all user assets (photos, videos, pages, downloads)
- [ ] "Remember I hate blue tones" persists to next session
- [ ] "Create a workbook" produces downloadable PDF
- [ ] End-to-end: new user → names agent → generates image → creates landing page → dashboard shows all assets

---

## WHAT THIS SPRINT IS NOT

To keep scope tight:
- ❌ Not replacing the existing Classic/Pro image generation (it works great — just wrapping it)
- ❌ Not rebuilding the Academy (separate track)
- ❌ Not changing Stella's email/revenue agent workflows
- ❌ Not touching `main` branch until Sandra full approval
- ❌ Not launching to all users at once — beta with existing Studio members first

---

## HOW TO START

1. **Sandra approves this spec** (or requests changes)
2. **North agents complete R1/R2/R3 research** (already in current task list — ACTIVE/tasks/)
3. **Claude reviews research reports** + updates any spec decisions (model IDs, carousel approach)
4. **north-code creates branch** + runs migrations in preview env
5. **Weekly check-ins with Sandra** at end of W1, W2, W3

---

## APPENDIX — KEY FILES TO KNOW

| File | Lines | What it does |
|------|-------|-------------|
| `app/api/maya/chat/route.ts` | 1,432 | Main chat — Claude Sonnet, mode routing, tool trigger detection |
| `lib/maya/get-user-context.ts` | 540 | Builds user context (brand profile, memory, agent note) |
| `lib/maya/core-personality.ts` | 260 | MAYA_VOICE, MAYA_CORE_INTELLIGENCE, MAYA_PROMPT_PHILOSOPHY |
| `lib/maya/mode-adapters.ts` | 204 | Classic vs Pro system prompts |
| `lib/maya/auto-select-mode.ts` | 27 | Mode routing logic |
| `lib/nano-banana-client.ts` | 212 | NanoBanana Pro via Replicate |
| `app/api/maya/generate-image/route.ts` | 406 | Classic Mode image gen |
| `app/api/maya/create-photoshoot/route.ts` | 615 | 6-9 image photoshoot |
| `app/api/maya/generate-video/route.ts` | 254 | WAN-2.5 video gen |
| `components/sselfie/maya-chat-screen.tsx` | 3,823 | Main chat UI — triggers, tabs, hooks |
| `lib/stella/runtime.ts` | 111 | Stella (OpenAI GPT-4.1-mini) — separate from Maya |
