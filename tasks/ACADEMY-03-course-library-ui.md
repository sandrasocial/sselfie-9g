# ACADEMY-03 — Course Library + Interactive Lesson Companion

**Branch:** `codex/academy-course-library`  
**Status:** Ready for implementation

---

## Goal

Replace the hardcoded mini-products Academy page with a real course library. Each lesson has an **interactive companion panel** — key takeaways, a 3-level action step, a reflection field that saves to their account, and resources to download. Specific lessons feed their answers directly into their Maya brand profile (`user_personal_brand`) so the AI gets smarter as they study.

---

## What's Already in the DB

Two published courses, all lessons with Vimeo URLs:

**Course 1 — "Branded by SSELFIE"** (`product_id: branded_by_sselfie`, id: 1) — 14 lessons  
**Course 3 — "SSELFIE EDITING MASTERCLASS"** (`product_id: editing_masterclass`, id: 3) — 6 lessons

Vimeo URL format in DB: `https://vimeo.com/{videoId}?fl=tl&fe=ec`  
Vimeo embed URL to use: `https://player.vimeo.com/video/{videoId}?badge=0&autopause=0&player_id=0&app_id=58479`

---

## Step 1 — DB Migration (run first)

Create two new tables and seed lesson companion content.

### 1a. Create `user_lesson_notes` table

```sql
CREATE TABLE IF NOT EXISTS user_lesson_notes (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  lesson_id     INTEGER NOT NULL,
  reflection    TEXT,
  action_level  TEXT CHECK (action_level IN ('bare_minimum', 'bold_move', 'bonus_vibe')),
  profile_answer TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_user_lesson_notes_user ON user_lesson_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_notes_lesson ON user_lesson_notes(lesson_id);
```

### 1b. Seed `academy_lessons.content` with companion data

Run this as a single migration. The `content` JSONB column is currently NULL on all lessons.

Each lesson gets this structure:
```json
{
  "key_takeaways": ["string", "string", "string"],
  "action_step": {
    "bare_minimum": "string",
    "bold_move": "string",
    "bonus_vibe": "string"
  },
  "reflection_prompt": "string",
  "profile_field": "column_name_in_user_personal_brand | null",
  "profile_question": "string | null",
  "resources": []
}
```

**Seed data for each lesson — run as individual UPDATEs:**

```sql
-- Lesson 1: Start Here: Welcome to Branded By SSELFIE
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Your phone is already a professional branding tool — you just need the system.",
    "You don''t need a perfect setup to start. You need to start.",
    "This course is about building real confidence through action, not theory."
  ],
  "action_step": {
    "bare_minimum": "Write down 3 words that describe how you want to be seen online.",
    "bold_move": "Record a 30-second voice note to yourself about why you''re doing this.",
    "bonus_vibe": "Post one Story today — face on camera, one honest sentence. That''s it."
  },
  "reflection_prompt": "Why are you here? What do you want to feel about yourself online in 3 months?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 1;

-- Lesson 2: Introduction to Personal Branding
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Personal branding is not about being perfect — it''s about being recognisable.",
    "People follow people, not logos. Your face is your brand asset.",
    "Clarity beats perfection. Know who you are and say it simply."
  ],
  "action_step": {
    "bare_minimum": "Write one sentence: I help [who] do [what] so they can [result].",
    "bold_move": "Find 3 accounts you admire and write down exactly what draws you to each one.",
    "bonus_vibe": "Draft your first brand positioning statement and say it out loud. Does it feel true?"
  },
  "reflection_prompt": "Who do you most want to help, and what do you want them to feel after finding you?",
  "profile_field": "mission_statement",
  "profile_question": "Write your personal brand mission in one sentence: I help [who] do [what] so they can [result].",
  "resources": []
}' WHERE id = 2;

-- Lesson 3: Start Showing Up
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Visibility is not vanity — it is strategy. You cannot sell to people who cannot see you.",
    "Showing up imperfectly beats hiding perfectly every single time.",
    "The algorithm rewards consistency. So does confidence."
  ],
  "action_step": {
    "bare_minimum": "Post one Story today with your face in it. Say one true sentence.",
    "bold_move": "Commit to face-forward content 3 times this week.",
    "bonus_vibe": "Post today. No filter. No rethinking. Just go."
  },
  "reflection_prompt": "What has been stopping you from showing up? Name it honestly.",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 3;

-- Lesson 4: Your Energy on Camera
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "The camera picks up your internal state — nervous, rushed, or calm all read differently.",
    "Your presence is the difference between a photo people scroll past and one they save.",
    "You can train yourself to feel comfortable on camera — it is a skill, not a trait."
  ],
  "action_step": {
    "bare_minimum": "Take 5 selfies in different energy states and notice how each one feels to look at.",
    "bold_move": "Find your camera anchor — the one thought that makes you feel most like yourself.",
    "bonus_vibe": "Record a 60-second video where you say one truth on camera. Post it."
  },
  "reflection_prompt": "What energy do you want to bring to every piece of content? Describe it in 3 words.",
  "profile_field": "brand_voice",
  "profile_question": "How would you describe the energy and tone you want to bring to your content? (3 words or a sentence)",
  "resources": []
}' WHERE id = 4;

-- Lesson 5: The Camera Hack
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Small technical changes — angle, distance, lens — create dramatically different results.",
    "The back camera on your phone is significantly higher quality than the front.",
    "Once you know the hack, you cannot unsee it. Every photo gets better."
  ],
  "action_step": {
    "bare_minimum": "Try the camera hack on your very next selfie session.",
    "bold_move": "Take 10 photos using the hack, pick your best 3, and write what made them work.",
    "bonus_vibe": "Apply the hack to a reel and post it this week."
  },
  "reflection_prompt": "What did you notice immediately when you tried this? What changed in your photos?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 5;

-- Lesson 6: Personal Branding 101
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Your brand is what people say about you when you are not in the room.",
    "Positioning is not about limiting yourself — it is about being found by the right people.",
    "The most powerful personal brands are built on truth, not on performance."
  ],
  "action_step": {
    "bare_minimum": "Write your positioning statement: I am [name] and I help [who] with [what].",
    "bold_move": "Write your full brand positioning and read it back to yourself 5 times.",
    "bonus_vibe": "Post your positioning publicly this week — as a caption, Story, or bio update."
  },
  "reflection_prompt": "If your ideal follower found you today, what do you want them to immediately understand about you?",
  "profile_field": "mission_statement",
  "profile_question": "Write your complete brand positioning statement. Who are you, who do you help, and what do you do?",
  "resources": []
}' WHERE id = 6;

-- Lesson 7: Design Your Brand
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Visual consistency creates recognition — people should know it''s you before they see your name.",
    "Your brand aesthetic comes from your actual life and taste, not from a trend.",
    "3 colours. 2 fonts. 1 consistent feeling. That is all you need."
  ],
  "action_step": {
    "bare_minimum": "Choose your 3 brand colours — go with what already feels like you.",
    "bold_move": "Write your 3 brand personality words and find 5 Instagram accounts that match that energy.",
    "bonus_vibe": "Create a simple visual brand board — colours, 3 words, 1 reference image."
  },
  "reflection_prompt": "When people land on your profile, what feeling do you want them to have in the first 3 seconds?",
  "profile_field": "visual_aesthetic",
  "profile_question": "Describe your brand aesthetic in your own words — colours, mood, the feeling you want to create.",
  "resources": []
}' WHERE id = 7;

-- Lesson 8: Design Your Instagram Feed
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Your feed is your first impression — it tells people whether to stay or leave.",
    "Intentional variation in content format keeps a feed alive and interesting.",
    "You do not need a rigid grid theme. You need a consistent feeling."
  ],
  "action_step": {
    "bare_minimum": "Look at your last 9 posts and write down what you love and what you want to change.",
    "bold_move": "Plan your next 3 posts with intentional aesthetic consistency.",
    "bonus_vibe": "Design a simple content grid plan for the next 2 weeks and stick to it."
  },
  "reflection_prompt": "What does your ideal feed look and feel like? Describe it as if explaining it to someone.",
  "profile_field": "brand_vibe",
  "profile_question": "Describe your ideal Instagram feed — what it looks like, what types of content it has, and the feeling it creates.",
  "resources": []
}' WHERE id = 8;

-- Lesson 9: Create Your Brand Pillars ⭐ PROFILE-BUILDING
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Brand pillars are the 3 topics you always come back to — your reliable content foundation.",
    "Pillars make content decisions easy: if it doesn''t fit a pillar, it does not get posted.",
    "Strong pillars create a clear identity that attracts the right audience consistently."
  ],
  "action_step": {
    "bare_minimum": "Write your 3 brand pillars — the topics you could talk about forever.",
    "bold_move": "For each pillar, write 3 content ideas right now. That is 9 posts mapped.",
    "bonus_vibe": "Post one piece of content from each pillar this week and see which performs best."
  },
  "reflection_prompt": "What are the 3 things you always come back to? The topics you know deeply and care about genuinely?",
  "profile_field": "content_pillars",
  "profile_question": "What are your 3 brand pillars? Write each one with a short description of what it means for your content.",
  "resources": []
}' WHERE id = 9;

-- Lesson 10: Start Showing Up
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Momentum is the only cure for fear. Action first, confidence follows.",
    "People need to see you repeatedly before they trust you. Consistency is the work.",
    "Showing up when you do not feel like it is exactly what separates those who grow from those who stall."
  ],
  "action_step": {
    "bare_minimum": "Post one piece of face-forward content today.",
    "bold_move": "Show up 3 times this week in different formats — Story, post, reel.",
    "bonus_vibe": "Start a 30-day show-up commitment. Document it publicly."
  },
  "reflection_prompt": "What does your commitment to showing up look like this week? Be specific about format and frequency.",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 10;

-- Lesson 11: The Content System
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "A system removes the daily decision of what to post — that decision exhausts creative energy.",
    "Batch creation is the single biggest time-saver for consistent content creators.",
    "Your system should feel sustainable for a tired Tuesday, not just an inspired Monday."
  ],
  "action_step": {
    "bare_minimum": "Map your content system: posts per week, what formats, what pillars.",
    "bold_move": "Batch-create 3 pieces of content in one sitting right now.",
    "bonus_vibe": "Set up your content calendar for the next 30 days. Schedule it."
  },
  "reflection_prompt": "What content system could you actually maintain every week, even on your worst week?",
  "profile_field": "content_themes",
  "profile_question": "Describe your content system — how often you post, what formats you use, and how you plan your content.",
  "resources": []
}' WHERE id = 11;

-- Lesson 12: High Quality Selfies
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Light is everything. Good light makes any phone camera look professional.",
    "Angle, distance, and backdrop matter more than the camera itself.",
    "You can create a consistent, high-quality selfie in 10 minutes once you know the setup."
  ],
  "action_step": {
    "bare_minimum": "Apply the lighting and angle principles on your next photo session.",
    "bold_move": "Do a dedicated 15-minute selfie session using everything from this lesson.",
    "bonus_vibe": "Share one photo from this session with an honest caption about what you learned."
  },
  "reflection_prompt": "What did you discover about your best light and angle? Where in your home or routine can you always recreate it?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 12;

-- Lesson 13: Instagram Reels
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Reels are the fastest way to reach new people — they get shown beyond your existing audience.",
    "The hook is everything. You have 1.5 seconds to make someone stop scrolling.",
    "Simple, direct, genuine reels consistently outperform overproduced ones."
  ],
  "action_step": {
    "bare_minimum": "Watch 3 reels you love and write down exactly why they hooked you.",
    "bold_move": "Record and post one reel using the structure from this lesson.",
    "bonus_vibe": "Create a reel series — 3 reels connected by a theme — and post one per day."
  },
  "reflection_prompt": "What type of reel feels most natural for you right now? What is one topic you could film this week?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 13;

-- Lesson 14: Content Planning
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Planning removes the panic. You should never wonder what to post today.",
    "A monthly theme gives your content direction — without it, your feed reads as random.",
    "Two weeks of content batched in one session is a completely achievable standard."
  ],
  "action_step": {
    "bare_minimum": "Plan next week''s content right now — even just 3 posts mapped out.",
    "bold_move": "Create a monthly content calendar with themes, formats, and posting days.",
    "bonus_vibe": "Batch-record 5 pieces of content today so you are two weeks ahead."
  },
  "reflection_prompt": "What does your ideal content week look like? Write the plan for next week right now.",
  "profile_field": "content_themes",
  "profile_question": "What are your main content themes and how do you plan to show up consistently? Describe your ideal content week.",
  "resources": []
}' WHERE id = 14;

-- Lesson 16: Welcome To SSELFIE Editing Masterclass
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Editing is not about changing how you look — it is about enhancing the mood and story of the image.",
    "Consistency in editing creates a recognisable visual brand across all your content.",
    "The right editing workflow takes under 2 minutes once you have your preset saved."
  ],
  "action_step": {
    "bare_minimum": "Download Lightroom Mobile and Hypic — both free. Get them on your phone now.",
    "bold_move": "Take 5 before photos specifically to practice editing on this week.",
    "bonus_vibe": "Edit one photo with intention today — save the before and after side by side."
  },
  "reflection_prompt": "What feeling do you want your photos to have consistently? Dark and moody, light and clean, warm and rich?",
  "profile_field": null,
  "profile_question": null,
  "resources": [
    {"title": "Selfie Luxury Preset Collection", "type": "download", "url": "https://drive.google.com/drive/folders/1d2_Zttp-cyJb8A_6NWcpOiMKs6k4yTJT?usp=drive_link"},
    {"title": "Selfie Editing Checklist", "type": "download", "url": "https://drive.google.com/drive/folders/1d2_Zttp-cyJb8A_6NWcpOiMKs6k4yTJT?usp=drive_link"}
  ]
}' WHERE id = 16;

-- Lesson 17: Editing Introduction
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "The 5 core edits — exposure, contrast, highlights, shadows, warmth — do 90% of the work.",
    "Less is more. Over-edited photos read as try-hard. Subtle edits read as quality.",
    "Edit for mood first, then adjust details. Start big, end small."
  ],
  "action_step": {
    "bare_minimum": "Open one photo and apply just 3 edits: exposure, highlights, warmth.",
    "bold_move": "Edit the same photo 3 different ways — save each and compare.",
    "bonus_vibe": "Edit 10 photos using these principles. Your eye trains with every one."
  },
  "reflection_prompt": "What did you notice changes most immediately when you edit? What do your photos feel like after?",
  "profile_field": null,
  "profile_question": null,
  "resources": [
    {"title": "Selfie Editing Checklist", "type": "download", "url": "https://drive.google.com/drive/folders/1d2_Zttp-cyJb8A_6NWcpOiMKs6k4yTJT?usp=drive_link"}
  ]
}' WHERE id = 17;

-- Lesson 18: Custom Command Tutorial
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "A saved preset means one tap to apply your entire edit workflow.",
    "Your preset is your visual signature — it ties your content together across platforms.",
    "Create 2-3 preset variations for different lighting conditions, not just one."
  ],
  "action_step": {
    "bare_minimum": "Follow the tutorial once, step by step — save your first preset.",
    "bold_move": "Create 3 saved presets: light, dark, warm. Label them clearly.",
    "bonus_vibe": "Apply your new preset to 10 past photos and see your feed transform."
  },
  "reflection_prompt": "What preset style feels most like you? Which one will you use as your signature?",
  "profile_field": null,
  "profile_question": null,
  "resources": [
    {"title": "Selfie Luxury Preset Collection", "type": "download", "url": "https://drive.google.com/drive/folders/1d2_Zttp-cyJb8A_6NWcpOiMKs6k4yTJT?usp=drive_link"}
  ]
}' WHERE id = 18;

-- Lesson 19: Editing with Hypic App
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "Hypic specialises in skin tone and portrait enhancement — the go-to for selfie editing.",
    "Use Hypic for the subtle portrait polish, Lightroom for mood and tone — they complement each other.",
    "Do not over-smooth. The goal is natural, glowing skin — not plastic."
  ],
  "action_step": {
    "bare_minimum": "Download Hypic and open one photo to explore what it can do.",
    "bold_move": "Edit a selfie start to finish in Hypic only.",
    "bonus_vibe": "Edit the same photo in Lightroom vs. Hypic and compare — note what each does best."
  },
  "reflection_prompt": "What adjustments made the biggest difference for your specific skin tone and lighting in Hypic?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 19;

-- Lesson 20: Editing Inside the iPhone App
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "The native iPhone editor is more powerful than most people realise — no third-party app needed.",
    "For quick content turnarounds, iPhone native editing is fast enough and good enough.",
    "Knowing how to edit anywhere — even without your main apps — keeps your workflow uninterrupted."
  ],
  "action_step": {
    "bare_minimum": "Edit one photo using only the native iPhone tools right now.",
    "bold_move": "Create a custom combo in the iPhone editor you can repeat consistently.",
    "bonus_vibe": "Edit a full week of content using native iPhone tools only — speed and simplicity."
  },
  "reflection_prompt": "What is your fastest, most repeatable edit setup for days when you need to post quickly?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 20;

-- Lesson 21: Video Editing with CapCut
UPDATE academy_lessons SET content = '{
  "key_takeaways": [
    "CapCut handles everything from basic cuts to text overlays to trending templates — all free.",
    "Consistent video editing style makes your reels recognisable in the first 2 seconds.",
    "The simpler the edit, the faster you can produce and publish — speed beats perfection."
  ],
  "action_step": {
    "bare_minimum": "Download CapCut and watch the tutorial through once before touching anything.",
    "bold_move": "Edit one reel or video completely in CapCut from start to finish.",
    "bonus_vibe": "Create a saved CapCut template for your recurring reel format."
  },
  "reflection_prompt": "What video style and editing rhythm feels most natural and sustainable for you to produce consistently?",
  "profile_field": null,
  "profile_question": null,
  "resources": []
}' WHERE id = 21;
```

---

## Step 2 — New API Routes

### `GET /api/academy/lessons/[lessonId]/notes`

Returns the current user's notes for a specific lesson.

```typescript
// Response
{
  reflection: string | null
  action_level: "bare_minimum" | "bold_move" | "bonus_vibe" | null
  profile_answer: string | null
}
```

Auth: require login. If no notes found, return `{ reflection: null, action_level: null, profile_answer: null }`.

---

### `POST /api/academy/lessons/[lessonId]/notes`

Saves the user's notes and optionally updates their brand profile.

```typescript
// Request body
{
  reflection?: string
  action_level?: "bare_minimum" | "bold_move" | "bonus_vibe"
  profile_answer?: string  // only sent if lesson has a profile_field
}
```

Logic:
1. Upsert into `user_lesson_notes` (ON CONFLICT (user_id, lesson_id) DO UPDATE)
2. If `profile_answer` is provided AND the lesson has a `profile_field` in its `content` JSONB:
   - Update the corresponding column in `user_personal_brand` for this user
   - Create or update the row if it doesn't exist (`ON CONFLICT (user_id) DO UPDATE`)
3. Return `{ success: true, profileUpdated: boolean }`

To get the `profile_field` for the lesson:
```sql
SELECT content->>'profile_field' as profile_field FROM academy_lessons WHERE id = $lessonId
```

The `profile_field` value is the exact column name to update in `user_personal_brand`.

**Security**: Only allow updating these whitelisted columns:
`mission_statement`, `brand_voice`, `visual_aesthetic`, `brand_vibe`, `content_pillars`, `content_themes`, `origin_story`, `transformation_story`

---

## Step 3 — Routes to Build

### `app/academy/page.tsx` — My Library (replace existing)

**Replace the hardcoded mini-products page entirely.**

Server component. Auth-gate: redirect to `/auth/login?redirect=/academy` if no user.

- Fetch from `/api/academy/courses`
- If `hasAccess === false`: show locked state — message "Your courses will appear here once you have access." + CTA pill button linking to `/join/studio`
- If `hasAccess === true`: show course cards

**Course card layout** (list, not grid — one card per row, full width):
```
[course number] [Course Title]               [X lessons · X hrs]
                [Short description]           [Progress bar if started]
                                              [→ Start / Continue]
```

Use the numbered list style from `app/academy/page.tsx` (current) — `01`, `02` in large Cormorant, title in Inter uppercase tracking. Each card is a link to `/academy/courses/[courseId]`.

---

### `app/academy/courses/[courseId]/page.tsx` — Course Detail

Server component. Fetch course + lessons from `/api/academy/courses/[courseId]`.

Layout:
- Course title (large Cormorant heading)
- Lesson count + total duration as eyebrow label
- Numbered lesson list — each item shows title, duration, completion status
- Clicking a lesson goes to `/academy/courses/[courseId]/lessons/[lessonId]`
- First incomplete lesson gets a subtle highlight ("Start here →")
- Completed lessons show a small checkmark

---

### `app/academy/courses/[courseId]/lessons/[lessonId]/page.tsx` — Lesson Viewer

**Client component (`"use client"`).**

#### Layout

**Desktop (≥768px):** Two-column
- Left (65%): Video + nav + action bar
- Right (35%): Scrollable companion panel

**Mobile (<768px):** Single column
- Video
- Tab bar: `Lesson` | `Action` | `Resources`
- Tab content below

---

#### Left column — Video + navigation

**Video embed:**
```tsx
function parseVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

// Render as:
<div style={{ aspectRatio: "16/9", position: "relative" }}>
  <iframe
    src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
    allowFullScreen
  />
</div>
```

**Below video:**
- `← Back to [Course Name]` — text link, left
- Lesson title in Cormorant, large
- Lesson number + duration as eyebrow

**Prev / Next navigation** (below title):
```
← Previous lesson          Next lesson →
```
These are text links, not buttons. Gray text, hover brightens.

**Mark as complete button:**
- Pill button: "Mark as complete"
- On click: `POST /api/academy/progress` `{ lessonId, action: "complete" }` → optimistically shows "✓ Completed" state
- If already completed: show "✓ Completed" with option to "Mark incomplete"

---

#### Right column — Companion Panel

Three sections stacked vertically, separated by thin dividers.

**Section 1 — Key Takeaways**

Eyebrow: `KEY TAKEAWAYS`

3 numbered points. Fetch from `lesson.content.key_takeaways`. If null, show nothing.

```
01  [takeaway text]
02  [takeaway text]  
03  [takeaway text]
```

Numbers in Cormorant weight 200, text in Inter weight 300 at 13px, `#c8c4bb`.

---

**Section 2 — Your Action Step**

Eyebrow: `YOUR ACTION STEP`

Three levels with a tab/toggle selector:

```
[ Bare Minimum ]  [ Bold Move ]  [ Bonus Vibe ]
```

Default selected: Bold Move (middle). User can tap to switch between levels.

The selected action step text displays below the tabs.

**Below the action text:**

Small label: `WHICH LEVEL DID YOU CHOOSE?`

Three pill buttons (outline style, single-select):
- `Bare Minimum`
- `Bold Move`
- `Bonus Vibe`

Selecting one saves immediately via `POST /api/academy/lessons/[lessonId]/notes` `{ action_level: "..." }`.

Show a subtle "Saved" flash confirmation (250ms fade-in, auto-dismiss after 1.5s).

---

**Section 3 — Reflect**

Eyebrow: `YOUR REFLECTION`

Display `lesson.content.reflection_prompt` as the prompt text in `#8a8780`.

Textarea below — placeholder: `Write your thoughts here...`

Auto-saves on blur (300ms debounce) via `POST /api/academy/lessons/[lessonId]/notes` `{ reflection: "..." }`.

**Profile-building lesson variant:**

If `lesson.content.profile_field` is not null, add an additional field below the standard reflection:

```
──────────────────────
SAVE TO YOUR MAYA PROFILE

[lesson.content.profile_question displayed as prompt]

[textarea for profile_answer]

[ Save to Maya Profile ]  ← pill button
```

On button click:
1. POST `{ profile_answer: "..." }` to `/api/academy/lessons/[lessonId]/notes`
2. Show success state: `"✓ Saved to your Maya profile — Maya will use this in every session."`
3. Style the success in `#c9a96e` (gold) to make it feel significant

---

**Section 4 — Resources** (only if `lesson.content.resources` is non-empty)

Eyebrow: `DOWNLOADS`

Each resource as a row:
```
[title]                    ↓ Download
```

Download links open in new tab.

---

#### On mount behaviour

1. Call `POST /api/academy/enroll` `{ courseId }` — enroll user if not already enrolled (idempotent)
2. Call `POST /api/academy/progress` `{ lessonId, action: "start" }` — record lesson start
3. Fetch existing notes via `GET /api/academy/lessons/[lessonId]/notes` → pre-fill reflection textarea and action_level selection

---

#### Lesson sidebar (desktop only — within the right column, above companion panel)

At the top of the right column, a collapsible lesson list:

```
COURSE LESSONS                          [collapse ↑]
─────────────────────────────────────
✓  01  Lesson title                         4:00
→  02  Current lesson (highlighted)         2:35
   03  Lesson title                         8:00
```

- `✓` checkmark for completed lessons (color `#c9a96e` gold)
- `→` arrow for current lesson
- Empty space for upcoming lessons
- Each row links to that lesson
- Collapsible with a toggle — collapsed state shows just the count

On mobile, this becomes the `Lesson` tab in the tab bar below the video.

---

## Step 4 — Design Tokens (apply throughout)

```
Background:    #0d0c0b
Surface panel: rgba(175,170,162,0.10) + backdrop-blur-[50px]
Border light:  rgba(195,190,182,0.15)
Border card:   rgba(195,190,182,0.25)

Text primary:    #f0ede8
Text secondary:  #c8c4bb
Text tertiary:   #a8a49c
Text muted:      #8a8780

Gold accent:   #c9a96e  ← use ONLY for completed states and profile saves
Danger/error:  #ef4444 (red-500)

Font display:  Cormorant_Garamond weight 200/300
Font body:     Inter weight 300/500

Eyebrow:  text-[10px] uppercase tracking-[0.5em] text-[#8a8780] font-[500]
```

Pill buttons:
```css
border border-[rgba(195,190,182,0.25)] rounded-full px-5 py-2
text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] font-[500]
hover:bg-[rgba(175,170,162,0.15)] transition-colors
```

Active/selected pill:
```css
bg-[rgba(175,170,162,0.20)] border-[rgba(195,190,182,0.5)]
```

Dividers between sections: `border-t border-[rgba(195,190,182,0.12)]`

Fade-up on mount: `.mf` class on section wrappers (already in `globals.css`)

Do NOT use any `public-*` CSS classes.

---

## Files to Create / Modify

```
app/academy/page.tsx                                              ← REPLACE
app/academy/courses/[courseId]/page.tsx                          ← NEW
app/academy/courses/[courseId]/lessons/[lessonId]/page.tsx       ← NEW
app/api/academy/lessons/[lessonId]/notes/route.ts                ← NEW (GET + POST)
```

Run the DB migration + seed before any page testing.

---

## Do NOT Touch

- `app/academy/access/` — brand-strategy and selfie-guide direct access pages
- `app/academy/products/` — keep for now, deprecated later
- `app/academy/success/page.tsx`
- `app/admin/academy/` — admin panel
- Any existing routes under `app/api/academy/` except the new notes route
- `lib/data/academy.ts`

---

## Testing Checklist

- [ ] DB migration runs without error; all 20 lessons have content JSON
- [ ] `/academy` shows course cards for Studio member
- [ ] `/academy` shows locked state for user with no access
- [ ] `/academy/courses/1` lists all 14 Branded by SSELFIE lessons with durations
- [ ] `/academy/courses/3` lists all 6 Editing Masterclass lessons with durations
- [ ] `/academy/courses/1/lessons/1` loads Vimeo iframe correctly
- [ ] Key takeaways render from `lesson.content.key_takeaways`
- [ ] Action step tabs switch between Bare Minimum / Bold Move / Bonus Vibe
- [ ] Selecting action level saves and shows "Saved" flash
- [ ] Reflection textarea auto-saves on blur
- [ ] Lesson 2, 4, 6, 7, 8, 9, 11, 14 show the "Save to Maya Profile" section
- [ ] Saving profile answer shows gold "✓ Saved to your Maya profile" confirmation
- [ ] Profile answer updates `user_personal_brand` in DB
- [ ] "Mark as complete" calls progress API and shows completed state
- [ ] Gold checkmarks appear for completed lessons in sidebar/list
- [ ] Next / Previous lesson navigation works
- [ ] Mobile: tab bar (Lesson | Action | Resources) appears below video
- [ ] Unauthenticated user redirected to login
