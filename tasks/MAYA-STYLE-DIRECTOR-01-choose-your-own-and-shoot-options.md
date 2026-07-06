# MAYA-STYLE-DIRECTOR-01 — "Choose your own" style + Maya as shoot director + overlay memory

*Spec by Claude (Fable), 2026-07-06, from Sandra's live QA notes. Root-cause + extension-point evidence verified in code the same day — build on the listed hooks, do not duplicate plumbing.*

## Why

Sandra's testing: picking a style + shot yields ONE concept card with no alternatives; there's no "use my own inspiration" or "let Maya decide" path in the style picker; users can't choose recreate-the-vault-shoot vs a new shoot in that style, or the number of shots; Maya never remembers the user's preferred text-overlay style.

## Non-negotiables

- Identity references and inspiration references stay semantically separate (already enforced end-to-end — do not merge).
- No new generation pipeline: everything routes through the existing `format: "photoshoot"` set flow and `/api/app-v3/maya/generate`.
- No-Fake language everywhere ("still you", never "look like someone else").
- Nothing here touches admin Shoot Studio.

## Slice 1 — "Choose your own" in the style picker

`InlineVibePicker` (`components/app-v3/maya-inline-components.tsx:121-178`) gets two tiles alongside the vault grid:

1. **"Use my inspiration"** — opens the existing inspiration slot (the `SelfieReferenceManagerModal` already mounted in chat since 2026-07-06, `inspiration` slot; upload plumbing: `app/api/app-v3/upload-selfie/route.ts` slot=inspiration → `inspirationImageUrl` in the generate payload → `inspirationReferenceUrl` server-side with close-recreate/set-variation prompt blocks). This is a DISCOVERABILITY feature: surface the existing slot at the choose-your-style moment; zero new backend.
2. **"Let Maya decide"** — commits a "maya-decides" style intent. Server side, ground her plan in `getVaultOverviewGuide()` (`lib/app-v3/maya/vault-styles-server.ts:39-72`) + the member's saved preferences (`app_v3_memory.preferences`) so she proposes a NEW style informed by the vault + the member's own style/outfits, then presents it as a normal direction card the member confirms.

## Slice 2 — Maya as director after a shot is picked

Today `handleInlineShotPick` (`maya-concierge.tsx:1606`) compacts the chosen shot into the intent and Maya pulls directions that typically yield one card. Change the post-shot-pick flow to an explicit inline decision card:

- **"Recreate this shot"** (current behavior, single image) — keep as the fast path.
- **"More angles of this look"** — Maya pulls 3 direction variants of the SAME chosen shot (different pose/camera distance per `shotRole` taxonomy, same styling DNA). The chosen shot's `stylePrompt` continues to pass verbatim (`selectedShotContext`, `chat/route.ts:442-464`).
- **"Full shoot"** → second decision card:
  - **"Recreate this collection's shoot"** — pull the full collection via `getPublishedVaultCollectionBySourceShootId` (`lib/vault/published-collections.ts:266-271`) and map its cards to shoot briefs.
  - **"New shoot in this style"** — Maya plans fresh briefs grounded in `getVaultStyleGuide(aestheticId)`.
  - **Shot count**: user picks 6 / 8 / 9 (server floor is 6, cap is 9 — `validatePhotoshootBriefs`, `generate/route.ts:291-304`; `normalizeShootBriefs` slices at 9). Plumb `requestedShotCount` through the chat context so Maya's planner emits that many briefs, and through `generatePhotoshootSet` (`maya-concierge.tsx:1456-1531`). Do NOT lower the 6-floor (cohesion validation depends on role variety).

Both slices reuse `generatePhotoshootSet` + hero-anchor cohesion. Note credits: shot count = credit cost; show the cost on the count choices (credit maths already exist per image).

## Slice 3 — Overlay style memory + variations

Verified 2026-07-06: `textStyleChoice` is plain React state (`maya-concierge.tsx`), zero persistence; the six templates DO reach `buildBakePrompt` correctly.

- Persist the member's picked `OverlayStyleId` to `app_v3_memory` (`lib/app-v3/maya/memory-store.ts`) — prefer a structured `preferred_overlay_style` column (migration) over a free-text note, so `pickOverlayStyle` (`lib/app-v3/text-overlay.ts:539-560`) can put "member's remembered style" at the TOP of its priority chain.
- On the next graphic format in any session, `TextStyleTemplatePicker` pre-selects the remembered style with a one-tap "use your usual style" affordance; picking another style updates the memory.
- **Variations, same layout**: when the remembered style is used, Maya may offer variation chips (ink color, serif/sans swap within approved fonts, accent on/off) that ride the existing `styleAdjustments` field into `buildBakePrompt` (`text-bake.ts` — member-adjustment line already sanitized + supported). Layout/placement NEVER varies — that is what makes her feed recognizable.

## Order + verification

Slice 1 → 2 → 3; each slice is shippable alone. Per slice: contract tests (source-level like `tests/maya-chat-selfie-manager.test.ts`), the existing suites (`app-v3-maya-first-ux`, `text-studio-bake`, `story-generation`) stay green, `pnpm type-check:ci`, and a live tap-through by Sandra on mobile before the next slice starts.

## Open questions for Sandra (answer before Slice 2 builds)

1. Shot-count choices: 6 / 8 / 9 okay, or do you want a smaller "mini shoot" too? (Server floor is 6 today; lowering it weakens cohesion validation.)
2. When a member picks "Let Maya decide", should Maya propose ONE style confidently (stylist energy) or offer 2-3 to choose from?
