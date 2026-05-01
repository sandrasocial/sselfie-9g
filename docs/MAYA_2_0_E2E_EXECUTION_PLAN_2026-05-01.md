# Maya 2.0 E2E Execution Plan

Generated: 2026-05-01

## Executive Decision

We should not do another minor Maya patch.

The current product has only a small user base, low usage, and the Visibility To Paid Suite has not launched. That changes the risk calculation. The bigger risk is not breaking a mature product. The bigger risk is launching a clearer-looking version of a product that still does not feel essential.

Maya 2.0 should become the visible engine of SSELFIE:

> Maya tells you what to do next, then helps you make it.

This means Maya should not be framed as a photo-generation chat. She should be the Studio co-pilot for the whole Visibility To Paid promise:

- What do I say?
- What do I post?
- What do I sell?
- What photo or video should I make?
- What should I do next?

## What The Audit Found

### 1. The public promise is stronger than the current Studio Maya experience

The Visibility To Paid Suite promises a complete path:

- What To Say
- Show Up
- Get Paid
- Maya Visibility Plan

This promise appears in:

- `lib/products.ts`
- `app/visibility-suite/page.tsx`
- `app/checkout/page.tsx`
- `components/checkout/success-content.tsx`
- `app/academy/access/visibility-suite/page.tsx`

The suite access page already says the right thing:

```text
Know what to say.
Show up.
Get paid.
```

And the Maya Visibility Plan promises:

```text
After you complete the workbooks, Maya will turn your answers into one clean plan: your
message, content rhythm, first offer, sales post, and next 7 days.
```

That is the product.

### 2. Main Studio Maya is not yet carrying that promise

Main Studio Maya still exposes technical/product labels:

- `Weekly Plan`
- `Animate`
- `Setup`

That language does not create the same emotional clarity as the funnel. It also hides what Maya can really do.

Important correction: `Setup` is not a generic photos setup. It is the user's own Flux LoRA model training path. The plain-language label should be closer to:

- `Train my model`
- `My model`
- `Set up my model`

### 3. Maya already has most of the needed capability

Maya has:

- Chat.
- Weekly planning.
- Caption and post ideation.
- Photo concept generation.
- Image generation.
- Video generation.
- Gallery tools.
- Studio Hub tool cards.
- Memory.
- User snapshots.
- Offer brief collection.
- Feed Planner adjacency.
- Flux model training through Replicate.
- OpenRouter/Anthropic model routing.
- Vercel AI SDK chat streaming.

The missing layer is not capability. It is product orchestration.

### 4. The training system is valuable but must be clearer

Training means the user trains her own Flux LoRA model through Replicate:

- UI: `components/sselfie/maya/maya-training-tab.tsx`
- Modal: `components/sselfie/retrain-model-modal.tsx`
- Main route: `app/api/training/upload-zip/route.ts`
- Status: `app/api/training/status/route.ts`
- Progress: `app/api/training/progress/route.ts`
- Data helpers: `lib/data/training.ts`
- Generation requires a completed trained model in `app/api/maya/generate-image/route.ts`

Risks found:

- `hasTrainedModel` is not defined consistently everywhere.
- Multiple training start routes exist with slightly different gates and trigger-word behavior.
- A dead onboarding branch in `sselfie-app.tsx` still references a training wizard that is effectively not rendered.
- `ENABLE_TRAINING_AI` does not gate every training entry point consistently.

For Maya 2.0, the training flow should be preserved, but renamed and clarified as `Train my model`.

### 5. Architecture is heavy, but not the first thing to rewrite

The current system has high gravity:

- `components/sselfie/maya-chat-screen.tsx` is roughly 4,864 lines.
- `components/sselfie/maya/maya-chat-interface.tsx` is roughly 2,063 lines.
- `app/api/maya/chat/route.ts` is roughly 2,667 lines.

Tool behavior is split across:

- `lib/maya/tool-orchestrator.ts`
- `lib/maya/intent-dispatcher.ts`
- `lib/maya/tool-markers.ts`
- `lib/maya/tool-registry.ts`

This should be simplified, but not as the first user-facing move. We need to make Maya feel valuable first, then clean up the foundations around proven flows.

## Maya 2.0 Product Strategy

Maya should become:

> The weekly co-pilot that turns your message, offer, and visibility into the next thing to make.

The first screen should answer:

> What should I do next?

Not:

> What tool do you want to open?

### Core Jobs

Maya 2.0 should have seven plain-language jobs:

1. `Help me decide`
2. `Make a post`
3. `Write the caption`
4. `Make a photo`
5. `Make a video`
6. `Plan what to sell`
7. `Train my model`

These should not simply route users to different tools. Each one should begin a guided Maya conversation and only open a tool when that tool is clearly needed.

### The WOW Moment

The product should create this feeling:

> Maya already understands where I am and gives me the next move I could actually do today.

Example:

```text
This week, I would focus on selling your mini offer.

Let’s make:
1. One trust-building post
2. One caption that points to your offer
3. One photo that makes you look credible and approachable

Start with the trust post. I’ll write it with you now.
```

## Proposed User Journey

### New Buyer

1. Buys Visibility To Paid Suite.
2. Lands in `academy/access/visibility-suite`.
3. Completes or partially completes workbook answers.
4. Clicks `Create My Maya Visibility Plan`.
5. Maya creates a practical plan:
  - Message.
  - Content rhythm.
  - Offer path.
  - Sales post.
  - DM script.
  - Next 7 days.
6. Maya sends them into Studio with a clear first action:
  - Make a post.
  - Write a caption.
  - Make a photo.
  - Train my model if they want My Model.

### Studio User

1. Opens Maya.
2. Sees a simple co-pilot screen:

```text
What are we making today?

Let Maya choose my next step.
Make a post.
Write the caption.
Make a photo.
Make a video.
Plan what to sell.
Train my model.
```

1. Maya suggests a next best move using:
  - Workbook answers.
  - Membership/purchase state.
  - Existing memory.
  - Offer brief.
  - Training status.
  - Gallery and recent generated assets.
  - Feed/activity where available.
2. Maya creates one usable outcome in the same session.

## Architecture Recommendation

### Keep Now

Keep:

- `useChat` / current AI SDK chat.
- Existing `/api/maya/chat` route.
- Existing OpenRouter/Anthropic routing.
- Existing memory and user snapshot system.
- Existing image/video generation.
- Existing Flux training flow.
- Existing Feed Planner as a separate workspace.

### Add Now

Add a thin Maya 2.0 decision layer:

```text
User intent
→ Maya job
→ Current user state
→ Suggested next move
→ Guided chat or existing tool
```

Suggested new shared module:

- `lib/maya/next-best-move.ts`

Suggested responsibilities:

- Read `MayaUserSnapshot`.
- Read training readiness.
- Read suite/workbook answer availability where possible.
- Classify user state into simple next-step categories.
- Return a small structured recommendation.

Possible return shape:

```ts
type MayaNextBestMove = {
  job: "decide" | "post" | "caption" | "photo" | "video" | "sell" | "train_model"
  headline: string
  why: string
  primaryActionLabel: string
  prompt: string
  secondaryActions: Array<{
    label: string
    prompt: string
  }>
}
```

### Modernize Later

Move toward typed AI SDK tools, but only after the user-facing loop proves useful.

Best candidates:

- `suggestNextStep`
- `createWeeklyPlan`
- `draftCaption`
- `generatePhotoConcept`
- `generateImage`
- `generateVideo`
- `collectOfferBrief`
- `trainModelStatus`

Do not adopt a new memory provider yet. The app already has custom memory, user snapshots, and database context. Clean and use those first.

Do not use durable workflows for the first Maya 2.0 loop. Vercel Workflows are useful later for long-running, multi-step jobs like a complete launch week or media generation pipeline, but the first launch should stay request/response plus existing generation polling.

## E2E Implementation Plan

### Phase 0: Alignment Cleanup

Goal: remove contradictions before building new Maya behavior.

Files:

- `components/sselfie/post-purchase-welcome-modal.tsx`
- `components/sselfie/maya/maya-tab-switcher.tsx`
- `components/sselfie/maya/maya-training-tab.tsx`
- `components/sselfie/maya-chat-screen.tsx`
- `app/layout.tsx`
- `app/academy/access/visibility-suite/page.tsx`

Tasks:

1. Add `visibility_suite` copy to `PostPurchaseWelcomeModal`.
2. Rename Maya-facing labels:
  - `Animate` → `Make a video`
  - `Setup` → `Train my model`
  - Reconsider `Weekly Plan` → `Make a post` or `This week`
3. Clarify training copy:
  - This trains your own AI model.
  - It costs 20 credits.
  - It is optional unless you want My Model.
4. Hide or avoid surfacing retired landing page generation inside Maya.
5. Keep direct hashes like `#maya/videos` and `#maya/training` working.

Acceptance:

- A new user can understand Maya's core jobs in under 10 seconds.
- Training is clearly model training, not photos.

### Phase 1: Maya 2.0 Home

Goal: make Maya feel like the Studio co-pilot.

Files:

- New: `components/sselfie/maya/maya-studio-copilot-home.tsx`
- `components/sselfie/maya-chat-screen.tsx`
- `lib/maya/prompt-contract.ts`

Tasks:

1. Add a Maya home state for empty/default chat.
2. Use existing design tokens and light app styling.
3. Add plain-language actions:
  - `Help me decide`
  - `Make a post`
  - `Write the caption`
  - `Make a photo`
  - `Make a video`
  - `Plan what to sell`
  - `Train my model`
4. Each action starts a Maya conversation, not a blind route.
5. `Train my model` opens the training tab because that is a real setup flow.
6. `Make a video` opens or uses the current video flow after Maya sets context.
7. `Make a photo` uses current photo/concept generation flow.

Acceptance:

- `/studio?tab=maya` opens a simple co-pilot home when there is no active chat.
- Existing visual generation remains reachable.
- Existing training remains reachable.
- The home does not add Feed Planner confusion.

### Phase 2: Next Best Move

Goal: make Maya feel smart before the user types.

Files:

- New: `lib/maya/next-best-move.ts`
- New: `app/api/maya/next-best-move/route.ts` or server action equivalent
- `components/sselfie/maya/maya-studio-copilot-home.tsx`
- Existing helpers:
  - `lib/maya/user-snapshot.ts`
  - `lib/maya/memory-layer.ts`
  - `lib/maya/get-user-context.ts`
  - `lib/data/training.ts`
  - `lib/academy-entitlements.ts`

Tasks:

1. Build deterministic next-best-move rules first.
2. Use LLM only after deterministic state is clear.
3. Suggested decision logic:
  - If no offer context: suggest `Plan what to sell`.
  - If workbook answers exist but no plan: suggest `Create Maya Visibility Plan`.
  - If no weekly content: suggest `Make a post`.
  - If no trained model and user wants My Model: suggest `Train my model`.
  - If enough context exists: suggest one concrete post/caption/photo.
4. Return one primary recommendation and 2-3 alternate starts.
5. Store accepted next move in Maya memory.

Acceptance:

- Maya can recommend one specific next action.
- Recommendation does not spend credits.
- Recommendation is explainable in plain language.
- Recommendation never blocks manual user choice.

### Phase 3: Visibility To Paid Week Flow

Goal: create the "WOW" output.

Files:

- `lib/maya/week-plan-prompt.ts`
- `lib/maya/sselfie-method-content.ts`
- `app/api/maya/chat/route.ts`
- `components/sselfie/maya/maya-week-plan-card.tsx`
- `components/sselfie/maya/maya-caption-card.tsx`
- Possibly new: `lib/maya/visibility-to-paid-week.ts`

Tasks:

1. Create a guided flow:
  - What are you selling?
  - Who needs this?
  - What should they believe before buying?
  - What post should you make first?
  - What photo/video supports it?
2. Output:
  - 3 post ideas.
  - 1 finished caption.
  - 1 photo/video direction.
  - 1 soft CTA.
  - 1 next action.
3. Add a lightweight evaluation step for:
  - Is there a clear offer?
  - Is there a CTA?
  - Is the caption in Sandra/Maya voice?
  - Is the next action concrete?

Acceptance:

- User can go from blank to usable sales-aware post in under 3 minutes.
- Output feels like Visibility To Paid, not generic content advice.

### Phase 4: Suite Integration

Goal: make workbooks and Studio feel like one product.

Files:

- `app/academy/access/visibility-suite/page.tsx`
- `components/academy/visibility-suite-maya-chat.tsx`
- `components/academy/visibility-plan-generator.tsx`
- `app/api/academy/visibility-suite/chat/route.ts`
- `app/api/academy/visibility-suite/plan/generate/route.ts`
- `components/sselfie/maya-chat-screen.tsx`

Tasks:

1. Let the Maya Visibility Plan create a handoff into Studio Maya.
2. Persist enough plan context for Maya to continue.
3. Add a CTA after plan generation:
  - `Make my first post with Maya`
  - `Write my sales caption`
  - `Create the photo for this post`
4. Avoid duplicating two separate Mayas:
  - Suite Maya should create the plan.
  - Studio Maya should execute the plan.

Acceptance:

- Buyer completes plan in Academy and continues into Studio without re-explaining.
- Maya remembers the plan context.

### Phase 5: Tool Architecture Cleanup

Goal: reduce risk after the product loop works.

Files:

- `lib/maya/tool-registry.ts`
- `lib/maya/tool-orchestrator.ts`
- `lib/maya/intent-dispatcher.ts`
- `lib/maya/tool-markers.ts`
- `app/api/maya/chat/route.ts`
- `components/sselfie/maya/maya-chat-interface.tsx`

Tasks:

1. Pick one canonical path for each high-value action.
2. Start moving high-value actions to typed AI SDK tools:
  - `suggestNextStep`
  - `createWeeklyPlan`
  - `draftCaption`
  - `generatePhotoConcept`
3. Keep marker parsing for legacy cards until replaced.
4. Add regression tests before each migration.
5. Thin `app/api/maya/chat/route.ts` only after behavior is covered.

Acceptance:

- Fewer duplicate intent paths.
- No loss of current image/video/training flows.
- Tool behavior is easier to test.

## What Not To Build Yet

Do not build:

- A separate agent framework.
- A new memory provider.
- A full backend rewrite.
- A full frontend rewrite.
- A new Feed Planner inside Maya.
- A CRM.
- A dashboard.
- More tabs.
- Landing-page generation resurrection.

Use Vercel Workflows later only if Maya starts running long, durable jobs like:

- Full launch week generation.
- Multi-step content batch creation.
- Long-running media generation with resumable progress.
- Background follow-up tasks.

## Test Plan

Run after implementation phases:

- `pnpm type-check`
- `pnpm build`
- `pnpm audit:maya-ui-health`
- `pnpm audit:prompt-authority`
- Relevant tests:
  - `tests/maya-tool-markers.test.ts`
  - `tests/maya-tool-dispatcher.test.ts`
  - `tests/maya-tool-orchestrator.test.ts`
  - `tests/maya-auto-select-mode.test.ts`
  - `tests/studio-tab-routing.test.ts`

Add new tests:

- Maya home renders action labels.
- `Train my model` opens the training tab.
- `Plan what to sell` starts a chat prompt and does not trigger retired landing-page tools.
- Next best move returns deterministic fallback when no memory exists.
- Visibility Suite plan handoff opens Studio Maya with context.

## Launch Criteria

Maya 2.0 is ready for the Visibility Suite launch when:

1. A buyer can generate or start a Maya Visibility Plan.
2. Maya can recommend one next move.
3. Maya can turn that move into a post/caption/photo direction.
4. Training is clearly explained as `Train my model`.
5. No retired or confusing flows are surfaced.
6. Existing image/video generation still works.
7. Existing tests and build pass.

## Final Recommendation

Build Maya 2.0 as a focused product relaunch:

> Maya is the weekly Visibility To Paid co-pilot.

She should help the user decide, write, post, sell, and create. The first build should be bold in experience but disciplined in architecture: reuse the existing system, add a clear next-best-move layer, integrate suite context, and only modernize tool architecture after the new loop proves useful.