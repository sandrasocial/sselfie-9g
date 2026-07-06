# Conversational AI Creation UX — 2026 Best Practices, Mapped to Maya

*Researched 2026-07-06 (web sweep: OpenAI Apps SDK, ChatGPT Images 2.0, Claude Artifacts, Gemini, Midjourney web, Canva, Gamma, NN/g, Microsoft HAX, Google PAIR, Vercel AI SDK 6, MCP Apps, AG-UI/A2UI). Companion to `docs/product/SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.md`. Written after the fabricated-seed incident (fix `2a262a08`) — rule 2 below is now also a regression test.*

## The industry consensus, in one line

> **Selection is structured context. Intent is a visible turn. Nothing is ever sent in the user's voice that she didn't say or tap.**

OpenAI codified this in the Apps SDK: silent `update-model-context` for UI state, visible user-role messages for actions (they *reversed* an earlier design to make UI-initiated messages visible — the transcript must read honestly), and audited `tools/call` for anything consequential. NN/g splits prompt controls the same way: chips that send text are visible; constraint toggles are persistent state near the composer, never messages.

## The 8 rules for Maya (from the research, in build-priority order)

1. **Taps that select = structured context (+ compact receipt). Taps that commit = visible turns.** Style/format/shot picks ride the generate payload; "Generate", "Make another", "Use this" appear as short user-side turns. Credit-spending actions always leave a visible trace.
2. **Never fabricate user prose.** If a tap injects a turn, it is terse and literal ("Let's create a full photoshoot."), and it is the SAME string the member sees. The fabricated-seed bug (`"I want to start with one clear selfie."` sent on every tap) is the canonical violation. Regression test: `tests/app-v3-maya-first-ux.test.ts`.
3. **Sync state via tool results / typed objects, not narration.** Maya's belief about the selected look/format/refs must live in one structured object mirrored by the UI (our `extrasRef` + chat-route context), never inferred from her own chat prose.
4. **Re-emit the authoritative state snapshot after every generation** (look, refs used, format, credits) so a mid-thread pivot can't leave Maya believing a stale style. (Apps SDK: "return authoritative server snapshots after every tool call.")
5. **Anchor sessions to the creation, not the chat.** Each shoot/creation is an artifact (concept card + variants) with a fresh working context; durable knowledge (brand profile, likeness memory, preferred overlay style) is injected project-style. ChatGPT Projects / Claude Projects both landed here — fresh thread per task, durable container knowledge — as the fix for context rot.
6. **The blank input is a failure state.** Every entry leads with 3-5 curated tappable options + one escape hatch to type (Gamma / ChatGPT Images pattern; also satisfies HAX G1/G2 "show what the system can do").
7. **Chat is refinement deltas** ("warmer light", "different outfit") applied to the current artifact. Never require chat to reach a first result; never make her restate the whole request.
8. **Confirm-in-chat only for consequential actions** (spend beyond plan, publish, delete) via an approval card; routine selections must not nag.

## Where Maya stands today (gap analysis, honest)

| Rule | Status |
|------|--------|
| 1-2 Truthful turns | ✅ After `2a262a08`: FORMAT_PHRASE turns are terse + literal; no fabricated seeds; regression-tested |
| 3 Structured sync | ✅ Implemented same day: style relays pass `creationIdea` as structured context (extras → chat-route SESSION IDEA block); inherited seeds are never replayed as user messages. Guard: `tests/maya-structured-context.test.ts`. |
| 4 Authoritative snapshots | ✅ Implemented same day: every completed render records a `lastGeneration` snapshot that rides every chat turn (chat-route AUTHORITATIVE SESSION STATE block, validated server-side). |
| 5 Artifact anchoring | ✅ Direction is right: concept cards, variant lineage (`variant_of`), drafts, fresh chatId per new session. |
| 6 No blank canvas | ✅ Create tab: starter chips + Ask Maya + selfie card; style picker leads with vault looks + "Use my inspiration" + "Let Maya decide". |
| 7 Refinement chat | ✅ Edit/bake flows are delta-based on the current image. |
| 8 Approval cards | ✅ Nothing nags today; keep it that way when director-mode shot counts spend credits (cost is shown on the choice — correct). |

## Stack verdict (verified against this repo 2026-07-06)

**Current, not outdated.** Next 16 + React 19 + **AI SDK 6.0** (`useChat` from `@ai-sdk/react` — the production-recommended AI SDK UI layer) + tool-call-rendered inline React components is exactly the mainstream 2026 architecture for a first-party product. Verified: **zero** usage of the officially-experimental `ai/rsc` / `streamUI` layer.

Do NOT adopt (for now):
- **MCP Apps** (the new official MCP UI extension): only matters if Maya surfaces should later run *inside* ChatGPT/Claude. Adoptable later without re-architecting.
- **AG-UI / A2UI** protocols: for multi-framework agent backends (LangGraph/CrewAI). Unnecessary for a first-party Next.js app.

Hygiene items:
- ~~`package.json` `"latest"` pins~~ — DONE same day: all 37 floating deps (incl. `stripe`, Supabase, Neon, Resend, the AI SDK set) pinned to their installed versions; guarded by `tests/maya-structured-context.test.ts`.
- AI SDK 6's `needsApproval` + AI Elements are available on our installed version if/when rule 8 needs a real approval card.

## Sources

OpenAI Apps SDK (build/chatgpt-ui, state-management) · MCP Apps SEP-1865 (blog.modelcontextprotocol.io 2026-01-26) · NN/g Prompt Controls + Generative UI · Microsoft HAX G1/G2 · ChatGPT Images 2.0 coverage (DataCamp, TechRadar) · Claude Artifacts docs · Google Cloud prompt chips · Midjourney web updates · Gamma "No More Blank Canvas" (UI-for-AI) · Vercel AI SDK 6 release + RSC migration guide · CopilotKit AG-UI/A2UI comparison.
