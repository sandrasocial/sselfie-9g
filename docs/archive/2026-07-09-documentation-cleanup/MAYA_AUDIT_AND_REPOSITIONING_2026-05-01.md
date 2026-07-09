# Maya Audit And Repositioning

Generated: 2026-05-01
Status: Planning snapshot - not the current implementation source of truth.

> Live Maya guardrails remain in `CLAUDE.md`, `docs/CODEX_CONTEXT.md`, `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md`, and `pnpm audit:maya-quality`.

## Executive Verdict

Do not remove Maya. Do not rebuild her from scratch yet.

Maya should be reframed from "photo generation chat" into the everyday Studio guide who helps a user decide what to make next, then helps her make it. The current system already has most of the intelligence needed: weekly planning, captions, photo ideas, image generation, video generation, gallery handoff, memory, offer brief handling, user snapshots, and tool cards.

The core problem is not missing capability. The core problem is that the visible experience makes Maya feel like a visual-generation product, while the business funnel needs her to feel like a simple next-step partner for Visibility To Paid.

Recommended path:

1. Ship a light reframe first.
2. Then add a smarter Maya home if the reframe is not enough.
3. Only after that, gradually simplify the backend/tool architecture.

## What Maya Is Today

Maya is currently one large assistant surface with several hidden modes:

- Weekly content planning and photo direction.
- Photo concept generation.
- Selfie/reference image workflows.
- My Model training support.
- Video generation from images.
- Gallery and Studio Hub tool cards.
- Content calendar and structured asset logic.
- Offer brief collection and memory.
- Feed-planner-adjacent prompting.

Primary files:

- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx`
- `components/sselfie/maya/maya-tab-switcher.tsx`
- `components/sselfie/maya/hooks/use-maya-chat.ts`
- `app/api/maya/chat/route.ts`
- `lib/maya/core-personality.ts`
- `lib/maya/mode-adapters.ts`
- `lib/maya/tool-registry.ts`
- `lib/maya/tool-orchestrator.ts`
- `lib/maya/intent-dispatcher.ts`
- `lib/maya/memory-layer.ts`
- `lib/maya/user-snapshot.ts`
- `lib/maya/openrouter.ts`

## Current User Promise

The public funnel promises:

- What To Say
- Show Up
- Get Paid
- Maya Visibility Plan / Studio execution

This is defined clearly in `lib/products.ts`:

```ts
description:
  "The full guided path: What To Say, Show Up, Get Paid, and your Maya Visibility Plan."
```

Studio is also positioned there as:

```ts
description: "Maya helps you plan, create, caption, and show up every week."
```

That is the right promise. Maya should keep that promise in the first screen.

## Current First Screen Problem

Maya defaults to the `photos` tab in `components/sselfie/maya-chat-screen.tsx`:

```ts
return "photos" // Default to Photos tab
```

But the visible tab label is not "Photos." In `components/sselfie/maya/maya-tab-switcher.tsx`, the visible tabs are:

```ts
{ id: "photos" as const, label: "Weekly Plan" },
{ id: "videos" as const, label: "Animate" },
{ id: "training" as const, label: "Setup" },
```

This creates a mismatch:

- The code thinks the default is photos.
- The user sees Weekly Plan.
- The assistant copy talks about weekly content, photo ideas, captions, and first next steps.
- The video tab says Animate, which does not sound like Sandra's brand.
- Feed and prompts exist in state, but are not visible in the switcher.

The result is capable but mentally busy.

## Personality Audit

`lib/maya/core-personality.ts` gives Maya a warm, direct, everyday voice, which is good:

- Simple language.
- Specific guidance.
- Encouraging but not cheesy.
- "Let's create" over technical wording.

The issue is that her deep prompt also anchors her heavily as:

- Elite AI fashion photographer.
- Brand strategist.
- Luxury/fashion intelligence.

That is valuable for photo generation, but too narrow as the first product identity after a user buys the Visibility To Paid Suite.

Better top-level identity:

> Maya helps you decide what to say, what to post, what photo to make, and what to do next.

Keep the fashion/photo brain, but do not lead with it.

## Everyday Language Recommendation

Avoid:

- Visuals
- Animate
- Command center
- Workflow
- Generate assets
- Strategy hub
- Feed designer

Prefer:

- Make a post
- Write the caption
- Make a photo
- Make a video
- Set up my photos
- Help me decide
- What should I do next?
- What am I selling this week?

Suggested Maya first-screen language:

```text
Hi, I'm Maya.
Tell me what you are trying to make today, or let me choose the next step for you.

I can help you:
Make a post
Write the caption
Make a photo
Make a video
Plan what to sell
```

This language is plain, human, and closer to how Sandra's customer thinks.

## Tools And Routing Audit

Maya has a mature tool registry in `lib/maya/tool-registry.ts`:

```ts
| "show_capabilities"
| "show_studio_hub"
| "show_gallery"
| "save_to_gallery"
| "generate_image"
| "generate_video"
| "show_upload_zone"
| "switch_maya_tab"
| "edit_asset"
| "create_asset"
| "collect_offer_brief"
| "structured_asset_blocked"
| "maya_gap_offer"
| "week_plan"
```

This is good. The problem is that tools are currently handled through three overlapping mechanisms:

1. Pre-LLM orchestration in `lib/maya/tool-orchestrator.ts`.
2. Regex dispatch in `lib/maya/intent-dispatcher.ts`.
3. Bracket markers parsed from assistant text in `lib/maya/tool-markers.ts`.

This works, and tests are passing, but it is hard to reason about. Adding new Maya behaviors can create routing bugs because intent can be interpreted in more than one place.

## Backend Audit

Primary backend route:

- `app/api/maya/chat/route.ts`

This route handles:

- Auth.
- Impersonation.
- Chat type normalization.
- Tab-scoped chat.
- Credit checks.
- User context.
- Memory.
- Tool orchestration.
- Offer brief handling.
- Structured asset creation.
- AI SDK streaming.
- Model routing.
- Analytics.

It is about 2,667 lines. It is functional, but it is doing too much.

Model routing lives in `lib/maya/openrouter.ts`, with task-specific choices such as:

- `chat_default`
- `chat_pro`
- `prompt_builder`
- `feed_planner`
- `pro_photoshoot`
- feed and Instagram tasks

This is a useful architecture. It should stay, but the route should eventually become thinner.

## Frontend Complexity Audit

`components/sselfie/maya-chat-screen.tsx` is about 4,864 lines and owns too many responsibilities:

- Tab state.
- Hash routing.
- Chat state.
- Empty state branching.
- Modals.
- Upload flows.
- Generated cards.
- Feed/card side effects.
- Upsells.
- Onboarding.
- Tool marker side effects.
- Settings.
- Credit modals.

`components/sselfie/maya/maya-chat-interface.tsx` is also large at about 2,063 lines and handles many tool renderers.

This does not mean Maya is broken. It means changes should be phased and conservative.

## Hidden Value

Several valuable pieces already exist but are under-surfaced:

- Weekly ritual and theme rotation via `lib/maya/week-plan-prompt.ts` and `/api/maya/week-plan`.
- Energy check-in via `maya-energy-check-in.tsx`.
- "What To Say" and "Show Up" upsell cards.
- Prompt library tab in `maya-prompts-tab.tsx`, not visible in the main switcher.
- Feed-related chat type and placeholders, but feed tab is disabled.
- Offer brief collection, but landing/page generation is partly retired or hidden.
- Memory and active asset context via `memory-layer.ts` and `user-snapshot.ts`.

This supports the strategy: surface existing value before building more.

## Audit Script Results

Ran:

- `pnpm audit:maya-quality`
- `pnpm audit:maya-ui-health`
- `pnpm audit:prompt-authority`
- `pnpm audit:architecture-simplifier`

Results:

- Maya UI health passed.
- Tool orchestration and marker tests passed.
- Maya inline tool regression tests passed.
- Studio shell/routing tests passed.
- Architecture simplifier flagged Maya as a high-gravity refactor target.
- Prompt authority scan found 66 prompt-like sites, 14 routed through authority, and 52 shadow prompt sites.
- `pnpm audit:maya-quality` exited with failure because prompt authority CI found banned `buildPrompt(` patterns in `app/api/academy/visibility-suite/plan/generate/route.ts`, not in the Maya chat route itself.

Important: the Maya runtime appears stable enough to reframe carefully. The broader AI/prompt governance is not fully centralized.

## Newer AI Pattern Comparison

The app already uses the Vercel AI SDK. Current AI SDK guidance supports:

- Typed tools with Zod input schemas.
- Tool results rendered as `tool-*` UI parts.
- Multi-step workflows with explicit stopping conditions.
- Routing workflows.
- Evaluator/optimizer loops for quality checks.
- Memory through custom tools or provider-backed memory.

Maya already approximates generative UI, but many tool cards are still triggered by bracket markers inside model text. That is not wrong for a production system that already works, but it is more fragile than typed tools.

Recommended future direction:

- Do not add an agent framework right now.
- Do not introduce Mem0/Letta/Supermemory right now.
- First consolidate Maya's existing custom memory and tool registry.
- Then gradually migrate high-value tools from text markers to typed AI SDK tools.

## What Is Over-Engineered

These are the main over-engineered or risky areas:

1. One huge frontend screen controls too many flows.
2. One huge chat route controls too much backend behavior.
3. Tool behavior is spread across orchestrator, dispatcher, and marker parsing.
4. Regex-based routing is brittle.
5. Some tabs exist in state but not in visible navigation.
6. Landing-page features are paused/retired but still present in tool logic.
7. Prompt governance is split across central authority and shadow prompt sites.
8. Pro/classic/selfie/model language is technically accurate but not always customer-simple.

## What Should Stay

Keep:

- Maya as the assistant.
- Weekly planning.
- Photo ideas and concept cards.
- Image generation.
- Video generation.
- Gallery and save flows.
- Training setup.
- Memory.
- User snapshots.
- Credit confirmations.
- Tool cards.
- Feed Planner as a separate workspace.

## What Should Change First

First phase should be a light product reframe, not architecture surgery.

Recommended first changes:

1. Rewrite Maya's first screen around everyday actions.
2. Replace "Animate" with "Make a video."
3. Replace "Setup" with "Set up my photos" or "My photos."
4. Consider replacing "Weekly Plan" with "Make a post" or "This week."
5. Add a visible Get Paid pathway in Maya, using plain language like "Plan what to sell."
6. Keep Feed Planner separate; Maya can write/prepare the plan conversationally, but should not route users there as the main answer.
7. Hide or avoid promising retired landing page features until they are stable.

## Recommended Maya Structure

Maya should feel like:

> One assistant. Five simple things she can help with.

Suggested everyday actions:

- Make a post
- Write the caption
- Make a photo
- Make a video
- Help me decide

Optional sales path:

- Plan what to sell

If there is room for only five, use:

- Help me decide
- Make a post
- Write the caption
- Make a photo
- Plan what to sell

Then video can live inside "Make a photo" or under the existing tab as "Make a video."

## Three Options

### Option 1: Light Reframe

Scope:

- Copy and labels only.
- Keep current architecture.
- Keep existing tabs and routes.
- Make Maya feel aligned with Visibility To Paid.

Risk: Low.

Recommended now: Yes.

### Option 2: Smart Maya Home

Scope:

- Add a simple first screen before the current chat state.
- Buttons start conversational prompts inside Maya.
- Do not route each button to separate tools unless the user confirms.
- Use memory/user snapshot to suggest "your next step."

Risk: Medium.

Recommended after Option 1 if the experience still feels unclear.

### Option 3: Maya 2.0 Architecture

Scope:

- Split `maya-chat-screen.tsx`.
- Thin `app/api/maya/chat/route.ts`.
- Consolidate orchestrator/dispatcher/marker logic.
- Migrate selected actions to typed AI SDK tools.
- Add explicit evaluation for high-value outputs like captions, offers, and weekly plans.

Risk: High.

Recommended later, not as the next sprint.

## Final Recommendation

Do Option 1 first.

Maya does not need more features right now. She needs a clearer job:

> Maya helps you make the next thing that moves someone from seeing you to trusting you to buying from you.

Keep the powerful visual engine, but make it one part of Maya, not her whole identity.

After the reframe is live, watch for whether users still feel lost. If they do, build Option 2: a smarter Maya home that starts conversations in plain language. Only then tackle the deeper Option 3 architecture cleanup.

## Safest First Implementation Phase

1. Change labels and welcome copy only.
2. Add one Get Paid-oriented starter prompt.
3. Keep all generation logic untouched.
4. Keep Feed Planner separate.
5. Keep direct hashes like `#maya/videos` and `#maya/training` working.
6. Run Maya UI health, prompt authority, type-check, and build.
