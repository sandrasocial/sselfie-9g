# Maya Intelligence Brief
**Date:** 2026-02-26  
**Author:** AI Engineering Team  
**Purpose:** Strategic analysis of what women actually ask Maya, and what it means for the product rebuild.  
**Status:** For Decision — Not a Code Change Document

---

## Executive Summary

Maya is currently a **prompt generation engine** wearing the costume of a personal AI. She is exceptionally good at one thing: turning a user's vibe into a FLUX/Nano Banana image generation prompt. But women aren't coming to Maya to get a prompt. They're coming because they need to look the way they feel inside — professional, aspirational, powerful — and they don't have a €300 photographer or a brand team. Maya is the surrogate for all of that.

The gap isn't in Maya's fashion intelligence (that's genuinely strong). The gap is that Maya forgets everything between sessions, can't see the user's trajectory, and treats every conversation like it's the first time they've met.

The opportunity: close that gap without a full rebuild, and position Maya as the layer that **knows you** — not just a tool you talk to.

---

## Part 1 — Maya's Current Capabilities

### What Maya Actually Does Well

**1. Fashion and aesthetic intelligence**  
Maya's core personality (`lib/maya/core-personality.ts`) contains a deep, current brand library: from Loewe and The Row (quiet luxury) to Alo Yoga and Lululemon (athletic luxe) to Stüssy and Fear of God (streetwear). She knows which aesthetic signals which positioning, and she applies this fluently. When a user says "professional but not stiff," Maya translates that into editorial vibes, specific brand analogues, and concrete styling directions. This is genuine expertise, not generic AI output.

**2. Identity-preserving image prompts (two-mode architecture)**  
- **Classic Mode** (Flux LoRA, 30–60 words): Trained on the user's face. Trigger word activation. iPhone candid aesthetic. Every photo technically features the actual user.  
- **Pro Mode** (Nano Banana, 150–200 words): Upload-per-session identity preservation. Comprehensive prompt with outfit/lighting/setting/mood sections. Explicit brand names (CHANEL headband, Alo leggings).  
- Both modes are distinct, stable, and production-proven.

**3. Rich user context injection**  
`get-user-context.ts` constructs a meaningful personal brand context block before every generation:
- Gender + ethnicity (critical for accurate FLUX rendering)
- Visual aesthetic preferences (e.g., Scandinavian Minimalist, Urban Moody)
- Fashion style, color palette, brand voice, content pillars
- Physical preferences (body modification requests — applied mandatorily to every prompt)
- Brand assets (uploaded files)
- Prior concept count and favorites count from `maya_personal_memory`

**4. Feed strategy intelligence**  
In Feed Planner mode (`chat_type = "feed-planner"`), Maya generates complete 9-post Instagram strategies in conversational flow. She produces `[CREATE_FEED_STRATEGY: {...}]` triggers that include post type, visual direction, caption, and prompt — a full content plan delivered through chat.

**5. Warm, non-robotic voice**  
`core-personality.ts` contains detailed voice guidance with good/bad examples. Maya does not sound like a corporate AI. She sounds like a stylish friend — direct, encouraging, specific. This is a product asset, not just a style choice.

---

## Part 2 — The Context Gap

### What Maya Knows vs. What She Should Know

| Data Point | Currently in Context | Should Be in Context |
|---|---|---|
| User's gender + ethnicity | Yes | Yes |
| Visual aesthetic preference | Yes (from onboarding) | Yes |
| Fashion style, color palette | Yes (if brand complete) | Yes |
| Physical appearance preferences | Yes (but fragile — code strips instruction phrases) | Yes (needs fix) |
| Topics previously requested | Yes (as flat array from memory) | Needs richer signal |
| Number of concepts generated | Yes (as a count) | Enough |
| **What the user asked last session** | **No** | **Critical gap** |
| **Which concepts the user actually generated images from** | **No** | **Critical gap** |
| **Which photos the user favorited or posted** | **No** (count only) | **Critical gap** |
| Which concepts the user ignored or rejected | No | High value |
| How long the user has been on the platform | No | Medium value |
| What the user last posted on Instagram | No | High value (if connected) |
| What offers or products the user is promoting | No | High value |
| Academy courses the user has completed | No | Medium value |
| Which mode (Classic/Pro) the user prefers | No | Medium value |

### The Single Biggest Gap

**Maya has no memory of what happened in previous sessions.**

Every conversation starts from scratch. Maya cannot say:
- "Last week we did quiet luxury — want to try something bolder, or more of the same?"  
- "You've generated 12 wellness concepts. That's clearly your sweet spot."  
- "You favorited the beach editorial last time. Let's riff on that."

This is the difference between a tool and a personal AI. Tools answer questions. Personal AIs know your trajectory, notice your patterns, and proactively serve what you need next.

The infrastructure exists to fix this. The `maya_personal_memory` table tracks `preferred_topics`, `successful_prompt_patterns`, `ongoing_goals`, and `personalized_styling_notes`. The `maya_concepts` table stores every concept ever generated per user with category, title, description, and prompt. The `maya_chats` table has full conversation history. **None of this is currently surfaced in Maya's system prompt.**

---

## Part 3 — Top 5 User Intent Patterns

These are inferred from the system architecture (what Maya was built to handle), the concept category taxonomy, the mode-adapter design, the funnel redesign document, and the audit trail of user feedback. No direct chat log content analysis was possible from available automation outputs — chat content is stored in Neon but not exported to automation digests.

### Intent Pattern 1: "Make me look like the version of myself I'm selling"

**Signal:** The entire Pro Mode architecture, physical preferences system, and identity-preservation priority.  
**What users say:** "I need professional photos," "I want to look like a CEO," "I hate looking stiff."  
**What they mean:** I have a business I'm proud of. I want photos that communicate the authority and polish I feel inside, without looking like stock photography. The photos need to be *me* — my face, my body — not a model who looks vaguely like me.  
**Maya's current fit:** Strong. Pro Mode identity preservation is well-designed. Classic Mode with trained LoRA is even stronger when the training works correctly.  
**Gap:** The training parameters audit reveals hair color, body type, and age often aren't learned correctly. Physical preferences get their instruction phrases stripped. The technical layer is undermining the emotional promise.

### Intent Pattern 2: "Create content for my niche without me having to think about it"

**Signal:** The 6 Pro Mode categories (Wellness, Luxury, Lifestyle, Fashion, Travel, Beauty), the concept card system, and the "generate multiple concepts at once" design.  
**What users say:** "I'm a wellness coach," "I have a fitness business," "I do high-ticket consulting."  
**What they mean:** I'm not a stylist. I don't know what "quiet luxury for a life coach" means in practice. Tell me what to wear, where to stand, and what kind of photo to take — then generate it.  
**Maya's current fit:** Good. Maya's fashion expertise maps business categories to aesthetics intelligently.  
**Gap:** Maya generates concepts based on the category but doesn't remember *which category this user keeps returning to*. If someone has generated 15 wellness concepts and 1 luxury concept, Maya should know that and default to wellness framing.

### Intent Pattern 3: "Help me figure out my whole feed, not just one photo"

**Signal:** The Feed Planner tab, the `feed-planner` chat type, and the feed-strategy generation architecture. The funnel redesign doc notes Feed Planner had the most complex usage patterns before being deprioritized.  
**What users say:** "Create an Instagram feed for my business," "I need a content plan," "What should I post this month?"  
**What they mean:** Instagram isn't individual photos — it's a coherent visual system. Users are overwhelmed by having to think about every post. They want Maya to hold the strategic view so they can just execute.  
**Maya's current fit:** Functional. Feed Planner generates 9-post strategies through conversation and produces the full structured feed. But it was positioned as the entry point to the product (wrong) and had 0% D1 activation as a result.  
**Gap:** Feed strategy doesn't connect to what Maya knows from the Photos tab. A user who generates "luxury lifestyle" photos in Photos tab should get a feed strategy that matches — Maya currently treats these as entirely separate conversations.

### Intent Pattern 4: "Get the photos to actually look like me"

**Signal:** Every technical audit in the docs folder. The comprehensive audit calls out: hair color wrong, body type wrong, age wrong, "retraining 5x but kept being spat out," "only 3 decent photos out of a whole credit pack."  
**What users say:** Nothing — they churn. Or they leave feedback like "this doesn't look like me."  
**What they mean:** This is existential. If the product promise is "AI photos that look like you, not a model," and the photos don't look like the user — the product has failed. Full stop.  
**Maya's current fit:** Broken in specific scenarios. The technical fixes are documented (lora_rank: 48 to 24, caption_dropout_rate: 0.15 to 0.05, physical preferences conversion logic). These are engineering fixes, not Maya's fault.  
**Gap:** The context model already has `physical_preferences` as a mandatory field. The failure is downstream in the LoRA training pipeline and the `flux-prompt-builder.ts` conversion logic.

### Intent Pattern 5: "Show me what's possible — I don't know what to ask for"

**Signal:** The `generateChatTitle()` function strips filler phrases like "I want," "help me," "show me," "give me" — these are the most common conversation openers. The concept card system generates multiple options by design. The mode-adapter produces 3–6 concepts per response.  
**What users say:** "I want something professional," "help me with content," "give me ideas."  
**What they mean:** Women don't come to Maya with fully formed briefs. They come with a feeling — "I want to look more serious" or "something editorial but not stuffy" — and they need Maya to translate that feeling into concrete visual concepts.  
**Maya's current fit:** Designed for this. The multi-concept output, variety across aesthetics, and the explicit "you create variety" instruction in the system prompt all serve this intent.  
**Gap:** Maya's suggestions have no history context. She doesn't know if this is the user's first session or their 50th. For a new user, wide-variety concepts are perfect. For a power user, Maya should say "you've never done travel content — here's what that could look like for your brand" rather than generating another wellness variation.

---

## Part 4 — 3 Quick Wins

These are implementable without a rebuild. Each is a backend change + system prompt update.

### Quick Win 1: Surface Chat History in Every Session

**What to do:** At session start, query the last 3–5 `maya_concepts` records for this user and the title of their last `maya_chats` session. Add a short memory block to Maya's system prompt:

```
=== MAYA'S MEMORY ===
Last session title: "Luxury editorial for coaching content"
Recent concept categories: luxury (5x), wellness (3x), lifestyle (2x)
Total concepts generated: 47
Styling note: user prefers clean neutrals, often requests minimalist settings
```

Maya can then say: "Welcome back — I see you've been leaning into that luxury editorial look. Want to push that further today, or try something new?" This is the difference between a tool and a personal AI, implemented in roughly 2 hours of backend work.

**Files:** `lib/maya/get-user-context.ts` (add concept history query) and `lib/data/maya.ts` (add `getRecentConceptCategories()` helper).

### Quick Win 2: Fix Physical Preferences Processing

**What to do:**  
1. Fix `convertPhysicalPreferencesToPrompt()` in `lib/maya/flux-prompt-builder.ts` — convert instruction phrases to descriptive language instead of stripping them ("keep my natural hair color" → "natural hair color").  
2. On the first generation after a user has set physical preferences, have Maya confirm: "Quick note — I'll apply these details to every photo I create for you: [list]. If anything changes, just tell me."

**Why this wins:** The comprehensive audit reveals this is the #1 cause of silent user disappointment. The fix is documented and small. The confirmation step prevents the quiet frustration of a user who set preferences months ago and has no idea if Maya is using them.

**Files:** `lib/maya/flux-prompt-builder.ts` (conversion logic) and `app/api/maya/chat/route.ts` (confirmation trigger on first generation).

### Quick Win 3: Give Maya Awareness of Training Status

**What to do:** Add to the user context block:
- Whether the user has a trained LoRA model (Classic Mode available)
- Approximate generation count with that model

```
=== USER'S MODEL STATUS ===
Classic Mode: Active (trained model ready)
Generations with trained model: 23
```

**Why this wins:** This changes Maya's conversational behavior meaningfully. For a user with no trained model, Maya should naturally guide toward Pro Mode and, after 3+ generations, introduce training: "You're loving Pro Mode — want to make it permanent? Training your personal AI means every photo will always look exactly like you, no selfie upload needed." For Classic Mode users with 20+ generations, Maya knows they're confident users and can go deeper, faster.

**Files:** `lib/maya/get-user-context.ts` (add `user_models` query).

---

## Part 5 — The 12-Month Architectural Bet: Maya as Personal AI OS

The current Maya is a stateless expert. She's brilliant in a session but has no thread between sessions. The 12-month bet is building longitudinal intelligence — turning Maya into the AI that actually knows who you are, where you're going, and what you need next.

### Layer 1: Session Memory (Months 1–2)

Infrastructure already exists. `maya_personal_memory`, `maya_concepts`, `maya_chats` are all populated. The work is retrieval and injection.

- **Concept history embedding:** Index all past `maya_concepts` records with OpenAI embeddings. Upstash Vector is already configured in `lib/upstash-vector.ts`. When a new session starts, retrieve the 5 most semantically relevant past concepts as context.
- **Conversation title summary:** The last 5 chat titles become a "recent activity" feed Maya can reference.
- **Preference drift detection:** If a user generated "quiet luxury" 20 times and then asked for "streetwear" twice — Maya should notice the shift and lean into it.

### Layer 2: Performance Feedback Loop (Months 3–5)

The most powerful signal Maya currently lacks: what actually worked.

- **Favorites as training signal:** Users can already favorite images (`is_favorite` in `ai_images`). Wire this back into `maya_personal_memory.successful_prompt_patterns` with the actual concept cards that generated those images. Maya learns: this user favorites outdoor/natural light concepts and ignores studio shots.
- **OpenClaw/North bridge for Instagram data:** The bridge is already live at `/api/stella/bridge`. Extend it to pull Instagram post performance data for users who've connected their account. Maya sees: your last post with the white cashmere editorial got 3x normal engagement. This changes every future suggestion.
- **Negative signal capture:** Add a simple "not this" reaction to concept cards. Knowing what a user doesn't want is more valuable than knowing what they like — it's how you stop wasting credits on concepts they'll never generate.

### Layer 3: Temporal and Calendar Intelligence (Months 4–7)

Maya today is timeless — she doesn't know what month it is or how long since the user logged in.

- **Content calendar awareness:** Integrate with the existing `instagram_post_queue` and `content_calendars` tables. Maya knows: you have 3 posts scheduled this week, all educational — your feed needs a lifestyle photo for balance.
- **Re-engagement intelligence:** Wire Maya as the delivery mechanism for lapsed user outreach. Instead of a generic email at day 7, Maya sends a personalized message: "Hey — I have 3 new concept ideas based on what you told me about your coaching practice. Want to see them?"
- **Trend injection:** A lightweight weekly cron writes current Instagram trends to `admin_knowledge_base`. Maya's system prompt pulls the last entry: "Quiet luxury is giving way to bold colour this month in your niche — want to try a departure?"

### Layer 4: Cross-Feature Intelligence (Months 6–10)

Maya currently knows nothing about the rest of the product.

- **Academy integration:** If a user just completed "Lighting for Personal Brand Photos," Maya knows and references it: "Based on what you just learned about golden hour lighting — let's apply that to your next concept."
- **Business milestone integration:** When a user launches an offer, Maya surfaces the right content type: "You're launching your coaching programme next week. Here are 5 photos you should have ready: a warm headshot, a behind-the-scenes process shot, a confidence editorial..."
- **Multi-session projects:** Instead of ephemeral conversations, Maya offers named projects ("Q1 Rebrand," "Launch Campaign April," "Evergreen Portfolio"). Each project retains its full context — aesthetics, concepts, generated images, notes. This transforms Maya from a chat tool into a creative workspace.

### Layer 5: Proactive AI (Months 9–12)

The end state: Maya acts on her own initiative.

- **Trigger-based outreach:** Zero days since last login + new trend relevant to user niche = proactive DM or notification with a quick concept. (North/OpenClaw bridge handles delivery.)
- **Content gap detection:** Maya analyzes the user's last 30 Instagram posts and identifies gaps: "Your feed has strong educational content but very few personal brand lifestyle photos — that's the category your competitors outperform you on. Should we fix that?"
- **Quarterly brand audit:** Every 90 days, Maya generates a 3-minute personalized brief: what you've created, what's working, what's missing, what to build next.
- **Model performance alerts:** Classic Mode LoRA models drift over time. Maya monitors generation quality and proactively suggests retraining: "It's been 6 months since you trained your model. Your new haircut isn't capturing right — want a quick update?"

### Database Work Required for "Maya as Personal AI OS"

| New Table or Column | Purpose | Timeline |
|---|---|---|
| `maya_concepts.was_generated` (boolean) | Track which concepts led to actual image generation | Month 1 |
| `maya_concepts.concept_embedding` (vector) | Semantic indexing for memory retrieval | Month 2 |
| `maya_personal_memory.concept_preferences` (JSONB) | Rich preference model beyond flat topic list | Month 2 |
| `maya_projects` | Named multi-session creative projects | Month 4 |
| `maya_projects_concepts` | Link concepts to projects | Month 4 |
| `user_instagram_performance` | Cached post performance data for connected accounts | Month 5 |
| `maya_feedback_signals` | Explicit negative signals from concept card reactions | Month 3 |

### The Enabling Bet

Everything above rests on one architectural choice made now:

> **Maya's memory is a first-class product feature, not a side-effect of database writes.**

Today, memory data is written as a side-effect of interactions (the `learnFromInteraction()` function updates counts). It is never deliberately designed or surfaced. The 12-month bet is treating memory design the same way you treat prompt design — with deliberate architecture, explicit product decisions about what to remember and how to surface it, and ongoing quality investment.

The technical risk is low: Upstash Vector, Redis, and Neon are all already in the stack. The product risk is medium: memory surfaces need to feel trustworthy, not surveillance-like. The strategic upside is high. **Memory is the moat.** Once Maya knows a user's history, aesthetics, preferences, and trajectory, no competitor can match that with a fresh conversation. The longer a user stays, the smarter Maya gets, the harder it is to leave.

---

## Appendix: Data Architecture Reference

### Tables Maya Reads Today
- `users` — gender, ethnicity
- `user_personal_brand` — complete brand profile
- `brand_assets` — uploaded files
- `maya_personal_memory` — topic preferences, styling notes, counts

### Tables Maya Writes Today
- `maya_chats` — session records
- `maya_chat_messages` — conversation content
- `maya_concepts` — generated concept cards with category, title, description, prompt
- `maya_personal_memory` — updated after each interaction via `learnFromInteraction()`

### Tables Maya Could Use But Currently Doesn't
- `maya_concepts` historical records — never queried back into context
- `ai_images.is_favorite` — never fed back as a learning signal
- `user_models` — training status not referenced in Maya's context
- `instagram_posts` and `instagram_platform_metrics` — performance data
- `academy_course_purchases` and `user_lesson_progress` — skill context
- `feed_layouts` and `feed_posts` — Feed Planner work invisible to Photos tab Maya

### Maya Chat Types
- `maya` — Photos tab (Classic + Pro mode concept generation)
- `pro` — Legacy alternate Photos tab type
- `feed-planner` — Feed tab (Instagram strategy generation)

---

*Brief produced 2026-02-26. Based on analysis of lib/maya/, app/api/maya/, lib/data/maya.ts, lib/maya/get-user-context.ts, mode-adapters.ts, core-personality.ts, and automation outputs from output/automation/ through 2026-02-25. No live chat content was sampled — intent patterns are inferred from system design and audit documentation.*
