# SHOOT-STUDIO-01 — Admin Shoot Studio (inspiration → photoshoot → every channel)

*Approved by Sandra 2026-06-12. Owner: Claude (Cowork). Supersedes the CONTENT-VISUALS-01
Phase 1/2 demo + brief-driven carousel flow (Sandra reviewed those and they don't match how
she actually creates; see "Why" below).*

## Why (Sandra's real workflow, verbatim logic)

1. She finds inspiration images on Pinterest.
2. She uploads them to ChatGPT with her selfie → gets a photoshoot of HER in that exact
   style, vibe, outfit, makeup, hair, accessories.
3. When she approves a shoot, ONE shoot becomes: the reel ("Prompt my selfie" series, the
   prompt is the comment-PROMPT giveaway), the carousel (photos as backgrounds + original
   selfie overlaid + screenshots as teaching overlays), and the story slides (her Story
   Prompt Engineer doctrine).

The shoot is the content unit. Phase 1/2 inverted this (topic-first carousels, preset-style
demo edits) which is why the output wasn't usable. The rebuild makes the shoot the front door.

## Interaction model (locked, mirrors the SUITE)

Maya-style **chat container + tap-first cards**. The agent leads with curated cards
(prompt card, shot cards, action buttons); typing is for refinement only ("make the blazer
black"). Nothing requires typing to reach the core outcome. NOTHING auto-posts, ever.

## Phase A — Shoot Studio (THIS spec)

- `content_shoots` table: title, slug, status (draft|approved|archived), inspiration_urls
  jsonb, selfie_url, shots jsonb, messages jsonb. Setup: `scripts/setup-content-shoots.ts`.
- `lib/content-kit/shoot-generator.ts`:
  - `createShoot`: vision LLM (OpenRouter primary, Anthropic fallback — `callContentKitVision`
    in llm.ts) reads the inspiration images → writes 4 shot prompts in the EXACT vault
    anatomy (`.agents/skills/vault-prompt-writer/SKILL.md`) → gpt-image-2 `images.edit` with
    selfie FIRST + inspiration images attached (cap 4 inputs) per shot, medium quality drafts.
  - Server-side image-role guard prepended to every generation (never stored in the
    shareable prompt): first image = identity source, other images = style reference only,
    never copy a face from them. Identity guard is structural, not prompt-dependent.
  - `refineShoot`: her chat message + current shots JSON → LLM rewrites affected prompts →
    only changed shots regenerate. Message thread persisted on the shoot row.
  - `regenerateShot`: per-shot re-roll, optional `quality: "high"` for finals.
- API: `/api/admin/content-kit/shoots` (GET/POST/PATCH/DELETE, admin session or CRON_SECRET
  bearer, maxDuration 300). POST actions: create | refine | regenerate.
  `/api/admin/content-kit/shoots/upload` accepts inspiration image uploads → Blob under
  `content-kit/inspiration/`.
- UI: `components/admin/shoot-studio-client.tsx`, top section of /admin/content-brief
  (Admin Data Contract rule 5: it replaces the Before/After demo section, which is retired).
  Composer (inspo upload + selfie strip + optional note) → thread of shoot cards: agent
  message, copyable shareable prompt (the comment-PROMPT asset), shot cards with
  approve/kill/regenerate, refinement input per shoot.
- The shareable prompt stays in paste-into-ChatGPT form (identity lock paragraph included)
  so approving a shoot later maps 1:1 onto a vault collection (Phase B).

## Phase B — DB-backed vault + publish pipeline (NEXT)

`vault_collections`/`vault_prompts` tables seeded from prompt-data.ts; vault access page,
freebie shot-1 previews, landing page, delivery email list, studio vibes (aesthetics.ts),
Maya DNA (vault-styles.ts — currently a hard-coded 10-entry list that silently gives new
collections NO style DNA), and Library drops all read from DB. "Publish as vault collection"
button on an approved shoot. No deploy per collection.

## Phase C — Drop email button + auto-sync (AFTER B)

Admin button: pick 2 new collections → dry-run counts shown → Sandra approves → cron works
the batches (same idempotent engine as docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md step 10).
Auto Library-drop sync on publish. Guard test: every collection must resolve a Maya vibe.

## Format spinners (carry over from CONTENT-VISUALS-01, re-pointed at shoots)

From an approved shoot: reel kit (prompt + caption + cover), carousel (shoot photos as
backgrounds, ORIGINAL selfie inset on hook, screenshot overlay slots on teaching slides,
keyword CTA), story sequence per the Story Slide Doctrine but rendered via gpt-image-2 edit
(her validated ChatGPT flow) instead of satori. Satori stays for clean teaching slides only.

## Hard rules

- No auto-posting. No em-dashes in any rendered or LLM text. SANDRA_VOICE_RULES + no-fake
  doctrine on all copy. Design tokens only. Money metrics obey the Admin Data Contract.
- The vault-prompt-writer skill is COMMITTED at `.agents/skills/vault-prompt-writer/` —
  never recreate it outside git (that's how it got lost the first time).
