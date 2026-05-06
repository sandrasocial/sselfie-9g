# Founder Content System Start Here

Status: Draft for Sandra approval\
Last updated: 2026-04-27\
Scope: Sandra-only content strategy and production workflow. Not customer-facing.

## What This Is

This folder is the source of truth for Sandra's founder content system.

Use it when Sandra asks for Instagram strategy, hooks, Reels, Stories, carousel overlays, content planning, audience research, or launch content.

Do not mix this with Maya, Studio, Feed Planner, or any customer-facing agent unless Sandra explicitly approves productizing a specific method.

## Read In This Order

1. `README.md`
2. **Current funnel (May 2026):** `FUNNEL-REALITY-MAY-2026.md` (overrides older CTA ladders in the April intelligence brief)
3. **Weekly operating procedure:** `CONTENT-ENGINE-WEEKLY-RUNBOOK-MAY-2026.md`
4. `SANDRA-CONTENT-INTELLIGENCE-BRIEF-DRAFT.md`
5. `SANDRA-VOICE-STORY-BANK-DRAFT.md`
6. `SANDRA-CONTENT-STRATEGY-PLAYBOOK-DRAFT.md`
7. `SANDRA-CONTENT-QA-RUBRIC-DRAFT.md`
8. `SANDRA-SELFIE-TUTORIAL-REPURPOSING-SYSTEM-DRAFT.md`
9. `SOCIAL-CONTENT-AGENT-ARCHITECTURE.md`

**Visual design for desktop HTML tools:** follow `docs/brand/DESIGN_SYSTEM.md` (obsidian, porcelain, pearl, smoke, Inter + Cormorant Garamond; retired gold accent must not return).

## Current Workflow

1. Check current audience demand first.
2. Match it to proven Instagram performance and current market patterns.
3. Choose one content lane and one scroll-stop trigger.
4. Draft one daily content package before writing the post.
5. Every day must include one feed asset and one Story sequence.
6. Sandra approves or labels the brief.
7. Move approved overlays into the Story Creator or Carousel Creator.
8. Upload photos, export assets, post manually.
9. Record saves, shares, comments, DMs, opt-ins, and sales movement.

## Daily Output Standard

Each sprint day needs:

- one feed asset: Reel, carousel, or feed post
- one Story sequence: 5 to 7 slides that supports the feed asset
- one clear CTA across both assets
- one funnel bridge: Selfie Guide, Starter Kit, Brand Strategy, Masterclass, Studio, or manual DM routing

The Story sequence should not be extra random content. It should warm up, deepen, or route the same topic from the feed asset.

## Production Tools

Local HTML tools live outside the repo:

- `/Users/MD760HA/Desktop/SSELFIE Content Tools /SSELFIE-Content-Approval-Hub.html`
- `/Users/MD760HA/Desktop/SSELFIE Content Tools /SSELFIE-Week-Engine.html` (seed → 7-day markdown + push overlays into Story + Carousel)
- `/Users/MD760HA/Desktop/SSELFIE Content Tools /SSELFIE-Story-Creator.html`
- `/Users/MD760HA/Desktop/SSELFIE Content Tools /SSELFIE-Carousel-Creator.html`
- **Local server (required for AI image generation):** `Open-SSELFIE-Tools.command` or `replicate-local-proxy.mjs` → open **`http://127.0.0.1:8787/`** (see runbook).

Use the Content Approval Hub first. Story Creator and Carousel Creator are for approved photo overlays only. They should not invent strategy. UI styling must align with `docs/brand/DESIGN_SYSTEM.md`.

The current canvas board lives at:

- `/Users/MD760HA/.cursor/projects/Users-MD760HA-sselfie-9g/canvases/social-content-intelligence.canvas.tsx`

## Non-Negotiables

- Founder-only system.
- Manual Sandra approval before publish-ready use.
- Recognition before motivation.
- No generic social media manager voice.
- No em dashes in Sandra-facing content.
- No auto-posting.
- No income guarantees.
- Do not create broad generic calendars.
- Draft 1 to 3 high-quality briefs at a time.

## Best Prompt To Give Another Agent

Use this:

> Before helping with Sandra's content, read `docs/founder-content/START-HERE.md`. This is a founder-only content system, separate from the customer-facing Maya/Studio agents. Use the workflow and QA rubric there before drafting hooks, Stories, carousels, captions, or production overlays.

## Best Prompt To Give Another Agent

The definitive content agent prompt lives here:

`docs/founder-content/CONTENT-AGENT-MASTER-PROMPT.md`

Paste the prompt from that file at the start of every content session in Claude, Cursor, North, or any future agent. It contains the reading order, the three gates, the funnel reality, the QA scorecard, and the production tool locations.

Legacy shortcut (still valid):

> Before helping with Sandra's content, read `docs/founder-content/START-HERE.md`. This is a founder-only content system, separate from the customer-facing Maya/Studio agents. Use the workflow and QA rubric there before drafting hooks, Stories, carousels, captions, or production overlays.
