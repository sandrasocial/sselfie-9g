# MAYA-REBUILD-05 — Port the Live Maya UI onto the /app Engine

Status: DRAFT for Sandra's approval. No code yet.
Branch: `studio-v3-staging` (never merge to `main` until Sandra says it is flawless)
Date: 2026-06-09

---

## The decision this spec executes

Keep the new, clean, synchronous `/app` engine. Dress it in your own proven, live Studio Maya
presentation layer (`components/sselfie/maya`), which won the three-way UX comparison: 18 card
components, real animations, your real design tokens, and battle-tested by your 7 paying users.

We do NOT start from `agents-sselfie` (wrong niche, archived, fewer cards). We do NOT rebuild
generic from scratch. We do NOT import the legacy orchestration tangle.

**Principle: lift the presentation, leave the orchestration, mount on the new engine.**

---

## What we are wiring INTO (the engine, already built and on main)

- `POST /api/app-v3/maya/chat` — streaming Claude Sonnet 4.5 + `emit_concepts` tool (exactly 3 briefs)
- `POST /api/app-v3/maya/generate` — synchronous gpt-image, selfie as identity anchor, credits wired
- `POST /api/app-v3/upload-selfie` — Blob upload (front face + optional angles + inspiration)
- `lib/app-v3/maya/persona.ts` — Maya's brain (re-exports `core-personality.ts`) + the output contract
- `lib/app-v3/prompt-compiler.ts` — Nano-Banana-order compiler + the vision-extracted aesthetic recipes

None of this changes structurally. We are replacing the bare concierge UI on top of it.

---

## Phase 0 — Two fast wins (do first, independent of the UI port)

These are days-old papercuts, not architecture. Land them on staging immediately.

### 0a. Give Maya her voice back (hours)
- Add an explicit voice-discipline block to the `/app` system prompt (in `persona.ts`):
  no em dashes ever (use periods, colons, or a middle dot); short human lines; banned openers
  and filler (Certainly, Absolutely, Great question, I would be happy to, As an AI); contractions;
  warm, specific, a few tasteful emojis. This mirrors the disciplined structure proven in
  `agents-sselfie`'s system prompt, retuned to your warm personal-branding voice.
- Clean the persona file itself: it is currently full of em dashes, which teaches Maya to copy
  them by example. Rewrite that prose without em dashes.

### 0b. Fix the real generation bug (about 1 day)
- The "This photo direction isn't available" wall is the OpenAI moderation catch block in
  `app/api/app-v3/maya/generate/route.ts`, NOT an aesthetic-name mismatch.
- Fixes: soften the identity-anchor wording that reads as face-replication; on a content_policy
  rejection, auto-retry once with a sanitized prompt before surfacing any error; make the
  fallback message warm and actionable. Confirm `OPENAI_IMAGE_MODEL` is a real model id.

---

## Port map — component by component

Legend: LIFT = move with light restyle - REWIRE = keep the visual, swap the data layer to the
new engine - LEAVE = do not bring (the tangle we escaped).

| Legacy source (`components/sselfie/...`) | Action | New home (`components/app-v3/...`) | Wiring notes |
|---|---|---|---|
| `maya/maya-inline-card.tsx` (eyebrow/title/subtitle/children primitive) | **LIFT** | `inline-card.tsx` | Pure presentational, uses global tokens. The base card language for everything. |
| `unified-loading.tsx` + the typing-dots/spinner/skeleton patterns | **LIFT** | `loading.tsx` | Replace the current minimal spinner with the real skeleton + bounce-dot set. |
| `maya/maya-caption-card.tsx`, `maya/maya-generated-asset-card.tsx` (visual design) | **LIFT visual** | upgrade `concept-card.tsx` | Keep our clean Phase-3 concept-card LOGIC; restyle it in the legacy card language. |
| `concept-card.tsx` / `ConceptCardPro.tsx` (the logic) | **LEAVE** | — | Coupled to Flux/Pro, `predictionId`, polling, `get-photoshoot`. Our sync card already replaces it. |
| `maya/maya-unified-input.tsx` (composer: textarea, image upload, library, Enter-to-send) | **REWIRE** | `composer.tsx` | Keep the look + attachment UX. Point uploads at `/api/app-v3/upload-selfie` and send via `useChat`. Drop Classic/Pro mode branches. |
| `maya/maya-chat-history.tsx` + header New Chat control | **REWIRE** | `chat-history.tsx` + concierge header | Keep the drawer/list UX. Point at the NEW app-v3 persistence routes below, not the legacy chat_type ones. |
| `maya/maya-chat-interface.tsx` (2,237 lines: tabs, Flux/Pro routing, async polling, feed) | **LEAVE** | — | This is the tangle. We reuse its children, never its shell. |
| `app/globals.css` design tokens | **REUSE as-is** | — | Already global. Verify the root layout loads it for `/app`, then switch app-v3 hardcoded hex to tokens. |

---

## New backend — app-v3 chat persistence (enables New Chat + History cleanly)

The legacy history backend (`/api/maya/load-chat`, `/new-chat`, `/chats`, `/save-chat`,
`/delete-chat`) is coupled to legacy `chat_type`. We build a small, clean, isolated mirror:

- `GET  /api/app-v3/maya/chats` — list the admin's app-v3 conversations (id, title, updatedAt)
- `POST /api/app-v3/maya/chats` — create a new conversation, return id
- `GET  /api/app-v3/maya/chats/[id]` — load one conversation's messages
- `DELETE /api/app-v3/maya/chats/[id]` — soft-archive (never hard delete)
- Persist on stream finish (the chat route's `onFinish`), keyed to a new Neon table
  `app_v3_chats` (id, user_id, title, messages jsonb, created_at, updated_at, archived_at).
- New Chat = start an empty session. History = the drawer lists past conversations.

This is the only net-new backend in this spec. It is additive and isolated. No legacy table is touched.

---

## Sequence

1. **Phase 0** voice + content-policy fix (fast, ships confidence immediately).
2. **Phase A** lift the presentation primitives (inline card, loading, card restyle). Pure visual, low risk.
3. **Phase B** rewire the composer (attachments + library look, on the new engine).
4. **Phase C** app-v3 chat persistence + New Chat + History drawer.
5. **Phase D** polish pass: spacing, motion, empty states, mobile. Compare side by side with legacy.
6. Only then, with your sign-off, merge `studio-v3-staging` to `main`.

Each phase is its own PR into `studio-v3-staging` (not main), reviewed, tsc + build clean.

---

## What we deliberately leave behind (so we do not re-import the mess)

- Flux / LoRA / trigger words, Classic-vs-Pro mode toggles, async prediction polling.
- `chat_type` machinery, feed tabs inside Maya, `get-photoshoot`.
- The 2,237-line and 5,975-line chat shells. We reuse their children, not the shells.

---

## Acceptance criteria (the bar before main)

- Maya sounds like herself: no em dashes, no filler, warm, short lines, your voice.
- Generation succeeds across all 5 aesthetics, including the moody/sheer ones, with graceful retry.
- Cards, loading, and motion feel as premium as the live Studio (side-by-side check).
- New Chat and History work and persist.
- Members are untouched: `/app` stays admin-gated, `/studio` legacy stays exactly as is.
- tsc clean, build clean, and Sandra says "this is flawless."

---

## Open questions for Sandra

1. History scope: just you (admin) for now, or build it ready for members from day one?
2. Do you want the old "tabs" feeling (Photos / Videos) inside /app eventually, or stay single-surface
   conversational per the North Star vision? (Affects how much composer chrome we port.)
