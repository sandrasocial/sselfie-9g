# Maya Reliability Program

Status: active recovery program as of 2026-03-11
Owner branch: `workspace-main`
Baseline: `origin/main` at `7e798510` plus current `workspace-main` Maya fixes

## Why this exists

Maya is carrying too many product patterns at once:

- one mixed chat that tries to do everything
- task-scoped tabs
- separate deep-editor surfaces like Feed Planner
- retired asset flows that still shape prompts, docs, or helpers

That creates user confusion and engineering drift.

This document is the current source of truth for getting Maya stable, clear, and premium again.

## Executive summary

What stays:

- the model-choice stabilization work on `main`
- tab-scoped isolation for Videos chat
- Maya as the primary app surface
- inline handoff cards when users ask for the wrong task in the wrong place

What changes:

- stop treating "all Maya confusion" as one bug
- freeze the visible Maya architecture to a small number of clear task surfaces
- remove hidden ownership drift before more visual polish

## Current reality

### What is working

- `My Model` vs `Selfie` now has a canonical policy in `lib/maya/model-choice-policy.ts`
- Photos and Videos can now persist to separate `chat_type` values
- Training is credit-gated and reachable from the Maya surface
- landing pages and workbooks are retired at the route layer with `410` responses

### What is not under control yet

1. Maya surface ownership is split across giant files:
   - `components/sselfie/maya-chat-screen.tsx` ~5000 LOC
   - `components/sselfie/maya/maya-chat-interface.tsx` ~1900 LOC
   - `components/sselfie/maya/hooks/use-maya-chat.ts` ~965 LOC
   - `app/api/maya/chat/route.ts` ~2600 LOC

2. The repo still contains active, hidden, and retired Maya paths at the same time:
   - visible tabs: Chat, Videos, Train
   - hidden or legacy tabs in code: Prompts, Feed
   - retired routes still referenced in helpers/docs: pages, workbooks

3. Chat isolation is still fragile because every task surface must stay aligned across:
   - visible tab
   - `chat_type`
   - localStorage key
   - load/save/new-chat logic
   - tool marker hydration

4. Runtime behavior is noisy.
   - Browser audit on `/studio` showed repeated `useMayaChat` loading logs in the Videos tab even after the chat had already loaded.
   - That is a signal that the Maya surface is still too stateful and too easy to destabilize.

5. Copy and voice are inconsistent between tabs and onboarding surfaces.
   - Maya's core personality is warm and direct.
   - Some tab-specific helpers still sound like system UI, not Maya.

## Browser audit findings

Observed on local `/studio` as an authenticated user:

- Visible Maya top tabs are `Chat`, `Videos`, `Train`
- Videos now holds its own conversation instead of bleeding into Chat
- Videos still carries too much gallery-selection responsibility inside the chat flow
- Main Maya surface still shows mixed quick prompts in places where task scope should already be obvious
- Feed remains absent as a visible Maya tab, while feed logic and chat types still exist in code

## UX research principles to use

The recovery plan is based on both the live code and current product/UX patterns:

1. Reduce visible choices at the point of action.
   - Hick's Law and Tesler's Law both support simplifying the first decision and hiding complexity until it is needed.
   - Sources:
     - [Law of UX - Hick's Law](https://lawsofux.com/hicks-law/)
     - [Law of UX - Tesler's Law](https://lawsofux.com/teslers-law/)

2. Keep context in bounded workspaces.
   - Both ChatGPT Projects and Claude Projects use explicit context boundaries instead of one endless mixed workspace.
   - Sources:
     - [OpenAI Help - Projects in ChatGPT](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)
     - [Anthropic Support - Create and manage Projects](https://support.anthropic.com/en/articles/9517075-what-are-projects)

3. Creative AI apps win by task-specific creation surfaces.
   - Runway promotes focused creation apps like video/image flows, not one overloaded control room.
   - Canva's Magic Studio groups creation into clear, guided tools rather than exposing all capability at once.
   - Sources:
     - [Runway Apps](https://runwayml.com/apps/)
     - [Runway Act One](https://runwayml.com/research/introducing-act-one)
     - [Canva Magic Studio](https://www.canva.com/magic-studio/)

## Locked Maya surface architecture

This is the product structure to build against unless Sandra explicitly changes it.

### Visible Maya top tabs

1. `Photos`
2. `Videos`
3. `Train`

Note:

- The current `Chat` label should be treated as a temporary label for the `Photos` surface.
- The goal is a clearer user mental model: photo work lives in Photos, motion work lives in Videos, training lives in Train.

### Not visible as Maya top tabs right now

- `Feed`
- `Prompts`

Those can exist in code temporarily, but they are not part of the locked live Maya surface.

### Deep editors and side surfaces

- Feed stays in the existing Feed Planner surface until its Maya integration is rebuilt cleanly
- Calendar stays as an inline Maya skill and asset card, not a top tab
- Gallery/Account remain shell-level surfaces

## Owner contract for every Maya task surface

Every visible Maya task surface must own exactly these things:

1. One visible tab label
2. One canonical `chat_type`
3. One storage key for current chat id
4. One quick-prompt contract
5. One empty-state contract
6. One save/load/new-chat path
7. One reload-safe renderer contract
8. One wrong-scope handoff card

If any of those are shared loosely across tabs, the user experience will drift again.

## Current surface decisions

### Photos

Photos is Maya's main creation surface.

Keep inside Photos:

- `My Model` / `Selfie` source choice
- photo generation
- gallery access for image generation
- style prompts
- calendar draft requests
- Studio Hub and "open my work" flows

Do not mix into Photos by default:

- Feed strategy workflows
- video creation flow
- training workflow

### Videos

Videos is a dedicated motion surface.

Keep inside Videos:

- asking Maya to make a reel/video
- choosing a source photo
- motion prompt generation
- video polling, retry, and completed video cards

Videos should not dump the full gallery inline into the conversation unless the user explicitly asks for that.

### Train

Train is a dedicated setup surface.

Keep inside Train:

- training status
- upload/training CTA
- credit guidance
- success handoff back to Photos with `My Model` ready

Product guidance should say `10-15` images.
Current backend minimum is still `5`, which is a quality mismatch that should be corrected later.

### Feed

Feed is not ready to be a visible Maya top tab yet.

Reason:

- feed logic exists in both Maya and the separate Feed Planner surface
- feed chat types still rely on legacy aliases and bridge code
- adding it back now would recreate the same cross-surface confusion

For now Maya should use a handoff card:

- "This will be better in Feed Planner"
- with a clear CTA into the existing Feed Planner surface

## Product rules that are now locked

1. Do not add any new Maya top tab without a spec and a full owner contract.
2. Do not add any new `chat_type` without:
   - DB constraint support
   - normalization
   - new-chat support
   - load-chat support
   - save/update support
   - tests
3. Do not ship a feature as both:
   - a visible top tab
   - and an inline "sometimes" path
   unless one of those is explicitly documented as the deep editor.
4. Landing pages and workbooks stay retired until rebuilt properly.
5. Member-facing Pro Photoshoot stays hidden until it has a real user flow and non-admin backend.

## Recovery program

### Phase 0 - Freeze and tell the truth

Goal: stop drift.

- update source-of-truth docs
- rename the visible mental model from `Chat` to `Photos` in product language
- mark hidden/legacy Maya surfaces clearly
- stop adding new UX branches without updating this doc

### Phase 1 - Stabilize contracts

Goal: make Maya reliable before further polish.

- keep only the locked visible top tabs
- unify tab label, `chat_type`, storage key, and load/save contracts
- reduce console/debug noise and add focused Maya telemetry
- add a real smoke matrix for Photos, Videos, Train, shell navigation, and handoff cards

### Phase 2 - Simplify the Photos surface

Goal: make first-use Maya obvious.

- tighten quick prompts to photo-first only
- keep Maya voice consistent across empty states and onboarding
- remove mixed decision-making from the first screen
- use inline handoff cards when the request belongs elsewhere

### Phase 3 - Harden Videos and Train

Goal: make secondary Maya tasks feel first-class.

- keep Videos chat-native but compact
- keep image choosing below the conversation, not as a giant inline dump
- keep Train action-oriented with a clear start and clear "go create now" completion path

### Phase 4 - Decide the Feed entry point

Goal: resolve feed without creating a second architecture mess.

Decision options:

1. Keep Feed Planner as the only feed editor and use Maya handoff cards
2. Re-introduce Feed as a true tab-scoped Maya surface with its own owner contract

Do not choose option 2 until feed persistence, naming, and deep-editor handoff are fully unified.

## Required merge gates for Maya work

No Maya UI change should merge without all of these:

1. `pnpm type-check`
2. `pnpm build`
3. targeted Vitest for:
   - `use-maya-chat`
   - `load-chat`
   - `save-message`
   - tab handoff markers
   - affected tab renderer
4. one manual desktop smoke in `/studio`
5. one manual mobile smoke in `/studio`
6. no obvious console spam or repeated reload loops during the tested flow

## Immediate next slices

Work in this order:

1. Rename the visible `Chat` mental model to `Photos`
2. Audit and reduce repeated `useMayaChat` loading churn
3. Clean the Photos quick-prompt contract so it is photo-only
4. Keep improving Videos copy and source-picking flow
5. Decide Feed handoff vs Feed tab only after the above are stable

## Sources

- [OpenAI Help - Projects in ChatGPT](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)
- [Anthropic Support - Create and manage Projects](https://support.anthropic.com/en/articles/9517075-what-are-projects)
- [Runway Apps](https://runwayml.com/apps/)
- [Runway Act One](https://runwayml.com/research/introducing-act-one)
- [Canva Magic Studio](https://www.canva.com/magic-studio/)
- [Law of UX - Hick's Law](https://lawsofux.com/hicks-law/)
- [Law of UX - Tesler's Law](https://lawsofux.com/teslers-law/)
