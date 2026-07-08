# VOICE-LOOP-01 — The Apprentice Loop (content that learns from Sandra)

Date: 2026-07-08
Owner: Codex
Priority: 1 (this is the fix for "generated content never sounds like me")

## Problem (verified by audit 2026-07-08)

1. **Editorial memory exists on exactly one surface.** `app_v3_admin_memory` (taste memory) is
   written and injected only in Admin Maya chat (`app/api/app-v3/maya/chat/route.ts` +
   `lib/app-v3/maya/admin-memory-store.ts`). The weekly content brief, the content-kit
   carousel/story/shoot generators, and the daily briefing intelligence never learn from
   Sandra's approvals, edits, or rejections. Every Monday starts from zero.
2. **Grounding is a hand-synced code file.** `lib/content/grounding.ts` is TypeScript constants.
   The canonical locked docs (`docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`,
   `docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md`, and the four files in
   `docs/brand/source/2026-06-27/`) are never read at runtime. Editing a doc changes nothing
   until a human re-syncs the code. Only `tests/content-grounding.test.ts` substring checks
   guard against drift.
3. **Fail-open to generic.** `getAdminBriefContext()` (chat route) and the daily briefing
   intelligence catch errors and silently return empty context, so a gating/env problem degrades
   output to generic instead of failing loud.
4. **Prompt hygiene bug:** `lib/app-v3/maya/admin-persona.ts:38` contains an em-dash inside the
   contract that bans em-dashes.

## Scope

### A. Grounding sync (build-time, not runtime fs reads)

Serverless bundles don't ship `docs/`, so do NOT read markdown at runtime. Instead:

- New script `scripts/sync-grounding.ts`: parses the six canonical docs and regenerates the
  constant blocks in `lib/content/grounding.ts` (voice, purpose, audience, expertise, story
  anchors, No-Fake). Deterministic output, one source of truth: the docs.
- Extend `tests/content-grounding.test.ts` with a drift check: running the sync must produce no
  diff (fail CI when docs and code disagree). Document the workflow at the top of grounding.ts:
  "edit the docs, run `pnpm sync:grounding`, commit both."
- Add `sync:grounding` to package.json scripts.
- Fix the em-dash in `lib/app-v3/maya/admin-persona.ts:38` while in there.

### B. Capture Sandra's edits everywhere (the missing feedback signal)

Wherever Sandra approves/edits/rejects generated content, write a compact row to
`app_v3_admin_memory` via the existing `addAdminMemoryNote` helper:

- **IG inbox**: when Sandra edits a draft reply before sending
  (`app/api/admin/ig-inbox/[conversationId]/reply/route.ts`), if her sent text materially
  differs from `draft_response`, store kind=`voice` with a compact original→edited pair
  (cap each side ~280 chars).
- **Content brief page**: add approve/reject/edited controls per content piece
  (`components/admin/content-brief-client.tsx` + a small API route); store kind=`approval`/
  `rejection` with the piece's hook + reason if given.
- **Content-kit publish/kill routes** already write shoot decisions; extend the same pattern to
  carousel/story generation results where an approve/discard action exists.
- Dedupe/prune: keep the store useful — max ~200 rows, oldest pruned (already capped reads at 14;
  add a prune on write).

### C. Inject memory into every generator (not just Admin Maya chat)

Add the same "ADMIN EDITORIAL MEMORY" block (`getAdminMemoryContext()`) to:

- `lib/content-engine/brief-generator.ts` (system prompt assembly, alongside `briefSystemBase()`)
- `lib/content-kit/carousel-generator.ts`, `story-generator.ts` (caption/copy prompts only, NOT
  the visual image prompts — keep shoot-generator's scoped injection as is)
- `lib/admin/daily-briefing-intelligence.ts`

### D. Fail loud, not generic

- When `getAdminBriefContext()` returns empty in an admin Maya session, prepend a visible one-line
  note to Maya's context ("no weekly brief available — say so if asked for strategy") AND
  `logAdminError` it.
- Daily briefing intelligence: when grounding/brief context is missing, include the existing
  `intelligenceNote` disclaimer AND `logAdminError` so it shows in diagnostics.

## Acceptance

- `pnpm sync:grounding` regenerates grounding.ts from docs; test fails on drift.
- Editing a draft in ig-inbox before send creates a `voice` memory row (test).
- Brief generator + carousel/story generators + daily intelligence prompts contain the editorial
  memory block when rows exist (tests assert injection).
- No em-dashes in any persona/contract string (extend the existing voice guard test).
- Full suite green before merge (LOOP rule).

## Out of scope

Member-side Maya likeness memory (separate moat build), new admin pages, any send/publish
behavior changes.
