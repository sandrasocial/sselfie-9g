# Content Engine — Weekly Runbook (May 2026)

**Status:** Active operating procedure for Sandra and agents.  
**Funnel source of truth:** `FUNNEL-REALITY-MAY-2026.md` (replaces older “Selfie Guide first” ladders in other drafts).  
**Design source of truth (tools + product UI):** `docs/brand/DESIGN_SYSTEM.md`  
**Voice / QA:** `SANDRA-VOICE-STORY-BANK-DRAFT.md`, `SANDRA-CONTENT-QA-RUBRIC-DRAFT.md` — minimum **16/20** before “ready to post.”

---

## When a session starts (agent or human)

1. Read in order: `SANDRA-VOICE-STORY-BANK-DRAFT.md`, `SANDRA-CONTENT-INTELLIGENCE-BRIEF-DRAFT.md`, `FUNNEL-REALITY-MAY-2026.md`.  
2. **Data pull (Composio / Instagram):** top 3 posts last 7 days by saves and shares, story completion if available, reach this week vs last. Do this automatically when the integration is available. Do not ask Sandra for numbers you can query.  
3. Output a **weekly brief: exactly 3 content ideas** in this format:

`[Format] — [Pillar] — [Hook one sentence] — [CTA]`

Each idea must pass: *Would a woman send this to her best friend?*  
4. Ask: **Which one do you want to write first?**  
5. Then produce that piece fully: hook, script or overlays, caption, **QA score** (0–2 across 10 categories in the rubric). If below 16, rewrite before handoff.  
6. **Never** auto-post, invent offers, use em dashes, or point to URLs that are not real.

**CTA map (May 2026):** income / money / message / confidence / “what to post” → **Visibility Suite** (keyword **VISIBILITY**, URL `sselfie.ai/visibility` per funnel doc). Selfie tutorial lane only → **Free Selfie Guide** (`sselfie.ai/selfie-guide`). AI / workflow / speed → **Studio** (`sselfie.ai/join/studio`).

---

## Production pipeline (after copy is approved)

1. **Approval Hub first** (if using):  
   `~/Desktop/SSELFIE Content Tools /SSELFIE-Content-Approval-Hub.html`  
2. Build overlays in **Carousel Creator** or **Story Creator**:  
   `~/Desktop/SSELFIE Content Tools /SSELFIE-Carousel-Creator.html`  
   `~/Desktop/SSELFIE Content Tools /SSELFIE-Story-Creator.html`  
3. **Design:** Shell chrome follows `DESIGN_SYSTEM.md` (obsidian / porcelain / pearl / smoke / whisper, Cormorant + Inter, **no warm gold accent**, primary actions = white on dark). Run **`Open-SSELFIE-Tools.command`** or `node replicate-local-proxy.mjs` so pages load over **http://127.0.0.1:8787/** (required for AI image generation via Replicate proxy).  
4. Export PNGs, upload to Instagram **manually**. Track saves, shares, DMs, opt-ins.

---

## Tooling checklist

| Step | Action |
| --- | --- |
| Local server | Double-click `Open-SSELFIE-Tools.command` or run `replicate-local-proxy.mjs`; open **`http://127.0.0.1:8787/`** (not `file://`). |
| Replicate token | Stored in browser localStorage key `sselfie_nb_token`; optional default in HTML for local use only. |
| Design audit | Compare sidebar / tabs / buttons to `DESIGN_SYSTEM.md` tokens yearly when adjusting CSS. |

---

## Parallel agents (optional)

For “week ready” sweeps, split work **without** duplicating funnel assumptions:

- **Agent A:** Instagram metrics summary + 3 ideas (formats + CTAs).  
- **Agent B:** Full draft + overlays outline for the idea Sandra picks.  
- **Agent C:** QA pass using rubric + voice bank (no em dashes, no coach voice).

Same funnel doc for all agents: **May 2026 funnel file only.**

---

## Week Engine (full post-ready week pack + tools)

**Path:** `~/Desktop/SSELFIE Content Tools /SSELFIE-Week-Engine.html` (open via local proxy, same as other tools).

One successful run should output **structured JSON** that includes: **7 daily** entries (hook, **format**, Reel checklist bullets, **spoken script**, **feed caption**, **hashtags**, funnel line) plus **42** story overlays, **3 × 8** carousel slide fields, and **3** full **carousel captions**. The page compiles a **full-pack markdown** file for download. **Content Approval Hub** reads the same saved run and shows day tabs (hooks, scripts, captions, hashtags, story previews).

**Flow:**

1. Start the proxy (`Open-SSELFIE-Tools.command` or `node replicate-local-proxy.mjs`).
2. Open **`http://127.0.0.1:8787/`** (Mission Control — one page listing every tool). Bookmark it. From there open Week Engine, or go directly to `http://127.0.0.1:8787/SSELFIE-Week-Engine.html`.
3. Paste a short **story seed** (what the week should be about).
4. **Model:** default is **`anthropic/claude-sonnet-4.6`** on OpenRouter (dropdown lists alternatives). Large output: if JSON truncates, retry or use a higher max-output model.
5. **OpenRouter key:** either leave blank when the proxy prints `[proxy] OPENROUTER_API_KEY loaded from …/.env.local`, or paste a key (stored as `sselfie_openrouter_key`). The proxy reads `~/ACTIVE/sselfie-9g/.env.local` at startup if `OPENROUTER_API_KEY` is not already set.
6. **Run week pipeline** → review the compiled pack on the page → **Download full pack (.md)** for archiving / scheduling notes.
7. **Apply text to Story + Carousel tools** → open **Story Creator** and **Carousel Creator** in the **same browser** so patches load once (overlays + carousel captions).
8. Open **`SSELFIE-Content-Approval-Hub.html`** (reload after the run) → use **day tabs** for hook, format, Reel bullets, script, caption, hashtags, story previews, and the three carousel caption block.
9. Add photos in the creators and export as usual.

The LLM does not replace human QA: run the content rubric before posting.

---

*Last updated: 2026-05-02 (aligned with Cowork project instructions + DESIGN_SYSTEM.md).*
